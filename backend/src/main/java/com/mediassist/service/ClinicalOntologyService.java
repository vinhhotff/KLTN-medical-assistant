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
}
