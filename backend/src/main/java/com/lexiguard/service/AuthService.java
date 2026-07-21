package com.lexiguard.service;

import com.lexiguard.dto.AuthResponse;
import com.lexiguard.dto.LoginRequest;
import com.lexiguard.dto.RegisterRequest;
import com.lexiguard.dto.UserResponse;
import com.lexiguard.entity.Role;
import com.lexiguard.entity.User;
import com.lexiguard.repository.UserRepository;
import com.lexiguard.security.JwtUtils;
import com.lexiguard.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ROLE_USER)
                .build();

        User savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return AuthResponse.builder()
                .token(jwt)
                .user(mapToUserResponse(user))
                .build();
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .preferredGoverningLaw(user.getPreferredGoverningLaw())
                .maxNonCompeteMonths(user.getMaxNonCompeteMonths())
                .requireMutualIndemnity(user.getRequireMutualIndemnity())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedAdminUser() {
        String adminEmail = "admin@lexiguard.com";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .name("LexiGuard Admin")
                    .email(adminEmail)
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.ROLE_ADMIN)
                    .build();
            userRepository.save(admin);
            System.out.println("LexiGuard Default Admin seeded: admin@lexiguard.com / admin123");
        }
    }
}
