package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.GenerationStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FocusRoomReportResponse {
    private GenerationStatus status;
    private String content;
}
