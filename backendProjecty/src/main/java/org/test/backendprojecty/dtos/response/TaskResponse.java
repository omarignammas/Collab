package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskType;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDate dueDate;
    private boolean completed;
    private LocalDateTime completedAt;
    private Long courseId;
    private String courseTitle;
    private TaskType type;
    private TaskPriority priority;
    private String youtubeVideoId;
    private Integer position;
    private Integer durationMinutes;
    private Long assigneeId;
    private String assigneeName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
