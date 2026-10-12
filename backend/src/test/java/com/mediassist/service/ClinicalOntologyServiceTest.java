package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.clinical.Icd10DiagnosisDto;
import com.mediassist.dto.clinical.LabIndicatorDto;
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
}
