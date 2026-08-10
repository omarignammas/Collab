package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MomentumResponse {
    private int score;
    private int taskPoints;
    private int focusPoints;
    private int quizPoints;
    private int consistencyPoints;
    private int completedTasks;
    private int focusMinutes;
    private int quizAttempts;
    private int activeDays;
}
