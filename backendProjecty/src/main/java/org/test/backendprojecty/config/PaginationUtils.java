package org.test.backendprojecty.config;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.springframework.data.domain.Pageable;

public final class PaginationUtils {

    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_SIZE = 10;
    private static final String DEFAULT_SORT_FIELD = "id";
    private static final Sort.Direction DEFAULT_DIRECTION = Sort.Direction.DESC;

    private PaginationUtils() {
        throw new UnsupportedOperationException("Utility class");
    }

    public static Pageable getPageable(PaginationRequest request) {
        int page = request.getPage() != null ? request.getPage() : DEFAULT_PAGE;
        int size = request.getSize() != null ? request.getSize() : DEFAULT_SIZE;
        Sort.Direction direction = request.getDirection() != null ? request.getDirection() : DEFAULT_DIRECTION;
        String sortField = request.getSortField() != null ? request.getSortField() : DEFAULT_SORT_FIELD;

        return PageRequest.of(page - 1, size, direction, sortField);
    }
}

