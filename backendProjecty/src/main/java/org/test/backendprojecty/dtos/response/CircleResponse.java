package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.CircleMemberStatus;

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
    private int completedTasksThisWeek;
    private int focusMinutesThisWeek;
    private List<CircleMemberResponse> members;
}
