package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.TaskRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.MemberStatus;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskStatus;
import org.test.backendprojecty.entity.TaskType;
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
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final Set<Integer> STREAK_MILESTONES = Set.of(3, 7, 14, 30, 60, 100);

    private final TaskRepository taskRepository;
    private final CourseRepository courseRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final UserRepository userRepository;
    private final TaskMapper taskMapper;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationService notificationService;

    private Course resolveCourse(Long courseId, User currentUser) {
        if (courseId == null) {
            return null;
        }
        return courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));
    }

    // Only the course's owner can hand a task to a fellow ACTIVE member — falls
    // back to the creator (existing behavior) whenever an assignee isn't both
    // requested and actually eligible, rather than erroring on a stray value.
    private User resolveAssignee(TaskRequest request, Course course, User currentUser) {
        if (request.getAssigneeUserId() == null) {
            return currentUser;
        }
        if (course == null || !course.getUser().getId().equals(currentUser.getId())) {
            return currentUser;
        }
        if (request.getAssigneeUserId().equals(currentUser.getId())) {
            return currentUser;
        }

        boolean isActiveMember = courseMemberRepository
                .findByCourseIdAndUserId(course.getId(), request.getAssigneeUserId())
                .map(m -> m.getStatus() == MemberStatus.ACTIVE)
                .orElse(false);
        if (!isActiveMember) {
            throw new BadRequestException("You can only assign tasks to active members of this course");
        }

        return userRepository.findById(request.getAssigneeUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getAssigneeUserId()));
    }

    @Transactional
    public TaskResponse createTask(TaskRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = resolveCourse(request.getCourseId(), currentUser);
        User assignee = resolveAssignee(request, course, currentUser);

        if (taskRepository.existsByTitleAndUserId(request.getTitle(), assignee.getId())) {
            throw new BadRequestException("Task title already exists");
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .completed(false)
                .status(TaskStatus.TODO)
                .type(request.getType() != null ? request.getType() : TaskType.PERSONAL)
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
                .user(assignee)
                .course(course)
                .build();

        task = taskRepository.save(task);

        if (!assignee.getId().equals(currentUser.getId())) {
            notificationService.notify(assignee, NotificationType.TASK_REMINDER,
                    "New task assigned",
                    displayName(currentUser) + " assigned you \"" + task.getTitle() + "\" in " + course.getTitle(),
                    "/courses/" + course.getId());
        }

        return taskMapper.toResponse(task);
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }

    @Transactional(readOnly = true)
    public PagingResult<TaskResponse> getAllTasks(Long courseId, PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        Pageable pageable = PaginationUtils.getPageable(request);

        Page<Task> taskPage = courseId != null
                ? taskRepository.findByUserIdAndCourseId(currentUser.getId(), courseId, pageable)
                : taskRepository.findByUserId(currentUser.getId(), pageable);

        List<TaskResponse> content = taskPage.getContent()
                .stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());

        return new PagingResult<>(
                content,
                taskPage.getTotalPages(),
                taskPage.getTotalElements(),
                taskPage.getSize(),
                taskPage.getNumber(),
                taskPage.isEmpty()
        );
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse updateTask(Long taskId, TaskRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        Course course = resolveCourse(request.getCourseId(), currentUser);

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());
        task.setCourse(course);
        task.setType(request.getType() != null ? request.getType() : TaskType.PERSONAL);
        task.setPriority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM);

        task = taskRepository.save(task);
        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse markTaskAsCompleted(Long taskId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        boolean nowCompleted = !task.isCompleted();
        task.setCompleted(nowCompleted);
        task.setCompletedAt(nowCompleted ? LocalDateTime.now() : null);
        task.setStatus(nowCompleted ? TaskStatus.DONE : TaskStatus.TODO);
        task = taskRepository.save(task);

        if (nowCompleted) {
            notifyIfCourseCompleted(task, currentUser);
            notifyIfStreakMilestone(currentUser);
        }

        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse updateTaskStatus(Long taskId, TaskStatus status) {
        User currentUser = currentUserProvider.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        boolean wasCompleted = task.isCompleted();
        boolean nowCompleted = status == TaskStatus.DONE;

        task.setStatus(status);
        task.setCompleted(nowCompleted);
        LocalDateTime completedAt = null;
        if (nowCompleted) {
            completedAt = wasCompleted && task.getCompletedAt() != null
                    ? task.getCompletedAt()
                    : LocalDateTime.now();
        }
        task.setCompletedAt(completedAt);
        task = taskRepository.save(task);

        if (nowCompleted && !wasCompleted) {
            notifyIfCourseCompleted(task, currentUser);
            notifyIfStreakMilestone(currentUser);
        }

        return taskMapper.toResponse(task);
    }

    private void notifyIfCourseCompleted(Task task, User currentUser) {
        if (task.getCourse() == null) {
            return;
        }
        Long courseId = task.getCourse().getId();
        long total = taskRepository.countByCourseId(courseId);
        long completedCount = taskRepository.countByCourseIdAndCompleted(courseId, true);
        if (total > 0 && total == completedCount) {
            notificationService.notify(
                    currentUser,
                    NotificationType.COURSE_COMPLETED,
                    "Course completed",
                    task.getCourse().getTitle() + " — 100% done.",
                    "/courses/" + courseId
            );
        }
    }

    private void notifyIfStreakMilestone(User currentUser) {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime startOfTomorrow = startOfToday.plusDays(1);
        boolean isFirstCompletionToday = taskRepository
                .countByUserIdAndCompletedTrueAndCompletedAtBetween(currentUser.getId(), startOfToday, startOfTomorrow) == 1;
        if (!isFirstCompletionToday) {
            return;
        }

        int streak = computeStreak(currentUser.getId());
        if (STREAK_MILESTONES.contains(streak)) {
            notificationService.notify(
                    currentUser,
                    NotificationType.STREAK_MILESTONE,
                    "Streak",
                    streak + " days running — don't break it today.",
                    "/stats"
            );
        }
    }

    private int computeStreak(Long userId) {
        Set<LocalDate> completedDays = taskRepository.findCompletedTimestampsByUserId(userId).stream()
                .map(LocalDateTime::toLocalDate)
                .collect(Collectors.toSet());

        LocalDate cursor = LocalDate.now();
        if (!completedDays.contains(cursor)) {
            cursor = cursor.minusDays(1);
        }
        int streak = 0;
        while (completedDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    @Transactional
    public void deleteTask(Long taskId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Task task = taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        taskRepository.delete(task);
    }
}
