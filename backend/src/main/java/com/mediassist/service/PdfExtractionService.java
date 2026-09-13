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

    /**
     * Renders initial pages of a PDF as JPEG images (up to maxPages) for OCR / Vision fallback
     * when the document is a scanned image without an embedded text layer.
     */
    public java.util.List<byte[]> renderPdfPagesToImages(byte[] pdfBytes, int maxPages) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return java.util.Collections.emptyList();
        }

        java.util.List<byte[]> images = new java.util.ArrayList<>();
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            int totalPages = document.getNumberOfPages();
            int pagesToRender = Math.min(totalPages, Math.max(1, maxPages));
            org.apache.pdfbox.rendering.PDFRenderer renderer = new org.apache.pdfbox.rendering.PDFRenderer(document);

            for (int i = 0; i < pagesToRender; i++) {
                try {
                    java.awt.image.BufferedImage bim = renderer.renderImageWithDPI(i, 200, org.apache.pdfbox.rendering.ImageType.RGB);
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    javax.imageio.ImageIO.write(bim, "jpeg", baos);
                    images.add(baos.toByteArray());
                    log.info("🖼️ Rendered PDF page {}/{} as high-resolution JPEG (200 DPI, {} bytes) for OCR vision fallback",
                            (i + 1), totalPages, baos.size());
                } catch (Exception e) {
                    log.warn("Could not render PDF page {} to image: {}", i, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load PDF for page rendering: {}", e.getMessage());
        }
        return images;
    }

    private boolean isReadableClinicalText(String text) {
        if (text == null || text.trim().length() < 10) return false;
        long printable = text.chars().filter(c -> c >= 32 || c == '\n' || c == '\r' || c == '\t').count();
        return ((double) printable / text.length()) > 0.80;
    }
}
