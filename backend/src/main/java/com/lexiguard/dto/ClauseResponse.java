package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClauseResponse {
    private Long id;
    private String clauseType;
    private Integer pageNumber;
    private String summary;
    private String riskLevel;
    private String snippet;
    private Integer confidenceScore;
}
