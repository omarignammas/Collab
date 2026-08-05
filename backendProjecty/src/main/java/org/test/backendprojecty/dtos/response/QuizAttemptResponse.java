package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttemptResponse {
    private Long id;
    private Integer score;
    private Integer totalQuestions;
    private Double percentage;
    private LocalDateTime completedAt;
    private List<QuizQuestionResultResponse> results;
}
