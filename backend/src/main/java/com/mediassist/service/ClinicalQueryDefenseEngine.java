package com.mediassist.service;

import com.mediassist.dto.ClinicalQueryDefenseResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Enterprise Clinical Query Defense Engine (5-Stage Input Robustness Pipeline).
 * Guarantees bulletproof handling ("Bao Đầu Vào") for arbitrary patient inputs:
 * 1. Red-Flag Emergency Screening: Intercepts acute life-threatening emergencies (115 lockout).
 * 2. Slang & Typo Normalization: Fixes common Vietnamese teen-code, non-accented medical terms, abbreviations.
 * 3. Vietnamese NegEx Filter: Strips negated symptoms to prevent misleading vector distances.
 * 4. Out-of-Distribution (OOD) Gate: Intercepts non-clinical administrative, billing, or spam queries.
 * 5. Multi-Symptom Decomposition: Segments compound multi-specialty complaints.
 */
@Component
public class ClinicalQueryDefenseEngine {

    private static final Logger log = LoggerFactory.getLogger(ClinicalQueryDefenseEngine.class);

    // Stage 1: Acute Red-Flag Emergency Patterns
    private static final Pattern RED_FLAG_PATTERN = Pattern.compile(
            "(?iu)(?:nôn\\s+ra\\s+máu|thổ\\s+huyết|ho\\s+ra\\s+máu\\s+sét\\s+đánh|" +
            "đột\\s+quỵ|tai\\s+biến|liệt\\s+nửa\\s+người|méo\\s+miệng|méo\\s+mặt|nói\\s+ngọng\\s+đột\\s+ngột|" +
            "ngất\\s+xỉu|hôn\\s+mê|bất\\s+tỉnh|mất\\s+ý\\s+thức|" +
            "khó\\s+thở\\s+dữ\\s+dội|suy\\s+hô\\s+hấp\\s+cấp|tím\\s+tái|thở\\s+rít\\s+thanh\\s+quản|" +
            "đau\\s+ngực\\s+dữ\\s+dội|bóp\\s+nghẹt\\s+(?:lồng\\s+)?ngực|nhồi\\s+máu\\s+cơ\\s+tim|" +
            "sốc\\s+phản\\s+vệ|co\\s+giật\\s+liên\\s+tục|chấn\\s+thương\\s+sọ\\s+não|chảy\\s+máu\\s+ồ\\s+ạt)"
    );

    // Stage 4: Out-of-Distribution (OOD) Non-Clinical Patterns (Administrative / Billing / Chit-chat)
    private static final Pattern OOD_BILLING_PATTERN = Pattern.compile(
            "(?iu)(?:bao\\s+nhiêu\\s+tiền|chi\\s+phí\\s+khám|giá\\s+tiền|bảng\\s+giá|khám\\s+hết\\s+nhiêu|" +
            "bảo\\s+hiểm\\s+y\\s+tế|bhyt|thanh\\s+toán\\s+bằng\\s+thẻ)"
    );

    private static final Pattern OOD_ADMIN_PATTERN = Pattern.compile(
            "(?iu)(?:mở\\s+cửa\\s+(?:mấy\\s+giờ|lúc\\s+nào)|giờ\\s+làm\\s+việc|địa\\s+chỉ\\s+bệnh\\s+viện|" +
            "ở\\s+đâu\\s+ạ|quầy\\s+tiếp\\s+đón|lễ\\s+tân|thủ\\s+tục\\s+nhập\\s+viện)"
    );

    private static final Pattern OOD_SPAM_PATTERN = Pattern.compile(
            "(?iu)^(?:(?:alo|hello|hi|test|thử\\s+nghiệm|có\\s+ai\\s+không|123|abc|[0-9]+)\\s*)+[.!? ]*$"
    );

    // Common medical slang and abbreviations map
    private static final Map<String, String> SLANG_MAP = new LinkedHashMap<>();
    static {
        SLANG_MAP.put("\\b(?:k|ko|khong)\\b", "không");
        SLANG_MAP.put("\\b(?:bs|bsi)\\b", "bác sĩ");
        SLANG_MAP.put("\\b(?:bn|bnhan)\\b", "bệnh nhân");
        SLANG_MAP.put("\\b(?:bv|b.vien)\\b", "bệnh viện");
        SLANG_MAP.put("\\b(?:pk|p.kham)\\b", "phòng khám");
        SLANG_MAP.put("\\bchongs\\s+mat\\b", "chóng mặt");
        SLANG_MAP.put("\\bchong\\s+mat\\b", "chóng mặt");
        SLANG_MAP.put("\\bdau\\s+da\\s+day\\b", "đau dạ dày");
        SLANG_MAP.put("\\bdau\\s+bung\\s+quan\\b", "đau bụng quặn");
        SLANG_MAP.put("\\bdau\\s+bung\\b", "đau bụng");
        SLANG_MAP.put("\\bquan\\b", "quặn");
        SLANG_MAP.put("\\bsot\\b", "sốt");
        SLANG_MAP.put("\\bmet\\s+moi\\b", "mệt mỏi");
        SLANG_MAP.put("\\bkho\\s+tho\\b", "khó thở");
        SLANG_MAP.put("\\bkho\\s+ngu\\b", "khó ngủ");
        SLANG_MAP.put("\\bmat\\s+ngu\\b", "mất ngủ");
        SLANG_MAP.put("\\btuc\\s+nguc\\b", "tức ngực");
        SLANG_MAP.put("\\bdau\\s+nguc\\b", "đau ngực");
        SLANG_MAP.put("\\bdau\\s+dau\\b", "đau đầu");
        SLANG_MAP.put("\\bchay\\s+mau\\b", "chảy máu");
        SLANG_MAP.put("\\bviem\\s+hong\\b", "viêm họng");
        SLANG_MAP.put("\\bbuon\\s+non\\b", "buồn nôn");
        SLANG_MAP.put("\\btieu\\s+duong\\b", "tiểu đường");
        SLANG_MAP.put("\\bhuyet\\s+ap\\s+cao\\b", "huyết áp cao");
        SLANG_MAP.put("\\bdau\\s+nhuc\\s+xuong\\s+khop\\b", "đau nhức xương khớp");
        SLANG_MAP.put("\\btim\\s+dap\\s+nhanh\\b", "tim đập nhanh");
        SLANG_MAP.put("\\bhoi\\s+hop\\b", "hồi hộp");
    }

    // Negation marker regex (Vietnamese NegEx triggers)
    private static final Pattern NEGATION_TRIGGER_PATTERN = Pattern.compile(
            "(?iu)(?:không\\s+bị|khong\\s+bị|khong\\s+bi|không\\s+có|khong\\s+có|khong\\s+co|chưa\\s+từng|chua\\s+tung|" +
            "không\\s+hề|khong\\s+he|không\\s+thấy|khong\\s+thay|không|khong|chẳng|chang|hết|loại\\s+trừ|loai\\s+tru|âm\\s+tính\\s+với)"
    );

    // Compound complaint separators (Stage 5)
    private static final Pattern COMPOUND_SPLIT_PATTERN = Pattern.compile(
            "(?iu)(?:\\s+đồng\\s+thời\\s+|\\s+kèm\\s+theo\\s+(?:đó\\s+là\\s+)?|\\s+với\\s+lại\\s+|\\s+bên\\s+cạnh\\s+đó\\s+|\\s+ngoài\\s+ra\\s+|\\s+cộng\\s+thêm\\s+|;\\s+)"
    );

    /**
     * Executes the comprehensive 5-stage input defense pipeline.
     */
    public ClinicalQueryDefenseResult analyzeAndDefend(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return new ClinicalQueryDefenseResult("");
        }

        ClinicalQueryDefenseResult result = new ClinicalQueryDefenseResult(rawQuery);
        String text = rawQuery.trim();

        // -------------------------------------------------------------
        // STAGE 1: Red-Flag Emergency Screening
        // -------------------------------------------------------------
        Matcher redFlagMatcher = RED_FLAG_PATTERN.matcher(text);
        if (redFlagMatcher.find()) {
            String emergencyMarker = redFlagMatcher.group();
            result.setEmergencyRedFlag(true);
            result.setEmergencyWarning(
                    "Phát hiện triệu chứng cấp cứu nguy kịch: '" + emergencyMarker + "'. " +
                    "Vui lòng gọi ngay Cấp Cứu 115 hoặc di chuyển tới Bệnh viện gần nhất lập tức! Không nên chờ lịch khám phòng khám thông thường."
            );
            log.warn("🚨 [RED-FLAG EMERGENCY INTERCEPTED] Query: '{}' matched emergency trigger: '{}'", text, emergencyMarker);
        }

        // -------------------------------------------------------------
        // STAGE 2: Slang & Typo Normalization
        // -------------------------------------------------------------
        String normalized = normalizeSlangAndTypos(text);
        result.setSanitizedQuery(normalized);

        // -------------------------------------------------------------
        // STAGE 3: Vietnamese NegEx (Affirmed vs Negated Symptoms)
        // -------------------------------------------------------------
        NegationExtractionResult negEx = extractNegationAndAffirmation(normalized);
        result.setAffirmedSymptoms(negEx.affirmedClauses);
        result.setNegatedSymptoms(negEx.negatedClauses);

        // Construct optimized clinical query strictly from affirmed clinical complaints
        String optimizedQuery = !negEx.affirmedClauses.isEmpty()
                ? String.join(". ", negEx.affirmedClauses)
                : normalized;
        result.setOptimizedClinicalQuery(optimizedQuery);

        // -------------------------------------------------------------
        // STAGE 4: Out-of-Distribution (OOD) Intent Gate
        // -------------------------------------------------------------
        boolean isBilling = OOD_BILLING_PATTERN.matcher(normalized).find();
        boolean isAdmin = OOD_ADMIN_PATTERN.matcher(normalized).find();
        boolean isSpam = OOD_SPAM_PATTERN.matcher(normalized).matches();

        // Only mark OOD if there are NO substantial clinical affirmed symptoms
        boolean hasClinicalSubstance = hasClinicalSubstance(optimizedQuery);

        if ((isBilling || isAdmin || isSpam) && !hasClinicalSubstance) {
            result.setOutOfDomain(true);
            if (isBilling) {
                result.setOodGuidance("Câu hỏi liên quan đến chi phí / viện phí / BHYT. Vui lòng tham khảo bảng giá dịch vụ hoặc liên hệ Bộ phận Thu ngân.");
            } else if (isAdmin) {
                result.setOodGuidance("Câu hỏi liên quan đến giờ khám / thủ tục hành chính. Vui lòng liên hệ Quầy tiếp đón Bệnh viện để được hướng dẫn.");
            } else {
                result.setOodGuidance("Tin nhắn không chứa triệu chứng bệnh cụ thể. Vui lòng mô tả chi tiết biểu hiện khó chịu để hệ thống tìm kiếm bác sĩ phù hợp.");
            }
            log.info("ℹ️ [OOD NON-CLINICAL QUERY] Query '{}' flagged as out-of-domain (guidance: {})", text, result.getOodGuidance());
        }

        // -------------------------------------------------------------
        // STAGE 5: Multi-Symptom Decomposition
        // -------------------------------------------------------------
        String[] compoundParts = COMPOUND_SPLIT_PATTERN.split(optimizedQuery);
        List<String> subQueries = new ArrayList<>();
        for (String part : compoundParts) {
            String cleanPart = part.trim();
            if (cleanPart.length() >= 3) {
                subQueries.add(cleanPart);
            }
        }
        result.setSubQueries(subQueries.isEmpty() ? List.of(optimizedQuery) : subQueries);

        return result;
    }

    /**
     * Replaces common abbreviations, slang, and typo tokens with standard medical Vietnamese.
     */
    public String normalizeSlangAndTypos(String text) {
        String result = text;
        for (Map.Entry<String, String> entry : SLANG_MAP.entrySet()) {
            Pattern p = Pattern.compile(entry.getKey(), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
            result = p.matcher(result).replaceAll(entry.getValue());
        }
        return result;
    }

    /**
     * Segments sentences into affirmative clauses vs negated clauses using Vietnamese negation triggers.
     */
    private NegationExtractionResult extractNegationAndAffirmation(String text) {
        NegationExtractionResult res = new NegationExtractionResult();

        // Split on major contrastive conjunctions or sentence boundaries
        String[] clauses = text.split("(?iu)(?:[.,;?!]|\\s+(?:nhưng\\s+mà|nhưng|tuy\\s+nhiên|mặc\\s+dù|song)\\s+)");

        for (String rawClause : clauses) {
            String clause = rawClause.trim();
            if (clause.length() < 2) continue;

            Matcher matcher = NEGATION_TRIGGER_PATTERN.matcher(clause);
            if (matcher.find()) {
                res.negatedClauses.add(clause);
            } else {
                res.affirmedClauses.add(clause);
            }
        }

        return res;
    }

    /**
     * Determines whether text contains clinical complaint keywords rather than pure noise.
     */
    private boolean hasClinicalSubstance(String query) {
        String lower = query.toLowerCase();
        return lower.contains("đau") || lower.contains("nhức") || lower.contains("sốt") ||
               lower.contains("ho") || lower.contains("ngứa") || lower.contains("khó thở") ||
               lower.contains("mệt") || lower.contains("viêm") || lower.contains("tức") ||
               lower.contains("chóng mặt") || lower.contains("buồn nôn") || lower.contains("nổi mẩn") ||
               lower.contains("tim") || lower.contains("bụng") || lower.contains("khớp");
    }

    private static class NegationExtractionResult {
        List<String> affirmedClauses = new ArrayList<>();
        List<String> negatedClauses = new ArrayList<>();
    }
}
