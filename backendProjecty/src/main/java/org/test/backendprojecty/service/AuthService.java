package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.dtos.request.LoginRequest;
import org.test.backendprojecty.dtos.request.RegisterRequest;
import org.test.backendprojecty.dtos.response.AuthResponse;
import org.test.backendprojecty.entity.Role;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.JwtService;
import org.test.backendprojecty.security.SecurityUser;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(Role.USER)
                .enabled(true)
                .build();

        user = userRepository.save(user);

        SecurityUser securityUser = new SecurityUser(user);
        String jwtToken = jwtService.generateToken(securityUser);

        return AuthResponse.builder()
                .token(jwtToken)
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("User not found"));

        SecurityUser securityUser = new SecurityUser(user);
        String jwtToken = jwtService.generateToken(securityUser);

        return AuthResponse.builder()
                .token(jwtToken)
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .build();
    }
}