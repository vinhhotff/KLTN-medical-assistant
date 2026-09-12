package com.mediassist.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class PdfExtractionService {

    private static final Logger log = LoggerFactory.getLogger(PdfExtractionService.class);

    /**
     * Extracts text content from a raw PDF byte array using Apache PDFBox.
     */
    public String extractTextFromPdf(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return "";
        }

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String extracted = stripper.getText(document);
            if (extracted != null && !extracted.trim().isBlank()) {
                log.info("📄 Successfully extracted {} characters from PDF document ({} pages)",
                        extracted.length(), document.getNumberOfPages());
                return extracted.trim();
            }
        } catch (Exception e) {
            log.warn("Failed to extract text from PDF using PDFBox: {}", e.getMessage());
        }

        // Resilient Fallback: If PDFBox failed or document is a text-based stream
        try {
            String utf8 = new String(pdfBytes, java.nio.charset.StandardCharsets.UTF_8);
            if (isReadableClinicalText(utf8)) {
                log.info("📄 Fallback: Extracted {} characters as readable text stream", utf8.trim().length());
                return utf8.trim();
            }
        } catch (Exception ignored) {}

        return "";
    }

    private boolean isReadableClinicalText(String text) {
        if (text == null || text.trim().length() < 10) return false;
        long printable = text.chars().filter(c -> c >= 32 || c == '\n' || c == '\r' || c == '\t').count();
        return ((double) printable / text.length()) > 0.80;
    }
}
