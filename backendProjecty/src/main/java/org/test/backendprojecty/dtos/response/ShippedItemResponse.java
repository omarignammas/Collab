package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippedItemResponse {
    private String title;
    private String projectTitle;
    private String projectColorTag;
    private LocalDateTime completedAt;
}
