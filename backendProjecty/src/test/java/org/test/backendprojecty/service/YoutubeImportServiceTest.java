package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.test.backendprojecty.dtos.request.YoutubeImportRequest;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.dtos.response.YoutubeImportResponse;
import org.test.backendprojecty.dtos.response.YoutubeResyncResponse;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.Term;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.CourseMapper;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.repository.TermRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class YoutubeImportServiceTest {

    @Mock
    private YoutubeApiClient youtubeApiClient;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TermRepository termRepository;

    @Mock
    private CourseMapper courseMapper;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private YoutubeImportService youtubeImportService;

    private User user;
    private Term term;
    private Course course;
    private YoutubeImportRequest request;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("test@example.com").build();
        term = Term.builder().id(1L).name("Fall 2026").user(user).build();
        course = Course.builder().id(1L).title("Linear Algebra").term(term).user(user).build();
        request = YoutubeImportRequest.builder()
                .playlistUrl("https://www.youtube.com/playlist?list=PLxxxx")
                .termId(1L)
                .build();

        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(user);
    }

    @Test
    void parsePlaylistId_ExtractsListParamFromUrl() {
        assertEquals("PLxxxx", youtubeImportService.parsePlaylistId("https://www.youtube.com/playlist?list=PLxxxx"));
    }

    @Test
    void parsePlaylistId_FallsBackToRawInput_WhenNoListParam() {
        assertEquals("PLxxxx", youtubeImportService.parsePlaylistId("PLxxxx"));
    }

    @Test
    void importPlaylist_Success() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(term));
        when(youtubeApiClient.fetchPlaylistMetadata("PLxxxx"))
                .thenReturn(new YoutubeApiClient.PlaylistMetadata("PLxxxx", "Linear Algebra", "desc", "thumb.jpg"));
        when(courseRepository.existsByTitleAndUserId("Linear Algebra", 1L)).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenReturn(course);
        when(youtubeApiClient.fetchPlaylistItems("PLxxxx")).thenReturn(new YoutubeApiClient.PlaylistItemsResult(
                List.of(
                        new YoutubeApiClient.PlaylistItem("v1", "Lecture 1", 0),
                        new YoutubeApiClient.PlaylistItem("v2", "Lecture 1", 1)),
                2));
        when(youtubeApiClient.fetchVideoDurations(anyList())).thenReturn(Map.of("v1", 10, "v2", 12));
        when(courseMapper.toResponse(course, 1L)).thenReturn(CourseResponse.builder().id(1L).title("Linear Algebra").build());

        YoutubeImportResponse response = youtubeImportService.importPlaylist(request);

        assertEquals(2, response.getTasksImported());
        assertEquals(2, response.getTasksSkipped());
        assertEquals("Linear Algebra", response.getCourse().getTitle());
        verify(taskRepository).saveAll(anyList());
    }

    @Test
    void importPlaylist_DuplicateTitle_ServiceCheck_ThrowsBadRequest() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(term));
        when(youtubeApiClient.fetchPlaylistMetadata("PLxxxx"))
                .thenReturn(new YoutubeApiClient.PlaylistMetadata("PLxxxx", "Linear Algebra", "desc", null));
        when(courseRepository.existsByTitleAndUserId("Linear Algebra", 1L)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> youtubeImportService.importPlaylist(request));
        verify(courseRepository, never()).save(any(Course.class));
    }

    @Test
    void importPlaylist_DuplicateTitle_DbConstraint_ThrowsBadRequest() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(term));
        when(youtubeApiClient.fetchPlaylistMetadata("PLxxxx"))
                .thenReturn(new YoutubeApiClient.PlaylistMetadata("PLxxxx", "Linear Algebra", "desc", null));
        when(courseRepository.existsByTitleAndUserId("Linear Algebra", 1L)).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenThrow(new DataIntegrityViolationException("dup"));

        assertThrows(BadRequestException.class, () -> youtubeImportService.importPlaylist(request));
    }

    @Test
    void importPlaylist_BadTerm_ThrowsResourceNotFound() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> youtubeImportService.importPlaylist(request));
        verifyNoInteractions(youtubeApiClient);
    }

    @Test
    void resync_ImportsOnlyNewVideos() {
        course.setYoutubePlaylistId("PLxxxx");
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(youtubeApiClient.fetchPlaylistItems("PLxxxx")).thenReturn(new YoutubeApiClient.PlaylistItemsResult(
                List.of(
                        new YoutubeApiClient.PlaylistItem("v1", "Lecture 1", 0),
                        new YoutubeApiClient.PlaylistItem("v2", "Lecture 2", 1)),
                0));
        when(taskRepository.findYoutubeVideoIdsByCourseId(1L)).thenReturn(List.of("v1"));
        when(youtubeApiClient.fetchVideoDurations(anyList())).thenReturn(Map.of("v2", 8));

        YoutubeResyncResponse response = youtubeImportService.resync(1L);

        assertEquals(1, response.getTasksImported());
        assertEquals(1, response.getTasksSkipped());
        verify(taskRepository).saveAll(anyList());
    }

    @Test
    void resync_NotImportedFromYoutube_ThrowsBadRequest() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));

        assertThrows(BadRequestException.class, () -> youtubeImportService.resync(1L));
        verifyNoInteractions(youtubeApiClient);
    }

    @Test
    void resync_CourseNotFound_ThrowsResourceNotFound() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> youtubeImportService.resync(1L));
    }
}
