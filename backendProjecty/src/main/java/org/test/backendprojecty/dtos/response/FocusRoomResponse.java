package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.ChatMode;
import org.test.backendprojecty.entity.FocusPhase;
import org.test.backendprojecty.entity.FocusRoomStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FocusRoomResponse {
    private Long id;
    private String code;
    private String name;
    private Long hostId;
    private String hostName;
    private Long courseId;
    private String courseTitle;
    private int workMinutes;
    private int breakMinutes;
    private int totalRounds;
    private int longBreakMinutes;
    private FocusRoomStatus status;
    private int currentRound;
    private FocusPhase currentPhase;
    private Instant phaseEndsAt;
    private boolean locked;
    private ChatMode chatMode;
    private Instant scheduledFor;
    private boolean aiReportEnabled;
    private List<ParticipantResponse> participants;
    private List<MessageResponse> recentMessages;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
