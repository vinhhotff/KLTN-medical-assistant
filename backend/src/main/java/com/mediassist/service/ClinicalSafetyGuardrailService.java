package com.mediassist.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Deterministic Post-LLM Clinical Safety Guardrail (Defense-in-Depth Layer 2).
 * <p>
 * Grounded in:
 * - WHO Guidance on Ethics and Governance of AI for Health (2021)
 * - FDA Clinical Decision Support (CDS) Software Guidance (2022)
 * - Google Med-PaLM 2 & OpenAI HealthBench Clinical Safety Principles
 * <p>
 * Enforces a strict Zero-Prescription Policy on all patient-facing AI outputs:
 * intercepts specific drug names (INN & Vietnamese OTC/Rx brands), therapeutic
 * drug-class recommendations, and dosage/regimen instructions, while preserving
 * legitimate safety cautions (e.g., "tránh tự ý dùng thuốc") and medical history
 * clarifying questions.
 */
@Service
public class ClinicalSafetyGuardrailService {

    private static final Logger log = LoggerFactory.getLogger(ClinicalSafetyGuardrailService.class);

    public static final String ZERO_PRESCRIPTION_NOTICE =
            "⚠️ Lưu ý an toàn y khoa: Để đảm bảo an toàn tính mạng (tránh dị ứng, tương tác thuốc hoặc che lấp triệu chứng cấp cứu), "
                    + "MediAssist-AI tuyệt đối không đề xuất tên thuốc hay liều lượng điều trị. "
                    + "Vui lòng đặt lịch khám để Bác sĩ chuyên khoa trực tiếp thăm khám và kê đơn phù hợp.";

    public static final String SAFE_FALLBACK_ADVICE =
            "Dựa trên các triệu chứng bạn mô tả, bạn nên nghỉ ngơi, giữ ấm/thoáng mát cơ thể phù hợp, "
                    + "bổ sung đủ nước và theo dõi sát diễn biến sức khỏe. Nếu triệu chứng tăng nặng hoặc xuất hiện dấu hiệu bất thường, "
                    + "hãy đến ngay cơ sở y tế gần nhất.\n\n" + ZERO_PRESCRIPTION_NOTICE;

    /**
     * Negation / caution phrases that warn AGAINST self-medication or ask about prior history.
     * Sentences matching these (without explicit drug dosage prescriptions) are safe and must not be stripped.
     */
    private static final Pattern SAFE_CAUTION_OR_HISTORY_PATTERN = Pattern.compile(
            "(tranh tu y dung thuoc|khong tu y dung thuoc|khong tu y mua thuoc|khong duoc tu y uong thuoc|"
                    + "khong nen tu y dung thuoc|khong ke don|khong de xuat ten thuoc|chua co chi dinh cua bac si|"
                    + "da dung thuoc gi|da uong thuoc gi|co dang dung thuoc|tien su di ung thuoc|mang theo don thuoc)",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Common INN & Vietnamese OTC/Rx drug names that must NEVER be recommended by triage AI.
     */
    private static final Pattern DRUG_NAME_PATTERN = Pattern.compile(
            "\\b("
                    + "paracetamol|acetaminophen|ibuprofen|aspirin|naproxen|diclofenac|meloxicam|celecoxib|ketoprofen|indomethacin|"
                    + "amoxicillin|ampicillin|azithromycin|erythromycin|clarithromycin|cephalexin|cefalexin|cefixime|cefuroxime|ceftriaxone|"
                    + "ciprofloxacin|levofloxacin|ofloxacin|moxifloxacin|metronidazole|doxycycline|tetracycline|augmentin|klamentin|zinnat|"
                    + "prednisolone|prednisone|dexamethasone|methylprednisolone|medrol|betamethasone|hydrocortisone|"
                    + "omeprazole|esomeprazole|pantoprazole|lansoprazole|rabeprazole|ranitidine|famotidine|cimetidine|"
                    + "loratadine|cetirizine|desloratadine|fexofenadine|chlorpheniramine|diphenhydramine|promethazine|"
                    + "berberin|berberine|loperamide|smecta|diosmectite|phosphalugel|gaviscon|maalox|yumangel|"
                    + "efferalgan|hapacol|panadol|tylenol|decolgen|tiffy|alaxan|mobic|voltaren|arcoxia|"
                    + "alphachymotrypsin|alpha choay|salbutamol|ventolin|ambroxol|acetylcysteine|bromhexine|terpin|"
                    + "codeine|dextromethorphan|domperidone|motilium|metoclopramide|buscopan|nospa|no-spa|"
                    + "metformin|insulin|amlodipine|losartan|valsartan|bisoprolol|atorvastatin|rosuvastatin|warfarin|clopidogrel"
                    + ")\\b",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Prescribing / recommending drug classes in Vietnamese (accent-stripped).
     */
    private static final Pattern DRUG_RECOMMENDATION_PATTERN = Pattern.compile(
            "\\b(co the|nen|hay|thu|dung|uong|mua|su dung|bo sung|nho|boi|xit)\\s+"
                    + "(them\\s+)?(cac\\s+loai\\s+)?(thuoc\\s+)?"
                    + "(giam dau|ha sot|khang sinh|khang viem|corticoid|da day|tieu chay|chong di ung|khang histamin|"
                    + "tri ho|giam ho|long dom|nho mui|nho mat|boi da|ngoai da|an than|ngu|huyet ap|tim mach)\\b",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Explicit medication dosage patterns (excludes lab unit denominators like mg/dL, ng/mL, U/L, mmol/L).
     */
    private static final Pattern DOSAGE_INSTRUCTION_PATTERN = Pattern.compile(
            "\\b\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|ug|vien|ong|goi|giot)\\b(?!\\s*/\\s*(?:dl|l|ml|ul|phut|min))",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EXPLICIT_PRESCRIBE_VERB_PATTERN = Pattern.compile(
            "\\b(lieu dung|lieu luong|ke don|chi dinh thuoc|uong ngay \\d+ lan|ngay uong \\d+ lan|moi lan \\d+ vien)\\b",
            Pattern.CASE_INSENSITIVE
    );

    public record SanitizationResult(String sanitizedText, boolean intercepted, List<String> matchedReasons) {
    }

    public SanitizationResult sanitizePatientAdvice(String text) {
        if (text == null || text.isBlank()) {
            return new SanitizationResult(text, false, List.of());
        }

        String[] lines = text.split("\\r?\\n");
        StringBuilder safeBuilder = new StringBuilder();
        List<String> matchedReasons = new ArrayList<>();
        boolean intercepted = false;

        for (String line : lines) {
            if (line.isBlank()) {
                if (!safeBuilder.isEmpty()) {
                    safeBuilder.append("\n");
                }
                continue;
            }

            // Split line into sentences while preserving punctuation
            String[] sentences = line.split("(?<=[.!?])\\s+");
            StringBuilder safeLine = new StringBuilder();

            for (String sentence : sentences) {
                List<String> reasons = detectMedicationViolation(sentence);
                if (!reasons.isEmpty()) {
                    intercepted = true;
                    matchedReasons.addAll(reasons);
                    continue;
                }
                if (!safeLine.isEmpty()) {
                    safeLine.append(" ");
                }
                safeLine.append(sentence.trim());
            }

            if (!safeLine.isEmpty()) {
                if (!safeBuilder.isEmpty() && safeBuilder.charAt(safeBuilder.length() - 1) != '\n') {
                    safeBuilder.append("\n");
                }
                safeBuilder.append(safeLine);
            }
        }

        if (!intercepted) {
            return new SanitizationResult(text, false, List.of());
        }

        log.warn("🛡️ [CLINICAL SAFETY GUARDRAIL] Intercepted medication/dosage recommendation in AI output. Reasons: {}",
                matchedReasons);

        String cleaned = safeBuilder.toString().trim();
        if (cleaned.length() < 40) {
            return new SanitizationResult(SAFE_FALLBACK_ADVICE, true, matchedReasons);
        }

        if (!normalizeAscii(cleaned).contains("tuyet doi khong de xuat ten thuoc")) {
            cleaned = cleaned + "\n\n" + ZERO_PRESCRIPTION_NOTICE;
        }
        return new SanitizationResult(cleaned, true, matchedReasons);
    }

    public List<String> sanitizeClarifyingQuestions(List<String> questions) {
        if (questions == null || questions.isEmpty()) {
            return questions;
        }
        List<String> safe = new ArrayList<>();
        for (String q : questions) {
            if (q == null || q.isBlank()) continue;
            List<String> reasons = detectMedicationViolation(q);
            if (reasons.isEmpty()) {
                safe.add(q);
            } else {
                log.warn("🛡️ [CLINICAL SAFETY GUARDRAIL] Filtered unsafe clarifying question: '{}'", q);
            }
        }
        return safe;
    }

    private List<String> detectMedicationViolation(String sentence) {
        if (sentence == null || sentence.isBlank()) {
            return List.of();
        }
        String normalized = normalizeAscii(sentence);
        List<String> reasons = new ArrayList<>();

        boolean isSafeCaution = SAFE_CAUTION_OR_HISTORY_PATTERN.matcher(normalized).find();

        if (DRUG_NAME_PATTERN.matcher(normalized).find()) {
            reasons.add("DRUG_NAME");
        }
        if (DOSAGE_INSTRUCTION_PATTERN.matcher(normalized).find()) {
            reasons.add("DOSAGE_UNIT");
        }
        if (EXPLICIT_PRESCRIBE_VERB_PATTERN.matcher(normalized).find() && !isSafeCaution) {
            reasons.add("PRESCRIBE_DIRECTIVE");
        }
        if (DRUG_RECOMMENDATION_PATTERN.matcher(normalized).find() && !isSafeCaution) {
            reasons.add("DRUG_CLASS_RECOMMENDATION");
        }

        return reasons;
    }

    static String normalizeAscii(String input) {
        if (input == null) return "";
        String replaced = input
                .replace('đ', 'd')
                .replace('Đ', 'D');
        String decomposed = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.ROOT);
    }
}
