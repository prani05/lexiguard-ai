package com.lexiguard.service;

import com.lexiguard.dto.ChecklistItemResponse;
import com.lexiguard.dto.ClauseResponse;
import com.lexiguard.dto.ReportResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class PdfReportExporter {

    private static final float MARGIN = 50;
    private static final float PAGE_WIDTH = 612; // Standard Letter width
    private static final float PAGE_HEIGHT = 792; // Standard Letter height
    private static final float WRAP_WIDTH = PAGE_WIDTH - (2 * MARGIN);

    private static final PDFont HELVETICA = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDFont HELVETICA_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

    public static byte[] exportReport(
            String filename,
            String docType,
            ReportResponse report,
            List<ClauseResponse> clauses,
            List<ChecklistItemResponse> checklist) throws IOException {

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);

            PDPageContentStream stream = new PDPageContentStream(doc, page);
            float[] y = new float[]{720}; // wrapper array to pass by reference

            // 1. Draw Title Header
            stream.beginText();
            stream.setFont(HELVETICA_BOLD, 22);
            stream.setNonStrokingColor(Color.decode("#9f7aea"));
            stream.newLineAtOffset(MARGIN, y[0]);
            stream.showText("LexiGuard AI Scan Report");
            stream.endText();
            y[0] -= 25;

            // Draw line separator
            stream.setStrokingColor(Color.decode("#e2e8f0"));
            stream.setLineWidth(1.5f);
            stream.moveTo(MARGIN, y[0]);
            stream.lineTo(PAGE_WIDTH - MARGIN, y[0]);
            stream.stroke();
            y[0] -= 25;

            // 2. Metadata Section
            stream.beginText();
            stream.setFont(HELVETICA_BOLD, 10);
            stream.setNonStrokingColor(Color.DARK_GRAY);
            stream.newLineAtOffset(MARGIN, y[0]);
            stream.showText("Document Name: ");
            stream.setFont(HELVETICA, 10);
            stream.showText(filename);
            stream.newLineAtOffset(0, -15);
            stream.setFont(HELVETICA_BOLD, 10);
            stream.showText("Document Type: ");
            stream.setFont(HELVETICA, 10);
            stream.showText(docType);
            stream.endText();
            y[0] -= 45;

            // 3. Overall Risk Badge
            int score = report.getOverallScore();
            Color badgeColor = Color.decode("#10b981"); // green
            String rating = "LOW RISK";
            if (score > 35) {
                badgeColor = Color.decode("#f59e0b"); // yellow/orange
                rating = "MEDIUM RISK";
            }
            if (score > 65) {
                badgeColor = Color.decode("#ef4444"); // red
                rating = "HIGH RISK";
            }
            if (score > 85) {
                badgeColor = Color.decode("#8b5cf6"); // purple
                rating = "CRITICAL RISK";
            }

            stream.setNonStrokingColor(badgeColor);
            stream.addRect(MARGIN, y[0], 512, 35);
            stream.fill();

            stream.beginText();
            stream.setFont(HELVETICA_BOLD, 12);
            stream.setNonStrokingColor(Color.WHITE);
            stream.newLineAtOffset(MARGIN + 15, y[0] + 12);
            stream.showText("Contract Risk Score: " + score + " / 100 (" + rating + ")");
            stream.endText();
            y[0] -= 50;

            // 4. Executive Summary Section
            stream = writeSectionHeader(doc, stream, page, "1. Executive Summary", y);
            stream = writeParagraph(doc, stream, page, report.getExecutiveSummary(), y);
            y[0] -= 15;

            // 5. Financial & Payment Terms
            stream = writeSectionHeader(doc, stream, page, "2. Financial & Payment Terms", y);
            stream = writeParagraph(doc, stream, page, report.getPaymentTerms(), y);
            y[0] -= 15;

            // 6. Confidentiality
            stream = writeSectionHeader(doc, stream, page, "3. Confidentiality Provisions", y);
            stream = writeParagraph(doc, stream, page, report.getConfidentialitySummary(), y);
            y[0] -= 20;

            // 7. Obligations Checklist
            stream = writeSectionHeader(doc, stream, page, "4. Obligations Checklist", y);
            if (report.getObligations() != null && !report.getObligations().isEmpty()) {
                for (String ob : report.getObligations()) {
                    stream = writeBulletPoint(doc, stream, page, ob, y);
                }
            } else {
                stream = writeParagraph(doc, stream, page, "No key obligations extracted.", y);
            }
            y[0] -= 15;

            // 8. Timeline Dates
            stream = writeSectionHeader(doc, stream, page, "5. Timeline & Key Dates", y);
            if (report.getKeyDates() != null && !report.getKeyDates().isEmpty()) {
                for (String date : report.getKeyDates()) {
                    stream = writeBulletPoint(doc, stream, page, date, y);
                }
            } else {
                stream = writeParagraph(doc, stream, page, "No key timeline dates extracted.", y);
            }
            y[0] -= 25;

            // 9. Detected Clauses Table
            stream = writeSectionHeader(doc, stream, page, "6. Detected Clauses Review", y);
            for (ClauseResponse clause : clauses) {
                // Check page boundaries
                if (y[0] < 120) {
                    stream.close();
                    page = new PDPage();
                    doc.addPage(page);
                    stream = new PDPageContentStream(doc, page);
                    y[0] = 730;
                }

                stream.setNonStrokingColor(Color.decode("#f8fafc"));
                stream.addRect(MARGIN, y[0] - 50, 512, 55);
                stream.fill();

                stream.setStrokingColor(Color.decode("#cbd5e1"));
                stream.setLineWidth(0.5f);
                stream.addRect(MARGIN, y[0] - 50, 512, 55);
                stream.stroke();

                stream.beginText();
                stream.setFont(HELVETICA_BOLD, 10);
                stream.setNonStrokingColor(Color.decode("#475569"));
                stream.newLineAtOffset(MARGIN + 10, y[0] - 15);
                String confText = clause.getConfidenceScore() != null ? "  |  Confidence: " + clause.getConfidenceScore() + "%" : "";
                stream.showText(clause.getClauseType() + "  |  Page " + clause.getPageNumber() + confText + "  |  Risk: " + clause.getRiskLevel());
                stream.newLineAtOffset(0, -18);
                stream.setFont(HELVETICA, 8.5f);
                
                String summary = clause.getSummary();
                if (summary.length() > 105) {
                    summary = summary.substring(0, 102) + "...";
                }
                stream.showText(summary);
                stream.endText();
                y[0] -= 65;
            }
            y[0] -= 15;

            // 10. Compliance Checklist Table
            stream = writeSectionHeader(doc, stream, page, "7. \"Before You Sign\" Compliance Check", y);
            for (ChecklistItemResponse item : checklist) {
                // Check page boundaries
                if (y[0] < 120) {
                    stream.close();
                    page = new PDPage();
                    doc.addPage(page);
                    stream = new PDPageContentStream(doc, page);
                    y[0] = 730;
                }

                Color statusColor = Color.decode("#10b981"); // green
                if ("WARNING".equals(item.getStatus())) statusColor = Color.decode("#f59e0b");
                if ("FAILED".equals(item.getStatus())) statusColor = Color.decode("#ef4444");

                stream.setNonStrokingColor(Color.decode("#f8fafc"));
                stream.addRect(MARGIN, y[0] - 65, 512, 70);
                stream.fill();

                stream.setStrokingColor(statusColor);
                stream.setLineWidth(1.0f);
                stream.moveTo(MARGIN, y[0]);
                stream.lineTo(MARGIN, y[0] - 65);
                stream.stroke();

                stream.setStrokingColor(Color.decode("#e2e8f0"));
                stream.setLineWidth(0.5f);
                stream.addRect(MARGIN, y[0] - 65, 512, 70);
                stream.stroke();

                stream.beginText();
                stream.setFont(HELVETICA_BOLD, 10);
                stream.setNonStrokingColor(statusColor);
                stream.newLineAtOffset(MARGIN + 12, y[0] - 15);
                stream.showText(item.getTitle() + "  -  [" + item.getStatus() + "]");
                
                stream.newLineAtOffset(0, -18);
                stream.setFont(HELVETICA, 8.5f);
                stream.setNonStrokingColor(Color.DARK_GRAY);
                String desc = item.getDescription();
                if (desc.length() > 105) {
                    desc = desc.substring(0, 102) + "...";
                }
                stream.showText(desc);

                stream.newLineAtOffset(0, -15);
                stream.setFont(HELVETICA_BOLD, 8.5f);
                stream.setNonStrokingColor(Color.decode("#8b5cf6"));
                String mit = "Mitigation: " + item.getMitigation();
                if (mit.length() > 95) {
                    mit = mit.substring(0, 92) + "...";
                }
                stream.showText(mit);

                stream.endText();
                y[0] -= 80;
            }

            stream.close();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static PDPageContentStream writeSectionHeader(
            PDDocument doc, PDPageContentStream stream, PDPage page, String text, float[] y) throws IOException {

        stream = checkNewPage(doc, stream, page, y, 40);

        stream.beginText();
        stream.setFont(HELVETICA_BOLD, 13);
        stream.setNonStrokingColor(Color.decode("#1e1b4b"));
        stream.newLineAtOffset(MARGIN, y[0]);
        stream.showText(text);
        stream.endText();
        y[0] -= 18;

        return stream;
    }

    private static PDPageContentStream writeParagraph(
            PDDocument doc, PDPageContentStream stream, PDPage page, String text, float[] y) throws IOException {

        if (text == null || text.trim().isEmpty()) {
            return stream;
        }

        List<String> lines = wrapText(text, WRAP_WIDTH, HELVETICA, 9.5f);
        for (String line : lines) {
            stream = checkNewPage(doc, stream, page, y, 15);
            stream.beginText();
            stream.setFont(HELVETICA, 9.5f);
            stream.setNonStrokingColor(Color.decode("#334155"));
            stream.newLineAtOffset(MARGIN, y[0]);
            stream.showText(line);
            stream.endText();
            y[0] -= 14;
        }

        return stream;
    }

    private static PDPageContentStream writeBulletPoint(
            PDDocument doc, PDPageContentStream stream, PDPage page, String text, float[] y) throws IOException {

        if (text == null || text.trim().isEmpty()) {
            return stream;
        }

        List<String> lines = wrapText(text, WRAP_WIDTH - 15, HELVETICA, 9.5f);
        boolean first = true;
        for (String line : lines) {
            stream = checkNewPage(doc, stream, page, y, 15);
            stream.beginText();
            stream.setFont(HELVETICA, 9.5f);
            stream.setNonStrokingColor(Color.decode("#334155"));
            if (first) {
                stream.newLineAtOffset(MARGIN, y[0]);
                stream.showText("- " + line);
                first = false;
            } else {
                stream.newLineAtOffset(MARGIN + 8, y[0]);
                stream.showText(line);
            }
            stream.endText();
            y[0] -= 14;
        }

        return stream;
    }

    private static PDPageContentStream checkNewPage(
            PDDocument doc, PDPageContentStream currentStream, PDPage page, float[] y, float requiredHeight) throws IOException {

        if (y[0] - requiredHeight < 50) {
            currentStream.close();
            PDPage newPage = new PDPage();
            doc.addPage(newPage);
            PDPageContentStream newStream = new PDPageContentStream(doc, newPage);
            y[0] = 730;
            return newStream;
        }
        return currentStream;
    }

    private static List<String> wrapText(String text, float width, PDFont font, float fontSize) throws IOException {
        List<String> result = new ArrayList<>();
        String[] words = text.split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            String testLine = line.length() == 0 ? word : line + " " + word;
            float lineWidth = font.getStringWidth(testLine) / 1000 * fontSize;
            if (lineWidth > width) {
                result.add(line.toString());
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(testLine);
            }
        }
        if (line.length() > 0) {
            result.add(line.toString());
        }
        return result;
    }
}
