package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircleRecognitionResponse {
    private String key;
    private String title;
    private Long memberId;
    private String memberName;
    private String avatarUrl;
    private String reason;
    private boolean unlocked;
}
