package com.lexiguard;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.Role;
import com.lexiguard.entity.User;
import com.lexiguard.repository.DocumentRepository;
import com.lexiguard.repository.UserRepository;
import com.lexiguard.entity.DocumentPage;
import com.lexiguard.entity.DetectedClause;
import com.lexiguard.entity.RiskItem;
import com.lexiguard.repository.DocumentPageRepository;
import com.lexiguard.repository.DetectedClauseRepository;
import com.lexiguard.repository.RiskItemRepository;
import com.lexiguard.service.OcrService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.TestExecutionEvent;
import org.springframework.security.test.context.support.WithUserDetails;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private OcrService ocrService;

    @Autowired
    private DocumentPageRepository documentPageRepository;

    @Autowired
    private DetectedClauseRepository detectedClauseRepository;

    @Autowired
    private RiskItemRepository riskItemRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    private static final String TEST_EMAIL = "upload-tester@example.com";

    @BeforeEach
    public void setup() {
        cleanupUploadsDirectory();
        
        userRepository.findByEmail(TEST_EMAIL).ifPresent(user -> {
            documentRepository.findByUserOrderByUploadDateDesc(user).forEach(doc -> {
                detectedClauseRepository.deleteByDocument(doc);
                riskItemRepository.deleteByDocument(doc);
                documentPageRepository.deleteByDocument(doc);
            });
            documentRepository.deleteAll(documentRepository.findByUserOrderByUploadDateDesc(user));
            userRepository.delete(user);
        });

        User user = User.builder()
                .name("Upload Tester")
                .email(TEST_EMAIL)
                .password(passwordEncoder.encode("password123"))
                .role(Role.ROLE_USER)
                .build();
        userRepository.save(user);
    }

    @AfterEach
    public void teardown() {
        cleanupUploadsDirectory();
    }

    private void cleanupUploadsDirectory() {
        try {
            Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (Files.exists(path)) {
                Files.list(path).forEach(file -> {
                    try {
                        Files.delete(file);
                    } catch (IOException ignored) {}
                });
            }
        } catch (IOException ignored) {}
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testUploadDocumentSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "contract_nda.pdf",
                "application/pdf",
                "Dummy PDF content bytes".getBytes()
        );

        mockMvc.perform(multipart("/documents/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document uploaded successfully")))
                .andExpect(jsonPath("$.data.filename", is("contract_nda.pdf")))
                .andExpect(jsonPath("$.data.type", is("NDA")))
                .andExpect(jsonPath("$.data.status", is("PROCESSING")));

        // Verify physical file was created
        User user = userRepository.findByEmail(TEST_EMAIL).orElseThrow();
        List<Document> documents = documentRepository.findByUserOrderByUploadDateDesc(user);
        assertFalse(documents.isEmpty());
        
        Document uploadedDoc = documents.get(0);
        Path physicalPath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(uploadedDoc.getStorageFilename());
        assertTrue(Files.exists(physicalPath));
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testUploadDocumentUnsupportedType() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malicious_script.exe",
                "application/octet-stream",
                "some malicious code".getBytes()
        );

        mockMvc.perform(multipart("/documents/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Unsupported file type. Only PDF, DOCX, and TXT are allowed")));
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testUploadDocumentTooLarge() throws Exception {
        // Build file mock representing 11MB file bytes
        byte[] largeBytes = new byte[11 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "huge_agreement.txt",
                "text/plain",
                largeBytes
        );

        mockMvc.perform(multipart("/documents/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("File size exceeds the maximum limit of 10MB")));
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testListDocuments() throws Exception {
        // Pre-upload a document
        User user = userRepository.findByEmail(TEST_EMAIL).orElseThrow();
        Document doc = Document.builder()
                .user(user)
                .filename("employment_terms.docx")
                .storageFilename("test_storage_employment.docx")
                .type("Employment Agreement")
                .status("COMPLETED")
                .build();
        documentRepository.save(doc);

        mockMvc.perform(get("/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].filename", is("employment_terms.docx")));
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testDownloadDocument() throws Exception {
        // Pre-create file physically and database record
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
        
        String storageName = "test_download_file.txt";
        Files.write(path.resolve(storageName), "Downloaded terms content".getBytes());

        User user = userRepository.findByEmail(TEST_EMAIL).orElseThrow();
        Document doc = Document.builder()
                .user(user)
                .filename("download_me.txt")
                .storageFilename(storageName)
                .type("Contract")
                .status("COMPLETED")
                .build();
        documentRepository.save(doc);

        mockMvc.perform(get("/documents/" + doc.getId() + "/download"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_OCTET_STREAM))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"download_me.txt\""))
                .andExpect(content().string("Downloaded terms content"));
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testDeleteDocument() throws Exception {
        // Pre-create file physically and database record
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }

        String storageName = "test_delete_file.txt";
        Path physicalPath = path.resolve(storageName);
        Files.write(physicalPath, "Temporary content".getBytes());

        User user = userRepository.findByEmail(TEST_EMAIL).orElseThrow();
        Document doc = Document.builder()
                .user(user)
                .filename("delete_me.txt")
                .storageFilename(storageName)
                .type("Contract")
                .status("COMPLETED")
                .build();
        documentRepository.save(doc);

        assertTrue(Files.exists(physicalPath));

        mockMvc.perform(delete("/documents/" + doc.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document deleted successfully")));

        // Verify physical deletion and database deletion
        assertFalse(Files.exists(physicalPath));
        assertTrue(documentRepository.findById(doc.getId()).isEmpty());
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testProcessDocumentAndPages() throws Exception {
        // Pre-create file physically and database record
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }

        String storageName = "test_ocr_document.txt";
        Path physicalPath = path.resolve(storageName);
        Files.write(physicalPath, "Contract terms details: confidentiality is key.".getBytes());

        User user = userRepository.findByEmail(TEST_EMAIL).orElseThrow();
        Document doc = Document.builder()
                .user(user)
                .filename("test_ocr_doc.txt")
                .storageFilename(storageName)
                .type("Contract")
                .status("PROCESSING")
                .build();
        documentRepository.save(doc);

        // Run extraction synchronously
        ocrService.processDocumentSync(doc.getId());

        // Perform GET check
        mockMvc.perform(get("/documents/" + doc.getId() + "/pages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].pageNumber", is(1)))
                .andExpect(jsonPath("$.data[0].extractedText", is("Contract terms details: confidentiality is key.")));
    }

    @Test
    @WithUserDetails(value = TEST_EMAIL, setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testGenerateAndGetReport() throws Exception {
        User user = userRepository.findByEmail(TEST_EMAIL).orElseThrow();
        Document doc = Document.builder()
                .user(user)
                .filename("contract_mock.pdf")
                .storageFilename("mock_storage_contract.pdf")
                .type("NDA")
                .status("COMPLETED")
                .build();
        documentRepository.save(doc);

        DocumentPage page = DocumentPage.builder()
                .document(doc)
                .pageNumber(1)
                .extractedText("This is standard non-disclosure agreement terms.")
                .build();
        documentPageRepository.save(page);

        // POST /documents/{id}/report to generate report
        mockMvc.perform(post("/documents/" + doc.getId() + "/report")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Contract report generated successfully")))
                .andExpect(jsonPath("$.data.overallScore", notNullValue()))
                .andExpect(jsonPath("$.data.executiveSummary", notNullValue()))
                .andExpect(jsonPath("$.data.obligations", hasSize(3)));

        // GET /documents/{id}/report to fetch generated report
        mockMvc.perform(get("/documents/" + doc.getId() + "/report")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Contract report retrieved successfully")))
                .andExpect(jsonPath("$.data.overallScore", notNullValue()));

        // GET /documents/{id}/clauses to fetch generated clauses
        mockMvc.perform(get("/documents/" + doc.getId() + "/clauses")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document clauses retrieved successfully")))
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].clauseType", is("CONFIDENTIALITY")))
                .andExpect(jsonPath("$.data[0].riskLevel", is("LOW")));

        // GET /documents/{id}/risks to fetch generated risks
        mockMvc.perform(get("/documents/" + doc.getId() + "/risks")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document risks retrieved successfully")));

        // POST /documents/{id}/chat to ask a question
        mockMvc.perform(post("/documents/" + doc.getId() + "/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"What state governing law applies?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("FAQ Chat response generated successfully")))
                .andExpect(jsonPath("$.data.answer", is("This NDA is governed by Delaware state law as per Page 2.")));

        // PUT /users/preferences to set guidelines
        mockMvc.perform(put("/users/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"preferredGoverningLaw\":\"Delaware\",\"maxNonCompeteMonths\":6,\"requireMutualIndemnity\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Preferences updated successfully")))
                .andExpect(jsonPath("$.data.preferredGoverningLaw", is("Delaware")))
                .andExpect(jsonPath("$.data.maxNonCompeteMonths", is(6)))
                .andExpect(jsonPath("$.data.requireMutualIndemnity", is(true)));

        // GET /documents/{id}/checklist to evaluate compliance checklist
        mockMvc.perform(get("/documents/" + doc.getId() + "/checklist")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document compliance checklist retrieved successfully")))
                .andExpect(jsonPath("$.data", hasSize(3)))
                .andExpect(jsonPath("$.data[0].title", is("Preferred Governing Law State")));

        // GET /documents/{id}/export to compile PDF report
        mockMvc.perform(get("/documents/" + doc.getId() + "/export"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    @Test
    @WithUserDetails(value = "upload-tester@example.com", setupBefore = TestExecutionEvent.TEST_EXECUTION)
    public void testAdminEndpointsForbiddenForRegularUser() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    public void testAdminEndpointsSuccessForAdminUser() throws Exception {
        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalUsers", notNullValue()));
    }
}
