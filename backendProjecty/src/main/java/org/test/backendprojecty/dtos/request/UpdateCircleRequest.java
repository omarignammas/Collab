package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateCircleRequest {

    @NotBlank(message = "Circle name is required")
    @Size(max = 60, message = "Circle name must be 60 characters or fewer")
    private String name;
}
