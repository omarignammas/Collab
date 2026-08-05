package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.CourseMember;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseMemberRepository extends JpaRepository<CourseMember, Long> {
    Optional<CourseMember> findByCourseIdAndUserId(Long courseId, Long userId);
    List<CourseMember> findByCourseIdOrderByCreatedAtAsc(Long courseId);
}
