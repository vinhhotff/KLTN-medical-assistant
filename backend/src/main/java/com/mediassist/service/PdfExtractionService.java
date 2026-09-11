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
            log.info("📄 Successfully extracted {} characters from PDF document ({} pages)",
                    extracted.length(), document.getNumberOfPages());
            return extracted != null ? extracted.trim() : "";
        } catch (IOException e) {
            log.warn("Failed to extract text from PDF using PDFBox: {}", e.getMessage());
            return "";
        }
    }
}
