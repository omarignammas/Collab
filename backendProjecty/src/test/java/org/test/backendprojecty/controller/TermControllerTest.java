package org.test.backendprojecty.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.test.backendprojecty.config.JacksonTestConfig;
import org.test.backendprojecty.dtos.request.TermRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TermResponse;
import org.test.backendprojecty.security.JwtAuthenticationFilter;
import org.test.backendprojecty.service.TermService;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = TermController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonTestConfig.class)
class TermControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TermService termService;

    private TermRequest termRequest;
    private TermResponse termResponse;
    private PagingResult<TermResponse> pagingResult;

    @BeforeEach
    void setUp() {
        termRequest = TermRequest.builder()
                .name("Fall 2026")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 12, 20))
                .isCurrent(true)
                .build();

        termResponse = TermResponse.builder()
                .id(1L)
                .name("Fall 2026")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 12, 20))
                .isCurrent(true)
                .build();

        pagingResult = new PagingResult<>(
                Arrays.asList(termResponse),
                1,
                1L,
                10,
                0,
                false
        );
    }

    @Test
    @WithMockUser
    void createTerm_Success() throws Exception {
        when(termService.createTerm(any(TermRequest.class))).thenReturn(termResponse);

        mockMvc.perform(post("/api/v1/terms")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(termRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Fall 2026"));

        verify(termService, times(1)).createTerm(any(TermRequest.class));
    }

    @Test
    @WithMockUser
    void getAllTerms_Success() throws Exception {
        when(termService.getAllTerms(any())).thenReturn(pagingResult);

        mockMvc.perform(get("/api/v1/terms")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].name").value("Fall 2026"));

        verify(termService, times(1)).getAllTerms(any());
    }

    @Test
    @WithMockUser
    void getAllTerms_EmptyResult_Success() throws Exception {
        PagingResult<TermResponse> emptyResult = new PagingResult<>(
                Collections.emptyList(), 0, 0L, 10, 0, true
        );
        when(termService.getAllTerms(any())).thenReturn(emptyResult);

        mockMvc.perform(get("/api/v1/terms")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());

        verify(termService, times(1)).getAllTerms(any());
    }

    @Test
    @WithMockUser
    void deleteTerm_Success() throws Exception {
        doNothing().when(termService).deleteTerm(1L);

        mockMvc.perform(delete("/api/v1/terms/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(termService, times(1)).deleteTerm(1L);
    }

    @Test
    @WithMockUser
    void createTerm_InvalidInput_ReturnsBadRequest() throws Exception {
        TermRequest invalidRequest = TermRequest.builder()
                .name("")
                .build();

        mockMvc.perform(post("/api/v1/terms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(termService, never()).createTerm(any(TermRequest.class));
    }
}
