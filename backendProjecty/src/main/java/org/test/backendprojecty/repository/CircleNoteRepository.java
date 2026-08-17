package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.CircleNote;

import java.util.List;

@Repository
public interface CircleNoteRepository extends JpaRepository<CircleNote, Long> {

    List<CircleNote> findByCircleIdOrderByNoteDateDescCreatedAtDesc(Long circleId);
}
