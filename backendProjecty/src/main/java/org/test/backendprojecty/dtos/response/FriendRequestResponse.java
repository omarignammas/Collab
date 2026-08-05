package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.FriendRequestStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestResponse {
    private Long id;
    private Long requesterId;
    private String requesterName;
    private String requesterEmail;
    private Long recipientId;
    private String recipientName;
    private String recipientEmail;
    private FriendRequestStatus status;
    private LocalDateTime createdAt;
}
