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
public class NoteResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String title;
    private String body;
    private List<String> tags;
    private String savedUrl;
    private Long courseId;
    private String courseTitle;
    private Long taskId;
    private String taskTitle;
    private String roomCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
