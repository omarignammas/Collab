package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteMemberRequest {

    @NotNull(message = "User is required")
    private Long userId;
}
