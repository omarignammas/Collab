package org.test.backendprojecty.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// optionsJson is a hand-serialized 4-element JSON array (List<String>) — a
// fixed, never-individually-queried shape, so no separate child table.
@Entity
@Table(name = "quiz_questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String optionsJson;

    @Column(nullable = false)
    private Integer correctIndex;

    @Column(nullable = false)
    private Integer position;
}
