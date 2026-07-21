package com.lexiguard.controller;

import com.lexiguard.dto.ApiResponse;
import com.lexiguard.dto.UserResponse;
import com.lexiguard.entity.User;
import com.lexiguard.repository.UserRepository;
import com.lexiguard.security.UserDetailsImpl;
import com.lexiguard.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.lexiguard.dto.UserPreferencesRequest;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthService authService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }
        
        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found in database"));

        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", authService.mapToUserResponse(user)));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<UserResponse>> updatePreferences(
            @RequestBody UserPreferencesRequest prefRequest,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found in database"));

        user.setPreferredGoverningLaw(prefRequest.getPreferredGoverningLaw());
        user.setMaxNonCompeteMonths(prefRequest.getMaxNonCompeteMonths());
        user.setRequireMutualIndemnity(prefRequest.getRequireMutualIndemnity());

        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Preferences updated successfully", authService.mapToUserResponse(savedUser)));
    }
}
