package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.test.backendprojecty.dtos.request.NoteRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.NoteResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.entity.FocusRoom;
import org.test.backendprojecty.entity.FocusRoomParticipant;
import org.test.backendprojecty.entity.Note;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.NoteMapper;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.FocusRoomParticipantRepository;
import org.test.backendprojecty.repository.FocusRoomRepository;
import org.test.backendprojecty.repository.NoteRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private FocusRoomRepository focusRoomRepository;

    @Mock
    private FocusRoomParticipantRepository focusRoomParticipantRepository;

    @Mock
    private NoteMapper noteMapper;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private ArticleFetchService articleFetchService;

    @InjectMocks
    private NoteService noteService;

    private User user;
    private Note note;
    private NoteRequest noteRequest;
    private NoteResponse noteResponse;
    private PaginationRequest paginationRequest;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("test@example.com")
                .build();

        note = Note.builder()
                .id(1L)
                .title("Test Note")
                .body("Some body")
                .tags(List.of("chem", "midterm"))
                .user(user)
                .build();

        noteRequest = NoteRequest.builder()
                .title("Test Note")
                .body("Some body")
                .tags(List.of("chem", "midterm"))
                .build();

        noteResponse = NoteResponse.builder()
                .id(1L)
                .title("Test Note")
                .body("Some body")
                .tags(List.of("chem", "midterm"))
                .build();

        paginationRequest = PaginationRequest.builder()
                .page(1)
                .size(10)
                .sortField("id")
                .direction(Sort.Direction.ASC)
                .build();

        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(user);
    }

    @Test
    void createNote_Success() {
        when(noteRepository.save(any(Note.class))).thenReturn(note);
        when(noteMapper.toResponse(note)).thenReturn(noteResponse);

        NoteResponse response = noteService.createNote(noteRequest);

        assertNotNull(response);
        assertEquals("Test Note", response.getTitle());
        verify(noteRepository).save(any(Note.class));
        verify(courseRepository, never()).findByIdAndUserIdAndDeletedFalse(any(), any());
    }

    @Test
    void createNote_WithSavedUrlAndNoBody_FetchesArticleText() {
        NoteRequest requestWithUrl = NoteRequest.builder()
                .title("Saved Article")
                .savedUrl("https://example.com/article")
                .build();
        when(articleFetchService.fetchArticleText("https://example.com/article")).thenReturn("Fetched article text");
        when(noteRepository.save(any(Note.class))).thenReturn(note);
        when(noteMapper.toResponse(note)).thenReturn(noteResponse);

        noteService.createNote(requestWithUrl);

        ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).save(captor.capture());
        assertEquals("Fetched article text", captor.getValue().getBody());
    }

    @Test
    void createNote_WithBodyProvided_DoesNotFetchArticle() {
        when(noteRepository.save(any(Note.class))).thenReturn(note);
        when(noteMapper.toResponse(note)).thenReturn(noteResponse);

        noteService.createNote(noteRequest);

        verify(articleFetchService, never()).fetchArticleText(any());
    }

    @Test
    void getAllNotes_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Note> notePage = new PageImpl<>(Arrays.asList(note), pageable, 1);

        when(noteRepository.findByUserId(eq(1L), any(Pageable.class)))
                .thenReturn(notePage);
        when(noteMapper.toResponse(note)).thenReturn(noteResponse);

        PagingResult<NoteResponse> result = noteService.getAllNotes(paginationRequest);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("Test Note", result.getContent().iterator().next().getTitle());
    }

    @Test
    void getNoteById_NotFound_ThrowsException() {
        when(noteRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> noteService.getNoteById(1L));
    }

    @Test
    void deleteNote_Success() {
        when(noteRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(note));

        noteService.deleteNote(1L);

        verify(noteRepository).delete(note);
    }

    @Test
    void createNote_WithRoomCode_ParticipantAllowed_AttachesRoom() {
        FocusRoom room = FocusRoom.builder().id(5L).code("ABC-123").build();
        NoteRequest requestWithRoom = NoteRequest.builder()
                .title("Session Note")
                .body("stuff we discussed")
                .roomCode("ABC-123")
                .build();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(focusRoomParticipantRepository.findByRoomIdAndUserId(5L, 1L))
                .thenReturn(Optional.of(FocusRoomParticipant.builder().room(room).user(user).build()));
        when(noteRepository.save(any(Note.class))).thenReturn(note);
        when(noteMapper.toResponse(note)).thenReturn(noteResponse);

        noteService.createNote(requestWithRoom);

        ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).save(captor.capture());
        assertEquals(room, captor.getValue().getRoom());
    }

    @Test
    void getRoomNotes_Participant_ReturnsAllRoomNotes() {
        FocusRoom room = FocusRoom.builder().id(5L).code("ABC-123").build();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(focusRoomParticipantRepository.findByRoomIdAndUserId(5L, 1L))
                .thenReturn(Optional.of(FocusRoomParticipant.builder().room(room).user(user).build()));
        when(noteRepository.findByRoomIdOrderByCreatedAtAsc(5L)).thenReturn(List.of(note));
        when(noteMapper.toResponse(note)).thenReturn(noteResponse);

        List<NoteResponse> result = noteService.getRoomNotes("ABC-123");

        assertEquals(1, result.size());
        assertEquals("Test Note", result.get(0).getTitle());
    }

    @Test
    void createNote_WithRoomCode_NotAParticipant_ThrowsBadRequest() {
        FocusRoom room = FocusRoom.builder().id(5L).code("ABC-123").build();
        NoteRequest requestWithRoom = NoteRequest.builder()
                .title("Session Note")
                .roomCode("ABC-123")
                .build();
        when(focusRoomRepository.findByCode("ABC-123")).thenReturn(Optional.of(room));
        when(focusRoomParticipantRepository.findByRoomIdAndUserId(5L, 1L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> noteService.createNote(requestWithRoom));
        verify(noteRepository, never()).save(any(Note.class));
    }
}
