package org.test.backendprojecty.service;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.event.FocusRoomCompletedEvent;
import org.test.backendprojecty.mapper.FocusRoomMapper;
import org.test.backendprojecty.repository.FocusRoomMessageRepository;
import org.test.backendprojecty.repository.FocusRoomParticipantRepository;
import org.test.backendprojecty.repository.FocusRoomRepository;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Owns the server-authoritative Pomodoro clock: one scheduled one-shot task per
 * room, fired at the room's current phaseEndsAt, that advances round/phase and
 * reschedules itself. Runs on the shared "focusRoomTaskScheduler" bean outside
 * any HTTP/STOMP request thread, so it uses a TransactionTemplate rather than
 * @Transactional — a scheduled Runnable calling a method on "this" would bypass
 * the declarative-transaction proxy (the classic Spring self-invocation gap).
 */
@Service
public class FocusRoomSchedulerService {

    private final FocusRoomRepository focusRoomRepository;
    private final FocusRoomParticipantRepository participantRepository;
    private final FocusRoomMessageRepository messageRepository;
    private final FocusRoomMapper focusRoomMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final TaskScheduler taskScheduler;
    private final TransactionTemplate transactionTemplate;
    private final ApplicationEventPublisher eventPublisher;

    private final Map<Long, ScheduledFuture<?>> scheduledPhaseTasks = new ConcurrentHashMap<>();

    public FocusRoomSchedulerService(FocusRoomRepository focusRoomRepository,
                                      FocusRoomParticipantRepository participantRepository,
                                      FocusRoomMessageRepository messageRepository,
                                      FocusRoomMapper focusRoomMapper,
                                      SimpMessagingTemplate messagingTemplate,
                                      TaskScheduler focusRoomTaskScheduler,
                                      PlatformTransactionManager transactionManager,
                                      ApplicationEventPublisher eventPublisher) {
        this.focusRoomRepository = focusRoomRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.focusRoomMapper = focusRoomMapper;
        this.messagingTemplate = messagingTemplate;
        this.taskScheduler = focusRoomTaskScheduler;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.eventPublisher = eventPublisher;
    }

    public void scheduleNextPhase(FocusRoom room) {
        cancelScheduledTask(room.getId());
        if (room.isPaused() || room.getPhaseEndsAt() == null) {
            return;
        }
        Long roomId = room.getId();
        ScheduledFuture<?> future = taskScheduler.schedule(() -> advancePhase(roomId), room.getPhaseEndsAt());
        scheduledPhaseTasks.put(roomId, future);
    }

    public void cancelScheduledTask(Long roomId) {
        ScheduledFuture<?> existing = scheduledPhaseTasks.remove(roomId);
        if (existing != null) {
            existing.cancel(false);
        }
    }

    private void advancePhase(Long roomId) {
        transactionTemplate.executeWithoutResult(status -> {
            FocusRoom room = focusRoomRepository.findById(roomId).orElse(null);
            if (room == null || room.getStatus() != FocusRoomStatus.ACTIVE || room.isPaused()) {
                return;
            }

            List<FocusRoomParticipant> participants = participantRepository.findByRoomIdOrderByCreatedAtAsc(roomId);

            if (room.getCurrentPhase() == FocusPhase.WORK) {
                advanceFromWork(room, participants);
            } else {
                advanceFromBreak(room, participants);
            }
        });
    }

    private void advanceFromWork(FocusRoom room, List<FocusRoomParticipant> participants) {
        for (FocusRoomParticipant p : participants) {
            if (p.getStatus() == ParticipantStatus.FOCUSING) {
                p.setMinutesFocused(p.getMinutesFocused() + room.getWorkMinutes());
            }
        }

        if (room.getCurrentRound() >= room.getTotalRounds()) {
            room.setStatus(FocusRoomStatus.COMPLETED);
            room.setPhaseEndsAt(null);
            room.setPaused(false);
            room.setPausedRemainingSeconds(null);
            for (FocusRoomParticipant p : participants) {
                if (p.getStatus() == ParticipantStatus.FOCUSING || p.getStatus() == ParticipantStatus.ON_BREAK) {
                    p.setStatus(ParticipantStatus.COMPLETED);
                }
            }
            participantRepository.saveAll(participants);
            focusRoomRepository.save(room);
            eventPublisher.publishEvent(new FocusRoomCompletedEvent(room.getId()));
            postSystemMessage(room, "Session Complete");
            broadcastRoomState(room);
            scheduledPhaseTasks.remove(room.getId());
            return;
        }

        FocusPhase nextPhase = (room.getCurrentRound() % 4 == 0) ? FocusPhase.LONG_BREAK : FocusPhase.BREAK;
        int breakLength = nextPhase == FocusPhase.LONG_BREAK ? room.getLongBreakMinutes() : room.getBreakMinutes();
        room.setCurrentPhase(nextPhase);
        room.setPhaseEndsAt(Instant.now().plusSeconds(breakLength * 60L));
        for (FocusRoomParticipant p : participants) {
            if (p.getStatus() == ParticipantStatus.FOCUSING) {
                p.setStatus(ParticipantStatus.ON_BREAK);
            }
        }
        participantRepository.saveAll(participants);
        focusRoomRepository.save(room);
        postSystemMessage(room, (nextPhase == FocusPhase.LONG_BREAK ? "Long break" : "Break") + " starting");
        broadcastRoomState(room);
        scheduleNextPhase(room);
    }

    private void advanceFromBreak(FocusRoom room, List<FocusRoomParticipant> participants) {
        int nextRound = room.getCurrentRound() + 1;
        room.setCurrentRound(nextRound);
        room.setCurrentPhase(FocusPhase.WORK);
        room.setPhaseEndsAt(Instant.now().plusSeconds(room.getWorkMinutes() * 60L));
        for (FocusRoomParticipant p : participants) {
            if (p.getStatus() == ParticipantStatus.ON_BREAK) {
                p.setStatus(ParticipantStatus.FOCUSING);
            }
        }
        participantRepository.saveAll(participants);
        focusRoomRepository.save(room);
        postSystemMessage(room, "Round " + nextRound + " starting");
        broadcastRoomState(room);
        scheduleNextPhase(room);
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

    private void broadcastRoomState(FocusRoom room) {
        List<FocusRoomParticipant> participants = participantRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
        List<FocusRoomMessage> messages = messageRepository.findTop50ByRoomIdOrderByCreatedAtDesc(room.getId());
        Collections.reverse(messages);
        messagingTemplate.convertAndSend("/topic/rooms/" + room.getCode(),
                focusRoomMapper.toResponse(room, participants, messages));
    }
}
