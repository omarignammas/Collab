package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageRequest {

    @NotBlank(message = "Message body is required")
    @Size(max = 2000, message = "Message must not exceed 2000 characters")
    private String body;

    // Set by the menu-bar widget's mic — that surface is a dedicated "ask
    // Collab" input with no group chat around it, so a message sent from it
    // should always get a reply rather than going through the name-mention /
    // question-heuristic used for the shared room chat.
    private boolean forceAi;
}
