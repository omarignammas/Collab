package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FocusRoom;

import java.util.Optional;

@Repository
public interface FocusRoomRepository extends JpaRepository<FocusRoom, Long> {
    Optional<FocusRoom> findByCode(String code);
    boolean existsByCode(String code);

    @Query("""
            SELECT DISTINCT r FROM FocusRoom r
            LEFT JOIN FocusRoomParticipant p ON p.room = r
            WHERE r.host.id = :userId OR p.user.id = :userId
            ORDER BY r.createdAt DESC
            """)
    Page<FocusRoom> findByHostOrParticipant(@Param("userId") Long userId, Pageable pageable);
}
