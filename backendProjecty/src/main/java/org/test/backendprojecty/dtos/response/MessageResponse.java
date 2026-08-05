package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.FocusMessageType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private Long id;
    private String senderName;
    private String senderEmail;
    private String senderAvatarUrl;
    private FocusMessageType type;
    private String body;
    private LocalDateTime createdAt;
}
