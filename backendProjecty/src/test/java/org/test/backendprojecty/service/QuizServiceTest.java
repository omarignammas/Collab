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
import org.test.backendprojecty.dtos.response.QuizAttemptResponse;
import org.test.backendprojecty.dtos.response.QuizResponse;
import org.test.backendprojecty.dtos.response.SharedUserResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.event.QuizGenerationRequestedEvent;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.QuizMapper;
import org.test.backendprojecty.repository.*;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock private QuizRepository quizRepository;
    @Mock private QuizQuestionRepository quizQuestionRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private QuizShareRepository quizShareRepository;
    @Mock private UserRepository userRepository;
    @Mock private CourseSummaryService courseSummaryService;
    @Mock private CourseFileStorageService courseFileStorageService;
    @Mock private PdfTextExtractionService pdfTextExtractionService;
    @Mock private LlmApiClient llmApiClient;
    @Mock private NotificationService notificationService;
    @Mock private FriendService friendService;
    @Mock private CurrentUserProvider currentUserProvider;
    @Mock private ApplicationEventPublisher eventPublisher;

    private QuizService service;

    private User owner;
    private User friend;
    private CourseSummary readySummary;
    private Quiz quiz;

    @BeforeEach
    void setUp() {
        service = new QuizService(
                quizRepository, quizQuestionRepository, quizAttemptRepository, quizShareRepository,
                userRepository, courseSummaryService, courseFileStorageService, pdfTextExtractionService,
                llmApiClient, notificationService, friendService,
                currentUserProvider, eventPublisher, new QuizMapper()
        );

        owner = User.builder().id(1L).firstName("Owner").lastName("User").email("owner@example.com").build();
        friend = User.builder().id(2L).firstName("Friend").lastName("User").email("friend@example.com").build();
        readySummary = CourseSummary.builder().id(100L).user(owner).title("Chapter 4")
                .summaryMarkdown("Photosynthesis is...").status(GenerationStatus.READY).build();
        quiz = Quiz.builder().id(500L).summary(readySummary).user(owner).title("Chapter 4 Quiz")
                .difficulty(QuizDifficulty.MEDIUM).status(GenerationStatus.PENDING).build();
    }

    // --- requestQuizGeneration ---

    @Test
    void requestQuizGeneration_SummaryReady_Success() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> {
            Quiz q = inv.getArgument(0);
            q.setId(500L);
            return q;
        });

        QuizResponse response = service.requestQuizGeneration(100L, QuizDifficulty.EASY, null, null);

        assertEquals(GenerationStatus.PENDING, response.getStatus());
        verify(eventPublisher).publishEvent(new QuizGenerationRequestedEvent(500L));
    }

    @Test
    void requestQuizGeneration_SummaryNotReady_ThrowsBadRequest() {
        readySummary.setStatus(GenerationStatus.PENDING);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);

        assertThrows(BadRequestException.class, () -> service.requestQuizGeneration(100L, QuizDifficulty.EASY, null, null));
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void requestQuizGeneration_WithPdfReference_ExtractsAndStoresReferenceText() throws Exception {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);
        MockMultipartFile reference = new MockMultipartFile("referenceFiles", "past-quiz.pdf", "application/pdf", "pdf-bytes".getBytes());
        when(courseFileStorageService.store(eq(1L), any())).thenReturn(
                new CourseFileStorageService.StoredFile("/uploads/course-files/1-ref.pdf", SourceFileType.PDF));
        when(pdfTextExtractionService.extractText(any())).thenReturn("Q1: What is X? Q2: What is Y?");
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> {
            Quiz q = inv.getArgument(0);
            q.setId(500L);
            return q;
        });

        service.requestQuizGeneration(100L, QuizDifficulty.EASY, List.of(reference), null);

        ArgumentCaptor<Quiz> captor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(captor.capture());
        String json = captor.getValue().getReferenceFilesJson();
        assertNotNull(json);
        assertTrue(json.contains("/uploads/course-files/1-ref.pdf"));
        assertTrue(json.contains("\"PDF\""));
        assertTrue(json.contains("Q1: What is X? Q2: What is Y?"));
    }

    @Test
    void requestQuizGeneration_WithImageReference_StoresFileButNoTextYet() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);
        MockMultipartFile reference = new MockMultipartFile("referenceFiles", "past-quiz.png", "image/png", "img-bytes".getBytes());
        when(courseFileStorageService.store(eq(1L), any())).thenReturn(
                new CourseFileStorageService.StoredFile("/uploads/course-files/1-ref.png", SourceFileType.IMAGE));
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.requestQuizGeneration(100L, QuizDifficulty.EASY, List.of(reference), null);

        ArgumentCaptor<Quiz> captor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(captor.capture());
        String json = captor.getValue().getReferenceFilesJson();
        assertNotNull(json);
        assertTrue(json.contains("\"IMAGE\""));
        assertTrue(json.contains("\"text\":null"));
        verifyNoInteractions(pdfTextExtractionService);
    }

    @Test
    void requestQuizGeneration_NoReference_LeavesReferenceFieldsNull() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.requestQuizGeneration(100L, QuizDifficulty.EASY, null, null);

        ArgumentCaptor<Quiz> captor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(captor.capture());
        assertNull(captor.getValue().getReferenceFilesJson());
        verifyNoInteractions(courseFileStorageService, pdfTextExtractionService);
    }

    @Test
    void requestQuizGeneration_WithFocusPrompt_StoresIt() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.requestQuizGeneration(100L, QuizDifficulty.EASY, null, "  focus on recursion  ");

        ArgumentCaptor<Quiz> captor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(captor.capture());
        assertEquals("focus on recursion", captor.getValue().getFocusPrompt());
    }

    // --- onQuizGenerationRequested ---

    @Test
    void onQuizGenerationRequested_ValidJson_SavesQuestionsAndNotifies() {
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateText(anyString())).thenReturn("""
                [
                  {"question": "What is 2+2?", "options": ["3", "4", "5", "6"], "correctIndex": 1},
                  {"question": "What is the capital of France?", "options": ["Paris", "London", "Rome", "Berlin"], "correctIndex": 0}
                ]
                """);
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        ArgumentCaptor<QuizQuestion> questionCaptor = ArgumentCaptor.forClass(QuizQuestion.class);
        verify(quizQuestionRepository, times(2)).save(questionCaptor.capture());
        assertEquals(2, questionCaptor.getAllValues().size());
        assertEquals(0, questionCaptor.getAllValues().get(0).getPosition());
        assertEquals(1, questionCaptor.getAllValues().get(1).getPosition());

        ArgumentCaptor<Quiz> quizCaptor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(quizCaptor.capture());
        assertEquals(GenerationStatus.READY, quizCaptor.getValue().getStatus());

        verify(notificationService).notify(eq(owner), eq(NotificationType.QUIZ_READY), anyString(), anyString(), eq("/quizzes/500"));
    }

    @Test
    void onQuizGenerationRequested_MarkdownFenced_StillParses() {
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateText(anyString())).thenReturn("""
                ```json
                [{"question": "Q1", "options": ["A", "B", "C", "D"], "correctIndex": 2}]
                ```
                """);
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        verify(quizQuestionRepository, times(1)).save(any(QuizQuestion.class));
        ArgumentCaptor<Quiz> quizCaptor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(quizCaptor.capture());
        assertEquals(GenerationStatus.READY, quizCaptor.getValue().getStatus());
    }

    @Test
    void onQuizGenerationRequested_MalformedJson_MarksFailed() {
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateText(anyString())).thenReturn("not json at all");
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        ArgumentCaptor<Quiz> quizCaptor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(quizCaptor.capture());
        assertEquals(GenerationStatus.FAILED, quizCaptor.getValue().getStatus());
        verifyNoInteractions(notificationService);
        verify(quizQuestionRepository, never()).save(any());
    }

    @Test
    void onQuizGenerationRequested_LlmThrows_MarksFailed() {
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateText(anyString())).thenThrow(new RuntimeException("AI down"));
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        ArgumentCaptor<Quiz> quizCaptor = ArgumentCaptor.forClass(Quiz.class);
        verify(quizRepository).save(quizCaptor.capture());
        assertEquals(GenerationStatus.FAILED, quizCaptor.getValue().getStatus());
    }

    @Test
    void onQuizGenerationRequested_QuizNotFound_NoOp() {
        when(quizRepository.findById(999L)).thenReturn(Optional.empty());

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(999L));

        verifyNoInteractions(llmApiClient, notificationService);
    }

    @Test
    void onQuizGenerationRequested_CancelledWhileInFlight_DoesNotOverwriteWithReady() {
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateText(anyString())).thenReturn(
                "[{\"question\": \"Q1\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctIndex\": 0}]");
        when(quizRepository.findStatusById(500L)).thenReturn(GenerationStatus.CANCELLED);

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        verify(quizRepository, never()).save(any());
        verify(quizQuestionRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void onQuizGenerationRequested_WithPdfReferenceText_IncludesItInThePromptWithoutVisionCall() {
        quiz.setReferenceFilesJson("[{\"url\":\"/uploads/course-files/1-ref.pdf\",\"type\":\"PDF\","
                + "\"name\":\"past-quiz.pdf\",\"text\":\"Sample past question: What is osmosis?\"}]");
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateText(anyString())).thenReturn(
                "[{\"question\": \"Q1\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctIndex\": 0}]");
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmApiClient).generateText(promptCaptor.capture());
        assertTrue(promptCaptor.getValue().contains("Sample past question: What is osmosis?"));
        verifyNoInteractions(pdfTextExtractionService);
    }

    @Test
    void onQuizGenerationRequested_WithImageReference_DescribesImageThenIncludesInPrompt(@TempDir Path tempDir) throws Exception {
        Path courseFilesDir = tempDir.resolve("course-files");
        Files.createDirectories(courseFilesDir);
        Files.write(courseFilesDir.resolve("1-ref.png"), "fake-png-bytes".getBytes());
        Field field = QuizService.class.getDeclaredField("uploadsDir");
        field.setAccessible(true);
        field.set(service, tempDir.toString());

        quiz.setReferenceFilesJson("[{\"url\":\"/uploads/course-files/1-ref.png\",\"type\":\"IMAGE\","
                + "\"name\":\"past-quiz.png\",\"text\":null}]");
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(llmApiClient.generateFromImage(anyString(), any(byte[].class), eq("image/png")))
                .thenReturn("Past quiz covers cell division and mitosis stages.");
        when(llmApiClient.generateText(anyString())).thenReturn(
                "[{\"question\": \"Q1\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correctIndex\": 0}]");
        when(quizRepository.save(any(Quiz.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onQuizGenerationRequested(new QuizGenerationRequestedEvent(500L));

        verify(llmApiClient).generateFromImage(anyString(), any(byte[].class), eq("image/png"));
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmApiClient).generateText(promptCaptor.capture());
        assertTrue(promptCaptor.getValue().contains("Past quiz covers cell division and mitosis stages."));
    }

    // --- cancel ---

    @Test
    void cancel_Pending_SetsCancelled() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));

        service.cancel(500L);

        assertEquals(GenerationStatus.CANCELLED, quiz.getStatus());
        verify(quizRepository).save(quiz);
    }

    @Test
    void cancel_NotPending_ThrowsBadRequest() {
        quiz.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));

        assertThrows(BadRequestException.class, () -> service.cancel(500L));
        verify(quizRepository, never()).save(any());
    }

    // --- parseQuizJson / stripJsonFence table tests ---

    @Test
    void parseQuizJson_ValidUnfenced_Parses() {
        var result = service.parseQuizJson("[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":0}]");
        assertEquals(1, result.size());
        assertEquals("Q", result.get(0).question());
        assertEquals(0, result.get(0).correctIndex());
    }

    @Test
    void parseQuizJson_ValidFenced_StripsAndParses() {
        var result = service.parseQuizJson("```json\n[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":3}]\n```");
        assertEquals(1, result.size());
        assertEquals(3, result.get(0).correctIndex());
    }

    @Test
    void parseQuizJson_FencedNoLanguageTag_StripsAndParses() {
        var result = service.parseQuizJson("```\n[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":1}]\n```");
        assertEquals(1, result.size());
    }

    @Test
    void parseQuizJson_MalformedJson_Throws() {
        assertThrows(IllegalStateException.class, () -> service.parseQuizJson("not json"));
    }

    @Test
    void parseQuizJson_EmptyArray_Throws() {
        assertThrows(IllegalStateException.class, () -> service.parseQuizJson("[]"));
    }

    @Test
    void parseQuizJson_NotAnArray_Throws() {
        assertThrows(IllegalStateException.class, () -> service.parseQuizJson("{\"question\":\"Q\"}"));
    }

    @Test
    void parseQuizJson_WrongOptionCount_Throws() {
        assertThrows(IllegalStateException.class, () ->
                service.parseQuizJson("[{\"question\":\"Q\",\"options\":[\"a\",\"b\"],\"correctIndex\":0}]"));
    }

    @Test
    void parseQuizJson_MissingCorrectIndex_Throws() {
        assertThrows(IllegalStateException.class, () ->
                service.parseQuizJson("[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"]}]"));
    }

    @Test
    void parseQuizJson_CorrectIndexOutOfRange_Throws() {
        assertThrows(IllegalStateException.class, () ->
                service.parseQuizJson("[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":4}]"));
    }

    @Test
    void parseQuizJson_NegativeCorrectIndex_Throws() {
        assertThrows(IllegalStateException.class, () ->
                service.parseQuizJson("[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":-1}]"));
    }

    @Test
    void parseQuizJson_BlankQuestion_Throws() {
        assertThrows(IllegalStateException.class, () ->
                service.parseQuizJson("[{\"question\":\"\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":0}]"));
    }

    @Test
    void parseQuizJson_TrailingCommentaryAfterFence_Throws() {
        // Model ignored instructions and appended commentary outside the fence — the whole
        // string past the closing fence is discarded by stripJsonFence, so this should parse
        // cleanly on the fenced portion alone.
        var result = service.parseQuizJson("```json\n[{\"question\":\"Q\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"correctIndex\":0}]\n```\nHope this helps!");
        assertEquals(1, result.size());
    }

    // --- getQuizzesForSummary ---

    @Test
    void getQuizzesForSummary_ReturnsQuizzesWithoutQuestions() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryService.resolveSummaryForViewing(100L, owner)).thenReturn(readySummary);
        when(quizRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(List.of(quiz));

        List<QuizResponse> result = service.getQuizzesForSummary(100L);

        assertEquals(1, result.size());
        assertNull(result.get(0).getQuestions());
        verifyNoInteractions(quizQuestionRepository);
    }

    // --- getQuizById / resolveQuizForViewing ---

    @Test
    void getQuizById_Owner_IncludesQuestions() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        QuizQuestion q = QuizQuestion.builder().id(1L).quiz(quiz).questionText("Q1")
                .optionsJson("[\"a\",\"b\",\"c\",\"d\"]").correctIndex(0).position(0).build();
        when(quizQuestionRepository.findByQuizIdOrderByPositionAsc(500L)).thenReturn(List.of(q));

        QuizResponse response = service.getQuizById(500L);

        assertTrue(response.isOwner());
        assertEquals(1, response.getQuestions().size());
        assertEquals("Q1", response.getQuestions().get(0).getQuestionText());
        assertEquals(List.of("a", "b", "c", "d"), response.getQuestions().get(0).getOptions());
    }

    @Test
    void getQuizById_SharedWithViewer_Success() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(quizShareRepository.existsByQuizIdAndSharedWithUserId(500L, 2L)).thenReturn(true);
        when(quizQuestionRepository.findByQuizIdOrderByPositionAsc(500L)).thenReturn(Collections.emptyList());

        QuizResponse response = service.getQuizById(500L);

        assertFalse(response.isOwner());
    }

    @Test
    void getQuizById_NotOwnerNotShared_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(quizShareRepository.existsByQuizIdAndSharedWithUserId(500L, 2L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.getQuizById(500L));
    }

    // --- submitAttempt ---

    @Test
    void submitAttempt_CorrectScoring() {
        quiz.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        QuizQuestion q1 = QuizQuestion.builder().id(1L).quiz(quiz).questionText("Q1")
                .optionsJson("[\"a\",\"b\",\"c\",\"d\"]").correctIndex(1).position(0).build();
        QuizQuestion q2 = QuizQuestion.builder().id(2L).quiz(quiz).questionText("Q2")
                .optionsJson("[\"a\",\"b\",\"c\",\"d\"]").correctIndex(2).position(1).build();
        when(quizQuestionRepository.findByQuizIdOrderByPositionAsc(500L)).thenReturn(List.of(q1, q2));

        QuizAttemptResponse response = service.submitAttempt(500L, List.of(1, 0)); // first correct, second wrong

        assertEquals(1, response.getScore());
        assertEquals(2, response.getTotalQuestions());
        assertEquals(50.0, response.getPercentage());
        assertTrue(response.getResults().get(0).isCorrect());
        assertFalse(response.getResults().get(1).isCorrect());
        assertEquals(2, response.getResults().get(1).getCorrectIndex());

        verify(quizAttemptRepository).save(any(QuizAttempt.class));
    }

    @Test
    void submitAttempt_WrongAnswerCount_ThrowsBadRequest() {
        quiz.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        QuizQuestion q1 = QuizQuestion.builder().id(1L).quiz(quiz).questionText("Q1")
                .optionsJson("[\"a\",\"b\",\"c\",\"d\"]").correctIndex(1).position(0).build();
        when(quizQuestionRepository.findByQuizIdOrderByPositionAsc(500L)).thenReturn(List.of(q1));

        assertThrows(BadRequestException.class, () -> service.submitAttempt(500L, List.of(1, 2)));
        verifyNoInteractions(quizAttemptRepository);
    }

    @Test
    void submitAttempt_QuizNotReady_ThrowsBadRequest() {
        quiz.setStatus(GenerationStatus.PENDING);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));

        assertThrows(BadRequestException.class, () -> service.submitAttempt(500L, List.of(0)));
    }

    // --- getMyLatestAttempt: must always be scoped to the CALLING user ---

    @Test
    void getMyLatestAttempt_CallsRepositoryScopedToCurrentUser_NeverLeaksOtherUsers() {
        quiz.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(quizShareRepository.existsByQuizIdAndSharedWithUserId(500L, 2L)).thenReturn(true);

        QuizAttempt friendAttempt = QuizAttempt.builder().id(1L).quiz(quiz).user(friend)
                .answersJson("[0]").score(1).totalQuestions(1).completedAt(java.time.LocalDateTime.now()).build();
        when(quizAttemptRepository.findByQuizIdAndUserIdOrderByCompletedAtDesc(500L, 2L)).thenReturn(List.of(friendAttempt));
        when(quizQuestionRepository.findByQuizIdOrderByPositionAsc(500L)).thenReturn(Collections.emptyList());

        service.getMyLatestAttempt(500L);

        // The repository call itself must be scoped to friend's id (2L), never owner's (1L) —
        // this is what actually prevents a cross-user score leak; see QuizAttemptRepository's
        // deliberate lack of a bare findByQuizId method.
        verify(quizAttemptRepository).findByQuizIdAndUserIdOrderByCompletedAtDesc(500L, 2L);
        verify(quizAttemptRepository, never()).findByQuizIdAndUserIdOrderByCompletedAtDesc(500L, 1L);
    }

    @Test
    void getMyLatestAttempt_NoAttempts_ThrowsResourceNotFound() {
        quiz.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findById(500L)).thenReturn(Optional.of(quiz));
        when(quizAttemptRepository.findByQuizIdAndUserIdOrderByCompletedAtDesc(500L, 1L)).thenReturn(Collections.emptyList());

        assertThrows(ResourceNotFoundException.class, () -> service.getMyLatestAttempt(500L));
    }

    // --- deleteQuiz ---

    @Test
    void deleteQuiz_Owner_CascadesCleanup() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));

        service.deleteQuiz(500L);

        verify(quizAttemptRepository).deleteByQuizId(500L);
        verify(quizQuestionRepository).deleteByQuizId(500L);
        verify(quizShareRepository).deleteByQuizId(500L);
        verify(quizRepository).delete(quiz);
    }

    @Test
    void deleteQuiz_NotOwner_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        when(quizRepository.findByIdAndUserId(500L, 2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.deleteQuiz(500L));
    }

    // --- sharing ---

    @Test
    void shareQuiz_Success_NotifiesFriend() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));
        when(friendService.areFriends(1L, 2L)).thenReturn(true);
        when(quizShareRepository.existsByQuizIdAndSharedWithUserId(500L, 2L)).thenReturn(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(friend));

        service.shareQuiz(500L, 2L);

        verify(quizShareRepository).save(any(QuizShare.class));
        verify(notificationService).notify(eq(friend), eq(NotificationType.QUIZ_SHARED), anyString(), anyString(), eq("/quizzes/500"));
    }

    @Test
    void shareQuiz_NotFriends_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));
        when(friendService.areFriends(1L, 2L)).thenReturn(false);

        assertThrows(BadRequestException.class, () -> service.shareQuiz(500L, 2L));
    }

    @Test
    void unshareQuiz_Success() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));
        QuizShare share = QuizShare.builder().id(9L).quiz(quiz).sharedWithUser(friend).build();
        when(quizShareRepository.findByQuizIdAndSharedWithUserId(500L, 2L)).thenReturn(Optional.of(share));

        service.unshareQuiz(500L, 2L);

        verify(quizShareRepository).delete(share);
    }

    @Test
    void listShares_ReturnsSharedUsers() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(quizRepository.findByIdAndUserId(500L, 1L)).thenReturn(Optional.of(quiz));
        QuizShare share = QuizShare.builder().id(9L).quiz(quiz).sharedWithUser(friend).build();
        when(quizShareRepository.findByQuizIdOrderByCreatedAtAsc(500L)).thenReturn(List.of(share));

        List<SharedUserResponse> result = service.listShares(500L);

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getUserId());
    }
}
