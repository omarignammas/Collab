package org.test.backendprojecty.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.test.backendprojecty.exception.ExternalApiException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LlmApiClientTest {

    private static final String BASE_URL = "https://api.groq.com/openai/v1";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Mock
    private RestTemplate restTemplate;

    private LlmApiClient client;

    @BeforeEach
    void setUp() {
        client = new LlmApiClient(restTemplate, "test-api-key", BASE_URL, "openai/gpt-oss-120b", "qwen/qwen3.6-27b");
    }

    private JsonNode json(String text) {
        try {
            return MAPPER.readTree(text);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void generateText_ReturnsText_WhenSuccessful() {
        when(restTemplate.postForObject(eq(BASE_URL + "/chat/completions"), any(HttpEntity.class), eq(JsonNode.class))).thenReturn(json("""
                { "choices": [ { "message": { "content": "Great session recap!" } } ] }
                """));

        String result = client.generateText("summarize this");

        assertEquals("Great session recap!", result);
    }

    @Test
    void generateText_ThrowsExternalApiException_WhenApiKeyBlank() {
        LlmApiClient unconfigured = new LlmApiClient(restTemplate, "", BASE_URL, "openai/gpt-oss-120b", "qwen/qwen3.6-27b");

        assertThrows(ExternalApiException.class, () -> unconfigured.generateText("summarize this"));
        verifyNoInteractions(restTemplate);
    }

    @Test
    void generateText_ThrowsExternalApiException_OnHttpClientError() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(JsonNode.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.FORBIDDEN, "Forbidden", null, null, null));

        assertThrows(ExternalApiException.class, () -> client.generateText("summarize this"));
    }

    @Test
    void generateText_ThrowsExternalApiException_OnNetworkError() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(JsonNode.class)))
                .thenThrow(new ResourceAccessException("timeout"));

        assertThrows(ExternalApiException.class, () -> client.generateText("summarize this"));
    }

    @Test
    void generateText_ThrowsExternalApiException_WhenResponseHasNoChoices() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(JsonNode.class)))
                .thenReturn(json("{ \"choices\": [] }"));

        assertThrows(ExternalApiException.class, () -> client.generateText("summarize this"));
    }

    @Test
    void generateFromImage_ReturnsText_WhenSuccessful() {
        when(restTemplate.postForObject(anyString(), any(HttpEntity.class), eq(JsonNode.class))).thenReturn(json("""
                { "choices": [ { "message": { "content": "A diagram of the water cycle." } } ] }
                """));

        String result = client.generateFromImage("describe this image", new byte[]{1, 2, 3}, "image/png");

        assertEquals("A diagram of the water cycle.", result);
    }

    @Test
    void generateFromImage_ThrowsExternalApiException_WhenApiKeyBlank() {
        LlmApiClient unconfigured = new LlmApiClient(restTemplate, "", BASE_URL, "openai/gpt-oss-120b", "qwen/qwen3.6-27b");

        assertThrows(ExternalApiException.class,
                () -> unconfigured.generateFromImage("describe this image", new byte[]{1, 2, 3}, "image/png"));
        verifyNoInteractions(restTemplate);
    }
}
