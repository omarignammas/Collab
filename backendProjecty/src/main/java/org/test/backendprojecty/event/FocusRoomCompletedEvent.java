package org.test.backendprojecty.event;

/**
 * Published right after a FocusRoom transitions to COMPLETED, from any of the
 * three places that can trigger it (host ends early, natural phase-timer
 * completion, or last-participant-leaves fallback) — a single event lets the
 * AI report generation live in one listener instead of being duplicated at
 * each call site.
 */
public record FocusRoomCompletedEvent(Long roomId) {
}
