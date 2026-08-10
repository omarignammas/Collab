package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.Circle;

@Repository
public interface CircleRepository extends JpaRepository<Circle, Long> {
}
