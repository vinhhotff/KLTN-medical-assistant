package com.mediassist.service;

import com.mediassist.common.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class MedicalDocumentValidator {

    private static final Logger log = LoggerFactory.getLogger(MedicalDocumentValidator.class);

    // Common medical and laboratory keywords in Vietnamese & English
    private static final List<String> MEDICAL_DICTIONARY = Arrays.asList(
            "xet nghiem", "ket qua", "chi so", "tham chieu", "khoang tham chieu",
            "don vi", "sinh hoa", "huyet hoc", "nuoc tieu", "mien dich",
            "glucose", "duong huyet", "cholesterol", "triglyceride", "hdl", "ldl",
            "ast", "got", "alt", "gpt", "ggt", "creatinine", "ure", "acid uric",
            "hgb", "hemoglobin", "rbc", "wbc", "plt", "tieu cau", "bach cau", "hong cau",
            "ferritin", "crp", "dien giai", "natri", "kali", "clo", "canxi", "egfr",
            "phong kham", "benh vien", "bac si", "chan doan", "kham benh", "chuyen khoa",
            "am tinh", "duong tinh", "mg/dl", "mmol/l", "u/l", "g/l", "g/dl", "ui/l",
            "ng/ml", "pg/ml", "fl", "pg", "sgot", "sgpt", "bilirubin", "albumin"
    );

    /**
     * Validates binary format, readability, and presence of clinical medical indicators.
     * Throws AppException if document is invalid, blurry, or non-medical.
     *
     * @param fileBytes     binary stream
     * @param contentType   MIME type
     * @param extractedText extracted text from OCR / PDF parser
     * @param fileName      original file name
     */
    public void validateDocument(byte[] fileBytes, String contentType, String extractedText, String fileName) {
        // 1. Binary Integrity Check
        if (fileBytes == null || fileBytes.length < 10) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST,
                    "UNREADABLE_DOCUMENT",
                    "Tệp tài liệu rỗng hoặc bị lỗi truyền tải. Vui lòng kiểm tra lại tệp tin."
            );
        }

        // 2. Magic Bytes Inspection
        if (!hasValidMagicBytes(fileBytes, contentType)) {
            throw new AppException(
                    HttpStatus.BAD_REQUEST,
                    "UNSUPPORTED_FORMAT",
                    "Định dạng tệp không được hỗ trợ. Hệ thống chỉ tiếp nhận tài liệu chuẩn PDF, JPEG hoặc PNG."
            );
        }

        // 3. Readability Check
        String normalizedText = unaccent(extractedText != null ? extractedText : "");
        String normalizedFileName = unaccent(fileName != null ? fileName : "");
        String combinedContext = (normalizedText + " " + normalizedFileName).toLowerCase().trim();

        if (normalizedText.trim().length() < 15) {
            log.warn("🚨 [UNREADABLE DOCUMENT DETECTED] Extracted text too short ({} chars) for '{}'", normalizedText.trim().length(), fileName);
            throw new AppException(
                    HttpStatus.BAD_REQUEST,
                    "UNREADABLE_DOCUMENT",
                    "Tài liệu bị lỗi, hình ảnh quá mờ hoặc không thể trích xuất nội dung văn bản. Vui lòng chụp/quét lại bản rõ nét hơn và thử lại."
            );
        }

        // 4. Clinical Laboratory Keywords Sieve
        boolean containsMedicalKeyword = false;
        for (String keyword : MEDICAL_DICTIONARY) {
            if (combinedContext.contains(keyword)) {
                containsMedicalKeyword = true;
                break;
            }
        }

        if (!containsMedicalKeyword) {
            log.warn("🚨 [NON-MEDICAL DOCUMENT DETECTED] Uploaded file '{}' rejected: No clinical laboratory keywords found in text: '{}'",
                    fileName, combinedContext.length() > 100 ? combinedContext.substring(0, 100) : combinedContext);
            throw new AppException(
                    HttpStatus.BAD_REQUEST,
                    "NON_MEDICAL_DOCUMENT",
                    "Hệ thống không phát hiện thấy bất kỳ chỉ số xét nghiệm hoặc thuật ngữ y tế nào trong tài liệu này. Vui lòng tải lên đúng phiếu kết quả xét nghiệm."
            );
        }

        log.info("✅ Medical document passed gatekeeper validation: '{}'", fileName);
    }

    private boolean hasValidMagicBytes(byte[] bytes, String contentType) {
        if (bytes.length < 4) return false;

        // PDF: %PDF (0x25 0x50 0x44 0x46)
        if (bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46) {
            return true;
        }

        // JPEG: 0xFF 0xD8 0xFF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return true;
        }

        // PNG: 0x89 0x50 0x4E 0x47
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return true;
        }

        // Text files or documents with text/plain mime type
        if (contentType != null && (contentType.contains("text/plain") || contentType.contains("application/pdf") || contentType.contains("image/"))) {
            return true;
        }

        return false;
    }

    private String unaccent(String src) {
        if (src == null) return "";
        String normalized = Normalizer.normalize(src, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }
}
