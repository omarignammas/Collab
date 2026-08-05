package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptRequest {

    @NotEmpty(message = "Answers are required")
    private List<Integer> answers;
}
