package org.test.backendprojecty.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "focus_rooms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class FocusRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 16)
    private String code;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false)
    @Builder.Default
    private int workMinutes = 25;

    @Column(nullable = false)
    @Builder.Default
    private int breakMinutes = 5;

    @Column(nullable = false)
    @Builder.Default
    private int totalRounds = 4;

    @Column(nullable = false)
    @Builder.Default
    private int longBreakMinutes = 15;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FocusRoomStatus status = FocusRoomStatus.LOBBY;

    @Column(nullable = false)
    @Builder.Default
    private int currentRound = 0;

    @Enumerated(EnumType.STRING)
    private FocusPhase currentPhase;

    private Instant phaseEndsAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean paused = false;

    private Long pausedRemainingSeconds;

    @Column(nullable = false)
    @Builder.Default
    private boolean locked = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ChatMode chatMode = ChatMode.CLOSED_FOCUS;

    /** Informational only — the host still starts the session manually, there's no auto-start job. */
    private Instant scheduledFor;

    // Consent for sending this room's chat/notes to a third-party LLM once the
    // session ends — real user content leaves the system, so this defaults on
    // but is host-controlled at creation time.
    @Column(nullable = false)
    @Builder.Default
    private boolean aiReportEnabled = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
