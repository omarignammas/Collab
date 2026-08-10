package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.CircleMemberStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircleResponse {
    private Long id;
    private String name;
    private Long ownerId;
    private String ownerName;
    private CircleMemberStatus membershipStatus;
    private int collectiveMomentum;
    private int activeMemberCount;
    private int pendingMemberCount;
    private int completedTasksThisWeek;
    private int focusMinutesThisWeek;
    private int activeDaysThisWeek;
    private int quizAttemptsThisWeek;
    private List<CircleMemberResponse> members;
    private LocalDateTime createdAt;
}
