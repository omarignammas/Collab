package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.QuizAttempt;

import java.util.List;
import java.time.LocalDateTime;

// Deliberately no bare findByQuizId(...) — every finder is scoped by
// (quizId, userId) so a "no score comparison between friends" leak can't
// happen by habit-driven query naming. See QuizAttempt's class comment.
@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findByQuizIdAndUserIdOrderByCompletedAtDesc(Long quizId, Long userId);

    List<QuizAttempt> findByUserIdAndCompletedAtAfter(Long userId, LocalDateTime completedAfter);

    List<QuizAttempt> findByUserIdAndCompletedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    // Bulk delete only (cascade cleanup when a quiz/summary is deleted) — does
    // not return attempt data, so it doesn't reopen the cross-user leak the
    // finder above is deliberately scoped to avoid.
    void deleteByQuizId(Long quizId);
}
