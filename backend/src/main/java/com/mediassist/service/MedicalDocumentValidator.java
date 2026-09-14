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

    // Comprehensive multi-domain medical and laboratory keywords dictionary
    private static final List<String> MEDICAL_DICTIONARY = Arrays.asList(
            // General clinical vocabulary
            "xet nghiem", "ket qua", "chi so", "tham chieu", "khoang tham chieu",
            "don vi", "sinh hoa", "huyet hoc", "nuoc tieu", "mien dich", "vi sinh",
            "phong kham", "benh vien", "bac si", "chan doan", "kham benh", "chuyen khoa",
            "am tinh", "duong tinh", "positive", "negative", "binh thuong", "bat thuong",
            // Common units
            "mg/dl", "mmol/l", "u/l", "g/l", "g/dl", "ui/l", "iu/l", "ng/ml", "pg/ml",
            "fl", "pg", "µmol/l", "umol/l", "ml/min", "g/24h", "mg/24h",
            // Biochemistry & Metabolic
            "glucose", "duong huyet", "duong mau", "hba1c", "cholesterol", "triglyceride",
            "hdl", "ldl", "vldl", "lipid", "ast", "got", "alt", "gpt", "ggt", "sgot", "sgpt",
            "bilirubin", "albumin", "globulin", "protein toan phan", "protein", "alp",
            "creatinine", "ure", "urea", "bun", "acid uric", "egfr", "do thanh thai",
            // Thyroid & Endocrine Hormones
            "tsh", "ft3", "ft4", "t3", "t4", "anti-tpo", "anti-tg", "cortisol", "acth",
            "insulin", "c-peptide", "prolactin", "testosterone", "estradiol", "lh", "fsh", "beta-hcg", "hcg",
            // Cardiac Biomarkers
            "troponin", "troponin t", "troponin i", "ck-mb", "ck", "bnp", "nt-probnp", "myoglobin",
            // Hematology & Coagulation
            "hgb", "hemoglobin", "rbc", "wbc", "plt", "tieu cau", "bach cau", "hong cau",
            "hct", "hematocrit", "mcv", "mch", "mchc", "rdw", "neutrophil", "lymphocyte",
            "monocyte", "eosinophil", "basophil", "pt", "inr", "aptt", "fibrinogen", "d-dimer",
            // Electrolytes & Minerals
            "dien giai", "natri", "kali", "clo", "canxi", "calcium", "magie", "phospho",
            "ferritin", "sat huyet thanh", "iron", "transferrin",
            // Inflammation & Infection
            "crp", "hs-crp", "procalcitonin", "pct", "toc do lang mau", "esr",
            "hbsag", "anti-hbs", "anti-hcv", "hcv", "hiv", "dengue", "ns1", "vdrl", "tpha",
            // Tumor Markers
            "psa", "cea", "afp", "ca 19-9", "ca 125", "ca 15-3",
            // Urine & Renal Specific
            "protein nieu", "microalbumin", "can lang", "tru nieu", "hong cau nieu", "bach cau nieu",
            // Imaging & Diagnostics
            "sieu am", "x-quang", "ct scanner", "mri", "dien tim", "ecg", "dien nao", "eeg", "noi soi"
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

        // 3. Readability Check (Strictly on extracted clinical text)
        String normalizedText = unaccent(extractedText != null ? extractedText : "").toLowerCase().trim();

        if (normalizedText.length() < 15) {
            log.warn("🚨 [UNREADABLE DOCUMENT DETECTED] Extracted text too short ({} chars) for '{}'", normalizedText.length(), fileName);
            throw new AppException(
                    HttpStatus.BAD_REQUEST,
                    "UNREADABLE_DOCUMENT",
                    "Tài liệu bị lỗi, hình ảnh không có văn bản hoặc không thể trích xuất nội dung xét nghiệm. Vui lòng tải lên tệp PDF kết quả xét nghiệm hoặc ảnh chụp rõ nét."
            );
        }

        // 4. Clinical Laboratory Keywords Sieve (Strictly inspects document content, NOT file name)
        boolean containsMedicalKeyword = false;
        for (String keyword : MEDICAL_DICTIONARY) {
            if (normalizedText.contains(keyword)) {
                containsMedicalKeyword = true;
                break;
            }
        }

        if (!containsMedicalKeyword) {
            log.warn("🚨 [NON-MEDICAL DOCUMENT DETECTED] Uploaded file '{}' rejected: No clinical laboratory keywords found in extracted text: '{}'",
                    fileName, normalizedText.length() > 100 ? normalizedText.substring(0, 100) : normalizedText);
            throw new AppException(
                    HttpStatus.BAD_REQUEST,
                    "NON_MEDICAL_DOCUMENT",
                    "Hệ thống không phát hiện thấy bất kỳ chỉ số xét nghiệm hoặc thuật ngữ y tế nào trong nội dung tài liệu này. Vui lòng tải lên đúng phiếu kết quả xét nghiệm y khoa."
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

        // Never rely blindly on client Content-Type headers for PDF or image formats;
        // only genuine magic bytes (checked above) or verified UTF-8 plain text documents are permitted.

        // Resilient check for printable UTF-8 text documents
        try {
            String utf8 = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            long printable = utf8.chars().filter(c -> c >= 32 || c == '\n' || c == '\r' || c == '\t').count();
            if (utf8.length() >= 10 && ((double) printable / utf8.length()) > 0.80) {
                return true;
            }
        } catch (Exception ignored) {}

        return false;
    }

    private String unaccent(String src) {
        if (src == null) return "";
        String normalized = Normalizer.normalize(src, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }
}
