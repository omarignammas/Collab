package org.test.backendprojecty.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.test.backendprojecty.dtos.response.MomentumResponse;
import org.test.backendprojecty.dtos.response.TodayBriefResponse;
import org.test.backendprojecty.service.MomentumService;

@RestController
@RequestMapping("${BaseUrl}/momentum")
@RequiredArgsConstructor
public class MomentumController {

    private final MomentumService momentumService;

    @GetMapping
    public ResponseEntity<MomentumResponse> getMomentum() {
        return ResponseEntity.ok(momentumService.getCurrentMomentum());
    }

    @GetMapping("/today")
    public ResponseEntity<TodayBriefResponse> getTodayBrief() {
        return ResponseEntity.ok(momentumService.getTodayBrief());
    }
}
