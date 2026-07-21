package com.lexiguard.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String filename;

    @Column(name = "storage_filename", nullable = false)
    private String storageFilename;

    @Column(nullable = false)
    private String type; // e.g., "NDA", "Employment Agreement"

    @Column(name = "upload_date", nullable = false)
    private LocalDateTime uploadDate;

    @Column(nullable = false)
    private String status; // "PROCESSING", "COMPLETED", "FAILED"

    @OneToOne(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    private Report report;

    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<DocumentPage> pages;

    @PrePersist
    protected void onCreate() {
        this.uploadDate = LocalDateTime.now();
    }
}
