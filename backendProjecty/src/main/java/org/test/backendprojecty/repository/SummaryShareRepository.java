package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.SummaryShare;

import java.util.List;
import java.util.Optional;

@Repository
public interface SummaryShareRepository extends JpaRepository<SummaryShare, Long> {
    Optional<SummaryShare> findBySummaryIdAndSharedWithUserId(Long summaryId, Long sharedWithUserId);
    List<SummaryShare> findBySummaryIdOrderByCreatedAtAsc(Long summaryId);
    boolean existsBySummaryIdAndSharedWithUserId(Long summaryId, Long sharedWithUserId);
}
