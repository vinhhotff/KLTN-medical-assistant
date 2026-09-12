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

        // 3. Extract content from PDF, text or image stream
        String extractedText = "";
        try {
            if (contentType.toLowerCase().contains("pdf")) {
                extractedText = pdfExtractionService.extractTextFromPdf(fileBytes);
            } else if (contentType.toLowerCase().contains("text") || contentType.toLowerCase().contains("plain")) {
                extractedText = new String(fileBytes, java.nio.charset.StandardCharsets.UTF_8);
            } else if (contentType.toLowerCase().contains("image/")) {
                if (clinicalRagService.canProcessVision()) {
                    extractedText = clinicalRagService.extractTextWithVision(fileBytes, contentType, fileName);
                }
            }
        } catch (Exception e) {
            log.warn("Could not extract text from file: {}", e.getMessage());
        }

        // 4. Gatekeeper Validation (Invalid / Blurry / Non-medical filter)
        // If validation fails, throws AppException(400) -> User quota is NOT deducted!
        medicalDocumentValidator.validateDocument(fileBytes, contentType, extractedText, fileName);

        // 5. Cloud Storage Upload (Supabase Storage with resilient local fallback)
        String storageUrl = storageService.uploadDocument(fileBytes, fileName, contentType, user.getId());

        // 6. Semantic Doctor Retrieval via pgvector Cosine Similarity
        String queryForDoctorMatch = (extractedText != null && !extractedText.isBlank()) ? extractedText : fileName;
        List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(queryForDoctorMatch, 4);

        // 7. Clinical RAG Analysis (Retrieval-Augmented Generation with OpenRouter / Fallback Engine)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performDocumentRagAnalysis(extractedText, fileName, matchedDoctors);

        // 8. Integrate structured indicators and clinical findings
        List<AbnormalIndicatorDto> indicators = (ragResult.getIndicators() != null && !ragResult.getIndicators().isEmpty())
                ? ragResult.getIndicators()
                : parseIndicators(extractedText, fileName);

        SpecialtyTarget specialty = determineSpecialtyFromFindings(extractedText, fileName, indicators);
        String specialtySlug = ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank()
                ? ragResult.getRecommendedSpecialtySlug() : specialty.slug();
        String specialtyName = ragResult.getRecommendedSpecialtyName() != null && !ragResult.getRecommendedSpecialtyName().isBlank()
                ? ragResult.getRecommendedSpecialtyName() : specialty.name();
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

        // 1. Extract content from PDF, text or image stream
        String extractedText = "";
        try {
            if (contentType.toLowerCase().contains("pdf")) {
                extractedText = pdfExtractionService.extractTextFromPdf(fileBytes);
            } else if (contentType.toLowerCase().contains("text") || contentType.toLowerCase().contains("plain")) {
                extractedText = new String(fileBytes, java.nio.charset.StandardCharsets.UTF_8);
            } else if (contentType.toLowerCase().contains("image/")) {
                if (clinicalRagService.canProcessVision()) {
                    extractedText = clinicalRagService.extractTextWithVision(fileBytes, contentType, fileName);
                }
            }
        } catch (Exception e) {
            log.warn("Could not extract text in preview: {}", e.getMessage());
        }

        // 2. Strict Gatekeeper Validation (Rejects non-medical / unreadable images without guessing!)
        medicalDocumentValidator.validateDocument(fileBytes, contentType, extractedText, fileName);

        // 3. Semantic Doctor Retrieval via pgvector Cosine Similarity
        String queryForDoctorMatch = (extractedText != null && !extractedText.isBlank()) ? extractedText : fileName;
        List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(queryForDoctorMatch, 4);

        // 4. Clinical RAG Analysis (or Safe Deterministic Fallback)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performDocumentRagAnalysis(extractedText, fileName, matchedDoctors);

        // 5. Structure abnormal indicators
        List<AbnormalIndicatorDto> indicators = (ragResult.getIndicators() != null && !ragResult.getIndicators().isEmpty())
                ? ragResult.getIndicators()
                : parseIndicators(extractedText, fileName);

        SpecialtyTarget specialty = determineSpecialtyFromFindings(extractedText, fileName, indicators);
        String specialtySlug = ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank()
                ? ragResult.getRecommendedSpecialtySlug() : specialty.slug();
        String specialtyName = ragResult.getRecommendedSpecialtyName() != null && !ragResult.getRecommendedSpecialtyName().isBlank()
                ? ragResult.getRecommendedSpecialtyName() : specialty.name();
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

    private List<AbnormalIndicatorDto> parseIndicators(String text, String fileName) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        List<AbnormalIndicatorDto> list = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");

        record IndicatorDefinition(String name, String regex, String defaultUnit, String defaultRef,
                                   Double lowerBound, Double upperBound, String clinicalHigh, String clinicalLow) {}

        List<IndicatorDefinition> definitions = List.of(
                new IndicatorDefinition("Cholesterol toàn phần", "(?i)\\b(?:cholesterol(?:\\s*toan\\s*phan)?|total\\s*cholesterol)\\b", "mmol/L", "3.9 - 5.2", 3.9, 5.2,
                        "Tăng nguy cơ xơ vữa động mạch và bệnh lý tim mạch nếu kéo dài.", "Nồng độ cholesterol toàn phần thấp hơn bình thường."),
                new IndicatorDefinition("Triglyceride", "(?i)\\btriglycerid(?:e|es)?\\b", "mmol/L", "0.46 - 1.88", 0.46, 1.88,
                        "Chỉ số mỡ máu trung tính cao, liên quan đến chế độ ăn và chuyển hóa.", "Triglyceride huyết thanh thấp."),
                new IndicatorDefinition("HDL-Cholesterol", "(?i)\\bhdl(?:[\\s-]*cholesterol)?\\b", "mmol/L", "> 1.3", 1.3, null,
                        "Mức mỡ tốt bảo vệ tim mạch tối ưu.", "Chỉ số bảo vệ tim mạch giảm, cần tăng cường vận động thể lực."),
                new IndicatorDefinition("LDL-Cholesterol", "(?i)\\bldl(?:[\\s-]*cholesterol)?\\b", "mmol/L", "< 3.4", null, 3.4,
                        "Mỡ xấu tăng cao, tăng nguy cơ mảng bám xơ vữa thành mạch.", "Mức LDL trong giới hạn an toàn."),
                new IndicatorDefinition("Fasting Glucose", "(?i)\\b(?:(?:fasting\\s*)?glucose|duong\\s*huyet(?:\\s*luc\\s*doi)?|duong\\s*mau)\\b", "mmol/L", "3.9 - 6.4", 3.9, 6.4,
                        "Đường huyết tăng vượt ngưỡng, cần đối chiếu HbA1c và tầm soát đái tháo đường.", "Hạ đường huyết, cần theo dõi triệu chứng vã mồ hôi, hoa mắt."),
                new IndicatorDefinition("HbA1c", "(?i)\\bhba1c\\b", "%", "4.0 - 5.6", 4.0, 5.6,
                        "Kiểm soát đường huyết 3 tháng qua chưa tối ưu.", "Chỉ số bình thường."),
                new IndicatorDefinition("Men gan ALT (GPT)", "(?i)(?:men\\s*gan\\s*)?\\b(?:alt|gpt)\\b", "U/L", "0 - 41", 0.0, 41.0,
                        "Tổn thương tế bào gan cấp hoặc mạn tính (viêm gan, gan nhiễm mỡ, rượu bia).", "Chỉ số ALT bình thường."),
                new IndicatorDefinition("Men gan AST (GOT)", "(?i)(?:men\\s*gan\\s*)?\\b(?:ast|got)\\b", "U/L", "0 - 37", 0.0, 37.0,
                        "Men gan AST tăng liên quan tổn thương mô gan hoặc cơ tim.", "Chỉ số AST bình thường."),
                new IndicatorDefinition("Bilirubin toàn phần", "(?i)\\bbilirubin(?:\\s*toan\\s*phan)?\\b", "µmol/L", "5.1 - 17.0", 5.1, 17.0,
                        "Tăng sắc tố mật, theo dõi vàng da, tán huyết hoặc tắc mật.", "Chức năng bài tiết mật của gan vẫn duy trì bình thường."),
                new IndicatorDefinition("Creatinine huyết thanh", "(?i)\\bcreatinin(?:e)?\\b", "µmol/L", "62 - 106", 62.0, 106.0,
                        "Chức năng lọc cầu thận có dấu hiệu giảm, cần kiểm tra eGFR.", "Chức năng lọc cầu thận bình thường."),
                new IndicatorDefinition("Acid Uric", "(?i)\\b(?:acid\\s*uric|uric\\s*acid)\\b", "µmol/L", "200 - 420", 200.0, 420.0,
                        "Tăng acid uric máu, nguy cơ kết tinh urat tại khớp (Gout) hoặc thận.", "Chỉ số bình thường."),
                new IndicatorDefinition("Ure máu", "(?i)\\b(?:ure(?:a)?|bun)\\b", "mmol/L", "2.5 - 7.5", 2.5, 7.5,
                        "Phản ánh chức năng bài tiết ure và tình trạng dị hóa đạm.", "Chỉ số bình thường."),
                new IndicatorDefinition("Tổng lượng bạch cầu (WBC)", "(?i)\\b(?:wbc|bach\\s*cau|leukocyte)\\b", "G/L", "4.0 - 10.0", 4.0, 10.0,
                        "Bạch cầu tăng, phản ánh phản ứng viêm hoặc nhiễm khuẩn.", "Không ghi nhận phản ứng viêm nhiễm cấp tính."),
                new IndicatorDefinition("Hồng cầu (RBC)", "(?i)\\b(?:rbc|hong\\s*cau|erythrocyte)\\b", "T/L", "3.8 - 5.5", 3.8, 5.5,
                        "Đa hồng cầu hoặc cô đặc máu.", "Thiếu máu, giảm oxy nuôi dưỡng mô."),
                new IndicatorDefinition("Huyết sắc tố (Hb/HGB)", "(?i)\\b(?:hgb|hemoglobin)\\b", "g/L", "120 - 160", 120.0, 160.0,
                        "Tăng nồng độ huyết sắc tố.", "Biểu hiện thiếu máu, cần khảo sát nguyên nhân."),
                new IndicatorDefinition("Tiểu cầu (PLT)", "(?i)\\b(?:plt|tieu\\s*cau|platelet)\\b", "G/L", "150 - 400", 150.0, 400.0,
                        "Tăng tiểu cầu phản ứng.", "Giảm tiểu cầu, tăng nguy cơ xuất huyết.")
        );

        Set<String> detected = new HashSet<>();

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isBlank() || line.length() < 3) continue;

            for (IndicatorDefinition def : definitions) {
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

                    // Extract reference range if explicitly present on line
                    String refRange = def.defaultRef();
                    Matcher mRef = Pattern.compile("(?:tham\\s*chieu|binh\\s*thuong|reference)?\\s*[:(]\\s*([0-9]+[.,]?[0-9]*\\s*-\\s*[0-9]+[.,]?[0-9]*|[><]\\s*[0-9]+[.,]?[0-9]*)\\s*\\)?", Pattern.CASE_INSENSITIVE).matcher(line);
                    if (mRef.find()) {
                        refRange = mRef.group(1).trim();
                    }

                    // Extract unit if present
                    String unit = def.defaultUnit();
                    Matcher mUnit = Pattern.compile("(mmol/l|u/l|µmol/l|umol/l|g/l|t/l|%|mg/dl)", Pattern.CASE_INSENSITIVE).matcher(line);
                    if (mUnit.find()) {
                        unit = mUnit.group(1);
                    }

                    // Determine status (ELEVATED / LOW / NORMAL)
                    String status = "NORMAL";
                    String lineClean = stripAccents(line).toLowerCase();

                    // Check numerical value against parsed reference bounds
                    Double parsedLow = def.lowerBound();
                    Double parsedHigh = def.upperBound();

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

                    boolean hasExplicitElevated = lineClean.contains("tang") || lineClean.contains("cao") ||
                            lineClean.contains("high") || lineClean.contains("elevated") || lineClean.contains("(h)");
                    boolean hasExplicitLow = lineClean.contains("giam") || lineClean.contains("thap") ||
                            lineClean.contains("low") || lineClean.contains("(l)");

                    // Prioritize numerical bounds check: 85 > 41 is always ELEVATED even if label says "Bình thường: 0 - 41"
                    if (valNum != null && parsedHigh != null && valNum > parsedHigh) {
                        status = "ELEVATED";
                    } else if (valNum != null && parsedLow != null && valNum < parsedLow) {
                        status = "LOW";
                    } else if (hasExplicitElevated) {
                        status = "ELEVATED";
                    } else if (hasExplicitLow) {
                        status = "LOW";
                    } else {
                        status = "NORMAL";
                    }

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

        // Check for EEG / Neurology text findings if present
        String lowerText = (text + " " + fileName).toLowerCase();
        if ((lowerText.contains("dien nao") || lowerText.contains("eeg")) && !detected.contains("Điện não đồ (EEG)")) {
            Matcher mEeg = Pattern.compile("(?:eeg|dien\\s*nao)[^\\n]*?:?\\s*([^\\n]+)", Pattern.CASE_INSENSITIVE).matcher(text);
            String finding = mEeg.find() ? mEeg.group(1).trim() : "Rối loạn sóng chậm rải rác vùng thái dương";
            list.add(new AbnormalIndicatorDto("Điện não đồ (EEG)", finding, "-", "Sóng Alpha đồng đều", "ELEVATED",
                    "Ghi nhận rối loạn hoạt động điện sinh lý não vùng trán - thái dương."));
        }
        if ((lowerText.contains("luu huyet nao") || lowerText.contains("tuan hoan nao")) && !detected.contains("Lưu huyết não")) {
            list.add(new AbnormalIndicatorDto("Lưu huyết não", "Giảm lưu lượng tuần hoàn não", "%", "Đối xứng hai bên", "LOW",
                    "Biểu hiện thiểu năng tuần hoàn não, giảm cung cấp máu não thoáng qua."));
        }

        return list;
    }

    private SpecialtyTarget determineSpecialtyFromFindings(String text, String fileName, List<AbnormalIndicatorDto> indicators) {
        String combined = stripAccents((text + " " + fileName).toLowerCase());

        boolean hasElevatedLipid = indicators.stream()
                .anyMatch(i -> i.getName().toLowerCase().contains("cholesterol") && "ELEVATED".equals(i.getStatus()));
        boolean hasElevatedLiver = indicators.stream()
                .anyMatch(i -> (i.getName().toLowerCase().contains("alt") || i.getName().toLowerCase().contains("ast")) && "ELEVATED".equals(i.getStatus()));
        boolean hasNeuro = indicators.stream()
                .anyMatch(i -> i.getName().toLowerCase().contains("não") || i.getName().toLowerCase().contains("eeg"));

        if (hasElevatedLipid || combined.contains("tim") || combined.contains("lipid") || combined.contains("mach")) {
            return new SpecialtyTarget("cardiology", "Cardiology (Tim Mạch)");
        }
        if (hasElevatedLiver || combined.contains("gan") || combined.contains("tieu hoa") || combined.contains("da day")) {
            return new SpecialtyTarget("gastroenterology", "Gastroenterology (Tiêu Hóa - Gan Mật)");
        }
        if (hasNeuro || combined.contains("than kinh") || combined.contains("tien dinh") || combined.contains("dau")) {
            return new SpecialtyTarget("neurology", "Neurology (Thần Kinh)");
        }
        if (combined.contains("da") || combined.contains("di ung")) {
            return new SpecialtyTarget("dermatology", "Dermatology (Da Liễu)");
        }

        return new SpecialtyTarget("general-internal-medicine", "General Internal Medicine (Nội Tổng Quát)");
    }

    private String generateClinicalSummary(List<AbnormalIndicatorDto> indicators, SpecialtyTarget specialty) {
        long elevatedCount = indicators.stream().filter(i -> "ELEVATED".equals(i.getStatus())).count();
        long lowCount = indicators.stream().filter(i -> "LOW".equals(i.getStatus())).count();

        return String.format(
                "Kết quả phân tích tài liệu ghi nhận %d chỉ số tăng cao bất thường và %d chỉ số dưới ngưỡng chuẩn. " +
                "Tình trạng cận lâm sàng có tính chất khu trú ưu tiên thuộc chuyên khoa %s. Đề xuất bệnh nhân hội chẩn chuyên sâu để thiết lập phác đồ can thiệp phù hợp.",
                elevatedCount, lowCount, specialty.name()
        );
    }

    private String generatePlainLanguageExplanation(List<AbnormalIndicatorDto> indicators, SpecialtyTarget specialty) {
        StringBuilder sb = new StringBuilder();
        sb.append("Chào bạn! Dưới đây là giải thích đơn giản về kết quả xét nghiệm của bạn:\n");

        for (AbnormalIndicatorDto item : indicators) {
            if ("ELEVATED".equals(item.getStatus())) {
                sb.append(String.format("• %s: Đo được %s %s (vượt mức bình thường %s). Điều này cho thấy bạn đang có dấu hiệu tăng chỉ số cần được điều chỉnh lối sống hoặc dùng thuốc theo đơn.\n",
                        item.getName(), item.getValue(), item.getUnit(), item.getReferenceRange()));
            }
        }

        sb.append(String.format("👉 Khuyến nghị: Bạn nên trao đổi trực tiếp với Bác sĩ chuyên khoa %s để được giải thích kỹ hơn và kiểm tra xem có cần làm thêm xét nghiệm chuyên sâu nào không.", specialty.name()));
        return sb.toString();
    }

    private List<String> generateSuggestedQuestions(SpecialtyTarget specialty, List<AbnormalIndicatorDto> indicators) {
        if ("cardiology".equals(specialty.slug())) {
            return List.of(
                    "Với chỉ số mỡ máu hiện tại của tôi, tôi có bắt buộc phải dùng thuốc Statin hạ mỡ máu không?",
                    "Tôi có cần thực hiện thêm điện tâm đồ (ECG) hoặc siêu âm tim để tầm soát mảng xơ vữa không?",
                    "Chế độ ăn kiêng và tập luyện của tôi cần lưu ý hạn chế những nhóm thực phẩm nào cụ thể?"
            );
        } else if ("gastroenterology".equals(specialty.slug())) {
            return List.of(
                    "Chỉ số men gan của tôi tăng cao như vậy thì nguyên nhân thường gặp là gì (virus, bia rượu hay gan nhiễm mỡ)?",
                    "Tôi có cần làm thêm xét nghiệm kháng thể viêm gan B, C hoặc siêu âm ổ bụng không?",
                    "Tôi nên kiêng những loại đồ uống hoặc thuốc giảm đau nào để bảo vệ gan lúc này?"
            );
        } else if ("neurology".equals(specialty.slug())) {
            return List.of(
                    "Hiện tượng giảm lưu thông máu não này có nguy cơ dẫn đến đột quỵ thiếu máu thoáng qua không?",
                    "Tôi có nên chụp cộng hưởng từ (MRI sọ não) để kiểm tra kỹ hơn các mạch máu não không?",
                    "Những bài tập nào giúp cải thiện tình trạng chóng mặt và rối loạn tiền đình tốt nhất?"
            );
        }
        return List.of(
                "Các chỉ số xét nghiệm này phản ánh sức khỏe tổng thể của tôi đang ở mức nào?",
                "Bác sĩ có khuyến nghị tôi làm thêm kiểm tra định kỳ nào sau 3 hoặc 6 tháng không?",
                "Tôi có cần điều chỉnh chế độ sinh hoạt, ngủ nghỉ để cải thiện các chỉ số này không?"
        );
    }

    private String stripAccents(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    private record SpecialtyTarget(String slug, String name) {}
}
