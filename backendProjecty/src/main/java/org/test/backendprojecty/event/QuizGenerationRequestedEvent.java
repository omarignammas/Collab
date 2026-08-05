package org.test.backendprojecty.event;

/** Published right after a Quiz row (status PENDING) is committed. */
public record QuizGenerationRequestedEvent(Long quizId) {
}
