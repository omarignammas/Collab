package org.test.backendprojecty.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

// An AI-proposed task breakdown for a course, generated from an uploaded
// reference file and/or free-text context. Deliberately NOT applied to real
// Task rows until the user reviews and confirms — proposedTasksJson holds the
// draft; confirmPlan() is the only path that ever creates real Tasks from it.
@Entity
@Table(name = "task_plan_generations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TaskPlanGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String sourceFileUrl;

    @Enumerated(EnumType.STRING)
    private SourceFileType sourceFileType;

    @Column(columnDefinition = "TEXT")
    private String extractedText;

    private LocalDate targetDate;

    @Column(columnDefinition = "TEXT")
    private String additionalContext;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GenerationStatus status = GenerationStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String proposedTasksJson;

    @Column(nullable = false)
    @Builder.Default
    private boolean applied = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
