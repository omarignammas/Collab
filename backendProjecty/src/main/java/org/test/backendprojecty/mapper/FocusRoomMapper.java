package org.test.backendprojecty.mapper;

import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.FocusRoomResponse;
import org.test.backendprojecty.dtos.response.MessageResponse;
import org.test.backendprojecty.dtos.response.ParticipantResponse;
import org.test.backendprojecty.entity.FocusRoom;
import org.test.backendprojecty.entity.FocusRoomMessage;
import org.test.backendprojecty.entity.FocusRoomParticipant;
import org.test.backendprojecty.entity.User;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class FocusRoomMapper {

    public FocusRoomResponse toResponse(FocusRoom room, List<FocusRoomParticipant> participants, List<FocusRoomMessage> messages) {
        return FocusRoomResponse.builder()
                .id(room.getId())
                .code(room.getCode())
                .name(room.getName())
                .hostId(room.getHost().getId())
                .hostName(displayName(room.getHost()))
                .courseId(room.getCourse() != null ? room.getCourse().getId() : null)
                .courseTitle(room.getCourse() != null ? room.getCourse().getTitle() : null)
                .workMinutes(room.getWorkMinutes())
                .breakMinutes(room.getBreakMinutes())
                .totalRounds(room.getTotalRounds())
                .longBreakMinutes(room.getLongBreakMinutes())
                .status(room.getStatus())
                .currentRound(room.getCurrentRound())
                .currentPhase(room.getCurrentPhase())
                .phaseEndsAt(room.getPhaseEndsAt())
                .locked(room.isLocked())
                .chatMode(room.getChatMode())
                .scheduledFor(room.getScheduledFor())
                .aiReportEnabled(room.isAiReportEnabled())
                .participants(participants.stream()
                        .map(p -> toParticipantResponse(p, room))
                        .collect(Collectors.toList()))
                .recentMessages(messages.stream()
                        .map(this::toMessageResponse)
                        .collect(Collectors.toList()))
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }

    public ParticipantResponse toParticipantResponse(FocusRoomParticipant participant, FocusRoom room) {
        return ParticipantResponse.builder()
                .userId(participant.getUser().getId())
                .displayName(displayName(participant.getUser()))
                .email(participant.getUser().getEmail())
                .avatarUrl(participant.getUser().getAvatarUrl())
                .status(participant.getStatus())
                .handRaised(participant.isHandRaised())
                .minutesFocused(participant.getMinutesFocused())
                .focusSignal(participant.getFocusSignal())
                .isHost(room.getHost().getId().equals(participant.getUser().getId()))
                .joinedAt(participant.getJoinedAt())
                .leftAt(participant.getLeftAt())
                .build();
    }

    public MessageResponse toMessageResponse(FocusRoomMessage message) {
        return MessageResponse.builder()
                .id(message.getId())
                .senderName(message.getSender() != null ? displayName(message.getSender()) : null)
                .senderEmail(message.getSender() != null ? message.getSender().getEmail() : null)
                .senderAvatarUrl(message.getSender() != null ? message.getSender().getAvatarUrl() : null)
                .type(message.getType())
                .body(message.getBody())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
