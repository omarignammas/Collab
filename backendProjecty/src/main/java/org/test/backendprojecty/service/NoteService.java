package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.NoteRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.NoteResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.FocusRoom;
import org.test.backendprojecty.entity.Note;
import org.test.backendprojecty.entity.Task;
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

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final CourseRepository courseRepository;
    private final TaskRepository taskRepository;
    private final FocusRoomRepository focusRoomRepository;
    private final FocusRoomParticipantRepository focusRoomParticipantRepository;
    private final NoteMapper noteMapper;
    private final CurrentUserProvider currentUserProvider;
    private final ArticleFetchService articleFetchService;

    private Course resolveCourse(Long courseId, User currentUser) {
        if (courseId == null) {
            return null;
        }
        return courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));
    }

    private Task resolveTask(Long taskId, User currentUser) {
        if (taskId == null) {
            return null;
        }
        return taskRepository.findByIdAndUserId(taskId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
    }

    // Unlike course/task links, a room isn't owner-scoped — any participant
    // (past or present) in a shared session can attach a note to it.
    private FocusRoom resolveRoom(String roomCode, User currentUser) {
        if (roomCode == null || roomCode.isBlank()) {
            return null;
        }
        FocusRoom room = focusRoomRepository.findByCode(roomCode)
                .orElseThrow(() -> new ResourceNotFoundException("Focus room not found with code: " + roomCode));
        boolean isParticipant = focusRoomParticipantRepository
                .findByRoomIdAndUserId(room.getId(), currentUser.getId())
                .isPresent();
        if (!isParticipant) {
            throw new BadRequestException("You can only add notes to a Focus Room you've joined");
        }
        return room;
    }

    @Transactional
    public NoteResponse createNote(NoteRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        String body = request.getBody();
        if ((body == null || body.isBlank()) && request.getSavedUrl() != null && !request.getSavedUrl().isBlank()) {
            body = articleFetchService.fetchArticleText(request.getSavedUrl());
        }

        Note note = Note.builder()
                .title(request.getTitle())
                .body(body)
                .tags(request.getTags() != null ? request.getTags() : Collections.emptyList())
                .savedUrl(request.getSavedUrl())
                .course(resolveCourse(request.getCourseId(), currentUser))
                .task(resolveTask(request.getTaskId(), currentUser))
                .room(resolveRoom(request.getRoomCode(), currentUser))
                .user(currentUser)
                .build();

        note = noteRepository.save(note);
        return noteMapper.toResponse(note);
    }

    @Transactional(readOnly = true)
    public PagingResult<NoteResponse> getAllNotes(PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        Pageable pageable = PaginationUtils.getPageable(request);
        Page<Note> notesPage = noteRepository.findByUserId(currentUser.getId(), pageable);

        List<NoteResponse> content = notesPage.getContent()
                .stream()
                .map(noteMapper::toResponse)
                .collect(Collectors.toList());

        return new PagingResult<>(
                content,
                notesPage.getTotalPages(),
                notesPage.getTotalElements(),
                notesPage.getSize(),
                notesPage.getNumber(),
                notesPage.isEmpty()
        );
    }

    @Transactional(readOnly = true)
    public NoteResponse getNoteById(Long noteId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Note note = noteRepository.findByIdAndUserId(noteId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));
        return noteMapper.toResponse(note);
    }

    @Transactional
    public NoteResponse updateNote(Long noteId, NoteRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Note note = noteRepository.findByIdAndUserId(noteId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));

        note.setTitle(request.getTitle());
        note.setBody(request.getBody());
        note.setTags(request.getTags() != null ? request.getTags() : Collections.emptyList());
        note.setSavedUrl(request.getSavedUrl());
        note.setCourse(resolveCourse(request.getCourseId(), currentUser));
        note.setTask(resolveTask(request.getTaskId(), currentUser));

        note = noteRepository.save(note);
        return noteMapper.toResponse(note);
    }

    @Transactional
    public void deleteNote(Long noteId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Note note = noteRepository.findByIdAndUserId(noteId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));

        noteRepository.delete(note);
    }

    // Cross-participant, unlike every other Note read here — any current/past
    // participant can see the whole session's shared notes feed, not just their own.
    @Transactional(readOnly = true)
    public List<NoteResponse> getRoomNotes(String roomCode) {
        User currentUser = currentUserProvider.getCurrentUser();
        FocusRoom room = resolveRoom(roomCode, currentUser);
        return noteRepository.findByRoomIdOrderByCreatedAtAsc(room.getId())
                .stream()
                .map(noteMapper::toResponse)
                .collect(Collectors.toList());
    }
}
