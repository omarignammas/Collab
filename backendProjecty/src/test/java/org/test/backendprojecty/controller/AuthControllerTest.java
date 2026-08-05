package org.test.backendprojecty.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.test.backendprojecty.dtos.request.LoginRequest;
import org.test.backendprojecty.dtos.request.RegisterRequest;
import org.test.backendprojecty.dtos.response.AuthResponse;
import org.test.backendprojecty.security.JwtAuthenticationFilter;
import org.test.backendprojecty.service.AuthService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = AuthController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    void register_Success() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("test@example.com")
                .password("test123")
                .firstName("John")
                .lastName("Doe")
                .build();

        AuthResponse response = AuthResponse.builder()
                .token("jwt-token")
                .email("test@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    void login_Success() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("test@example.com")
                .password("test123")
                .build();

        AuthResponse response = AuthResponse.builder()
                .token("jwt-token")
                .email("test@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())  // ADD THIS!
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"));
    }

    @Test
    void register_InvalidEmail_ReturnsBadRequest() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid-email")
                .password("test123")
                .firstName("John")
                .lastName("Doe")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())  // ADD THIS!
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}