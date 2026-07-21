package com.lexiguard.service;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.DocumentPage;
import com.lexiguard.repository.DocumentPageRepository;
import com.lexiguard.repository.DocumentRepository;
import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.embedding.AllMiniLmL6V2EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import dev.langchain4j.data.embedding.Embedding;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RagChatService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPageRepository documentPageRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private com.lexiguard.repository.ReportRepository reportRepository;

    @Autowired
    private com.lexiguard.repository.DetectedClauseRepository detectedClauseRepository;

    @Autowired
    private com.lexiguard.repository.RiskItemRepository riskItemRepository;

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username:postgres}")
    private String dbUser;

    @Value("${spring.datasource.password:Prani05}")
    private String dbPassword;

    private final EmbeddingModel embeddingModel = new AllMiniLmL6V2EmbeddingModel();

    public String answerDocumentQuestion(Long documentId, String question, com.lexiguard.entity.User user) throws Exception {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document Q&A");
        }

        List<DocumentPage> pages = documentPageRepository.findByDocumentOrderByPageNumberAsc(document);
        if (pages == null || pages.isEmpty()) {
            throw new IllegalStateException("No extracted text pages found for this document");
        }

        // Initialize embedding store: Attempt pgvector first, fallback to InMemory if unavailable
        EmbeddingStore<TextSegment> embeddingStore;
        try {
            // Parse connection parameters from jdbc url
            String cleanUrl = dbUrl.replace("jdbc:postgresql://", "");
            // Handle optional query parameters if present
            if (cleanUrl.contains("?")) {
                cleanUrl = cleanUrl.substring(0, cleanUrl.indexOf("?"));
            }
            String[] parts = cleanUrl.split("/");
            String hostPort = parts[0];
            String dbName = parts[1];
            String host = hostPort.contains(":") ? hostPort.split(":")[0] : hostPort;
            int port = hostPort.contains(":") ? Integer.parseInt(hostPort.split(":")[1]) : 5432;

            embeddingStore = PgVectorEmbeddingStore.builder()
                    .host(host)
                    .port(port)
                    .database(dbName)
                    .user(dbUser)
                    .password(dbPassword)
                    .table("document_vectors_" + documentId)
                    .dimension(384) // Dimension of MiniLM-L6-V2 is 384
                    .build();

            // Run a dummy add to verify if the vector table creation or pgvector extension fails
            TextSegment dummySegment = TextSegment.from("dummy", Metadata.from("pageNumber", 1));
            Embedding dummyEmbedding = embeddingModel.embed(dummySegment).content();
            embeddingStore.add(dummyEmbedding, dummySegment);
            
            System.out.println(">>> PgVectorEmbeddingStore initialized successfully for document: " + documentId);
        } catch (Exception e) {
            System.out.println(">>> PGVector extension not available or failed to initialize: " + e.getMessage());
            System.out.println(">>> Falling back to InMemoryEmbeddingStore for Q&A...");
            embeddingStore = new InMemoryEmbeddingStore<>();
        }

        // Load document pages into store
        for (DocumentPage page : pages) {
            TextSegment segment = TextSegment.from(
                    page.getExtractedText(),
                    Metadata.from("pageNumber", page.getPageNumber())
            );
            Embedding embedding = embeddingModel.embed(segment).content();
            embeddingStore.add(embedding, segment);
        }

        // Search the store for the top 3 most relevant segments
        Embedding queryEmbedding = embeddingModel.embed(question).content();
        List<EmbeddingMatch<TextSegment>> matches = embeddingStore.findRelevant(queryEmbedding, 3);

        // Construct context using the retrieved segments only
        StringBuilder contextBuilder = new StringBuilder();
        if (matches != null && !matches.isEmpty()) {
            for (EmbeddingMatch<TextSegment> match : matches) {
                TextSegment matchedSegment = match.embedded();
                int pageNum = matchedSegment.metadata().getInteger("pageNumber");
                contextBuilder.append("[Page ").append(pageNum).append("]: ")
                        .append(matchedSegment.text()).append("\n\n");
            }
        }

        String context = contextBuilder.toString();
        if (context.trim().isEmpty()) {
            // Fallback to concatenation if vector search returned nothing
            context = pages.stream()
                    .map(p -> "[Page " + p.getPageNumber() + "]: " + p.getExtractedText())
                    .collect(Collectors.joining("\n\n"));
        }

        // Load report summary
        String summaryText = reportRepository.findByDocument(document)
                .map(r -> "Executive Summary: " + r.getExecutiveSummary() 
                        + "\nPayment Terms: " + r.getPaymentTerms() 
                        + "\nConfidentiality Summary: " + r.getConfidentialitySummary())
                .orElse("No summary available.");

        // Load detected clauses
        String clausesText = detectedClauseRepository.findByDocument(document).stream()
                .map(c -> "Clause Type " + c.getClauseType() + " (Page " + c.getPageNumber() + "): " + c.getSummary() + " [Snippet: \"" + c.getSnippet() + "\"]")
                .collect(Collectors.joining("\n"));

        // Load identified risks
        String risksText = riskItemRepository.findByDocument(document).stream()
                .map(r -> "Risk Category " + r.getCategory() + " (Severity: " + r.getSeverity() + "): " + r.getDescription() + " (Mitigation: " + r.getMitigation() + ")")
                .collect(Collectors.joining("\n"));

        String unifiedContext = "--- EXTRACTED CONTRACT PAGES ---\n" + context + "\n\n"
                + "--- CONTRACT SUMMARY REPORT ---\n" + summaryText + "\n\n"
                + "--- DETECTED CLAUSES ---\n" + clausesText + "\n\n"
                + "--- IDENTIFIED RISKS ---\n" + risksText + "\n";

        // Ask Gemini Service using the enriched grounded context
        return geminiService.answerQuestion(unifiedContext, question, document.getType());
    }
}
