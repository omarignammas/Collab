package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.repository.TaskRepository;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskReminderSchedulerServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private NotificationService notificationService;

    private TaskReminderSchedulerService schedulerService;

    private User user;
    private Task task;

    @BeforeEach
    void setUp() {
        schedulerService = new TaskReminderSchedulerService(taskRepository, notificationService);
        user = User.builder().id(1L).email("test@example.com").build();
        task = Task.builder()
                .id(1L)
                .title("Problem Set 5")
                .dueDate(LocalDate.now().plusDays(1))
                .completed(false)
                .reminderSent(false)
                .user(user)
                .build();
    }

    @Test
    void sendDueTomorrowReminders_NotifiesAndMarksSent() {
        when(taskRepository.findByDueDateAndCompletedFalseAndReminderSentFalse(LocalDate.now().plusDays(1)))
                .thenReturn(List.of(task));

        schedulerService.sendDueTomorrowReminders();

        verify(notificationService).notify(
                eq(user), eq(NotificationType.TASK_REMINDER), anyString(),
                eq("Problem Set 5 is due tomorrow."), eq("/tasks"));
        assertTrue(task.isReminderSent());
        verify(taskRepository).saveAll(List.of(task));
    }

    @Test
    void sendDueTomorrowReminders_NoTasksDue_DoesNothing() {
        when(taskRepository.findByDueDateAndCompletedFalseAndReminderSentFalse(any()))
                .thenReturn(Collections.emptyList());

        schedulerService.sendDueTomorrowReminders();

        verifyNoInteractions(notificationService);
        verify(taskRepository).saveAll(Collections.emptyList());
    }
}
