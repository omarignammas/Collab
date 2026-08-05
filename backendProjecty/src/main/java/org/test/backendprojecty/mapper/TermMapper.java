package org.test.backendprojecty.mapper;

import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.TermResponse;
import org.test.backendprojecty.entity.Term;

@Component
public class TermMapper {

    public TermResponse toResponse(Term term) {
        return TermResponse.builder()
                .id(term.getId())
                .name(term.getName())
                .startDate(term.getStartDate())
                .endDate(term.getEndDate())
                .isCurrent(term.isCurrent())
                .createdAt(term.getCreatedAt())
                .updatedAt(term.getUpdatedAt())
                .build();
    }
}
