package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YoutubeImportResponse {
    private CourseResponse course;
    private int tasksImported;
    private int tasksSkipped;
}
