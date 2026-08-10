package org.test.backendprojecty.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.exception.ExternalApiException;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around the Groq API — OpenAI-compatible chat completions,
 * single-shot calls, no conversation/multi-turn state. Mirrors
 * YoutubeApiClient's shape: constructor-injected RestTemplate + @Value config
 * with env-var defaults, an isConfigured() guard, HTTP failures wrapped as
 * ExternalApiException.
 */
@Service
@Slf4j
public class LlmApiClient {

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final String visionModel;

    public LlmApiClient(@Qualifier("llmRestTemplate") RestTemplate restTemplate,
                         @Value("${app.llm.api-key}") String apiKey,
                         @Value("${app.llm.base-url}") String baseUrl,
                         @Value("${app.llm.model}") String model,
                         @Value("${app.llm.vision-model}") String visionModel) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.visionModel = visionModel;
        log.info("AI generation: {} (key length: {}), model: {}, vision model: {}",
                (apiKey == null || apiKey.isBlank()) ? "DISABLED — no key resolved" : "enabled",
                apiKey == null ? 0 : apiKey.length(), model, visionModel);
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generateText(String prompt) {
        return generateText(prompt, null);
    }

    // Overload for callers whose expected output is long enough to risk hitting the
    // model's default output cap mid-response (e.g. a detailed multi-task plan) —
    // discovered when task-plan generation started coming back truncated (valid JSON
    // prefix, cut off mid-string) once descriptions/estimates/benchmarks were added.
    public String generateText(String prompt, Integer maxTokens) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
        if (maxTokens != null) {
            body.put("max_tokens", maxTokens);
        }
        return callGroq(body);
    }

    // Cheap classification call (short prompt, capped output, zero temperature) — used to
    // decide whether an un-named chat message still deserves an AI reply, without paying
    // for a full conversational completion just to find out.
    public boolean classifyIsDirectedQuestion(String message) {
        String prompt = """
                You are moderating a live group chat during a focused study/work session. \
                Decide whether the message below is a genuine question or request that the \
                group (or an AI assistant) should actually answer — not a rhetorical remark, \
                not idle small talk, not something clearly addressed to one specific person by name. \
                Reply with exactly one word: YES or NO.

                Message: "%s"
                """.formatted(message);
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "max_tokens", 4,
                "temperature", 0.0
        );
        String reply = callGroq(body);
        return reply != null && reply.trim().toUpperCase().startsWith("YES");
    }

    public String generateFromImage(String prompt, byte[] imageBytes, String mimeType) {
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        Map<String, Object> body = Map.of(
                "model", visionModel,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(
                                Map.of("type", "text", "text", prompt),
                                Map.of("type", "image_url", "image_url", Map.of("url", "data:" + mimeType + ";base64," + base64))
                        )
                ))
        );
        return callGroq(body);
    }

    // Speech-to-text via Groq's hosted Whisper — same account/API key as chat completions,
    // but a different endpoint (multipart file upload, not JSON) and response shape
    // ({"text": "..."} rather than the chat-completions choices[].message.content), so this
    // doesn't go through callGroq.
    public String transcribeAudio(MultipartFile file) {
        if (!isConfigured()) {
            throw new ExternalApiException(
                    "AI generation is not configured. Set the GROQ_API_KEY environment variable to enable it.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ExternalApiException("Could not read the uploaded audio file.", e);
        }

        ByteArrayResource fileResource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() != null ? file.getOriginalFilename() : "audio";
            }
        };

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", fileResource);
        form.add("model", "whisper-large-v3");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(apiKey);
        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(form, headers);

        String uri = baseUrl + "/audio/transcriptions";

        JsonNode response;
        try {
            response = restTemplate.postForObject(uri, entity, JsonNode.class);
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.warn("Groq transcription call failed: {} {}", e.getStatusCode(), e.getMessage());
            throw new ExternalApiException("Transcription failed (" + e.getStatusCode() + "). Please try again later.");
        } catch (ResourceAccessException e) {
            log.warn("Groq transcription network error: {}", e.getMessage());
            throw new ExternalApiException("Could not reach the transcription service. Please try again later.");
        }

        if (response == null) {
            throw new ExternalApiException("Empty response from the transcription service. Please try again later.");
        }

        JsonNode textNode = response.path("text");
        if (textNode.isMissingNode()) {
            throw new ExternalApiException("The transcription service returned an unexpected response.");
        }
        return textNode.asText().trim();
    }

    // Groq's Orpheus endpoint returns expressive WAV audio. Keeping this in the
    // same client means transcription, reasoning, and speech share one API key
    // and the same production timeout/error handling.
    public byte[] synthesizeSpeech(String text) {
        if (!isConfigured()) {
            throw new ExternalApiException(
                    "AI generation is not configured. Set the GROQ_API_KEY environment variable to enable it.");
        }

        String spoken = text
                .replaceAll("\\[S\\d+]", "")
                .replaceAll("[*_#`]", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (spoken.length() > 180) {
            spoken = spoken.substring(0, 179).trim() + "…";
        }

        Map<String, Object> body = Map.of(
                "model", "canopylabs/orpheus-v1-english",
                "voice", "hannah",
                "input", "[warm] " + spoken,
                "response_format", "wav"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.postForEntity(
                    baseUrl + "/audio/speech", entity, byte[].class);
            byte[] audio = response.getBody();
            if (audio == null || audio.length == 0) {
                throw new ExternalApiException("The speech service returned an empty response.");
            }
            return audio;
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.warn("Groq speech call failed: {} {}", e.getStatusCode(), e.getMessage());
            throw new ExternalApiException("Speech generation failed (" + e.getStatusCode() + "). Please try again later.");
        } catch (ResourceAccessException e) {
            log.warn("Groq speech network error: {}", e.getMessage());
            throw new ExternalApiException("Could not reach the speech service. Please try again later.");
        }
    }

    private String callGroq(Map<String, Object> body) {
        if (!isConfigured()) {
            throw new ExternalApiException(
                    "AI generation is not configured. Set the GROQ_API_KEY environment variable to enable it.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        String uri = baseUrl + "/chat/completions";

        JsonNode response;
        try {
            response = restTemplate.postForObject(uri, entity, JsonNode.class);
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.warn("Groq API call failed: {} {}", e.getStatusCode(), e.getMessage());
            throw new ExternalApiException("AI request failed (" + e.getStatusCode() + "). Please try again later.");
        } catch (ResourceAccessException e) {
            log.warn("Groq API network error: {}", e.getMessage());
            throw new ExternalApiException("Could not reach the AI service. Please try again later.");
        }

        if (response == null) {
            throw new ExternalApiException("Empty response from the AI service. Please try again later.");
        }

        JsonNode textNode = response.path("choices").path(0).path("message").path("content");
        if (textNode.isMissingNode() || textNode.asText().isBlank()) {
            throw new ExternalApiException("The AI service returned an empty response. Please try again later.");
        }
        return textNode.asText();
    }
}
