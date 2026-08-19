package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileStatsResponse {
    private int shipped;
    private double focusedHours;
    private int dailiesPercent;
    private int onTimePercent;
    private int dayStreak;
    private int projectsCount;
}
