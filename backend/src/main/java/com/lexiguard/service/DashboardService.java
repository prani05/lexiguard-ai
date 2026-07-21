package com.lexiguard.service;

import com.lexiguard.dto.DashboardStatsResponse;
import com.lexiguard.dto.DocumentResponse;
import com.lexiguard.entity.Document;
import com.lexiguard.entity.Report;
import com.lexiguard.entity.User;
import com.lexiguard.repository.DocumentRepository;
import com.lexiguard.repository.ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private com.lexiguard.repository.SystemConfigRepository systemConfigRepository;

    @org.springframework.beans.factory.annotation.Value("${app.jwt.secret}")
    private String jwtSecret;

    @Transactional
    public DashboardStatsResponse getDashboardSummary(User user) {
        Long totalDocs = documentRepository.countByUser(user);
        Double avgRisk = reportRepository.getAverageRiskScoreByUser(user);
        if (avgRisk == null) {
            avgRisk = 0.0;
        }
        
        // Clean average risk score to 1 decimal place
        avgRisk = Math.round(avgRisk * 10.0) / 10.0;

        List<Document> docs = documentRepository.findByUserOrderByUploadDateDesc(user);
        List<DocumentResponse> recentDocs = docs.stream().map(doc -> {
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
        }).collect(Collectors.toList());

        // Compute categories
        Map<String, Long> categories = new HashMap<>();
        categories.put("Low", 0L);
        categories.put("Medium", 0L);
        categories.put("High", 0L);
        categories.put("Critical", 0L);

        for (DocumentResponse d : recentDocs) {
            if (d.getRiskScore() != null) {
                int score = d.getRiskScore();
                if (score <= 35) {
                    categories.put("Low", categories.get("Low") + 1);
                } else if (score <= 65) {
                    categories.put("Medium", categories.get("Medium") + 1);
                } else if (score <= 85) {
                    categories.put("High", categories.get("High") + 1);
                } else {
                    categories.put("Critical", categories.get("Critical") + 1);
                }
            }
        }

        com.lexiguard.entity.SystemConfig sc = systemConfigRepository.findAll().stream().findFirst().orElse(null);
        String model = sc != null ? sc.getGeminiModelName() : "gemini-1.5-flash";
        Integer maxSize = sc != null && sc.getMaxUploadSizeMb() != null ? sc.getMaxUploadSizeMb() : 10;
        
        String key = geminiService.getEffectiveApiKey();
        boolean hasKey = key != null && !key.trim().isEmpty() && !key.startsWith("${") && !key.equals("placeholder");
        
        boolean hasJwtSecret = jwtSecret != null && !jwtSecret.trim().isEmpty() && !jwtSecret.equals("supersecretkeythatshouldbelongerandrandomforproductionpurposes");

        return DashboardStatsResponse.builder()
                .totalDocuments(totalDocs)
                .averageRiskScore(avgRisk)
                .aiCreditsUsed(docs.size() * 15)
                .recentDocuments(recentDocs)
                .riskCategoryCounts(categories)
                .geminiConfigured(hasKey)
                .geminiModel(model)
                .maxUploadSizeMb(maxSize)
                .jwtSecretConfigured(hasJwtSecret)
                .build();
    }
}
