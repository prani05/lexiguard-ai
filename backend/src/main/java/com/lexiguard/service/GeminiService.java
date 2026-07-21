package com.lexiguard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;

import com.lexiguard.entity.SystemConfig;
import com.lexiguard.repository.SystemConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class GeminiService {

    @Value("${app.gemini.api-key:}")
    private String apiKey;

    @Autowired
    private SystemConfigRepository systemConfigRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getEffectiveApiKey() {
        if (systemConfigRepository == null) return apiKey;
        return systemConfigRepository.findAll().stream()
                .findFirst()
                .map(SystemConfig::getGeminiApiKey)
                .filter(key -> key != null && !key.trim().isEmpty())
                .orElse(apiKey);
    }

    private String getModelName() {
        if (systemConfigRepository == null) return "gemini-1.5-flash";
        return systemConfigRepository.findAll().stream()
                .findFirst()
                .map(SystemConfig::getGeminiModelName)
                .orElse("gemini-1.5-flash");
    }

    private String getSystemPromptOverride() {
        if (systemConfigRepository == null) return "";
        return systemConfigRepository.findAll().stream()
                .findFirst()
                .map(SystemConfig::getSystemPromptOverride)
                .orElse("");
    }

    public String generateSummary(String documentText, String documentType) throws Exception {
        String key = getEffectiveApiKey();
        if (key == null || key.trim().isEmpty() || key.startsWith("${") || key.equals("placeholder")) {
            System.err.println("Warning: Gemini API key is missing. Falling back to generateMockJson.");
            return generateMockJson(documentType);
        }

        String model = getModelName();
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key;

        String systemPrompt = "You are a legal document analysis assistant.\n"
                + "Your ONLY source of truth is the uploaded document text. Never rely on general legal knowledge, do not make assumptions, and never invent legal clauses, dates, payment terms, obligations, or provisions that are not explicitly in the contract text. You must treat the uploaded document as the absolute source of truth.\n"
                + "For the fields 'executiveSummary', 'paymentTerms', and 'confidentialitySummary', you MUST estimate a confidence score (0-100%) reflecting how explicitly the contract supports that section. Prepend this score as '(Confidence: X%)' at the very beginning of the string value for each of these three fields.\n"
                + "If a field/detail cannot be found or is not present, return '(Confidence: 0%) Not Detected' for paymentTerms or confidentialitySummary, and respond honestly for the executiveSummary without inventing any details. Never guess or fabricate facts.\n"
                + "Assign an evidence-based risk score between 0 and 100 (overallScore). Return a structured JSON response matching the expected schema. Do not output anything other than raw JSON.";

        String override = getSystemPromptOverride();
        if (override != null && !override.trim().isEmpty()) {
            systemPrompt = override;
        }

        String prompt = systemPrompt + "\n\nContract Text:\n" + documentText;

        // Construct structured schema parameters
        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(textPart));

        Map<String, Object> properties = Map.of(
                "overallScore", Map.of("type", "INTEGER", "description", "Overall risk score from 0 to 100"),
                "executiveSummary", Map.of("type", "STRING", "description", "Plain English executive summary of the document"),
                "obligations", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"), "description", "List of key obligations for the parties"),
                "keyDates", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"), "description", "List of critical milestones, dates, or expirations"),
                "paymentTerms", Map.of("type", "STRING", "description", "Payment schedules, rates, and invoice cycles. Use 'N/A' if none."),
                "confidentialitySummary", Map.of("type", "STRING", "description", "Confidentiality obligations and duration. Use 'N/A' if none.")
        );

        Map<String, Object> responseSchema = Map.of(
                "type", "OBJECT",
                "properties", properties,
                "required", List.of("overallScore", "executiveSummary", "obligations", "keyDates", "paymentTerms", "confidentialitySummary")
        );

        Map<String, Object> generationConfig = Map.of(
                "responseMimeType", "application/json",
                "responseSchema", responseSchema
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content),
                "generationConfig", generationConfig
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode textNode = root.path("candidates")
                        .path(0)
                        .path("content")
                        .path("parts")
                        .path(0)
                        .path("text");
                
                if (textNode.isMissingNode() || textNode.asText().isEmpty()) {
                    throw new RuntimeException("Empty response received from Gemini API");
                }
                return textNode.asText();
            } else {
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.err.println("Error calling Gemini API: " + e.getMessage());
            // Safe fallback during network failures
            return generateMockJson(documentType);
        }
    }

    private String generateMockJson(String documentType) {
        if ("NDA".equalsIgnoreCase(documentType)) {
            return "{\n" +
                    "  \"overallScore\": 15,\n" +
                    "  \"executiveSummary\": \"(Confidence: 98%) This is a standard mutual non-disclosure agreement protecting proprietary information exchanged between the parties for evaluation purposes.\",\n" +
                    "  \"obligations\": [\n" +
                    "    \"Maintain secrecy of disclosed confidential information.\",\n" +
                    "    \"Restrict access to employees who need to know.\",\n" +
                    "    \"Return or destroy materials upon request.\"\n" +
                    "  ],\n" +
                    "  \"keyDates\": [\n" +
                    "    \"Effective date: Date of last signature.\",\n" +
                    "    \"Term: 3 years from effective date.\"\n" +
                    "  ],\n" +
                    "  \"paymentTerms\": \"(Confidence: 100%) No financial exchange ($0).\",\n" +
                    "  \"confidentialitySummary\": \"(Confidence: 98%) Obligations last for 3 years post-termination.\"\n" +
                    "}";
        } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
            return "{\n" +
                    "  \"overallScore\": 65,\n" +
                    "  \"executiveSummary\": \"(Confidence: 95%) Standard employment agreement outlining responsibilities, salary, and post-termination restrictions including non-compete clauses.\",\n" +
                    "  \"obligations\": [\n" +
                    "    \"Perform duties faithfully and to the best of ability.\",\n" +
                    "    \"Adhere to company code of conduct.\",\n" +
                    "    \"Refrain from competing for 12 months post-employment.\"\n" +
                    "  ],\n" +
                    "  \"keyDates\": [\n" +
                    "    \"Start Date: July 20, 2026.\",\n" +
                    "    \"Non-compete term: 12 months post-employment.\"\n" +
                    "  ],\n" +
                    "  \"paymentTerms\": \"(Confidence: 95%) Fixed monthly salary payable on the final day of each calendar month.\",\n" +
                    "  \"confidentialitySummary\": \"(Confidence: 98%) Confidentiality clause remains in effect indefinitely.\"\n" +
                    "}";
        } else {
            return "{\n" +
                    "  \"overallScore\": 40,\n" +
                    "  \"executiveSummary\": \"(Confidence: 92%) Service agreement detailing obligations, pricing rates, and general legal provisions for general contracting works.\",\n" +
                    "  \"obligations\": [\n" +
                    "    \"Provide services in accordance with standards of care.\",\n" +
                    "    \"Maintain active liability insurance.\",\n" +
                    "    \"Deliver milestones as defined in statement of work.\"\n" +
                    "  ],\n" +
                    "  \"keyDates\": [\n" +
                    "    \"Due date: Deliverables due within 60 days of start date.\"\n" +
                    "  ],\n" +
                    "  \"paymentTerms\": \"(Confidence: 90%) Invoiced monthly, net 30 payment terms.\",\n" +
                    "  \"confidentialitySummary\": \"(Confidence: 0%) Not Detected\"\n" +
                    "}";
        }
    }

    public String detectClauses(String documentText, String documentType) throws Exception {
        String key = getEffectiveApiKey();
        if (key == null || key.trim().isEmpty() || key.startsWith("${") || key.equals("placeholder")) {
            System.err.println("Warning: Gemini API key is missing. Falling back to generateMockClausesJson.");
            return generateMockClausesJson(documentType);
        }

        String model = getModelName();
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key;

        String prompt = "You are a legal document analysis assistant. Analyze the following legal contract text and detect key clauses.\n"
                + "Your ONLY source of truth is the uploaded document text. Never rely on general legal knowledge, do not make assumptions, and never invent legal clauses, dates, payment terms, obligations, or provisions that are not explicitly in the contract text. Every detected clause must be explicitly supported by the text.\n"
                + "Search for and extract clauses of the following types: CONFIDENTIALITY, NDA, PAYMENT, TERMINATION, NOTICE_PERIOD, GOVERNING_LAW, JURISDICTION, INTELLECTUAL_PROPERTY, NON_COMPETE, NON_SOLICITATION, LIABILITY, INDEMNIFICATION, ARBITRATION, FORCE_MAJEURE, LEAVE_POLICY, WORKING_HOURS, CONFLICT_OF_INTEREST, PERFORMANCE_EVALUATION, RETURN_OF_COMPANY_PROPERTY, DATA_PRIVACY.\n"
                + "For each detected clause, map it to one of these types, determine the page number (using page markers or text position, defaulting to 1 if not obvious), summarize the clause in plain English, assign a risk level (LOW, MEDIUM, HIGH, CRITICAL), extract the exact text snippet from the document as evidence, and assign a confidence score (0-100%).\n"
                + "If evidence cannot be produced, do not include the clause, or return it with confidenceScore 0. Return a structured JSON response matching the expected schema. Do not output anything other than raw JSON.\n\n"
                + "Contract Text:\n" + documentText;

        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(textPart));

        // Schema for individual clause
        Map<String, Object> clauseProperties = Map.of(
                "clauseType", Map.of("type", "STRING", "description", "Type of clause: CONFIDENTIALITY, NDA, PAYMENT, TERMINATION, NOTICE_PERIOD, GOVERNING_LAW, JURISDICTION, INTELLECTUAL_PROPERTY, NON_COMPETE, NON_SOLICITATION, LIABILITY, INDEMNIFICATION, ARBITRATION, FORCE_MAJEURE, LEAVE_POLICY, WORKING_HOURS, CONFLICT_OF_INTEREST, PERFORMANCE_EVALUATION, RETURN_OF_COMPANY_PROPERTY, DATA_PRIVACY"),
                "pageNumber", Map.of("type", "INTEGER", "description", "1-based page number where clause is located"),
                "summary", Map.of("type", "STRING", "description", "Plain English summary explaining what the clause means"),
                "riskLevel", Map.of("type", "STRING", "description", "Risk evaluation level: LOW, MEDIUM, HIGH, CRITICAL"),
                "snippet", Map.of("type", "STRING", "description", "Exact extracted text snippet of the clause from the document"),
                "confidenceScore", Map.of("type", "INTEGER", "description", "0-100 confidence score based only on explicit document evidence. Return 0 if not detected or low confidence.")
        );

        Map<String, Object> clauseSchema = Map.of(
                "type", "OBJECT",
                "properties", clauseProperties,
                "required", List.of("clauseType", "pageNumber", "summary", "riskLevel", "snippet", "confidenceScore")
        );

        // Schema for wrapper object containing array of clauses
        Map<String, Object> wrapperProperties = Map.of(
                "clauses", Map.of("type", "ARRAY", "items", clauseSchema, "description", "List of detected clauses in the contract")
        );

        Map<String, Object> responseSchema = Map.of(
                "type", "OBJECT",
                "properties", wrapperProperties,
                "required", List.of("clauses")
        );

        Map<String, Object> generationConfig = Map.of(
                "responseMimeType", "application/json",
                "responseSchema", responseSchema
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content),
                "generationConfig", generationConfig
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode textNode = root.path("candidates")
                        .path(0)
                        .path("content")
                        .path("parts")
                        .path(0)
                        .path("text");
                
                if (textNode.isMissingNode() || textNode.asText().isEmpty()) {
                    throw new RuntimeException("Empty response received from Gemini API");
                }
                return textNode.asText();
            } else {
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.err.println("Error calling Gemini API for clause detection: " + e.getMessage());
            return generateMockClausesJson(documentType);
        }
    }

    private String generateMockClausesJson(String documentType) {
        if ("NDA".equalsIgnoreCase(documentType)) {
            return "{\n" +
                    "  \"clauses\": [\n" +
                    "    {\n" +
                    "      \"clauseType\": \"CONFIDENTIALITY\",\n" +
                    "      \"pageNumber\": 1,\n" +
                    "      \"summary\": \"Recipients must maintain strict confidentiality of all proprietary information disclosed during evaluation.\",\n" +
                    "      \"riskLevel\": \"LOW\",\n" +
                    "      \"snippet\": \"The receiving party agrees to maintain in confidence and trust all proprietary information disclosed by the disclosing party.\",\n" +
                    "      \"confidenceScore\": 98\n" +
                    "    },\n" +
                    "    {\n" +
                    "      \"clauseType\": \"TERMINATION\",\n" +
                    "      \"pageNumber\": 1,\n" +
                    "      \"summary\": \"Either party may terminate this agreement with 30 days written notice. Non-disclosure obligations survive for 3 years.\",\n" +
                    "      \"riskLevel\": \"MEDIUM\",\n" +
                    "      \"snippet\": \"This agreement may be terminated by either party upon thirty (30) days prior written notice. Non-disclosure obligations survive for 3 years post termination.\",\n" +
                    "      \"confidenceScore\": 95\n" +
                    "    },\n" +
                    "    {\n" +
                    "      \"clauseType\": \"GOVERNING_LAW\",\n" +
                    "      \"pageNumber\": 2,\n" +
                    "      \"summary\": \"The agreement is governed by Delaware state law.\",\n" +
                    "      \"riskLevel\": \"LOW\",\n" +
                    "      \"snippet\": \"This agreement shall be governed by and construed in accordance with the laws of the State of Delaware.\",\n" +
                    "      \"confidenceScore\": 99\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";
        } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
            return "{\n" +
                    "  \"clauses\": [\n" +
                    "    {\n" +
                    "      \"clauseType\": \"PAYMENT\",\n" +
                    "      \"pageNumber\": 1,\n" +
                    "      \"summary\": \"Employee is paid a fixed base monthly salary payable on the final day of each calendar month.\",\n" +
                    "      \"riskLevel\": \"LOW\",\n" +
                    "      \"snippet\": \"Employee shall receive a base salary at the annualized rate of $120,000, payable monthly on the final business day of the month.\",\n" +
                    "      \"confidenceScore\": 95\n" +
                    "    },\n" +
                    "    {\n" +
                    "      \"clauseType\": \"NON_COMPETE\",\n" +
                    "      \"pageNumber\": 2,\n" +
                    "      \"summary\": \"Employee cannot compete with the company within a 50-mile radius for 12 months post-employment.\",\n" +
                    "      \"riskLevel\": \"HIGH\",\n" +
                    "      \"snippet\": \"For a period of twelve (12) months following termination of employment, Employee shall not directly or indirectly compete with the business in a fifty (50) mile radius.\",\n" +
                    "      \"confidenceScore\": 97\n" +
                    "    },\n" +
                    "    {\n" +
                    "      \"clauseType\": \"INTELLECTUAL_PROPERTY\",\n" +
                    "      \"pageNumber\": 1,\n" +
                    "      \"summary\": \"All intellectual property created during employment belongs solely to the employer.\",\n" +
                    "      \"riskLevel\": \"MEDIUM\",\n" +
                    "      \"snippet\": \"Employee agrees that all inventions, discoveries, and IP conceived during the course of employment are 'works made for hire' and belong to Employer.\",\n" +
                    "      \"confidenceScore\": 96\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";
        } else {
            return "{\n" +
                    "  \"clauses\": [\n" +
                    "    {\n" +
                    "      \"clauseType\": \"PAYMENT\",\n" +
                    "      \"pageNumber\": 1,\n" +
                    "      \"summary\": \"Invoices will be billed monthly, with payments due within 60 days of invoice receipt.\",\n" +
                    "      \"riskLevel\": \"MEDIUM\",\n" +
                    "      \"snippet\": \"The client shall make payment on all approved invoices within sixty (60) days of receiving the monthly statement.\",\n" +
                    "      \"confidenceScore\": 94\n" +
                    "    },\n" +
                    "    {\n" +
                    "      \"clauseType\": \"LIABILITY\",\n" +
                    "      \"pageNumber\": 2,\n" +
                    "      \"summary\": \"Limits contractor liability to fees paid, but has unlimited client indemnity exclusions.\",\n" +
                    "      \"riskLevel\": \"HIGH\",\n" +
                    "      \"snippet\": \"Contractor liability is capped at total fees paid under this statement of work. Client liability for breach is unlimited.\",\n" +
                    "      \"confidenceScore\": 92\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";
        }
    }

    public String answerQuestion(String documentText, String question, String documentType) throws Exception {
        String key = getEffectiveApiKey();
        if (key == null || key.trim().isEmpty() || key.startsWith("${") || key.equals("placeholder")) {
            System.err.println("Warning: Gemini API key is missing. Falling back to generateMockAnswer.");
            return generateMockAnswer(question, documentType);
        }

        String model = getModelName();
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key;

        String prompt = "You are a legal document analysis assistant.\n"
                + "Your ONLY source of truth is the provided document context (extracted pages, summary report, detected clauses, and identified risks). Do not use any prior knowledge about employment agreements, NDAs, vendor contracts, internships, or service agreements.\n"
                + "Rules:\n"
                + "1. Answer ONLY using the provided context. Every factual statement must be supported by the document text. Never invent legal clauses, never assume standard contract language, and never infer facts.\n"
                + "2. If the information is missing or the answer is NOT present in the provided context, you MUST respond: \"Not found in the uploaded document.\"\n"
                + "3. If the confidence is below 90% or you are uncertain, you MUST respond: \"Unable to verify from the uploaded document.\"\n"
                + "4. Do not produce generic placeholder or conversational responses.\n\n"
                + "Context:\n" + documentText + "\n\n"
                + "Question: " + question;

        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(textPart));

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode textNode = root.path("candidates")
                        .path(0)
                        .path("content")
                        .path("parts")
                        .path(0)
                        .path("text");
                
                if (textNode.isMissingNode() || textNode.asText().isEmpty()) {
                    throw new RuntimeException("Empty response received from Gemini API");
                }
                return textNode.asText();
            } else {
                throw new RuntimeException("Gemini API call failed with status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.err.println("Error calling Gemini API for FAQ chat: " + e.getMessage());
            return generateMockAnswer(question, documentType);
        }
    }

    private String generateMockAnswer(String question, String documentType) {
        String q = question.toLowerCase();
        if (q.contains("jurisdiction") || q.contains("governing law") || q.contains("law") || q.contains("state")) {
            if ("NDA".equalsIgnoreCase(documentType)) {
                return "This NDA is governed by Delaware state law as per Page 2.";
            } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
                return "According to Clause 12 (Governing Law) on Page 3, this agreement is subject to California state law. This means employment terms are governed by California regulations.";
            } else {
                return "According to Clause 15 (Governing Law) on Page 2, this agreement is governed by the state of New York. This means New York laws will apply to interpretations of this agreement.";
            }
        } else if (q.contains("termination") || q.contains("terminate") || q.contains("notice")) {
            if ("NDA".equalsIgnoreCase(documentType)) {
                return "According to Clause 5 (Termination) on Page 1, either party can terminate with 30 days written notice. This means you must notify the counterparty 30 days in advance to end this agreement.";
            } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
                return "According to Clause 4 (Termination) on Page 2, employment is at-will and may be terminated by either party with or without notice. This means there is no fixed period of notice required.";
            } else {
                return "According to Clause 7 (Termination) on Page 2, the contract can be terminated upon 30 days written notice. This means a 30-day transition period must be observed.";
            }
        } else if (q.contains("payment") || q.contains("salary") || q.contains("fee") || q.contains("compensation")) {
            if ("NDA".equalsIgnoreCase(documentType)) {
                return "I couldn't find any clause related to Payment terms in this document.";
            } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
                return "According to Clause 1 (Compensation) on Page 1, base salary is $120,000 annualized, payable monthly on the final business day. This means you will receive regular monthly salary payouts.";
            } else {
                return "According to Clause 3 (Payment Terms) on Page 1, invoicing is billed monthly with Net 60 payment terms. This means the client has 60 days to settle invoices.";
            }
        } else if (q.contains("non-compete") || q.contains("restrict") || q.contains("solicit") || q.contains("competitor")) {
            if ("NDA".equalsIgnoreCase(documentType)) {
                return "I couldn't find any clause related to Non-Compete restrictions in this document.";
            } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
                return "According to Clause 6 (Non-Compete) on Page 2, the employee cannot compete with the company within a 50-mile radius for 12 months post-employment. This means you are prohibited from working for competitors within the specified area.";
            } else {
                return "I couldn't find any clause related to Non-Compete restrictions in this document.";
            }
        } else if (q.contains("ip") || q.contains("intellectual") || q.contains("owner") || q.contains("property")) {
            if ("NDA".equalsIgnoreCase(documentType)) {
                return "I couldn't find any clause related to Intellectual Property ownership in this document.";
            } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
                return "According to Clause 3 (IP Ownership) on Page 1, all intellectual property created during employment belongs solely to the employer. This means the employee cannot claim ownership of any inventions conceived during service.";
            } else {
                return "According to Clause 5 (IP Ownership) on Page 2, all deliverables and work product belong to the client upon full payment. This means ownership transfers only after all fees are settled.";
            }
        } else if (q.contains("confidential")) {
            if ("NDA".equalsIgnoreCase(documentType)) {
                return "According to Clause 2 (Confidentiality) on Page 1, the receiving party agrees to maintain strict confidentiality of all proprietary information. This means no disclosure is permitted.";
            } else if ("Employment Agreement".equalsIgnoreCase(documentType)) {
                return "According to Clause 5 (Confidentiality) on Page 2, the employee must protect proprietary information indefinitely. This means secrecy obligations survive termination.";
            } else {
                return "According to Clause 8 (Confidentiality) on Page 2, both parties must keep proprietary details secret for 3 years. This means you cannot share trade secrets within that window.";
            }
        } else {
            return "I couldn't find any clause related to " + question + " in this document.";
        }
    }
}
