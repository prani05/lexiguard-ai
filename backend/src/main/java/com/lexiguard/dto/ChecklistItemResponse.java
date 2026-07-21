package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistItemResponse {
    private String title;
    private String status; // "PASSED" | "FAILED" | "WARNING"
    private String description;
    private String mitigation;
}
