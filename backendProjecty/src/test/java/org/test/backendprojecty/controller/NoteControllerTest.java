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
import org.test.backendprojecty.dtos.request.NoteRequest;
import org.test.backendprojecty.dtos.response.NoteResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.security.JwtAuthenticationFilter;
import org.test.backendprojecty.service.NoteService;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = NoteController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NoteService noteService;

    private NoteRequest noteRequest;
    private NoteResponse noteResponse;
    private PagingResult<NoteResponse> pagingResult;

    @BeforeEach
    void setUp() {
        noteRequest = NoteRequest.builder()
                .title("Test Note")
                .body("Some body")
                .tags(List.of("chem"))
                .build();

        noteResponse = NoteResponse.builder()
                .id(1L)
                .title("Test Note")
                .body("Some body")
                .tags(List.of("chem"))
                .build();

        pagingResult = new PagingResult<>(
                Arrays.asList(noteResponse), 1, 1L, 10, 0, false
        );
    }

    @Test
    @WithMockUser
    void createNote_Success() throws Exception {
        when(noteService.createNote(any(NoteRequest.class))).thenReturn(noteResponse);

        mockMvc.perform(post("/api/v1/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(noteRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Test Note"));

        verify(noteService, times(1)).createNote(any(NoteRequest.class));
    }

    @Test
    @WithMockUser
    void getAllNotes_Success() throws Exception {
        when(noteService.getAllNotes(any())).thenReturn(pagingResult);

        mockMvc.perform(get("/api/v1/notes")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Test Note"));

        verify(noteService, times(1)).getAllNotes(any());
    }

    @Test
    @WithMockUser
    void getAllNotes_EmptyResult_Success() throws Exception {
        PagingResult<NoteResponse> emptyResult = new PagingResult<>(Collections.emptyList(), 0, 0L, 10, 0, true);
        when(noteService.getAllNotes(any())).thenReturn(emptyResult);

        mockMvc.perform(get("/api/v1/notes").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    @WithMockUser
    void deleteNote_Success() throws Exception {
        doNothing().when(noteService).deleteNote(1L);

        mockMvc.perform(delete("/api/v1/notes/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(noteService, times(1)).deleteNote(1L);
    }

    @Test
    @WithMockUser
    void createNote_InvalidInput_ReturnsBadRequest() throws Exception {
        NoteRequest invalidRequest = NoteRequest.builder().title("").build();

        mockMvc.perform(post("/api/v1/notes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(noteService, never()).createNote(any(NoteRequest.class));
    }
}
