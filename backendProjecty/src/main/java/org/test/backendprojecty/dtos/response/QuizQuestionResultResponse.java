package org.test.backendprojecty.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// Post-submit review — correct answers ARE revealed here, unlike
// QuizQuestionResponse (used while a quiz is still being taken).
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionResultResponse {
    private Long questionId;
    private String questionText;
    private List<String> options;
    private Integer correctIndex;
    private Integer chosenIndex;
    @JsonProperty("isCorrect")
    private boolean isCorrect;
}
