package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.User;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    // Friend-search typeahead — matches partial email or full name, live as the user types.
    @Query("""
            SELECT u FROM User u
            WHERE u.enabled = true AND u.id <> :excludeUserId AND (
                LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :query, '%'))
            )
            ORDER BY u.firstName ASC, u.lastName ASC
            """)
    List<User> searchByEmailOrName(@Param("query") String query, @Param("excludeUserId") Long excludeUserId, Pageable pageable);

    // "Deleting" a user from the admin panel just disables the account (same field
    // Spring Security's UserDetails.isEnabled() already checks) — a hard delete would
    // hit FK constraints from tasks, notes, notifications, friend requests, and focus
    // room participation, none of which cascade from User.
    Page<User> findByEnabledTrue(Pageable pageable);
    long countByEnabledTrue();
    long countByEnabledTrueAndCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<User> findByEnabledTrueAndCreatedAtAfterOrderByCreatedAtAsc(LocalDateTime cutoff);
}
