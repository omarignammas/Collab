package org.test.backendprojecty.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.GenerationStatus;
import org.test.backendprojecty.entity.SourceFileType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseSummaryResponse {
    private Long id;
    private String title;
    private Long courseId;
    private String courseTitle;
    private String sourceFileUrl;
    private SourceFileType sourceFileType;
    private String summaryMarkdown;
    private String diagramMermaid;
    private GenerationStatus status;
    @JsonProperty("isOwner")
    private boolean isOwner;
    private String ownerName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
