package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.test.backendprojecty.entity.CircleNoteType;

@Data
public class CircleNoteRequest {

    @NotNull(message = "Note type is required")
    private CircleNoteType type;

    @NotBlank(message = "Note body is required")
    @Size(max = 4000, message = "Note must be 4000 characters or fewer")
    private String body;
}
