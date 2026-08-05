package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.FocusRoomRequest;
import org.test.backendprojecty.dtos.request.InviteToRoomRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.FocusRoomReportResponse;
import org.test.backendprojecty.dtos.response.FocusRoomResponse;
import org.test.backendprojecty.dtos.response.FocusTimeEntryResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.service.FocusRoomReportService;
import org.test.backendprojecty.service.FocusRoomService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/focus-rooms")
@RequiredArgsConstructor
public class FocusRoomController {

    private final FocusRoomService focusRoomService;
    private final FocusRoomReportService focusRoomReportService;

    @PostMapping
    public ResponseEntity<FocusRoomResponse> createRoom(@Valid @RequestBody FocusRoomRequest request) {
        FocusRoomResponse response = focusRoomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PagingResult<FocusRoomResponse>> getAllRooms(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        return ResponseEntity.ok(focusRoomService.getAllRooms(request));
    }

    @GetMapping("/time-entries")
    public ResponseEntity<List<FocusTimeEntryResponse>> getTimeEntries() {
        return ResponseEntity.ok(focusRoomService.getTimeEntries());
    }

    @GetMapping("/{code}")
    public ResponseEntity<FocusRoomResponse> getRoomByCode(@PathVariable String code) {
        return ResponseEntity.ok(focusRoomService.getRoomByCode(code));
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<FocusRoomResponse> joinRoom(@PathVariable String code) {
        return ResponseEntity.ok(focusRoomService.joinRoom(code));
    }

    @PostMapping("/{code}/decline")
    public ResponseEntity<Void> declineInvite(@PathVariable String code) {
        focusRoomService.declineInvite(code);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{code}/rematch")
    public ResponseEntity<FocusRoomResponse> rematchRoom(@PathVariable String code) {
        return ResponseEntity.status(HttpStatus.CREATED).body(focusRoomService.rematchRoom(code));
    }

    @PostMapping("/{code}/invite")
    public ResponseEntity<FocusRoomResponse> inviteToRoom(
            @PathVariable String code,
            @Valid @RequestBody InviteToRoomRequest request
    ) {
        return ResponseEntity.ok(focusRoomService.inviteToRoom(code, request.getUserId()));
    }

    @GetMapping("/{code}/report")
    public ResponseEntity<FocusRoomReportResponse> getReport(@PathVariable String code) {
        return ResponseEntity.ok(focusRoomReportService.getReport(code));
    }
}
