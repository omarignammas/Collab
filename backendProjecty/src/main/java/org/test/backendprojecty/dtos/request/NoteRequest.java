package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String body;

    private List<String> tags;

    private String savedUrl;

    private Long courseId;

    private Long taskId;

    private String roomCode;
}
