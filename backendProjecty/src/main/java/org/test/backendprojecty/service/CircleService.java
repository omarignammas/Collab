package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.dtos.request.CreateCircleRequest;
import org.test.backendprojecty.dtos.response.CircleMemberResponse;
import org.test.backendprojecty.dtos.response.CircleResponse;
import org.test.backendprojecty.dtos.response.MomentumResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.CircleMemberRepository;
import org.test.backendprojecty.repository.CircleRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CircleService {

    private final CircleRepository circleRepository;
    private final CircleMemberRepository circleMemberRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final FriendService friendService;
    private final MomentumService momentumService;
    private final NotificationService notificationService;

    @Transactional
    public CircleResponse create(CreateCircleRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Set<Long> invitees = new LinkedHashSet<>(request.getInviteUserIds() == null ? List.of() : request.getInviteUserIds());
        invitees.remove(currentUser.getId());

        Circle circle = circleRepository.save(Circle.builder()
                .name(request.getName().trim())
                .owner(currentUser)
                .build());

        List<CircleMember> members = new ArrayList<>();
        members.add(CircleMember.builder().circle(circle).user(currentUser).status(CircleMemberStatus.ACTIVE).build());
        for (Long userId : invitees) {
            if (!friendService.areFriends(currentUser.getId(), userId)) {
                throw new BadRequestException("You can only invite accepted friends to a Circle");
            }
            User friend = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Friend not found"));
            members.add(CircleMember.builder().circle(circle).user(friend).status(CircleMemberStatus.INVITED).build());
        }
        circleMemberRepository.saveAll(members);

        for (CircleMember member : members) {
            if (member.getStatus() == CircleMemberStatus.INVITED) {
                notificationService.notify(member.getUser(), NotificationType.CIRCLE_INVITE,
                        "Circle invitation", displayName(currentUser) + " invited you to join " + circle.getName(), "/circles");
            }
        }
        return toResponse(circle, CircleMemberStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public List<CircleResponse> listMine() {
        return circleMemberRepository.findMembershipsForUser(currentUserProvider.getCurrentUser().getId()).stream()
                .filter(membership -> membership.getStatus() != CircleMemberStatus.DECLINED)
                .map(membership -> toResponse(membership.getCircle(), membership.getStatus()))
                .toList();
    }

    @Transactional
    public CircleResponse accept(Long circleId) {
        CircleMember membership = requireInvitation(circleId);
        membership.setStatus(CircleMemberStatus.ACTIVE);
        membership.setRespondedAt(LocalDateTime.now());
        circleMemberRepository.save(membership);
        return toResponse(membership.getCircle(), membership.getStatus());
    }

    @Transactional
    public void decline(Long circleId) {
        CircleMember membership = requireInvitation(circleId);
        membership.setStatus(CircleMemberStatus.DECLINED);
        membership.setRespondedAt(LocalDateTime.now());
        circleMemberRepository.save(membership);
    }

    private CircleMember requireInvitation(Long circleId) {
        User currentUser = currentUserProvider.getCurrentUser();
        CircleMember membership = circleMemberRepository.findByCircleIdAndUserId(circleId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Circle invitation not found"));
        if (membership.getStatus() != CircleMemberStatus.INVITED) {
            throw new BadRequestException("This Circle invitation is no longer pending");
        }
        return membership;
    }

    private CircleResponse toResponse(Circle circle, CircleMemberStatus membershipStatus) {
        List<CircleMember> activeMembers = circleMemberRepository
                .findByCircleIdAndStatusOrderByCreatedAtAsc(circle.getId(), CircleMemberStatus.ACTIVE);
        List<CircleMember> pendingMembers = circleMemberRepository
                .findByCircleIdAndStatusOrderByCreatedAtAsc(circle.getId(), CircleMemberStatus.INVITED);
        List<CircleMember> visibleMembers = new ArrayList<>(activeMembers);
        if (circle.getOwner().getId().equals(currentUserProvider.getCurrentUser().getId())) {
            visibleMembers.addAll(pendingMembers);
        }

        List<MomentumResponse> momentums = activeMembers.stream().map(member -> momentumService.getMomentumFor(member.getUser())).toList();
        int collectiveMomentum = momentums.isEmpty() ? 0 : (int) Math.round(momentums.stream().mapToInt(MomentumResponse::getScore).average().orElse(0));
        int completedTasks = momentums.stream().mapToInt(MomentumResponse::getCompletedTasks).sum();
        int focusMinutes = momentums.stream().mapToInt(MomentumResponse::getFocusMinutes).sum();

        return CircleResponse.builder()
                .id(circle.getId())
                .name(circle.getName())
                .ownerId(circle.getOwner().getId())
                .ownerName(displayName(circle.getOwner()))
                .membershipStatus(membershipStatus)
                .collectiveMomentum(collectiveMomentum)
                .activeMemberCount(activeMembers.size())
                .completedTasksThisWeek(completedTasks)
                .focusMinutesThisWeek(focusMinutes)
                .members(visibleMembers.stream().map(member -> CircleMemberResponse.builder()
                        .userId(member.getUser().getId())
                        .displayName(displayName(member.getUser()))
                        .avatarUrl(member.getUser().getAvatarUrl())
                        .status(member.getStatus())
                        .owner(circle.getOwner().getId().equals(member.getUser().getId()))
                        .momentum(member.getStatus() == CircleMemberStatus.ACTIVE ? momentumService.getMomentumFor(member.getUser()) : null)
                        .build()).toList())
                .build();
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
