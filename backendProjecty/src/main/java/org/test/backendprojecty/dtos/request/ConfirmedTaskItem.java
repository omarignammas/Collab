package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskType;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmedTaskItem {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private LocalDate dueDate;
    private TaskPriority priority;
    private TaskType type;
}
