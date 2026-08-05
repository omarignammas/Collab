package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.GenerationStatus;
import org.test.backendprojecty.entity.Quiz;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {
    Optional<Quiz> findByIdAndUserId(Long id, Long userId);
    List<Quiz> findBySummaryIdOrderByCreatedAtAsc(Long summaryId);

    // Scalar projection — bypasses the first-level cache so a CANCELLED status
    // committed by another transaction is visible while this one waits on the LLM call.
    @Query("SELECT q.status FROM Quiz q WHERE q.id = :id")
    GenerationStatus findStatusById(@Param("id") Long id);

    @Query("SELECT COUNT(q) FROM Quiz q WHERE q.summary.id = :summaryId AND q.user.id <> :ownerId")
    long countBySummaryIdAndUserIdNot(@Param("summaryId") Long summaryId, @Param("ownerId") Long ownerId);

    @Query("""
            SELECT DISTINCT q FROM Quiz q
            LEFT JOIN QuizShare sh ON sh.quiz = q
            WHERE (q.user.id = :userId OR sh.sharedWithUser.id = :userId)
            ORDER BY q.createdAt DESC
            """)
    Page<Quiz> findByOwnerOrShared(@Param("userId") Long userId, Pageable pageable);
}
