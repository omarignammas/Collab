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
import org.test.backendprojecty.dtos.request.QuizAttemptRequest;
import org.test.backendprojecty.entity.QuizDifficulty;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.QuizAttemptResponse;
import org.test.backendprojecty.dtos.response.QuizResponse;
import org.test.backendprojecty.dtos.response.SharedUserResponse;
import org.test.backendprojecty.service.QuizService;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @PostMapping(value = "${BaseUrl}/course-summaries/{summaryId}/quizzes", consumes = "multipart/form-data")
    public ResponseEntity<QuizResponse> requestQuizGeneration(
            @PathVariable Long summaryId,
            @RequestParam QuizDifficulty difficulty,
            @RequestParam(required = false) List<MultipartFile> referenceFiles,
            @RequestParam(required = false) String focusPrompt
    ) {
        QuizResponse response = quizService.requestQuizGeneration(summaryId, difficulty, referenceFiles, focusPrompt);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("${BaseUrl}/course-summaries/{summaryId}/quizzes")
    public ResponseEntity<List<QuizResponse>> getQuizzesForSummary(@PathVariable Long summaryId) {
        return ResponseEntity.ok(quizService.getQuizzesForSummary(summaryId));
    }

    @GetMapping("${BaseUrl}/quizzes")
    public ResponseEntity<PagingResult<QuizResponse>> getAllQuizzes(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortField,
            @RequestParam(required = false) Sort.Direction direction
    ) {
        PaginationRequest request = new PaginationRequest(page, size, sortField, direction);
        return ResponseEntity.ok(quizService.getAllQuizzes(request));
    }

    @GetMapping("${BaseUrl}/quizzes/{quizId}")
    public ResponseEntity<QuizResponse> getQuizById(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizService.getQuizById(quizId));
    }

    @DeleteMapping("${BaseUrl}/quizzes/{quizId}")
    public ResponseEntity<Void> deleteQuiz(@PathVariable Long quizId) {
        quizService.deleteQuiz(quizId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("${BaseUrl}/quizzes/{quizId}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long quizId) {
        quizService.cancel(quizId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("${BaseUrl}/quizzes/{quizId}/attempts")
    public ResponseEntity<QuizAttemptResponse> submitAttempt(
            @PathVariable Long quizId,
            @Valid @RequestBody QuizAttemptRequest request
    ) {
        QuizAttemptResponse response = quizService.submitAttempt(quizId, request.getAnswers());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("${BaseUrl}/quizzes/{quizId}/attempts/latest")
    public ResponseEntity<QuizAttemptResponse> getMyLatestAttempt(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizService.getMyLatestAttempt(quizId));
    }

    @PostMapping("${BaseUrl}/quizzes/{quizId}/share")
    public ResponseEntity<Void> shareQuiz(
            @PathVariable Long quizId,
            @Valid @RequestBody InviteMemberRequest request
    ) {
        quizService.shareQuiz(quizId, request.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("${BaseUrl}/quizzes/{quizId}/share/{userId}")
    public ResponseEntity<Void> unshareQuiz(@PathVariable Long quizId, @PathVariable Long userId) {
        quizService.unshareQuiz(quizId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("${BaseUrl}/quizzes/{quizId}/shares")
    public ResponseEntity<List<SharedUserResponse>> listShares(@PathVariable Long quizId) {
        return ResponseEntity.ok(quizService.listShares(quizId));
    }
}
