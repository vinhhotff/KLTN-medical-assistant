package com.mediassist.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ClinicalSafetyGuardrailServiceTest {

    private final ClinicalSafetyGuardrailService guardrail = new ClinicalSafetyGuardrailService();

    @Test
    void shouldPassThroughSafeNonPharmacologicalAdvice() {
        String safe = "Bạn nên nghỉ ngơi, uống đủ nước ấm và theo dõi thân nhiệt. Nếu sốt cao liên tục trên 39 độ, hãy đến cơ sở y tế để bác sĩ thăm khám.";
        ClinicalSafetyGuardrailService.SanitizationResult result = guardrail.sanitizePatientAdvice(safe);

        assertFalse(result.intercepted());
        assertEquals(safe, result.sanitizedText());
    }

    @Test
    void shouldPreserveCautionAgainstSelfMedication() {
        String caution = "Hãy nghỉ ngơi và tránh tự ý dùng thuốc khi chưa có chỉ định của bác sĩ.";
        ClinicalSafetyGuardrailService.SanitizationResult result = guardrail.sanitizePatientAdvice(caution);

        assertFalse(result.intercepted());
        assertEquals(caution, result.sanitizedText());
    }

    @Test
    void shouldInterceptSpecificDrugNameAndDosage() {
        String unsafe = "Bạn có thể nghỉ ngơi tại nhà. Bạn nên uống Paracetamol 500mg mỗi 6 giờ để hạ sốt. Hãy đặt lịch khám nếu không đỡ.";
        ClinicalSafetyGuardrailService.SanitizationResult result = guardrail.sanitizePatientAdvice(unsafe);

        assertTrue(result.intercepted());
        assertFalse(result.sanitizedText().toLowerCase().contains("paracetamol"));
        assertFalse(result.sanitizedText().contains("500mg"));
        assertTrue(result.sanitizedText().contains("Bạn có thể nghỉ ngơi tại nhà."));
        assertTrue(result.sanitizedText().contains("Hãy đặt lịch khám nếu không đỡ."));
        assertTrue(result.sanitizedText().contains("tuyệt đối không đề xuất tên thuốc"));
    }

    @Test
    void shouldInterceptVietnameseBrandNamesAndAntibioticRecommendations() {
        String unsafe = "Bạn nên mua thuốc kháng sinh Augmentin hoặc uống Panadol để giảm đau họng.";
        ClinicalSafetyGuardrailService.SanitizationResult result = guardrail.sanitizePatientAdvice(unsafe);

        assertTrue(result.intercepted());
        assertFalse(result.sanitizedText().toLowerCase().contains("augmentin"));
        assertFalse(result.sanitizedText().toLowerCase().contains("panadol"));
        assertTrue(result.sanitizedText().contains("tuyệt đối không đề xuất tên thuốc"));
    }

    @Test
    void shouldNotFalsePositiveOnLabUnitDenominators() {
        String labContext = "Chỉ số đường huyết 6.5 mg/dL hoặc Creatinine 1.1 mg/dL cần được bác sĩ Nội tiết đánh giá thêm.";
        ClinicalSafetyGuardrailService.SanitizationResult result = guardrail.sanitizePatientAdvice(labContext);

        assertFalse(result.intercepted());
        assertEquals(labContext, result.sanitizedText());
    }

    @Test
    void shouldFilterUnsafeClarifyingQuestionsWhileKeepingHistoryQuestions() {
        List<String> questions = List.of(
                "Bạn đã uống thuốc gì trước khi đến khám chưa?",
                "Bạn có muốn thử uống Ibuprofen 400mg không?",
                "Triệu chứng sốt xuất hiện từ bao giờ?"
        );

        List<String> filtered = guardrail.sanitizeClarifyingQuestions(questions);
        assertEquals(2, filtered.size());
        assertTrue(filtered.get(0).contains("đã uống thuốc gì"));
        assertTrue(filtered.get(1).contains("Triệu chứng sốt"));
    }
}
