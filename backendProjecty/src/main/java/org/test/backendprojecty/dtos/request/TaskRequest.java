package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskType;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    private LocalDate dueDate;

    private Long courseId;

    private TaskType type;

    private TaskPriority priority;

    /** Optional — only honored when the current user owns the task's course and
     * the target is an ACTIVE member (or the owner) of it; otherwise ignored. */
    private Long assigneeUserId;
}
