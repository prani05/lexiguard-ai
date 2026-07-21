package com.lexiguard.controller;

import com.lexiguard.dto.ApiResponse;
import com.lexiguard.dto.DashboardStatsResponse;
import com.lexiguard.entity.User;
import com.lexiguard.repository.UserRepository;
import com.lexiguard.security.UserDetailsImpl;
import com.lexiguard.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboardSummary(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        DashboardStatsResponse stats = dashboardService.getDashboardSummary(user);
        return ResponseEntity.ok(ApiResponse.success("Dashboard metrics retrieved successfully", stats));
    }
}
