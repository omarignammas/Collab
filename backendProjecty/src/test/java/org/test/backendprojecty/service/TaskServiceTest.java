package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.TaskRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.CourseMember;
import org.test.backendprojecty.entity.MemberStatus;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.TaskStatus;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.TaskMapper;
import org.test.backendprojecty.repository.CourseMemberRepository;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private CourseMemberRepository courseMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private TaskService taskService;

    private User user;
    private Course course;
    private Task task;
    private TaskRequest taskRequest;
    private TaskResponse taskResponse;
    private PaginationRequest paginationRequest;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("test@example.com")
                .build();

        course = Course.builder()
                .id(1L)
                .title("Test Course")
                .user(user)
                .build();

        task = Task.builder()
                .id(1L)
                .title("Test Task")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .completed(false)
                .status(TaskStatus.TODO)
                .user(user)
                .course(course)
                .build();

        taskRequest = TaskRequest.builder()
                .title("Test Task")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .courseId(1L)
                .build();

        taskResponse = TaskResponse.builder()
                .id(1L)
                .title("Test Task")
                .description("Test Description")
                .dueDate(LocalDate.now().plusDays(7))
                .completed(false)
                .courseId(1L)
                .build();

        paginationRequest = PaginationRequest.builder()
                .page(1)
                .size(10)
                .sortField("id")
                .direction(Sort.Direction.ASC)
                .build();

        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(user);
    }

    @Test
    void createTask_Success() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        TaskResponse response = taskService.createTask(taskRequest);

        assertNotNull(response);
        assertEquals("Test Task", response.getTitle());
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void createTask_WithoutCourse_Success() {
        TaskRequest personalRequest = TaskRequest.builder()
                .title("Personal Task")
                .build();
        Task personalTask = Task.builder()
                .id(2L)
                .title("Personal Task")
                .user(user)
                .build();
        TaskResponse personalResponse = TaskResponse.builder()
                .id(2L)
                .title("Personal Task")
                .build();

        when(taskRepository.save(any(Task.class))).thenReturn(personalTask);
        when(taskMapper.toResponse(personalTask)).thenReturn(personalResponse);

        TaskResponse response = taskService.createTask(personalRequest);

        assertNotNull(response);
        assertNull(response.getCourseId());
        verify(courseRepository, never()).findByIdAndUserIdAndDeletedFalse(any(), any());
    }

    @Test
    void getAllTasks_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Task> taskPage = new PageImpl<>(Arrays.asList(task), pageable, 1);

        when(taskRepository.findByUserId(eq(1L), any(Pageable.class)))
                .thenReturn(taskPage);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        PagingResult<TaskResponse> result = taskService.getAllTasks(null, paginationRequest);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(1, result.getTotalPages());
        assertEquals(1, result.getPage());
        assertEquals("Test Task", result.getContent().iterator().next().getTitle());
        verify(taskRepository).findByUserId(eq(1L), any(Pageable.class));
    }

    @Test
    void markTaskAsCompleted_Success() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        TaskResponse response = taskService.markTaskAsCompleted(1L);

        assertNotNull(response);
        assertTrue(task.isCompleted());
        assertNotNull(task.getCompletedAt());
        assertEquals(TaskStatus.DONE, task.getStatus());
        verify(taskRepository).save(task);
    }

    @Test
    void markTaskAsCompleted_Toggle_ClearsCompletedAt() {
        task.setCompleted(true);
        task.setCompletedAt(LocalDateTime.now());
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        taskService.markTaskAsCompleted(1L);

        assertFalse(task.isCompleted());
        assertNull(task.getCompletedAt());
        assertEquals(TaskStatus.TODO, task.getStatus());
        verifyNoInteractions(notificationService);
    }

    @Test
    void updateTaskStatus_ToInProgress_PersistsWithoutCompleting() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        taskService.updateTaskStatus(1L, TaskStatus.IN_PROGRESS);

        assertEquals(TaskStatus.IN_PROGRESS, task.getStatus());
        assertFalse(task.isCompleted());
        assertNull(task.getCompletedAt());
        verifyNoInteractions(notificationService);
    }

    @Test
    void updateTaskStatus_ToDone_SynchronizesCompletion() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        taskService.updateTaskStatus(1L, TaskStatus.DONE);

        assertEquals(TaskStatus.DONE, task.getStatus());
        assertTrue(task.isCompleted());
        assertNotNull(task.getCompletedAt());
    }

    @Test
    void updateTaskStatus_ReopenDoneTask_ClearsCompletion() {
        task.setStatus(TaskStatus.DONE);
        task.setCompleted(true);
        task.setCompletedAt(LocalDateTime.now());
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        taskService.updateTaskStatus(1L, TaskStatus.TODO);

        assertEquals(TaskStatus.TODO, task.getStatus());
        assertFalse(task.isCompleted());
        assertNull(task.getCompletedAt());
        verifyNoInteractions(notificationService);
    }

    @Test
    void markTaskAsCompleted_CourseFullyCompleted_NotifiesCourseCompleted() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);
        when(taskRepository.countByCourseId(1L)).thenReturn(3L);
        when(taskRepository.countByCourseIdAndCompleted(1L, true)).thenReturn(3L);

        taskService.markTaskAsCompleted(1L);

        verify(notificationService).notify(
                eq(user), eq(NotificationType.COURSE_COMPLETED), anyString(),
                eq("Test Course — 100% done."), eq("/courses/1"));
    }

    @Test
    void markTaskAsCompleted_CourseNotFullyCompleted_DoesNotNotify() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);
        when(taskRepository.countByCourseId(1L)).thenReturn(3L);
        when(taskRepository.countByCourseIdAndCompleted(1L, true)).thenReturn(2L);

        taskService.markTaskAsCompleted(1L);

        verify(notificationService, never()).notify(any(), eq(NotificationType.COURSE_COMPLETED), any(), any(), any());
    }

    @Test
    void markTaskAsCompleted_NoCourse_DoesNotCheckCourseCompletion() {
        Task personalTask = Task.builder().id(3L).title("Personal").completed(false).user(user).build();
        when(taskRepository.findByIdAndUserId(3L, 1L)).thenReturn(Optional.of(personalTask));
        when(taskRepository.save(personalTask)).thenReturn(personalTask);
        when(taskMapper.toResponse(personalTask)).thenReturn(taskResponse);

        taskService.markTaskAsCompleted(3L);

        verify(taskRepository, never()).countByCourseId(any());
        verify(notificationService, never()).notify(any(), eq(NotificationType.COURSE_COMPLETED), any(), any(), any());
    }

    @Test
    void markTaskAsCompleted_StreakMilestoneReached_NotifiesStreak() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);
        when(taskRepository.countByUserIdAndCompletedTrueAndCompletedAtBetween(eq(1L), any(), any())).thenReturn(1L);

        LocalDate today = LocalDate.now();
        when(taskRepository.findCompletedTimestampsByUserId(1L)).thenReturn(List.of(
                today.atTime(9, 0),
                today.minusDays(1).atTime(9, 0),
                today.minusDays(2).atTime(9, 0)
        ));

        taskService.markTaskAsCompleted(1L);

        verify(notificationService).notify(
                eq(user), eq(NotificationType.STREAK_MILESTONE), anyString(),
                eq("3 days running — don't break it today."), eq("/stats"));
    }

    @Test
    void markTaskAsCompleted_StreakNotAtMilestone_DoesNotNotify() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);
        when(taskRepository.countByUserIdAndCompletedTrueAndCompletedAtBetween(eq(1L), any(), any())).thenReturn(1L);
        when(taskRepository.findCompletedTimestampsByUserId(1L)).thenReturn(List.of(LocalDate.now().atTime(9, 0)));

        taskService.markTaskAsCompleted(1L);

        verify(notificationService, never()).notify(any(), eq(NotificationType.STREAK_MILESTONE), any(), any(), any());
    }

    @Test
    void markTaskAsCompleted_NotFirstCompletionToday_SkipsStreakCheck() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));
        when(taskRepository.save(task)).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);
        when(taskRepository.countByUserIdAndCompletedTrueAndCompletedAtBetween(eq(1L), any(), any())).thenReturn(2L);

        taskService.markTaskAsCompleted(1L);

        verify(taskRepository, never()).findCompletedTimestampsByUserId(any());
        verify(notificationService, never()).notify(any(), eq(NotificationType.STREAK_MILESTONE), any(), any(), any());
    }

    @Test
    void deleteTask_Success() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(task));

        taskService.deleteTask(1L);

        verify(taskRepository).delete(task);
    }

    @Test
    void getTaskById_NotFound_ThrowsException() {
        when(taskRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> taskService.getTaskById(1L));
    }

    @Test
    void createTask_WithAssignee_OwnerAssignsToActiveMember_Success() {
        User member = User.builder().id(2L).email("member@example.com").firstName("Mem").lastName("Ber").build();
        TaskRequest requestWithAssignee = TaskRequest.builder()
                .title("Team Task")
                .courseId(1L)
                .assigneeUserId(2L)
                .build();
        Task assignedTask = Task.builder().id(4L).title("Team Task").user(member).course(course).build();

        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.of(
                CourseMember.builder().course(course).user(member).status(MemberStatus.ACTIVE).build()));
        when(userRepository.findById(2L)).thenReturn(Optional.of(member));
        when(taskRepository.existsByTitleAndUserId("Team Task", 2L)).thenReturn(false);
        when(taskRepository.save(any(Task.class))).thenReturn(assignedTask);
        when(taskMapper.toResponse(assignedTask)).thenReturn(taskResponse);

        taskService.createTask(requestWithAssignee);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertEquals(member, captor.getValue().getUser());
        verify(notificationService).notify(eq(member), eq(NotificationType.TASK_REMINDER),
                anyString(), anyString(), eq("/courses/1"));
    }

    @Test
    void createTask_WithAssignee_TargetNotActiveMember_ThrowsBadRequest() {
        TaskRequest requestWithAssignee = TaskRequest.builder()
                .title("Team Task")
                .courseId(1L)
                .assigneeUserId(2L)
                .build();

        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> taskService.createTask(requestWithAssignee));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_WithAssignee_NonOwnerCourse_FallsBackToCurrentUser() {
        User otherOwner = User.builder().id(5L).email("other@example.com").build();
        Course notOwnedByMe = Course.builder().id(9L).title("Not Mine").user(otherOwner).build();
        TaskRequest requestWithAssignee = TaskRequest.builder()
                .title("Solo Task")
                .courseId(9L)
                .assigneeUserId(2L)
                .build();

        when(courseRepository.findByIdAndUserIdAndDeletedFalse(9L, 1L)).thenReturn(Optional.of(notOwnedByMe));
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        when(taskMapper.toResponse(task)).thenReturn(taskResponse);

        taskService.createTask(requestWithAssignee);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertEquals(user, captor.getValue().getUser());
        verifyNoInteractions(courseMemberRepository);
    }
}
