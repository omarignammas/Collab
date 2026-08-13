package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.dtos.request.CreateCircleRequest;
import org.test.backendprojecty.dtos.request.UpdateCircleRequest;
import org.test.backendprojecty.dtos.response.CircleBadgeResponse;
import org.test.backendprojecty.dtos.response.CircleMemberResponse;
import org.test.backendprojecty.dtos.response.CircleRecognitionResponse;
import org.test.backendprojecty.dtos.response.CircleResponse;
import org.test.backendprojecty.dtos.response.MomentumResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.CircleMemberRepository;
import org.test.backendprojecty.repository.CircleRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.ToIntFunction;

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
    public CircleResponse update(Long circleId, UpdateCircleRequest request) {
        Circle circle = requireOwnedCircle(circleId);
        circle.setName(request.getName().trim());
        circleRepository.save(circle);
        return toResponse(circle, CircleMemberStatus.ACTIVE);
    }

    @Transactional
    public CircleResponse inviteMembers(Long circleId, List<Long> requestedUserIds) {
        Circle circle = requireOwnedCircle(circleId);
        User owner = currentUserProvider.getCurrentUser();
        Set<Long> inviteeIds = new LinkedHashSet<>(requestedUserIds == null ? List.of() : requestedUserIds);
        inviteeIds.remove(owner.getId());

        List<CircleMember> memberships = circleMemberRepository.findByCircleIdOrderByCreatedAtAsc(circleId);
        Set<Long> involvedUserIds = memberships.stream()
                .filter(member -> member.getStatus() != CircleMemberStatus.DECLINED)
                .map(member -> member.getUser().getId())
                .collect(java.util.stream.Collectors.toSet());
        long newInviteCount = inviteeIds.stream().filter(userId -> !involvedUserIds.contains(userId)).count();
        if (involvedUserIds.size() + newInviteCount > 8) {
            throw new BadRequestException("A Circle can have up to 8 people including you");
        }

        for (Long userId : inviteeIds) {
            if (!friendService.areFriends(owner.getId(), userId)) {
                throw new BadRequestException("You can only invite accepted friends to a Circle");
            }
            CircleMember existing = memberships.stream()
                    .filter(member -> member.getUser().getId().equals(userId))
                    .findFirst()
                    .orElse(null);
            if (existing != null && existing.getStatus() != CircleMemberStatus.DECLINED) {
                continue;
            }

            User friend = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Friend not found"));
            CircleMember membership;
            if (existing != null) {
                existing.setStatus(CircleMemberStatus.INVITED);
                existing.setRespondedAt(null);
                membership = circleMemberRepository.save(existing);
            } else {
                membership = circleMemberRepository.save(CircleMember.builder()
                        .circle(circle)
                        .user(friend)
                        .status(CircleMemberStatus.INVITED)
                        .build());
                memberships.add(membership);
            }
            notificationService.notify(friend, NotificationType.CIRCLE_INVITE,
                    "Circle invitation", displayName(owner) + " invited you to join " + circle.getName(), "/circles");
        }
        return toResponse(circle, CircleMemberStatus.ACTIVE);
    }

    @Transactional
    public CircleResponse removeMember(Long circleId, Long userId) {
        Circle circle = requireOwnedCircle(circleId);
        if (circle.getOwner().getId().equals(userId)) {
            throw new BadRequestException("The Circle owner cannot be removed");
        }
        CircleMember membership = circleMemberRepository.findByCircleIdAndUserId(circleId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Circle member not found"));
        circleMemberRepository.delete(membership);
        return toResponse(circle, CircleMemberStatus.ACTIVE);
    }

    @Transactional
    public void delete(Long circleId) {
        Circle circle = requireOwnedCircle(circleId);
        circleMemberRepository.deleteByCircleId(circleId);
        circleRepository.delete(circle);
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

    private Circle requireOwnedCircle(Long circleId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Circle circle = circleRepository.findById(circleId)
                .orElseThrow(() -> new ResourceNotFoundException("Circle not found"));
        if (!circle.getOwner().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Only the Circle owner can manage it");
        }
        return circle;
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

        LocalDate currentWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        Map<Long, MomentumResponse> momentumByUserId = activeMembers.stream().collect(java.util.stream.Collectors.toMap(
                member -> member.getUser().getId(),
                member -> momentumService.getMomentumForWeek(member.getUser(), currentWeekStart)
        ));
        Map<Long, MomentumResponse> previousMomentumByUserId = activeMembers.stream().collect(java.util.stream.Collectors.toMap(
                member -> member.getUser().getId(),
                member -> momentumService.getMomentumForWeek(member.getUser(), currentWeekStart.minusWeeks(1))
        ));
        List<MomentumResponse> momentums = new ArrayList<>(momentumByUserId.values());
        int collectiveMomentum = momentums.isEmpty() ? 0 : (int) Math.round(momentums.stream().mapToInt(MomentumResponse::getScore).average().orElse(0));
        int completedTasks = momentums.stream().mapToInt(MomentumResponse::getCompletedTasks).sum();
        int focusMinutes = momentums.stream().mapToInt(MomentumResponse::getFocusMinutes).sum();
        int activeDays = momentums.stream().mapToInt(MomentumResponse::getActiveDays).sum();
        int quizAttempts = momentums.stream().mapToInt(MomentumResponse::getQuizAttempts).sum();

        return CircleResponse.builder()
                .id(circle.getId())
                .name(circle.getName())
                .ownerId(circle.getOwner().getId())
                .ownerName(displayName(circle.getOwner()))
                .membershipStatus(membershipStatus)
                .collectiveMomentum(collectiveMomentum)
                .activeMemberCount(activeMembers.size())
                .pendingMemberCount(pendingMembers.size())
                .completedTasksThisWeek(completedTasks)
                .focusMinutesThisWeek(focusMinutes)
                .activeDaysThisWeek(activeDays)
                .quizAttemptsThisWeek(quizAttempts)
                .weeklyRecognitions(buildRecognitions(activeMembers, momentumByUserId, previousMomentumByUserId))
                .ecosystemBadges(buildBadges(activeMembers.size(), collectiveMomentum,
                        completedTasks, focusMinutes, quizAttempts))
                .members(visibleMembers.stream().map(member -> CircleMemberResponse.builder()
                        .userId(member.getUser().getId())
                        .displayName(displayName(member.getUser()))
                        .avatarUrl(member.getUser().getAvatarUrl())
                        .status(member.getStatus())
                        .owner(circle.getOwner().getId().equals(member.getUser().getId()))
                        .build()).toList())
                .createdAt(circle.getCreatedAt())
                .build();
    }

    private List<CircleRecognitionResponse> buildRecognitions(
            List<CircleMember> members,
            Map<Long, MomentumResponse> current,
            Map<Long, MomentumResponse> previous
    ) {
        return List.of(
                recognition("consistent", "Most consistent", members,
                        member -> current.get(member.getUser().getId()).getActiveDays(),
                        "Kept a steady rhythm across the week."),
                recognition("teammate", "Best teammate", members,
                        member -> current.get(member.getUser().getId()).getFocusPoints()
                                + current.get(member.getUser().getId()).getConsistencyPoints(),
                        "Showed up reliably for the Circle's rhythm."),
                recognition("comeback", "Biggest comeback", members,
                        member -> current.get(member.getUser().getId()).getScore()
                                - previous.get(member.getUser().getId()).getScore(),
                        "Made the strongest week-over-week return."),
                recognition("helpful", "Most helpful", members,
                        member -> current.get(member.getUser().getId()).getQuizPoints()
                                + Math.min(10, current.get(member.getUser().getId()).getTaskPoints() / 2),
                        "Created the strongest learning and support signal."),
                recognition("finisher", "Strongest finisher", members,
                        member -> current.get(member.getUser().getId()).getCompletedTasks(),
                        "Turned the most commitments into finished work.")
        );
    }

    private CircleRecognitionResponse recognition(
            String key,
            String title,
            List<CircleMember> members,
            ToIntFunction<CircleMember> score,
            String reason
    ) {
        CircleMember winner = members.stream()
                .filter(member -> score.applyAsInt(member) > 0)
                .max(Comparator.comparingInt(score))
                .orElse(null);

        return CircleRecognitionResponse.builder()
                .key(key)
                .title(title)
                .memberId(winner == null ? null : winner.getUser().getId())
                .memberName(winner == null ? null : displayName(winner.getUser()))
                .avatarUrl(winner == null ? null : winner.getUser().getAvatarUrl())
                .reason(winner == null ? "Waiting for this week's shared signal." : reason)
                .unlocked(winner != null)
                .build();
    }

    private List<CircleBadgeResponse> buildBadges(
            int activeMembers,
            int collectiveMomentum,
            int completedTasks,
            int focusMinutes,
            int quizAttempts
    ) {
        return List.of(
                badge("founding-circle", "Founding Circle", "Created a trusted space in Collab.", 1, 1),
                badge("full-circle", "Full Circle", "Bring three trusted people into the rhythm.", activeMembers, 3),
                badge("focus-pact", "Focus Pact", "Protect two collective focus hours in one week.", focusMinutes, 120),
                badge("finish-line", "Finish Line", "Complete five commitments together in one week.", completedTasks, 5),
                badge("learning-loop", "Learning Loop", "Complete five review sessions in one week.", quizAttempts, 5),
                badge("momentum-70", "Momentum 70", "Reach 70% collective momentum in one week.", collectiveMomentum, 70)
        );
    }

    private CircleBadgeResponse badge(String key, String name, String description, int progress, int goal) {
        return CircleBadgeResponse.builder()
                .key(key)
                .name(name)
                .description(description)
                .earned(progress >= goal)
                .progress(Math.min(progress, goal))
                .goal(goal)
                .build();
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
