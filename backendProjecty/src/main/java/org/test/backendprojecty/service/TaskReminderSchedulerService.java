package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.repository.TaskRepository;

import java.time.LocalDate;
import java.util.List;

// Once a day, notifies each task's owner about anything due tomorrow — a
// `reminderSent` flag (not just the date match) guards against duplicate
// notifications if the app restarts more than once on the same day.
@Service
@RequiredArgsConstructor
public class TaskReminderSchedulerService {

    private final TaskRepository taskRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendDueTomorrowReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Task> dueTomorrow = taskRepository.findByDueDateAndCompletedFalseAndReminderSentFalse(tomorrow);

        for (Task task : dueTomorrow) {
            notificationService.notify(
                    task.getUser(),
                    NotificationType.TASK_REMINDER,
                    "Reminder",
                    task.getTitle() + " is due tomorrow.",
                    "/tasks"
            );
            task.setReminderSent(true);
        }

        taskRepository.saveAll(dueTomorrow);
    }
}
