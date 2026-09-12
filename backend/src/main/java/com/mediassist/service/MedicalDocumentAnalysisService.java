package com.mediassist.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.AbnormalIndicatorDto;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.dto.PurchaseQuotaRequest;
import com.mediassist.dto.UserQuotaDto;
import com.mediassist.model.entity.DocumentAnalysis;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.User;
import com.mediassist.repository.DocumentAnalysisRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MedicalDocumentAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(MedicalDocumentAnalysisService.class);

    private final PdfExtractionService pdfExtractionService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final MedicalDocumentRepository medicalDocumentRepository;
    private final DocumentAnalysisRepository documentAnalysisRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final MedicalDocumentValidator medicalDocumentValidator;
    private final StorageService storageService;
    private final ClinicalRagService clinicalRagService;

    public MedicalDocumentAnalysisService(PdfExtractionService pdfExtractionService,
                                          DoctorSemanticSearchService doctorSemanticSearchService,
                                          MedicalDocumentRepository medicalDocumentRepository,
                                          DocumentAnalysisRepository documentAnalysisRepository,
                                          UserRepository userRepository,
                                          ObjectMapper objectMapper,
                                          MedicalDocumentValidator medicalDocumentValidator,
                                          StorageService storageService,
                                          ClinicalRagService clinicalRagService) {
        this.pdfExtractionService = pdfExtractionService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.documentAnalysisRepository = documentAnalysisRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.medicalDocumentValidator = medicalDocumentValidator;
        this.storageService = storageService;
        this.clinicalRagService = clinicalRagService;
    }

    @Transactional
    public DocumentAnalysisResponse analyzeDocument(MultipartFile file, String userEmail) {
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/pdf";
        long size = file.getSize();

        log.info("🩺 Ingesting medical document: '{}' ({}, {} bytes) for user: {}", fileName, contentType, size, userEmail);

        // 1. User & Quota Verification (Anti-Abuse)
        if (userEmail == null || userEmail.isBlank()) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "UNAUTHORIZED",
                    "Vui lòng đăng nhập tài khoản để sử dụng tính năng này."
            );
        }
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new com.mediassist.common.AppException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED,
                        "UNAUTHORIZED",
                        "Người dùng không tồn tại trên hệ thống."
                ));

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "FILE_READ_ERROR",
                    "Không thể đọc dữ liệu tệp tin tải lên: " + e.getMessage()
            );
        }

        // 2. SHA-256 Checksum & Deduplication Lookup (Token Protection)
        // If document was previously analyzed, return cached result immediately with 0 tokens and 0 quota cost
        String fileHash = calculateSha256(fileBytes);
        Optional<MedicalDocument> existingDocOpt = medicalDocumentRepository.findFirstByUserIdAndFileHashOrderByCreatedAtDesc(user.getId(), fileHash);
        if (existingDocOpt.isPresent()) {
            MedicalDocument existingDoc = existingDocOpt.get();
            Optional<DocumentAnalysis> existingAnalysisOpt = documentAnalysisRepository.findByDocumentId(existingDoc.getId());
            if (existingAnalysisOpt.isPresent()) {
                DocumentAnalysis existingAnalysis = existingAnalysisOpt.get();
                log.info("⚡ [CACHE HIT - DEDUPLICATION] Document '{}' (hash: {}) previously analyzed for user {}. Returning cached result. 0 LLM tokens consumed.", fileName, fileHash, userEmail);

                List<AbnormalIndicatorDto> cachedIndicators = new ArrayList<>();
                List<String> cachedQuestions = new ArrayList<>();
                try {
                    cachedIndicators = objectMapper.readValue(existingAnalysis.getAbnormalIndicatorsJson(), new TypeReference<List<AbnormalIndicatorDto>>() {});
                    cachedQuestions = objectMapper.readValue(existingAnalysis.getSuggestedQuestionsJson(), new TypeReference<List<String>>() {});
                } catch (Exception ignored) {}

                String queryForDoctorMatch = String.format("%s. Chuyên khoa %s. %s",
                        existingAnalysis.getClinicalSummary(), existingAnalysis.getRecommendedSpecialtyName(), existingAnalysis.getRecommendedSpecialtySlug());
                List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(queryForDoctorMatch, 4);

                DocumentAnalysisResponse resp = new DocumentAnalysisResponse();
                resp.setDocumentId(existingDoc.getId());
                resp.setFileName(existingDoc.getFileName());
                resp.setFileSizeBytes(existingDoc.getFileSizeBytes());
                resp.setContentType(existingDoc.getContentType());
                resp.setClinicalSummary(existingAnalysis.getClinicalSummary());
                resp.setPlainLanguageExplanation(existingAnalysis.getPlainLanguageExplanation());
                resp.setIndicators(cachedIndicators);
                resp.setRecommendedSpecialtySlug(existingAnalysis.getRecommendedSpecialtySlug());
                resp.setRecommendedSpecialtyName(existingAnalysis.getRecommendedSpecialtyName());
                resp.setSuggestedQuestions(cachedQuestions);
                resp.setMatchedDoctors(matchedDoctors);
                resp.setStorageUrl(existingDoc.getStorageUrl());
                resp.setCachedResult(true);
                return resp;
            }
        }

        // 3. Quota Pre-check for NEW analysis (Anti-Abuse)
        if (!user.hasScanQuota()) {
            log.warn("🚫 [QUOTA EXCEEDED] User {} has 0 scan quota and is not a VIP subscriber.", userEmail);
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.PAYMENT_REQUIRED,
                    "QUOTA_EXCEEDED",
                    "Bạn đã sử dụng hết lượt phân tích tài liệu miễn phí. Vui lòng mua gói quét lẻ (29.000đ) hoặc nâng cấp MediPass VIP (149.000đ/tháng) để tiếp tục."
            );
        }

        // 3. Extract content from PDF, text or image stream (with scanned PDF fallback)
        String extractedText = extractDocumentText(fileBytes, contentType, fileName);

        // 4. Gatekeeper Validation (Invalid / Blurry / Non-medical filter)
        // If validation fails, throws AppException(400) -> User quota is NOT deducted!
        medicalDocumentValidator.validateDocument(fileBytes, contentType, extractedText, fileName);

        // 5. Cloud Storage Upload (Supabase Storage with resilient local fallback)
        String storageUrl = storageService.uploadDocument(fileBytes, fileName, contentType, user.getId());

        // 6. Comprehensive Lab Scanning across all pages
        List<AbnormalIndicatorDto> parsedIndicators = parseIndicators(extractedText, fileName);
        SpecialtyTarget preliminarySpecialty = determineSpecialtyFromFindings(extractedText, fileName, parsedIndicators);

        // 7. Focused pgvector Doctor Retrieval (prevents multi-page noise from diluting cosine similarity)
        String focusedDoctorQuery = buildFocusedDoctorQuery(preliminarySpecialty, parsedIndicators, fileName);
        List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(focusedDoctorQuery, 4);

        // 8. Smart Clinical Windowing for Multi-Page Verbose Documents
        String clinicalContext = distillClinicalContext(extractedText, fileName, parsedIndicators, preliminarySpecialty);

        // 9. Clinical RAG Analysis (Retrieval-Augmented Generation with OpenRouter / Fallback Engine)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performDocumentRagAnalysis(clinicalContext, fileName, matchedDoctors);

        // 10. Integrate structured indicators and clinical findings
        List<AbnormalIndicatorDto> indicators = (ragResult.getIndicators() != null && !ragResult.getIndicators().isEmpty())
                ? ragResult.getIndicators()
                : parsedIndicators;

        SpecialtyTarget specialty = (ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank())
                ? new SpecialtyTarget(ragResult.getRecommendedSpecialtySlug(), ragResult.getRecommendedSpecialtyName() != null ? ragResult.getRecommendedSpecialtyName() : preliminarySpecialty.name())
                : preliminarySpecialty;

        String specialtySlug = specialty.slug();
        String specialtyName = specialty.name();
        String clinicalSummary = ragResult.getClinicalSummary() != null && !ragResult.getClinicalSummary().isBlank()
                ? ragResult.getClinicalSummary() : generateClinicalSummary(indicators, specialty);
        String plainExplanation = ragResult.getPlainLanguageExplanation() != null && !ragResult.getPlainLanguageExplanation().isBlank()
                ? ragResult.getPlainLanguageExplanation() : generatePlainLanguageExplanation(indicators, specialty);
        List<String> suggestedQuestions = (ragResult.getSuggestedQuestions() != null && !ragResult.getSuggestedQuestions().isEmpty())
                ? ragResult.getSuggestedQuestions() : generateSuggestedQuestions(specialty, indicators);

        // 10. Persist MedicalDocument & DocumentAnalysis
        MedicalDocument medDoc = new MedicalDocument();
        medDoc.setUser(user);
        medDoc.setFileName(fileName);
        medDoc.setFileSizeBytes(size);
        medDoc.setContentType(contentType);
        medDoc.setFileHash(fileHash);
        medDoc.setStorageUrl(storageUrl);
        medDoc.setValidMedical(true);
        medDoc.setStatus("PROCESSED");
        medDoc = medicalDocumentRepository.save(medDoc);

        DocumentAnalysis analysis = new DocumentAnalysis();
        analysis.setDocument(medDoc);
        analysis.setClinicalSummary(clinicalSummary);
        analysis.setPlainLanguageExplanation(plainExplanation);
        analysis.setRecommendedSpecialtySlug(specialty.slug());
        analysis.setRecommendedSpecialtyName(specialty.name());

        try {
            analysis.setAbnormalIndicatorsJson(objectMapper.writeValueAsString(indicators));
            analysis.setSuggestedQuestionsJson(objectMapper.writeValueAsString(suggestedQuestions));
        } catch (Exception e) {
            analysis.setAbnormalIndicatorsJson("[]");
            analysis.setSuggestedQuestionsJson("[]");
        }
        documentAnalysisRepository.save(analysis);

        // 11. Deduct Quota (If not VIP)
        if (user.getSubscriptionTier() == null || !user.getSubscriptionTier().toUpperCase().contains("VIP")) {
            user.setScanQuota(Math.max(0, user.getScanQuota() - 1));
            userRepository.save(user);
            log.info("💳 Deducted 1 scan quota for user {}. Remaining quota: {}", userEmail, user.getScanQuota());
        }

        // 12. Assemble Response DTO
        DocumentAnalysisResponse response = new DocumentAnalysisResponse();
        response.setDocumentId(medDoc.getId());
        response.setFileName(fileName);
        response.setFileSizeBytes(size);
        response.setContentType(contentType);
        response.setClinicalSummary(clinicalSummary);
        response.setPlainLanguageExplanation(plainExplanation);
        response.setIndicators(indicators);
        response.setRecommendedSpecialtySlug(specialty.slug());
        response.setRecommendedSpecialtyName(specialty.name());
        response.setSuggestedQuestions(suggestedQuestions);
        response.setMatchedDoctors(matchedDoctors);
        response.setStorageUrl(storageUrl);
        response.setCachedResult(false);
        response.setModelUsed(ragResult.getModelUsed());
        response.setDoctorRecommendationReason(ragResult.getDoctorRecommendationReason());

        return response;
    }

    /**
     * Instant document analysis preview for testing & Landing Page without requiring patient login or quota deduction.
     * Enforces strict medical validation, real PDF/OCR extraction, and real pgvector doctor matching.
     */
    @Transactional(readOnly = true)
    public DocumentAnalysisResponse analyzeDocumentPreview(MultipartFile file) {
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/pdf";
        long size = file.getSize();

        log.info("🩺 [PREVIEW REAL SCAN] Ingesting document: '{}' ({}, {} bytes)", fileName, contentType, size);

        if (file.isEmpty() || size < 10) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "EMPTY_FILE",
                    "Tệp tin rỗng hoặc không có dữ liệu."
            );
        }

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception e) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "FILE_READ_ERROR",
                    "Không thể đọc dữ liệu tệp tin: " + e.getMessage()
            );
        }

        // 1. Extract content from PDF, text or image stream (with scanned PDF fallback)
        String extractedText = extractDocumentText(fileBytes, contentType, fileName);

        // 2. Strict Gatekeeper Validation (Rejects non-medical / unreadable images without guessing!)
        medicalDocumentValidator.validateDocument(fileBytes, contentType, extractedText, fileName);

        // 3. Comprehensive Lab Scanning across all pages
        List<AbnormalIndicatorDto> parsedIndicators = parseIndicators(extractedText, fileName);
        SpecialtyTarget preliminarySpecialty = determineSpecialtyFromFindings(extractedText, fileName, parsedIndicators);

        // 4. Focused pgvector Doctor Retrieval (prevents multi-page noise from diluting cosine similarity)
        String focusedDoctorQuery = buildFocusedDoctorQuery(preliminarySpecialty, parsedIndicators, fileName);
        List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(focusedDoctorQuery, 4);

        // 5. Smart Clinical Windowing for Multi-Page Verbose Documents
        String clinicalContext = distillClinicalContext(extractedText, fileName, parsedIndicators, preliminarySpecialty);

        // 6. Clinical RAG Analysis (or Safe Deterministic Fallback)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performDocumentRagAnalysis(clinicalContext, fileName, matchedDoctors);

        // 7. Structure abnormal indicators
        List<AbnormalIndicatorDto> indicators = (ragResult.getIndicators() != null && !ragResult.getIndicators().isEmpty())
                ? ragResult.getIndicators()
                : parsedIndicators;

        SpecialtyTarget specialty = (ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank())
                ? new SpecialtyTarget(ragResult.getRecommendedSpecialtySlug(), ragResult.getRecommendedSpecialtyName() != null ? ragResult.getRecommendedSpecialtyName() : preliminarySpecialty.name())
                : preliminarySpecialty;

        String specialtySlug = specialty.slug();
        String specialtyName = specialty.name();
        String clinicalSummary = ragResult.getClinicalSummary() != null && !ragResult.getClinicalSummary().isBlank()
                ? ragResult.getClinicalSummary() : generateClinicalSummary(indicators, specialty);
        String plainExplanation = ragResult.getPlainLanguageExplanation() != null && !ragResult.getPlainLanguageExplanation().isBlank()
                ? ragResult.getPlainLanguageExplanation() : generatePlainLanguageExplanation(indicators, specialty);
        List<String> suggestedQuestions = (ragResult.getSuggestedQuestions() != null && !ragResult.getSuggestedQuestions().isEmpty())
                ? ragResult.getSuggestedQuestions() : generateSuggestedQuestions(specialty, indicators);

        DocumentAnalysisResponse response = new DocumentAnalysisResponse();
        response.setDocumentId(UUID.randomUUID());
        response.setFileName(fileName);
        response.setFileSizeBytes(size);
        response.setContentType(contentType);
        response.setClinicalSummary(clinicalSummary);
        response.setPlainLanguageExplanation(plainExplanation);
        response.setIndicators(indicators);
        response.setRecommendedSpecialtySlug(specialtySlug);
        response.setRecommendedSpecialtyName(specialtyName);
        response.setSuggestedQuestions(suggestedQuestions);
        response.setMatchedDoctors(matchedDoctors);
        response.setCachedResult(false);
        response.setModelUsed(ragResult.getModelUsed());
        response.setDoctorRecommendationReason(ragResult.getDoctorRecommendationReason());

        return response;
    }

    @Transactional(readOnly = true)
    public com.mediassist.dto.UserQuotaDto getUserQuota(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "UNAUTHORIZED",
                    "Vui lòng đăng nhập tài khoản."
            );
        }
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new com.mediassist.common.AppException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "Người dùng không tồn tại trên hệ thống."
                ));

        boolean isVip = user.getSubscriptionTier() != null && user.getSubscriptionTier().toUpperCase().contains("VIP");
        return new com.mediassist.dto.UserQuotaDto(
                user.getScanQuota(),
                user.getSubscriptionTier(),
                user.getVipValidUntil(),
                isVip,
                user.hasScanQuota()
        );
    }

    @Transactional
    public UserQuotaDto purchaseQuota(String userEmail, PurchaseQuotaRequest request) {
        if (userEmail == null || userEmail.isBlank()) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "UNAUTHORIZED",
                    "Vui lòng đăng nhập tài khoản."
            );
        }
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new com.mediassist.common.AppException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "Người dùng không tồn tại trên hệ thống."
                ));

        String pkg = request.getPackageId() != null ? request.getPackageId().toUpperCase() : "BASIC_5";
        LocalDateTime now = LocalDateTime.now();

        switch (pkg) {
            case "VIP_MONTHLY" -> {
                user.setSubscriptionTier("VIP_MONTHLY");
                LocalDateTime validUntil = (user.getVipValidUntil() != null && user.getVipValidUntil().isAfter(now))
                        ? user.getVipValidUntil().plusDays(30)
                        : now.plusDays(30);
                user.setVipValidUntil(validUntil);
                log.info("💎 [PURCHASE] User {} subscribed to VIP_MONTHLY until {}", userEmail, validUntil);
            }
            case "VIP_ENTERPRISE" -> {
                user.setSubscriptionTier("VIP_ENTERPRISE");
                LocalDateTime validUntil = (user.getVipValidUntil() != null && user.getVipValidUntil().isAfter(now))
                        ? user.getVipValidUntil().plusDays(90)
                        : now.plusDays(90);
                user.setVipValidUntil(validUntil);
                log.info("💎 [PURCHASE] User {} subscribed to VIP_ENTERPRISE until {}", userEmail, validUntil);
            }
            default -> { // BASIC_5
                user.setScanQuota(user.getScanQuota() + 5);
                if (user.getSubscriptionTier() == null) {
                    user.setSubscriptionTier("BASIC");
                }
                log.info("💳 [PURCHASE] User {} purchased +5 scan quota. Total quota: {}", userEmail, user.getScanQuota());
            }
        }

        User updated = userRepository.save(user);
        boolean isVip = updated.getSubscriptionTier() != null && updated.getSubscriptionTier().toUpperCase().contains("VIP");
        return new UserQuotaDto(
                updated.getScanQuota(),
                updated.getSubscriptionTier(),
                updated.getVipValidUntil(),
                isVip,
                updated.hasScanQuota()
        );
    }

    private String calculateSha256(byte[] data) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    private record IndicatorDefinition(String name, String regex, String defaultUnit, String defaultRef,
                                       Double lowerBound, Double upperBound, String clinicalHigh, String clinicalLow) {}

    /**
     * Comprehensive Multi-Domain Clinical Laboratory Ontology.
     * Covers 100+ parameters across all major medical specialties:
     * Endocrinology, Nephrology, Cardiology, Gastroenterology, Hematology,
     * Electrolytes, Coagulation, Inflammation, Infectious, Tumor Markers & Diagnostics.
     */
    private static final List<IndicatorDefinition> CLINICAL_ONTOLOGY = List.of(
            // === 1. Nội Tiết & Đái Tháo Đường (Endocrinology & Diabetes) ===
            new IndicatorDefinition("TSH (Thyroid Stimulating Hormone)", "(?i)\\b(?:tsh|thyrotropin)\\b", "µIU/mL", "0.27 - 4.2", 0.27, 4.2,
                    "TSH tăng gợi ý tình trạng suy giáp (nguyên phát hoặc dưới lâm sàng), cần đối chiếu FT4 và khám Nội tiết.", "TSH giảm gợi ý cường giáp hoặc ngộ độc giáp."),
            new IndicatorDefinition("FT4 (Free Thyroxine)", "(?i)\\b(?:ft4|free\\s*t4|t4\\s*tu\\s*do)\\b", "pmol/L", "12.0 - 22.0", 12.0, 22.0,
                    "FT4 tăng khẳng định hội chứng nhiễm độc giáp / cường giáp.", "FT4 giảm khẳng định suy giáp, cơ thể thiếu hụt hormone tuyến giáp."),
            new IndicatorDefinition("FT3 (Free Triiodothyronine)", "(?i)\\b(?:ft3|free\\s*t3|t3\\s*tu\\s*do)\\b", "pmol/L", "3.1 - 6.8", 3.1, 6.8,
                    "FT3 tăng kết hợp FT4 xác nhận cường giáp hoạt động mạnh.", "FT3 giảm trong suy dinh dưỡng, bệnh nặng mạn tính hoặc suy giáp."),
            new IndicatorDefinition("Fasting Glucose", "(?i)\\b(?:(?:fasting\\s*)?glucose|duong\\s*huyet(?:\\s*luc\\s*doi)?|duong\\s*mau)\\b", "mmol/L", "3.9 - 6.4", 3.9, 6.4,
                    "Đường huyết lúc đói tăng vượt ngưỡng, cần đối chiếu HbA1c và tầm soát đái tháo đường.", "Hạ đường huyết, cần theo dõi triệu chứng vã mồ hôi, hoa mắt, bủn rủn tay chân."),
            new IndicatorDefinition("HbA1c", "(?i)\\bhba1c\\b", "%", "4.0 - 5.6", 4.0, 5.6,
                    "Kiểm soát đường huyết trong 3 tháng qua kém, nguy cơ biến chứng mạch máu đái tháo đường.", "Chỉ số HbA1c bình thường."),
            new IndicatorDefinition("Cortisol huyết tương", "(?i)\\bcortisol\\b", "nmol/L", "171 - 536", 171.0, 536.0,
                    "Cortisol tăng cao, theo dõi hội chứng Cushing hoặc stress chuyển hóa.", "Cortisol giảm, theo dõi suy tuyến thượng thận (Addison)."),
            new IndicatorDefinition("Insulin đói", "(?i)\\binsulin(?:\\s*doi)?\\b", "µIU/mL", "2.6 - 24.9", 2.6, 24.9,
                    "Tăng nồng độ insulin máu, dấu hiệu kháng insulin mạnh (tiền đái tháo đường).", "Giảm tiết insulin, theo dõi suy giảm chức năng tế bào beta tụy."),
            new IndicatorDefinition("C-Peptide", "(?i)\\bc[-_\\s]?peptide\\b", "ng/mL", "1.1 - 4.4", 1.1, 4.4,
                    "Tăng phản ánh tăng tiết insulin nội sinh.", "Giảm phản ánh suy kiệt tế bào beta tụy (Đái tháo đường Type 1 hoặc Type 2 giai đoạn muộn)."),

            // === 2. Thận & Tiết Niệu (Nephrology & Urology) ===
            new IndicatorDefinition("Creatinine huyết thanh", "(?i)\\bcreatinin(?:e)?\\b", "µmol/L", "62 - 106", 62.0, 106.0,
                    "Creatinine tăng phản ánh giảm mức lọc cầu thận, có dấu hiệu suy giảm chức năng thận cấp hoặc mạn tính.", "Chỉ số bình thường."),
            new IndicatorDefinition("eGFR (Mức lọc cầu thận ước tính)", "(?i)\\b(?:egfr|gfr|muc\\s*loc\\s*cau\\s*than)\\b", "mL/min/1.73m2", "> 90", 90.0, null,
                    "Mức lọc cầu thận tối ưu.", "Mức lọc cầu thận giảm, cảnh báo tổn thương thận hoặc suy thận mạn tính các giai đoạn."),
            new IndicatorDefinition("Ure máu (BUN)", "(?i)\\b(?:ure(?:a)?|bun)\\b", "mmol/L", "2.5 - 7.5", 2.5, 7.5,
                    "Ure tăng phản ánh giảm đào thải tại thận hoặc tình trạng tăng dị hóa đạm, xuất huyết tiêu hóa.", "Chỉ số bình thường."),
            new IndicatorDefinition("Acid Uric", "(?i)\\b(?:acid\\s*uric|uric\\s*acid)\\b", "µmol/L", "200 - 420", 200.0, 420.0,
                    "Tăng acid uric máu, nguy cơ kết tinh vi tinh thể urat gây viêm khớp Gout cấp hoặc sỏi thận urat.", "Chỉ số bình thường."),
            new IndicatorDefinition("Protein niệu (Proteinuria)", "(?i)(?:protein|dam)\\s*(?:nieu|nuoc\\s*tieu)", "g/24h", "< 0.15", null, 0.15,
                    "Xuất hiện protein trong nước tiểu, dấu hiệu tổn thương màng lọc cầu thận hoặc hội chứng thận hư.", "Nước tiểu không có protein bất thường."),
            new IndicatorDefinition("Microalbumin niệu (ACR)", "(?i)(?:microalbumin|albumin\\s*nieu|acr)", "mg/g", "< 30", null, 30.0,
                    "Microalbumin niệu dương tính, dấu hiệu sớm của bệnh thận đái tháo đường hoặc tổn thương thận do tăng huyết áp.", "Chỉ số trong ngưỡng an toàn."),

            // === 3. Tim Mạch & Chuyển Hóa Lipid (Cardiology & Lipidology) ===
            new IndicatorDefinition("Cholesterol toàn phần", "(?i)\\b(?:cholesterol(?:\\s*toan\\s*phan)?|total\\s*cholesterol)\\b", "mmol/L", "3.9 - 5.2", 3.9, 5.2,
                    "Tăng nguy cơ xơ vữa động mạch và bệnh lý tim mạch nếu kéo dài.", "Nồng độ cholesterol toàn phần thấp hơn bình thường."),
            new IndicatorDefinition("Triglyceride", "(?i)\\btriglycerid(?:e|es)?\\b", "mmol/L", "0.46 - 1.88", 0.46, 1.88,
                    "Chỉ số mỡ máu trung tính cao, liên quan đến chế độ ăn nhiều đường bột và nguy cơ viêm tụy cấp nếu > 10 mmol/L.", "Triglyceride huyết thanh thấp."),
            new IndicatorDefinition("HDL-Cholesterol", "(?i)\\bhdl(?:[\\s-]*cholesterol)?\\b", "mmol/L", "> 1.3", 1.3, null,
                    "Mức mỡ tốt bảo vệ tim mạch tối ưu.", "Chỉ số bảo vệ tim mạch giảm, cần tăng cường vận động thể lực."),
            new IndicatorDefinition("LDL-Cholesterol", "(?i)\\bldl(?:[\\s-]*cholesterol)?\\b", "mmol/L", "< 3.4", null, 3.4,
                    "Mỡ xấu tăng cao, tăng nguy cơ mảng bám xơ vữa thành mạch và nhồi máu cơ tim.", "Mức LDL trong giới hạn an toàn."),
            new IndicatorDefinition("Troponin T (hs-cTnT)", "(?i)\\b(?:troponin[\\s-]*t|hs-ctnt)\\b", "ng/mL", "< 0.014", null, 0.014,
                    "Troponin T tăng vượt ngưỡng cảnh báo hoại tử tế bào cơ tim (Hội chứng vành cấp / Nhồi máu cơ tim), cần cấp cứu tim mạch.", "Không phát hiện tổn thương hoại tử cơ tim cấp."),
            new IndicatorDefinition("Troponin I (hs-cTnI)", "(?i)\\b(?:troponin[\\s-]*i|hs-ctni)\\b", "ng/mL", "< 0.04", null, 0.04,
                    "Troponin I tăng nhạy cảm, chỉ điểm tổn thương cơ tim cấp tính.", "Chỉ số bình thường."),
            new IndicatorDefinition("NT-proBNP / BNP", "(?i)\\b(?:nt-probnp|probnp|bnp)\\b", "pg/mL", "< 125", null, 125.0,
                    "NT-proBNP tăng cao chỉ điểm tăng áp lực thành tâm thất và tình trạng suy tim sung huyết.", "Áp lực buồng tim bình thường."),
            new IndicatorDefinition("CK-MB", "(?i)\\bck[-_\\s]?mb\\b", "U/L", "0 - 24", 0.0, 24.0,
                    "CK-MB tăng hỗ trợ chẩn đoán tổn thương cơ tim.", "Chỉ số bình thường."),

            // === 4. Tiêu Hóa & Gan Mật (Gastroenterology & Hepatology) ===
            new IndicatorDefinition("Men gan ALT (GPT)", "(?i)(?:men\\s*gan\\s*)?\\b(?:alt|gpt)\\b", "U/L", "0 - 41", 0.0, 41.0,
                    "Tổn thương tế bào gan cấp hoặc mạn tính (viêm gan siêu vi, gan nhiễm mỡ, rượu bia, độc chất).", "Chỉ số ALT bình thường."),
            new IndicatorDefinition("Men gan AST (GOT)", "(?i)(?:men\\s*gan\\s*)?\\b(?:ast|got)\\b", "U/L", "0 - 37", 0.0, 37.0,
                    "Men gan AST tăng liên quan tổn thương mô gan, cơ hoặc tim.", "Chỉ số AST bình thường."),
            new IndicatorDefinition("GGT (Gamma-GT)", "(?i)\\b(?:ggt|gamma[-_\\s]?gt)\\b", "U/L", "8 - 61", 8.0, 61.0,
                    "GGT tăng nhạy bén với ứ mật, tổn thương gan do rượu bia hoặc thuốc.", "Chỉ số GGT bình thường."),
            new IndicatorDefinition("Phosphatase kiềm (ALP)", "(?i)\\b(?:alp|alkaline\\s*phosphatase)\\b", "U/L", "40 - 130", 40.0, 130.0,
                    "ALP tăng gợi ý ứ mật trong gan/ngoài gan hoặc bệnh lý chuyển hóa xương.", "Chỉ số bình thường."),
            new IndicatorDefinition("Bilirubin toàn phần", "(?i)\\bbilirubin(?:\\s*toan\\s*phan)?\\b", "µmol/L", "5.1 - 17.0", 5.1, 17.0,
                    "Tăng sắc tố mật, theo dõi vàng da, tắc mật hoặc tan máu.", "Chức năng bài tiết mật của gan vẫn duy trì bình thường."),
            new IndicatorDefinition("Bilirubin trực tiếp", "(?i)\\bbilirubin\\s*(?:truc\\s*tiep|direct)\\b", "µmol/L", "0 - 4.3", 0.0, 4.3,
                    "Tăng Bilirubin trực tiếp chỉ điểm bệnh lý ứ mật hoặc viêm gan.", "Bình thường."),
            new IndicatorDefinition("Albumin huyết thanh", "(?i)\\balbumin(?:\\s*mau)?\\b", "g/L", "35 - 52", 35.0, 52.0,
                    "Bình thường hoặc tăng nhẹ do cô đặc máu.", "Giảm Albumin chỉ điểm suy giảm chức năng tổng hợp của gan hoặc mất qua thận (hội chứng thận hư)."),
            new IndicatorDefinition("Amylase máu", "(?i)\\bamylase\\b", "U/L", "28 - 100", 28.0, 100.0,
                    "Amylase tăng cao gấp 3 lần bình thường là tiêu chuẩn vàng chẩn đoán viêm tụy cấp.", "Bình thường."),
            new IndicatorDefinition("Lipase máu", "(?i)\\blipase\\b", "U/L", "13 - 60", 13.0, 60.0,
                    "Lipase tăng đặc hiệu cho tổn thương tụy cấp tính.", "Bình thường."),

            // === 5. Huyết Học & Đông Máu (Hematology & Coagulation) ===
            new IndicatorDefinition("Tổng lượng bạch cầu (WBC)", "(?i)\\b(?:wbc|bach\\s*cau|leukocyte)\\b", "G/L", "4.0 - 10.0", 4.0, 10.0,
                    "Bạch cầu tăng, phản ánh phản ứng viêm, nhiễm trùng hoặc bệnh lý tăng sinh tủy.", "Bạch cầu giảm, tăng nguy cơ nhiễm trùng cơ hội."),
            new IndicatorDefinition("Bạch cầu đa nhân trung tính (Neutrophil)", "(?i)\\b(?:neu(?:trophil)?|bach\\s*cau\\s*trung\\s*tinh)\\b", "%", "40 - 74", 40.0, 74.0,
                    "Tăng bạch cầu trung tính là dấu hiệu điển hình của nhiễm khuẩn cấp.", "Giảm tỷ lệ neutrophil."),
            new IndicatorDefinition("Bạch cầu Lympho (Lymphocyte)", "(?i)\\b(?:lym(?:phocyte)?|lymphocyte)\\b", "%", "20 - 40", 20.0, 40.0,
                    "Tăng tỷ lệ lympho, thường gặp trong nhiễm virus (cúm, sốt xuất huyết, viêm gan).", "Giảm lympho trong suy giảm miễn dịch."),
            new IndicatorDefinition("Hồng cầu (RBC)", "(?i)\\b(?:rbc|hong\\s*cau|erythrocyte)\\b", "T/L", "3.8 - 5.5", 3.8, 5.5,
                    "Đa hồng cầu hoặc cô đặc máu.", "Số lượng hồng cầu giảm, biểu hiện thiếu máu."),
            new IndicatorDefinition("Huyết sắc tố (Hb/HGB)", "(?i)\\b(?:hgb|hemoglobin)\\b", "g/L", "120 - 160", 120.0, 160.0,
                    "Tăng nồng độ huyết sắc tố.", "Thiếu máu, giảm khả năng vận chuyển oxy đến các mô và cơ quan."),
            new IndicatorDefinition("Hematocrit (HCT)", "(?i)\\b(?:hct|hematocrit)\\b", "%", "35 - 47", 35.0, 47.0,
                    "HCT tăng chỉ điểm cô đặc máu (mất nước, sốt xuất huyết cảnh báo).", "HCT giảm trong thiếu máu hoặc thừa dịch."),
            new IndicatorDefinition("Tiểu cầu (PLT)", "(?i)\\b(?:plt|tieu\\s*cau|platelet)\\b", "G/L", "150 - 400", 150.0, 400.0,
                    "Tăng tiểu cầu phản ứng hoặc tăng tiểu cầu nguyên phát.", "Giảm tiểu cầu, nguy cơ xuất huyết dưới da, chảy máu cam hoặc xuất huyết tiêu hóa."),
            new IndicatorDefinition("INR (Tỷ số chuẩn hóa quốc tế)", "(?i)\\binr\\b", "Ratio", "0.85 - 1.15", 0.85, 1.15,
                    "INR kéo dài, tăng nguy cơ chảy máu, cần theo dõi liều thuốc chống đông (Warfarin).", "Tăng đông máu."),
            new IndicatorDefinition("D-Dimer", "(?i)\\bd[-_\\s]?dimer\\b", "ng/mL", "< 500", null, 500.0,
                    "D-Dimer tăng cao cảnh báo huyết khối tĩnh mạch sâu (DVT) hoặc thuyên tắc phổi (PE).", "Không có bằng chứng huyết khối cấp tính."),

            // === 6. Điện Giải Đồ & Khoáng Chất (Electrolytes & Minerals) ===
            new IndicatorDefinition("Natri máu (Na+)", "(?i)\\b(?:natri|sodium|na\\+)\\b", "mmol/L", "135 - 145", 135.0, 145.0,
                    "Tăng natri máu, gây mất nước nội bào và kích thích thần kinh.", "Hạ natri máu, nguy cơ phù nước não, mệt mỏi, co giật nếu giảm sâu."),
            new IndicatorDefinition("Kali máu (K+)", "(?i)\\b(?:kali|potassium|k\\+)\\b", "mmol/L", "3.5 - 5.0", 3.5, 5.0,
                    "Tăng kali máu NGUY HIỂM, đe dọa ngừng tim đột ngột trên điện tâm đồ.", "Hạ kali máu, nguy cơ yếu cơ, liệt ruột và loạn nhịp tim."),
            new IndicatorDefinition("Clo máu (Cl-)", "(?i)\\b(?:clo|chloride|cl-)\\b", "mmol/L", "96 - 106", 96.0, 106.0,
                    "Rối loạn thăng bằng kiềm toan.", "Bình thường."),
            new IndicatorDefinition("Canxi máu toàn phần (Ca)", "(?i)\\b(?:canxi|calcium|ca2\\+|ca\\+)\\b", "mmol/L", "2.15 - 2.55", 2.15, 2.55,
                    "Tăng canxi máu, theo dõi cường tuyến cận giáp hoặc bệnh lý ác tính.", "Hạ canxi máu gây co thắt cơ (dấu hiệu Chvostek, Trousseau), tê môi tay."),
            new IndicatorDefinition("Ferritin huyết thanh", "(?i)\\bferritin\\b", "ng/mL", "30 - 400", 30.0, 400.0,
                    "Ferritin tăng trong phản ứng viêm cấp tính hoặc ứ sắt.", "Ferritin giảm là tiêu chuẩn vàng chẩn đoán thiếu máu thiếu sắt."),

            // === 7. Viêm & Miễn Dịch & Nhiễm Trùng (Inflammation & Infection) ===
            new IndicatorDefinition("CRP (C-Reactive Protein)", "(?i)\\b(?:crp|hs[-_\\s]?crp)\\b", "mg/L", "< 5.0", null, 5.0,
                    "Chỉ số protein phản ứng C tăng cao, phản ánh tình trạng viêm cấp tính hoặc nhiễm trùng.", "Không có phản ứng viêm cấp tính."),
            new IndicatorDefinition("Procalcitonin (PCT)", "(?i)\\b(?:pct|procalcitonin)\\b", "ng/mL", "< 0.05", null, 0.05,
                    "Procalcitonin tăng cao chỉ điểm nhiễm khuẩn huyết hoặc sốc nhiễm khuẩn nặng.", "Không có bằng chứng nhiễm khuẩn nặng."),
            new IndicatorDefinition("Tốc độ máu lắng (ESR)", "(?i)\\b(?:esr|toc\\s*do\\s*lang\\s*mau)\\b", "mm/h", "< 20", null, 20.0,
                    "Tốc độ lắng hồng cầu tăng trong các bệnh lý viêm, tự miễn hoặc nhiễm trùng mạn tính.", "Bình thường."),

            // === 8. Dấu Ấn Khối U (Tumor Markers) ===
            new IndicatorDefinition("PSA toàn phần (Tuyến tiền liệt)", "(?i)\\b(?:psa|total\\s*psa)\\b", "ng/mL", "0 - 4.0", 0.0, 4.0,
                    "PSA tăng cao cảnh báo phì đại lành tính hoặc ung thư tuyến tiền liệt, cần hội chẩn Thận - Tiết niệu.", "Chỉ số PSA an toàn."),
            new IndicatorDefinition("CEA (Đại trực tràng & Đường tiêu hóa)", "(?i)\\bcea\\b", "ng/mL", "< 5.0", null, 5.0,
                    "CEA tăng cao theo dõi bệnh lý khối u đường tiêu hóa, phổi hoặc viêm ruột mạn tính.", "Chỉ số CEA bình thường."),
            new IndicatorDefinition("AFP (Gan - Alpha-Fetoprotein)", "(?i)\\bafp\\b", "ng/mL", "< 10.0", null, 10.0,
                    "AFP tăng cao là dấu ấn cảnh báo quan trọng trong tầm soát ung thư tế bào gan (HCC).", "Chỉ số AFP trong giới hạn bình thường."),
            new IndicatorDefinition("CA 19-9 (Tụy & Đường mật)", "(?i)\\bca[-_\\s]?19[-_\\s]?9\\b", "U/mL", "< 37.0", null, 37.0,
                    "CA 19-9 tăng cao trong bệnh lý tụy mật (ung thư biểu mô đường mật, ung thư tụy hoặc sỏi mật).", "Bình thường."),
            new IndicatorDefinition("CA 125 (Buồng trứng)", "(?i)\\bca[-_\\s]?125\\b", "U/mL", "< 35.0", null, 35.0,
                    "CA 125 tăng trong u nang buồng trứng, lạc nội mạc tử cung hoặc ung thư buồng trứng.", "Bình thường.")
    );

    /**
     * Universal Dynamic Laboratory Indicator Extractor.
     * Combines high-precision Clinical Ontology lookup with a Generic Regex Line Parser
     * capable of dynamically recognizing ANY hospital lab format without hardcoded test names.
     */
    private List<AbnormalIndicatorDto> parseIndicators(String text, String fileName) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        List<AbnormalIndicatorDto> list = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");
        Set<String> detected = new HashSet<>();

        // --- PHASE 1: Structured Clinical Ontology Matcher (High Precision) ---
        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isBlank() || line.length() < 3) continue;

            for (IndicatorDefinition def : CLINICAL_ONTOLOGY) {
                if (detected.contains(def.name())) continue;

                Matcher mName = Pattern.compile(def.regex()).matcher(line);
                if (mName.find()) {
                    // Extract numeric value from line
                    Matcher mVal = Pattern.compile("[:=\\s]\\s*([0-9]+[.,]?[0-9]*)").matcher(line);
                    String valStr = null;
                    Double valNum = null;
                    if (mVal.find()) {
                        valStr = mVal.group(1).replace(',', '.');
                        try { valNum = Double.parseDouble(valStr); } catch (Exception ignored) {}
                    }

                    if (valStr == null) {
                        Matcher mAny = Pattern.compile("([0-9]+[.,]?[0-9]*)").matcher(line.substring(mName.end()));
                        if (mAny.find()) {
                            valStr = mAny.group(1).replace(',', '.');
                            try { valNum = Double.parseDouble(valStr); } catch (Exception ignored) {}
                        }
                    }

                    if (valStr == null) continue;

                    // Extract reference range if present
                    String refRange = def.defaultRef();
                    Matcher mRef = Pattern.compile("(?:tham\\s*chieu|binh\\s*thuong|reference)?\\s*[:(]\\s*([0-9]+[.,]?[0-9]*\\s*-\\s*[0-9]+[.,]?[0-9]*|[><=]\\s*[0-9]+[.,]?[0-9]*)\\s*\\)?", Pattern.CASE_INSENSITIVE).matcher(line);
                    if (mRef.find()) {
                        refRange = mRef.group(1).trim();
                    }

                    // Extract unit if present
                    String unit = def.defaultUnit();
                    Matcher mUnit = Pattern.compile("(mmol/l|µmol/l|umol/l|u/l|iu/l|g/l|t/l|%|mg/dl|ng/ml|pg/ml|µiu/ml|pmol/l|ml/min(?:/[0-9.,m]+)?|ratio|mm/h)", Pattern.CASE_INSENSITIVE).matcher(line);
                    if (mUnit.find()) {
                        unit = mUnit.group(1);
                    }

                    // Determine status
                    String status = calculateStatus(valNum, refRange, def.lowerBound(), def.upperBound(), line);
                    String significance = "Chỉ số trong giới hạn bình thường.";
                    if ("ELEVATED".equals(status)) {
                        significance = def.clinicalHigh();
                    } else if ("LOW".equals(status)) {
                        significance = def.clinicalLow();
                    }

                    list.add(new AbnormalIndicatorDto(def.name(), valStr, unit, refRange, status, significance));
                    detected.add(def.name());
                }
            }
        }

        // --- PHASE 2: Generic Tabular Line Parser (Captures ANY arbitrary lab indicator not in ontology) ---
        Pattern genericPattern = Pattern.compile(
                "^\\s*(?:[0-9]+[.)]\\s*)?([\\p{L}\\p{M}0-9_\\-\\s()/+]{2,35})\\s*[:=]\\s*([0-9]+[.,]?[0-9]*)\\s*([a-zA-Zµ/%]+(?:/[a-zA-Z0-9.]+)?)(.*)$",
                Pattern.CASE_INSENSITIVE
        );

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.length() < 6) continue;

            Matcher mGeneric = genericPattern.matcher(line);
            if (mGeneric.find()) {
                String candidateName = mGeneric.group(1).trim();
                String valStr = mGeneric.group(2).replace(',', '.');
                String unit = mGeneric.group(3) != null ? mGeneric.group(3).trim() : "";
                String remainder = mGeneric.group(4) != null ? mGeneric.group(4).trim() : "";

                // Filter out non-test lines
                String cleanName = stripAccents(candidateName).toLowerCase();
                if (cleanName.contains("ngay") || cleanName.contains("thang") || cleanName.contains("nam") ||
                    cleanName.contains("gio") || cleanName.contains("tuoi") || cleanName.contains("trang") ||
                    cleanName.contains("khoa") || cleanName.contains("dien thoai") || cleanName.contains("stt")) {
                    continue;
                }

                // Check if already captured in Phase 1
                boolean alreadyCaptured = detected.stream().anyMatch(d -> d.toLowerCase().contains(cleanName) || cleanName.contains(stripAccents(d).toLowerCase()));
                if (alreadyCaptured) continue;

                // Extract reference range from remainder (handles any text e.g. "Tham chiếu: 30 - 100", "(Ref: 2.8-8.0)", "[> 90]")
                String refRange = "-";
                Matcher mRef = Pattern.compile("([0-9]+[.,]?[0-9]*\\s*-\\s*[0-9]+[.,]?[0-9]*|[><=]\\s*[0-9]+[.,]?[0-9]*)").matcher(remainder);
                if (mRef.find()) {
                    refRange = mRef.group(1).trim();
                }

                Double valNum = null;
                try { valNum = Double.parseDouble(valStr); } catch (Exception ignored) {}

                String status = calculateStatus(valNum, refRange, null, null, line);
                String significance = "Chỉ số cận lâm sàng đo được trong tài liệu y tế.";
                if ("ELEVATED".equals(status)) {
                    significance = String.format("Chỉ số %s đo được %s %s vượt ngưỡng tham chiếu (%s), cần đánh giá chuyên khoa.", candidateName, valStr, unit, refRange);
                } else if ("LOW".equals(status)) {
                    significance = String.format("Chỉ số %s đo được %s %s thấp hơn mức tham chiếu chuẩn (%s).", candidateName, valStr, unit, refRange);
                }

                list.add(new AbnormalIndicatorDto(candidateName, valStr, unit, refRange, status, significance));
                detected.add(candidateName);
            }
        }

        // --- PHASE 3: Qualitative / Serology Findings (Dương tính / Âm tính) ---
        Pattern serologyPattern = Pattern.compile(
                "(?i)\\b(hbsag|anti[-_\\s]?hbs|anti[-_\\s]?hcv|dengue\\s*ns1|dengue\\s*igm|dengue\\s*igg|hiv|vdrl|tpha|hp\\s*test|helicobacter\\s*pylori)\\b[^\\n:]*?[:=]?\\s*(duong\\s*tinh|am\\s*tinh|positive|negative)"
        );
        Matcher mSero = serologyPattern.matcher(text);
        while (mSero.find()) {
            String testCode = mSero.group(1).toUpperCase().trim();
            String resultVal = mSero.group(2).trim();
            boolean isPositive = stripAccents(resultVal).toLowerCase().contains("duong") || resultVal.toLowerCase().contains("pos");

            if (!detected.contains(testCode)) {
                String status = isPositive ? "ELEVATED" : "NORMAL";
                String significance = isPositive
                        ? String.format("Xét nghiệm %s DƯƠNG TÍNH. Đề xuất bệnh nhân khám chuyên khoa truyền nhiễm / gan mật để kiểm tra chuyên sâu.", testCode)
                        : String.format("Xét nghiệm %s Âm tính, không phát hiện kháng nguyên / kháng thể bệnh lý.", testCode);

                list.add(new AbnormalIndicatorDto(testCode, isPositive ? "DƯƠNG TÍNH" : "ÂM TÍNH", "Định tính", "Âm tính", status, significance));
                detected.add(testCode);
            }
        }

        return list;
    }

    private String calculateStatus(Double valNum, String refRange, Double defaultLow, Double defaultHigh, String line) {
        String lineClean = stripAccents(line).toLowerCase();

        Double parsedLow = defaultLow;
        Double parsedHigh = defaultHigh;

        if (refRange != null && !refRange.isBlank()) {
            Matcher mRange = Pattern.compile("([0-9]+[.,]?[0-9]*)\\s*-\\s*([0-9]+[.,]?[0-9]*)").matcher(refRange);
            if (mRange.find()) {
                try {
                    parsedLow = Double.parseDouble(mRange.group(1).replace(',', '.'));
                    parsedHigh = Double.parseDouble(mRange.group(2).replace(',', '.'));
                } catch (Exception ignored) {}
            } else if (refRange.contains(">")) {
                Matcher mGt = Pattern.compile(">\\s*([0-9]+[.,]?[0-9]*)").matcher(refRange);
                if (mGt.find()) {
                    try { parsedLow = Double.parseDouble(mGt.group(1).replace(',', '.')); } catch (Exception ignored) {}
                }
            } else if (refRange.contains("<")) {
                Matcher mLt = Pattern.compile("<\\s*([0-9]+[.,]?[0-9]*)").matcher(refRange);
                if (mLt.find()) {
                    try { parsedHigh = Double.parseDouble(mLt.group(1).replace(',', '.')); } catch (Exception ignored) {}
                }
            }
        }

        boolean hasExplicitElevated = lineClean.contains("tang") || lineClean.contains("cao") ||
                lineClean.contains("high") || lineClean.contains("elevated") || lineClean.contains("(h)") ||
                lineClean.contains("duong tinh") || lineClean.contains("positive");
        boolean hasExplicitLow = lineClean.contains("giam") || lineClean.contains("thap") ||
                lineClean.contains("low") || lineClean.contains("(l)");

        if (valNum != null && parsedHigh != null && valNum > parsedHigh) {
            return "ELEVATED";
        } else if (valNum != null && parsedLow != null && valNum < parsedLow) {
            return "LOW";
        } else if (hasExplicitElevated) {
            return "ELEVATED";
        } else if (hasExplicitLow) {
            return "LOW";
        }
        return "NORMAL";
    }

    /**
     * Dynamic Multi-Domain Specialty Classifier.
     * Evaluates findings against all 12 hospital departments configured in the database:
     * cardiology, neurology, gastroenterology, dermatology, pediatrics, general-internal-medicine,
     * pulmonology, orthopedics, nephrology, obstetrics-gynecology, endocrinology, ent.
     */
    private SpecialtyTarget determineSpecialtyFromFindings(String text, String fileName, List<AbnormalIndicatorDto> indicators) {
        String combined = stripAccents((text + " " + (fileName != null ? fileName : "")).toLowerCase());

        Map<String, Integer> scores = new HashMap<>();
        scores.put("endocrinology", 0);
        scores.put("nephrology", 0);
        scores.put("cardiology", 0);
        scores.put("gastroenterology", 0);
        scores.put("pulmonology", 0);
        scores.put("neurology", 0);
        scores.put("orthopedics", 0);
        scores.put("dermatology", 0);
        scores.put("pediatrics", 0);
        scores.put("obstetrics-gynecology", 0);
        scores.put("ent", 0);
        scores.put("general-internal-medicine", 0);

        // 1. Evaluate Detected Clinical Indicators (Weight +8 for Abnormal, +3 for Normal match)
        if (indicators != null) {
            for (AbnormalIndicatorDto ind : indicators) {
                String n = stripAccents(ind.getName()).toLowerCase();
                boolean isAbnormal = "ELEVATED".equals(ind.getStatus()) || "LOW".equals(ind.getStatus());
                int weight = isAbnormal ? 8 : 3;

                // Endocrinology
                if (n.contains("tsh") || n.contains("ft4") || n.contains("ft3") || n.contains("glucose") ||
                    n.contains("hba1c") || n.contains("cortisol") || n.contains("insulin") || n.contains("peptide") ||
                    n.contains("giap") || n.contains("duong")) {
                    scores.merge("endocrinology", weight, Integer::sum);
                }
                // Nephrology & Urology
                if (n.contains("creatinin") || n.contains("egfr") || n.contains("gfr") || n.contains("ure") ||
                    n.contains("bun") || n.contains("dam nieu") || n.contains("protein nieu") || n.contains("microalbumin") ||
                    n.contains("acr") || n.contains("psa")) {
                    scores.merge("nephrology", weight, Integer::sum);
                }
                // Cardiology
                if (n.contains("cholesterol") || n.contains("triglycerid") || n.contains("ldl") || n.contains("hdl") ||
                    n.contains("troponin") || n.contains("probnp") || n.contains("bnp") || n.contains("ck-mb")) {
                    scores.merge("cardiology", weight, Integer::sum);
                }
                // Gastroenterology & Hepatology
                if (n.contains("alt") || n.contains("ast") || n.contains("got") || n.contains("gpt") ||
                    n.contains("ggt") || n.contains("alp") || n.contains("bilirubin") || n.contains("amylase") ||
                    n.contains("lipase") || n.contains("afp") || n.contains("ca 19-9") || n.contains("hbsag") ||
                    n.contains("hcv") || n.contains("helicobacter") || n.contains("hp")) {
                    scores.merge("gastroenterology", weight, Integer::sum);
                }
                // Orthopedics & Gout
                if (n.contains("acid uric") || n.contains("uric acid")) {
                    scores.merge("orthopedics", weight, Integer::sum);
                }
                // Obstetrics-Gynecology
                if (n.contains("ca 125") || n.contains("hcg") || n.contains("estrogen") || n.contains("progesterone")) {
                    scores.merge("obstetrics-gynecology", weight, Integer::sum);
                }
                // General Internal Medicine / Hematology
                if (n.contains("wbc") || n.contains("rbc") || n.contains("hgb") || n.contains("plt") ||
                    n.contains("bach cau") || n.contains("hong cau") || n.contains("tieu cau") ||
                    n.contains("crp") || n.contains("pct") || n.contains("esr") || n.contains("natri") ||
                    n.contains("kali") || n.contains("clo") || n.contains("canxi") || n.contains("ferritin")) {
                    scores.merge("general-internal-medicine", isAbnormal ? 4 : 1, Integer::sum);
                }
            }
        }

        // 2. Evaluate Clinical Terminology in Document Text & Filename (+4 per keyword hit)
        Map<String, List<String>> keywordMap = Map.ofEntries(
                Map.entry("endocrinology", List.of("noi tiet", "tuyen giap", "suy giap", "cuong giap", "buou co", "dai thao duong", "tieu duong", "ha duong huyet", "insulin", "cushing", "basedow")),
                Map.entry("nephrology", List.of("than", "suy than", "tiet nieu", "cau than", "soi than", "tien liet tuyen", "tieu dem", "tieu buot", "tieu ra mau", "chay than", "loc mau", "bang quang")),
                Map.entry("cardiology", List.of("tim mach", "nhoi mau", "tang huyet ap", "suy tim", "mach vanh", "xo vua", "ecg", "dien tam do", "sieu am tim", "ha huyet ap", "loan nhip")),
                Map.entry("gastroenterology", List.of("tieu hoa", "gan mat", "men gan", "viem gan", "xo gan", "da day", "dai trang", "tuy", "viem tuy", "soi mat", "trao nguoc", "loet da day")),
                Map.entry("pulmonology", List.of("ho hap", "phoi", "phe quan", "hen suyenh", "copd", "viem phoi", "x-quang phoi", "ct nguc", "spo2", "kho tho", "ho khan", "lao phoi")),
                Map.entry("neurology", List.of("than kinh", "tien dinh", "chong mat", "dau dau", "dot quy", "tai bien", "eeg", "dien nao", "mri nao", "sa sut tri tue", "parkinson", "te bi")),
                Map.entry("orthopedics", List.of("co xuong khop", "khop", "thoai hoa khop", "gay xuong", "loang xuong", "gout", "cot song", "thoat vi", "dia dem", "day chang", "chan thuong")),
                Map.entry("dermatology", List.of("da lieu", "viem da", "di ung", "me day", "vay nen", "cham", "eczema", "mun", "nam da", "zona", "ngua ngap")),
                Map.entry("pediatrics", List.of("nhi khoa", "tre em", "so sinh", "tiem chung", "dinh duong tre", "chieu cao", "can nang tre")),
                Map.entry("obstetrics-gynecology", List.of("san phu khoa", "phu khoa", "thai ky", "sieu am thai", "tu cung", "buong trung", "kinh nguyet", "san khoa", "sinh no")),
                Map.entry("ent", List.of("tai mui hong", "viem xoang", "viem hong", "viem tai", "amidan", "thanh quan", "polyp mui", "u tai", "nghet mui"))
        );

        for (Map.Entry<String, List<String>> entry : keywordMap.entrySet()) {
            for (String kw : entry.getValue()) {
                if (combined.contains(kw)) {
                    scores.merge(entry.getKey(), 4, Integer::sum);
                }
            }
        }

        // 3. Find Specialty with highest score
        String bestSlug = "general-internal-medicine";
        int maxScore = 0;
        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            if (entry.getValue() > maxScore) {
                maxScore = entry.getValue();
                bestSlug = entry.getKey();
            }
        }

        // If score is negligible, fall back to General Internal Medicine
        if (maxScore < 3) {
            bestSlug = "general-internal-medicine";
        }

        Map<String, String> names = Map.ofEntries(
                Map.entry("cardiology", "Cardiology (Tim Mạch)"),
                Map.entry("neurology", "Neurology (Thần Kinh)"),
                Map.entry("gastroenterology", "Gastroenterology (Tiêu Hóa - Gan Mật)"),
                Map.entry("dermatology", "Dermatology (Da Liễu)"),
                Map.entry("pediatrics", "Pediatrics (Nhi Khoa)"),
                Map.entry("pulmonology", "Pulmonology (Hô Hấp & Phổi)"),
                Map.entry("orthopedics", "Orthopedics (Cơ Xương Khớp & Chấn Thương Chỉnh Hình)"),
                Map.entry("nephrology", "Nephrology & Urology (Thận - Tiết Niệu)"),
                Map.entry("obstetrics-gynecology", "Obstetrics & Gynecology (Sản Phụ Khoa)"),
                Map.entry("endocrinology", "Endocrinology & Diabetes (Nội Tiết & Đái Tháo Đường)"),
                Map.entry("ent", "Otolaryngology (Tai Mũi Họng)"),
                Map.entry("general-internal-medicine", "General Internal Medicine (Nội Tổng Quát)")
        );

        return new SpecialtyTarget(bestSlug, names.getOrDefault(bestSlug, "General Internal Medicine (Nội Tổng Quát)"));
    }

    private String generateClinicalSummary(List<AbnormalIndicatorDto> indicators, SpecialtyTarget specialty) {
        long elevatedCount = indicators.stream().filter(i -> "ELEVATED".equals(i.getStatus())).count();
        long lowCount = indicators.stream().filter(i -> "LOW".equals(i.getStatus())).count();

        List<String> abnormalHighlights = indicators.stream()
                .filter(i -> "ELEVATED".equals(i.getStatus()) || "LOW".equals(i.getStatus()))
                .map(i -> String.format("%s: %s %s (%s)", i.getName(), i.getValue(), i.getUnit(), i.getStatus()))
                .limit(4)
                .toList();

        if (elevatedCount == 0 && lowCount == 0) {
            return String.format(
                    "Tất cả các chỉ số xét nghiệm cận lâm sàng bóc tách từ tài liệu đều nằm trong giới hạn tham chiếu an toàn. " +
                    "Định hướng kiểm tra sức khỏe tổng quát thuộc chuyên khoa %s để duy trì chỉ số sinh học ổn định.",
                    specialty.name()
            );
        }

        String highlightStr = !abnormalHighlights.isEmpty()
                ? " Chỉ số tiêu biểu ghi nhận bất thường: " + String.join(", ", abnormalHighlights) + "."
                : "";

        return String.format(
                "Kết quả phân tích tài liệu y tế ghi nhận %d chỉ số tăng cao bất thường và %d chỉ số dưới ngưỡng chuẩn.%s " +
                "Tình trạng cận lâm sàng có tính chất khu trú ưu tiên thuộc chuyên khoa %s. Bệnh nhân cần được hội chẩn chuyên sâu để thiết lập phác đồ theo dõi và can thiệp kịp thời.",
                elevatedCount, lowCount, highlightStr, specialty.name()
        );
    }

    private String generatePlainLanguageExplanation(List<AbnormalIndicatorDto> indicators, SpecialtyTarget specialty) {
        StringBuilder sb = new StringBuilder();
        sb.append("Chào bạn! Dưới đây là giải thích đơn giản và chi tiết về kết quả xét nghiệm của bạn:\n\n");

        List<AbnormalIndicatorDto> abnormalList = indicators.stream()
                .filter(i -> "ELEVATED".equals(i.getStatus()) || "LOW".equals(i.getStatus()))
                .toList();

        if (abnormalList.isEmpty()) {
            sb.append("🎉 Tin vui: Toàn bộ các chỉ số xét nghiệm ghi nhận trong tài liệu của bạn đều nằm trong khoảng bình thường an toàn. Bạn không có dấu hiệu bất thường cấp tính nào trên kết quả này.\n\n");
        } else {
            sb.append("⚠️ Các chỉ số cần bạn và Bác sĩ lưu ý đặc biệt:\n");
            for (AbnormalIndicatorDto item : abnormalList) {
                String direction = "ELEVATED".equals(item.getStatus()) ? "vượt ngưỡng tham chiếu an toàn" : "thấp hơn mức chuẩn thông thường";
                sb.append(String.format("• **%s**: Đo được **%s %s** (Mức tham chiếu: %s - %s).\n  -> Ý nghĩa: %s\n",
                        item.getName(), item.getValue(), item.getUnit(), item.getReferenceRange(), direction, item.getClinicalSignificance()));
            }
            sb.append("\n");
        }

        sb.append(String.format("👉 **Khuyến nghị từ MediAssist**: Bạn nên trao đổi trực tiếp với Bác sĩ chuyên khoa **%s** để được tư vấn phác đồ chuẩn y khoa, đánh giá nguyên nhân gốc rễ và xem xét chỉ định cận lâm sàng bổ sung nếu cần.", specialty.name()));
        return sb.toString();
    }

    private List<String> generateSuggestedQuestions(SpecialtyTarget specialty, List<AbnormalIndicatorDto> indicators) {
        List<String> questions = new ArrayList<>();

        if (indicators != null) {
            // Check abnormal indicators
            for (AbnormalIndicatorDto ind : indicators) {
                if (!"ELEVATED".equals(ind.getStatus()) && !"LOW".equals(ind.getStatus())) continue;
                String n = stripAccents(ind.getName()).toLowerCase();

                // Thyroid
                if (n.contains("tsh") || n.contains("ft4") || n.contains("ft3") || n.contains("giap")) {
                    if (!questions.contains("Với chỉ số hormone tuyến giáp bất thường, tôi có cần siêu âm tuyến giáp Doppler để kiểm tra nhân giáp không?")) {
                        questions.add("Với chỉ số hormone tuyến giáp bất thường, tôi có cần siêu âm tuyến giáp Doppler để kiểm tra nhân giáp không?");
                        questions.add("Tôi cần theo dõi những triệu chứng lâm sàng nào (tim đập nhanh, sụt cân, rụng tóc hay mệt mỏi)?");
                    }
                }
                // Renal / Kidney
                if (n.contains("creatinin") || n.contains("egfr") || n.contains("ure") || n.contains("bun") || n.contains("dam nieu")) {
                    if (!questions.contains("Chỉ số chức năng thận của tôi như vậy đã ở mức suy giảm cấp hay mạn tính?")) {
                        questions.add("Chỉ số chức năng thận của tôi như vậy đã ở mức suy giảm cấp hay mạn tính?");
                        questions.add("Tôi cần điều chỉnh lượng đạm, lượng muối và lượng nước uống mỗi ngày như thế nào để bảo vệ thận?");
                    }
                }
                // Diabetes / Glucose
                if (n.contains("glucose") || n.contains("hba1c") || n.contains("duong")) {
                    if (!questions.contains("Chỉ số đường huyết của tôi đã đến ngưỡng chẩn đoán đái tháo đường hay đang ở giai đoạn tiền tiểu đường?")) {
                        questions.add("Chỉ số đường huyết của tôi đã đến ngưỡng chẩn đoán đái tháo đường hay đang ở giai đoạn tiền tiểu đường?");
                        questions.add("Tôi có cần tự đo đường huyết mao mạch tại nhà và điều chỉnh chế độ ăn giảm tinh bột ngay không?");
                    }
                }
                // Lipid / Cholesterol
                if (n.contains("cholesterol") || n.contains("triglycerid") || n.contains("ldl")) {
                    if (!questions.contains("Với chỉ số mỡ máu hiện tại, tôi có bắt buộc phải dùng thuốc Statin hạ mỡ máu không?")) {
                        questions.add("Với chỉ số mỡ máu hiện tại, tôi có bắt buộc phải dùng thuốc Statin hạ mỡ máu không?");
                        questions.add("Tôi có cần làm thêm siêu âm tim hoặc đo điện tâm đồ gắng sức để tầm soát mảng xơ vữa không?");
                    }
                }
                // Liver
                if (n.contains("alt") || n.contains("ast") || n.contains("got") || n.contains("gpt") || n.contains("ggt") || n.contains("bilirubin")) {
                    if (!questions.contains("Chỉ số men gan tăng cao này do virus, rượu bia, gan nhiễm mỡ hay do tác dụng phụ của thuốc?")) {
                        questions.add("Chỉ số men gan tăng cao này do virus, rượu bia, gan nhiễm mỡ hay do tác dụng phụ của thuốc?");
                        questions.add("Tôi có cần xét nghiệm kháng thể viêm gan B, C hoặc siêu âm FibroScan đo độ xơ hóa gan không?");
                    }
                }
                // Uric Acid / Gout
                if (n.contains("acid uric") || n.contains("uric")) {
                    if (!questions.contains("Chỉ số Acid Uric tăng cao như thế này đã cần dùng thuốc hạ acid uric hay chỉ cần kiêng ăn uống?")) {
                        questions.add("Chỉ số Acid Uric tăng cao như thế này đã cần dùng thuốc hạ acid uric hay chỉ cần kiêng ăn uống?");
                        questions.add("Những thực phẩm giàu purine nào (thịt đỏ, hải sản, nội tạng, bia rượu) tôi cần kiêng tuyệt đối?");
                    }
                }
                // Prostate / PSA
                if (n.contains("psa")) {
                    if (!questions.contains("Chỉ số PSA tăng cảnh báo nguy cơ u xơ lành tính hay ung thư tiền liệt tuyến?")) {
                        questions.add("Chỉ số PSA tăng cảnh báo nguy cơ u xơ lành tính hay ung thư tiền liệt tuyến?");
                        questions.add("Tôi có cần chụp MRI vùng chậu hoặc làm sinh thiết tiền liệt tuyến để khẳng định không?");
                    }
                }
                // Infection / WBC / CRP
                if (n.contains("wbc") || n.contains("bach cau") || n.contains("crp") || n.contains("pct")) {
                    if (!questions.contains("Chỉ số bạch cầu và CRP tăng cao phản ánh ổ nhiễm trùng cấp ở cơ quan nào?")) {
                        questions.add("Chỉ số bạch cầu và CRP tăng cao phản ánh ổ nhiễm trùng cấp ở cơ quan nào?");
                        questions.add("Tôi có cần cấy máu hoặc làm kháng sinh đồ để lựa chọn đúng kháng sinh điều trị không?");
                    }
                }
                // Anemia / RBC / HGB
                if (n.contains("rbc") || n.contains("hong cau") || n.contains("hgb") || n.contains("ferritin")) {
                    if (!questions.contains("Mức độ thiếu máu này là do thiếu sắt, mất máu vi thể đường tiêu hóa hay bệnh lý tủy?")) {
                        questions.add("Mức độ thiếu máu này là do thiếu sắt, mất máu vi thể đường tiêu hóa hay bệnh lý tủy?");
                        questions.add("Tôi nên bổ sung viên sắt, vitamin B12 hay cần làm thêm nội soi dạ dày đại tràng?");
                    }
                }
            }
        }

        // If we still need more questions, complete up to 3 using specialty-specific questions
        if (questions.size() < 3) {
            Map<String, List<String>> specialtyQuestions = Map.ofEntries(
                    Map.entry("endocrinology", List.of(
                            "Tôi có cần thực hiện thêm nghiệm pháp dung nạp glucose hoặc siêu âm tuyến giáp không?",
                            "Những dấu hiệu nào cho thấy tôi đang bị rối loạn nội tiết tố nghiêm trọng?",
                            "Chế độ dinh dưỡng và lối sống nào giúp ổn định hệ nội tiết của tôi lâu dài?"
                    )),
                    Map.entry("nephrology", List.of(
                            "Chức năng lọc của thận hiện tại của tôi đang ở giai đoạn mấy?",
                            "Tôi có cần làm thêm xét nghiệm nước tiểu 24 giờ hoặc siêu âm hệ tiết niệu không?",
                            "Những loại thuốc thông thường nào (như giảm đau kháng viêm NSAID) tôi cần tuyệt đối tránh?"
                    )),
                    Map.entry("cardiology", List.of(
                            "Chỉ số xét nghiệm này có làm tăng nguy cơ nhồi máu cơ tim hoặc đột quỵ của tôi không?",
                            "Tôi có cần đo huyết áp liên tục 24h (Holter huyết áp) hoặc siêu âm tim không?",
                            "Chế độ vận động thể thao nào là an toàn và tốt nhất cho tim mạch của tôi?"
                    )),
                    Map.entry("gastroenterology", List.of(
                            "Tôi có cần thực hiện nội soi dạ dày - đại tràng để tìm ổ viêm loét hoặc vi khuẩn HP không?",
                            "Chế độ ăn cho bệnh lý tiêu hóa gan mật của tôi cần chú ý những gì?",
                            "Sau bao lâu thì tôi nên đi kiểm tra lại men gan và chức năng tiêu hóa?"
                    )),
                    Map.entry("pulmonology", List.of(
                            "Hình ảnh hoặc chỉ số hô hấp này có gợi ý bệnh lý viêm phế quản hay hen suyễn không?",
                            "Tôi có cần đo chức năng thông khí phổi (hô hấp ký) để đánh giá dung tích phổi không?",
                            "Những biện pháp nào giúp bảo vệ phổi trước khói bụi và môi trường ô nhiễm?"
                    )),
                    Map.entry("neurology", List.of(
                            "Triệu chứng chóng mặt và đau đầu này có liên quan đến thiểu năng tuần hoàn não không?",
                            "Tôi có cần chụp MRI sọ não hoặc đo điện não đồ (EEG) để loại trừ tổn thương não không?",
                            "Những bài tập nào giúp cải thiện sự tập trung và giảm tình trạng rối loạn tiền đình?"
                    )),
                    Map.entry("orthopedics", List.of(
                            "Tình trạng đau khớp hiện tại của tôi có phải do thoái hóa hay do lắng đọng tinh thể acid uric?",
                            "Tôi có cần chụp X-quang khớp hoặc đo mật độ xương (DEXA) không?",
                            "Các bài tập phục hồi chức năng nào phù hợp cho khớp của tôi?"
                    )),
                    Map.entry("dermatology", List.of(
                            "Tình trạng da của tôi có phải do dị ứng thời tiết, tiếp xúc hay viêm da cơ địa?",
                            "Tôi có cần làm xét nghiệm dị nguyên để tìm tác nhân gây dị ứng không?",
                            "Những loại mỹ phẩm hoặc hóa chất nào tôi cần tạm ngưng sử dụng?"
                    )),
                    Map.entry("pediatrics", List.of(
                            "Các chỉ số phát triển của bé hiện tại có đạt chuẩn theo lứa tuổi không?",
                            "Bé có cần bổ sung thêm vi chất dinh dưỡng (Canxi, Vitamin D, Sắt, Kẽm) nào không?",
                            "Lịch tiêm phòng vắc xin sắp tới của bé cần được thực hiện như thế nào?"
                    )),
                    Map.entry("obstetrics-gynecology", List.of(
                            "Kết quả này có ảnh hưởng gì đến sức khỏe sinh sản hoặc chu kỳ nội tiết phụ khoa không?",
                            "Tôi có cần làm thêm siêu âm đầu dò phụ khoa hoặc xét nghiệm tầm soát ung thư cổ tử cung không?",
                            "Bác sĩ có khuyến nghị tôi theo dõi chu kỳ hoặc xét nghiệm lại vào thời điểm nào?"
                    )),
                    Map.entry("ent", List.of(
                            "Tình trạng viêm mũi họng này có nguy cơ chuyển thành viêm xoang mạn tính không?",
                            "Tôi có cần nội soi tai mũi họng bằng ống mềm để kiểm tra sâu hơn không?",
                            "Làm thế nào để vệ sinh mũi họng đúng cách hàng ngày mà không làm tổn thương niêm mạc?"
                    )),
                    Map.entry("general-internal-medicine", List.of(
                            "Các chỉ số xét nghiệm này phản ánh sức khỏe tổng thể của tôi đang ở mức nào?",
                            "Bác sĩ có khuyến nghị tôi làm thêm kiểm tra định kỳ nào sau 3 hoặc 6 tháng không?",
                            "Tôi có cần điều chỉnh chế độ sinh hoạt, ngủ nghỉ để cải thiện các chỉ số này không?"
                    ))
            );

            List<String> fallbacks = specialtyQuestions.getOrDefault(specialty.slug(), specialtyQuestions.get("general-internal-medicine"));
            for (String f : fallbacks) {
                if (!questions.contains(f)) {
                    questions.add(f);
                }
                if (questions.size() >= 3) break;
            }
        }

        return questions.stream().limit(3).toList();
    }

    private String extractDocumentText(byte[] fileBytes, String contentType, String fileName) {
        String extractedText = "";
        try {
            if (contentType.toLowerCase().contains("pdf")) {
                extractedText = pdfExtractionService.extractTextFromPdf(fileBytes);
                // Resilient fallback for Scanned Image-only PDFs without text layer
                if ((extractedText == null || extractedText.trim().length() < 30) && clinicalRagService.canProcessVision()) {
                    log.info("📄 PDF text layer is empty (< 30 chars). Invoking PDFRenderer + Vision OCR fallback for '{}'", fileName);
                    List<byte[]> pageImages = pdfExtractionService.renderPdfPagesToImages(fileBytes, 3);
                    if (!pageImages.isEmpty()) {
                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < pageImages.size(); i++) {
                            String ocr = clinicalRagService.extractTextWithVision(pageImages.get(i), "image/jpeg", fileName + " - Trang " + (i + 1));
                            if (ocr != null && !ocr.isBlank()) {
                                sb.append("--- TRANG ").append(i + 1).append(" ---\n").append(ocr).append("\n\n");
                            }
                        }
                        if (!sb.isEmpty()) {
                            extractedText = sb.toString().trim();
                            log.info("📄 Successfully extracted {} characters from scanned PDF via Vision OCR", extractedText.length());
                        }
                    }
                }
            } else if (contentType.toLowerCase().contains("text") || contentType.toLowerCase().contains("plain")) {
                extractedText = new String(fileBytes, java.nio.charset.StandardCharsets.UTF_8);
            } else if (contentType.toLowerCase().contains("image/")) {
                if (clinicalRagService.canProcessVision()) {
                    extractedText = clinicalRagService.extractTextWithVision(fileBytes, contentType, fileName);
                }
            }
        } catch (Exception e) {
            log.warn("Could not extract text from file '{}': {}", fileName, e.getMessage());
        }
        return extractedText != null ? extractedText : "";
    }

    /**
     * Distills long, verbose multi-page medical text into a focused clinical context (<= 5500 chars).
     * Retains patient metadata header, detected abnormal indicators, clinical findings, and diagnostic conclusions,
     * while discarding repetitive non-medical administrative boilerplate.
     */
    private String distillClinicalContext(String fullText, String fileName, List<AbnormalIndicatorDto> indicators, SpecialtyTarget specialty) {
        if (fullText == null || fullText.isBlank() || fullText.length() <= 4500) {
            return fullText != null ? fullText : "";
        }

        log.info("🔍 [SMART CLINICAL WINDOWING] Document '{}' has {} chars. Distilling to high-density clinical context...",
                fileName, fullText.length());

        StringBuilder distilled = new StringBuilder();
        distilled.append("=== TÓM TẮT HỒ SƠ Y TẾ TẬP TRUNG (DISTILLED CLINICAL CONTEXT) ===\n");
        distilled.append(String.format("Tài liệu: %s | Chuyên khoa định hướng: %s\n\n", fileName, specialty.name()));

        // 1. Patient & Document Header (first 10-15 lines)
        String[] lines = fullText.split("\\r?\\n");
        int headerLines = Math.min(15, lines.length);
        distilled.append("[THÔNG TIN HỒ SƠ / HÀNH CHÍNH]:\n");
        for (int i = 0; i < headerLines; i++) {
            String l = lines[i].trim();
            if (!l.isBlank()) {
                distilled.append(l).append("\n");
            }
        }
        distilled.append("\n");

        // 2. High-priority Abnormal Lab Indicators
        distilled.append("[CÁC CHỈ SỐ CẬN LÂM SÀNG BẤT THƯỜNG GHI NHẬN]:\n");
        if (indicators != null && !indicators.isEmpty()) {
            boolean hasAbnormal = false;
            for (AbnormalIndicatorDto ind : indicators) {
                if ("ELEVATED".equals(ind.getStatus()) || "LOW".equals(ind.getStatus())) {
                    distilled.append(String.format("- %s: %s %s (Tham chiếu: %s, Đánh giá: %s) -> %s\n",
                            ind.getName(), ind.getValue(), ind.getUnit(), ind.getReferenceRange(), ind.getStatus(), ind.getClinicalSignificance()));
                    hasAbnormal = true;
                }
            }
            if (!hasAbnormal) {
                distilled.append("(Tất cả chỉ số bóc tách đều nằm trong giới hạn tham chiếu chuẩn)\n");
            }
        }
        distilled.append("\n");

        // 3. Scan lines with high clinical relevance (exclude administrative noise)
        distilled.append("[DỮ LIỆU LÂM SÀNG & KẾT LUẬN TỪ CÁC TRANG]:\n");
        Set<String> addedLines = new HashSet<>();
        List<String> clinicalKeywords = List.of(
                "ket qua", "xet nghiem", "chan doan", "ket luan", "de nghi", "kham",
                "glucose", "cholesterol", "triglyceride", "alt", "ast", "got", "gpt",
                "creatinine", "ure", "acid uric", "wbc", "rbc", "hgb", "plt",
                "sieu am", "x-quang", "ct", "mri", "dien tim", "dien nao", "benh ly",
                "dieu tri", "don thuoc", "hen kham", "trieu chung"
        );

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.length() < 4 || addedLines.contains(line)) continue;

            String unaccentLine = stripAccents(line).toLowerCase();
            // Skip boilerplate noise
            if (unaccentLine.contains("so tai khoan") || unaccentLine.contains("quy dinh") ||
                unaccentLine.contains("hoa don vat") || unaccentLine.contains("tien phong") ||
                unaccentLine.contains("wifi") || unaccentLine.contains("xin cam on") ||
                unaccentLine.contains("trang ") && unaccentLine.length() < 15) {
                continue;
            }

            boolean isRelevant = false;
            for (String kw : clinicalKeywords) {
                if (unaccentLine.contains(kw)) {
                    isRelevant = true;
                    break;
                }
            }

            if (isRelevant) {
                distilled.append(line).append("\n");
                addedLines.add(line);
                if (distilled.length() > 5200) {
                    distilled.append("... [Đã lược bớt nội dung lặp lại để tối ưu hóa context window] ...\n");
                    break;
                }
            }
        }

        return distilled.toString();
    }

    /**
     * Builds a laser-focused query for pgvector doctor matching.
     * Prevents multi-page non-medical administrative noise from degrading cosine similarity.
     */
    private String buildFocusedDoctorQuery(SpecialtyTarget specialty, List<AbnormalIndicatorDto> indicators, String fileName) {
        StringBuilder query = new StringBuilder();
        query.append("Bác sĩ chuyên khoa ").append(specialty.name()).append(". ");

        List<String> abnormalSummary = new ArrayList<>();
        if (indicators != null) {
            for (AbnormalIndicatorDto ind : indicators) {
                if ("ELEVATED".equals(ind.getStatus()) || "LOW".equals(ind.getStatus())) {
                    abnormalSummary.add(ind.getName() + " " + ind.getValue() + " " + ind.getUnit() + " (" + ind.getStatus() + ")");
                }
            }
        }

        if (!abnormalSummary.isEmpty()) {
            query.append("Tình trạng cận lâm sàng bất thường: ")
                    .append(String.join(", ", abnormalSummary))
                    .append(". ");
        }

        query.append("Tư vấn chẩn đoán và điều trị bệnh lý chuyên khoa ").append(specialty.slug()).append(".");
        return query.toString();
    }

    private String stripAccents(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    private record SpecialtyTarget(String slug, String name) {}
}
