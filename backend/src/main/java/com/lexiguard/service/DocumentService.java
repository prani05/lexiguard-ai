package com.lexiguard.service;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.User;
import com.lexiguard.repository.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private com.lexiguard.repository.SystemConfigRepository systemConfigRepository;

    private long getMaxFileSizeLimit() {
        if (systemConfigRepository == null) return 10 * 1024 * 1024L;
        return systemConfigRepository.findAll().stream()
                .findFirst()
                .map(sc -> {
                    Integer mb = sc.getMaxUploadSizeMb();
                    return mb == null ? 10 * 1024 * 1024L : (long) mb * 1024 * 1024L;
                })
                .orElse(10 * 1024 * 1024L);
    }

    @Transactional
    public Document uploadDocument(MultipartFile file, User user) throws IOException {
        // Validate presence
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }

        // Validate size
        long maxLimit = getMaxFileSizeLimit();
        if (file.getSize() > maxLimit) {
            throw new IllegalArgumentException("File size exceeds the maximum limit of " + (maxLimit / (1024 * 1024)) + "MB");
        }

        // Validate content type & extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("Invalid filename");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!extension.equals("pdf") && !extension.equals("docx") && !extension.equals("txt")) {
            throw new IllegalArgumentException("Unsupported file type. Only PDF, DOCX, and TXT are allowed");
        }

        // Prepare local directory
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique local filename
        String storageFilename = UUID.randomUUID().toString() + "_" + sanitizeFilename(originalFilename);
        Path targetLocation = uploadPath.resolve(storageFilename);

        // Copy file stream
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Deduce type
        String lowerName = originalFilename.toLowerCase();
        String type = "Contract";
        if (lowerName.contains("nda") || lowerName.contains("non-disclosure")) {
            type = "NDA";
        } else if (lowerName.contains("employment") || lowerName.contains("job") || lowerName.contains("offer")) {
            type = "Employment Agreement";
        } else if (lowerName.contains("consult") || lowerName.contains("freelance") || lowerName.contains("advisor")) {
            type = "Consultancy Agreement";
        } else if (lowerName.contains("vendor") || lowerName.contains("service") || lowerName.contains("sow")) {
            type = "Service Agreement";
        }

        // Save metadata
        Document document = Document.builder()
                .user(user)
                .filename(originalFilename)
                .storageFilename(storageFilename)
                .type(type)
                .status("PROCESSING")
                .uploadDate(LocalDateTime.now())
                .build();

        return documentRepository.save(document);
    }

    public List<Document> listUserDocuments(User user) {
        return documentRepository.findByUserOrderByUploadDateDesc(user);
    }

    public Document getDocumentByIdAndUser(Long id, User user) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (!document.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to document");
        }

        return document;
    }

    public Resource downloadDocumentFile(Document document) {
        try {
            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(document.getStorageFilename());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new IllegalArgumentException("File not found or unreadable");
            }
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Could not read file path: " + e.getMessage());
        }
    }

    @Transactional
    public void deleteDocument(Long id, User user) throws IOException {
        Document document = getDocumentByIdAndUser(id, user);

        // Delete physical file
        Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(document.getStorageFilename());
        Files.deleteIfExists(filePath);

        // Delete database record
        documentRepository.delete(document);
    }

    private String getFileExtension(String filename) {
        int lastIndex = filename.lastIndexOf('.');
        if (lastIndex == -1 || lastIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastIndex + 1);
    }

    private String sanitizeFilename(String filename) {
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
