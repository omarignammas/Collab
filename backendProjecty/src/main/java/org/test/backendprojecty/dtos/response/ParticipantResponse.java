package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.ParticipantStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantResponse {
    private Long userId;
    private String displayName;
    private String email;
    private String avatarUrl;
    private ParticipantStatus status;
    private boolean handRaised;
    private int minutesFocused;
    private boolean isHost;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
}
