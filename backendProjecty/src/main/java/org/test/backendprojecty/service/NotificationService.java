package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.NotificationResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.entity.Notification;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.ParticipantStatus;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.FocusRoomParticipantRepository;
import org.test.backendprojecty.repository.NotificationRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final FocusRoomParticipantRepository focusRoomParticipantRepository;
    private final CurrentUserProvider currentUserProvider;
    private final SimpMessagingTemplate messagingTemplate;

    /** Called by other services (friend requests, room invites) — recipient is explicit, not "current user". */
    @Transactional
    public void notify(User recipient, NotificationType type, String title, String body, String link) {
        notify(recipient, type, title, body, link, null);
    }

    /** Same as above, plus a resourceId (e.g. a Focus Room code) an actionable notification refers to. */
    @Transactional
    public void notify(User recipient, NotificationType type, String title, String body, String link, String actionResourceId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .actionResourceId(actionResourceId)
                .build();
        notification = notificationRepository.save(notification);

        NotificationResponse response = toResponse(notification);
        messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/notifications", response);
    }

    @Transactional(readOnly = true)
    public PagingResult<NotificationResponse> listNotifications(PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Pageable pageable = PaginationUtils.getPageable(request);
        Page<Notification> page = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(currentUser.getId(), pageable);

        List<NotificationResponse> content = page.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return new PagingResult<>(content, page.getTotalPages(), page.getTotalElements(), page.getSize(), page.getNumber(), page.isEmpty());
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        User currentUser = currentUserProvider.getCurrentUser();
        return notificationRepository.countByRecipientIdAndReadFalse(currentUser.getId());
    }

    @Transactional
    public void markRead(Long notificationId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getRecipient().getId().equals(currentUser.getId())) {
            throw new BadRequestException("This notification isn't yours");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead() {
        User currentUser = currentUserProvider.getCurrentUser();
        List<Notification> unread = notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(currentUser.getId(), Pageable.unpaged())
                .getContent()
                .stream()
                .filter(n -> !n.isRead())
                .collect(Collectors.toList());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .body(notification.getBody())
                .link(notification.getLink())
                .actionResourceId(notification.getActionResourceId())
                .actionable(isStillActionable(notification))
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    // Computed fresh on every read rather than stored — this way accepting/declining
    // an invite anywhere (the room page, another device) makes stale buttons vanish
    // automatically instead of needing to reach back into this notification's own row.
    private boolean isStillActionable(Notification notification) {
        if (notification.getType() != NotificationType.FOCUS_ROOM_INVITE || notification.getActionResourceId() == null) {
            return false;
        }
        return focusRoomParticipantRepository
                .findByRoomCodeAndUserId(notification.getActionResourceId(), notification.getRecipient().getId())
                .map(p -> p.getStatus() == ParticipantStatus.INVITED)
                .orElse(false);
    }
}
