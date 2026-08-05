package org.test.backendprojecty.dtos.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermResponse {
    private Long id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    @JsonProperty("isCurrent")
    private boolean isCurrent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
