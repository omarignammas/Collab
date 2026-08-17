package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.CircleNoteRequest;
import org.test.backendprojecty.dtos.request.CreateCircleRequest;
import org.test.backendprojecty.dtos.request.InviteCircleMembersRequest;
import org.test.backendprojecty.dtos.request.UpdateCircleRequest;
import org.test.backendprojecty.dtos.response.CircleNoteResponse;
import org.test.backendprojecty.dtos.response.CircleResponse;
import org.test.backendprojecty.service.CircleService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/circles")
@RequiredArgsConstructor
public class CircleController {

    private final CircleService circleService;

    @PostMapping
    public ResponseEntity<CircleResponse> create(@Valid @RequestBody CreateCircleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(circleService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<CircleResponse>> listMine() {
        return ResponseEntity.ok(circleService.listMine());
    }

    @PutMapping("/{circleId}")
    public ResponseEntity<CircleResponse> update(
            @PathVariable Long circleId,
            @Valid @RequestBody UpdateCircleRequest request) {
        return ResponseEntity.ok(circleService.update(circleId, request));
    }

    @PostMapping("/{circleId}/members")
    public ResponseEntity<CircleResponse> inviteMembers(
            @PathVariable Long circleId,
            @Valid @RequestBody InviteCircleMembersRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(circleService.inviteMembers(circleId, request.getUserIds()));
    }

    @DeleteMapping("/{circleId}/members/{userId}")
    public ResponseEntity<CircleResponse> removeMember(
            @PathVariable Long circleId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(circleService.removeMember(circleId, userId));
    }

    @DeleteMapping("/{circleId}")
    public ResponseEntity<Void> delete(@PathVariable Long circleId) {
        circleService.delete(circleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{circleId}/accept")
    public ResponseEntity<CircleResponse> accept(@PathVariable Long circleId) {
        return ResponseEntity.ok(circleService.accept(circleId));
    }

    @PostMapping("/{circleId}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long circleId) {
        circleService.decline(circleId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{circleId}/notes")
    public ResponseEntity<CircleNoteResponse> addNote(
            @PathVariable Long circleId,
            @Valid @RequestBody CircleNoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(circleService.addNote(circleId, request));
    }

    @GetMapping("/{circleId}/notes")
    public ResponseEntity<List<CircleNoteResponse>> listNotes(@PathVariable Long circleId) {
        return ResponseEntity.ok(circleService.listNotes(circleId));
    }

    @DeleteMapping("/{circleId}/notes/{noteId}")
    public ResponseEntity<Void> deleteNote(@PathVariable Long circleId, @PathVariable Long noteId) {
        circleService.deleteNote(circleId, noteId);
        return ResponseEntity.noContent().build();
    }
}
