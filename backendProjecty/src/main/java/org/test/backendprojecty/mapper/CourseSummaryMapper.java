package org.test.backendprojecty.mapper;

import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.CourseSummaryResponse;
import org.test.backendprojecty.entity.CourseSummary;

@Component
public class CourseSummaryMapper {

    public CourseSummaryResponse toResponse(CourseSummary summary, Long viewerId) {
        return CourseSummaryResponse.builder()
                .id(summary.getId())
                .title(summary.getTitle())
                .courseId(summary.getCourse() != null ? summary.getCourse().getId() : null)
                .courseTitle(summary.getCourse() != null ? summary.getCourse().getTitle() : null)
                .sourceFileUrl(summary.getSourceFileUrl())
                .sourceFileType(summary.getSourceFileType())
                .summaryMarkdown(summary.getSummaryMarkdown())
                .diagramJson(summary.getDiagramJson())
                .researchReport(Boolean.TRUE.equals(summary.getResearchReport()))
                .status(summary.getStatus())
                .isOwner(summary.getUser().getId().equals(viewerId))
                .ownerName(summary.getUser().getFirstName() + " " + summary.getUser().getLastName())
                .createdAt(summary.getCreatedAt())
                .updatedAt(summary.getUpdatedAt())
                .build();
    }
}
