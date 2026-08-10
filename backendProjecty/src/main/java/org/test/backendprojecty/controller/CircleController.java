package org.test.backendprojecty.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.test.backendprojecty.dtos.request.CreateCircleRequest;
import org.test.backendprojecty.dtos.response.CircleResponse;
import org.test.backendprojecty.service.CircleService;

import java.util.List;

@RestController
@RequestMapping("${BaseUrl}/circles")
@RequiredArgsConstructor
public class CircleController {

    private final CircleService circleService;

    @PostMapping
    public ResponseEntity<CircleResponse> create(@Valid @RequestBody CreateCircleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(circleService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<CircleResponse>> listMine() {
        return ResponseEntity.ok(circleService.listMine());
    }

    @PostMapping("/{circleId}/accept")
    public ResponseEntity<CircleResponse> accept(@PathVariable Long circleId) {
        return ResponseEntity.ok(circleService.accept(circleId));
    }

    @PostMapping("/{circleId}/decline")
    public ResponseEntity<Void> decline(@PathVariable Long circleId) {
        circleService.decline(circleId);
        return ResponseEntity.noContent().build();
    }
}
