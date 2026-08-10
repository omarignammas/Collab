package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResearchReportRequest {

    @NotBlank(message = "Research topic is required")
    @Size(max = 1200, message = "Research topic must not exceed 1200 characters")
    private String topic;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private Long courseId;
}
