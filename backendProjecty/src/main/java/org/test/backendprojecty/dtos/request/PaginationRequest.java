package org.test.backendprojecty.dtos.request;

import lombok.*;
import org.springframework.data.domain.Sort;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaginationRequest {
    private Integer page ;
    private Integer size ;
    private String sortField;
    private Sort.Direction direction;

}

