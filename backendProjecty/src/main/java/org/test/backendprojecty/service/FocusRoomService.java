package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.FocusRoomRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.FocusRoomResponse;
import org.test.backendprojecty.dtos.response.FocusTimeEntryResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
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

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FocusRoomService {

    private static final String CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String CODE_DIGITS = "0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final FocusRoomRepository focusRoomRepository;
    private final FocusRoomParticipantRepository participantRepository;
    private final FocusRoomMessageRepository messageRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final FocusRoomMapper focusRoomMapper;
    private final CurrentUserProvider currentUserProvider;
    private final SimpMessagingTemplate messagingTemplate;
    private final FocusRoomSchedulerService focusRoomSchedulerService;
    private final FriendService friendService;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;
    private final PlatformTransactionManager transactionManager;
    private final LlmApiClient llmApiClient;
    private final FocusRoomReportRepository focusRoomReportRepository;
    private final NoteRepository noteRepository;
    private final FocusTimeEntryRepository focusTimeEntryRepository;

    // Per-room in-flight guard — a burst of messages in a chatty room shouldn't fire
    // overlapping classification/reply calls. Set when a request is dispatched, cleared
    // by FocusRoomAiChatService once the reply lands (success or failure).
    private final ConcurrentHashMap<Long, Boolean> aiReplyPending = new ConcurrentHashMap<>();

    private static final Set<String> AI_QUESTION_STARTERS = Set.of(
            "should", "what", "how", "why", "when", "where", "can", "could",
            "does", "do", "is", "are", "will", "would", "who");

    @Transactional
    public FocusRoomResponse createRoom(FocusRoomRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        Course course = null;
        if (request.getCourseId() != null) {
            course = courseRepository.findByIdAndUserIdAndDeletedFalse(request.getCourseId(), currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + request.getCourseId()));
        }

        FocusRoom room = FocusRoom.builder()
                .code(generateUniqueCode())
                .name(request.getName())
                .host(currentUser)
                .course(course)
                .workMinutes(request.getWorkMinutes())
                .breakMinutes(request.getBreakMinutes())
                .totalRounds(request.getTotalRounds())
                .longBreakMinutes(request.getLongBreakMinutes())
                .status(FocusRoomStatus.LOBBY)
                .currentRound(0)
                .locked(false)
                .chatMode(request.getChatMode() != null ? request.getChatMode() : ChatMode.CLOSED_FOCUS)
                .scheduledFor(request.getScheduledFor())
                .aiReportEnabled(request.isAiReportEnabled())
                .build();
        room = focusRoomRepository.save(room);

        FocusRoomParticipant hostParticipant = FocusRoomParticipant.builder()
                .room(room)
                .user(currentUser)
                .status(ParticipantStatus.JOINED)
                .joinedAt(LocalDateTime.now())
                .build();
        participantRepository.save(hostParticipant);

        if (request.getInviteUserIds() != null) {
            for (Long inviteUserId : request.getInviteUserIds()) {
                inviteFriendToRoom(room, currentUser, inviteUserId);
            }
        }

        return buildSnapshot(room);
    }

    // Banked minutes from rooms deleted by an explicit End Session — Stats'
    // charts merge these back in alongside any still-existing completed
    // rooms. 90 days comfortably covers every window those charts look at
    // (the 30-day streak bar is the widest) without the response growing
    // unbounded over a user's lifetime.
    @Transactional(readOnly = true)
    public List<FocusTimeEntryResponse> getTimeEntries() {
        User currentUser = currentUserProvider.getCurrentUser();
        Instant cutoff = Instant.now().minus(90, java.time.temporal.ChronoUnit.DAYS);
        return focusTimeEntryRepository.findByUserIdAndEarnedAtAfter(currentUser.getId(), cutoff).stream()
                .map(e -> FocusTimeEntryResponse.builder()
                        .minutesFocused(e.getMinutesFocused())
                        .earnedAt(e.getEarnedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public FocusRoomResponse inviteToRoom(String code, Long friendUserId) {
        User currentUser = currentUserProvider.getCurrentUser();
        FocusRoom room = findRoomOrThrow(code);

        if (!room.getHost().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the host can invite people to this room");
        }
        if (room.getStatus() == FocusRoomStatus.COMPLETED) {
            throw new BadRequestException("This session has already ended");
        }

        inviteFriendToRoom(room, currentUser, friendUserId);
        return buildSnapshotAndBroadcast(room);
    }

    private void inviteFriendToRoom(FocusRoom room, User host, Long friendUserId) {
        if (!friendService.areFriends(host.getId(), friendUserId)) {
            throw new BadRequestException("You can only invite friends to a Focus Room");
        }

        User invitee = userRepository.findById(friendUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + friendUserId));

        boolean alreadyInvolved = participantRepository.findByRoomIdAndUserId(room.getId(), invitee.getId()).isPresent();
        if (alreadyInvolved) {
            return;
        }

        FocusRoomParticipant invited = FocusRoomParticipant.builder()
                .room(room)
                .user(invitee)
                .status(ParticipantStatus.INVITED)
                .build();
        participantRepository.save(invited);

        String when = room.getScheduledFor() != null ? " (scheduled for " + room.getScheduledFor() + ")" : "";
        notificationService.notify(invitee, NotificationType.FOCUS_ROOM_INVITE,
                "Focus Room invite",
                displayName(host) + " invited you to \"" + room.getName() + "\"" + when,
                "/focus-rooms/" + room.getCode(),
                room.getCode());
    }

    @Transactional(readOnly = true)
    public PagingResult<FocusRoomResponse> getAllRooms(PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        Pageable pageable = PaginationUtils.getPageable(request);
        Page<FocusRoom> roomsPage = focusRoomRepository.findByHostOrParticipant(currentUser.getId(), pageable);

        List<FocusRoomResponse> content = roomsPage.getContent()
                .stream()
                .map(room -> focusRoomMapper.toResponse(room, participantRepository.findByRoomIdOrderByCreatedAtAsc(room.getId()), Collections.emptyList()))
                .collect(Collectors.toList());

        return new PagingResult<>(
                content,
                roomsPage.getTotalPages(),
                roomsPage.getTotalElements(),
                roomsPage.getSize(),
                roomsPage.getNumber(),
                roomsPage.isEmpty()
        );
    }

    @Transactional(readOnly = true)
    public FocusRoomResponse getRoomByCode(String code) {
        FocusRoom room = findRoomOrThrow(code);
        return buildSnapshot(room);
    }

    @Transactional
    public FocusRoomResponse joinRoom(String code) {
        User currentUser = currentUserProvider.getCurrentUser();
        FocusRoom room = findRoomOrThrow(code);

        if (room.getStatus() == FocusRoomStatus.COMPLETED) {
            throw new BadRequestException("This session has already ended");
        }

        FocusRoomParticipant participant = participantRepository
                .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                .orElse(null);
        boolean wasInvited = participant != null && participant.getStatus() == ParticipantStatus.INVITED;

        boolean isFreshJoin;
        if (participant == null) {
            if (room.isLocked()) {
                throw new BadRequestException("This room is locked by the host");
            }
            participant = FocusRoomParticipant.builder()
                    .room(room)
                    .user(currentUser)
                    .status(ParticipantStatus.JOINED)
                    .joinedAt(LocalDateTime.now())
                    .build();
            isFreshJoin = true;
        } else if (participant.getStatus() == ParticipantStatus.INVITED
                || participant.getStatus() == ParticipantStatus.QUIT
                || participant.getStatus() == ParticipantStatus.DECLINED) {
            if (room.isLocked() && participant.getStatus() != ParticipantStatus.INVITED) {
                throw new BadRequestException("This room is locked by the host");
            }
            participant.setStatus(ParticipantStatus.JOINED);
            participant.setJoinedAt(LocalDateTime.now());
            participant.setLeftAt(null);
            isFreshJoin = true;
        } else {
            isFreshJoin = false;
        }

        try {
            saveParticipantInNewTransaction(participant);
        } catch (DataIntegrityViolationException e) {
            // Concurrent join for the same room+user won the race against us (see the
            // unique constraint on focus_room_participants). Their row already reflects
            // what we were trying to do, so fall back to it instead of failing the request.
            participant = participantRepository
                    .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                    .orElseThrow(() -> e);
            isFreshJoin = false;
        }

        if (isFreshJoin) {
            postSystemMessage(room, displayName(currentUser) + " joined");
            if (wasInvited && !room.getHost().getId().equals(currentUser.getId())) {
                notificationService.notify(room.getHost(), NotificationType.FOCUS_ROOM_INVITE,
                        "Invite accepted",
                        displayName(currentUser) + " joined \"" + room.getName() + "\"",
                        "/focus-rooms/" + room.getCode(),
                        room.getCode());
            }
        }

        return buildSnapshotAndBroadcast(room);
    }

    // Runs the participant upsert in its own transaction so a unique-constraint
    // violation (two concurrent joins for the same room+user) only rolls back
    // this write, instead of poisoning joinRoom()'s outer transaction — Postgres
    // aborts the whole transaction on error, so retrying a read afterward would
    // otherwise fail too.
    private void saveParticipantInNewTransaction(FocusRoomParticipant participant) {
        TransactionTemplate requiresNew = new TransactionTemplate(transactionManager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        requiresNew.executeWithoutResult(status -> participantRepository.saveAndFlush(participant));
    }

    @Transactional
    public void declineInvite(String code) {
        User currentUser = currentUserProvider.getCurrentUser();
        FocusRoom room = findRoomOrThrow(code);
        FocusRoomParticipant participant = participantRepository
                .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                .orElseThrow(() -> new BadRequestException("You don't have a pending invite to this room"));

        if (participant.getStatus() != ParticipantStatus.INVITED) {
            throw new BadRequestException("This invite is no longer pending");
        }

        participant.setStatus(ParticipantStatus.DECLINED);
        participantRepository.save(participant);

        notificationService.notify(room.getHost(), NotificationType.FOCUS_ROOM_INVITE,
                "Invite declined",
                displayName(currentUser) + " declined your invite to \"" + room.getName() + "\"",
                "/focus-rooms/" + room.getCode(),
                room.getCode());
    }

    @Transactional
    public FocusRoomResponse rematchRoom(String code) {
        User currentUser = currentUserProvider.getCurrentUser();
        FocusRoom oldRoom = findRoomOrThrow(code);

        if (!oldRoom.getHost().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the host can start a rematch");
        }
        if (oldRoom.getStatus() != FocusRoomStatus.COMPLETED) {
            throw new BadRequestException("Can only rematch a completed session");
        }

        FocusRoom newRoom = FocusRoom.builder()
                .code(generateUniqueCode())
                .name(oldRoom.getName())
                .host(oldRoom.getHost())
                .course(oldRoom.getCourse())
                .workMinutes(oldRoom.getWorkMinutes())
                .breakMinutes(oldRoom.getBreakMinutes())
                .totalRounds(oldRoom.getTotalRounds())
                .longBreakMinutes(oldRoom.getLongBreakMinutes())
                .status(FocusRoomStatus.LOBBY)
                .currentRound(0)
                .locked(false)
                .build();
        newRoom = focusRoomRepository.save(newRoom);

        FocusRoomParticipant hostParticipant = FocusRoomParticipant.builder()
                .room(newRoom)
                .user(currentUser)
                .status(ParticipantStatus.JOINED)
                .joinedAt(LocalDateTime.now())
                .build();
        participantRepository.save(hostParticipant);

        List<FocusRoomParticipant> oldParticipants = participantRepository.findByRoomIdOrderByCreatedAtAsc(oldRoom.getId());
        for (FocusRoomParticipant oldParticipant : oldParticipants) {
            if (oldParticipant.getUser().getId().equals(currentUser.getId())) {
                continue;
            }
            FocusRoomParticipant invited = FocusRoomParticipant.builder()
                    .room(newRoom)
                    .user(oldParticipant.getUser())
                    .status(ParticipantStatus.INVITED)
                    .build();
            participantRepository.save(invited);
        }

        return buildSnapshot(newRoom);
    }

    /**
     * The four methods below are invoked from FocusRoomStompController rather than
     * REST, so the current user arrives as an explicit param instead of via
     * CurrentUserProvider — STOMP message handling never populates SecurityContextHolder.
     */
    @Transactional
    public void startSession(String code, User currentUser) {
        FocusRoom room = findRoomOrThrow(code);

        if (!room.getHost().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the host can start the session");
        }
        if (room.getStatus() != FocusRoomStatus.LOBBY) {
            throw new BadRequestException("This session has already started");
        }

        room.setStatus(FocusRoomStatus.ACTIVE);
        room.setCurrentRound(1);
        room.setCurrentPhase(FocusPhase.WORK);
        room.setPhaseEndsAt(Instant.now().plusSeconds(room.getWorkMinutes() * 60L));
        room = focusRoomRepository.save(room);

        List<FocusRoomParticipant> participants = participantRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
        for (FocusRoomParticipant p : participants) {
            if (p.getStatus() == ParticipantStatus.JOINED) {
                p.setStatus(ParticipantStatus.FOCUSING);
            }
        }
        participantRepository.saveAll(participants);

        postSystemMessage(room, "Round 1 starting");
        buildSnapshotAndBroadcast(room);
        focusRoomSchedulerService.scheduleNextPhase(room);
    }

    @Transactional
    public void endSession(String code, User currentUser) {
        FocusRoom room = findRoomOrThrow(code);

        if (!room.getHost().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the host can end the session");
        }
        if (room.getStatus() != FocusRoomStatus.ACTIVE) {
            throw new BadRequestException("This session isn't active");
        }

        List<FocusRoomParticipant> participants = participantRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());

        // Credit whatever's elapsed in the current WORK block — a host ending
        // early shouldn't zero out real focus time just because the block
        // didn't run to completion the way advancePhase's full-block credit does.
        if (room.getCurrentPhase() == FocusPhase.WORK && room.getPhaseEndsAt() != null) {
            Instant phaseStartedAt = room.getPhaseEndsAt().minusSeconds(room.getWorkMinutes() * 60L);
            long elapsedMinutes = Math.min(room.getWorkMinutes(),
                    Math.max(0, Duration.between(phaseStartedAt, Instant.now()).toMinutes()));
            for (FocusRoomParticipant p : participants) {
                if (p.getStatus() == ParticipantStatus.FOCUSING) {
                    p.setMinutesFocused(p.getMinutesFocused() + (int) elapsedMinutes);
                }
            }
        }

        for (FocusRoomParticipant p : participants) {
            if (p.getStatus() == ParticipantStatus.FOCUSING || p.getStatus() == ParticipantStatus.ON_BREAK) {
                p.setStatus(ParticipantStatus.COMPLETED);
            }
        }
        participantRepository.saveAll(participants);

        // Explicit "End Session" deletes the room entirely below — no recap
        // row lingers the way a naturally-completed session's does — so each
        // participant's focused minutes get banked into a standalone ledger
        // first. Stats' weekly/daily charts read this instead of the (now
        // gone) room once it's deleted.
        Instant endedAt = Instant.now();
        for (FocusRoomParticipant p : participants) {
            if (p.getMinutesFocused() > 0) {
                focusTimeEntryRepository.save(FocusTimeEntry.builder()
                        .user(p.getUser())
                        .minutesFocused(p.getMinutesFocused())
                        .earnedAt(endedAt)
                        .build());
            }
        }

        // Set on the in-memory entity only (not saved) so the final broadcast
        // still shows a normal "session ended" snapshot for the recap screen
        // already-connected clients render — no FocusRoomCompletedEvent, since
        // there's no room left afterward for the async report job to find.
        room.setStatus(FocusRoomStatus.COMPLETED);
        room.setPhaseEndsAt(null);

        focusRoomSchedulerService.cancelScheduledTask(room.getId());
        postSystemMessage(room, "Host ended the session early");
        buildSnapshotAndBroadcast(room);

        // Delete everything the room owns, in FK-safe order, then the room
        // itself — an explicitly ended session leaves nothing behind, unlike
        // one that just runs its course and is kept for its recap.
        messageRepository.deleteByRoomId(room.getId());
        List<Note> roomNotes = noteRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
        roomNotes.forEach(note -> note.setRoom(null));
        noteRepository.saveAll(roomNotes);
        focusRoomReportRepository.findByRoomId(room.getId()).ifPresent(focusRoomReportRepository::delete);
        participantRepository.deleteAll(participants);
        focusRoomRepository.delete(room);
    }

    @Transactional
    public void leaveRoom(String code, User currentUser) {
        FocusRoom room = findRoomOrThrow(code);
        FocusRoomParticipant participant = participantRepository
                .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                .orElseThrow(() -> new BadRequestException("You are not in this room"));

        if (participant.getStatus() == ParticipantStatus.QUIT || participant.getStatus() == ParticipantStatus.COMPLETED) {
            return;
        }

        participant.setStatus(ParticipantStatus.QUIT);
        participant.setLeftAt(LocalDateTime.now());
        participantRepository.save(participant);

        String suffix = room.getStatus() == FocusRoomStatus.ACTIVE ? " (Round " + room.getCurrentRound() + ")" : "";
        postSystemMessage(room, displayName(currentUser) + " quit" + suffix);

        // Nobody left to keep the session going (or to ever start it) — without this,
        // a solo host leaving instead of clicking "End Session" left the room stuck
        // showing as "In progress" forever, never counted as a completed session.
        List<FocusRoomParticipant> allParticipants = participantRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
        boolean anyoneStillAround = allParticipants.stream().anyMatch(p ->
                p.getStatus() == ParticipantStatus.JOINED
                        || p.getStatus() == ParticipantStatus.FOCUSING
                        || p.getStatus() == ParticipantStatus.ON_BREAK);

        if (!anyoneStillAround && room.getStatus() != FocusRoomStatus.COMPLETED) {
            room.setStatus(FocusRoomStatus.COMPLETED);
            room.setPhaseEndsAt(null);
            focusRoomRepository.save(room);
            eventPublisher.publishEvent(new FocusRoomCompletedEvent(room.getId()));
            focusRoomSchedulerService.cancelScheduledTask(room.getId());
        }

        buildSnapshotAndBroadcast(room);
    }

    @Transactional
    public void toggleHand(String code, User currentUser) {
        FocusRoom room = findRoomOrThrow(code);
        FocusRoomParticipant participant = participantRepository
                .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                .orElseThrow(() -> new BadRequestException("You are not in this room"));

        if (participant.getStatus() == ParticipantStatus.QUIT
                || participant.getStatus() == ParticipantStatus.COMPLETED
                || participant.getStatus() == ParticipantStatus.INVITED
                || participant.getStatus() == ParticipantStatus.DECLINED) {
            throw new BadRequestException("You can't raise your hand right now");
        }

        participant.setHandRaised(!participant.isHandRaised());
        participantRepository.save(participant);

        if (participant.isHandRaised()) {
            postSystemMessage(room, displayName(currentUser) + " raised a hand");
        }
        buildSnapshotAndBroadcast(room);
    }

    @Transactional
    public void postChatMessage(String code, User currentUser, String body, boolean forceAi) {
        FocusRoom room = findRoomOrThrow(code);
        FocusRoomParticipant participant = participantRepository
                .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                .orElseThrow(() -> new BadRequestException("You are not in this room"));

        if (participant.getStatus() == ParticipantStatus.QUIT
                || participant.getStatus() == ParticipantStatus.INVITED
                || participant.getStatus() == ParticipantStatus.DECLINED) {
            throw new BadRequestException("You can't chat in this room");
        }

        boolean inFocusBlock = room.getStatus() == FocusRoomStatus.ACTIVE && room.getCurrentPhase() == FocusPhase.WORK;
        if (inFocusBlock) {
            if (room.getChatMode() == ChatMode.CLOSED_FOCUS) {
                throw new BadRequestException("Chat is locked during a focus block — reactions only");
            }
            if (room.getChatMode() == ChatMode.EMOJI_ONLY_FOCUS && !isEmojiOnly(body)) {
                throw new BadRequestException("Only emoji reactions are allowed during a focus block");
            }
        }

        FocusRoomMessage message = FocusRoomMessage.builder()
                .room(room)
                .sender(currentUser)
                .type(FocusMessageType.CHAT)
                .body(body)
                .build();
        messageRepository.save(message);
        buildSnapshotAndBroadcast(room);

        maybeTriggerAiReply(room, body, forceAi);
    }

    // Decides whether Collab should jump into the chat: either it's named directly
    // (no "@" required, just the word "collab" anywhere in the message), or — for
    // messages that don't name it — a cheap local pre-filter followed by a real LLM
    // classification call decides whether the message is a genuine question the group
    // needs answered. The pre-filter exists so the classifier (an extra API call) is
    // only ever spent on messages that already look question-shaped; ordinary chat
    // ("lol", "otw") never reaches it. A per-room in-flight guard stops a burst of
    // messages from firing overlapping classification/reply calls. forceAi skips all
    // of this — set by the widget's mic, a dedicated "ask Collab" surface where a
    // reply should never depend on wording or transcription luck.
    private void maybeTriggerAiReply(FocusRoom room, String body, boolean forceAi) {
        if (!llmApiClient.isConfigured()) {
            return;
        }
        if (aiReplyPending.putIfAbsent(room.getId(), Boolean.TRUE) != null) {
            return;
        }

        boolean directed = forceAi
                || mentionsCollab(body)
                || (looksLikeQuestion(body) && llmApiClient.classifyIsDirectedQuestion(body));

        if (!directed) {
            aiReplyPending.remove(room.getId());
            return;
        }

        postSystemMessage(room, "Collab is thinking…");
        buildSnapshotAndBroadcast(room);
        eventPublisher.publishEvent(new AiChatRequestedEvent(room.getId(), body));
    }

    // Called by FocusRoomAiChatService once a dispatched reply has landed (or failed),
    // so the next question-shaped message in this room can trigger Collab again.
    public void clearAiReplyPending(Long roomId) {
        aiReplyPending.remove(roomId);
    }

    // Whisper (voice transcription) reliably mishears "Collab" as "Colab" —
    // the single-L spelling is far more common in its training data (Google
    // Colab) — so both spellings count as naming the assistant, not just the
    // one the app is actually called.
    private static boolean mentionsCollab(String body) {
        String lower = body.toLowerCase();
        return lower.contains("collab") || lower.contains("colab");
    }

    private static boolean looksLikeQuestion(String body) {
        String trimmed = body.trim();
        if (trimmed.isEmpty()) {
            return false;
        }
        if (trimmed.contains("?")) {
            return true;
        }
        String firstWord = trimmed.split("\\s+", 2)[0].toLowerCase().replaceAll("[^a-z]", "");
        return AI_QUESTION_STARTERS.contains(firstWord);
    }

    // Re-fetches and re-broadcasts a room's current snapshot — used by
    // FocusRoomAiChatService once it's saved the AI's reply, since that
    // happens in a separate async transaction with its own FocusRoom instance.
    @Transactional
    public void broadcastSnapshot(String code) {
        FocusRoom room = findRoomOrThrow(code);
        buildSnapshotAndBroadcast(room);
    }

    @Transactional
    public void updateChatMode(String code, User currentUser, ChatMode mode) {
        FocusRoom room = findRoomOrThrow(code);

        if (!room.getHost().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the host can change room settings");
        }
        if (room.getStatus() == FocusRoomStatus.COMPLETED) {
            throw new BadRequestException("This session has already ended");
        }

        room.setChatMode(mode);
        focusRoomRepository.save(room);

        postSystemMessage(room, "Host set chat to \"" + describeChatMode(mode) + "\"");
        buildSnapshotAndBroadcast(room);
    }

    private static boolean isEmojiOnly(String text) {
        String stripped = text.replaceAll("\\s+", "");
        if (stripped.isEmpty()) {
            return false;
        }
        return stripped.codePoints().allMatch(FocusRoomService::isEmojiCodePoint);
    }

    // A pragmatic range check, not a fully spec-correct Unicode grapheme-cluster
    // validator — good enough to distinguish "typed a sentence" from "sent emoji".
    private static boolean isEmojiCodePoint(int cp) {
        return (cp >= 0x1F300 && cp <= 0x1FAFF)
                || (cp >= 0x2600 && cp <= 0x27BF)
                || (cp >= 0x2190 && cp <= 0x21FF)
                || (cp >= 0x2B00 && cp <= 0x2BFF)
                || (cp >= 0x1F1E6 && cp <= 0x1F1FF)
                || cp == 0xFE0F
                || cp == 0x200D;
    }

    private static String describeChatMode(ChatMode mode) {
        return switch (mode) {
            case OPEN -> "Open chat";
            case EMOJI_ONLY_FOCUS -> "Emoji-only during focus";
            case CLOSED_FOCUS -> "Closed during focus";
        };
    }

    private FocusRoom findRoomOrThrow(String code) {
        return focusRoomRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Focus room not found with code: " + code));
    }

    private FocusRoomResponse buildSnapshot(FocusRoom room) {
        List<FocusRoomParticipant> participants = participantRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
        List<FocusRoomMessage> messages = messageRepository.findTop50ByRoomIdOrderByCreatedAtDesc(room.getId());
        Collections.reverse(messages);
        return focusRoomMapper.toResponse(room, participants, messages);
    }

    private FocusRoomResponse buildSnapshotAndBroadcast(FocusRoom room) {
        FocusRoomResponse snapshot = buildSnapshot(room);
        messagingTemplate.convertAndSend("/topic/rooms/" + room.getCode(), snapshot);
        return snapshot;
    }

    private void postSystemMessage(FocusRoom room, String body) {
        FocusRoomMessage message = FocusRoomMessage.builder()
                .room(room)
                .sender(null)
                .type(FocusMessageType.SYSTEM)
                .body(body)
                .build();
        messageRepository.save(message);
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = randomCode();
        } while (focusRoomRepository.existsByCode(code));
        return code;
    }

    private String randomCode() {
        StringBuilder letters = new StringBuilder();
        for (int i = 0; i < 3; i++) {
            letters.append(CODE_LETTERS.charAt(RANDOM.nextInt(CODE_LETTERS.length())));
        }
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < 3; i++) {
            digits.append(CODE_DIGITS.charAt(RANDOM.nextInt(CODE_DIGITS.length())));
        }
        return letters + "-" + digits;
    }
}
