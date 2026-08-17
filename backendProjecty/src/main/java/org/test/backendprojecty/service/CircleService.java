package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.dtos.request.CircleNoteRequest;
import org.test.backendprojecty.dtos.request.CreateCircleRequest;
import org.test.backendprojecty.dtos.request.UpdateCircleRequest;
import org.test.backendprojecty.dtos.response.CircleMemberResponse;
import org.test.backendprojecty.dtos.response.CircleNoteResponse;
import org.test.backendprojecty.dtos.response.CircleResponse;
import org.test.backendprojecty.dtos.response.MomentumResponse;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.CircleMemberRepository;
import org.test.backendprojecty.repository.CircleNoteRepository;
import org.test.backendprojecty.repository.CircleRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CircleService {

    private final CircleRepository circleRepository;
    private final CircleMemberRepository circleMemberRepository;
    private final CircleNoteRepository circleNoteRepository;
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
                .members(visibleMembers.stream().map(member -> CircleMemberResponse.builder()
                        .userId(member.getUser().getId())
                        .displayName(displayName(member.getUser()))
                        .avatarUrl(member.getUser().getAvatarUrl())
                        .status(member.getStatus())
                        .owner(circle.getOwner().getId().equals(member.getUser().getId()))
                        .focusMinutesThisWeek(member.getStatus() == CircleMemberStatus.ACTIVE
                                ? momentumByUserId.get(member.getUser().getId()).getFocusMinutes() : 0)
                        .build()).toList())
                .createdAt(circle.getCreatedAt())
                .build();
    }

    @Transactional
    public CircleNoteResponse addNote(Long circleId, CircleNoteRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        requireActiveMember(circleId, currentUser.getId());
        Circle circle = circleRepository.findById(circleId)
                .orElseThrow(() -> new ResourceNotFoundException("Circle not found"));

        CircleNote note = circleNoteRepository.save(CircleNote.builder()
                .circle(circle)
                .author(currentUser)
                .type(request.getType())
                .body(request.getBody().trim())
                .noteDate(LocalDate.now())
                .build());
        return toNoteResponse(note, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public List<CircleNoteResponse> listNotes(Long circleId) {
        Long currentUserId = currentUserProvider.getCurrentUser().getId();
        requireActiveMember(circleId, currentUserId);
        return circleNoteRepository.findByCircleIdOrderByNoteDateDescCreatedAtDesc(circleId).stream()
                .map(note -> toNoteResponse(note, currentUserId))
                .toList();
    }

    @Transactional
    public void deleteNote(Long circleId, Long noteId) {
        User currentUser = currentUserProvider.getCurrentUser();
        requireActiveMember(circleId, currentUser.getId());
        CircleNote note = circleNoteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        if (!note.getCircle().getId().equals(circleId)) {
            throw new ResourceNotFoundException("Note not found");
        }
        boolean isAuthor = note.getAuthor().getId().equals(currentUser.getId());
        boolean isOwner = note.getCircle().getOwner().getId().equals(currentUser.getId());
        if (!isAuthor && !isOwner) {
            throw new BadRequestException("Only the author or the Circle owner can delete this note");
        }
        circleNoteRepository.delete(note);
    }

    private void requireActiveMember(Long circleId, Long userId) {
        CircleMember membership = circleMemberRepository.findByCircleIdAndUserId(circleId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Circle not found"));
        if (membership.getStatus() != CircleMemberStatus.ACTIVE) {
            throw new BadRequestException("You're not an active member of this Circle");
        }
    }

    private CircleNoteResponse toNoteResponse(CircleNote note, Long currentUserId) {
        return CircleNoteResponse.builder()
                .id(note.getId())
                .authorId(note.getAuthor().getId())
                .authorName(displayName(note.getAuthor()))
                .authorAvatarUrl(note.getAuthor().getAvatarUrl())
                .type(note.getType())
                .body(note.getBody())
                .noteDate(note.getNoteDate())
                .createdAt(note.getCreatedAt())
                .mine(note.getAuthor().getId().equals(currentUserId))
                .build();
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
