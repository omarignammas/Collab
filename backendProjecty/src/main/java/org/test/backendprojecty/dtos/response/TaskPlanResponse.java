package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.GenerationStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskPlanResponse {
    private Long id;
    private Long courseId;
    private GenerationStatus status;
    private boolean applied;
    private List<ProposedTaskResponse> proposedTasks;
    private LocalDateTime createdAt;
}
