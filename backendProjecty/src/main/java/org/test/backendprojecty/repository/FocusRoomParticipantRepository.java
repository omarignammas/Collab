package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FocusRoomParticipant;

import java.util.List;
import java.util.Optional;

@Repository
public interface FocusRoomParticipantRepository extends JpaRepository<FocusRoomParticipant, Long> {
    Optional<FocusRoomParticipant> findByRoomIdAndUserId(Long roomId, Long userId);
    Optional<FocusRoomParticipant> findByRoomCodeAndUserId(String roomCode, Long userId);
    List<FocusRoomParticipant> findByRoomIdOrderByCreatedAtAsc(Long roomId);
}
