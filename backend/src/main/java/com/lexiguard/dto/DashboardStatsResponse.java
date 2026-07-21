package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private Long totalDocuments;
    private Double averageRiskScore;
    private Integer aiCreditsUsed;
    private List<DocumentResponse> recentDocuments;
    private Map<String, Long> riskCategoryCounts;
    private Boolean geminiConfigured;
    private String geminiModel;
    private Integer maxUploadSizeMb;
    private Boolean jwtSecretConfigured;
}
