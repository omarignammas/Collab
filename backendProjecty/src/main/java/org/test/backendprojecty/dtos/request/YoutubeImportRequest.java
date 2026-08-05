package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YoutubeImportRequest {

    @NotBlank(message = "Playlist URL or ID is required")
    private String playlistUrl;

    @NotNull(message = "Term is required")
    private Long termId;
}
