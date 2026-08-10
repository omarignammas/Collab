package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FocusSignalRequest {

    @Size(max = 48, message = "Focus signal must not exceed 48 characters")
    private String signal;
}
