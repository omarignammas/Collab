package org.test.backendprojecty.dtos.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.test.backendprojecty.entity.ChatMode;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FocusRoomRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    private Long courseId;

    @Min(value = 5, message = "Work length must be at least 5 minutes")
    @Max(value = 120, message = "Work length must not exceed 120 minutes")
    @Builder.Default
    private int workMinutes = 25;

    @Min(value = 1, message = "Break length must be at least 1 minute")
    @Max(value = 60, message = "Break length must not exceed 60 minutes")
    @Builder.Default
    private int breakMinutes = 5;

    @Min(value = 1, message = "Must have at least 1 round")
    @Max(value = 12, message = "Must not exceed 12 rounds")
    @Builder.Default
    private int totalRounds = 4;

    @Min(value = 1, message = "Long break must be at least 1 minute")
    @Max(value = 60, message = "Long break must not exceed 60 minutes")
    @Builder.Default
    private int longBreakMinutes = 15;

    /** Optional — defaults to CLOSED_FOCUS in the service if not provided. */
    private ChatMode chatMode;

    /** Optional — informational only, doesn't trigger an auto-start. */
    private Instant scheduledFor;

    /** Optional — must all be friends of the host; each becomes an INVITED participant. */
    private List<Long> inviteUserIds;

    /** Optional — whether to generate an AI recap of chat/notes when this session ends. */
    @Builder.Default
    private boolean aiReportEnabled = true;
}
