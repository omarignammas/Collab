package org.test.backendprojecty.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.event.CourseSummaryUploadedEvent;
import org.test.backendprojecty.repository.CourseSummaryRepository;
import org.test.backendprojecty.repository.NotificationRepository;
import org.test.backendprojecty.repository.QuizAttemptRepository;
import org.test.backendprojecty.repository.QuizRepository;
import org.test.backendprojecty.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Mockito-mocked repositories return plain builder POJOs, not real Hibernate
 * proxies — they structurally can't catch a lazy-loading/transaction-boundary
 * bug in an @Async @TransactionalEventListener (exactly the class of bug found
 * and fixed in FocusRoomReportService while building this feature). These two
 * tests run against a real Spring context + H2, exercising the parts a mocked
 * unit test can't: real lazy associations across the async thread boundary,
 * and a real JPA-generated query rather than an assumption about what it does.
 */
@SpringBootTest
@ActiveProfiles("test")
class AiGenerationIntegrationTest {

    @Autowired
    private CourseSummaryService courseSummaryService;
    @Autowired
    private CourseSummaryRepository courseSummaryRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private QuizRepository quizRepository;
    @Autowired
    private QuizAttemptRepository quizAttemptRepository;

    @MockBean
    private LlmApiClient llmApiClient;

    private User persistUser(String email) {
        return userRepository.save(User.builder()
                .email(email)
                .password("hashed")
                .firstName("Test")
                .lastName("User")
                .role(Role.USER)
                .enabled(true)
                .build());
    }

    @Test
    void onSummaryUploaded_RealHibernateSession_NoLazyInitializationException() throws InterruptedException {
        User owner = persistUser("summary-owner-" + System.nanoTime() + "@example.com");

        CourseSummary summary = courseSummaryRepository.save(CourseSummary.builder()
                .user(owner)
                .title("Integration Test Summary")
                .sourceFileUrl("/uploads/course-files/x.pdf")
                .sourceFileType(SourceFileType.PDF)
                .extractedText("Photosynthesis converts light into energy.")
                .status(GenerationStatus.PENDING)
                .build());

        when(llmApiClient.generateText(anyString()))
                .thenReturn("## Summary\n- Plants convert light to energy\n\n```json\n{\"label\": \"Photosynthesis\", \"children\": [{\"label\": \"Light\"}]}\n```");

        // Goes through the real @Async proxy — runs on a pool thread, off this one.
        courseSummaryService.onSummaryUploaded(new CourseSummaryUploadedEvent(summary.getId()));

        CourseSummary reloaded = pollUntilNotPending(summary.getId());

        assertEquals(GenerationStatus.READY, reloaded.getStatus());
        assertTrue(reloaded.getSummaryMarkdown().contains("Plants convert light"));
        assertEquals("{\"label\": \"Photosynthesis\", \"children\": [{\"label\": \"Light\"}]}", reloaded.getDiagramJson());

        // If notify(summary.getUser(), ...) had thrown LazyInitializationException
        // inside the async method's catch block, status would be FAILED instead
        // (per the try/catch shape) and no notification row would exist — assert
        // the row directly rather than just trusting a non-FAILED status.
        List<Notification> notifications = notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(owner.getId(), Pageable.unpaged())
                .getContent();
        assertFalse(notifications.isEmpty(), "Expected a SUMMARY_READY notification to have been persisted");
        assertEquals(NotificationType.SUMMARY_READY, notifications.get(0).getType());
    }

    @Test
    void quizAttemptFinder_RealQuery_NeverReturnsAnotherUsersAttempts() {
        User alice = persistUser("alice-" + System.nanoTime() + "@example.com");
        User bob = persistUser("bob-" + System.nanoTime() + "@example.com");

        CourseSummary summary = courseSummaryRepository.save(CourseSummary.builder()
                .user(alice).title("Shared material").sourceFileType(SourceFileType.PDF)
                .sourceFileUrl("/uploads/course-files/x.pdf").status(GenerationStatus.READY)
                .summaryMarkdown("material").build());

        Quiz quiz = quizRepository.save(Quiz.builder()
                .summary(summary).user(alice).title("Quiz").difficulty(QuizDifficulty.EASY)
                .status(GenerationStatus.READY).build());

        quizAttemptRepository.save(QuizAttempt.builder()
                .quiz(quiz).user(alice).answersJson("[0]").score(1).totalQuestions(1)
                .completedAt(LocalDateTime.now()).build());
        quizAttemptRepository.save(QuizAttempt.builder()
                .quiz(quiz).user(bob).answersJson("[1]").score(0).totalQuestions(1)
                .completedAt(LocalDateTime.now()).build());

        List<QuizAttempt> bobsAttempts = quizAttemptRepository
                .findByQuizIdAndUserIdOrderByCompletedAtDesc(quiz.getId(), bob.getId());

        assertEquals(1, bobsAttempts.size());
        assertEquals(bob.getId(), bobsAttempts.get(0).getUser().getId());
        assertEquals(0, bobsAttempts.get(0).getScore());
    }

    private CourseSummary pollUntilNotPending(Long summaryId) throws InterruptedException {
        for (int i = 0; i < 100; i++) {
            Optional<CourseSummary> current = courseSummaryRepository.findById(summaryId);
            if (current.isPresent() && current.get().getStatus() != GenerationStatus.PENDING) {
                return current.get();
            }
            Thread.sleep(50);
        }
        throw new AssertionError("Summary " + summaryId + " never left PENDING status within 5s");
    }
}
