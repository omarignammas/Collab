package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.SendFriendRequestRequest;
import org.test.backendprojecty.dtos.response.FriendRequestResponse;
import org.test.backendprojecty.dtos.response.FriendResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.entity.FriendRequest;
import org.test.backendprojecty.entity.FriendRequestStatus;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.FriendRequestRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendServiceTest {

    @Mock
    private FriendRequestRepository friendRequestRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserProvider currentUserProvider;
    @Mock
    private NotificationService notificationService;

    private FriendService friendService;

    private User alice;
    private User bob;

    @BeforeEach
    void setUp() {
        friendService = new FriendService(friendRequestRepository, userRepository, currentUserProvider, notificationService);
        alice = User.builder().id(1L).email("alice@example.com").firstName("Alice").lastName("A").build();
        bob = User.builder().id(2L).email("bob@example.com").firstName("Bob").lastName("B").build();

        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(alice);
        lenient().when(friendRequestRepository.save(any(FriendRequest.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void sendRequest_Success_PersistsAndNotifies() {
        SendFriendRequestRequest request = SendFriendRequestRequest.builder().email("bob@example.com").build();
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(bob));
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.empty());

        FriendRequestResponse response = friendService.sendRequest(request);

        assertEquals(FriendRequestStatus.PENDING, response.getStatus());
        assertEquals(1L, response.getRequesterId());
        assertEquals(2L, response.getRecipientId());
        verify(notificationService).notify(eq(bob), eq(NotificationType.FRIEND_REQUEST_RECEIVED), anyString(), anyString(), eq("/friends"));
    }

    @Test
    void sendRequest_ToSelf_ThrowsBadRequest() {
        SendFriendRequestRequest request = SendFriendRequestRequest.builder().email("alice@example.com").build();
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(alice));

        assertThrows(BadRequestException.class, () -> friendService.sendRequest(request));
    }

    @Test
    void sendRequest_UnknownEmail_ThrowsResourceNotFound() {
        SendFriendRequestRequest request = SendFriendRequestRequest.builder().email("nobody@example.com").build();
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> friendService.sendRequest(request));
    }

    @Test
    void sendRequest_AlreadyPending_ThrowsBadRequest() {
        SendFriendRequestRequest request = SendFriendRequestRequest.builder().email("bob@example.com").build();
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(bob));
        FriendRequest existing = FriendRequest.builder().requester(alice).recipient(bob).status(FriendRequestStatus.PENDING).build();
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.of(existing));

        assertThrows(BadRequestException.class, () -> friendService.sendRequest(request));
    }

    @Test
    void sendRequest_AlreadyFriends_ThrowsBadRequest() {
        SendFriendRequestRequest request = SendFriendRequestRequest.builder().email("bob@example.com").build();
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(bob));
        FriendRequest existing = FriendRequest.builder().requester(bob).recipient(alice).status(FriendRequestStatus.ACCEPTED).build();
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.of(existing));

        assertThrows(BadRequestException.class, () -> friendService.sendRequest(request));
    }

    @Test
    void sendRequest_PriorDeclined_AllowsResend() {
        SendFriendRequestRequest request = SendFriendRequestRequest.builder().email("bob@example.com").build();
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(bob));
        FriendRequest declined = FriendRequest.builder().requester(alice).recipient(bob).status(FriendRequestStatus.DECLINED).build();
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.of(declined));

        FriendRequestResponse response = friendService.sendRequest(request);

        assertEquals(FriendRequestStatus.PENDING, response.getStatus());
    }

    @Test
    void acceptRequest_NotRecipient_ThrowsBadRequest() {
        FriendRequest friendRequest = FriendRequest.builder().id(5L).requester(bob).recipient(bob).status(FriendRequestStatus.PENDING).build();
        when(friendRequestRepository.findById(5L)).thenReturn(Optional.of(friendRequest));

        assertThrows(BadRequestException.class, () -> friendService.acceptRequest(5L));
    }

    @Test
    void acceptRequest_Success_UpdatesStatusAndNotifiesRequester() {
        FriendRequest friendRequest = FriendRequest.builder().id(5L).requester(bob).recipient(alice).status(FriendRequestStatus.PENDING).build();
        when(friendRequestRepository.findById(5L)).thenReturn(Optional.of(friendRequest));

        FriendRequestResponse response = friendService.acceptRequest(5L);

        assertEquals(FriendRequestStatus.ACCEPTED, response.getStatus());
        verify(notificationService).notify(eq(bob), eq(NotificationType.FRIEND_REQUEST_ACCEPTED), anyString(), anyString(), eq("/friends"));
    }

    @Test
    void acceptRequest_AlreadyResolved_ThrowsBadRequest() {
        FriendRequest friendRequest = FriendRequest.builder().id(5L).requester(bob).recipient(alice).status(FriendRequestStatus.DECLINED).build();
        when(friendRequestRepository.findById(5L)).thenReturn(Optional.of(friendRequest));

        assertThrows(BadRequestException.class, () -> friendService.acceptRequest(5L));
    }

    @Test
    void declineRequest_Success_SetsDeclined() {
        FriendRequest friendRequest = FriendRequest.builder().id(5L).requester(bob).recipient(alice).status(FriendRequestStatus.PENDING).build();
        when(friendRequestRepository.findById(5L)).thenReturn(Optional.of(friendRequest));

        friendService.declineRequest(5L);

        assertEquals(FriendRequestStatus.DECLINED, friendRequest.getStatus());
    }

    @Test
    void removeFriend_NotFriends_ThrowsBadRequest() {
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> friendService.removeFriend(2L));
    }

    @Test
    void removeFriend_Success_DeletesRow() {
        FriendRequest friendRequest = FriendRequest.builder().id(5L).requester(alice).recipient(bob).status(FriendRequestStatus.ACCEPTED).build();
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.of(friendRequest));

        friendService.removeFriend(2L);

        verify(friendRequestRepository).delete(friendRequest);
    }

    @Test
    void listFriends_MapsToTheOtherUserFromEitherSide() {
        FriendRequest aliceSentToBob = FriendRequest.builder().requester(alice).recipient(bob).status(FriendRequestStatus.ACCEPTED).build();
        Page<FriendRequest> page = new PageImpl<>(List.of(aliceSentToBob));
        when(friendRequestRepository.findAcceptedForUser(eq(1L), any(Pageable.class))).thenReturn(page);

        PaginationRequest request = PaginationRequest.builder().page(1).size(10).sortField("id").direction(Sort.Direction.ASC).build();
        PagingResult<FriendResponse> result = friendService.listFriends(request);

        assertEquals(1, result.getContent().size());
        assertEquals("bob@example.com", result.getContent().iterator().next().getEmail());
    }

    @Test
    void areFriends_AcceptedRow_ReturnsTrue() {
        FriendRequest friendRequest = FriendRequest.builder().requester(alice).recipient(bob).status(FriendRequestStatus.ACCEPTED).build();
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.of(friendRequest));

        assertTrue(friendService.areFriends(1L, 2L));
    }

    @Test
    void areFriends_NoRow_ReturnsFalse() {
        when(friendRequestRepository.findMostRecentBetween(1L, 2L)).thenReturn(Optional.empty());

        assertFalse(friendService.areFriends(1L, 2L));
    }

    @Test
    void searchUsers_ValidQuery_ReturnsMappedResults() {
        when(userRepository.searchByEmailOrName(eq("bob"), eq(1L), any(Pageable.class))).thenReturn(List.of(bob));

        List<FriendResponse> result = friendService.searchUsers("bob");

        assertEquals(1, result.size());
        assertEquals("bob@example.com", result.get(0).getEmail());
        assertEquals(2L, result.get(0).getUserId());
    }

    @Test
    void searchUsers_QueryTooShort_ReturnsEmptyWithoutQuerying() {
        List<FriendResponse> result = friendService.searchUsers("b");

        assertTrue(result.isEmpty());
        verifyNoInteractions(userRepository);
    }

    @Test
    void searchUsers_NullQuery_ReturnsEmpty() {
        List<FriendResponse> result = friendService.searchUsers(null);

        assertTrue(result.isEmpty());
        verifyNoInteractions(userRepository);
    }
}
