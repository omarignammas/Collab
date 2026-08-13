package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.test.backendprojecty.dtos.request.ChatMessageRequest;
import org.test.backendprojecty.dtos.request.ChatModeRequest;
import org.test.backendprojecty.dtos.request.FocusSignalRequest;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.UnauthorizedException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.service.FocusRoomService;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class FocusRoomStompController {

    private final FocusRoomService focusRoomService;
    private final UserRepository userRepository;

    @MessageMapping("/rooms/{code}/start")
    public void start(@DestinationVariable String code, Principal principal) {
        focusRoomService.startSession(code, resolveUser(principal));
    }

    @MessageMapping("/rooms/{code}/end")
    public void end(@DestinationVariable String code, Principal principal) {
        focusRoomService.endSession(code, resolveUser(principal));
    }

    @MessageMapping("/rooms/{code}/pause")
    public void pause(@DestinationVariable String code, Principal principal) {
        focusRoomService.togglePause(code, resolveUser(principal));
    }

    @MessageMapping("/rooms/{code}/leave")
    public void leave(@DestinationVariable String code, Principal principal) {
        focusRoomService.leaveRoom(code, resolveUser(principal));
    }

    @MessageMapping("/rooms/{code}/hand")
    public void hand(@DestinationVariable String code, Principal principal) {
        focusRoomService.toggleHand(code, resolveUser(principal));
    }

    @MessageMapping("/rooms/{code}/chat")
    public void chat(@DestinationVariable String code, Principal principal, @Valid @Payload ChatMessageRequest request) {
        focusRoomService.postChatMessage(code, resolveUser(principal), request.getBody(), request.isForceAi());
    }

    @MessageMapping("/rooms/{code}/chat-mode")
    public void chatMode(@DestinationVariable String code, Principal principal, @Valid @Payload ChatModeRequest request) {
        focusRoomService.updateChatMode(code, resolveUser(principal), request.getMode());
    }

    @MessageMapping("/rooms/{code}/focus-signal")
    public void focusSignal(@DestinationVariable String code, Principal principal, @Valid @Payload FocusSignalRequest request) {
        focusRoomService.updateFocusSignal(code, resolveUser(principal), request.getSignal());
    }

    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public String handleError(RuntimeException ex) {
        return ex.getMessage();
    }

    private User resolveUser(Principal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
}
