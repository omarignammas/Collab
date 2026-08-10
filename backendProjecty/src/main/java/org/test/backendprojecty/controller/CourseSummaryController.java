package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.dtos.request.InviteMemberRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.ResearchReportRequest;
import org.test.backendprojecty.dtos.response.CourseSummaryResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.SharedUserResponse;
import org.test.backendprojecty.service.CourseSummaryService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/course-summaries")
@RequiredArgsConstructor
public class CourseSummaryController {

    private final CourseSummaryService courseSummaryService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<CourseSummaryResponse> uploadSummary(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String title
    ) {
        CourseSummaryResponse response = courseSummaryService.uploadSummary(file, courseId, title);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/research")
    public ResponseEntity<CourseSummaryResponse> createResearchReport(
            @Valid @RequestBody ResearchReportRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(courseSummaryService.createResearchReport(request));
    }

    @GetMapping
    public ResponseEntity<PagingResult<CourseSummaryResponse>> getAllSummaries(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        return ResponseEntity.ok(courseSummaryService.getAllSummaries(request));
    }

    @GetMapping("/{summaryId}")
    public ResponseEntity<CourseSummaryResponse> getSummaryById(@PathVariable Long summaryId) {
        return ResponseEntity.ok(courseSummaryService.getSummaryById(summaryId));
    }

    @DeleteMapping("/{summaryId}")
    public ResponseEntity<Void> deleteSummary(@PathVariable Long summaryId) {
        courseSummaryService.deleteSummary(summaryId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{summaryId}/retry")
    public ResponseEntity<Void> retry(@PathVariable Long summaryId) {
        courseSummaryService.retry(summaryId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{summaryId}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long summaryId) {
        courseSummaryService.cancel(summaryId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{summaryId}/share")
    public ResponseEntity<Void> shareSummary(
            @PathVariable Long summaryId,
            @Valid @RequestBody InviteMemberRequest request
    ) {
        courseSummaryService.shareSummary(summaryId, request.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{summaryId}/share/{userId}")
    public ResponseEntity<Void> unshareSummary(@PathVariable Long summaryId, @PathVariable Long userId) {
        courseSummaryService.unshareSummary(summaryId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{summaryId}/shares")
    public ResponseEntity<List<SharedUserResponse>> listShares(@PathVariable Long summaryId) {
        return ResponseEntity.ok(courseSummaryService.listShares(summaryId));
    }
}
