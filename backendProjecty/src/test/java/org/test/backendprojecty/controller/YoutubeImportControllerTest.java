package org.test.backendprojecty.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.test.backendprojecty.dtos.request.YoutubeImportRequest;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.dtos.response.YoutubeImportResponse;
import org.test.backendprojecty.dtos.response.YoutubeResyncResponse;
import org.test.backendprojecty.security.JwtAuthenticationFilter;
import org.test.backendprojecty.service.YoutubeImportService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = YoutubeImportController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
class YoutubeImportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private YoutubeImportService youtubeImportService;

    private YoutubeImportRequest importRequest;
    private YoutubeImportResponse importResponse;

    @BeforeEach
    void setUp() {
        importRequest = YoutubeImportRequest.builder()
                .playlistUrl("https://www.youtube.com/playlist?list=PLxxxx")
                .termId(1L)
                .build();

        importResponse = YoutubeImportResponse.builder()
                .course(CourseResponse.builder().id(1L).title("Linear Algebra").build())
                .tasksImported(10)
                .tasksSkipped(1)
                .build();
    }

    @Test
    @WithMockUser
    void importPlaylist_Success() throws Exception {
        when(youtubeImportService.importPlaylist(any(YoutubeImportRequest.class))).thenReturn(importResponse);

        mockMvc.perform(post("/api/v1/courses/import/youtube")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(importRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.course.title").value("Linear Algebra"))
                .andExpect(jsonPath("$.tasksImported").value(10))
                .andExpect(jsonPath("$.tasksSkipped").value(1));

        verify(youtubeImportService, times(1)).importPlaylist(any(YoutubeImportRequest.class));
    }

    @Test
    @WithMockUser
    void importPlaylist_InvalidInput_ReturnsBadRequest() throws Exception {
        YoutubeImportRequest invalidRequest = YoutubeImportRequest.builder().playlistUrl("").termId(1L).build();

        mockMvc.perform(post("/api/v1/courses/import/youtube")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(youtubeImportService, never()).importPlaylist(any(YoutubeImportRequest.class));
    }

    @Test
    @WithMockUser
    void resync_Success() throws Exception {
        when(youtubeImportService.resync(1L)).thenReturn(
                YoutubeResyncResponse.builder().tasksImported(2).tasksSkipped(8).build());

        mockMvc.perform(post("/api/v1/courses/1/resync-youtube")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tasksImported").value(2))
                .andExpect(jsonPath("$.tasksSkipped").value(8));

        verify(youtubeImportService, times(1)).resync(1L);
    }
}
