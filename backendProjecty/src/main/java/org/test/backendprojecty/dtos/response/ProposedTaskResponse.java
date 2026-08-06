package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskType;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposedTaskResponse {
    private String title;
    private String description;
    private Integer estimatedMinutes;
    private String benchmark;
    private LocalDate dueDate;
    private TaskPriority priority;
    private TaskType type;
}
