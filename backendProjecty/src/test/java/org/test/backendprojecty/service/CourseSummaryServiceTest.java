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
import org.test.backendprojecty.dtos.response.CourseSummaryResponse;
import org.test.backendprojecty.dtos.response.SharedUserResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.event.CourseSummaryUploadedEvent;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.CourseSummaryMapper;
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
class CourseSummaryServiceTest {

    @Mock private CourseSummaryRepository courseSummaryRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private UserRepository userRepository;
    @Mock private SummaryShareRepository summaryShareRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizQuestionRepository quizQuestionRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private QuizShareRepository quizShareRepository;
    @Mock private CourseFileStorageService courseFileStorageService;
    @Mock private PdfTextExtractionService pdfTextExtractionService;
    @Mock private LlmApiClient llmApiClient;
    @Mock private NotificationService notificationService;
    @Mock private FriendService friendService;
    @Mock private CurrentUserProvider currentUserProvider;
    @Mock private ApplicationEventPublisher eventPublisher;

    private CourseSummaryService service;

    private User owner;
    private User friend;
    private CourseSummary summary;

    @BeforeEach
    void setUp() {
        service = new CourseSummaryService(
                courseSummaryRepository, courseRepository, userRepository, summaryShareRepository,
                quizRepository, quizQuestionRepository, quizAttemptRepository, quizShareRepository,
                courseFileStorageService, pdfTextExtractionService, llmApiClient, notificationService,
                friendService, currentUserProvider, eventPublisher, new CourseSummaryMapper()
        );

        owner = User.builder().id(1L).firstName("Owner").lastName("User").email("owner@example.com").build();
        friend = User.builder().id(2L).firstName("Friend").lastName("User").email("friend@example.com").build();
        summary = CourseSummary.builder().id(100L).user(owner).title("Chapter 4").sourceFileType(SourceFileType.PDF)
                .sourceFileUrl("/uploads/course-files/1-abc.pdf").status(GenerationStatus.PENDING).build();
    }

    private void setUploadsDir(String dir) throws Exception {
        Field field = CourseSummaryService.class.getDeclaredField("uploadsDir");
        field.setAccessible(true);
        field.set(service, dir);
    }

    // --- uploadSummary ---

    @Test
    void uploadSummary_Pdf_ExtractsTextAndPublishesEvent() throws Exception {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        MockMultipartFile file = new MockMultipartFile("file", "notes.pdf", "application/pdf", "pdf-bytes".getBytes());
        when(courseFileStorageService.store(eq(1L), any())).thenReturn(
                new CourseFileStorageService.StoredFile("/uploads/course-files/1-x.pdf", SourceFileType.PDF));
        when(pdfTextExtractionService.extractText(any())).thenReturn("extracted text");
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> {
            CourseSummary s = inv.getArgument(0);
            s.setId(200L);
            return s;
        });

        CourseSummaryResponse response = service.uploadSummary(file, null, "My Summary");

        ArgumentCaptor<CourseSummary> captor = ArgumentCaptor.forClass(CourseSummary.class);
        verify(courseSummaryRepository).save(captor.capture());
        assertEquals("extracted text", captor.getValue().getExtractedText());
        assertEquals(GenerationStatus.PENDING, captor.getValue().getStatus());
        assertEquals("My Summary", response.getTitle());

        verify(eventPublisher).publishEvent(new CourseSummaryUploadedEvent(200L));
    }

    @Test
    void uploadSummary_Image_SkipsTextExtraction() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        MockMultipartFile file = new MockMultipartFile("file", "slide.png", "image/png", "img-bytes".getBytes());
        when(courseFileStorageService.store(eq(1L), any())).thenReturn(
                new CourseFileStorageService.StoredFile("/uploads/course-files/1-x.png", SourceFileType.IMAGE));
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> inv.getArgument(0));

        service.uploadSummary(file, null, null);

        verifyNoInteractions(pdfTextExtractionService);
    }

    @Test
    void uploadSummary_BlankTitle_FallsBackToFilename() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        MockMultipartFile file = new MockMultipartFile("file", "slide.png", "image/png", "img-bytes".getBytes());
        when(courseFileStorageService.store(eq(1L), any())).thenReturn(
                new CourseFileStorageService.StoredFile("/uploads/course-files/1-x.png", SourceFileType.IMAGE));
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> inv.getArgument(0));

        service.uploadSummary(file, null, "  ");

        ArgumentCaptor<CourseSummary> captor = ArgumentCaptor.forClass(CourseSummary.class);
        verify(courseSummaryRepository).save(captor.capture());
        assertEquals("slide.png", captor.getValue().getTitle());
    }

    @Test
    void uploadSummary_CourseNotFound_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(5L, 1L)).thenReturn(Optional.empty());
        MockMultipartFile file = new MockMultipartFile("file", "slide.png", "image/png", "img-bytes".getBytes());

        assertThrows(ResourceNotFoundException.class, () -> service.uploadSummary(file, 5L, null));
        verifyNoInteractions(courseFileStorageService);
    }

    // --- onSummaryUploaded ---

    @Test
    void onSummaryUploaded_Pdf_WithMermaidFence_SplitsSummaryAndDiagram() {
        summary.setExtractedText("material");
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(llmApiClient.generateText(anyString())).thenReturn(
                "## Key Points\n- a\n- b\n\n```mermaid\ngraph TD; A-->B;\n```");
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onSummaryUploaded(new CourseSummaryUploadedEvent(100L));

        ArgumentCaptor<CourseSummary> captor = ArgumentCaptor.forClass(CourseSummary.class);
        verify(courseSummaryRepository).save(captor.capture());
        assertEquals(GenerationStatus.READY, captor.getValue().getStatus());
        assertTrue(captor.getValue().getSummaryMarkdown().contains("Key Points"));
        assertEquals("graph TD; A-->B;", captor.getValue().getDiagramMermaid());

        verify(notificationService).notify(eq(owner), eq(NotificationType.SUMMARY_READY),
                anyString(), anyString(), eq("/summaries/100"));
    }

    @Test
    void onSummaryUploaded_NoMermaidFence_DiagramStaysNull() {
        summary.setExtractedText("material");
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(llmApiClient.generateText(anyString())).thenReturn("Just a plain summary, no diagram.");
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onSummaryUploaded(new CourseSummaryUploadedEvent(100L));

        ArgumentCaptor<CourseSummary> captor = ArgumentCaptor.forClass(CourseSummary.class);
        verify(courseSummaryRepository).save(captor.capture());
        assertEquals(GenerationStatus.READY, captor.getValue().getStatus());
        assertNull(captor.getValue().getDiagramMermaid());
    }

    @Test
    void onSummaryUploaded_Image_ReadsFileFromDiskAndCallsGenerateFromImage(@TempDir Path tempDir) throws Exception {
        setUploadsDir(tempDir.toString());
        Path courseFilesDir = tempDir.resolve("course-files");
        Files.createDirectories(courseFilesDir);
        Files.write(courseFilesDir.resolve("1-x.png"), "fake-png-bytes".getBytes());

        CourseSummary imageSummary = CourseSummary.builder().id(101L).user(owner).title("Slide")
                .sourceFileType(SourceFileType.IMAGE).sourceFileUrl("/uploads/course-files/1-x.png")
                .status(GenerationStatus.PENDING).build();
        when(courseSummaryRepository.findById(101L)).thenReturn(Optional.of(imageSummary));
        when(llmApiClient.generateFromImage(anyString(), any(byte[].class), eq("image/png"))).thenReturn("Summary from image");
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onSummaryUploaded(new CourseSummaryUploadedEvent(101L));

        verify(llmApiClient).generateFromImage(anyString(), any(byte[].class), eq("image/png"));
        verify(llmApiClient, never()).generateText(anyString());
    }

    @Test
    void onSummaryUploaded_LlmFails_SetsFailed_DoesNotNotify() {
        summary.setExtractedText("material");
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(llmApiClient.generateText(anyString())).thenThrow(new RuntimeException("AI down"));
        when(courseSummaryRepository.save(any(CourseSummary.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onSummaryUploaded(new CourseSummaryUploadedEvent(100L));

        ArgumentCaptor<CourseSummary> captor = ArgumentCaptor.forClass(CourseSummary.class);
        verify(courseSummaryRepository).save(captor.capture());
        assertEquals(GenerationStatus.FAILED, captor.getValue().getStatus());
        verifyNoInteractions(notificationService);
    }

    @Test
    void onSummaryUploaded_SummaryNotFound_NoOp() {
        when(courseSummaryRepository.findById(999L)).thenReturn(Optional.empty());

        service.onSummaryUploaded(new CourseSummaryUploadedEvent(999L));

        verifyNoInteractions(llmApiClient, notificationService);
    }

    @Test
    void onSummaryUploaded_CancelledWhileInFlight_DoesNotOverwriteWithReady() {
        summary.setExtractedText("material");
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(llmApiClient.generateText(anyString())).thenReturn("## Key Points\n- a\n- b");
        when(courseSummaryRepository.findStatusById(100L)).thenReturn(GenerationStatus.CANCELLED);

        service.onSummaryUploaded(new CourseSummaryUploadedEvent(100L));

        verify(courseSummaryRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    // --- cancel ---

    @Test
    void cancel_Pending_SetsCancelled() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));

        service.cancel(100L);

        assertEquals(GenerationStatus.CANCELLED, summary.getStatus());
        verify(courseSummaryRepository).save(summary);
    }

    @Test
    void cancel_NotPending_ThrowsBadRequest() {
        summary.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));

        assertThrows(BadRequestException.class, () -> service.cancel(100L));
        verify(courseSummaryRepository, never()).save(any());
    }

    // --- retry ---

    @Test
    void retry_Failed_ResetsToPendingAndRepublishes() {
        summary.setStatus(GenerationStatus.FAILED);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));

        service.retry(100L);

        assertEquals(GenerationStatus.PENDING, summary.getStatus());
        verify(eventPublisher).publishEvent(new CourseSummaryUploadedEvent(100L));
    }

    @Test
    void retry_Cancelled_ResetsToPendingAndRepublishes() {
        summary.setStatus(GenerationStatus.CANCELLED);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));

        service.retry(100L);

        assertEquals(GenerationStatus.PENDING, summary.getStatus());
        verify(eventPublisher).publishEvent(new CourseSummaryUploadedEvent(100L));
    }

    @Test
    void retry_NotFailed_ThrowsBadRequest() {
        summary.setStatus(GenerationStatus.READY);
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));

        assertThrows(BadRequestException.class, () -> service.retry(100L));
        verifyNoInteractions(eventPublisher);
    }

    // --- getSummaryById / resolveSummaryForViewing ---

    @Test
    void getSummaryById_Owner_Success() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));

        CourseSummaryResponse response = service.getSummaryById(100L);

        assertTrue(response.isOwner());
    }

    @Test
    void getSummaryById_SharedWithViewer_Success() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(summaryShareRepository.existsBySummaryIdAndSharedWithUserId(100L, 2L)).thenReturn(true);

        CourseSummaryResponse response = service.getSummaryById(100L);

        assertFalse(response.isOwner());
    }

    @Test
    void getSummaryById_NotOwnerNotShared_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        when(courseSummaryRepository.findById(100L)).thenReturn(Optional.of(summary));
        when(summaryShareRepository.existsBySummaryIdAndSharedWithUserId(100L, 2L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.getSummaryById(100L));
    }

    // --- deleteSummary ---

    @Test
    void deleteSummary_NoQuizzes_DeletesCleanly() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        when(quizRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(Collections.emptyList());
        when(summaryShareRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(Collections.emptyList());

        service.deleteSummary(100L);

        verify(courseSummaryRepository).delete(summary);
    }

    @Test
    void deleteSummary_OwnQuizOnly_CascadesDelete() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        Quiz ownQuiz = Quiz.builder().id(50L).summary(summary).user(owner).build();
        when(quizRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(List.of(ownQuiz));
        when(summaryShareRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(Collections.emptyList());

        service.deleteSummary(100L);

        verify(quizAttemptRepository).deleteByQuizId(50L);
        verify(quizQuestionRepository).deleteByQuizId(50L);
        verify(quizShareRepository).deleteByQuizId(50L);
        verify(quizRepository).deleteAll(List.of(ownQuiz));
        verify(courseSummaryRepository).delete(summary);
    }

    @Test
    void deleteSummary_FriendOwnedQuizExists_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        Quiz friendQuiz = Quiz.builder().id(51L).summary(summary).user(friend).build();
        when(quizRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(List.of(friendQuiz));

        assertThrows(BadRequestException.class, () -> service.deleteSummary(100L));
        verify(courseSummaryRepository, never()).delete(any());
    }

    // --- sharing ---

    @Test
    void shareSummary_Success_SavesShareAndNotifies() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        when(friendService.areFriends(1L, 2L)).thenReturn(true);
        when(summaryShareRepository.existsBySummaryIdAndSharedWithUserId(100L, 2L)).thenReturn(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(friend));

        service.shareSummary(100L, 2L);

        verify(summaryShareRepository).save(any(SummaryShare.class));
        verify(notificationService).notify(eq(friend), eq(NotificationType.SUMMARY_SHARED),
                anyString(), anyString(), eq("/summaries/100"));
    }

    @Test
    void shareSummary_NotFriends_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        when(friendService.areFriends(1L, 2L)).thenReturn(false);

        assertThrows(BadRequestException.class, () -> service.shareSummary(100L, 2L));
        verifyNoInteractions(notificationService);
    }

    @Test
    void shareSummary_AlreadyShared_IsIdempotent() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        when(friendService.areFriends(1L, 2L)).thenReturn(true);
        when(summaryShareRepository.existsBySummaryIdAndSharedWithUserId(100L, 2L)).thenReturn(true);

        service.shareSummary(100L, 2L);

        verify(summaryShareRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void shareSummary_SelfShare_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));

        assertThrows(BadRequestException.class, () -> service.shareSummary(100L, 1L));
    }

    @Test
    void unshareSummary_Success_DeletesShare() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        SummaryShare share = SummaryShare.builder().id(9L).summary(summary).sharedWithUser(friend).build();
        when(summaryShareRepository.findBySummaryIdAndSharedWithUserId(100L, 2L)).thenReturn(Optional.of(share));

        service.unshareSummary(100L, 2L);

        verify(summaryShareRepository).delete(share);
    }

    @Test
    void unshareSummary_NotShared_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        when(summaryShareRepository.findBySummaryIdAndSharedWithUserId(100L, 2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.unshareSummary(100L, 2L));
    }

    @Test
    void listShares_ReturnsSharedUsers() {
        when(currentUserProvider.getCurrentUser()).thenReturn(owner);
        when(courseSummaryRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(summary));
        SummaryShare share = SummaryShare.builder().id(9L).summary(summary).sharedWithUser(friend).build();
        when(summaryShareRepository.findBySummaryIdOrderByCreatedAtAsc(100L)).thenReturn(List.of(share));

        List<SharedUserResponse> result = service.listShares(100L);

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getUserId());
    }
}
