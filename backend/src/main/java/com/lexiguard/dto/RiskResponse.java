package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskResponse {
    private Long id;
    private String category;
    private String severity;
    private String description;
    private String mitigation;
}
