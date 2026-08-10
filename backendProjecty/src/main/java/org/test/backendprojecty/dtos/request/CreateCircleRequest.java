package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateCircleRequest {

    @NotBlank(message = "Circle name is required")
    @Size(max = 60, message = "Circle name must be 60 characters or fewer")
    private String name;

    @Size(max = 7, message = "A Circle can have up to 8 people including you")
    private List<Long> inviteUserIds;
}
