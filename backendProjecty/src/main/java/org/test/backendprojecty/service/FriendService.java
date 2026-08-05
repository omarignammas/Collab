package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationService notificationService;

    @Transactional
    public FriendRequestResponse sendRequest(SendFriendRequestRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        User recipient = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No user found with that email"));

        if (recipient.getId().equals(currentUser.getId())) {
            throw new BadRequestException("You can't send a friend request to yourself");
        }

        friendRequestRepository.findMostRecentBetween(currentUser.getId(), recipient.getId())
                .filter(fr -> fr.getStatus() != FriendRequestStatus.DECLINED)
                .ifPresent(fr -> {
                    throw new BadRequestException(fr.getStatus() == FriendRequestStatus.ACCEPTED
                            ? "You're already friends" : "A friend request is already pending");
                });

        FriendRequest friendRequest = FriendRequest.builder()
                .requester(currentUser)
                .recipient(recipient)
                .status(FriendRequestStatus.PENDING)
                .build();
        friendRequest = friendRequestRepository.save(friendRequest);

        notificationService.notify(recipient, NotificationType.FRIEND_REQUEST_RECEIVED,
                "New friend request", displayName(currentUser) + " sent you a friend request", "/friends");

        return toRequestResponse(friendRequest);
    }

    @Transactional
    public FriendRequestResponse acceptRequest(Long requestId) {
        User currentUser = currentUserProvider.getCurrentUser();
        FriendRequest friendRequest = requirePendingAsRecipient(requestId, currentUser);

        friendRequest.setStatus(FriendRequestStatus.ACCEPTED);
        friendRequestRepository.save(friendRequest);

        notificationService.notify(friendRequest.getRequester(), NotificationType.FRIEND_REQUEST_ACCEPTED,
                "Friend request accepted", displayName(currentUser) + " accepted your friend request", "/friends");

        return toRequestResponse(friendRequest);
    }

    @Transactional
    public void declineRequest(Long requestId) {
        User currentUser = currentUserProvider.getCurrentUser();
        FriendRequest friendRequest = requirePendingAsRecipient(requestId, currentUser);

        friendRequest.setStatus(FriendRequestStatus.DECLINED);
        friendRequestRepository.save(friendRequest);
    }

    @Transactional
    public void removeFriend(Long friendUserId) {
        User currentUser = currentUserProvider.getCurrentUser();
        FriendRequest friendRequest = friendRequestRepository
                .findMostRecentBetween(currentUser.getId(), friendUserId)
                .filter(fr -> fr.getStatus() == FriendRequestStatus.ACCEPTED)
                .orElseThrow(() -> new BadRequestException("You're not friends with this user"));

        friendRequestRepository.delete(friendRequest);
    }

    @Transactional(readOnly = true)
    public List<FriendRequestResponse> listIncoming() {
        User currentUser = currentUserProvider.getCurrentUser();
        return friendRequestRepository.findByRecipientIdAndStatus(currentUser.getId(), FriendRequestStatus.PENDING)
                .stream().map(this::toRequestResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FriendRequestResponse> listOutgoing() {
        User currentUser = currentUserProvider.getCurrentUser();
        return friendRequestRepository.findByRequesterIdAndStatus(currentUser.getId(), FriendRequestStatus.PENDING)
                .stream().map(this::toRequestResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PagingResult<FriendResponse> listFriends(PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Pageable pageable = PaginationUtils.getPageable(request);
        Page<FriendRequest> page = friendRequestRepository.findAcceptedForUser(currentUser.getId(), pageable);

        List<FriendResponse> content = page.getContent().stream()
                .map(fr -> toFriendResponse(otherUser(fr, currentUser.getId())))
                .collect(Collectors.toList());

        return new PagingResult<>(content, page.getTotalPages(), page.getTotalElements(), page.getSize(), page.getNumber(), page.isEmpty());
    }

    @Transactional(readOnly = true)
    public List<FriendResponse> searchUsers(String query) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        return userRepository.searchByEmailOrName(query.trim(), currentUser.getId(), PageRequest.of(0, 8))
                .stream().map(this::toFriendResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean areFriends(Long userId1, Long userId2) {
        return friendRequestRepository.findMostRecentBetween(userId1, userId2)
                .map(fr -> fr.getStatus() == FriendRequestStatus.ACCEPTED)
                .orElse(false);
    }

    private FriendRequest requirePendingAsRecipient(Long requestId, User currentUser) {
        FriendRequest friendRequest = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Friend request not found"));

        if (!friendRequest.getRecipient().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the recipient can respond to this request");
        }
        if (friendRequest.getStatus() != FriendRequestStatus.PENDING) {
            throw new BadRequestException("This request is no longer pending");
        }
        return friendRequest;
    }

    private User otherUser(FriendRequest friendRequest, Long currentUserId) {
        return friendRequest.getRequester().getId().equals(currentUserId)
                ? friendRequest.getRecipient()
                : friendRequest.getRequester();
    }

    private FriendRequestResponse toRequestResponse(FriendRequest friendRequest) {
        return FriendRequestResponse.builder()
                .id(friendRequest.getId())
                .requesterId(friendRequest.getRequester().getId())
                .requesterName(displayName(friendRequest.getRequester()))
                .requesterEmail(friendRequest.getRequester().getEmail())
                .recipientId(friendRequest.getRecipient().getId())
                .recipientName(displayName(friendRequest.getRecipient()))
                .recipientEmail(friendRequest.getRecipient().getEmail())
                .status(friendRequest.getStatus())
                .createdAt(friendRequest.getCreatedAt())
                .build();
    }

    private FriendResponse toFriendResponse(User user) {
        return FriendResponse.builder()
                .userId(user.getId())
                .displayName(displayName(user))
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
