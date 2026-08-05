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
import org.test.backendprojecty.dtos.request.TaskRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskType;
import org.test.backendprojecty.security.JwtAuthenticationFilter;
import org.test.backendprojecty.service.TaskService;

import java.time.LocalDate;
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
        controllers = TaskController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class
        )
)
@AutoConfigureMockMvc(addFilters = false)
@Import(JacksonTestConfig.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskService taskService;

    private TaskRequest taskRequest;
    private TaskResponse taskResponse;
    private PagingResult<TaskResponse> pagingResult;

    @BeforeEach
    void setUp() {
        taskRequest = TaskRequest.builder()
                .title("Test Task")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .courseId(1L)
                .priority(TaskPriority.MEDIUM)
                .type(TaskType.ASSIGNMENT)
                .build();

        taskResponse = TaskResponse.builder()
                .id(1L)
                .title("Test Task")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .completed(false)
                .courseId(1L)
                .courseTitle("Test Course")
                .priority(TaskPriority.MEDIUM)
                .type(TaskType.ASSIGNMENT)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // IMPORTANT: Pass page=0 because constructor adds 1 internally
        pagingResult = new PagingResult<>(
                Arrays.asList(taskResponse),
                1,      // totalPages
                1L,     // totalElements
                10,     // size
                0,      // page (will become 1 in constructor)
                false   // empty
        );
    }

    @Test
    @WithMockUser
    void createTask_Success() throws Exception {
        when(taskService.createTask(any(TaskRequest.class))).thenReturn(taskResponse);

        mockMvc.perform(post("/api/v1/tasks")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Test Task"));

        verify(taskService, times(1)).createTask(any(TaskRequest.class));
    }

    @Test
    @WithMockUser
    void getAllTasks_Success() throws Exception {
        when(taskService.getAllTasks(eq(null), any())).thenReturn(pagingResult);

        mockMvc.perform(get("/api/v1/tasks")
                        .with(csrf())
                        .param("page", "0")
                        .param("size", "10")
                        .param("sortField", "id")
                        .param("direction", "ASC")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].title").value("Test Task"))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.page").value(1))  // 0 + 1 = 1
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.empty").value(false));

        verify(taskService, times(1)).getAllTasks(eq(null), any());
    }

    @Test
    @WithMockUser
    void getAllTasks_FilteredByCourse_Success() throws Exception {
        when(taskService.getAllTasks(eq(1L), any())).thenReturn(pagingResult);

        mockMvc.perform(get("/api/v1/tasks")
                        .with(csrf())
                        .param("courseId", "1")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].courseId").value(1L));

        verify(taskService, times(1)).getAllTasks(eq(1L), any());
    }

    @Test
    @WithMockUser
    void getAllTasks_EmptyResult_Success() throws Exception {
        PagingResult<TaskResponse> emptyResult = new PagingResult<>(
                Collections.emptyList(),
                0,
                0L,
                10,
                0,    // Will become 1 in constructor
                true
        );
        when(taskService.getAllTasks(eq(null), any())).thenReturn(emptyResult);

        mockMvc.perform(get("/api/v1/tasks")
                        .with(csrf())
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty())
                .andExpect(jsonPath("$.empty").value(true));

        verify(taskService, times(1)).getAllTasks(eq(null), any());
    }

    @Test
    @WithMockUser
    void getTaskById_Success() throws Exception {
        when(taskService.getTaskById(1L)).thenReturn(taskResponse);

        mockMvc.perform(get("/api/v1/tasks/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("Test Task"));

        verify(taskService, times(1)).getTaskById(1L);
    }

    @Test
    @WithMockUser
    void updateTask_Success() throws Exception {
        TaskRequest updateRequest = TaskRequest.builder()
                .title("Updated Task")
                .description("Updated Description")
                .dueDate(LocalDate.now().plusDays(10))
                .build();

        TaskResponse updatedResponse = TaskResponse.builder()
                .id(1L)
                .title("Updated Task")
                .description("Updated Description")
                .dueDate(LocalDate.now().plusDays(10))
                .completed(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(taskService.updateTask(eq(1L), any(TaskRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/v1/tasks/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Task"));

        verify(taskService, times(1)).updateTask(eq(1L), any(TaskRequest.class));
    }

    @Test
    @WithMockUser
    void markTaskAsCompleted_Success() throws Exception {
        TaskResponse completedTask = TaskResponse.builder()
                .id(1L)
                .title("Test Task")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .completed(true)
                .courseId(1L)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(taskService.markTaskAsCompleted(1L)).thenReturn(completedTask);

        mockMvc.perform(put("/api/v1/tasks/1/complete")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));

        verify(taskService, times(1)).markTaskAsCompleted(1L);
    }

    @Test
    @WithMockUser
    void deleteTask_Success() throws Exception {
        doNothing().when(taskService).deleteTask(1L);

        mockMvc.perform(delete("/api/v1/tasks/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(taskService, times(1)).deleteTask(1L);
    }

    @Test
    @WithMockUser
    void createTask_InvalidInput_ReturnsBadRequest() throws Exception {
        TaskRequest invalidRequest = TaskRequest.builder()
                .title("")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .build();

        mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verify(taskService, never()).createTask(any(TaskRequest.class));
    }
}
