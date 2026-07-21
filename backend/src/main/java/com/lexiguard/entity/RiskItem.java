package com.lexiguard.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "risk_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    private String category; // e.g. Liability, Non-Compete, etc.

    private String severity; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String mitigation;
}
