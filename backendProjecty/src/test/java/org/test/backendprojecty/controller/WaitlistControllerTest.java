package org.test.backendprojecty.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.test.backendprojecty.dtos.request.WaitlistJoinRequest;
import org.test.backendprojecty.service.WaitlistService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WaitlistControllerTest {

    private final RecordingWaitlistService waitlistService = new RecordingWaitlistService();

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(new WaitlistController(waitlistService))
            .addPlaceholderValue("BaseUrl", "/api/v1")
                .setValidator(validator)
                .build();
    }

    @Test
    void join_Success_ReturnsCreated() throws Exception {
        WaitlistJoinRequest request = WaitlistJoinRequest.builder()
                .email("new@example.com")
                .build();

        mockMvc.perform(post("/api/v1/waitlist")
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + request.getEmail() + "\"}"))
                .andExpect(status().isCreated());

        assertEquals("new@example.com", waitlistService.lastEmail);
    }

    @Test
    void join_InvalidEmail_ReturnsBadRequest() throws Exception {
        WaitlistJoinRequest request = WaitlistJoinRequest.builder()
                .email("not-an-email")
                .build();

        mockMvc.perform(post("/api/v1/waitlist")
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + request.getEmail() + "\"}"))
                .andExpect(status().isBadRequest());

        assertEquals(null, waitlistService.lastEmail);
    }

    static class RecordingWaitlistService extends WaitlistService {

        private String lastEmail;

        RecordingWaitlistService() {
            super(null, null);
        }

        @Override
        public void join(String email) {
            this.lastEmail = email;
        }
    }
}
