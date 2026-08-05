package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.SendFriendRequestRequest;
import org.test.backendprojecty.dtos.response.FriendRequestResponse;
import org.test.backendprojecty.dtos.response.FriendResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.service.FriendService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;

    @GetMapping
    public ResponseEntity<PagingResult<FriendResponse>> getFriends(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        return ResponseEntity.ok(friendService.listFriends(request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeFriend(@PathVariable Long userId) {
        friendService.removeFriend(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<FriendResponse>> searchUsers(@RequestParam String q) {
        return ResponseEntity.ok(friendService.searchUsers(q));
    }

    @PostMapping("/requests")
    public ResponseEntity<FriendRequestResponse> sendRequest(@Valid @RequestBody SendFriendRequestRequest request) {
        FriendRequestResponse response = friendService.sendRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/requests/incoming")
    public ResponseEntity<List<FriendRequestResponse>> getIncoming() {
        return ResponseEntity.ok(friendService.listIncoming());
    }

    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<FriendRequestResponse>> getOutgoing() {
        return ResponseEntity.ok(friendService.listOutgoing());
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<FriendRequestResponse> acceptRequest(@PathVariable Long requestId) {
        return ResponseEntity.ok(friendService.acceptRequest(requestId));
    }

    @PostMapping("/requests/{requestId}/decline")
    public ResponseEntity<Void> declineRequest(@PathVariable Long requestId) {
        friendService.declineRequest(requestId);
        return ResponseEntity.noContent().build();
    }
}
