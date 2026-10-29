package com.mediassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.clinical.Icd10DiagnosisDto;
import com.mediassist.dto.clinical.LabIndicatorDto;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service providing standardized medical clinical ontologies:
 * 1. WHO ICD-10 & Ministry of Health Vietnam Diagnosis Dictionary.
 * 2. International LOINC & Decision 3280/QĐ-BYT Laboratory Indicators Dictionary.
 */
@Service
public class ClinicalOntologyService {

    private static final Logger log = LoggerFactory.getLogger(ClinicalOntologyService.class);

    private final ObjectMapper objectMapper;
    private final List<Icd10DiagnosisDto> icd10List = new ArrayList<>();
    private final Map<String, Icd10DiagnosisDto> icd10ByCode = new ConcurrentHashMap<>();

    private final List<LabIndicatorDto> labIndicatorList = new ArrayList<>();
    private final Map<String, LabIndicatorDto> labIndicatorByLoinc = new ConcurrentHashMap<>();
    private final Map<String, LabIndicatorDto> labIndicatorById = new ConcurrentHashMap<>();

    public ClinicalOntologyService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void initOntologies() {
        loadIcd10Ontology();
        loadLabIndicatorsOntology();
    }

    private void loadIcd10Ontology() {
        try {
            ClassPathResource resource = new ClassPathResource("clinical_ontology/icd10_vietnam_standard.json");
            if (!resource.exists()) {
                log.warn("⚠️ [ONTOLOGY] icd10_vietnam_standard.json not found on classpath.");
                return;
            }
            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                JsonNode diagnosesNode = root.path("diagnoses");
                if (diagnosesNode.isArray()) {
                    for (JsonNode node : diagnosesNode) {
                        String code = node.path("code").asText("");
                        String nameVi = node.path("nameVi").asText("");
                        String nameEn = node.path("nameEn").asText("");
                        String chapter = node.path("chapter").asText("");
                        String specialtySlug = node.path("specialtySlug").asText("");
                        String specialtyName = node.path("specialtyName").asText("");

                        List<String> symptoms = new ArrayList<>();
                        JsonNode symNode = node.path("commonSymptoms");
                        if (symNode.isArray()) {
                            for (JsonNode s : symNode) {
                                symptoms.add(s.asText());
                            }
                        }

                        Icd10DiagnosisDto dto = new Icd10DiagnosisDto(
                                code, nameVi, nameEn, chapter, specialtySlug, specialtyName, symptoms
                        );
                        icd10List.add(dto);
                        if (!code.isBlank()) {
                            icd10ByCode.put(code.toUpperCase(), dto);
                        }
                    }
                }
            }
            log.info("🩺 [ONTOLOGY LOADED] Loaded {} standard ICD-10 diagnoses.", icd10List.size());
        } catch (Exception e) {
            log.error("❌ Failed to load ICD-10 ontology: {}", e.getMessage(), e);
        }
    }

    private void loadLabIndicatorsOntology() {
        try {
            ClassPathResource resource = new ClassPathResource("clinical_ontology/lab_indicators_loinc_byt.json");
            if (!resource.exists()) {
                log.warn("⚠️ [ONTOLOGY] lab_indicators_loinc_byt.json not found on classpath.");
                return;
            }
            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                JsonNode indicatorsNode = root.path("indicators");
                if (indicatorsNode.isArray()) {
                    for (JsonNode node : indicatorsNode) {
                        String id = node.path("id").asText("");
                        String loincCode = node.path("loincCode").asText("");
                        String nameVi = node.path("nameVi").asText("");
                        String nameEn = node.path("nameEn").asText("");
                        String category = node.path("category").asText("");
                        String unit = node.path("unit").asText("");
                        Double min = node.has("refRangeMin") ? node.path("refRangeMin").asDouble() : null;
                        Double max = node.has("refRangeMax") ? node.path("refRangeMax").asDouble() : null;
                        String text = node.path("refRangeText").asText("");
                        String rel = node.path("clinicalRelevance").asText("");
                        String spec = node.path("targetSpecialty").asText("");

                        LabIndicatorDto dto = new LabIndicatorDto(
                                id, loincCode, nameVi, nameEn, category, unit, min, max, text, rel, spec
                        );
                        labIndicatorList.add(dto);
                        if (!loincCode.isBlank()) {
                            labIndicatorByLoinc.put(loincCode, dto);
                        }
                        if (!id.isBlank()) {
                            labIndicatorById.put(id, dto);
                        }
                    }
                }
            }
            log.info("🧪 [ONTOLOGY LOADED] Loaded {} standard LOINC lab indicators.", labIndicatorList.size());
        } catch (Exception e) {
            log.error("❌ Failed to load LOINC lab indicators ontology: {}", e.getMessage(), e);
        }
    }

    public List<Icd10DiagnosisDto> searchIcd10(String query, String specialtySlug) {
        String cleanQuery = (query != null) ? query.trim().toLowerCase() : "";
        String cleanSpec = (specialtySlug != null) ? specialtySlug.trim().toLowerCase() : "";

        return icd10List.stream()
                .filter(d -> {
                    if (!cleanSpec.isBlank() && !cleanSpec.equals("all")) {
                        if (!d.getSpecialtySlug().toLowerCase().equals(cleanSpec)) {
                            return false;
                        }
                    }
                    if (cleanQuery.isBlank()) {
                        return true;
                    }
                    return d.getCode().toLowerCase().contains(cleanQuery)
                            || d.getNameVi().toLowerCase().contains(cleanQuery)
                            || d.getNameEn().toLowerCase().contains(cleanQuery)
                            || d.getCommonSymptoms().stream().anyMatch(s -> s.toLowerCase().contains(cleanQuery));
                })
                .collect(Collectors.toList());
    }

    public Optional<Icd10DiagnosisDto> getIcd10ByCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        return Optional.ofNullable(icd10ByCode.get(code.trim().toUpperCase()));
    }

    public List<LabIndicatorDto> searchLabIndicators(String query, String specialtySlug) {
        String cleanQuery = (query != null) ? query.trim().toLowerCase() : "";
        String cleanSpec = (specialtySlug != null) ? specialtySlug.trim().toLowerCase() : "";

        return labIndicatorList.stream()
                .filter(i -> {
                    if (!cleanSpec.isBlank() && !cleanSpec.equals("all")) {
                        if (!i.getTargetSpecialty().toLowerCase().equals(cleanSpec)) {
                            return false;
                        }
                    }
                    if (cleanQuery.isBlank()) {
                        return true;
                    }
                    return i.getId().toLowerCase().contains(cleanQuery)
                            || i.getLoincCode().toLowerCase().contains(cleanQuery)
                            || i.getNameVi().toLowerCase().contains(cleanQuery)
                            || i.getNameEn().toLowerCase().contains(cleanQuery)
                            || i.getCategory().toLowerCase().contains(cleanQuery);
                })
                .collect(Collectors.toList());
    }

    public Optional<LabIndicatorDto> getLabIndicatorByLoinc(String loincCode) {
        if (loincCode == null || loincCode.isBlank()) return Optional.empty();
        return Optional.ofNullable(labIndicatorByLoinc.get(loincCode.trim()));
    }

    /**
     * Retrieves a lab indicator by its internal ontology ID (e.g., "AST_GOT", "GLUCOSE_FASTING").
     */
    public Optional<LabIndicatorDto> getLabIndicatorById(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        return Optional.ofNullable(labIndicatorById.get(id.trim()));
    }

    /**
     * Fuzzy-matches an OCR-extracted indicator name against the LOINC/BYT ontology.
     * Uses normalized Vietnamese text comparison with alias expansion to handle
     * common OCR artifacts, abbreviations, and Vietnamese medical terminology variants.
     *
     * @param ocrName Raw indicator name from OCR (e.g., "Men gan AST", "Glucose", "Tieu cau")
     * @return Matched LabIndicatorDto if found with confidence, empty otherwise
     */
    public Optional<LabIndicatorDto> fuzzyMatchIndicator(String ocrName) {
        if (ocrName == null || ocrName.isBlank()) return Optional.empty();

        String normalized = normalize(ocrName);

        // Phase 1: Exact match on normalized ID or Vietnamese name
        for (LabIndicatorDto dto : labIndicatorList) {
            if (normalize(dto.getId()).equals(normalized)
                    || normalize(dto.getNameVi()).equals(normalized)
                    || normalize(dto.getNameEn()).equalsIgnoreCase(ocrName.trim())) {
                return Optional.of(dto);
            }
        }

        // Phase 2: Alias-based matching for common Vietnamese lab report names
        for (Map.Entry<String, String> alias : INDICATOR_ALIASES.entrySet()) {
            if (normalized.contains(alias.getKey())) {
                LabIndicatorDto dto = labIndicatorById.get(alias.getValue());
                if (dto != null) return Optional.of(dto);
            }
        }

        // Phase 3: Substring containment match (OCR may prepend/append noise)
        for (LabIndicatorDto dto : labIndicatorList) {
            String normVi = normalize(dto.getNameVi());
            String normId = normalize(dto.getId());
            // Check if the OCR name substantially contains the ontology name or vice versa
            if (normalized.length() >= 3 && (normalized.contains(normVi) || normVi.contains(normalized)
                    || normalized.contains(normId) || normId.contains(normalized))) {
                return Optional.of(dto);
            }
        }

        return Optional.empty();
    }

    /**
     * Returns all loaded lab indicators for bulk injection into clinical prompts.
     */
    public List<LabIndicatorDto> getAllLabIndicators() {
        return Collections.unmodifiableList(labIndicatorList);
    }

    /**
     * Strips Vietnamese diacritics, lowercases, and normalizes whitespace for fuzzy comparison.
     * Note: 'đ' and 'Đ' (D with stroke) are replaced explicitly as NFD does not decompose them.
     */
    private static String normalize(String input) {
        if (input == null) return "";
        String text = input.replace('đ', 'd').replace('Đ', 'd');
        String nfd = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                   .toLowerCase()
                   .replaceAll("[^a-z0-9]+", " ")
                   .trim();
    }

    /**
     * Mapping of common Vietnamese lab report aliases/abbreviations to ontology IDs.
     * Covers OCR output variants, informal names, and standard medical abbreviations
     * used across Vietnamese hospital lab result sheets.
     */
    private static final Map<String, String> INDICATOR_ALIASES;
    static {
        Map<String, String> m = new LinkedHashMap<>();
        // Glucose & Diabetes
        m.put("glucose", "GLUCOSE_FASTING");
        m.put("duong huyet", "GLUCOSE_FASTING");
        m.put("duong mau", "GLUCOSE_FASTING");
        m.put("glu", "GLUCOSE_FASTING");
        m.put("hba1c", "HBA1C");
        m.put("hemoglobin a1c", "HBA1C");
        // Kidney
        m.put("ure ", "UREA");
        m.put("bun", "UREA");
        m.put("creatinin", "CREATININE");
        m.put("creatinine", "CREATININE");
        m.put("egfr", "EGFR");
        m.put("do loc cau than", "EGFR");
        m.put("muc loc", "EGFR");
        m.put("acid uric", "URIC_ACID");
        m.put("uric acid", "URIC_ACID");
        m.put("a uric", "URIC_ACID");
        // Liver
        m.put("ast", "AST_GOT");
        m.put("sgot", "AST_GOT");
        m.put("got", "AST_GOT");
        m.put("alt", "ALT_GPT");
        m.put("sgpt", "ALT_GPT");
        m.put("gpt", "ALT_GPT");
        m.put("ggt", "GGT");
        m.put("gamma gt", "GGT");
        m.put("gamma glutamyl", "GGT");
        m.put("bilirubin", "BILIRUBIN_TOTAL");
        m.put("albumin", "ALBUMIN");
        // Lipid
        m.put("cholesterol", "CHOLESTEROL_TOTAL");
        m.put("triglycerid", "TRIGLYCERIDE");
        m.put("triglyceride", "TRIGLYCERIDE");
        m.put("hdl", "HDL_C");
        m.put("ldl", "LDL_C");
        // Cardiac
        m.put("troponin", "TROPONIN_T_HS");
        m.put("tnths", "TROPONIN_T_HS");
        m.put("tnt", "TROPONIN_T_HS");
        // Electrolyte
        m.put("kali", "POTASSIUM");
        m.put("potassium", "POTASSIUM");
        m.put("k+", "POTASSIUM");
        // Inflammation
        m.put("crp", "CRP_HS");
        m.put("c reactive", "CRP_HS");
        // Hematology
        m.put("wbc", "WBC");
        m.put("bach cau", "WBC");
        m.put("bạch cầu", "WBC");
        m.put("leukocyte", "WBC");
        m.put("neutrophil", "NEUTROPHIL_PCT");
        m.put("neu%", "NEUTROPHIL_PCT");
        m.put("neu ", "NEUTROPHIL_PCT");
        m.put("rbc", "RBC");
        m.put("hong cau", "RBC");
        m.put("erythrocyte", "RBC");
        m.put("hemoglobin", "HEMOGLOBIN");
        m.put("hgb", "HEMOGLOBIN");
        m.put("huyet sac to", "HEMOGLOBIN");
        m.put("tieu cau", "PLATELETS");
        m.put("plt", "PLATELETS");
        m.put("platelet", "PLATELETS");
        INDICATOR_ALIASES = Collections.unmodifiableMap(m);
    }
}
