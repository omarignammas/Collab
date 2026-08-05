package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.CourseSummary;
import org.test.backendprojecty.entity.GenerationStatus;

import java.util.Optional;

@Repository
public interface CourseSummaryRepository extends JpaRepository<CourseSummary, Long> {
    Optional<CourseSummary> findByIdAndUserId(Long id, Long userId);

    // A scalar projection bypasses the first-level cache, unlike a byId entity
    // lookup — needed to see a CANCELLED status committed by another transaction
    // while this one was blocked on the LLM call.
    @Query("SELECT s.status FROM CourseSummary s WHERE s.id = :id")
    GenerationStatus findStatusById(@Param("id") Long id);

    @Query("""
            SELECT DISTINCT s FROM CourseSummary s
            LEFT JOIN SummaryShare sh ON sh.summary = s
            WHERE (s.user.id = :userId OR sh.sharedWithUser.id = :userId)
            ORDER BY s.createdAt DESC
            """)
    Page<CourseSummary> findByOwnerOrShared(@Param("userId") Long userId, Pageable pageable);
}
