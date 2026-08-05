package org.test.backendprojecty.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.NotificationResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.service.NotificationService;

@RestController
@RequestMapping("${BaseUrl}/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<PagingResult<NotificationResponse>> getAllNotifications(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        return ResponseEntity.ok(notificationService.listNotifications(request));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount() {
        return ResponseEntity.ok(notificationService.unreadCount());
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long notificationId) {
        notificationService.markRead(notificationId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.noContent().build();
    }
}
