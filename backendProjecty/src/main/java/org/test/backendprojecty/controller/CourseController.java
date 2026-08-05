package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.CourseRequest;
import org.test.backendprojecty.dtos.request.InviteMemberRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.CourseMemberResponse;
import org.test.backendprojecty.dtos.response.CourseProgressResponse;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.service.CourseService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    @PostMapping
    public ResponseEntity<CourseResponse> createCourse(@Valid @RequestBody CourseRequest request) {
        CourseResponse response = courseService.createCourse(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PagingResult<CourseResponse>> getAllCourses(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        PagingResult<CourseResponse> courses = courseService.getAllCourses(request);
        return ResponseEntity.ok(courses);
    }

    @GetMapping("/{courseId}")
    public ResponseEntity<CourseResponse> getCourseById(@PathVariable Long courseId) {
        CourseResponse response = courseService.getCourseById(courseId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{courseId}")
    public ResponseEntity<CourseResponse> updateCourse(
            @PathVariable Long courseId,
            @Valid @RequestBody CourseRequest request) {
        CourseResponse response = courseService.updateCourse(courseId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{courseId}")
    public ResponseEntity<Void> deleteCourse(@PathVariable Long courseId) {
        courseService.deleteCourse(courseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{courseId}/progress")
    public ResponseEntity<CourseProgressResponse> getCourseProgress(@PathVariable Long courseId) {
        CourseProgressResponse response = courseService.getCourseProgress(courseId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{courseId}/members")
    public ResponseEntity<List<CourseMemberResponse>> listMembers(@PathVariable Long courseId) {
        return ResponseEntity.ok(courseService.listMembers(courseId));
    }

    @PostMapping("/{courseId}/members")
    public ResponseEntity<Void> inviteMember(
            @PathVariable Long courseId,
            @Valid @RequestBody InviteMemberRequest request
    ) {
        courseService.inviteMember(courseId, request.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/{courseId}/members/accept")
    public ResponseEntity<Void> acceptInvite(@PathVariable Long courseId) {
        courseService.acceptInvite(courseId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{courseId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long courseId, @PathVariable Long userId) {
        courseService.removeMember(courseId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{courseId}/tasks")
    public ResponseEntity<PagingResult<TaskResponse>> getTeamTasks(
            @PathVariable Long courseId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        return ResponseEntity.ok(courseService.getTeamTasks(courseId, request));
    }

    @GetMapping("/{courseId}/members/{userId}/progress")
    public ResponseEntity<CourseProgressResponse> getMemberProgress(
            @PathVariable Long courseId,
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(courseService.getMemberProgress(courseId, userId));
    }
}
