package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;
import org.test.backendprojecty.dtos.request.YoutubeImportRequest;
import org.test.backendprojecty.dtos.response.YoutubeImportResponse;
import org.test.backendprojecty.dtos.response.YoutubeResyncResponse;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.TaskPriority;
import org.test.backendprojecty.entity.TaskType;
import org.test.backendprojecty.entity.Term;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.PlaylistNotFoundException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.CourseMapper;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.repository.TermRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orchestrates turning a YouTube playlist into a Course + Tasks. YoutubeApiClient
 * does the actual YouTube calls; this class owns the app-side entities, mirroring
 * the shape of CourseService without touching it (kept separate on purpose so the
 * existing manual create/update/delete course flow is never at risk here).
 */
@Service
@RequiredArgsConstructor
public class YoutubeImportService {

    private final YoutubeApiClient youtubeApiClient;
    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;
    private final TermRepository termRepository;
    private final CourseMapper courseMapper;
    private final CurrentUserProvider currentUserProvider;

    private Term resolveTerm(Long termId, User currentUser) {
        return termRepository.findByIdAndUserId(termId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Term not found with id: " + termId));
    }

    /**
     * Pulls the "list" query param out of a pasted playlist URL. Falls back to
     * treating the raw trimmed input as the playlist ID itself, so a bare ID
     * (no URL at all) also works.
     */
    String parsePlaylistId(String rawInput) {
        String input = rawInput == null ? "" : rawInput.trim();
        if (input.isEmpty()) {
            throw new PlaylistNotFoundException("Playlist URL or ID is required.");
        }

        try {
            String listParam = UriComponentsBuilder.fromUriString(input)
                    .build()
                    .getQueryParams()
                    .getFirst("list");
            if (listParam != null && !listParam.isBlank()) {
                return listParam;
            }
        } catch (Exception ignored) {
            // Not a parseable URL — fall through and treat the raw input as the ID.
        }

        return input;
    }

    @Transactional
    public YoutubeImportResponse importPlaylist(YoutubeImportRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Term term = resolveTerm(request.getTermId(), currentUser);
        String playlistId = parsePlaylistId(request.getPlaylistUrl());

        YoutubeApiClient.PlaylistMetadata metadata = youtubeApiClient.fetchPlaylistMetadata(playlistId);

        if (courseRepository.existsByTitleAndUserId(metadata.title(), currentUser.getId())) {
            throw new BadRequestException(
                    "Course title already exists — rename it or delete the existing course first");
        }

        Course course = Course.builder()
                .title(metadata.title())
                .description(metadata.description())
                .term(term)
                .youtubePlaylistId(playlistId)
                .thumbnailUrl(metadata.thumbnailUrl())
                .user(currentUser)
                .build();

        try {
            course = courseRepository.save(course);
        } catch (DataIntegrityViolationException e) {
            throw new BadRequestException(
                    "Course title already exists — rename it or delete the existing course first");
        }

        YoutubeApiClient.PlaylistItemsResult result = youtubeApiClient.fetchPlaylistItems(playlistId);
        List<String> videoIds = result.items().stream().map(YoutubeApiClient.PlaylistItem::videoId).toList();
        Map<String, Integer> durations = videoIds.isEmpty()
                ? Map.of()
                : youtubeApiClient.fetchVideoDurations(videoIds);

        Course finalCourse = course;
        List<Task> tasks = result.items().stream()
                .map(item -> Task.builder()
                        .title(item.title())
                        .type(TaskType.ASSIGNMENT)
                        .priority(TaskPriority.MEDIUM)
                        .completed(false)
                        .user(currentUser)
                        .course(finalCourse)
                        .youtubeVideoId(item.videoId())
                        .position(item.position())
                        .durationMinutes(durations.get(item.videoId()))
                        .build())
                .collect(Collectors.toList());

        taskRepository.saveAll(tasks);

        return YoutubeImportResponse.builder()
                .course(courseMapper.toResponse(course, currentUser.getId()))
                .tasksImported(tasks.size())
                .tasksSkipped(result.skippedCount())
                .build();
    }

    @Transactional
    public YoutubeResyncResponse resync(Long courseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        if (course.getYoutubePlaylistId() == null) {
            throw new BadRequestException("This course wasn't imported from YouTube, so it can't be resynced.");
        }

        YoutubeApiClient.PlaylistItemsResult result = youtubeApiClient.fetchPlaylistItems(course.getYoutubePlaylistId());

        Set<String> existingVideoIds = new HashSet<>(taskRepository.findYoutubeVideoIdsByCourseId(courseId));
        List<YoutubeApiClient.PlaylistItem> newItems = result.items().stream()
                .filter(item -> !existingVideoIds.contains(item.videoId()))
                .toList();

        List<String> newVideoIds = newItems.stream().map(YoutubeApiClient.PlaylistItem::videoId).toList();
        Map<String, Integer> durations = newVideoIds.isEmpty()
                ? Map.of()
                : youtubeApiClient.fetchVideoDurations(newVideoIds);

        List<Task> tasks = new ArrayList<>();
        for (YoutubeApiClient.PlaylistItem item : newItems) {
            tasks.add(Task.builder()
                    .title(item.title())
                    .type(TaskType.ASSIGNMENT)
                    .priority(TaskPriority.MEDIUM)
                    .completed(false)
                    .user(currentUser)
                    .course(course)
                    .youtubeVideoId(item.videoId())
                    .position(item.position())
                    .durationMinutes(durations.get(item.videoId()))
                    .build());
        }
        taskRepository.saveAll(tasks);

        return YoutubeResyncResponse.builder()
                .tasksImported(tasks.size())
                .tasksSkipped(result.items().size() - tasks.size())
                .build();
    }
}
