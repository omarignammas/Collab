package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// Never includes the correct answer — used while a quiz is being taken.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionResponse {
    private Long id;
    private String questionText;
    private List<String> options;
    private Integer position;
}
