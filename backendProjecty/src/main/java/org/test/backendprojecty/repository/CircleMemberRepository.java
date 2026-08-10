package org.test.backendprojecty.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.CircleMember;
import org.test.backendprojecty.entity.CircleMemberStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface CircleMemberRepository extends JpaRepository<CircleMember, Long> {

    @Query("select cm from CircleMember cm join fetch cm.circle c where cm.user.id = :userId order by c.updatedAt desc")
    List<CircleMember> findMembershipsForUser(@Param("userId") Long userId);

    List<CircleMember> findByCircleIdAndStatusOrderByCreatedAtAsc(Long circleId, CircleMemberStatus status);

    List<CircleMember> findByCircleIdOrderByCreatedAtAsc(Long circleId);

    Optional<CircleMember> findByCircleIdAndUserId(Long circleId, Long userId);

    void deleteByCircleId(Long circleId);
}
