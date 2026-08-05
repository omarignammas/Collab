package org.test.backendprojecty.event;

/**
 * Published when a participant mentions @ai in a Focus Room's live chat —
 * lets the answer be generated off the STOMP-handling thread instead of
 * blocking the sender's own message send on a real LLM round-trip.
 */
public record AiChatRequestedEvent(Long roomId, String question) {
}
