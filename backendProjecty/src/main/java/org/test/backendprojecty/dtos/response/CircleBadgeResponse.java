package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircleBadgeResponse {
    private String key;
    private String name;
    private String description;
    private boolean earned;
    private int progress;
    private int goal;
}
