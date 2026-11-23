package com.mediassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.clinical.DrugAllergyConflictDto;
import com.mediassist.dto.clinical.DrugInteractionDto;
import com.mediassist.dto.clinical.Icd10DiagnosisDto;
import com.mediassist.dto.clinical.LabIndicatorDto;
import com.mediassist.dto.clinical.News2ScoreDto;
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
                        Double min = node.has("refRangeMin") && !node.path("refRangeMin").isNull() ? node.path("refRangeMin").asDouble() : null;
                        Double max = node.has("refRangeMax") && !node.path("refRangeMax").isNull() ? node.path("refRangeMax").asDouble() : null;
                        String text = node.path("refRangeText").asText("");
                        String rel = node.path("clinicalRelevance").asText("");
                        String spec = node.path("targetSpecialty").asText("");
                        Double critLow = node.has("criticalLow") && !node.path("criticalLow").isNull() ? node.path("criticalLow").asDouble() : null;
                        Double critHigh = node.has("criticalHigh") && !node.path("criticalHigh").isNull() ? node.path("criticalHigh").asDouble() : null;

                        LabIndicatorDto dto = new LabIndicatorDto(
                                id, loincCode, nameVi, nameEn, category, unit, min, max, text, rel, spec, critLow, critHigh
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
     * Evaluates a quantitative lab value against reference range and critical panic thresholds.
     *
     * @param indicator Standardized LabIndicatorDto
     * @param value     Measured numeric lab result
     * @return Status string: "CRITICAL_PANIC", "ELEVATED", "LOW", "NORMAL", or "UNKNOWN"
     */
    public String evaluateIndicatorStatus(LabIndicatorDto indicator, Double value) {
        if (indicator == null || value == null) {
            return "UNKNOWN";
        }
        if (indicator.getCriticalLow() != null && value < indicator.getCriticalLow()) {
            return "CRITICAL_PANIC";
        }
        if (indicator.getCriticalHigh() != null && value > indicator.getCriticalHigh()) {
            return "CRITICAL_PANIC";
        }
        if (indicator.getRefRangeMax() != null && value > indicator.getRefRangeMax()) {
            return "ELEVATED";
        }
        if (indicator.getRefRangeMin() != null && value < indicator.getRefRangeMin()) {
            return "LOW";
        }
        return "NORMAL";
    }

    /**
     * Evaluates a lab indicator status by LOINC code, ID, or fuzzy match name.
     */
    public String evaluateIndicatorStatus(String indicatorIdOrLoinc, Double value) {
        if (indicatorIdOrLoinc == null || value == null) {
            return "UNKNOWN";
        }
        Optional<LabIndicatorDto> dto = getLabIndicatorByLoinc(indicatorIdOrLoinc);
        if (dto.isEmpty()) {
            dto = getLabIndicatorById(indicatorIdOrLoinc);
        }
        if (dto.isEmpty()) {
            dto = fuzzyMatchIndicator(indicatorIdOrLoinc);
        }
        return dto.map(d -> evaluateIndicatorStatus(d, value)).orElse("UNKNOWN");
    }

    /**
     * Calculates the Royal College of Physicians (RCP) National Early Warning Score 2 (NEWS-2).
     *
     * @param respRate       Respiration rate (breaths per minute)
     * @param spO2           Oxygen saturation (SpO2 %) on room air
     * @param systolicBp     Systolic blood pressure (mmHg), null-safe
     * @param heartRate      Pulse / heart rate (beats per minute)
     * @param consciousness  ACVPU scale (Alert, Confusion, Voice, Pain, Unresponsive)
     * @param temp           Body temperature (°C)
     * @return News2ScoreDto containing total score (0-20), risk level (LOW, MEDIUM, HIGH),
     *         clinical guidance, and detailed sub-scores.
     */
    public News2ScoreDto calculateNews2Score(int respRate, int spO2, Integer systolicBp,
                                             int heartRate, String consciousness, double temp) {
        // 1. Respiration Rate (breaths/min)
        int respScore;
        if (respRate <= 8) {
            respScore = 3;
        } else if (respRate <= 11) {
            respScore = 1;
        } else if (respRate <= 20) {
            respScore = 0;
        } else if (respRate <= 24) {
            respScore = 2;
        } else {
            respScore = 3;
        }

        // 2. SpO2 (%) - Scale 1
        int spO2Score;
        if (spO2 <= 91) {
            spO2Score = 3;
        } else if (spO2 <= 93) {
            spO2Score = 2;
        } else if (spO2 <= 95) {
            spO2Score = 1;
        } else {
            spO2Score = 0;
        }

        // 3. Systolic Blood Pressure (mmHg)
        int bpScore;
        if (systolicBp == null) {
            bpScore = 0;
        } else if (systolicBp <= 90) {
            bpScore = 3;
        } else if (systolicBp <= 100) {
            bpScore = 2;
        } else if (systolicBp <= 110) {
            bpScore = 1;
        } else if (systolicBp <= 219) {
            bpScore = 0;
        } else {
            bpScore = 3;
        }

        // 4. Heart Rate / Pulse (bpm)
        int hrScore;
        if (heartRate <= 40) {
            hrScore = 3;
        } else if (heartRate <= 50) {
            hrScore = 1;
        } else if (heartRate <= 90) {
            hrScore = 0;
        } else if (heartRate <= 110) {
            hrScore = 1;
        } else if (heartRate <= 130) {
            hrScore = 2;
        } else {
            hrScore = 3;
        }

        // 5. Consciousness (ACVPU: Alert=0, C/V/P/U=3)
        int consScore = 0;
        if (consciousness != null && !consciousness.isBlank()) {
            String cNorm = normalize(consciousness);
            if (cNorm.equals("a") || cNorm.equals("alert") || cNorm.contains("tinh") || cNorm.equals("normal")) {
                consScore = 0;
            } else {
                consScore = 3;
            }
        }

        // 6. Body Temperature (°C)
        int tempScore;
        if (temp <= 35.0) {
            tempScore = 3;
        } else if (temp <= 36.0) {
            tempScore = 1;
        } else if (temp <= 38.0) {
            tempScore = 0;
        } else if (temp <= 39.0) {
            tempScore = 1;
        } else {
            tempScore = 2;
        }

        int totalScore = respScore + spO2Score + bpScore + hrScore + consScore + tempScore;
        boolean singleScoreThree = (respScore == 3 || spO2Score == 3 || bpScore == 3 || hrScore == 3 || consScore == 3 || tempScore == 3);

        String riskLevel;
        String clinicalGuidance;
        if (totalScore >= 7) {
            riskLevel = "HIGH";
            clinicalGuidance = "Báo động cấp cứu khẩn cấp (Code Blue/Cấp cứu ICU): Bác sĩ hồi sức cấp cứu (ICU) cần thăm khám và can thiệp ngay lập tức. Theo dõi sinh hiệu liên tục. Xem xét chỉ định chuyển ICU/HDU.";
        } else if (totalScore >= 5 || singleScoreThree) {
            riskLevel = "MEDIUM";
            clinicalGuidance = "Cảnh báo khẩn cấp tại khoa điều trị: Bác sĩ điều trị hoặc đội phản ứng nhanh nội viện cần thăm khám trong vòng 30-60 phút. Theo dõi sinh hiệu tối thiểu 1 giờ/lần. Chuẩn bị phương án leo thang điều trị.";
        } else {
            riskLevel = "LOW";
            clinicalGuidance = "Theo dõi lâm sàng thường quy: Điều dưỡng theo dõi sinh hiệu định kỳ 4-6 giờ/lần tại buồng bệnh. Báo bác sĩ khi có biến chuyển xấu.";
        }

        Map<String, Integer> subScores = new LinkedHashMap<>();
        subScores.put("respRate", respScore);
        subScores.put("spO2", spO2Score);
        subScores.put("systolicBp", bpScore);
        subScores.put("heartRate", hrScore);
        subScores.put("consciousness", consScore);
        subScores.put("temperature", tempScore);

        return new News2ScoreDto(totalScore, riskLevel, clinicalGuidance, singleScoreThree, subScores);
    }

    /**
     * Checks a list of prescribed medications for major drug-drug interactions (DDI).
     *
     * @param drugNames List of drug names (brand or active ingredient)
     * @return List of identified drug interaction alerts
     */
    public List<DrugInteractionDto> checkDrugInteractions(List<String> drugNames) {
        if (drugNames == null || drugNames.size() < 2) {
            return Collections.emptyList();
        }

        List<DrugInteractionDto> interactions = new ArrayList<>();

        // 1. Warfarin + Aspirin / NSAID
        String dWarfarin = findMatchingDrug(drugNames, WARFARIN_KEYWORDS);
        String dNsaid = findMatchingDrug(drugNames, NSAID_KEYWORDS);
        if (dWarfarin != null && dNsaid != null && !dWarfarin.equalsIgnoreCase(dNsaid)) {
            interactions.add(new DrugInteractionDto(
                    dWarfarin, dNsaid, "MAJOR", "BLEEDING_RISK",
                    "Tương tác chống đông & NSAID/Aspirin: Phối hợp Warfarin với Aspirin hoặc NSAID làm tăng nguy cơ xuất huyết tiêu hóa nặng và chảy máu lớn gấp 3-5 lần.",
                    "Tránh phối hợp nếu không có chỉ định tim mạch chuyên biệt (cần theo dõi sát INR và bổ sung PPI bảo vệ niêm mạc dạ dày)."
            ));
        }

        // 2. Clopidogrel + Omeprazole / Esomeprazole
        String dClopidogrel = findMatchingDrug(drugNames, CLOPIDOGREL_KEYWORDS);
        String dPpi = findMatchingDrug(drugNames, OMEPRAZOLE_KEYWORDS);
        if (dClopidogrel != null && dPpi != null) {
            interactions.add(new DrugInteractionDto(
                    dClopidogrel, dPpi, "MAJOR", "CYP2C19_INHIBITION",
                    "Ức chế men CYP2C19: Omeprazole/Esomeprazole ức chế cạnh tranh men CYP2C19, làm giảm chuyển hóa Clopidogrel thành dạng hoạt tính sinh học, giảm hiệu lực chống kết tập tiểu cầu và tăng nguy cơ biến cố huyết khối tái phát.",
                    "Khuyến cáo thay thế bằng Pantoprazole hoặc Rabeprazole (ít ức chế CYP2C19 hơn) khi cần bảo vệ dạ dày cho bệnh nhân dùng Clopidogrel."
            ));
        }

        // 3. Simvastatin / Atorvastatin + Clarithromycin / Erythromycin
        String dStatin = findMatchingDrug(drugNames, STATIN_KEYWORDS);
        String dMacrolide = findMatchingDrug(drugNames, MACROLIDE_KEYWORDS);
        if (dStatin != null && dMacrolide != null) {
            interactions.add(new DrugInteractionDto(
                    dStatin, dMacrolide, "CONTRAINDICATED", "RHABDOMYOLYSIS_RISK",
                    "Ức chế mạnh CYP3A4 gây tăng nồng độ Statin: Clarithromycin/Erythromycin ức chế mạnh CYP3A4, làm nồng độ Simvastatin/Atorvastatin trong máu tăng đột biến, dẫn đến nguy cơ tiêu cơ vân cấp (Rhabdomyolysis) và suy thận cấp.",
                    "Chống chỉ định phối hợp. Tạm ngừng Statin trong thời gian dùng Clarithromycin hoặc chuyển sang Statin ít phụ thuộc CYP3A4 (Rosuvastatin, Pravastatin liều thấp)."
            ));
        }

        // 4. ACEi / ARB + Spironolactone
        String dAcei = findMatchingDrug(drugNames, ACEI_ARB_KEYWORDS);
        String dSpiro = findMatchingDrug(drugNames, SPIRONOLACTONE_KEYWORDS);
        if (dAcei != null && dSpiro != null) {
            interactions.add(new DrugInteractionDto(
                    dAcei, dSpiro, "MAJOR", "HYPERKALEMIA_RISK",
                    "Nguy cơ tăng Kali máu nặng: Cả ACEi/ARB và Spironolactone đều giữ kali qua cơ chế ức chế trục RAA, phối hợp làm tăng nguy cơ tăng kali máu nghiêm trọng (> 6.0 mmol/L) đe dọa ngừng tim.",
                    "Theo dõi định kỳ nồng độ Kali máu và Creatinine (sau 1 tuần, 1 tháng và mỗi 3 tháng). Cảnh báo bệnh nhân triệu chứng loạn nhịp tim hoặc yếu cơ."
            ));
        }

        // 5. Metformin + Contrast dye
        String dMetformin = findMatchingDrug(drugNames, METFORMIN_KEYWORDS);
        String dContrast = findMatchingDrug(drugNames, CONTRAST_DYE_KEYWORDS);
        if (dMetformin != null && dContrast != null) {
            interactions.add(new DrugInteractionDto(
                    dMetformin, dContrast, "MAJOR", "LACTIC_ACIDOSIS_RISK",
                    "Nhiễm toan Lactic do suy giảm chức năng thận cấp: Thuốc cản quang tiêm mạch có thể gây suy thận cấp, làm tích lũy Metformin và tăng nguy cơ nhiễm toan lactic nguy kịch (tỷ lệ tử vong đến 50%).",
                    "Tạm ngưng Metformin 48 giờ trước và ít nhất 48 giờ sau khi chụp có tiêm thuốc cản quang. Chỉ dùng lại sau khi kiểm tra chức năng thận bình thường."
            ));
        }

        // 6. Methotrexate + NSAID
        String dMtx = findMatchingDrug(drugNames, METHOTREXATE_KEYWORDS);
        if (dMtx != null && dNsaid != null && !dMtx.equalsIgnoreCase(dNsaid)) {
            interactions.add(new DrugInteractionDto(
                    dMtx, dNsaid, "MAJOR", "METHOTREXATE_TOXICITY",
                    "Giảm thải trừ Methotrexate qua ống thận: NSAID làm tăng nồng độ và độc tính của Methotrexate trên tủy xương và hệ tiêu hóa.",
                    "Tránh dùng NSAID cùng Methotrexate liều cao; theo dõi chặt chẽ công thức máu nếu dùng liều thấp trong viêm khớp dạng thấp."
            ));
        }

        // 7. Sildenafil / PDE5 + Nitrates
        String dPde5 = findMatchingDrug(drugNames, PDE5_KEYWORDS);
        String dNitrate = findMatchingDrug(drugNames, NITRATE_KEYWORDS);
        if (dPde5 != null && dNitrate != null) {
            interactions.add(new DrugInteractionDto(
                    dPde5, dNitrate, "CONTRAINDICATED", "FATAL_HYPOTENSION",
                    "Tụt huyết áp nguy kịch đe dọa tính mạng: Ức chế PDE5 kết hợp cùng dẫn xuất Nitrate gây giãn mạch toàn thể nghiêm trọng, trụy mạch và tử vong.",
                    "Tuyệt đối chống chỉ định phối hợp thuốc ức chế PDE5 với các nitrate hữu cơ."
            ));
        }

        return interactions;
    }

    /**
     * Cross-checks a list of drugs against patient drug allergy history,
     * mapping active ingredients to drug classes and flagging cross-reactivity risks.
     *
     * @param drugNames    Prescribed medications
     * @param allergyText  Patient's stated allergy history (e.g., "Dị ứng Penicillin, Aspirin")
     * @return List of identified allergy conflicts and cross-reactivity warnings
     */
    public List<DrugAllergyConflictDto> checkDrugAllergyConflict(List<String> drugNames, String allergyText) {
        if (drugNames == null || drugNames.isEmpty() || allergyText == null || allergyText.isBlank()) {
            return Collections.emptyList();
        }

        String normAllergy = normalize(allergyText);
        List<DrugAllergyConflictDto> conflicts = new ArrayList<>();

        for (String drug : drugNames) {
            if (drug == null || drug.isBlank()) continue;
            String normDrug = normalizeDrug(drug);

            // 1. Penicillin / Beta-lactam
            boolean allergyHasPenicillin = normAllergy.contains("penicillin") || normAllergy.contains("penicilin")
                    || normAllergy.contains("beta lactam") || normAllergy.contains("betalactam")
                    || normAllergy.contains("amoxicillin") || normAllergy.contains("augmentin")
                    || normAllergy.contains("ampicillin");

            boolean drugIsPenicillin = containsAny(normDrug, PENICILLIN_KEYWORDS);
            boolean drugIsCephalosporin = containsAny(normDrug, CEPHALOSPORIN_KEYWORDS);

            if (allergyHasPenicillin && drugIsPenicillin) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Amoxicillin / Penicillin / Beta-lactam",
                        "Penicillin / Beta-lactam", allergyText.trim(), "CRITICAL",
                        String.format("Bệnh nhân có tiền sử dị ứng nhóm Penicillin/Beta-lactam ('%s'). Thuốc '%s' chứa hoạt chất thuộc nhóm này, nguy cơ cao sốc phản vệ đe dọa tính mạng.",
                                allergyText.trim(), drug)
                ));
            } else if (allergyHasPenicillin && drugIsCephalosporin) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Cephalosporin",
                        "Cephalosporin (Dị ứng chéo Beta-lactam)", allergyText.trim(), "HIGH",
                        String.format("Bệnh nhân có tiền sử dị ứng Penicillin ('%s'). Thuốc '%s' thuộc nhóm Cephalosporin có nguy cơ dị ứng chéo (khoảng 3-10%%). Cần thận trọng và sẵn sàng cấp cứu phản vệ.",
                                allergyText.trim(), drug)
                ));
            }

            // 2. NSAID / Aspirin
            boolean allergyHasNsaid = normAllergy.contains("nsaid") || normAllergy.contains("aspirin")
                    || normAllergy.contains("ibuprofen") || normAllergy.contains("khang viem")
                    || normAllergy.contains("giam dau") || normAllergy.contains("diclofenac");
            boolean drugIsNsaid = containsAny(normDrug, NSAID_KEYWORDS);

            if (allergyHasNsaid && drugIsNsaid) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "NSAID / Aspirin",
                        "NSAID (Kháng viêm không steroid)", allergyText.trim(), "CRITICAL",
                        String.format("Bệnh nhân có tiền sử dị ứng NSAID/Aspirin ('%s'). Thuốc '%s' thuộc nhóm NSAID, có nguy cơ co thắt phế quản, hen suyễn cấp, phù mạch hoặc phản vệ.",
                                allergyText.trim(), drug)
                ));
            }

            // 3. Sulfonamide / Sulfa
            boolean allergyHasSulfa = normAllergy.contains("sulfa") || normAllergy.contains("sulfonamide")
                    || normAllergy.contains("bactrim") || normAllergy.contains("biseptol");
            boolean drugIsSulfa = containsAny(normDrug, SULFA_KEYWORDS);

            if (allergyHasSulfa && drugIsSulfa) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Sulfonamide",
                        "Sulfonamide", allergyText.trim(), "CRITICAL",
                        String.format("Bệnh nhân có tiền sử dị ứng Sulfonamide ('%s'). Thuốc '%s' chứa Sulfonamide, nguy cơ hội chứng hoại tử thượng bì nhiễm độc (TEN/SJS).",
                                allergyText.trim(), drug)
                ));
            }

            // 4. Macrolide
            boolean allergyHasMacrolide = normAllergy.contains("macrolide") || normAllergy.contains("clarithromycin")
                    || normAllergy.contains("azithromycin") || normAllergy.contains("erythromycin");
            boolean drugIsMacrolide = containsAny(normDrug, MACROLIDE_ALL_KEYWORDS);

            if (allergyHasMacrolide && drugIsMacrolide) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Macrolide",
                        "Macrolide", allergyText.trim(), "HIGH",
                        String.format("Bệnh nhân có tiền sử dị ứng kháng sinh nhóm Macrolide ('%s'). Thuốc '%s' thuộc nhóm Macrolide.",
                                allergyText.trim(), drug)
                ));
            }

            // 5. Quinolone / Fluoroquinolone
            boolean allergyHasQuinolone = normAllergy.contains("quinolone") || normAllergy.contains("ciprofloxacin")
                    || normAllergy.contains("levofloxacin");
            boolean drugIsQuinolone = containsAny(normDrug, QUINOLONE_KEYWORDS);

            if (allergyHasQuinolone && drugIsQuinolone) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Fluoroquinolone",
                        "Fluoroquinolone", allergyText.trim(), "HIGH",
                        String.format("Bệnh nhân có tiền sử dị ứng nhóm Quinolone ('%s'). Thuốc '%s' thuộc nhóm Fluoroquinolone.",
                                allergyText.trim(), drug)
                ));
            }

            // 6. Opioid
            boolean allergyHasOpioid = normAllergy.contains("opioid") || normAllergy.contains("morphine")
                    || normAllergy.contains("codeine") || normAllergy.contains("tramadol");
            boolean drugIsOpioid = containsAny(normDrug, OPIOID_KEYWORDS);

            if (allergyHasOpioid && drugIsOpioid) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Opioid",
                        "Opioid", allergyText.trim(), "HIGH",
                        String.format("Bệnh nhân có tiền sử dị ứng thuốc giảm đau Opioid ('%s'). Thuốc '%s' thuộc nhóm Opioid.",
                                allergyText.trim(), drug)
                ));
            }

            // 7. Paracetamol
            boolean allergyHasParacetamol = normAllergy.contains("paracetamol") || normAllergy.contains("acetaminophen")
                    || normAllergy.contains("panadol") || normAllergy.contains("efferalgan");
            boolean drugIsParacetamol = containsAny(normDrug, PARACETAMOL_KEYWORDS);

            if (allergyHasParacetamol && drugIsParacetamol) {
                conflicts.add(new DrugAllergyConflictDto(
                        drug, "Paracetamol",
                        "Paracetamol / Acetaminophen", allergyText.trim(), "HIGH",
                        String.format("Bệnh nhân có tiền sử dị ứng Paracetamol ('%s'). Thuốc '%s' chứa hoạt chất Paracetamol.",
                                allergyText.trim(), drug)
                ));
            }
        }

        return conflicts;
    }

    private static String findMatchingDrug(List<String> drugNames, Set<String> keywords) {
        if (drugNames == null) return null;
        for (String drug : drugNames) {
            String norm = normalizeDrug(drug);
            for (String kw : keywords) {
                if (norm.contains(kw)) {
                    return drug;
                }
            }
        }
        return null;
    }

    private static boolean containsAny(String text, Set<String> keywords) {
        if (text == null || keywords == null) return false;
        for (String kw : keywords) {
            if (text.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeDrug(String input) {
        if (input == null) return "";
        return normalize(input).replaceAll("[0-9]+(\\.[0-9]+)?\\s*(mg|g|ml|mcg|iu|ui|vien)?", "").trim();
    }

    private static final Set<String> WARFARIN_KEYWORDS = Set.of("warfarin", "coumadin", "sintrom", "acenocoumarol");
    private static final Set<String> NSAID_KEYWORDS = Set.of(
            "aspirin", "acetylsalicylic", "aspilets", "ibuprofen", "naproxen",
            "diclofenac", "voltaren", "meloxicam", "mobic", "celecoxib", "celebrex",
            "ketorolac", "piroxicam", "indomethacin"
    );
    private static final Set<String> CLOPIDOGREL_KEYWORDS = Set.of("clopidogrel", "plavix");
    private static final Set<String> OMEPRAZOLE_KEYWORDS = Set.of("omeprazole", "losec", "esomeprazole", "nexium");
    private static final Set<String> STATIN_KEYWORDS = Set.of("simvastatin", "zocor", "atorvastatin", "lipitor", "lovastatin");
    private static final Set<String> MACROLIDE_KEYWORDS = Set.of("clarithromycin", "klacid", "erythromycin");
    private static final Set<String> MACROLIDE_ALL_KEYWORDS = Set.of("clarithromycin", "klacid", "erythromycin", "azithromycin", "zithromax", "roxythromycin");
    private static final Set<String> ACEI_ARB_KEYWORDS = Set.of(
            "enalapril", "lisinopril", "captopril", "ramipril", "perindopril", "coversyl",
            "losartan", "valsartan", "telmisartan", "irbesartan"
    );
    private static final Set<String> SPIRONOLACTONE_KEYWORDS = Set.of("spironolactone", "aldactone", "eplerenone", "amiloride");
    private static final Set<String> METFORMIN_KEYWORDS = Set.of("metformin", "glucophage");
    private static final Set<String> CONTRAST_DYE_KEYWORDS = Set.of("contrast", "can quang", "thuoc can quang", "iopamidol", "iohexol", "iomeprol", "iopromide");
    private static final Set<String> METHOTREXATE_KEYWORDS = Set.of("methotrexate");
    private static final Set<String> PDE5_KEYWORDS = Set.of("sildenafil", "viagra", "tadalafil", "cialis");
    private static final Set<String> NITRATE_KEYWORDS = Set.of("nitroglycerin", "isosorbide", "mononitrate", "dinitrate", "nitromint");
    private static final Set<String> PENICILLIN_KEYWORDS = Set.of(
            "amoxicillin", "augmentin", "ampicillin", "penicillin", "clavamox",
            "unasyn", "piperacillin", "tazobactam", "oxacillin", "cloxacillin", "amox"
    );
    private static final Set<String> CEPHALOSPORIN_KEYWORDS = Set.of(
            "cefalexin", "cephalexin", "cefuroxime", "ceftriaxone", "cefixime", "cefotaxime",
            "cefazolin", "zinnat", "rocephin"
    );
    private static final Set<String> SULFA_KEYWORDS = Set.of("bactrim", "sulfamethoxazole", "trimethoprim", "cotrimoxazole", "sulfasalazine", "biseptol");
    private static final Set<String> QUINOLONE_KEYWORDS = Set.of("ciprofloxacin", "cipro", "levofloxacin", "levaquin", "moxifloxacin", "avelox", "ofloxacin");
    private static final Set<String> OPIOID_KEYWORDS = Set.of("morphine", "codeine", "fentanyl", "tramadol", "oxycodone");
    private static final Set<String> PARACETAMOL_KEYWORDS = Set.of("paracetamol", "acetaminophen", "panadol", "efferalgan", "hapacol");

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
        m.put("natri", "SODIUM");
        m.put("sodium", "SODIUM");
        m.put("na+", "SODIUM");
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
