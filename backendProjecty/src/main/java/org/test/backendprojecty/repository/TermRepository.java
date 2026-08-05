package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.Term;

import java.util.Optional;

@Repository
public interface TermRepository extends JpaRepository<Term, Long> {
    Optional<Term> findByIdAndUserId(Long id, Long userId);
    Page<Term> findByUserId(Long userId, Pageable pageable);
    boolean existsByNameAndUserId(String name, Long userId);
}
