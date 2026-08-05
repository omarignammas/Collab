package org.test.backendprojecty.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.dtos.response.TranscriptionResponse;
import org.test.backendprojecty.service.LlmApiClient;

// Room-agnostic on purpose — Focus Room chat is the first caller, but Session
// Notes and task-title voice input can reuse this same endpoint later.
@RestController
@RequestMapping("${BaseUrl}/voice")
@RequiredArgsConstructor
public class VoiceController {

    private final LlmApiClient llmApiClient;

    @PostMapping(value = "/transcribe", consumes = "multipart/form-data")
    public ResponseEntity<TranscriptionResponse> transcribe(@RequestParam("file") MultipartFile file) {
        String text = llmApiClient.transcribeAudio(file);
        return ResponseEntity.ok(TranscriptionResponse.builder().text(text).build());
    }
}
