package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseProgressResponse {
    private Long courseId;
    private String courseTitle;
    private long totalTasks;
    private long completedTasks;
    private double progressPercentage;
}
