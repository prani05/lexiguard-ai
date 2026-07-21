package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentResponse {
    private Long id;
    private String filename;
    private String type;
    private LocalDateTime uploadDate;
    private String status;
    private Integer riskScore; // null if report not yet generated
}
