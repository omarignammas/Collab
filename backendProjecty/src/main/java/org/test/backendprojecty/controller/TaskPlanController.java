package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.dtos.request.TaskPlanConfirmRequest;
import org.test.backendprojecty.dtos.response.TaskPlanResponse;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.service.TaskPlanService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/courses/{courseId}/task-plans")
@RequiredArgsConstructor
public class TaskPlanController {

    private final TaskPlanService taskPlanService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<TaskPlanResponse> requestPlan(
            @PathVariable Long courseId,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate,
            @RequestParam(required = false) String additionalContext
    ) {
        TaskPlanResponse response = taskPlanService.requestPlan(courseId, file, targetDate, additionalContext);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{planId}")
    public ResponseEntity<TaskPlanResponse> getPlan(@PathVariable Long courseId, @PathVariable Long planId) {
        return ResponseEntity.ok(taskPlanService.getPlan(courseId, planId));
    }

    @PostMapping("/{planId}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long courseId, @PathVariable Long planId) {
        taskPlanService.cancel(courseId, planId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{planId}/confirm")
    public ResponseEntity<List<TaskResponse>> confirmPlan(
            @PathVariable Long courseId,
            @PathVariable Long planId,
            @Valid @RequestBody TaskPlanConfirmRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskPlanService.confirmPlan(courseId, planId, request));
    }
}
