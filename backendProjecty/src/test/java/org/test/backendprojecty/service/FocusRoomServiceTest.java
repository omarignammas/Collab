package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.test.backendprojecty.dtos.request.FocusRoomRequest;
import org.test.backendprojecty.dtos.response.FocusRoomResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.event.AiChatRequestedEvent;
import org.test.backendprojecty.event.FocusRoomCompletedEvent;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.FocusRoomMapper;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.FocusRoomMessageRepository;
import org.test.backendprojecty.repository.FocusRoomParticipantRepository;
import org.test.backendprojecty.repository.FocusRoomReportRepository;
import org.test.backendprojecty.repository.FocusRoomRepository;
import org.test.backendprojecty.repository.FocusTimeEntryRepository;
import org.test.backendprojecty.repository.NoteRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FocusRoomServiceTest {

    @Mock
    private FocusRoomRepository focusRoomRepository;
    @Mock
    private FocusRoomParticipantRepository participantRepository;
    @Mock
    private FocusRoomMessageRepository messageRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private FocusRoomMapper focusRoomMapper;
    @Mock
    private CurrentUserProvider currentUserProvider;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private FocusRoomSchedulerService focusRoomSchedulerService;
    @Mock
    private FriendService friendService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private LlmApiClient llmApiClient;
    @Mock
    private FocusRoomReportRepository focusRoomReportRepository;
    @Mock
    private NoteRepository noteRepository;
    @Mock
    private FocusTimeEntryRepository focusTimeEntryRepository;

    private FocusRoomService focusRoomService;

    private User host;
    private User guest;

    @BeforeEach
    void setUp() {
        focusRoomService = new FocusRoomService(
                focusRoomRepository, participantRepository, messageRepository, courseRepository, userRepository,
                focusRoomMapper, currentUserProvider, messagingTemplate, focusRoomSchedulerService,
                friendService, notificationService, eventPublisher, transactionManager, llmApiClient,
                focusRoomReportRepository, noteRepository, focusTimeEntryRepository
        );

        host = User.builder().id(1L).firstName("Host").lastName("User").email("host@example.com").build();
        guest = User.builder().id(2L).firstName("Guest").lastName("User").email("guest@example.com").build();

        lenient().when(focusRoomRepository.save(any(FocusRoom.class))).thenAnswer(inv -> {
            FocusRoom room = inv.getArgument(0);
            if (room.getId() == null) {
                room.setId(10L);
            }
            return room;
        });
        lenient().when(participantRepository.save(any(FocusRoomParticipant.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(participantRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(messageRepository.save(any(FocusRoomMessage.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(participantRepository.findByRoomIdOrderByCreatedAtAsc(anyLong())).thenReturn(new ArrayList<>());
        lenient().when(messageRepository.findTop50ByRoomIdOrderByCreatedAtDesc(anyLong())).thenReturn(new ArrayList<>());
        lenient().when(focusRoomMapper.toResponse(any(), anyList(), anyList())).thenReturn(FocusRoomResponse.builder().build());
        // endSession deletes the room and everything under it — defaults so
        // tests that don't care about deletion specifically don't NPE on it.
        lenient().when(noteRepository.findByRoomIdOrderByCreatedAtAsc(anyLong())).thenReturn(new ArrayList<>());
        lenient().when(noteRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(focusRoomReportRepository.findByRoomId(anyLong())).thenReturn(Optional.empty());
    }

    private FocusRoom lobbyRoom() {
        return FocusRoom.builder()
                .id(10L)
                .code("ABC-123")
                .name("Study Sesh")
                .host(host)
                .workMinutes(25)
                .breakMinutes(5)
                .totalRounds(4)
                .longBreakMinutes(15)
                .status(FocusRoomStatus.LOBBY)
                .currentRound(0)
                .locked(false)
                .build();
    }

    private FocusRoomParticipant participant(FocusRoom room, User user, ParticipantStatus status) {
        return FocusRoomParticipant.builder().room(room).user(user).status(status).build();
    }

    @Test
    void createRoom_Success_GeneratesCodeAndAddsHostAsParticipant() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.existsByCode(anyString())).thenReturn(false);

        FocusRoomRequest request = FocusRoomRequest.builder()
                .name("Organic Chem Study Sesh")
                .workMinutes(25).breakMinutes(5).totalRounds(4).longBreakMinutes(15)
                .build();

        focusRoomService.createRoom(request);

        ArgumentCaptor<FocusRoom> roomCaptor = ArgumentCaptor.forClass(FocusRoom.class);
        verify(focusRoomRepository).save(roomCaptor.capture());
        assertEquals(FocusRoomStatus.LOBBY, roomCaptor.getValue().getStatus());
        assertNotNull(roomCaptor.getValue().getCode());

        ArgumentCaptor<FocusRoomParticipant> participantCaptor = ArgumentCaptor.forClass(FocusRoomParticipant.class);
        verify(participantRepository).save(participantCaptor.capture());
        assertEquals(host, participantCaptor.getValue().getUser());
        assertEquals(ParticipantStatus.JOINED, participantCaptor.getValue().getStatus());
    }

    @Test
    void createRoom_CourseNotOwned_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(99L, host.getId())).thenReturn(Optional.empty());

        FocusRoomRequest request = FocusRoomRequest.builder()
                .name("Room").courseId(99L)
                .workMinutes(25).breakMinutes(5).totalRounds(4).longBreakMinutes(15)
                .build();

        assertThrows(ResourceNotFoundException.class, () -> focusRoomService.createRoom(request));
    }

    @Test
    void createRoom_WithFriendInvite_CreatesInvitedParticipantAndNotifies() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.existsByCode(anyString())).thenReturn(false);
        when(friendService.areFriends(host.getId(), guest.getId())).thenReturn(true);
        when(userRepository.findById(guest.getId())).thenReturn(Optional.of(guest));
        when(participantRepository.findByRoomIdAndUserId(anyLong(), eq(guest.getId()))).thenReturn(Optional.empty());

        FocusRoomRequest request = FocusRoomRequest.builder()
                .name("Study Sesh")
                .workMinutes(25).breakMinutes(5).totalRounds(4).longBreakMinutes(15)
                .inviteUserIds(List.of(guest.getId()))
                .build();

        focusRoomService.createRoom(request);

        ArgumentCaptor<FocusRoomParticipant> captor = ArgumentCaptor.forClass(FocusRoomParticipant.class);
        verify(participantRepository, times(2)).save(captor.capture());
        FocusRoomParticipant invited = captor.getAllValues().get(1);
        assertEquals(guest, invited.getUser());
        assertEquals(ParticipantStatus.INVITED, invited.getStatus());

        verify(notificationService).notify(eq(guest), eq(NotificationType.FOCUS_ROOM_INVITE), anyString(), anyString(), startsWith("/focus-rooms/"), anyString());
    }

    @Test
    void createRoom_InviteNonFriend_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.existsByCode(anyString())).thenReturn(false);
        when(friendService.areFriends(host.getId(), guest.getId())).thenReturn(false);

        FocusRoomRequest request = FocusRoomRequest.builder()
                .name("Study Sesh")
                .workMinutes(25).breakMinutes(5).totalRounds(4).longBreakMinutes(15)
                .inviteUserIds(List.of(guest.getId()))
                .build();

        assertThrows(BadRequestException.class, () -> focusRoomService.createRoom(request));
    }

    @Test
    void createRoom_WithScheduledFor_PersistsOnRoom() {
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.existsByCode(anyString())).thenReturn(false);
        Instant scheduledFor = Instant.now().plusSeconds(3600);

        FocusRoomRequest request = FocusRoomRequest.builder()
                .name("Study Sesh")
                .workMinutes(25).breakMinutes(5).totalRounds(4).longBreakMinutes(15)
                .scheduledFor(scheduledFor)
                .build();

        focusRoomService.createRoom(request);

        ArgumentCaptor<FocusRoom> captor = ArgumentCaptor.forClass(FocusRoom.class);
        verify(focusRoomRepository).save(captor.capture());
        assertEquals(scheduledFor, captor.getValue().getScheduledFor());
    }

    @Test
    void inviteToRoom_NotHost_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.inviteToRoom("ABC-123", 3L));
    }

    @Test
    void inviteToRoom_NonFriend_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(friendService.areFriends(host.getId(), guest.getId())).thenReturn(false);

        assertThrows(BadRequestException.class, () -> focusRoomService.inviteToRoom("ABC-123", guest.getId()));
    }

    @Test
    void inviteToRoom_AlreadyInvolved_IsIdempotent() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(friendService.areFriends(host.getId(), guest.getId())).thenReturn(true);
        when(userRepository.findById(guest.getId())).thenReturn(Optional.of(guest));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId()))
                .thenReturn(Optional.of(participant(room, guest, ParticipantStatus.JOINED)));

        focusRoomService.inviteToRoom("ABC-123", guest.getId());

        verify(participantRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void inviteToRoom_Success_CreatesInvitedParticipantAndBroadcasts() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(friendService.areFriends(host.getId(), guest.getId())).thenReturn(true);
        when(userRepository.findById(guest.getId())).thenReturn(Optional.of(guest));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.empty());

        focusRoomService.inviteToRoom("ABC-123", guest.getId());

        ArgumentCaptor<FocusRoomParticipant> captor = ArgumentCaptor.forClass(FocusRoomParticipant.class);
        verify(participantRepository).save(captor.capture());
        assertEquals(ParticipantStatus.INVITED, captor.getValue().getStatus());
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/ABC-123"), any(FocusRoomResponse.class));
    }

    @Test
    void joinRoom_FreshJoin_CreatesParticipantAndPostsSystemMessage() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.empty());

        focusRoomService.joinRoom("ABC-123");

        ArgumentCaptor<FocusRoomParticipant> captor = ArgumentCaptor.forClass(FocusRoomParticipant.class);
        verify(participantRepository).saveAndFlush(captor.capture());
        assertEquals(ParticipantStatus.JOINED, captor.getValue().getStatus());

        ArgumentCaptor<FocusRoomMessage> msgCaptor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository).save(msgCaptor.capture());
        assertTrue(msgCaptor.getValue().getBody().contains("joined"));
        assertEquals(FocusMessageType.SYSTEM, msgCaptor.getValue().getType());

        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/ABC-123"), any(FocusRoomResponse.class));
        // No prior INVITED row — nobody specifically invited this join, so the host isn't notified.
        verifyNoInteractions(notificationService);
    }

    @Test
    void joinRoom_RespondingToInvite_NotifiesHost() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant invited = participant(room, guest, ParticipantStatus.INVITED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(invited));

        focusRoomService.joinRoom("ABC-123");

        assertEquals(ParticipantStatus.JOINED, invited.getStatus());
        verify(notificationService).notify(eq(host), eq(NotificationType.FOCUS_ROOM_INVITE),
                anyString(), contains("joined"), startsWith("/focus-rooms/"), eq("ABC-123"));
    }

    @Test
    void joinRoom_AlreadyJoined_IsIdempotent_NoDuplicateSystemMessage() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant existing = participant(room, guest, ParticipantStatus.JOINED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(existing));

        focusRoomService.joinRoom("ABC-123");

        verify(messageRepository, never()).save(any());
    }

    @Test
    void joinRoom_ConcurrentJoinRace_FallsBackToWinningParticipantRow() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant winner = participant(room, guest, ParticipantStatus.JOINED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        // First read (in joinRoom) sees nobody yet; a concurrent request wins the
        // insert race, so the retry read after the constraint violation finds their row.
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId()))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(winner));
        when(participantRepository.saveAndFlush(any(FocusRoomParticipant.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        FocusRoomResponse response = focusRoomService.joinRoom("ABC-123");

        assertNotNull(response);
        // We lost the race, so this wasn't a fresh join from our perspective — no duplicate
        // "joined" system message and no duplicate invite-accepted notification.
        verify(messageRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void joinRoom_Locked_NewParticipant_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setLocked(true);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> focusRoomService.joinRoom("ABC-123"));
    }

    @Test
    void joinRoom_CompletedRoom_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.COMPLETED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.joinRoom("ABC-123"));
    }

    @Test
    void declineInvite_Success_MarksDeclinedAndNotifiesHost() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant invited = participant(room, guest, ParticipantStatus.INVITED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(invited));

        focusRoomService.declineInvite("ABC-123");

        assertEquals(ParticipantStatus.DECLINED, invited.getStatus());
        verify(notificationService).notify(eq(host), eq(NotificationType.FOCUS_ROOM_INVITE),
                anyString(), contains("declined"), startsWith("/focus-rooms/"), eq("ABC-123"));
    }

    @Test
    void declineInvite_NoInvite_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> focusRoomService.declineInvite("ABC-123"));
        verifyNoInteractions(notificationService);
    }

    @Test
    void declineInvite_AlreadyJoined_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant joined = participant(room, guest, ParticipantStatus.JOINED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(joined));

        assertThrows(BadRequestException.class, () -> focusRoomService.declineInvite("ABC-123"));
        verifyNoInteractions(notificationService);
    }

    @Test
    void rematchRoom_NotHost_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.COMPLETED);
        when(currentUserProvider.getCurrentUser()).thenReturn(guest);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.rematchRoom("ABC-123"));
    }

    @Test
    void rematchRoom_NotCompleted_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.rematchRoom("ABC-123"));
    }

    @Test
    void rematchRoom_Success_InvitesOldParticipantsExceptHost() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.COMPLETED);
        when(currentUserProvider.getCurrentUser()).thenReturn(host);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(
                participant(room, host, ParticipantStatus.COMPLETED),
                participant(room, guest, ParticipantStatus.COMPLETED)
        ));

        focusRoomService.rematchRoom("ABC-123");

        ArgumentCaptor<FocusRoomParticipant> captor = ArgumentCaptor.forClass(FocusRoomParticipant.class);
        verify(participantRepository, times(2)).save(captor.capture());
        List<FocusRoomParticipant> saved = captor.getAllValues();
        assertEquals(host, saved.get(0).getUser());
        assertEquals(ParticipantStatus.JOINED, saved.get(0).getStatus());
        assertEquals(guest, saved.get(1).getUser());
        assertEquals(ParticipantStatus.INVITED, saved.get(1).getStatus());
    }

    @Test
    void startSession_NotHost_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.startSession("ABC-123", guest));
        verify(focusRoomSchedulerService, never()).scheduleNextPhase(any());
    }

    @Test
    void startSession_NotLobby_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.startSession("ABC-123", host));
    }

    @Test
    void startSession_Success_ActivatesRoomAndSchedulesPhase() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant hostParticipant = participant(room, host, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(hostParticipant));

        focusRoomService.startSession("ABC-123", host);

        assertEquals(FocusRoomStatus.ACTIVE, room.getStatus());
        assertEquals(1, room.getCurrentRound());
        assertEquals(FocusPhase.WORK, room.getCurrentPhase());
        assertNotNull(room.getPhaseEndsAt());
        assertTrue(room.getPhaseEndsAt().isAfter(Instant.now()));
        assertEquals(ParticipantStatus.FOCUSING, hostParticipant.getStatus());

        verify(focusRoomSchedulerService).scheduleNextPhase(room);
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/ABC-123"), any(FocusRoomResponse.class));
    }

    @Test
    void endSession_NotHost_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.endSession("ABC-123", guest));
        verify(focusRoomSchedulerService, never()).cancelScheduledTask(any());
    }

    @Test
    void endSession_NotActive_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.endSession("ABC-123", host));
    }

    @Test
    void endSession_Success_CreditsElapsedWorkAndCompletesRoom() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentRound(2);
        room.setCurrentPhase(FocusPhase.WORK);
        // 25-minute block, 10 minutes already elapsed -> 15 minutes remain
        room.setPhaseEndsAt(Instant.now().plusSeconds(15 * 60L));

        FocusRoomParticipant hostParticipant = participant(room, host, ParticipantStatus.FOCUSING);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.QUIT);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L))
                .thenReturn(List.of(hostParticipant, guestParticipant));

        focusRoomService.endSession("ABC-123", host);

        assertEquals(FocusRoomStatus.COMPLETED, room.getStatus());
        assertNull(room.getPhaseEndsAt());
        assertEquals(ParticipantStatus.COMPLETED, hostParticipant.getStatus());
        assertEquals(10, hostParticipant.getMinutesFocused());
        assertEquals(ParticipantStatus.QUIT, guestParticipant.getStatus());
        assertEquals(0, guestParticipant.getMinutesFocused());

        verify(focusRoomSchedulerService).cancelScheduledTask(10L);
        verify(focusRoomRepository, never()).delete(any(FocusRoom.class));
        verify(eventPublisher).publishEvent(new FocusRoomCompletedEvent(10L));
        ArgumentCaptor<FocusRoomMessage> msgCaptor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository).save(msgCaptor.capture());
        assertTrue(msgCaptor.getValue().getBody().contains("ended the session early"));
    }

    @Test
    void togglePause_HostPausesAndResumesServerClock() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentPhase(FocusPhase.WORK);
        room.setPhaseEndsAt(Instant.now().plusSeconds(10 * 60L));
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        focusRoomService.togglePause("ABC-123", host);

        assertTrue(room.isPaused());
        assertNull(room.getPhaseEndsAt());
        assertNotNull(room.getPausedRemainingSeconds());
        assertTrue(room.getPausedRemainingSeconds() <= 10 * 60L);
        verify(focusRoomSchedulerService).cancelScheduledTask(10L);

        focusRoomService.togglePause("ABC-123", host);

        assertFalse(room.isPaused());
        assertNull(room.getPausedRemainingSeconds());
        assertNotNull(room.getPhaseEndsAt());
        verify(focusRoomSchedulerService).scheduleNextPhase(room);
    }

    @Test
    void togglePause_NonHostCannotPause() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class, () -> focusRoomService.togglePause("ABC-123", guest));
        verify(focusRoomSchedulerService, never()).cancelScheduledTask(anyLong());
    }

    @Test
    void leaveRoom_Success_MarksQuitWithTimestamp() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentRound(2);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        focusRoomService.leaveRoom("ABC-123", guest);

        assertEquals(ParticipantStatus.QUIT, guestParticipant.getStatus());
        assertNotNull(guestParticipant.getLeftAt());

        ArgumentCaptor<FocusRoomMessage> msgCaptor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository).save(msgCaptor.capture());
        assertTrue(msgCaptor.getValue().getBody().contains("quit"));
        assertTrue(msgCaptor.getValue().getBody().contains("Round 2"));
    }

    @Test
    void leaveRoom_NotAParticipant_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> focusRoomService.leaveRoom("ABC-123", guest));
    }

    @Test
    void leaveRoom_LastActiveParticipantLeaves_CompletesRoom() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(guestParticipant));

        focusRoomService.leaveRoom("ABC-123", guest);

        assertEquals(FocusRoomStatus.COMPLETED, room.getStatus());
        assertNull(room.getPhaseEndsAt());
        verify(focusRoomSchedulerService).cancelScheduledTask(10L);
    }

    @Test
    void leaveRoom_OtherParticipantsStillActive_RoomStaysActive() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        FocusRoomParticipant hostParticipant = participant(room, host, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L))
                .thenReturn(List.of(guestParticipant, hostParticipant));

        focusRoomService.leaveRoom("ABC-123", guest);

        assertEquals(FocusRoomStatus.ACTIVE, room.getStatus());
        verify(focusRoomSchedulerService, never()).cancelScheduledTask(anyLong());
    }

    @Test
    void leaveRoom_SoloHostLeavesFromLobby_CompletesRoom() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant hostParticipant = participant(room, host, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, host.getId())).thenReturn(Optional.of(hostParticipant));
        when(participantRepository.findByRoomIdOrderByCreatedAtAsc(10L)).thenReturn(List.of(hostParticipant));

        focusRoomService.leaveRoom("ABC-123", host);

        assertEquals(FocusRoomStatus.COMPLETED, room.getStatus());
    }

    @Test
    void toggleHand_RaisesThenLowers_PostsSystemMessageOnlyOnRaise() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        focusRoomService.toggleHand("ABC-123", guest);
        assertTrue(guestParticipant.isHandRaised());
        verify(messageRepository, times(1)).save(any());

        focusRoomService.toggleHand("ABC-123", guest);
        assertFalse(guestParticipant.isHandRaised());
        verify(messageRepository, times(1)).save(any());
    }

    @Test
    void postChatMessage_DuringWorkPhase_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentPhase(FocusPhase.WORK);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        assertThrows(BadRequestException.class,
                () -> focusRoomService.postChatMessage("ABC-123", guest, "can someone help?", false));
        verify(messageRepository, never()).save(any(FocusRoomMessage.class));
    }

    @Test
    void postChatMessage_DuringBreak_Success() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentPhase(FocusPhase.BREAK);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.ON_BREAK);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        focusRoomService.postChatMessage("ABC-123", guest, "back in 5", false);

        ArgumentCaptor<FocusRoomMessage> captor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository).save(captor.capture());
        assertEquals(FocusMessageType.CHAT, captor.getValue().getType());
        assertEquals("back in 5", captor.getValue().getBody());
        assertEquals(guest, captor.getValue().getSender());
    }

    @Test
    void postChatMessage_QuitParticipant_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.QUIT);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        assertThrows(BadRequestException.class,
                () -> focusRoomService.postChatMessage("ABC-123", guest, "hello?", false));
    }

    @Test
    void postChatMessage_OpenMode_AllowsPlainTextDuringWork() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentPhase(FocusPhase.WORK);
        room.setChatMode(ChatMode.OPEN);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        focusRoomService.postChatMessage("ABC-123", guest, "quick question about Q3", false);

        verify(messageRepository).save(any(FocusRoomMessage.class));
    }

    @Test
    void postChatMessage_EmojiOnlyMode_BlocksPlainTextDuringWork() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentPhase(FocusPhase.WORK);
        room.setChatMode(ChatMode.EMOJI_ONLY_FOCUS);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        assertThrows(BadRequestException.class,
                () -> focusRoomService.postChatMessage("ABC-123", guest, "can someone help?", false));
        verify(messageRepository, never()).save(any(FocusRoomMessage.class));
    }

    @Test
    void postChatMessage_EmojiOnlyMode_AllowsEmojiDuringWork() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentPhase(FocusPhase.WORK);
        room.setChatMode(ChatMode.EMOJI_ONLY_FOCUS);
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.FOCUSING);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));

        focusRoomService.postChatMessage("ABC-123", guest, "👍🔥", false);

        verify(messageRepository).save(any(FocusRoomMessage.class));
    }

    @Test
    void postChatMessage_CollabMention_PostsThinkingMessageAndPublishesEvent() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(llmApiClient.isConfigured()).thenReturn(true);

        focusRoomService.postChatMessage("ABC-123", guest, "collab, what is osmosis?", false);

        ArgumentCaptor<FocusRoomMessage> msgCaptor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository, times(2)).save(msgCaptor.capture());
        assertEquals(FocusMessageType.CHAT, msgCaptor.getAllValues().get(0).getType());
        assertEquals(FocusMessageType.SYSTEM, msgCaptor.getAllValues().get(1).getType());
        assertTrue(msgCaptor.getAllValues().get(1).getBody().contains("thinking"));

        ArgumentCaptor<AiChatRequestedEvent> eventCaptor = ArgumentCaptor.forClass(AiChatRequestedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals(10L, eventCaptor.getValue().roomId());
        assertEquals("collab, what is osmosis?", eventCaptor.getValue().question());
        verify(llmApiClient, never()).classifyIsDirectedQuestion(anyString()); // name-mention short-circuits the classifier
    }

    @Test
    void postChatMessage_CollabMentionCaseInsensitive_StillDetected() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(llmApiClient.isConfigured()).thenReturn(true);

        focusRoomService.postChatMessage("ABC-123", guest, "Hey COLLAB summarize chapter 4", false);

        ArgumentCaptor<AiChatRequestedEvent> eventCaptor = ArgumentCaptor.forClass(AiChatRequestedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("Hey COLLAB summarize chapter 4", eventCaptor.getValue().question());
        verify(llmApiClient, never()).classifyIsDirectedQuestion(anyString());
    }

    @Test
    void postChatMessage_UnnamedQuestion_ClassifierApproves_PublishesEvent() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(llmApiClient.isConfigured()).thenReturn(true);
        when(llmApiClient.classifyIsDirectedQuestion("what is osmosis?")).thenReturn(true);

        focusRoomService.postChatMessage("ABC-123", guest, "what is osmosis?", false);

        ArgumentCaptor<AiChatRequestedEvent> eventCaptor = ArgumentCaptor.forClass(AiChatRequestedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals("what is osmosis?", eventCaptor.getValue().question());
    }

    @Test
    void postChatMessage_UnnamedQuestion_ClassifierRejects_DoesNotPublishEvent() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(llmApiClient.isConfigured()).thenReturn(true);
        when(llmApiClient.classifyIsDirectedQuestion("anyone else hungry?")).thenReturn(false);

        focusRoomService.postChatMessage("ABC-123", guest, "anyone else hungry?", false);

        verify(messageRepository, times(1)).save(any(FocusRoomMessage.class));
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void postChatMessage_PlainMessage_NeverCallsClassifierOrPublishesEvent() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(llmApiClient.isConfigured()).thenReturn(true);

        focusRoomService.postChatMessage("ABC-123", guest, "just a normal message", false);

        verify(messageRepository, times(1)).save(any(FocusRoomMessage.class));
        verify(llmApiClient, never()).classifyIsDirectedQuestion(anyString());
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void postChatMessage_LlmNotConfigured_NeverPublishesEventEvenForMention() {
        FocusRoom room = lobbyRoom();
        FocusRoomParticipant guestParticipant = participant(room, guest, ParticipantStatus.JOINED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(participantRepository.findByRoomIdAndUserId(10L, guest.getId())).thenReturn(Optional.of(guestParticipant));
        when(llmApiClient.isConfigured()).thenReturn(false);

        focusRoomService.postChatMessage("ABC-123", guest, "collab please help", false);

        verify(messageRepository, times(1)).save(any(FocusRoomMessage.class));
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void broadcastSnapshot_Success_RebroadcastsCurrentState() {
        FocusRoom room = lobbyRoom();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        focusRoomService.broadcastSnapshot("ABC-123");

        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/ABC-123"), any(FocusRoomResponse.class));
    }

    @Test
    void updateChatMode_NotHost_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class,
                () -> focusRoomService.updateChatMode("ABC-123", guest, ChatMode.OPEN));
    }

    @Test
    void updateChatMode_CompletedRoom_ThrowsBadRequest() {
        FocusRoom room = lobbyRoom();
        room.setStatus(FocusRoomStatus.COMPLETED);
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        assertThrows(BadRequestException.class,
                () -> focusRoomService.updateChatMode("ABC-123", host, ChatMode.OPEN));
    }

    @Test
    void updateChatMode_Success_UpdatesAndBroadcasts() {
        FocusRoom room = lobbyRoom();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));

        focusRoomService.updateChatMode("ABC-123", host, ChatMode.OPEN);

        assertEquals(ChatMode.OPEN, room.getChatMode());
        verify(messagingTemplate).convertAndSend(eq("/topic/rooms/ABC-123"), any(FocusRoomResponse.class));
    }
}
