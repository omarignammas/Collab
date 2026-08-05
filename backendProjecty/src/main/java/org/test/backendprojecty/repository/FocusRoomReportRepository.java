package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FocusRoomReport;

import java.util.Optional;

@Repository
public interface FocusRoomReportRepository extends JpaRepository<FocusRoomReport, Long> {
    Optional<FocusRoomReport> findByRoomId(Long roomId);
    Optional<FocusRoomReport> findByRoomCode(String code);
}
