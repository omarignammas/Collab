package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.test.backendprojecty.entity.ChatMode;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatModeRequest {

    @NotNull(message = "Chat mode is required")
    private ChatMode mode;
}
