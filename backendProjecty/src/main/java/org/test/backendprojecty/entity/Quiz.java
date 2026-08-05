package org.test.backendprojecty.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

// Always generated from an existing CourseSummary's material — no separate
// upload/extraction path for quizzes, so the "owner" here may differ from
// summary.getUser() when a friend with shared access generates their own.
@Entity
@Table(name = "quizzes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "summary_id", nullable = false)
    private CourseSummary summary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuizDifficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GenerationStatus status = GenerationStatus.PENDING;

    // Optional student-provided reference (e.g. a past quiz) the LLM draws style/
    // inspiration from — never the sole source material, the summary always is.
    private String referenceFileUrl;

    @Enumerated(EnumType.STRING)
    private SourceFileType referenceFileType;

    @Column(columnDefinition = "TEXT")
    private String referenceText;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
