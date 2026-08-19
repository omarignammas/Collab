package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.Course;

import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);
    Page<Course> findByUserIdAndDeletedFalse(Long userId, Pageable pageable);
    Page<Course> findByUserIdAndTermIdAndDeletedFalse(Long userId, Long termId, Pageable pageable);
    boolean existsByTitleAndUserId(String title, Long userId);
    long countByUserIdAndDeletedFalse(Long userId);

    @Query("""
            SELECT DISTINCT c FROM Course c
            LEFT JOIN CourseMember m ON m.course = c AND m.status = 'ACTIVE'
            WHERE (c.user.id = :userId OR m.user.id = :userId) AND c.deleted = false
            ORDER BY c.createdAt DESC
            """)
    Page<Course> findByOwnerOrMember(@Param("userId") Long userId, Pageable pageable);
}
