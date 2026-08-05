package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import org.test.backendprojecty.dtos.request.ConfirmedTaskItem;
import org.test.backendprojecty.dtos.request.TaskPlanConfirmRequest;
import org.test.backendprojecty.dtos.response.TaskPlanResponse;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.event.TaskPlanRequestedEvent;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.TaskMapper;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.TaskPlanGenerationRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskPlanServiceTest {

    @Mock private TaskPlanGenerationRepository taskPlanRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private CourseFileStorageService courseFileStorageService;
    @Mock private PdfTextExtractionService pdfTextExtractionService;
    @Mock private LlmApiClient llmApiClient;
    @Mock private NotificationService notificationService;
    @Mock private CurrentUserProvider currentUserProvider;
    @Mock private ApplicationEventPublisher eventPublisher;

    private TaskPlanService service;

    private User owner;
    private Course course;
    private TaskPlanGeneration plan;

    @BeforeEach
    void setUp() {
        service = new TaskPlanService(
                taskPlanRepository, courseRepository, taskRepository, courseFileStorageService,
                pdfTextExtractionService, llmApiClient, notificationService, currentUserProvider,
                eventPublisher, new TaskMapper()
        );

        owner = User.builder().id(1L).firstName("Owner").lastName("User").email("owner@example.com").build();
        course = Course.builder().id(100L).user(owner).title("Capstone Project").build();
        plan = TaskPlanGeneration.builder().id(500L).course(course).user(owner)
                .status(GenerationStatus.PENDING).build();
    }

    // --- requestPlan ---

    @Test
    void requestPlan_WithPdfReference_ExtractsTextAndPublishesEvent() throws Exception {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        MockMultipartFile file = new MockMultipartFile("file", "brief.pdf", "application/pdf", "pdf-bytes".getBytes());
        when(courseFileStorageService.store(eq(1L), any())).thenReturn(
                new CourseFileStorageService.StoredFile("/uploads/course-files/1-x.pdf", SourceFileType.PDF));
        when(pdfTextExtractionService.extractText(any())).thenReturn("Build a capstone project on X");
        when(taskPlanRepository.save(any(TaskPlanGeneration.class))).thenAnswer(inv -> {
            TaskPlanGeneration p = inv.getArgument(0);
            p.setId(500L);
            return p;
        });

        TaskPlanResponse response = service.requestPlan(100L, file, LocalDate.now().plusWeeks(6), null);

        ArgumentCaptor<TaskPlanGeneration> captor = ArgumentCaptor.forClass(TaskPlanGeneration.class);
        verify(taskPlanRepository).save(captor.capture());
        assertEquals("Build a capstone project on X", captor.getValue().getExtractedText());
        assertEquals(GenerationStatus.PENDING, response.getStatus());
        verify(eventPublisher).publishEvent(new TaskPlanRequestedEvent(500L));
    }

    @Test
    void requestPlan_NoFileNoContext_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));

        assertThrows(BadRequestException.class, () -> service.requestPlan(100L, null, null, null));
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void requestPlan_ContextOnlyNoFile_Success() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        when(taskPlanRepository.save(any(TaskPlanGeneration.class))).thenAnswer(inv -> inv.getArgument(0));

        service.requestPlan(100L, null, null, "Build a personal portfolio site in 4 weeks");

        verify(eventPublisher).publishEvent(any(TaskPlanRequestedEvent.class));
        verifyNoInteractions(courseFileStorageService);
    }

    @Test
    void requestPlan_CourseNotOwned_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.requestPlan(100L, null, null, "context"));
    }

    // --- onTaskPlanRequested ---

    @Test
    void onTaskPlanRequested_ValidJson_SavesProposedTasksAndNotifies() {
        plan.setExtractedText("material");
        when(taskPlanRepository.findById(500L)).thenReturn(Optional.of(plan));
        when(llmApiClient.generateText(anyString())).thenReturn("""
                [
                  {"title": "Draft outline", "description": "Sketch the structure", "dueDate": "2026-09-01", "priority": "HIGH", "type": "ASSIGNMENT"},
                  {"title": "Write intro", "dueDate": "2026-09-05", "priority": "MEDIUM", "type": "ASSIGNMENT"}
                ]
                """);
        when(taskPlanRepository.save(any(TaskPlanGeneration.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onTaskPlanRequested(new TaskPlanRequestedEvent(500L));

        ArgumentCaptor<TaskPlanGeneration> captor = ArgumentCaptor.forClass(TaskPlanGeneration.class);
        verify(taskPlanRepository).save(captor.capture());
        assertEquals(GenerationStatus.READY, captor.getValue().getStatus());
        assertTrue(captor.getValue().getProposedTasksJson().contains("Draft outline"));

        verify(notificationService).notify(eq(owner), eq(NotificationType.TASK_PLAN_READY),
                anyString(), anyString(), eq("/courses/100"));
    }

    @Test
    void onTaskPlanRequested_ImageReference_DescribesImageFirst(@TempDir Path tempDir) throws Exception {
        Path courseFilesDir = tempDir.resolve("course-files");
        Files.createDirectories(courseFilesDir);
        Files.write(courseFilesDir.resolve("1-x.png"), "fake-png-bytes".getBytes());
        Field field = TaskPlanService.class.getDeclaredField("uploadsDir");
        field.setAccessible(true);
        field.set(service, tempDir.toString());

        plan.setSourceFileType(SourceFileType.IMAGE);
        plan.setSourceFileUrl("/uploads/course-files/1-x.png");
        when(taskPlanRepository.findById(500L)).thenReturn(Optional.of(plan));
        when(llmApiClient.generateFromImage(anyString(), any(byte[].class), eq("image/png")))
                .thenReturn("Assignment sheet: build a REST API by next month");
        when(llmApiClient.generateText(anyString())).thenReturn(
                "[{\"title\": \"Design API\", \"dueDate\": \"2026-09-01\", \"priority\": \"HIGH\", \"type\": \"ASSIGNMENT\"}]");
        when(taskPlanRepository.save(any(TaskPlanGeneration.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onTaskPlanRequested(new TaskPlanRequestedEvent(500L));

        verify(llmApiClient).generateFromImage(anyString(), any(byte[].class), eq("image/png"));
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmApiClient).generateText(promptCaptor.capture());
        assertTrue(promptCaptor.getValue().contains("build a REST API by next month"));
    }

    @Test
    void onTaskPlanRequested_MalformedJson_MarksFailed() {
        when(taskPlanRepository.findById(500L)).thenReturn(Optional.of(plan));
        when(llmApiClient.generateText(anyString())).thenReturn("not json");
        when(taskPlanRepository.save(any(TaskPlanGeneration.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onTaskPlanRequested(new TaskPlanRequestedEvent(500L));

        ArgumentCaptor<TaskPlanGeneration> captor = ArgumentCaptor.forClass(TaskPlanGeneration.class);
        verify(taskPlanRepository).save(captor.capture());
        assertEquals(GenerationStatus.FAILED, captor.getValue().getStatus());
        verifyNoInteractions(notificationService);
    }

    @Test
    void onTaskPlanRequested_CancelledWhileInFlight_DoesNotOverwriteWithReady() {
        when(taskPlanRepository.findById(500L)).thenReturn(Optional.of(plan));
        when(llmApiClient.generateText(anyString())).thenReturn(
                "[{\"title\": \"Draft outline\", \"dueDate\": \"2026-09-01\", \"priority\": \"HIGH\", \"type\": \"ASSIGNMENT\"}]");
        when(taskPlanRepository.findStatusById(500L)).thenReturn(GenerationStatus.CANCELLED);

        service.onTaskPlanRequested(new TaskPlanRequestedEvent(500L));

        verify(taskPlanRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void onTaskPlanRequested_PlanNotFound_NoOp() {
        when(taskPlanRepository.findById(999L)).thenReturn(Optional.empty());

        service.onTaskPlanRequested(new TaskPlanRequestedEvent(999L));

        verifyNoInteractions(llmApiClient, notificationService);
    }

    // --- cancel ---

    @Test
    void cancel_Pending_SetsCancelled() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        when(taskPlanRepository.findByIdAndCourseId(500L, 100L)).thenReturn(Optional.of(plan));

        service.cancel(100L, 500L);

        assertEquals(GenerationStatus.CANCELLED, plan.getStatus());
        verify(taskPlanRepository).save(plan);
    }

    @Test
    void cancel_NotPending_ThrowsBadRequest() {
        plan.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        when(taskPlanRepository.findByIdAndCourseId(500L, 100L)).thenReturn(Optional.of(plan));

        assertThrows(BadRequestException.class, () -> service.cancel(100L, 500L));
        verify(taskPlanRepository, never()).save(any());
    }

    // --- confirmPlan ---

    @Test
    void confirmPlan_Ready_CreatesTasksAndMarksApplied() {
        plan.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        when(taskPlanRepository.findByIdAndCourseId(500L, 100L)).thenReturn(Optional.of(plan));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> {
            Task t = inv.getArgument(0);
            t.setId(1L);
            return t;
        });

        TaskPlanConfirmRequest request = TaskPlanConfirmRequest.builder()
                .tasks(List.of(
                        ConfirmedTaskItem.builder().title("Draft outline").dueDate(LocalDate.of(2026, 9, 1))
                                .priority(TaskPriority.HIGH).type(TaskType.ASSIGNMENT).build(),
                        ConfirmedTaskItem.builder().title("Write intro").build()
                ))
                .build();

        List<TaskResponse> result = service.confirmPlan(100L, 500L, request);

        assertEquals(2, result.size());
        verify(taskRepository, times(2)).save(any(Task.class));
        assertTrue(plan.isApplied());
    }

    @Test
    void confirmPlan_NotReady_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        when(taskPlanRepository.findByIdAndCourseId(500L, 100L)).thenReturn(Optional.of(plan));

        TaskPlanConfirmRequest request = TaskPlanConfirmRequest.builder()
                .tasks(List.of(ConfirmedTaskItem.builder().title("x").build()))
                .build();

        assertThrows(BadRequestException.class, () -> service.confirmPlan(100L, 500L, request));
        verifyNoInteractions(taskRepository);
    }

    @Test
    void confirmPlan_AlreadyApplied_ThrowsBadRequest() {
        plan.setStatus(GenerationStatus.READY);
        plan.setApplied(true);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(100L, 1L)).thenReturn(Optional.of(course));
        when(taskPlanRepository.findByIdAndCourseId(500L, 100L)).thenReturn(Optional.of(plan));

        TaskPlanConfirmRequest request = TaskPlanConfirmRequest.builder()
                .tasks(List.of(ConfirmedTaskItem.builder().title("x").build()))
                .build();

        assertThrows(BadRequestException.class, () -> service.confirmPlan(100L, 500L, request));
        verifyNoInteractions(taskRepository);
    }

    // --- parsePlanJson table tests ---

    @Test
    void parsePlanJson_FencedJson_StripsAndParses() {
        List<TaskPlanService.ProposedTask> result = service.parsePlanJson("""
                ```json
                [{"title": "Q1", "dueDate": "2026-09-01", "priority": "LOW", "type": "READING"}]
                ```
                """);
        assertEquals(1, result.size());
        assertEquals("Q1", result.get(0).title());
    }

    @Test
    void parsePlanJson_MissingTitle_Throws() {
        assertThrows(IllegalStateException.class,
                () -> service.parsePlanJson("[{\"dueDate\": \"2026-09-01\"}]"));
    }

    @Test
    void parsePlanJson_InvalidEnumValues_FallsBackToDefaults() {
        List<TaskPlanService.ProposedTask> result = service.parsePlanJson(
                "[{\"title\": \"X\", \"priority\": \"URGENT\", \"type\": \"NONSENSE\"}]");
        assertEquals(TaskPriority.MEDIUM, result.get(0).priority());
        assertEquals(TaskType.PERSONAL, result.get(0).type());
    }

    @Test
    void parsePlanJson_InvalidDate_FallsBackToNull() {
        List<TaskPlanService.ProposedTask> result = service.parsePlanJson(
                "[{\"title\": \"X\", \"dueDate\": \"not-a-date\"}]");
        assertNull(result.get(0).dueDate());
    }

    @Test
    void parsePlanJson_NotAnArray_Throws() {
        assertThrows(IllegalStateException.class, () -> service.parsePlanJson("{\"title\": \"X\"}"));
    }

    @Test
    void parsePlanJson_EmptyArray_Throws() {
        assertThrows(IllegalStateException.class, () -> service.parsePlanJson("[]"));
    }
}
