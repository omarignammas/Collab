package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.TermRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TermResponse;
import org.test.backendprojecty.service.TermService;

@RestController
@RequestMapping("${BaseUrl}/terms")
@RequiredArgsConstructor
public class TermController {

    private final TermService termService;

    @PostMapping
    public ResponseEntity<TermResponse> createTerm(@Valid @RequestBody TermRequest request) {
        TermResponse response = termService.createTerm(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PagingResult<TermResponse>> getAllTerms(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        PagingResult<TermResponse> terms = termService.getAllTerms(request);
        return ResponseEntity.ok(terms);
    }

    @GetMapping("/{termId}")
    public ResponseEntity<TermResponse> getTermById(@PathVariable Long termId) {
        TermResponse response = termService.getTermById(termId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{termId}")
    public ResponseEntity<TermResponse> updateTerm(
            @PathVariable Long termId,
            @Valid @RequestBody TermRequest request) {
        TermResponse response = termService.updateTerm(termId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{termId}")
    public ResponseEntity<Void> deleteTerm(@PathVariable Long termId) {
        termService.deleteTerm(termId);
        return ResponseEntity.noContent().build();
    }
}
