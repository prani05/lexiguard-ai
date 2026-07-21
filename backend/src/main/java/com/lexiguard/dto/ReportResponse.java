package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportResponse {
    private Long documentId;
    private Integer overallScore;
    private String executiveSummary;
    private List<String> obligations;
    private List<String> keyDates;
    private String paymentTerms;
    private String confidentialitySummary;
    private LocalDateTime generatedAt;
}
