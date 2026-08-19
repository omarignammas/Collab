package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMissionRequest {

    @Size(max = 280, message = "Mission must be 280 characters or fewer")
    private String mission;

    private boolean openToChat;
}
