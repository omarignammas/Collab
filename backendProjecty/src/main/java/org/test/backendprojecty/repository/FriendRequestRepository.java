package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.FriendRequest;
import org.test.backendprojecty.entity.FriendRequestStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    @Query("""
            SELECT fr FROM FriendRequest fr
            WHERE (fr.requester.id = :userId AND fr.recipient.id = :otherId)
               OR (fr.requester.id = :otherId AND fr.recipient.id = :userId)
            ORDER BY fr.createdAt DESC
            """)
    Optional<FriendRequest> findMostRecentBetween(@Param("userId") Long userId, @Param("otherId") Long otherId);

    List<FriendRequest> findByRecipientIdAndStatus(Long recipientId, FriendRequestStatus status);

    List<FriendRequest> findByRequesterIdAndStatus(Long requesterId, FriendRequestStatus status);

    @Query("""
            SELECT fr FROM FriendRequest fr
            WHERE (fr.requester.id = :userId OR fr.recipient.id = :userId)
              AND fr.status = 'ACCEPTED'
            ORDER BY fr.updatedAt DESC
            """)
    Page<FriendRequest> findAcceptedForUser(@Param("userId") Long userId, Pageable pageable);
}
