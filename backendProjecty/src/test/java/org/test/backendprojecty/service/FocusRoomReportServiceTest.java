package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.test.backendprojecty.dtos.response.FocusRoomReportResponse;
import org.test.backendprojecty.entity.FocusMessageType;
import org.test.backendprojecty.entity.FocusRoom;
import org.test.backendprojecty.entity.FocusRoomParticipant;
import org.test.backendprojecty.entity.FocusRoomReport;
import org.test.backendprojecty.entity.FocusRoomStatus;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.ParticipantStatus;
import org.test.backendprojecty.entity.GenerationStatus;
import org.test.backendprojecty.entity.Note;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.event.FocusRoomCompletedEvent;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ExternalApiException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.FocusRoomMessageRepository;
import org.test.backendprojecty.repository.FocusRoomParticipantRepository;
import org.test.backendprojecty.repository.FocusRoomReportRepository;
import org.test.backendprojecty.repository.FocusRoomRepository;
import org.test.backendprojecty.repository.NoteRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FocusRoomReportServiceTest {

    @Mock
    private FocusRoomRepository focusRoomRepository;
    @Mock
    private FocusRoomParticipantRepository participantRepository;
    @Mock
    private FocusRoomMessageRepository messageRepository;
    @Mock
    private NoteRepository noteRepository;
    @Mock
    private FocusRoomReportRepository reportRepository;
    @Mock
    private LlmApiClient llmApiClient;
    @Mock
    private NotificationService notificationService;
    @Mock
    private CurrentUserProvider currentUserProvider;

    private FocusRoomReportService service;

    private User host;
    private FocusRoom room;

    @BeforeEach
    void setUp() {
        service = new FocusRoomReportService(
                focusRoomRepository, participantRepository, messageRepository, noteRepository,
                reportRepository, llmApiClient, notificationService, currentUserProvider
        );

        host = User.builder().id(1L).firstName("Host").lastName("User").email("host@example.com").build();
        room = FocusRoom.builder().id(10L).code("ABC-123").name("Study Sesh").host(host).aiReportEnabled(true).build();

        lenient().when(messageRepository.findByRoomIdAndTypeOrderByCreatedAtAsc(10L, FocusMessageType.CHAT))
                .thenReturn(Collections.emptyList());
        lenient().when(noteRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(Collections.emptyList());
    }

    @Test
    void onRoomCompleted_Success_GeneratesReportAndNotifiesParticipants() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.empty());
        when(reportRepository.save(any(FocusRoomReport.class))).thenAnswer(inv -> inv.getArgument(0));
        when(llmApiClient.generateText(anyString())).thenReturn("Great session!");

        FocusRoomParticipant participant = FocusRoomParticipant.builder()
                .room(room).user(host).status(ParticipantStatus.COMPLETED).build();
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(participant));

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        ArgumentCaptor<FocusRoomReport> captor = ArgumentCaptor.forClass(FocusRoomReport.class);
        verify(reportRepository, times(2)).save(captor.capture());
        assertEquals(GenerationStatus.READY, captor.getValue().getStatus());
        assertEquals("Great session!", captor.getValue().getContent());

        verify(notificationService).notify(eq(host), eq(NotificationType.FOCUS_ROOM_REPORT_READY),
                anyString(), anyString(), eq("/focus-rooms/ABC-123"));
    }

    @Test
    void onRoomCompleted_Success_PromptRequestsStructuredSectionsAndIncludesAllNotes() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.empty());
        when(reportRepository.save(any(FocusRoomReport.class))).thenAnswer(inv -> inv.getArgument(0));
        when(llmApiClient.generateText(anyString())).thenReturn("Great session!");

        User otherParticipant = User.builder().id(2L).firstName("Deniz").lastName("K").email("deniz@example.com").build();
        Note noteFromHost = Note.builder().user(host).title("Lab notes").body("Buffer solution results").build();
        Note noteFromOther = Note.builder().user(otherParticipant).title("Osmosis").body("Hypotonic vs hypertonic").build();
        when(noteRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(noteFromHost, noteFromOther));

        FocusRoomParticipant participant = FocusRoomParticipant.builder()
                .room(room).user(host).status(ParticipantStatus.COMPLETED).build();
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(participant));

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmApiClient).generateText(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        assertTrue(prompt.contains("## General Summary"));
        assertTrue(prompt.contains("## Problems & Searches"));
        assertTrue(prompt.contains("## Blocking Points"));
        assertTrue(prompt.contains("## Fine Points"));
        assertTrue(prompt.contains("## Combined Notes"));
        assertTrue(prompt.contains("Topic: Lab notes"));
        assertTrue(prompt.contains("- Host User: Buffer solution results"));
        assertTrue(prompt.contains("Topic: Osmosis"));
        assertTrue(prompt.contains("- Deniz K: Hypotonic vs hypertonic"));
    }

    @Test
    void onRoomCompleted_NotesShareATitle_GroupedUnderOneTopic() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.empty());
        when(reportRepository.save(any(FocusRoomReport.class))).thenAnswer(inv -> inv.getArgument(0));
        when(llmApiClient.generateText(anyString())).thenReturn("Great session!");

        User otherParticipant = User.builder().id(2L).firstName("Deniz").lastName("K").email("deniz@example.com").build();
        Note noteFromHost = Note.builder().user(host).title("Cordon Bleu").body("Cash-only, since 1968").build();
        Note noteFromOther = Note.builder().user(otherParticipant).title("cordon bleu ").body("9 counter seats").build();
        when(noteRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(noteFromHost, noteFromOther));

        FocusRoomParticipant participant = FocusRoomParticipant.builder()
                .room(room).user(host).status(ParticipantStatus.COMPLETED).build();
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(participant));

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmApiClient).generateText(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        // Same topic (case/whitespace-insensitive match) collapses to a single "Topic:" line
        assertEquals(1, prompt.split("Topic: Cordon Bleu").length - 1);
        assertTrue(prompt.contains("- Host User: Cash-only, since 1968"));
        assertTrue(prompt.contains("- Deniz K: 9 counter seats"));
    }

    @Test
    void onRoomCompleted_AiReportDisabled_SkipsEntirely() {
        room.setAiReportEnabled(false);
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        verifyNoInteractions(reportRepository, llmApiClient, notificationService);
    }

    @Test
    void onRoomCompleted_ReportAlreadyExists_IsIdempotent() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.of(FocusRoomReport.builder().build()));

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        verify(reportRepository, never()).save(any());
        verifyNoInteractions(llmApiClient);
    }

    @Test
    void onRoomCompleted_LlmFails_MarksFailed_DoesNotNotify() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.empty());
        when(reportRepository.save(any(FocusRoomReport.class))).thenAnswer(inv -> inv.getArgument(0));
        when(llmApiClient.generateText(anyString())).thenThrow(new ExternalApiException("AI down"));

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        ArgumentCaptor<FocusRoomReport> captor = ArgumentCaptor.forClass(FocusRoomReport.class);
        verify(reportRepository, times(2)).save(captor.capture());
        assertEquals(GenerationStatus.FAILED, captor.getValue().getStatus());
        verifyNoInteractions(notificationService);
    }

    @Test
    void onRoomCompleted_RoomNotFound_NoOp() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.empty());

        service.onRoomCompleted(new FocusRoomCompletedEvent(10L));

        verifyNoInteractions(reportRepository, llmApiClient, notificationService);
    }

    @Test
    void getReport_Participant_ReturnsReport() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, 1L)).thenReturn(Optional.of(
                FocusRoomParticipant.builder().room(room).user(host).build()));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.of(
                FocusRoomReport.builder().status(GenerationStatus.READY).content("Recap text").build()));

        FocusRoomReportResponse response = service.getReport("ABC-123");

        assertEquals(GenerationStatus.READY, response.getStatus());
        assertEquals("Recap text", response.getContent());
    }

    @Test
    void getReport_NotAParticipant_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, 1L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> service.getReport("ABC-123"));
    }

    @Test
    void getReport_NoReportRow_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, 1L)).thenReturn(Optional.of(
                FocusRoomParticipant.builder().room(room).user(host).build()));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getReport("ABC-123"));
    }

    @Test
    void getReport_CompletedRoomBeforeAsyncInsert_ReturnsPending() {
        room.setStatus(FocusRoomStatus.COMPLETED);
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, 1L)).thenReturn(Optional.of(
                FocusRoomParticipant.builder().room(room).user(host).build()));
        when(reportRepository.findByRoomId(10L)).thenReturn(Optional.empty());

        FocusRoomReportResponse response = service.getReport("ABC-123");

        assertEquals(GenerationStatus.PENDING, response.getStatus());
        assertNull(response.getContent());
    }
}
