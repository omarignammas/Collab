package org.test.backendprojecty.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.test.backendprojecty.exception.ExternalApiException;
import org.test.backendprojecty.exception.PlaylistNotFoundException;

import java.net.URI;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class YoutubeApiClientTest {

    private static final String BASE_URL = "https://www.googleapis.com/youtube/v3";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Mock
    private RestTemplate restTemplate;

    private YoutubeApiClient client;

    @BeforeEach
    void setUp() {
        client = new YoutubeApiClient(restTemplate, "test-api-key", BASE_URL);
    }

    private JsonNode json(String text) {
        try {
            return MAPPER.readTree(text);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String playlistItem(String videoId, String title, int position) {
        return """
                { "snippet": { "title": "%s", "position": %d },
                  "contentDetails": { "videoId": "%s" } }
                """.formatted(title, position, videoId);
    }

    @Test
    void fetchPlaylistMetadata_ReturnsMetadata_WhenPlaylistExists() {
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class))).thenReturn(json("""
                { "items": [ { "snippet": {
                    "title": "Linear Algebra",
                    "description": "MIT course",
                    "thumbnails": { "high": { "url": "https://img/hi.jpg" } }
                } } ] }
                """));

        YoutubeApiClient.PlaylistMetadata metadata = client.fetchPlaylistMetadata("PLxxxx");

        assertEquals("PLxxxx", metadata.playlistId());
        assertEquals("Linear Algebra", metadata.title());
        assertEquals("MIT course", metadata.description());
        assertEquals("https://img/hi.jpg", metadata.thumbnailUrl());
    }

    @Test
    void fetchPlaylistMetadata_ThrowsPlaylistNotFound_WhenItemsEmpty() {
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class))).thenReturn(json("{ \"items\": [] }"));

        assertThrows(PlaylistNotFoundException.class, () -> client.fetchPlaylistMetadata("PLxxxx"));
    }

    @Test
    void fetchPlaylistMetadata_ThrowsExternalApiException_WhenApiKeyBlank() {
        YoutubeApiClient unconfigured = new YoutubeApiClient(restTemplate, "", BASE_URL);

        assertThrows(ExternalApiException.class, () -> unconfigured.fetchPlaylistMetadata("PLxxxx"));
        verifyNoInteractions(restTemplate);
    }

    @Test
    void fetchPlaylistItems_FiltersDeletedAndPrivateVideos() {
        String page = "{ \"items\": [ %s, %s, %s ] }".formatted(
                playlistItem("v1", "Intro", 0),
                playlistItem("v2", "Deleted video", 1),
                playlistItem("v3", "Private video", 2));
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class))).thenReturn(json(page));

        YoutubeApiClient.PlaylistItemsResult result = client.fetchPlaylistItems("PLxxxx");

        assertEquals(1, result.items().size());
        assertEquals("v1", result.items().get(0).videoId());
        assertEquals(2, result.skippedCount());
    }

    @Test
    void fetchPlaylistItems_PaginatesUntilNoNextPageToken() {
        String page1 = "{ \"items\": [ %s ], \"nextPageToken\": \"TOKEN2\" }".formatted(playlistItem("v1", "One", 0));
        String page2 = "{ \"items\": [ %s ] }".formatted(playlistItem("v2", "Two", 1));
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class)))
                .thenReturn(json(page1))
                .thenReturn(json(page2));

        YoutubeApiClient.PlaylistItemsResult result = client.fetchPlaylistItems("PLxxxx");

        assertEquals(2, result.items().size());
        verify(restTemplate, times(2)).getForObject(any(URI.class), eq(JsonNode.class));
    }

    @Test
    void fetchPlaylistItems_CapsAtTenPages() {
        String pageWithNext = "{ \"items\": [ %s ], \"nextPageToken\": \"NEXT\" }".formatted(playlistItem("v", "Video", 0));
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class))).thenReturn(json(pageWithNext));

        YoutubeApiClient.PlaylistItemsResult result = client.fetchPlaylistItems("PLxxxx");

        assertEquals(10, result.items().size());
        verify(restTemplate, times(10)).getForObject(any(URI.class), eq(JsonNode.class));
    }

    @Test
    void fetchVideoDurations_ParsesIso8601Duration() {
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class))).thenReturn(json("""
                { "items": [ { "id": "v1", "contentDetails": { "duration": "PT14M32S" } } ] }
                """));

        Map<String, Integer> durations = client.fetchVideoDurations(List.of("v1"));

        assertEquals(14, durations.get("v1"));
    }

    @Test
    void get_ThrowsExternalApiException_OnHttpClientError() {
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.FORBIDDEN, "Forbidden", null, null, null));

        assertThrows(ExternalApiException.class, () -> client.fetchPlaylistMetadata("PLxxxx"));
    }

    @Test
    void get_ThrowsExternalApiException_OnNetworkError() {
        when(restTemplate.getForObject(any(URI.class), eq(JsonNode.class)))
                .thenThrow(new ResourceAccessException("timeout"));

        assertThrows(ExternalApiException.class, () -> client.fetchPlaylistMetadata("PLxxxx"));
    }
}
