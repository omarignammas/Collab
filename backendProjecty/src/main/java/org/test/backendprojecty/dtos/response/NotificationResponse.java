package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.NotificationType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String title;
    private String body;
    private String link;
    private String actionResourceId;
    private boolean actionable;
    private boolean read;
    private LocalDateTime createdAt;
}
