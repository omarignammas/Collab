package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.dtos.request.UserUpdateRequest;
import org.test.backendprojecty.dtos.response.UserResponse;
import org.test.backendprojecty.service.UserService;

@RestController
@RequestMapping("${BaseUrl}/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserResponse> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @PutMapping
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile(request));
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    public ResponseEntity<UserResponse> updateAvatar(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userService.updateAvatar(file));
    }
}
