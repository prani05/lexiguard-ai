package com.lexiguard.controller;

import com.lexiguard.dto.ApiResponse;
import com.lexiguard.dto.DocumentResponse;
import com.lexiguard.entity.Document;
import com.lexiguard.entity.Report;
import com.lexiguard.entity.User;
import com.lexiguard.repository.UserRepository;
import com.lexiguard.repository.ReportRepository;
import com.lexiguard.dto.DocumentPageResponse;
import com.lexiguard.dto.ReportResponse;
import com.lexiguard.dto.ClauseResponse;
import com.lexiguard.dto.RiskResponse;
import com.lexiguard.dto.ChatRequest;
import com.lexiguard.dto.ChatResponse;
import com.lexiguard.dto.ChecklistItemResponse;
import com.lexiguard.repository.DocumentPageRepository;
import com.lexiguard.service.OcrService;
import com.lexiguard.service.ReportService;
import com.lexiguard.security.UserDetailsImpl;
import com.lexiguard.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/documents")
public class DocumentController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private DocumentPageRepository documentPageRepository;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private OcrService ocrService;

    @Autowired
    private ReportService reportService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IOException {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        Document doc = documentService.uploadDocument(file, user);
        return ResponseEntity.ok(ApiResponse.success("Document uploaded successfully", mapToDocumentResponse(doc)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> listDocuments(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        List<Document> docs = documentService.listUserDocuments(user);
        List<DocumentResponse> responseList = docs.stream()
                .map(this::mapToDocumentResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Documents listed successfully", responseList));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        Document doc = documentService.getDocumentByIdAndUser(id, user);
        Resource fileResource = documentService.downloadDocumentFile(doc);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFilename() + "\"")
                .body(fileResource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteDocument(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IOException {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        documentService.deleteDocument(id, user);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }

    @PostMapping("/{id}/process")
    public ResponseEntity<ApiResponse<String>> processDocument(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        Document doc = documentService.getDocumentByIdAndUser(id, user);
        ocrService.processDocumentAsync(id);

        return ResponseEntity.ok(ApiResponse.success("Document text extraction started", "PROCESSING"));
    }

    @GetMapping("/{id}/pages")
    public ResponseEntity<ApiResponse<List<DocumentPageResponse>>> getDocumentPages(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        Document doc = documentService.getDocumentByIdAndUser(id, user);
        List<DocumentPageResponse> pages = documentPageRepository.findByDocumentOrderByPageNumberAsc(doc).stream()
                .map(page -> DocumentPageResponse.builder()
                        .pageNumber(page.getPageNumber())
                        .extractedText(page.getExtractedText())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Document pages retrieved successfully", pages));
    }

    @PostMapping("/{id}/report")
    public ResponseEntity<ApiResponse<ReportResponse>> generateReport(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws Exception {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        // Validate document ownership
        documentService.getDocumentByIdAndUser(id, user);

        ReportResponse report = reportService.generateReport(id);
        return ResponseEntity.ok(ApiResponse.success("Contract report generated successfully", report));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<ApiResponse<ReportResponse>> getReport(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        ReportResponse report = reportService.getReportByDocumentId(id, user);
        return ResponseEntity.ok(ApiResponse.success("Contract report retrieved successfully", report));
    }

    @GetMapping("/{id}/clauses")
    public ResponseEntity<ApiResponse<List<ClauseResponse>>> getDocumentClauses(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        List<ClauseResponse> clauses = reportService.getClausesByDocumentId(id, user);
        return ResponseEntity.ok(ApiResponse.success("Document clauses retrieved successfully", clauses));
    }

    @GetMapping("/{id}/risks")
    public ResponseEntity<ApiResponse<List<RiskResponse>>> getDocumentRisks(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        List<RiskResponse> risks = reportService.getRisksByDocumentId(id, user);
        return ResponseEntity.ok(ApiResponse.success("Document risks retrieved successfully", risks));
    }

    @PostMapping("/{id}/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chatAboutDocument(
            @PathVariable("id") Long id,
            @RequestBody ChatRequest chatRequest,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws Exception {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        ChatResponse answer = reportService.answerDocumentQuestion(id, chatRequest.getMessage(), user);
        return ResponseEntity.ok(ApiResponse.success("FAQ Chat response generated successfully", answer));
    }

    @GetMapping("/{id}/checklist")
    public ResponseEntity<ApiResponse<List<ChecklistItemResponse>>> getDocumentChecklist(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized: Session is empty"));
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        List<ChecklistItemResponse> checklist = reportService.evaluateChecklist(id, user);
        return ResponseEntity.ok(ApiResponse.success("Document compliance checklist retrieved successfully", checklist));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportDocumentReport(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws Exception {

        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User details not found"));

        byte[] pdfBytes = reportService.generatePdfReport(id, user);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(org.springframework.http.ContentDisposition.builder("attachment")
                .filename("LexiGuard_Report_" + id + ".pdf")
                .build());

        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }

    private DocumentResponse mapToDocumentResponse(Document doc) {
        Integer score = reportRepository.findByDocument(doc)
                .map(Report::getOverallScore)
                .orElse(null);

        return DocumentResponse.builder()
                .id(doc.getId())
                .filename(doc.getFilename())
                .type(doc.getType())
                .uploadDate(doc.getUploadDate())
                .status(doc.getStatus())
                .riskScore(score)
                .build();
    }
}
