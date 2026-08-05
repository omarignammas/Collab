package org.test.backendprojecty.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.MemberStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseMemberResponse {
    private Long userId;
    private String displayName;
    private String email;
    private String avatarUrl;
    private MemberStatus status;
    @JsonProperty("isOwner")
    private boolean isOwner;
    private LocalDateTime joinedAt;
}
