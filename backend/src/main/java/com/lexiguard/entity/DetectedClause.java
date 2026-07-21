package com.lexiguard.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "detected_clauses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DetectedClause {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "clause_type", nullable = false)
    private String clauseType; // e.g. CONFIDENTIALITY, TERMINATION, etc.

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "risk_level")
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(columnDefinition = "TEXT")
    private String snippet;

    @Column(name = "confidence_score")
    private Integer confidenceScore;
}
