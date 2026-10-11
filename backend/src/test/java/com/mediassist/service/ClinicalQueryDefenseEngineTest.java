package com.mediassist.service;

import com.mediassist.dto.ClinicalQueryDefenseResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ClinicalQueryDefenseEngineTest {

    private ClinicalQueryDefenseEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ClinicalQueryDefenseEngine();
    }

    @Test
    @DisplayName("Stage 1: Red-Flag Emergency Screening intercepts acute life-threatening symptoms")
    void testRedFlagEmergency_TriggeredOnAcuteSymptoms() {
        ClinicalQueryDefenseResult res1 = engine.analyzeAndDefend("bệnh nhân bị nôn ra máu và ngất xỉu từ sáng");
        assertTrue(res1.isEmergencyRedFlag());
        assertNotNull(res1.getEmergencyWarning());
        assertTrue(res1.getEmergencyWarning().contains("115"));

        ClinicalQueryDefenseResult res2 = engine.analyzeAndDefend("người nhà đột nhiên bị méo miệng và liệt nửa người");
        assertTrue(res2.isEmergencyRedFlag());

        ClinicalQueryDefenseResult res3 = engine.analyzeAndDefend("tôi bị đau ngực dữ dội như bóp nghẹt lồng ngực");
        assertTrue(res3.isEmergencyRedFlag());

        ClinicalQueryDefenseResult normal = engine.analyzeAndDefend("tôi bị đau âm ỉ vùng thượng vị sau khi ăn");
        assertFalse(normal.isEmergencyRedFlag());
    }

    @Test
    @DisplayName("Stage 2: Slang & Typo Normalizer fixes Vietnamese teen-code, abbreviations and non-accented terms")
    void testSlangAndTypoNormalization() {
        String raw = "bs oi em bi dau da day voi met moi, ko ngu dc may ngay nay";
        String normalized = engine.normalizeSlangAndTypos(raw);

        assertTrue(normalized.contains("bác sĩ"));
        assertTrue(normalized.contains("đau dạ dày"));
        assertTrue(normalized.contains("mệt mỏi"));
        assertTrue(normalized.contains("không"));
    }

    @Test
    @DisplayName("Stage 3: Vietnamese NegEx correctly isolates affirmed symptoms and strips negated symptoms")
    void testVietnameseNegEx_FiltersNegatedSymptoms() {
        String complaint = "Tôi bị đau bụng quặn từng cơn nhưng không sốt, không buồn nôn, không khó thở";
        ClinicalQueryDefenseResult result = engine.analyzeAndDefend(complaint);

        assertNotNull(result.getAffirmedSymptoms());
        assertNotNull(result.getNegatedSymptoms());

        // Affirmed must contain abdominal pain
        assertTrue(result.getAffirmedSymptoms().stream().anyMatch(s -> s.contains("đau bụng quặn")));

        // Negated must record fever, nausea, dyspnea
        assertTrue(result.getNegatedSymptoms().stream().anyMatch(s -> s.contains("không sốt")));

        // Optimized query passed to vector embedding should NOT contain negated symptoms
        String optimized = result.getOptimizedClinicalQuery();
        assertTrue(optimized.contains("đau bụng"));
        assertFalse(optimized.contains("không sốt"));
    }

    @Test
    @DisplayName("Stage 4: Out-of-Distribution (OOD) Gate intercepts non-clinical administrative and billing queries")
    void testOutOfDomainGate_BillingAndAdmin() {
        ClinicalQueryDefenseResult billing = engine.analyzeAndDefend("khám ở đây hết bao nhiêu tiền vậy ạ, có bảo hiểm y tế không");
        assertTrue(billing.isOutOfDomain());
        assertNotNull(billing.getOodGuidance());
        assertTrue(billing.getOodGuidance().contains("chi phí"));

        ClinicalQueryDefenseResult admin = engine.analyzeAndDefend("bệnh viện mở cửa mấy giờ vậy ạ, địa chỉ ở đâu");
        assertTrue(admin.isOutOfDomain());
        assertNotNull(admin.getOodGuidance());

        ClinicalQueryDefenseResult spam = engine.analyzeAndDefend("alo hello test 123");
        assertTrue(spam.isOutOfDomain());

        // Clinical complaints with a fee mention should NOT be rejected
        ClinicalQueryDefenseResult clinical = engine.analyzeAndDefend("tôi bị đau thắt ngực tim đập nhanh khám hết bao nhiêu tiền");
        assertFalse(clinical.isOutOfDomain()); // Contains genuine clinical symptoms
    }

    @Test
    @DisplayName("Stage 5: Multi-Symptom Decomposition splits compound multi-specialty complaints")
    void testMultiSymptomDecomposition() {
        String compound = "Tôi bị đau tức ngực khi leo thang đồng thời khớp gối kêu lục cục đi lại rất đau";
        ClinicalQueryDefenseResult res = engine.analyzeAndDefend(compound);

        assertNotNull(res.getSubQueries());
        assertTrue(res.getSubQueries().size() >= 2);
        assertTrue(res.getSubQueries().stream().anyMatch(q -> q.contains("đau tức ngực")));
        assertTrue(res.getSubQueries().stream().anyMatch(q -> q.contains("khớp gối")));
    }
}
