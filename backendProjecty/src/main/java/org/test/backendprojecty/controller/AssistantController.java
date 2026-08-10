package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.test.backendprojecty.dtos.request.AssistantChatRequest;
import org.test.backendprojecty.dtos.response.AssistantChatResponse;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.service.LlmApiClient;
import org.test.backendprojecty.service.WorkspaceAssistantService;

import java.util.Map;

@RestController
@RequestMapping("${BaseUrl}/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final WorkspaceAssistantService workspaceAssistantService;
    private final LlmApiClient llmApiClient;

    @PostMapping("/chat")
    public ResponseEntity<AssistantChatResponse> chat(@Valid @RequestBody AssistantChatRequest request) {
        return ResponseEntity.ok(workspaceAssistantService.chat(request));
    }

    @PostMapping(value = "/speech", produces = "audio/wav")
    public ResponseEntity<byte[]> speech(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        if (text == null || text.isBlank()) {
            throw new BadRequestException("Text is required");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/wav"))
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=collab-reply.wav")
                .body(llmApiClient.synthesizeSpeech(text));
    }
}
