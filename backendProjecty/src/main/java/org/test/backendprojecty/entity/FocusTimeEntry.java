package org.test.backendprojecty.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

// A durable record of focused minutes, written once when a Focus Room session
// ends. Rooms explicitly ended by the host are deleted entirely — no recap,
// no lingering row — but the minutes a participant actually put in still
// count toward their Stats page charts, which is what this table preserves
// independently of whether the room itself still exists.
@Entity
@Table(name = "focus_time_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FocusTimeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private int minutesFocused;

    @Column(nullable = false)
    private Instant earnedAt;
}
