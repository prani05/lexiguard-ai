package com.lexiguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lexiguard.dto.LoginRequest;
import com.lexiguard.dto.RegisterRequest;
import com.lexiguard.entity.Role;
import com.lexiguard.entity.User;
import com.lexiguard.repository.UserRepository;
import com.lexiguard.repository.DocumentRepository;
import com.lexiguard.repository.DocumentPageRepository;
import com.lexiguard.repository.ReportRepository;
import com.lexiguard.repository.DetectedClauseRepository;
import com.lexiguard.repository.RiskItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPageRepository documentPageRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private DetectedClauseRepository detectedClauseRepository;

    @Autowired
    private RiskItemRepository riskItemRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private String testEmail;
    private String testPassword;

    @BeforeEach
    public void setup() {
        reportRepository.deleteAll();
        detectedClauseRepository.deleteAll();
        riskItemRepository.deleteAll();
        documentPageRepository.deleteAll();
        documentRepository.deleteAll();
        userRepository.deleteAll();
        testEmail = "user_" + UUID.randomUUID() + "@example.com";
        testPassword = "password123";
    }

    @Test
    public void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setName("John Doe");
        request.setEmail(testEmail);
        request.setPassword(testPassword);

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("User registered successfully")))
                .andExpect(jsonPath("$.data.email", is(testEmail)))
                .andExpect(jsonPath("$.data.role", is("ROLE_USER")));
    }

    @Test
    public void testRegisterEmailDuplicate() throws Exception {
        // Pre-create user
        User existingUser = User.builder()
                .name("Existing")
                .email(testEmail)
                .password(passwordEncoder.encode(testPassword))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(existingUser);

        RegisterRequest request = new RegisterRequest();
        request.setName("New User");
        request.setEmail(testEmail);
        request.setPassword(testPassword);

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Email is already in use")));
    }

    @Test
    public void testLoginSuccess() throws Exception {
        // Pre-create user
        User existingUser = User.builder()
                .name("John Login")
                .email(testEmail)
                .password(passwordEncoder.encode(testPassword))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(existingUser);

        LoginRequest request = new LoginRequest();
        request.setEmail(testEmail);
        request.setPassword(testPassword);

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", notNullValue()))
                .andExpect(jsonPath("$.data.user.email", is(testEmail)));
    }

    @Test
    public void testLoginBadCredentials() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("nonexistent@example.com");
        request.setPassword("wrongpassword");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)));
    }
}
