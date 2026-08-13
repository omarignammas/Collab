package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.dtos.response.MomentumResponse;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.dtos.response.TodayBriefResponse;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.mapper.TaskMapper;
import org.test.backendprojecty.repository.FocusTimeEntryRepository;
import org.test.backendprojecty.repository.QuizAttemptRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MomentumService {

    private final TaskRepository taskRepository;
    private final FocusTimeEntryRepository focusTimeEntryRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final TaskMapper taskMapper;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public MomentumResponse getCurrentMomentum() {
        return getMomentumFor(currentUserProvider.getCurrentUser());
    }

    @Transactional(readOnly = true)
    public TodayBriefResponse getTodayBrief() {
        User user = currentUserProvider.getCurrentUser();
        LocalDate today = LocalDate.now();
        List<Task> openTasks = taskRepository.findByUserId(user.getId(), org.springframework.data.domain.Pageable.unpaged()).getContent().stream()
                .filter(task -> !task.isCompleted())
                .sorted(taskPriority(today))
                .toList();

        List<TaskResponse> plan = openTasks.stream().limit(3).map(taskMapper::toResponse).toList();
        int overdueCount = (int) openTasks.stream().filter(task -> task.getDueDate() != null && task.getDueDate().isBefore(today)).count();

        return TodayBriefResponse.builder()
                .momentum(getMomentumFor(user))
                .nextAction(plan.isEmpty() ? null : plan.get(0))
                .plan(plan)
                .overdueCount(overdueCount)
                .openTaskCount(openTasks.size())
                .build();
    }

    public MomentumResponse getMomentumFor(User user) {
        LocalDate weekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        return getMomentumForWeek(user, weekStart);
    }

    public MomentumResponse getMomentumForWeek(User user, LocalDate weekStart) {
        LocalDateTime startOfWeek = weekStart.atStartOfDay();
        LocalDateTime endOfWeek = weekStart.plusWeeks(1).atStartOfDay();
        Instant startOfWeekInstant = startOfWeek.atZone(ZoneId.systemDefault()).toInstant();
        Instant endOfWeekInstant = endOfWeek.atZone(ZoneId.systemDefault()).toInstant();

        List<Task> completedTasks = taskRepository.findByUserIdAndCompletedTrueAndCompletedAtBetween(user.getId(), startOfWeek, endOfWeek);
        int completedCount = completedTasks.size();
        var focusEntries = focusTimeEntryRepository.findByUserIdAndEarnedAtBetween(user.getId(), startOfWeekInstant, endOfWeekInstant);
        var quizAttemptsThisWeek = quizAttemptRepository.findByUserIdAndCompletedAtBetween(user.getId(), startOfWeek, endOfWeek);
        int focusMinutes = focusEntries.stream()
                .mapToInt(entry -> entry.getMinutesFocused())
                .sum();
        int quizAttempts = quizAttemptsThisWeek.size();

        Set<LocalDate> activeDays = new HashSet<>(completedTasks.stream().map(task -> task.getCompletedAt().toLocalDate()).toList());
        focusEntries
                .forEach(entry -> activeDays.add(entry.getEarnedAt().atZone(ZoneId.systemDefault()).toLocalDate()));
        quizAttemptsThisWeek
                .forEach(attempt -> activeDays.add(attempt.getCompletedAt().toLocalDate()));

        int taskPoints = Math.min(50, completedCount * 17);
        int focusPoints = Math.min(30, (int) Math.round(focusMinutes / 4.0));
        int quizPoints = Math.min(10, quizAttempts * 5);
        int consistencyPoints = Math.min(10, activeDays.size() * 3);

        return MomentumResponse.builder()
                .score(taskPoints + focusPoints + quizPoints + consistencyPoints)
                .taskPoints(taskPoints)
                .focusPoints(focusPoints)
                .quizPoints(quizPoints)
                .consistencyPoints(consistencyPoints)
                .completedTasks(completedCount)
                .focusMinutes(focusMinutes)
                .quizAttempts(quizAttempts)
                .activeDays(activeDays.size())
                .build();
    }

    private Comparator<Task> taskPriority(LocalDate today) {
        return Comparator
                .comparing((Task task) -> task.getDueDate() == null ? 2 : task.getDueDate().isBefore(today) ? 0 : task.getDueDate().isEqual(today) ? 1 : 2)
                .thenComparing(task -> task.getDueDate() == null ? LocalDate.MAX : task.getDueDate())
                .thenComparing(task -> switch (task.getPriority()) {
                    case HIGH -> 0;
                    case MEDIUM -> 1;
                    case LOW -> 2;
                });
    }
}
