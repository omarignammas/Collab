package org.test.backendprojecty.event;

/**
 * Published right after a CourseSummary row + its source file are committed.
 * Only one trigger site (the upload endpoint), but kept as an event rather
 * than a direct post-save async call because AFTER_COMMIT is what actually
 * guarantees the generation listener never starts before the row is durably
 * saved — a same-thread @Async call right after save() has no such guarantee.
 */
public record CourseSummaryUploadedEvent(Long summaryId) {
}
