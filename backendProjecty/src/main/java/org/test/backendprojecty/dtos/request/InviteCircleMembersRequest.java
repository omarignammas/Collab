package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class InviteCircleMembersRequest {

    @NotEmpty(message = "Select at least one friend")
    @Size(max = 7, message = "A Circle can have up to 8 people including you")
    private List<Long> userIds;
}
