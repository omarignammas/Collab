package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.Task;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    Page<Task> findByUserId(Long userId, Pageable pageable);
    Page<Task> findByUserIdAndCourseId(Long userId, Long courseId, Pageable pageable);

    @Query("""
            SELECT DISTINCT t FROM Task t
            LEFT JOIN t.course c
            LEFT JOIN CourseMember m ON m.course = c AND m.status = 'ACTIVE'
            WHERE t.user.id = :userId
               OR c.user.id = :userId
               OR m.user.id = :userId
            """)
    Page<Task> findAccessibleTasks(@Param("userId") Long userId, Pageable pageable);
    Optional<Task> findByIdAndUserId(Long id, Long userId);
    long countByCourseIdAndCompleted(Long courseId, boolean completed);
    long countByCourseId(Long courseId);
    boolean existsByTitleAndUserId(String title, Long userId);

    long countByUserIdAndCompletedTrueAndCompletedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    List<Task> findByUserIdAndCompletedTrueAndCompletedAtAfter(Long userId, LocalDateTime completedAfter);

    List<Task> findByUserIdAndCompletedTrueAndCompletedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    @Query("select t.completedAt from Task t where t.user.id = :userId and t.completed = true and t.completedAt is not null")
    List<LocalDateTime> findCompletedTimestampsByUserId(@Param("userId") Long userId);

    List<Task> findByDueDateAndCompletedFalseAndReminderSentFalse(LocalDate dueDate);

    @Query("select t.youtubeVideoId from Task t where t.course.id = :courseId and t.youtubeVideoId is not null")
    List<String> findYoutubeVideoIdsByCourseId(@Param("courseId") Long courseId);

    // Cross-assignee, unlike every other Task query here — the shared team task
    // list needs every task in the course regardless of who it's assigned to.
    Page<Task> findByCourseId(Long courseId, Pageable pageable);

    long countByCourseIdAndUserIdAndCompleted(Long courseId, Long userId, boolean completed);

    long countByUserIdAndCompletedFalseAndDueDateBefore(Long userId, LocalDate date);
    long countByUserIdAndCompletedFalseAndDueDate(Long userId, LocalDate date);
    Optional<Task> findFirstByUserIdAndCompletedTrueOrderByCompletedAtDesc(Long userId);
}
