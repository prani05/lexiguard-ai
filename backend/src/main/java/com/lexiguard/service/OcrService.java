package com.lexiguard.service;

import com.lexiguard.entity.Document;
import com.lexiguard.entity.DocumentPage;
import com.lexiguard.repository.DocumentPageRepository;
import com.lexiguard.repository.DocumentRepository;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class OcrService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPageRepository documentPageRepository;

    private final Tika tika = new Tika();

    @Async
    @Transactional
    public void processDocumentAsync(Long documentId) {
        Document document = documentRepository.findById(documentId).orElse(null);
        if (document == null) {
            return;
        }

        try {
            // Update status to processing
            document.setStatus("PROCESSING");
            documentRepository.save(document);

            // Delete any existing pages for safety (e.g. if re-processing)
            documentPageRepository.deleteByDocument(document);

            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(document.getStorageFilename());
            File file = filePath.toFile();

            if (!file.exists()) {
                throw new IOException("Physical file not found: " + file.getAbsolutePath());
            }

            String filename = document.getFilename().toLowerCase();

            if (filename.endsWith(".pdf")) {
                extractPdfPages(document, file);
            } else {
                extractTikaPage(document, file);
            }

            document.setStatus("COMPLETED");
            documentRepository.save(document);

        } catch (Exception e) {
            System.err.println("Error extracting text for document " + documentId + ": " + e.getMessage());
            e.printStackTrace();
            document.setStatus("FAILED");
            documentRepository.save(document);
        }
    }

    @Transactional
    public void processDocumentSync(Long documentId) throws Exception {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        document.setStatus("PROCESSING");
        documentRepository.save(document);

        documentPageRepository.deleteByDocument(document);

        Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(document.getStorageFilename());
        File file = filePath.toFile();

        if (!file.exists()) {
            throw new IOException("Physical file not found: " + file.getAbsolutePath());
        }

        String filename = document.getFilename().toLowerCase();

        if (filename.endsWith(".pdf")) {
            extractPdfPages(document, file);
        } else {
            extractTikaPage(document, file);
        }

        document.setStatus("COMPLETED");
        documentRepository.save(document);
    }

    private void extractPdfPages(Document document, File file) throws IOException, TesseractException {
        try (PDDocument pdDoc = Loader.loadPDF(file)) {
            int totalPages = pdDoc.getNumberOfPages();
            PDFRenderer renderer = new PDFRenderer(pdDoc);

            for (int i = 0; i < totalPages; i++) {
                int pageNum = i + 1;

                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(pageNum);
                stripper.setEndPage(pageNum);

                String text = stripper.getText(pdDoc);

                // Scanned check: if text is empty or very short, fallback to OCR
                if (text == null || text.trim().length() < 30) {
                    System.out.println("Page " + pageNum + " of " + document.getFilename() + " is scanned. Running OCR...");
                    BufferedImage image = renderer.renderImageWithDPI(i, 150);
                    text = runOcr(image);
                }

                DocumentPage page = DocumentPage.builder()
                        .document(document)
                        .pageNumber(pageNum)
                        .extractedText(text.trim())
                        .build();

                documentPageRepository.save(page);
            }
        }
    }

    private void extractTikaPage(Document document, File file) throws Exception {
        String text = tika.parseToString(file);
        DocumentPage page = DocumentPage.builder()
                .document(document)
                .pageNumber(1)
                .extractedText(text.trim())
                .build();
        documentPageRepository.save(page);
    }

    private String runOcr(BufferedImage image) throws TesseractException {
        Tesseract tesseract = new Tesseract();
        String datapath = Paths.get("tessdata").toAbsolutePath().toString();
        tesseract.setDatapath(datapath);
        tesseract.setLanguage("eng");
        return tesseract.doOCR(image);
    }
}
