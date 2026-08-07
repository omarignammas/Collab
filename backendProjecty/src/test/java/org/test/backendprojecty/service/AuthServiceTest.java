package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.test.backendprojecty.dtos.request.LoginRequest;
import org.test.backendprojecty.dtos.request.RegisterRequest;
import org.test.backendprojecty.dtos.response.AuthResponse;
import org.test.backendprojecty.entity.AccountStatus;
import org.test.backendprojecty.entity.Role;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.JwtService;
import org.test.backendprojecty.security.SecurityUser;

import java.util.Optional;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .email("test@example.com")
                .password("test123")
                .firstName("John")
                .lastName("Doe")
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("test123")
                .build();

        user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encodedPassword")
                .firstName("John")
                .lastName("Doe")
                .role(Role.USER)
                .enabled(true)
                .accountStatus(AccountStatus.APPROVED)
                .trialExpiresAt(LocalDateTime.now().plusDays(7))
                .build();
    }

    @Test
    void register_Success() {
        // Given
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword())).thenReturn("encodedPassword");
        User pendingUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encodedPassword")
                .firstName("John")
                .lastName("Doe")
                .role(Role.USER)
                .enabled(false)
                .accountStatus(AccountStatus.PENDING)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(pendingUser);

        // When
        AuthResponse response = authService.register(registerRequest);

        // Then
        assertNotNull(response);
        assertNull(response.getToken());
        assertEquals(1L, response.getId());
        assertEquals("test@example.com", response.getEmail());
        assertEquals("John", response.getFirstName());
        assertEquals(Role.USER, response.getRole());
        assertEquals(AccountStatus.PENDING, response.getAccountStatus());
        assertNotNull(response.getMessage());
        verify(userRepository).save(any(User.class));
        verify(jwtService, never()).generateToken(any(SecurityUser.class));
    }

    @Test
    void register_EmailAlreadyExists_ThrowsException() {
        // Given
        when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(true);

        // When & Then
        assertThrows(BadRequestException.class, () -> authService.register(registerRequest));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void login_Success() {
        // Given
        when(userRepository.findByEmail(loginRequest.getEmail())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(SecurityUser.class))).thenReturn("jwt-token");

        // When
        AuthResponse response = authService.login(loginRequest);

        // Then
        assertNotNull(response);
        assertEquals("jwt-token", response.getToken());
        assertEquals(1L, response.getId());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_PendingUser_ThrowsBadRequest() {
        user.setEnabled(false);
        user.setAccountStatus(AccountStatus.PENDING);
        when(userRepository.findByEmail(loginRequest.getEmail())).thenReturn(Optional.of(user));

        BadRequestException exception = assertThrows(BadRequestException.class, () -> authService.login(loginRequest));

        assertEquals("Your account is waiting for admin approval.", exception.getMessage());
        verify(authenticationManager, never()).authenticate(any());
    }
}
