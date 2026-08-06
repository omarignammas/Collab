package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.entity.WaitlistEntry;
import org.test.backendprojecty.repository.WaitlistEntryRepository;

import java.time.LocalDateTime;

/**
 * Landing-page "desktop app" waitlist. Every signup is saved first (the
 * durable record that actually matters) and only then does a best-effort
 * notification email go out — a slow or misconfigured mail server should
 * never turn a real signup into a failed request.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WaitlistService {

    private final WaitlistEntryRepository waitlistEntryRepository;
    private final JavaMailSender mailSender;

    @Value("${app.waitlist.notify-email:omar.ignammas2003@gmail.com}")
    private String notifyEmail;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Transactional
    public void join(String email) {
        String normalized = email.trim().toLowerCase();

        if (waitlistEntryRepository.existsByEmailIgnoreCase(normalized)) {
            // Already on the list — treat a resubmit as success without saving a
            // duplicate row or sending a second notification email.
            return;
        }

        waitlistEntryRepository.save(WaitlistEntry.builder()
                .email(normalized)
                .createdAt(LocalDateTime.now())
                .build());

        sendNotification(normalized);
    }

    private void sendNotification(String signupEmail) {
        if (fromAddress == null || fromAddress.isBlank()) {
            log.warn("Waitlist signup saved ({}) but mail isn't configured — set MAIL_USERNAME/MAIL_PASSWORD to get notified by email.", signupEmail);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(notifyEmail);
            message.setSubject("New Collab desktop waitlist signup");
            message.setText("New signup for the Collab desktop app waitlist:\n\n" + signupEmail);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Waitlist signup saved ({}) but the notification email failed to send: {}", signupEmail, e.getMessage());
        }
    }
}
