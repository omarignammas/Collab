package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.test.backendprojecty.entity.GenerationStatus;
import org.test.backendprojecty.entity.TaskPlanGeneration;

import java.util.Optional;

public interface TaskPlanGenerationRepository extends JpaRepository<TaskPlanGeneration, Long> {
    Optional<TaskPlanGeneration> findByIdAndCourseId(Long id, Long courseId);

    // Scalar projection — bypasses the first-level cache, same reasoning as the
    // equivalent guard in CourseSummaryRepository/QuizRepository.
    @Query("SELECT p.status FROM TaskPlanGeneration p WHERE p.id = :id")
    GenerationStatus findStatusById(@Param("id") Long id);
}
