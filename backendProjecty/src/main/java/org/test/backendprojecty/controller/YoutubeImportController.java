package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.YoutubeImportRequest;
import org.test.backendprojecty.dtos.response.YoutubeImportResponse;
import org.test.backendprojecty.dtos.response.YoutubeResyncResponse;
import org.test.backendprojecty.service.YoutubeImportService;

@RestController
@RequestMapping("${BaseUrl}/courses")
@RequiredArgsConstructor
public class YoutubeImportController {

    private final YoutubeImportService youtubeImportService;

    @PostMapping("/import/youtube")
    public ResponseEntity<YoutubeImportResponse> importPlaylist(@Valid @RequestBody YoutubeImportRequest request) {
        YoutubeImportResponse response = youtubeImportService.importPlaylist(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{courseId}/resync-youtube")
    public ResponseEntity<YoutubeResyncResponse> resync(@PathVariable Long courseId) {
        YoutubeResyncResponse response = youtubeImportService.resync(courseId);
        return ResponseEntity.ok(response);
    }
}
