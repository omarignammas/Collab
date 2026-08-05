package org.test.backendprojecty.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// Every submission creates a new row (cheap, keeps history); callers only
// ever surface the most recent one. IMPORTANT: every finder on this entity
// must be scoped by (quizId, userId) — never bare quizId — since "no score
// comparison between friends" is a hard product requirement, not a UI nicety.
@Entity
@Table(name = "quiz_attempts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answersJson;

    @Column(nullable = false)
    private Integer score;

    @Column(nullable = false)
    private Integer totalQuestions;

    @Column(nullable = false)
    private LocalDateTime completedAt;
}
