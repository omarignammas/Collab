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
import org.test.backendprojecty.dtos.request.CourseRequest;
import org.test.backendprojecty.dtos.response.CourseProgressResponse;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.security.JwtAuthenticationFilter;
import org.test.backendprojecty.service.CourseService;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(
        controllers = CourseController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
class CourseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CourseService courseService;

    private CourseRequest courseRequest;
    private CourseResponse courseResponse;
    private CourseProgressResponse progressResponse;
    private PagingResult<CourseResponse> pagingResult;

    @BeforeEach
    void setUp() {
        courseRequest = CourseRequest.builder()
                .title("Test Course")
                .description("Test Description")
                .termId(1L)
                .build();

        courseResponse = CourseResponse.builder()
                .id(1L)
                .title("Test Course")
                .description("Test Description")
                .termId(1L)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        progressResponse = CourseProgressResponse.builder()
                .courseId(1L)
                .courseTitle("Test Course")
                .totalTasks(10L)
                .completedTasks(5L)
                .progressPercentage(50.0)
                .build();

        pagingResult = new PagingResult<>(
                Arrays.asList(courseResponse),
                1,
                1L,
                10,
                0,
                false
        );
    }

    @Test
    @WithMockUser
    void createCourse_Success() throws Exception {
        when(courseService.createCourse(any(CourseRequest.class))).thenReturn(courseResponse);

        mockMvc.perform(post("/api/v1/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(courseRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Test Course"));

        verify(courseService, times(1)).createCourse(any(CourseRequest.class));
    }

    @Test
    @WithMockUser
    void getAllCourses_Success() throws Exception {
        when(courseService.getAllCourses(any())).thenReturn(pagingResult);

        mockMvc.perform(get("/api/v1/courses")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortField", "id")
                        .param("direction", "ASC")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.empty").value(false));

        verify(courseService, times(1)).getAllCourses(any());
    }

    @Test
    @WithMockUser
    void getAllCourses_EmptyResult_Success() throws Exception {
        PagingResult<CourseResponse> emptyResult = new PagingResult<>(
                Collections.emptyList(), 0, 0L, 10, 0, true
        );
        when(courseService.getAllCourses(any())).thenReturn(emptyResult);

        mockMvc.perform(get("/api/v1/courses")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.empty").value(true));

        verify(courseService, times(1)).getAllCourses(any());
    }

    @Test
    @WithMockUser
    void getCourseById_Success() throws Exception {
        when(courseService.getCourseById(1L)).thenReturn(courseResponse);

        mockMvc.perform(get("/api/v1/courses/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Test Course"));

        verify(courseService, times(1)).getCourseById(1L);
    }

    @Test
    @WithMockUser
    void updateCourse_Success() throws Exception {
        CourseRequest updateRequest = CourseRequest.builder()
                .title("Updated Course")
                .description("Updated Description")
                .termId(1L)
                .build();

        CourseResponse updatedResponse = CourseResponse.builder()
                .id(1L)
                .title("Updated Course")
                .description("Updated Description")
                .termId(1L)
                .build();

        when(courseService.updateCourse(eq(1L), any(CourseRequest.class))).thenReturn(updatedResponse);

        mockMvc.perform(put("/api/v1/courses/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Course"));

        verify(courseService, times(1)).updateCourse(eq(1L), any(CourseRequest.class));
    }

    @Test
    @WithMockUser
    void deleteCourse_Success() throws Exception {
        doNothing().when(courseService).deleteCourse(1L);

        mockMvc.perform(delete("/api/v1/courses/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(courseService, times(1)).deleteCourse(1L);
    }

    @Test
    @WithMockUser
    void getCourseProgress_Success() throws Exception {
        when(courseService.getCourseProgress(1L)).thenReturn(progressResponse);

        mockMvc.perform(get("/api/v1/courses/1/progress")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseId").value(1L))
                .andExpect(jsonPath("$.totalTasks").value(10))
                .andExpect(jsonPath("$.completedTasks").value(5))
                .andExpect(jsonPath("$.progressPercentage").value(50.0));

        verify(courseService, times(1)).getCourseProgress(1L);
    }

    @Test
    @WithMockUser
    void createCourse_InvalidInput_ReturnsBadRequest() throws Exception {
        CourseRequest invalidRequest = CourseRequest.builder()
                .title("")
                .description("Test Description")
                .termId(1L)
                .build();

        mockMvc.perform(post("/api/v1/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(courseService, never()).createCourse(any(CourseRequest.class));
    }
}
