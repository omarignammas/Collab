package org.test.backendprojecty.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.test.backendprojecty.dtos.response.ErrorResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleAccessDenied_ReturnsForbidden_NotInternalServerError() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/admin/stats");

        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(
                new AccessDeniedException("Access is denied"), request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals(403, response.getBody().getStatus());
        assertEquals("/api/v1/admin/stats", response.getBody().getPath());
    }

    @Test
    void handleDisabled_ReturnsUnauthorized_NotInternalServerError() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/auth/login");

        ResponseEntity<ErrorResponse> response = handler.handleDisabled(
                new DisabledException("User is disabled"), request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(401, response.getBody().getStatus());
        assertEquals("This account has been disabled", response.getBody().getMessage());
    }

    @Test
    void handlePlaylistNotFound_ReturnsNotFound() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/courses/import/youtube");

        ResponseEntity<ErrorResponse> response = handler.handlePlaylistNotFound(
                new PlaylistNotFoundException("Playlist not found or is private."), request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals(404, response.getBody().getStatus());
        assertEquals("Playlist not found or is private.", response.getBody().getMessage());
    }

    @Test
    void handleExternalApi_ReturnsBadGateway() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/courses/import/youtube");

        ResponseEntity<ErrorResponse> response = handler.handleExternalApi(
                new ExternalApiException("YouTube import is not configured."), request);

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals(502, response.getBody().getStatus());
        assertEquals("YouTube import is not configured.", response.getBody().getMessage());
    }
}
