package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FocusTimeEntry;

import java.time.Instant;
import java.util.List;

@Repository
public interface FocusTimeEntryRepository extends JpaRepository<FocusTimeEntry, Long> {
    List<FocusTimeEntry> findByUserIdAndEarnedAtAfter(Long userId, Instant cutoff);

    List<FocusTimeEntry> findByUserIdAndEarnedAtBetween(Long userId, Instant start, Instant end);
}
