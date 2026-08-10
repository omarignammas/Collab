package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantMessageRequest {
    @NotBlank
    @Pattern(regexp = "(?i)user|assistant", message = "Role must be user or assistant")
    private String role;

    @NotBlank
    @Size(max = 4000, message = "History message must not exceed 4000 characters")
    private String content;
}
