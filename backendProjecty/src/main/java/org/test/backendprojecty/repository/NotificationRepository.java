package org.test.backendprojecty.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.test.backendprojecty.entity.Notification;
import org.test.backendprojecty.entity.NotificationType;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);
    long countByRecipientIdAndReadFalse(Long recipientId);
    Optional<Notification> findFirstByRecipientIdAndTypeInOrderByCreatedAtDesc(Long recipientId, List<NotificationType> types);
}
