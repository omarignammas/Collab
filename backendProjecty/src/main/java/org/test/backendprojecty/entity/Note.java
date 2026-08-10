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
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    // Set when a note is taken from inside a live Focus Room session — any
    // participant may attach one, not just the room's host.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private FocusRoom room;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(columnDefinition = "TEXT")
    private String rawBody;

    @ElementCollection
    @CollectionTable(name = "note_tags", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "tag")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    private String savedUrl;

    @Column(length = 80)
    private String theme;

    @ElementCollection
    @CollectionTable(name = "note_links", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "url", length = 1200)
    @Builder.Default
    private List<String> extractedLinks = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "note_time_references", joinColumns = @JoinColumn(name = "note_id"))
    @Column(name = "time_reference", length = 255)
    @Builder.Default
    private List<String> timeReferences = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private GenerationStatus enrichmentStatus = GenerationStatus.PENDING;

    @Builder.Default
    private Boolean aiEnriched = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
