package com.lexiguard.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "gemini_model_name", nullable = false)
    private String geminiModelName;

    @Column(name = "gemini_temperature", nullable = false)
    private Double geminiTemperature;

    @Column(name = "max_document_pages", nullable = false)
    private Integer maxDocumentPages;

    @Column(name = "system_prompt_override", columnDefinition = "TEXT")
    private String systemPromptOverride;

    @Column(name = "gemini_api_key")
    private String geminiApiKey;

    @Column(name = "jwt_expiration_ms")
    private Long jwtExpirationMs;

    @Column(name = "max_upload_size_mb")
    private Integer maxUploadSizeMb;

    @Column(name = "supported_file_types")
    private String supportedFileTypes; // e.g. "PDF,DOCX,TXT"

    @Column(name = "ocr_languages")
    private String ocrLanguages; // e.g. "eng"

    @Column(name = "max_output_tokens")
    private Integer maxOutputTokens;
}
