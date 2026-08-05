package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.entity.Notification;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.repository.NotificationRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.repository.UserRepository;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

// Once a day, looks for concrete signs a user is falling behind — an overdue
// pile-up, a due-date crunch, or several days with no completions — and has
// Groq phrase a short, specific nudge about it. If nothing looks wrong and it's
// been a few days since their last message from this channel, sends an
// encouraging tip/quote instead, so it stays a useful presence rather than
// either silent or naggy. Runs 30 minutes after the due-tomorrow reminder job
// so the two don't compete for the same LLM/DB resources at once.
@Service
@RequiredArgsConstructor
@Slf4j
public class AiCoachSchedulerService {

    private static final int OVERDUE_THRESHOLD = 3;
    private static final int DUE_TODAY_CRUNCH_THRESHOLD = 5;
    private static final int INACTIVITY_DAYS_THRESHOLD = 3;
    private static final int MOTIVATION_INTERVAL_DAYS = 3;
    private static final List<NotificationType> AI_TYPES = List.of(NotificationType.AI_INSIGHT, NotificationType.AI_MOTIVATION);

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final LlmApiClient llmApiClient;

    // Deliberately not @Transactional at this level — each user's read+notify
    // stays its own small transaction (notificationService.notify() already
    // opens one). Sharing a single transaction across the whole loop meant one
    // rejected insert marked it rollback-only and silently failed every user
    // after that point too.
    @Scheduled(cron = "0 30 8 * * *")
    public void runDailyCheck() {
        List<User> users = userRepository.findByEnabledTrue(Pageable.unpaged()).getContent();
        for (User user : users) {
            try {
                checkUser(user);
            } catch (Exception e) {
                log.warn("AI coach check failed for user {}", user.getId(), e);
            }
            // Groq caps this model at 30 requests/minute (org-wide, shared with
            // every other feature using it) — a 300ms gap still blew through that
            // in ~9s during testing. 2.5s keeps this run at ~24 req/min with
            // headroom for whatever else is calling Groq at the same time; this is
            // a once-a-day batch job, so the extra runtime costs nothing real.
            try {
                Thread.sleep(2_500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private void checkUser(User user) {
        LocalDate today = LocalDate.now();
        long overdueCount = taskRepository.countByUserIdAndCompletedFalseAndDueDateBefore(user.getId(), today);
        long dueTodayCount = taskRepository.countByUserIdAndCompletedFalseAndDueDate(user.getId(), today);
        Optional<Task> lastCompleted = taskRepository.findFirstByUserIdAndCompletedTrueOrderByCompletedAtDesc(user.getId());
        long daysSinceLastCompletion = lastCompleted
                .map(t -> ChronoUnit.DAYS.between(t.getCompletedAt().toLocalDate(), today))
                .orElse(Long.MAX_VALUE);

        boolean somethingWrong = overdueCount >= OVERDUE_THRESHOLD
                || dueTodayCount >= DUE_TODAY_CRUNCH_THRESHOLD
                || daysSinceLastCompletion >= INACTIVITY_DAYS_THRESHOLD;

        if (somethingWrong) {
            sendInsight(user, overdueCount, dueTodayCount, daysSinceLastCompletion);
            return;
        }

        Optional<Notification> lastAiMessage =
                notificationRepository.findFirstByRecipientIdAndTypeInOrderByCreatedAtDesc(user.getId(), AI_TYPES);
        boolean dueForMotivation = lastAiMessage
                .map(n -> ChronoUnit.DAYS.between(n.getCreatedAt().toLocalDate(), today) >= MOTIVATION_INTERVAL_DAYS)
                .orElse(true);

        if (dueForMotivation) {
            sendMotivation(user);
        }
    }

    private void sendInsight(User user, long overdueCount, long dueTodayCount, long daysSinceLastCompletion) {
        String signals = String.format(
                "Overdue tasks: %d. Tasks due today: %d. Days since their last completed task: %s.",
                overdueCount, dueTodayCount,
                daysSinceLastCompletion == Long.MAX_VALUE ? "they have never completed one" : daysSinceLastCompletion);

        String prompt = "You are a supportive productivity coach inside a student study app called Collab. "
                + "Based on these signals about one user, write ONE short notification body (max 2 sentences, plain text, "
                + "no markdown, don't just restate the raw numbers like a report) that helps them get back on track. "
                + "Be specific and direct, not generic. Signals: " + signals;

        String body = safeGenerate(prompt, "You've got some catching up to do on your tasks — pick one and start now.");
        notificationService.notify(user, NotificationType.AI_INSIGHT, "Let's catch up", body, "/tasks");
    }

    private void sendMotivation(User user) {
        String prompt = "You are a supportive productivity coach inside a student study app called Collab. "
                + "Write ONE short, encouraging message (max 2 sentences, plain text, no markdown) for a student who is "
                + "currently on top of their tasks. Alternate between a concrete productivity tip and a short motivational "
                + "line — sound like a real coach, not a generic quote bot.";

        String body = safeGenerate(prompt, "You're on track — keep the momentum going today.");
        notificationService.notify(user, NotificationType.AI_MOTIVATION, "From your coach", body, "/dashboard");
    }

    private String safeGenerate(String prompt, String fallback) {
        if (!llmApiClient.isConfigured()) return fallback;
        try {
            String text = llmApiClient.generateText(prompt);
            return (text == null || text.isBlank()) ? fallback : text.trim();
        } catch (Exception e) {
            log.warn("AI coach message generation failed, using fallback", e);
            return fallback;
        }
    }
}
