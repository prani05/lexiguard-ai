package com.lexiguard;

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
import org.springframework.security.test.context.support.TestExecutionEvent;
import org.springframework.security.test.context.support.WithUserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class DashboardControllerTest {

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

    private static final String TEST_EMAIL = "dashboard-tester@example.com";

    @BeforeEach
    public void setup() {
        userRepository.findByEmail(TEST_EMAIL).ifPresent(user -> {
            documentRepository.findByUserOrderByUploadDateDesc(user).forEach(doc -> {
                reportRepository.findByDocument(doc).ifPresent(report -> reportRepository.delete(report));
                detectedClauseRepository.deleteByDocument(doc);
                riskItemRepository.deleteByDocument(doc);
                documentPageRepository.deleteByDocument(doc);
                documentRepository.delete(doc);
            });
            userRepository.delete(user);
        });
        User user = User.builder()
                .name("Tester Dashboard")
                .email(TEST_EMAIL)
                .password(passwordEncoder.encode("password123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(user);
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testGetDashboardSummarySuccess() throws Exception {
        mockMvc.perform(get("/dashboard/summary")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Dashboard metrics retrieved successfully")))
                .andExpect(jsonPath("$.data.totalDocuments", notNullValue()))
                .andExpect(jsonPath("$.data.averageRiskScore", notNullValue()))
                .andExpect(jsonPath("$.data.recentDocuments", notNullValue()));
    }

    @Test
    public void testGetDashboardSummaryUnauthorized() throws Exception {
        mockMvc.perform(get("/dashboard/summary")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
