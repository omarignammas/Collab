package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FocusTimeEntry;

import java.time.Instant;
import java.util.List;

@Repository
public interface FocusTimeEntryRepository extends JpaRepository<FocusTimeEntry, Long> {
    List<FocusTimeEntry> findByUserIdAndEarnedAtAfter(Long userId, Instant cutoff);

    List<FocusTimeEntry> findByUserIdAndEarnedAtBetween(Long userId, Instant start, Instant end);

    @Query("select coalesce(sum(f.minutesFocused), 0) from FocusTimeEntry f where f.user.id = :userId")
    int sumMinutesFocusedByUserId(@Param("userId") Long userId);

    @Query("select f.earnedAt from FocusTimeEntry f where f.user.id = :userId")
    List<Instant> findEarnedAtByUserId(@Param("userId") Long userId);
}
