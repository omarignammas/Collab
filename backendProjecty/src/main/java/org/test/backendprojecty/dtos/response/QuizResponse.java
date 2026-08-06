package org.test.backendprojecty.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.GenerationStatus;
import org.test.backendprojecty.entity.QuizDifficulty;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizResponse {
    private Long id;
    private Long summaryId;
    private String summaryTitle;
    private String title;
    private QuizDifficulty difficulty;
    private GenerationStatus status;
    @JsonProperty("isOwner")
    private boolean isOwner;
    private String ownerName;
    private List<QuizQuestionResponse> questions;
    private String focusPrompt;
    private List<String> referenceFileNames;
    private LocalDateTime createdAt;
}
