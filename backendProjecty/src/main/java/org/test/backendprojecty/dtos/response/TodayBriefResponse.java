package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TodayBriefResponse {
    private MomentumResponse momentum;
    private TaskResponse nextAction;
    private List<TaskResponse> plan;
    private int overdueCount;
    private int openTaskCount;
}
