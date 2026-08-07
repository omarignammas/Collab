package org.test.backendprojecty.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.test.backendprojecty.entity.AccountStatus;
import org.test.backendprojecty.entity.Role;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.repository.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Configuration
@RequiredArgsConstructor
public class AdminBootstrapConfig {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapConfig.class);
    private static final int TRIAL_DAYS = 7;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:omar@collab.ap}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Bean
    CommandLineRunner bootstrapAdminAccount() {
        return args -> {
            LocalDateTime now = LocalDateTime.now();

            userRepository.findByAccountStatusIsNull().forEach(user -> {
                user.setAccountStatus(user.isEnabled() ? AccountStatus.APPROVED : AccountStatus.SUSPENDED);
                if (user.getRole() == Role.ADMIN) {
                    user.setEnabled(true);
                    user.setAccountStatus(AccountStatus.APPROVED);
                    user.setTrialExpiresAt(null);
                } else if (user.getTrialExpiresAt() == null && user.isEnabled()) {
                    user.setApprovedAt(user.getApprovedAt() == null ? now : user.getApprovedAt());
                    user.setTrialExpiresAt(now.plusDays(TRIAL_DAYS));
                }
                userRepository.save(user);
            });

            userRepository.findByEmail(adminEmail).ifPresentOrElse(existingAdmin -> {
                existingAdmin.setRole(Role.ADMIN);
                existingAdmin.setEnabled(true);
                existingAdmin.setAccountStatus(AccountStatus.APPROVED);
                existingAdmin.setApprovedAt(existingAdmin.getApprovedAt() == null ? now : existingAdmin.getApprovedAt());
                existingAdmin.setTrialExpiresAt(null);
                userRepository.save(existingAdmin);
            }, () -> {
                String initialPassword = resolveInitialAdminPassword();
                User admin = User.builder()
                        .email(adminEmail)
                        .password(passwordEncoder.encode(initialPassword))
                        .firstName("Collab")
                        .lastName("Admin")
                        .role(Role.ADMIN)
                        .enabled(true)
                        .accountStatus(AccountStatus.APPROVED)
                        .approvedAt(now)
                        .build();
                userRepository.save(admin);
            });
        };
    }

    private String resolveInitialAdminPassword() {
        if (adminPassword != null && !adminPassword.isBlank()) {
            return adminPassword;
        }

        byte[] randomBytes = new byte[24];
        SECURE_RANDOM.nextBytes(randomBytes);
        String generatedPassword = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        log.warn("APP_ADMIN_PASSWORD is not configured. Generated temporary admin password for {}: {}", adminEmail, generatedPassword);
        return generatedPassword;
    }
}
