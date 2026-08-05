package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.NoteRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.NoteResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.service.NoteService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @PostMapping
    public ResponseEntity<NoteResponse> createNote(@Valid @RequestBody NoteRequest request) {
        NoteResponse response = noteService.createNote(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PagingResult<NoteResponse>> getAllNotes(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        PagingResult<NoteResponse> notes = noteService.getAllNotes(request);
        return ResponseEntity.ok(notes);
    }

    @GetMapping("/{noteId}")
    public ResponseEntity<NoteResponse> getNoteById(@PathVariable Long noteId) {
        NoteResponse response = noteService.getNoteById(noteId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/room/{roomCode}")
    public ResponseEntity<List<NoteResponse>> getRoomNotes(@PathVariable String roomCode) {
        return ResponseEntity.ok(noteService.getRoomNotes(roomCode));
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<NoteResponse> updateNote(
            @PathVariable Long noteId,
            @Valid @RequestBody NoteRequest request) {
        NoteResponse response = noteService.updateNote(noteId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long noteId) {
        noteService.deleteNote(noteId);
        return ResponseEntity.noContent().build();
    }
}
