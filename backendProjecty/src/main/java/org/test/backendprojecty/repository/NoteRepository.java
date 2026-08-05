package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.Note;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    Optional<Note> findByIdAndUserId(Long id, Long userId);
    Page<Note> findByUserId(Long userId, Pageable pageable);
    List<Note> findByRoomIdOrderByCreatedAtAsc(Long roomId);
}
