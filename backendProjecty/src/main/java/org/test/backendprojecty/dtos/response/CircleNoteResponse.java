package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.CircleNoteType;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircleNoteResponse {
    private Long id;
    private Long authorId;
    private String authorName;
    private String authorAvatarUrl;
    private CircleNoteType type;
    private String body;
    private LocalDate noteDate;
    private LocalDateTime createdAt;
    private boolean mine;
}
