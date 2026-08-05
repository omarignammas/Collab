package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.AdminStatsResponse;
import org.test.backendprojecty.dtos.response.DailySignupResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.UserResponse;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Reporting-only reads for the small admin dashboard — no writes besides
// deleteUser, so day-count grouping happens in Java rather than a DB-specific
// date-trunc query, keeping this portable between Postgres (dev) and H2 (tests).
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final int TREND_DAYS = 14;

    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public PagingResult<UserResponse> listUsers(PaginationRequest request) {
        Pageable pageable = PaginationUtils.getPageable(request);
        Page<User> page = userRepository.findByEnabledTrue(pageable);

        List<UserResponse> content = page.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return new PagingResult<>(content, page.getTotalPages(), page.getTotalElements(), page.getSize(), page.getNumber(), page.isEmpty());
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse getStats() {
        long totalUsers = userRepository.countByEnabledTrue();

        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        long newUsersToday = userRepository.countByEnabledTrueAndCreatedAtBetween(startOfToday, startOfToday.plusDays(1));

        LocalDateTime cutoff = today.minusDays(TREND_DAYS - 1L).atStartOfDay();
        Map<LocalDate, Long> countsByDay = userRepository.findByEnabledTrueAndCreatedAtAfterOrderByCreatedAtAsc(cutoff).stream()
                .collect(Collectors.groupingBy(u -> u.getCreatedAt().toLocalDate(), Collectors.counting()));

        List<DailySignupResponse> signupsByDay = new ArrayList<>();
        for (int i = TREND_DAYS - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            signupsByDay.add(new DailySignupResponse(day, countsByDay.getOrDefault(day, 0L)));
        }

        return AdminStatsResponse.builder()
                .totalUsers(totalUsers)
                .newUsersToday(newUsersToday)
                .signupsByDay(signupsByDay)
                .build();
    }

    @Transactional
    public void deleteUser(Long userId) {
        User currentUser = currentUserProvider.getCurrentUser();
        if (currentUser.getId().equals(userId)) {
            throw new BadRequestException("You can't delete your own account");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Soft delete — disabling also blocks future logins (SecurityUser.isEnabled()
        // already reads this flag) without touching any of the user's existing data.
        user.setEnabled(false);
        userRepository.save(user);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
