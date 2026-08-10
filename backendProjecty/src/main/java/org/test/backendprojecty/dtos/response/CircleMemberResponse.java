package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.CircleMemberStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircleMemberResponse {
    private Long userId;
    private String displayName;
    private String avatarUrl;
    private CircleMemberStatus status;
    private boolean owner;
    private MomentumResponse momentum;
}
