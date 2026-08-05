package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.AdminStatsResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.UserResponse;
import org.test.backendprojecty.entity.Role;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    private AdminService adminService;

    private User admin;
    private User regular;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(userRepository, currentUserProvider);

        admin = User.builder().id(1L).email("demo@projectii.app").firstName("Omaritos").lastName("Igna")
                .role(Role.ADMIN).enabled(true).createdAt(LocalDateTime.now().minusDays(30)).build();
        regular = User.builder().id(2L).email("ada@example.com").firstName("Ada").lastName("Lovelace")
                .role(Role.USER).enabled(true).createdAt(LocalDateTime.now()).build();
    }

    @Test
    void listUsers_Success() {
        PaginationRequest request = PaginationRequest.builder().page(1).size(10).sortField("id").direction(Sort.Direction.ASC).build();
        Pageable pageable = PageRequest.of(0, 10);
        Page<User> userPage = new PageImpl<>(Arrays.asList(admin, regular), pageable, 2);
        when(userRepository.findByEnabledTrue(any(Pageable.class))).thenReturn(userPage);

        PagingResult<UserResponse> result = adminService.listUsers(request);

        assertEquals(2, result.getContent().size());
        UserResponse first = result.getContent().iterator().next();
        assertEquals("demo@projectii.app", first.getEmail());
        assertEquals(Role.ADMIN, first.getRole());
    }

    @Test
    void getStats_ComputesTotalsAndDailyTrend() {
        when(userRepository.countByEnabledTrue()).thenReturn(42L);
        when(userRepository.countByEnabledTrueAndCreatedAtBetween(any(), any())).thenReturn(3L);

        LocalDate today = LocalDate.now();
        List<User> recent = List.of(
                User.builder().id(3L).createdAt(today.atTime(9, 0)).build(),
                User.builder().id(4L).createdAt(today.atTime(10, 0)).build(),
                User.builder().id(5L).createdAt(today.minusDays(2).atTime(9, 0)).build()
        );
        when(userRepository.findByEnabledTrueAndCreatedAtAfterOrderByCreatedAtAsc(any())).thenReturn(recent);

        AdminStatsResponse stats = adminService.getStats();

        assertEquals(42L, stats.getTotalUsers());
        assertEquals(3L, stats.getNewUsersToday());
        assertEquals(14, stats.getSignupsByDay().size());

        long todayCount = stats.getSignupsByDay().stream()
                .filter(d -> d.getDate().equals(today))
                .findFirst().orElseThrow().getCount();
        assertEquals(2L, todayCount);

        long twoDaysAgoCount = stats.getSignupsByDay().stream()
                .filter(d -> d.getDate().equals(today.minusDays(2)))
                .findFirst().orElseThrow().getCount();
        assertEquals(1L, twoDaysAgoCount);
    }

    @Test
    void getStats_NoRecentSignups_TrendIsAllZero() {
        when(userRepository.countByEnabledTrue()).thenReturn(5L);
        when(userRepository.countByEnabledTrueAndCreatedAtBetween(any(), any())).thenReturn(0L);
        when(userRepository.findByEnabledTrueAndCreatedAtAfterOrderByCreatedAtAsc(any())).thenReturn(List.of());

        AdminStatsResponse stats = adminService.getStats();

        assertTrue(stats.getSignupsByDay().stream().allMatch(d -> d.getCount() == 0L));
    }

    @Test
    void deleteUser_Success_DisablesAccount() {
        when(currentUserProvider.getCurrentUser()).thenReturn(admin);
        when(userRepository.findById(2L)).thenReturn(Optional.of(regular));

        adminService.deleteUser(2L);

        assertFalse(regular.isEnabled());
        verify(userRepository).save(regular);
    }

    @Test
    void deleteUser_SelfDelete_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(admin);

        assertThrows(BadRequestException.class, () -> adminService.deleteUser(1L));
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteUser_UserNotFound_ThrowsResourceNotFound() {
        when(currentUserProvider.getCurrentUser()).thenReturn(admin);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminService.deleteUser(99L));
    }
}
