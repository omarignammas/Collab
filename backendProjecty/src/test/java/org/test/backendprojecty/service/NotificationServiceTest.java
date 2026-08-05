package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.NotificationResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.entity.FocusRoomParticipant;
import org.test.backendprojecty.entity.Notification;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.ParticipantStatus;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.repository.FocusRoomParticipantRepository;
import org.test.backendprojecty.repository.NotificationRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private FocusRoomParticipantRepository focusRoomParticipantRepository;
    @Mock
    private CurrentUserProvider currentUserProvider;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private NotificationService notificationService;

    private User recipient;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository, focusRoomParticipantRepository, currentUserProvider, messagingTemplate);
        recipient = User.builder().id(2L).email("recipient@example.com").firstName("Rae").lastName("Kim").build();
    }

    @Test
    void notify_PersistsAndBroadcastsToRecipientQueue() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        notificationService.notify(recipient, NotificationType.FRIEND_REQUEST_RECEIVED, "Title", "Body", "/friends");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals(recipient, captor.getValue().getRecipient());
        assertEquals(NotificationType.FRIEND_REQUEST_RECEIVED, captor.getValue().getType());
        assertFalse(captor.getValue().isRead());

        verify(messagingTemplate).convertAndSendToUser(
                eq("recipient@example.com"), eq("/queue/notifications"), any(NotificationResponse.class));
    }

    @Test
    void unreadCount_ReturnsRepositoryCount() {
        when(currentUserProvider.getCurrentUser()).thenReturn(recipient);
        when(notificationRepository.countByRecipientIdAndReadFalse(2L)).thenReturn(3L);

        assertEquals(3L, notificationService.unreadCount());
    }

    @Test
    void markRead_NotYourNotification_ThrowsBadRequest() {
        User someoneElse = User.builder().id(99L).email("other@example.com").build();
        when(currentUserProvider.getCurrentUser()).thenReturn(someoneElse);
        Notification notification = Notification.builder().id(5L).recipient(recipient).build();
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(notification));

        assertThrows(BadRequestException.class, () -> notificationService.markRead(5L));
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void markRead_Success_SetsReadTrue() {
        when(currentUserProvider.getCurrentUser()).thenReturn(recipient);
        Notification notification = Notification.builder().id(5L).recipient(recipient).read(false).build();
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(notification));

        notificationService.markRead(5L);

        assertTrue(notification.isRead());
        verify(notificationRepository).save(notification);
    }

    @Test
    void markAllRead_OnlyUpdatesUnreadOnes() {
        when(currentUserProvider.getCurrentUser()).thenReturn(recipient);
        Notification unread1 = Notification.builder().id(1L).recipient(recipient).read(false).build();
        Notification unread2 = Notification.builder().id(2L).recipient(recipient).read(false).build();
        Notification alreadyRead = Notification.builder().id(3L).recipient(recipient).read(true).build();
        Page<Notification> page = new PageImpl<>(List.of(unread1, unread2, alreadyRead));
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(eq(2L), any(Pageable.class))).thenReturn(page);

        notificationService.markAllRead();

        assertTrue(unread1.isRead());
        assertTrue(unread2.isRead());
        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        assertEquals(2, captor.getValue().size());
    }

    @Test
    void listNotifications_MapsToResponses() {
        when(currentUserProvider.getCurrentUser()).thenReturn(recipient);
        Notification notification = Notification.builder()
                .id(1L).recipient(recipient).type(NotificationType.FOCUS_ROOM_INVITE)
                .title("t").body("b").link("/focus-rooms/ABC-123").read(false)
                .build();
        Page<Notification> page = new PageImpl<>(List.of(notification));
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(eq(2L), any(Pageable.class))).thenReturn(page);

        PaginationRequest request = PaginationRequest.builder().page(1).size(10).sortField("id").direction(Sort.Direction.DESC).build();
        PagingResult<NotificationResponse> result = notificationService.listNotifications(request);

        assertEquals(1, result.getContent().size());
        assertEquals("/focus-rooms/ABC-123", result.getContent().iterator().next().getLink());
    }

    @Test
    void listNotifications_FocusRoomInviteStillPending_ActionableTrue() {
        when(currentUserProvider.getCurrentUser()).thenReturn(recipient);
        Notification notification = Notification.builder()
                .id(1L).recipient(recipient).type(NotificationType.FOCUS_ROOM_INVITE)
                .title("t").body("b").link("/focus-rooms/ABC-123").actionResourceId("ABC-123").read(false)
                .build();
        Page<Notification> page = new PageImpl<>(List.of(notification));
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(eq(2L), any(Pageable.class))).thenReturn(page);
        when(focusRoomParticipantRepository.findByRoomCodeAndUserId("ABC-123", 2L))
                .thenReturn(Optional.of(FocusRoomParticipant.builder().status(ParticipantStatus.INVITED).build()));

        PaginationRequest request = PaginationRequest.builder().page(1).size(10).sortField("id").direction(Sort.Direction.DESC).build();
        PagingResult<NotificationResponse> result = notificationService.listNotifications(request);

        assertTrue(result.getContent().iterator().next().isActionable());
    }

    @Test
    void listNotifications_FocusRoomInviteAlreadyJoined_ActionableFalse() {
        when(currentUserProvider.getCurrentUser()).thenReturn(recipient);
        Notification notification = Notification.builder()
                .id(1L).recipient(recipient).type(NotificationType.FOCUS_ROOM_INVITE)
                .title("t").body("b").link("/focus-rooms/ABC-123").actionResourceId("ABC-123").read(false)
                .build();
        Page<Notification> page = new PageImpl<>(List.of(notification));
        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(eq(2L), any(Pageable.class))).thenReturn(page);
        when(focusRoomParticipantRepository.findByRoomCodeAndUserId("ABC-123", 2L))
                .thenReturn(Optional.of(FocusRoomParticipant.builder().status(ParticipantStatus.JOINED).build()));

        PaginationRequest request = PaginationRequest.builder().page(1).size(10).sortField("id").direction(Sort.Direction.DESC).build();
        PagingResult<NotificationResponse> result = notificationService.listNotifications(request);

        assertFalse(result.getContent().iterator().next().isActionable());
    }

    @Test
    void notify_WithActionResourceId_PersistsIt() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        notificationService.notify(recipient, NotificationType.FOCUS_ROOM_INVITE, "Title", "Body", "/focus-rooms/ABC-123", "ABC-123");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertEquals("ABC-123", captor.getValue().getActionResourceId());
    }
}
