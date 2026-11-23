package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.clinical.DrugAllergyConflictDto;
import com.mediassist.dto.clinical.DrugInteractionDto;
import com.mediassist.dto.clinical.Icd10DiagnosisDto;
import com.mediassist.dto.clinical.LabIndicatorDto;
import com.mediassist.dto.clinical.News2ScoreDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class ClinicalOntologyServiceTest {

    private ClinicalOntologyService ontologyService;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        ontologyService = new ClinicalOntologyService(objectMapper);
        ontologyService.initOntologies();
    }

    @Test
    @DisplayName("Should load ICD-10 and LOINC lab ontologies successfully from classpath")
    void testInitOntologies_LoadsDataCorrectly() {
        List<Icd10DiagnosisDto> icdList = ontologyService.searchIcd10(null, null);
        assertNotNull(icdList);
        assertFalse(icdList.isEmpty(), "ICD-10 ontology should contain standard diagnoses");
        assertTrue(icdList.size() >= 30, "Should contain at least 30 diagnoses");

        List<LabIndicatorDto> labList = ontologyService.searchLabIndicators(null, null);
        assertNotNull(labList);
        assertFalse(labList.isEmpty(), "LOINC lab indicator ontology should contain standard tests");
        assertTrue(labList.size() >= 20, "Should contain at least 20 lab indicators");
    }

    @Test
    @DisplayName("Should search ICD-10 diagnoses by code, name or clinical symptom")
    void testSearchIcd10_ByCodeAndName() {
        // Search by code
        List<Icd10DiagnosisDto> byCode = ontologyService.searchIcd10("I20", null);
        assertFalse(byCode.isEmpty());
        assertTrue(byCode.stream().anyMatch(d -> d.getCode().startsWith("I20")));

        // Search by Vietnamese name
        List<Icd10DiagnosisDto> byName = ontologyService.searchIcd10("đái tháo đường", null);
        assertFalse(byName.isEmpty());
        assertTrue(byName.stream().anyMatch(d -> d.getCode().equals("E11.9")));

        // Search by symptom
        List<Icd10DiagnosisDto> bySymptom = ontologyService.searchIcd10("ợ chua", null);
        assertFalse(bySymptom.isEmpty());
        assertTrue(bySymptom.stream().anyMatch(d -> d.getSpecialtySlug().equals("gastroenterology")));
    }

    @Test
    @DisplayName("Should filter ICD-10 diagnoses by medical specialty")
    void testSearchIcd10_BySpecialty() {
        List<Icd10DiagnosisDto> cardioList = ontologyService.searchIcd10(null, "cardiology");
        assertFalse(cardioList.isEmpty());
        assertTrue(cardioList.stream().allMatch(d -> d.getSpecialtySlug().equals("cardiology")));

        List<Icd10DiagnosisDto> gastroList = ontologyService.searchIcd10("dạ dày", "gastroenterology");
        assertFalse(gastroList.isEmpty());
        assertTrue(gastroList.stream().anyMatch(d -> d.getCode().equals("K29.7")));
    }

    @Test
    @DisplayName("Should retrieve ICD-10 diagnosis by exact uppercase or lowercase code")
    void testGetIcd10ByCode() {
        Optional<Icd10DiagnosisDto> resUpper = ontologyService.getIcd10ByCode("I10");
        assertTrue(resUpper.isPresent());
        assertEquals("I10", resUpper.get().getCode());
        assertEquals("Tăng huyết áp nguyên phát (vô căn)", resUpper.get().getNameVi());

        Optional<Icd10DiagnosisDto> resLower = ontologyService.getIcd10ByCode("k29.7");
        assertTrue(resLower.isPresent());
        assertEquals("K29.7", resLower.get().getCode());

        Optional<Icd10DiagnosisDto> resNotFound = ontologyService.getIcd10ByCode("INVALID_CODE");
        assertTrue(resNotFound.isEmpty());
    }

    @Test
    @DisplayName("Should search LOINC laboratory indicators by code, name and specialty")
    void testSearchLabIndicators() {
        // Search by LOINC code
        List<LabIndicatorDto> byLoinc = ontologyService.searchLabIndicators("2345-7", null);
        assertFalse(byLoinc.isEmpty());
        assertEquals("GLUCOSE_FASTING", byLoinc.get(0).getId());

        // Search by name
        List<LabIndicatorDto> byName = ontologyService.searchLabIndicators("Troponin", null);
        assertFalse(byName.isEmpty());
        assertEquals("6598-7", byLoinc.get(0).getLoincCode().equals("6598-7") ? byLoinc.get(0).getLoincCode() : byName.get(0).getLoincCode());

        // Filter by specialty
        List<LabIndicatorDto> nephroList = ontologyService.searchLabIndicators(null, "nephrology");
        assertFalse(nephroList.isEmpty());
        assertTrue(nephroList.stream().allMatch(i -> i.getTargetSpecialty().equals("nephrology")));
    }

    @Test
    @DisplayName("Should retrieve LOINC laboratory indicator by exact LOINC code")
    void testGetLabIndicatorByLoinc() {
        Optional<LabIndicatorDto> res = ontologyService.getLabIndicatorByLoinc("6598-7");
        assertTrue(res.isPresent());
        assertEquals("TROPONIN_T_HS", res.get().getId());
        assertEquals("Troponin T hs (Độ nhạy cao)", res.get().getNameVi());
        assertEquals("< 0.014 (< 14 ng/L)", res.get().getRefRangeText());

        Optional<LabIndicatorDto> resAlt = ontologyService.getLabIndicatorByLoinc("1742-6");
        assertTrue(resAlt.isPresent());
        assertEquals("ALT_GPT", resAlt.get().getId());

        Optional<LabIndicatorDto> resNotFound = ontologyService.getLabIndicatorByLoinc("99999-9");
        assertTrue(resNotFound.isEmpty());
    }

    @Test
    @DisplayName("Should fuzzy match laboratory indicators by OCR name, alias, and substring")
    void testFuzzyMatchIndicator_Variations() {
        // 1. Direct name match (Vietnamese / ID)
        Optional<LabIndicatorDto> exactMatch = ontologyService.fuzzyMatchIndicator("Glucose máu lúc đói");
        assertTrue(exactMatch.isPresent());
        assertEquals("2345-7", exactMatch.get().getLoincCode());

        // 2. Alias match (e.g. OCR reports "men gan AST" or "SGOT")
        Optional<LabIndicatorDto> aliasAst = ontologyService.fuzzyMatchIndicator("Men gan AST");
        assertTrue(aliasAst.isPresent());
        assertEquals("AST_GOT", aliasAst.get().getId());
        assertEquals("1920-8", aliasAst.get().getLoincCode());

        Optional<LabIndicatorDto> aliasSgpt = ontologyService.fuzzyMatchIndicator("SGPT");
        assertTrue(aliasSgpt.isPresent());
        assertEquals("ALT_GPT", aliasSgpt.get().getId());

        // 3. Common Vietnamese alias: "Đường huyết", "Axit Uric", "Độ lọc cầu thận"
        Optional<LabIndicatorDto> aliasDuongHuyet = ontologyService.fuzzyMatchIndicator("Đường huyết mao mạch");
        assertTrue(aliasDuongHuyet.isPresent());
        assertEquals("GLUCOSE_FASTING", aliasDuongHuyet.get().getId());

        Optional<LabIndicatorDto> aliasUric = ontologyService.fuzzyMatchIndicator("Acid uric máu");
        assertTrue(aliasUric.isPresent());
        assertEquals("URIC_ACID", aliasUric.get().getId());

        // 4. Substring containment
        Optional<LabIndicatorDto> subMatch = ontologyService.fuzzyMatchIndicator("Creatinine huyết thanh (Serum)");
        assertTrue(subMatch.isPresent());
        assertEquals("2160-0", subMatch.get().getLoincCode());

        // 5. Unrecognized indicator
        Optional<LabIndicatorDto> unknown = ontologyService.fuzzyMatchIndicator("Chỉ số không xác định XYZ123");
        assertTrue(unknown.isEmpty());
    }

    @Test
    @DisplayName("Should retrieve lab indicator by internal ID and bulk list")
    void testGetLabIndicatorById_AndGetAll() {
        Optional<LabIndicatorDto> byId = ontologyService.getLabIndicatorById("HBA1C");
        assertTrue(byId.isPresent());
        assertEquals("4548-4", byId.get().getLoincCode());
        assertEquals("Nội tiết - Chuyển hóa", byId.get().getCategory());

        List<LabIndicatorDto> all = ontologyService.getAllLabIndicators();
        assertNotNull(all);
        assertEquals(24, all.size(), "Should contain 24 standard LOINC lab indicators including SODIUM");
    }

    @Test
    @DisplayName("Should evaluate lab indicator panic values and standard ranges correctly")
    void testEvaluateIndicatorStatus_PanicAndRanges() {
        // 1. Potassium: min 3.5, max 5.0, critLow 2.8, critHigh 6.2
        assertEquals("NORMAL", ontologyService.evaluateIndicatorStatus("POTASSIUM", 4.2));
        assertEquals("ELEVATED", ontologyService.evaluateIndicatorStatus("POTASSIUM", 5.5));
        assertEquals("LOW", ontologyService.evaluateIndicatorStatus("POTASSIUM", 3.2));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("POTASSIUM", 2.5));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("POTASSIUM", 6.8));

        // 2. Glucose: min 3.9, max 6.4, critLow 2.2, critHigh 25.0
        assertEquals("NORMAL", ontologyService.evaluateIndicatorStatus("GLUCOSE_FASTING", 5.2));
        assertEquals("ELEVATED", ontologyService.evaluateIndicatorStatus("GLUCOSE_FASTING", 12.0));
        assertEquals("LOW", ontologyService.evaluateIndicatorStatus("GLUCOSE_FASTING", 3.0));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("GLUCOSE_FASTING", 1.9));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("GLUCOSE_FASTING", 28.5));

        // 3. Sodium: min 135.0, max 145.0, critLow 120.0, critHigh 160.0
        assertEquals("NORMAL", ontologyService.evaluateIndicatorStatus("SODIUM", 138.0));
        assertEquals("LOW", ontologyService.evaluateIndicatorStatus("SODIUM", 128.0));
        assertEquals("ELEVATED", ontologyService.evaluateIndicatorStatus("SODIUM", 152.0));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("SODIUM", 115.0));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("SODIUM", 168.0));

        // 4. Platelets: min 150.0, max 450.0, critLow 30.0
        assertEquals("NORMAL", ontologyService.evaluateIndicatorStatus("PLATELETS", 220.0));
        assertEquals("LOW", ontologyService.evaluateIndicatorStatus("PLATELETS", 80.0));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("PLATELETS", 18.0));

        // 5. Troponin T hs: max 0.014, critHigh 0.05
        assertEquals("NORMAL", ontologyService.evaluateIndicatorStatus("TROPONIN_T_HS", 0.008));
        assertEquals("ELEVATED", ontologyService.evaluateIndicatorStatus("TROPONIN_T_HS", 0.030));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("TROPONIN_T_HS", 0.095));

        // Evaluation by LOINC code and fuzzy match
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("2823-3", 2.1));
        assertEquals("CRITICAL_PANIC", ontologyService.evaluateIndicatorStatus("Đường huyết mao mạch", 32.0));
        assertEquals("UNKNOWN", ontologyService.evaluateIndicatorStatus("NON_EXISTING_INDICATOR", 5.0));
        assertEquals("UNKNOWN", ontologyService.evaluateIndicatorStatus("POTASSIUM", null));
    }

    @Test
    @DisplayName("Should calculate NEWS-2 score accurately according to Royal College of Physicians standard")
    void testCalculateNews2Score_AllRiskTiers() {
        // Tier 1: Normal healthy patient -> LOW (Score 0)
        News2ScoreDto normal = ontologyService.calculateNews2Score(16, 98, 120, 72, "Alert", 36.8);
        assertNotNull(normal);
        assertEquals(0, normal.getTotalScore());
        assertEquals("LOW", normal.getRiskLevel());
        assertFalse(normal.isSingleParameterScoreThree());
        assertTrue(normal.getClinicalGuidance().contains("thường quy"));

        // Tier 2: Low-Medium risk due to single parameter score 3 (SpO2 <= 91%)
        // RR: 16 (0), SpO2: 90 (3), BP: 120 (0), HR: 72 (0), Alert (0), Temp: 36.8 (0) -> Total: 3, but single 3!
        News2ScoreDto singleExtreme = ontologyService.calculateNews2Score(16, 90, 120, 72, "A", 36.8);
        assertEquals(3, singleExtreme.getTotalScore());
        assertEquals("MEDIUM", singleExtreme.getRiskLevel(), "Single score of 3 triggers MEDIUM risk");
        assertTrue(singleExtreme.isSingleParameterScoreThree());
        assertEquals(3, singleExtreme.getSubScores().get("spO2"));

        // Tier 3: Medium risk by cumulative score 5-6 without single 3
        // RR: 22 (2), SpO2: 93 (2), BP: 105 (1), HR: 80 (0), Alert (0), Temp: 37.0 (0) -> Total: 5
        News2ScoreDto medium = ontologyService.calculateNews2Score(22, 93, 105, 80, "Alert", 37.0);
        assertEquals(5, medium.getTotalScore());
        assertEquals("MEDIUM", medium.getRiskLevel());
        assertFalse(medium.isSingleParameterScoreThree());
        assertTrue(medium.getClinicalGuidance().contains("khoa điều trị") || medium.getClinicalGuidance().contains("thăm khám"));

        // Tier 4: High risk / Critical deteriorating patient (Total >= 7)
        // RR: 28 (3), SpO2: 88 (3), BP: 85 (3), HR: 135 (3), Confusion (3), Temp: 39.5 (2) -> Total: 17
        News2ScoreDto critical = ontologyService.calculateNews2Score(28, 88, 85, 135, "Confusion", 39.5);
        assertEquals(17, critical.getTotalScore());
        assertEquals("HIGH", critical.getRiskLevel());
        assertTrue(critical.isSingleParameterScoreThree());
        assertTrue(critical.getClinicalGuidance().contains("Code Blue") || critical.getClinicalGuidance().contains("ICU"));
    }

    @Test
    @DisplayName("Should detect major drug-drug interactions (DDI) with severity and guidance")
    void testCheckDrugInteractions_MajorPairs() {
        // 1. Warfarin + Aspirin / NSAID
        List<DrugInteractionDto> ddi1 = ontologyService.checkDrugInteractions(
                List.of("Warfarin 5mg", "Aspirin 81mg", "Paracetamol 500mg")
        );
        assertFalse(ddi1.isEmpty());
        assertTrue(ddi1.stream().anyMatch(d -> d.getInteractionType().equals("BLEEDING_RISK")));
        assertEquals("MAJOR", ddi1.get(0).getSeverity());

        // 2. Clopidogrel + Omeprazole
        List<DrugInteractionDto> ddi2 = ontologyService.checkDrugInteractions(
                List.of("Plavix 75mg", "Omeprazole 20mg")
        );
        assertFalse(ddi2.isEmpty());
        assertTrue(ddi2.stream().anyMatch(d -> d.getInteractionType().equals("CYP2C19_INHIBITION")));
        assertTrue(ddi2.get(0).getClinicalGuidance().contains("Pantoprazole"));

        // 3. Simvastatin + Clarithromycin
        List<DrugInteractionDto> ddi3 = ontologyService.checkDrugInteractions(
                List.of("Simvastatin 20mg", "Clarithromycin 500mg (Klacid)")
        );
        assertFalse(ddi3.isEmpty());
        assertEquals("CONTRAINDICATED", ddi3.get(0).getSeverity());
        assertTrue(ddi3.stream().anyMatch(d -> d.getInteractionType().equals("RHABDOMYOLYSIS_RISK")));

        // 4. ACEi + Spironolactone
        List<DrugInteractionDto> ddi4 = ontologyService.checkDrugInteractions(
                List.of("Coversyl 5mg (Perindopril)", "Aldactone 25mg (Spironolactone)")
        );
        assertFalse(ddi4.isEmpty());
        assertTrue(ddi4.stream().anyMatch(d -> d.getInteractionType().equals("HYPERKALEMIA_RISK")));

        // 5. Metformin + Contrast dye
        List<DrugInteractionDto> ddi5 = ontologyService.checkDrugInteractions(
                List.of("Metformin 850mg (Glucophage)", "Thuốc cản quang Omnipaque (Iohexol)")
        );
        assertFalse(ddi5.isEmpty());
        assertTrue(ddi5.stream().anyMatch(d -> d.getInteractionType().equals("LACTIC_ACIDOSIS_RISK")));

        // 6. Safe combination (No interaction)
        List<DrugInteractionDto> safeList = ontologyService.checkDrugInteractions(
                List.of("Paracetamol 500mg", "Vitamin C 500mg")
        );
        assertTrue(safeList.isEmpty());
    }

    @Test
    @DisplayName("Should detect drug-allergy conflicts and cross-reactivity warnings")
    void testCheckDrugAllergyConflict_CrossReactivity() {
        // 1. Penicillin allergy with Augmentin (Amoxicillin/Clavulanate)
        List<DrugAllergyConflictDto> c1 = ontologyService.checkDrugAllergyConflict(
                List.of("Augmentin 625mg", "Paracetamol 500mg"),
                "Tiền sử dị ứng Penicillin nặng"
        );
        assertFalse(c1.isEmpty());
        assertEquals(1, c1.size());
        assertEquals("Augmentin 625mg", c1.get(0).getDrugName());
        assertEquals("CRITICAL", c1.get(0).getSeverity());
        assertEquals("Penicillin / Beta-lactam", c1.get(0).getDrugClass());

        // 2. Penicillin allergy cross-reactivity with Cephalosporin
        List<DrugAllergyConflictDto> c2 = ontologyService.checkDrugAllergyConflict(
                List.of("Zinnat 500mg (Cefuroxime)"),
                "Dị ứng Amoxicillin / Penicillin"
        );
        assertFalse(c2.isEmpty());
        assertEquals("HIGH", c2.get(0).getSeverity());
        assertTrue(c2.get(0).getDrugClass().contains("Cephalosporin"));

        // 3. NSAID allergy with Ibuprofen
        List<DrugAllergyConflictDto> c3 = ontologyService.checkDrugAllergyConflict(
                List.of("Ibuprofen 400mg", "Omeprazole 20mg"),
                "Bệnh nhân dị ứng NSAID và Aspirin"
        );
        assertFalse(c3.isEmpty());
        assertEquals("CRITICAL", c3.get(0).getSeverity());
        assertEquals("NSAID (Kháng viêm không steroid)", c3.get(0).getDrugClass());

        // 4. Sulfa allergy with Bactrim
        List<DrugAllergyConflictDto> c4 = ontologyService.checkDrugAllergyConflict(
                List.of("Bactrim 480mg"),
                "Dị ứng kháng sinh Sulfa (Sulfonamide)"
        );
        assertFalse(c4.isEmpty());
        assertEquals("CRITICAL", c4.get(0).getSeverity());
        assertEquals("Sulfonamide", c4.get(0).getDrugClass());

        // 5. Safe prescription without conflict
        List<DrugAllergyConflictDto> cSafe = ontologyService.checkDrugAllergyConflict(
                List.of("Paracetamol 500mg", "Omeprazole 20mg"),
                "Dị ứng Penicillin"
        );
        assertTrue(cSafe.isEmpty());

        // 6. Null / blank inputs
        assertTrue(ontologyService.checkDrugAllergyConflict(null, "Penicillin").isEmpty());
        assertTrue(ontologyService.checkDrugAllergyConflict(List.of("Augmentin"), null).isEmpty());
        assertTrue(ontologyService.checkDrugAllergyConflict(List.of("Augmentin"), "   ").isEmpty());
    }
}
