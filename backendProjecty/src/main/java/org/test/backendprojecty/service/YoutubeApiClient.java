package org.test.backendprojecty.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.test.backendprojecty.exception.ExternalApiException;
import org.test.backendprojecty.exception.PlaylistNotFoundException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thin wrapper around the YouTube Data API v3 — talks to YouTube only, mirrors
 * the fetch-only role ArticleFetchService plays for Notes. Orchestration
 * (turning the fetched data into a Course + Tasks) lives in YoutubeImportService.
 */
@Service
@Slf4j
public class YoutubeApiClient {

    private static final int MAX_PLAYLIST_PAGES = 10;
    private static final String DELETED_VIDEO_TITLE = "Deleted video";
    private static final String PRIVATE_VIDEO_TITLE = "Private video";

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String baseUrl;

    public YoutubeApiClient(@Qualifier("restTemplate") RestTemplate restTemplate,
                             @Value("${app.youtube.api-key}") String apiKey,
                             @Value("${app.youtube.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        log.info("YouTube playlist import: {} (key length: {}), base URL: {}",
                (apiKey == null || apiKey.isBlank()) ? "DISABLED — no key resolved" : "enabled",
                apiKey == null ? 0 : apiKey.length(), baseUrl);
    }

    public record PlaylistMetadata(String playlistId, String title, String description, String thumbnailUrl) {}
    public record PlaylistItem(String videoId, String title, int position) {}
    public record PlaylistItemsResult(List<PlaylistItem> items, int skippedCount) {}

    public PlaylistMetadata fetchPlaylistMetadata(String playlistId) {
        assertConfigured();
        JsonNode root = get(UriComponentsBuilder.fromHttpUrl(baseUrl + "/playlists")
                .queryParam("part", "snippet")
                .queryParam("id", playlistId)
                .queryParam("key", apiKey));

        JsonNode items = root.path("items");
        if (!items.isArray() || items.isEmpty()) {
            throw new PlaylistNotFoundException(
                    "Playlist not found or is private. Only public/unlisted playlists can be imported.");
        }

        JsonNode snippet = items.get(0).path("snippet");
        String thumbnailUrl = snippet.path("thumbnails").path("high").path("url").asText(null);
        if (thumbnailUrl == null) {
            thumbnailUrl = snippet.path("thumbnails").path("default").path("url").asText(null);
        }

        return new PlaylistMetadata(
                playlistId,
                snippet.path("title").asText("Imported Playlist"),
                snippet.path("description").asText(null),
                thumbnailUrl);
    }

    public PlaylistItemsResult fetchPlaylistItems(String playlistId) {
        assertConfigured();
        List<PlaylistItem> items = new ArrayList<>();
        int skipped = 0;
        String pageToken = null;
        int pages = 0;

        do {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(baseUrl + "/playlistItems")
                    .queryParam("part", "snippet,contentDetails")
                    .queryParam("playlistId", playlistId)
                    .queryParam("maxResults", 50)
                    .queryParam("key", apiKey);
            if (pageToken != null) {
                builder.queryParam("pageToken", pageToken);
            }
            JsonNode root = get(builder);

            for (JsonNode item : root.path("items")) {
                JsonNode snippet = item.path("snippet");
                String title = snippet.path("title").asText("");
                String videoId = item.path("contentDetails").path("videoId").asText(null);

                if (DELETED_VIDEO_TITLE.equals(title) || PRIVATE_VIDEO_TITLE.equals(title) || videoId == null) {
                    skipped++;
                    continue;
                }
                items.add(new PlaylistItem(videoId, title, snippet.path("position").asInt(items.size())));
            }

            pageToken = root.path("nextPageToken").asText(null);
            pages++;
        } while (pageToken != null && pages < MAX_PLAYLIST_PAGES);

        if (pageToken != null) {
            log.warn("Playlist {} has more than {} pages of items — import truncated at {} videos",
                    playlistId, MAX_PLAYLIST_PAGES, items.size());
        }

        return new PlaylistItemsResult(items, skipped);
    }

    public Map<String, Integer> fetchVideoDurations(List<String> videoIds) {
        assertConfigured();
        Map<String, Integer> durations = new LinkedHashMap<>();

        for (int i = 0; i < videoIds.size(); i += 50) {
            List<String> batch = videoIds.subList(i, Math.min(i + 50, videoIds.size()));
            JsonNode root = get(UriComponentsBuilder.fromHttpUrl(baseUrl + "/videos")
                    .queryParam("part", "contentDetails")
                    .queryParam("id", String.join(",", batch))
                    .queryParam("key", apiKey));

            for (JsonNode item : root.path("items")) {
                String id = item.path("id").asText();
                String iso = item.path("contentDetails").path("duration").asText(null);
                if (iso == null) {
                    continue;
                }
                try {
                    durations.put(id, (int) Duration.parse(iso).toMinutes());
                } catch (Exception e) {
                    log.warn("Could not parse video duration '{}' for video {}", iso, id);
                }
            }
        }
        return durations;
    }

    private void assertConfigured() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ExternalApiException(
                    "YouTube import is not configured. Set the YOUTUBE_API_KEY environment variable to enable it.");
        }
    }

    private JsonNode get(UriComponentsBuilder builder) {
        try {
            JsonNode body = restTemplate.getForObject(builder.build().encode().toUri(), JsonNode.class);
            if (body == null) {
                throw new ExternalApiException("Empty response from the YouTube API. Please try again later.");
            }
            return body;
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.warn("YouTube API call failed: {} {}", e.getStatusCode(), e.getMessage());
            throw new ExternalApiException("YouTube API request failed (" + e.getStatusCode() + "). Please try again later.");
        } catch (ResourceAccessException e) {
            log.warn("YouTube API network error: {}", e.getMessage());
            throw new ExternalApiException("Could not reach the YouTube API. Please try again later.");
        }
    }
}
