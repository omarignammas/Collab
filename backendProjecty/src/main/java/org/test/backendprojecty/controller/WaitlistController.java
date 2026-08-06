package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.WaitlistJoinRequest;
import org.test.backendprojecty.service.WaitlistService;

@RestController
@RequestMapping("${BaseUrl}/waitlist")
@RequiredArgsConstructor
public class WaitlistController {

    private final WaitlistService waitlistService;

    @PostMapping
    public ResponseEntity<Void> join(@Valid @RequestBody WaitlistJoinRequest request) {
        waitlistService.join(request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
