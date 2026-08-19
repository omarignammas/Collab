package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.dtos.request.UpdateMissionRequest;
import org.test.backendprojecty.dtos.response.*;
import org.test.backendprojecty.entity.*;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.*;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private static final int CADENCE_WEEKS = 12;
    private static final int DAILIES_WINDOW_DAYS = 30;
    private static final int RECENT_SHIPPED_LIMIT = 6;
    private static final int WHERE_WORK_GOES_LIMIT = 8;

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final FocusTimeEntryRepository focusTimeEntryRepository;
    private final CourseRepository courseRepository;
    private final CircleMemberRepository circleMemberRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(Long targetUserId) {
        User currentUser = currentUserProvider.getCurrentUser();
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean isOwnProfile = target.getId().equals(currentUser.getId());

        Set<Long> sharedCircleIds = isOwnProfile ? null : sharedActiveCircleIds(currentUser.getId(), target.getId());
        if (!isOwnProfile && sharedCircleIds.isEmpty()) {
            throw new BadRequestException("This profile isn't visible to you");
        }

        List<Task> completedTasks = taskRepository.findByUserIdAndCompletedTrueOrderByCompletedAtDesc(target.getId());
        int focusedMinutes = focusTimeEntryRepository.sumMinutesFocusedByUserId(target.getId());
        List<Instant> focusEarnedAt = focusTimeEntryRepository.findEarnedAtByUserId(target.getId());

        return ProfileResponse.builder()
                .userId(target.getId())
                .firstName(target.getFirstName())
                .lastName(target.getLastName())
                .email(target.getEmail())
                .avatarUrl(target.getAvatarUrl())
                .builderNumber((int) userRepository.countBuilderRankUpTo(target.getId()))
                .mission(target.getMission())
                .openToChat(target.isOpenToChat())
                .ownProfile(isOwnProfile)
                .stats(buildStats(target, completedTasks, focusedMinutes, focusEarnedAt))
                .shippingCadence(buildCadence(completedTasks))
                .whereWorkGoes(buildWhereWorkGoes(completedTasks))
                .recentlyShipped(buildRecentlyShipped(completedTasks))
                .circle(buildCircle(target.getId(), isOwnProfile ? null : sharedCircleIds))
                .build();
    }

    @Transactional
    public ProfileResponse updateMyProfile(UpdateMissionRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        currentUser.setMission(request.getMission() == null ? null : request.getMission().trim());
        currentUser.setOpenToChat(request.isOpenToChat());
        userRepository.save(currentUser);
        return getProfile(currentUser.getId());
    }

    private Set<Long> sharedActiveCircleIds(Long userAId, Long userBId) {
        Set<Long> aCircles = activeCircleIds(userAId);
        Set<Long> bCircles = activeCircleIds(userBId);
        aCircles.retainAll(bCircles);
        return aCircles;
    }

    private Set<Long> activeCircleIds(Long userId) {
        return circleMemberRepository.findMembershipsForUser(userId).stream()
                .filter(m -> m.getStatus() == CircleMemberStatus.ACTIVE)
                .map(m -> m.getCircle().getId())
                .collect(Collectors.toSet());
    }

    private ProfileStatsResponse buildStats(User target, List<Task> completedTasks, int focusedMinutes, List<Instant> focusEarnedAt) {
        Set<LocalDate> activeDays = new HashSet<>();
        completedTasks.stream()
                .map(Task::getCompletedAt)
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalDate)
                .forEach(activeDays::add);
        focusEarnedAt.stream()
                .map(instant -> instant.atZone(ZoneId.systemDefault()).toLocalDate())
                .forEach(activeDays::add);

        LocalDate today = LocalDate.now();
        int dayStreak = 0;
        LocalDate cursor = today;
        while (activeDays.contains(cursor)) {
            dayStreak++;
            cursor = cursor.minusDays(1);
        }

        LocalDate windowStart = today.minusDays(DAILIES_WINDOW_DAYS - 1L);
        long activeInWindow = activeDays.stream().filter(day -> !day.isBefore(windowStart) && !day.isAfter(today)).count();
        int dailiesPercent = (int) Math.round((activeInWindow * 100.0) / DAILIES_WINDOW_DAYS);

        List<Task> withDueDate = completedTasks.stream().filter(t -> t.getDueDate() != null && t.getCompletedAt() != null).toList();
        int onTimePercent = withDueDate.isEmpty() ? 100 : (int) Math.round(
                withDueDate.stream().filter(t -> !t.getCompletedAt().toLocalDate().isAfter(t.getDueDate())).count() * 100.0 / withDueDate.size());

        return ProfileStatsResponse.builder()
                .shipped(completedTasks.size())
                .focusedHours(Math.round((focusedMinutes / 60.0) * 10) / 10.0)
                .dailiesPercent(Math.min(100, dailiesPercent))
                .onTimePercent(onTimePercent)
                .dayStreak(dayStreak)
                .projectsCount((int) courseRepository.countByUserIdAndDeletedFalse(target.getId()))
                .build();
    }

    private List<WeeklyCadenceResponse> buildCadence(List<Task> completedTasks) {
        LocalDate currentWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);
        Map<LocalDate, Integer> countsByWeekStart = new HashMap<>();
        for (Task task : completedTasks) {
            if (task.getCompletedAt() == null) continue;
            LocalDate weekStart = task.getCompletedAt().toLocalDate().with(DayOfWeek.MONDAY);
            countsByWeekStart.merge(weekStart, 1, Integer::sum);
        }

        List<WeeklyCadenceResponse> weeks = new ArrayList<>();
        for (int i = CADENCE_WEEKS - 1; i >= 0; i--) {
            LocalDate weekStart = currentWeekStart.minusWeeks(i);
            weeks.add(WeeklyCadenceResponse.builder()
                    .weekLabel(weekStart.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + weekStart.getDayOfMonth())
                    .shippedCount(countsByWeekStart.getOrDefault(weekStart, 0))
                    .currentWeek(i == 0)
                    .build());
        }
        return weeks;
    }

    private List<ProjectBreakdownResponse> buildWhereWorkGoes(List<Task> completedTasks) {
        if (completedTasks.isEmpty()) return List.of();

        record ProjectKey(String title, String colorTag) {}
        Map<ProjectKey, Integer> counts = new LinkedHashMap<>();
        for (Task task : completedTasks) {
            Course course = task.getCourse();
            ProjectKey key = course != null
                    ? new ProjectKey(course.getTitle(), course.getColorTag())
                    : new ProjectKey("Unsorted", null);
            counts.merge(key, 1, Integer::sum);
        }

        int total = completedTasks.size();
        return counts.entrySet().stream()
                .sorted((a, b) -> b.getValue() - a.getValue())
                .limit(WHERE_WORK_GOES_LIMIT)
                .map(entry -> ProjectBreakdownResponse.builder()
                        .title(entry.getKey().title())
                        .colorTag(entry.getKey().colorTag())
                        .shippedCount(entry.getValue())
                        .percent((int) Math.round(entry.getValue() * 100.0 / total))
                        .build())
                .toList();
    }

    private List<ShippedItemResponse> buildRecentlyShipped(List<Task> completedTasks) {
        return completedTasks.stream()
                .limit(RECENT_SHIPPED_LIMIT)
                .map(task -> ShippedItemResponse.builder()
                        .title(task.getTitle())
                        .projectTitle(task.getCourse() != null ? task.getCourse().getTitle() : null)
                        .projectColorTag(task.getCourse() != null ? task.getCourse().getColorTag() : null)
                        .completedAt(task.getCompletedAt())
                        .build())
                .toList();
    }

    private ProfileCircleResponse buildCircle(Long targetUserId, Set<Long> restrictToCircleIds) {
        List<CircleMember> memberships = circleMemberRepository.findMembershipsForUser(targetUserId).stream()
                .filter(m -> m.getStatus() == CircleMemberStatus.ACTIVE)
                .filter(m -> restrictToCircleIds == null || restrictToCircleIds.contains(m.getCircle().getId()))
                .toList();
        if (memberships.isEmpty()) return null;

        Circle circle = memberships.get(0).getCircle();
        List<CircleMember> allMembers = circleMemberRepository
                .findByCircleIdAndStatusOrderByCreatedAtAsc(circle.getId(), CircleMemberStatus.ACTIVE);

        return ProfileCircleResponse.builder()
                .id(circle.getId())
                .name(circle.getName())
                .members(allMembers.stream()
                        .map(m -> ProfileCircleMemberResponse.builder()
                                .userId(m.getUser().getId())
                                .displayName(m.getUser().getFirstName() + " " + m.getUser().getLastName())
                                .avatarUrl(m.getUser().getAvatarUrl())
                                .self(m.getUser().getId().equals(targetUserId))
                                .build())
                        .toList())
                .build();
    }
}
