package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FocusMessageType;
import org.test.backendprojecty.entity.FocusRoomMessage;

import java.util.List;

@Repository
public interface FocusRoomMessageRepository extends JpaRepository<FocusRoomMessage, Long> {
    List<FocusRoomMessage> findTop50ByRoomIdOrderByCreatedAtDesc(Long roomId);
    List<FocusRoomMessage> findByRoomIdAndTypeOrderByCreatedAtAsc(Long roomId, FocusMessageType type);
    void deleteByRoomId(Long roomId);
}
