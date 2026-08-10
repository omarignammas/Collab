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

@Entity
@Table(name = "course_summaries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CourseSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String sourceFileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SourceFileType sourceFileType;

    // PDFBox-extracted text for PDFs; a short placeholder for images, since
    // Gemini reads image bytes directly and never needs OCR'd text for those.
    @Column(columnDefinition = "TEXT")
    private String extractedText;

    @Column(columnDefinition = "TEXT")
    private String summaryMarkdown;

    // Absence just means the frontend skips the diagram section — not a
    // separate failure state; status alone still governs READY/FAILED.
    // A JSON tree ({"label": "...", "children": [...]}) the frontend renders
    // itself as an SVG concept map — not Mermaid syntax, which rendered
    // unreliably in the desktop app's WebView.
    @Column(columnDefinition = "TEXT")
    private String diagramJson;

    // Nullable for compatibility with existing production rows. A generated
    // research report shares the Summary lifecycle without pretending to have
    // an uploaded source file.
    @Builder.Default
    private Boolean researchReport = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GenerationStatus status = GenerationStatus.PENDING;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
