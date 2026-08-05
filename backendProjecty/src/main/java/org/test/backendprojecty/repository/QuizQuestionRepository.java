package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.QuizQuestion;

import java.util.List;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByQuizIdOrderByPositionAsc(Long quizId);
    void deleteByQuizId(Long quizId);
}
