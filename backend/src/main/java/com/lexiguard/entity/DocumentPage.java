package com.lexiguard.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "document_pages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(name = "extracted_text", nullable = false, columnDefinition = "TEXT")
    private String extractedText;
}
