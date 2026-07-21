package com.lexiguard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lexiguard.dto.ClauseResponse;
import com.lexiguard.dto.ReportResponse;
import com.lexiguard.dto.RiskResponse;
import com.lexiguard.dto.ChatResponse;
import com.lexiguard.dto.ChecklistItemResponse;
import com.lexiguard.entity.DetectedClause;
import com.lexiguard.entity.RiskItem;
import com.lexiguard.entity.Document;
import com.lexiguard.entity.DocumentPage;
import com.lexiguard.entity.Report;
import com.lexiguard.repository.DetectedClauseRepository;
import com.lexiguard.repository.RiskItemRepository;
import com.lexiguard.repository.DocumentRepository;
import com.lexiguard.repository.ReportRepository;
import com.lexiguard.repository.DocumentPageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReportService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private DocumentPageRepository documentPageRepository;

    @Autowired
    private DetectedClauseRepository detectedClauseRepository;

    @Autowired
    private RiskItemRepository riskItemRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private RagChatService ragChatService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ReportResponse generateReport(Long documentId) throws Exception {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!"COMPLETED".equalsIgnoreCase(document.getStatus())) {
            throw new IllegalStateException("Document has not completed text extraction processing. Current status: " + document.getStatus());
        }

        List<DocumentPage> pages = documentPageRepository.findByDocumentOrderByPageNumberAsc(document);
        if (pages == null || pages.isEmpty()) {
            throw new IllegalStateException("No extracted text pages found for this document");
        }

        // Concatenate pages
        String fullText = pages.stream()
                .map(DocumentPage::getExtractedText)
                .collect(Collectors.joining("\n"));

        // Call Gemini
        String jsonResult = geminiService.generateSummary(fullText, document.getType());

        // Parse JSON
        JsonNode root = objectMapper.readTree(jsonResult);
        int score = root.path("overallScore").asInt(50);
        String execSummary = root.path("executiveSummary").asText("No summary generated");
        
        JsonNode obsNode = root.path("obligations");
        List<String> obligations = new ArrayList<>();
        if (obsNode.isArray()) {
            obsNode.forEach(node -> obligations.add(node.asText()));
        }

        JsonNode datesNode = root.path("keyDates");
        List<String> keyDates = new ArrayList<>();
        if (datesNode.isArray()) {
            datesNode.forEach(node -> keyDates.add(node.asText()));
        }

        String payTerms = root.path("paymentTerms").asText("N/A");
        String confSummary = root.path("confidentialitySummary").asText("N/A");

        // Delete any existing report to overwrite
        reportRepository.findByDocument(document).ifPresent(r -> reportRepository.delete(r));

        // Save report metadata
        Report report = Report.builder()
                .document(document)
                .overallScore(score)
                .executiveSummary(execSummary)
                .obligations(objectMapper.writeValueAsString(obligations))
                .keyDates(objectMapper.writeValueAsString(keyDates))
                .paymentTerms(payTerms)
                .confidentialitySummary(confSummary)
                .generatedAt(LocalDateTime.now())
                .build();

        Report savedReport = reportRepository.save(report);

        // Run clause detection
        try {
            String clausesJson = geminiService.detectClauses(fullText, document.getType());
            JsonNode clausesNode = objectMapper.readTree(clausesJson).path("clauses");
            
            detectedClauseRepository.deleteByDocument(document);
            
            List<DetectedClause> savedClauses = new ArrayList<>();
            if (clausesNode.isArray()) {
                for (JsonNode clauseNode : clausesNode) {
                    int confidence = clauseNode.path("confidenceScore").asInt(100);
                    String snippet = clauseNode.path("snippet").asText("").trim();
                    String summary = clauseNode.path("summary").asText("").trim();
                    String type = clauseNode.path("clauseType").asText("UNKNOWN").trim();

                    // Reject hallucinated, low-confidence, or evidence-less clauses
                    if (confidence < 90 || snippet.isEmpty() || type.equals("UNKNOWN") 
                            || type.equalsIgnoreCase("Clause Not Detected") 
                            || type.equalsIgnoreCase("Not Detected")
                            || summary.toLowerCase().contains("not detected")
                            || snippet.toLowerCase().contains("not detected")) {
                        continue;
                    }

                    DetectedClause clause = DetectedClause.builder()
                            .document(document)
                            .clauseType(type)
                            .pageNumber(clauseNode.path("pageNumber").asInt(1))
                            .summary(summary)
                            .riskLevel(clauseNode.path("riskLevel").asText("LOW"))
                            .snippet(snippet)
                            .confidenceScore(confidence)
                            .build();
                    savedClauses.add(detectedClauseRepository.save(clause));
                }
            }

            // 1. Calculate rule-based risk score
            int calculatedScore = 0;
            for (DetectedClause clause : savedClauses) {
                String type = clause.getClauseType();
                String risk = clause.getRiskLevel();
                if ("HIGH".equalsIgnoreCase(risk) || "CRITICAL".equalsIgnoreCase(risk)) {
                    if ("NON_COMPETE".equalsIgnoreCase(type)) calculatedScore += 35;
                    else if ("LIABILITY".equalsIgnoreCase(type)) calculatedScore += 30;
                    else if ("TERMINATION".equalsIgnoreCase(type)) calculatedScore += 20;
                    else if ("ARBITRATION".equalsIgnoreCase(type)) calculatedScore += 15;
                    else calculatedScore += 10;
                } else if ("MEDIUM".equalsIgnoreCase(risk)) {
                    if ("NON_COMPETE".equalsIgnoreCase(type)) calculatedScore += 15;
                    else if ("LIABILITY".equalsIgnoreCase(type)) calculatedScore += 15;
                    else if ("TERMINATION".equalsIgnoreCase(type)) calculatedScore += 10;
                    else calculatedScore += 5;
                }
            }
            calculatedScore = Math.min(100, Math.max(0, calculatedScore));

            // If we computed a score based on clauses, update the report overallScore
            if (!savedClauses.isEmpty()) {
                savedReport.setOverallScore(calculatedScore);
                reportRepository.save(savedReport);
            }

            // 2. Generate rule-based risk provision items & mitigations
            riskItemRepository.deleteByDocument(document);
            for (DetectedClause clause : savedClauses) {
                String risk = clause.getRiskLevel();
                if ("HIGH".equalsIgnoreCase(risk) || "CRITICAL".equalsIgnoreCase(risk)) {
                    String type = clause.getClauseType();
                    String mitigation = "Confirm reciprocal terms and seek advice from legal counsel.";
                    if ("NON_COMPETE".equalsIgnoreCase(type)) {
                        mitigation = "Negotiate to reduce the geographical radius and limit duration to 6 months or less.";
                    } else if ("LIABILITY".equalsIgnoreCase(type)) {
                        mitigation = "Ensure limitation of liability is reciprocal and capped at a maximum of fees paid.";
                    } else if ("TERMINATION".equalsIgnoreCase(type)) {
                        mitigation = "Request mutual termination for convenience with a standard 30-day notice period.";
                    } else if ("ARBITRATION".equalsIgnoreCase(type)) {
                        mitigation = "Ensure the governing venue is local and costs are shared equally.";
                    } else if ("PAYMENT".equalsIgnoreCase(type)) {
                        mitigation = "Request Net 30 terms instead of Net 60/90 to protect cashflow.";
                    } else if ("CONFIDENTIALITY".equalsIgnoreCase(type)) {
                        mitigation = "Limit confidentiality survival terms to a maximum of 2 to 3 years.";
                    }

                    RiskItem riskItem = RiskItem.builder()
                            .document(document)
                            .category(type.replace("_", " "))
                            .severity(risk)
                            .description(clause.getSummary())
                            .mitigation(mitigation)
                            .build();
                    riskItemRepository.save(riskItem);
                }
            }
        } catch (Exception e) {
            System.err.println("Error extracting/saving clauses for document " + documentId + ": " + e.getMessage());
            e.printStackTrace();
        }

        return mapToReportResponse(savedReport);
    }

    public ReportResponse getReportByDocumentId(Long documentId, com.lexiguard.entity.User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document report");
        }

        Report report = reportRepository.findByDocument(document)
                .orElseThrow(() -> new IllegalArgumentException("Report not found for this document"));

        return mapToReportResponse(report);
    }

    public ReportResponse mapToReportResponse(Report report) {
        List<String> obligations = new ArrayList<>();
        List<String> keyDates = new ArrayList<>();

        try {
            if (report.getObligations() != null) {
                obligations = objectMapper.readValue(report.getObligations(), new TypeReference<List<String>>() {});
            }
            if (report.getKeyDates() != null) {
                keyDates = objectMapper.readValue(report.getKeyDates(), new TypeReference<List<String>>() {});
            }
        } catch (Exception e) {
            System.err.println("Error deserializing report list details: " + e.getMessage());
        }

        return ReportResponse.builder()
                .documentId(report.getDocument().getId())
                .overallScore(report.getOverallScore())
                .executiveSummary(report.getExecutiveSummary())
                .obligations(obligations)
                .keyDates(keyDates)
                .paymentTerms(report.getPaymentTerms())
                .confidentialitySummary(report.getConfidentialitySummary())
                .generatedAt(report.getGeneratedAt())
                .build();
    }

    public List<ClauseResponse> getClausesByDocumentId(Long documentId, com.lexiguard.entity.User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document clauses");
        }

        return detectedClauseRepository.findByDocument(document).stream()
                .map(c -> ClauseResponse.builder()
                        .id(c.getId())
                        .clauseType(c.getClauseType())
                        .pageNumber(c.getPageNumber())
                        .summary(c.getSummary())
                        .riskLevel(c.getRiskLevel())
                        .snippet(c.getSnippet())
                        .confidenceScore(c.getConfidenceScore())
                        .build())
                .collect(Collectors.toList());
    }

    public List<RiskResponse> getRisksByDocumentId(Long documentId, com.lexiguard.entity.User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document risks");
        }

        return riskItemRepository.findByDocument(document).stream()
                .map(r -> RiskResponse.builder()
                        .id(r.getId())
                        .category(r.getCategory())
                        .severity(r.getSeverity())
                        .description(r.getDescription())
                        .mitigation(r.getMitigation())
                        .build())
                .collect(Collectors.toList());
    }

    public ChatResponse answerDocumentQuestion(Long documentId, String question, com.lexiguard.entity.User user) throws Exception {
        String answer = ragChatService.answerDocumentQuestion(documentId, question, user);
        return ChatResponse.builder().answer(answer).build();
    }

    public List<ChecklistItemResponse> evaluateChecklist(Long documentId, com.lexiguard.entity.User user) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document checklist");
        }

        List<DetectedClause> clauses = detectedClauseRepository.findByDocument(document);
        List<ChecklistItemResponse> checklist = new ArrayList<>();

        // 1. Governing Law Check
        DetectedClause govLawClause = clauses.stream()
                .filter(c -> "GOVERNING_LAW".equalsIgnoreCase(c.getClauseType()))
                .findFirst().orElse(null);

        String preferredState = user.getPreferredGoverningLaw();
        if (preferredState != null && !preferredState.trim().isEmpty()) {
            if (govLawClause == null) {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Preferred Governing Law State")
                        .status("WARNING")
                        .description("No governing law clause was detected. Your preference is " + preferredState + ".")
                        .mitigation("Request adding a governing law clause setting the jurisdiction to " + preferredState + ".")
                        .build());
            } else {
                boolean matches = govLawClause.getSummary().toLowerCase().contains(preferredState.toLowerCase())
                        || (govLawClause.getSnippet() != null && govLawClause.getSnippet().toLowerCase().contains(preferredState.toLowerCase()));
                if (matches) {
                    checklist.add(ChecklistItemResponse.builder()
                            .title("Preferred Governing Law State")
                            .status("PASSED")
                            .description("The contract governing law is set to " + preferredState + ", matching your preference.")
                            .mitigation("No action required.")
                            .build());
                } else {
                    checklist.add(ChecklistItemResponse.builder()
                            .title("Preferred Governing Law State")
                            .status("FAILED")
                            .description("The contract governing law does not match your preference of " + preferredState + ".")
                            .mitigation("Request changing the governing law jurisdiction clause to " + preferredState + ".")
                            .build());
                }
            }
        } else {
            if (govLawClause != null) {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Preferred Governing Law State")
                        .status("PASSED")
                        .description("Governing law is defined in the contract: " + govLawClause.getSummary())
                        .mitigation("No action required.")
                        .build());
            } else {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Preferred Governing Law State")
                        .status("WARNING")
                        .description("No governing law clause was detected in the contract.")
                        .mitigation("Verify governing law jurisdiction with the other party or define Delaware/New York state law.")
                        .build());
            }
        }

        // 2. Non-Compete Check
        DetectedClause nonCompeteClause = clauses.stream()
                .filter(c -> "NON_COMPETE".equalsIgnoreCase(c.getClauseType()))
                .findFirst().orElse(null);

        Integer maxMonths = user.getMaxNonCompeteMonths();
        if (nonCompeteClause != null) {
            int duration = parseNonCompeteMonths(nonCompeteClause.getSummary() + " " + nonCompeteClause.getSnippet());
            if (maxMonths != null) {
                if (duration > maxMonths) {
                    checklist.add(ChecklistItemResponse.builder()
                            .title("Restrictive Non-Compete Period")
                            .status("FAILED")
                            .description("A non-compete clause was found with a duration of " + duration + " months, which exceeds your maximum limit of " + maxMonths + " months.")
                            .mitigation("Negotiate to reduce the post-employment non-compete restriction duration to " + maxMonths + " months or remove it completely.")
                            .build());
                } else {
                    checklist.add(ChecklistItemResponse.builder()
                            .title("Restrictive Non-Compete Period")
                            .status("PASSED")
                            .description("The non-compete duration of " + duration + " months is within your maximum limit of " + maxMonths + " months.")
                            .mitigation("No action required.")
                            .build());
                }
            } else {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Restrictive Non-Compete Period")
                        .status("WARNING")
                        .description("A non-compete clause was detected (" + duration + " months duration).")
                        .mitigation("Review the non-compete scope to ensure it is reasonable.")
                        .build());
            }
        } else {
            checklist.add(ChecklistItemResponse.builder()
                    .title("Restrictive Non-Compete Period")
                    .status("PASSED")
                    .description("No post-employment non-compete restrictions were found in this agreement.")
                    .mitigation("No action required.")
                    .build());
        }

        // 3. Indemnification Check
        DetectedClause liabilityClause = clauses.stream()
                .filter(c -> "LIABILITY".equalsIgnoreCase(c.getClauseType()))
                .findFirst().orElse(null);

        Boolean requireMutual = user.getRequireMutualIndemnity();
        if (Boolean.TRUE.equals(requireMutual)) {
            if (liabilityClause == null) {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Mutual Indemnification & Liability")
                        .status("WARNING")
                        .description("No liability or indemnity terms were detected. Your preference requires mutual terms.")
                        .mitigation("Add mutual indemnification and standard limitations of liability to balance commercial risks.")
                        .build());
            } else {
                String text = (liabilityClause.getSummary() + " " + liabilityClause.getSnippet()).toLowerCase();
                boolean isUnilateral = text.contains("unilateral") || text.contains("one-sided") 
                        || text.contains("client has unlimited") || text.contains("limits contractor only");
                if (isUnilateral) {
                    checklist.add(ChecklistItemResponse.builder()
                            .title("Mutual Indemnification & Liability")
                            .status("FAILED")
                            .description("Indemnification terms appear unilateral or favor only one party, violating your preference for balanced risk.")
                            .mitigation("Request modifying the liability clause to be mutual so both parties are protected equally.")
                            .build());
                } else {
                    checklist.add(ChecklistItemResponse.builder()
                            .title("Mutual Indemnification & Liability")
                            .status("PASSED")
                            .description("Indemnification terms are mutual and balanced.")
                            .mitigation("No action required.")
                            .build());
                }
            }
        } else {
            if (liabilityClause != null) {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Mutual Indemnification & Liability")
                        .status("PASSED")
                        .description("Indemnification or liability clauses are present in the agreement.")
                        .mitigation("No action required.")
                        .build());
            } else {
                checklist.add(ChecklistItemResponse.builder()
                        .title("Mutual Indemnification & Liability")
                        .status("WARNING")
                        .description("No liability or indemnity clauses were detected in this agreement.")
                        .mitigation("Verify if liability limits or indemnity protection is needed for this transaction.")
                        .build());
            }
        }

        return checklist;
    }

    private int parseNonCompeteMonths(String text) {
        if (text == null) return 0;
        String clean = text.toLowerCase();

        // Match explicit words
        if (clean.contains("24 month") || clean.contains("two year") || clean.contains("2 year")) {
            return 24;
        }
        if (clean.contains("18 month") || clean.contains("1.5 year") || clean.contains("one and a half year")) {
            return 18;
        }
        if (clean.contains("12 month") || clean.contains("one year") || clean.contains("1 year")) {
            return 12;
        }
        if (clean.contains("6 month") || clean.contains("six month")) {
            return 6;
        }
        if (clean.contains("3 month") || clean.contains("three month")) {
            return 3;
        }

        // Regex scan for any numbers
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\b(\\d+)\\b");
        java.util.regex.Matcher m = p.matcher(clean);
        while (m.find()) {
            try {
                int val = Integer.parseInt(m.group(1));
                // If it is adjacent to year/years, multiply by 12
                int idx = clean.indexOf(m.group(1));
                String after = clean.substring(idx + m.group(1).length());
                if (after.trim().startsWith("year") || after.trim().startsWith("yr")) {
                    return val * 12;
                } else if (after.trim().startsWith("month") || after.trim().startsWith("mo")) {
                    return val;
                }
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }

        return 12;
    }

    public byte[] generatePdfReport(Long documentId, com.lexiguard.entity.User user) throws Exception {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document");
        }

        ReportResponse report = getReportByDocumentId(documentId, user);
        List<ClauseResponse> clauses = getClausesByDocumentId(documentId, user);
        List<ChecklistItemResponse> checklist = evaluateChecklist(documentId, user);

        return PdfReportExporter.exportReport(
                document.getFilename(),
                document.getType(),
                report,
                clauses,
                checklist
        );
    }
}
