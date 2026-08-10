package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import org.test.backendprojecty.entity.GenerationStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String title;
    private String body;
    private String rawBody;
    private List<String> tags;
    private String savedUrl;
    private String theme;
    private List<String> extractedLinks;
    private List<String> timeReferences;
    private GenerationStatus enrichmentStatus;
    private boolean aiEnriched;
    private Long courseId;
    private String courseTitle;
    private Long taskId;
    private String taskTitle;
    private String roomCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
