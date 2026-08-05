package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteToRoomRequest {

    @NotNull(message = "userId is required")
    private Long userId;
}
