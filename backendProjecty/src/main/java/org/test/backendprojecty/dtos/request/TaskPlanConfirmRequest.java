package org.test.backendprojecty.dtos.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskPlanConfirmRequest {

    @NotEmpty(message = "Select at least one task to create")
    private List<@Valid ConfirmedTaskItem> tasks;
}
