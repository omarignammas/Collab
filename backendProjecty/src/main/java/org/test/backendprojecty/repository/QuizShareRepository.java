package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.QuizShare;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizShareRepository extends JpaRepository<QuizShare, Long> {
    Optional<QuizShare> findByQuizIdAndSharedWithUserId(Long quizId, Long sharedWithUserId);
    List<QuizShare> findByQuizIdOrderByCreatedAtAsc(Long quizId);
    boolean existsByQuizIdAndSharedWithUserId(Long quizId, Long sharedWithUserId);
    void deleteByQuizId(Long quizId);
}
