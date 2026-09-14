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
import org.springframework.beans.factory.annotation.Autowired;
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
    private final SecurityRateLimiterService rateLimiterService;

    @org.springframework.beans.factory.annotation.Value("${app.pdf.max-pages:10}")
    private int maxPdfPages = 10;

    @Autowired
    public MedicalDocumentAnalysisService(PdfExtractionService pdfExtractionService,
                                          DoctorSemanticSearchService doctorSemanticSearchService,
                                          MedicalDocumentRepository medicalDocumentRepository,
                                          DocumentAnalysisRepository documentAnalysisRepository,
                                          UserRepository userRepository,
                                          ObjectMapper objectMapper,
                                          MedicalDocumentValidator medicalDocumentValidator,
                                          StorageService storageService,
                                          ClinicalRagService clinicalRagService,
                                          SecurityRateLimiterService rateLimiterService) {
        this.pdfExtractionService = pdfExtractionService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.documentAnalysisRepository = documentAnalysisRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.medicalDocumentValidator = medicalDocumentValidator;
        this.storageService = storageService;
        this.clinicalRagService = clinicalRagService;
        this.rateLimiterService = rateLimiterService;
    }

    public MedicalDocumentAnalysisService(PdfExtractionService pdfExtractionService,
                                          DoctorSemanticSearchService doctorSemanticSearchService,
                                          MedicalDocumentRepository medicalDocumentRepository,
                                          DocumentAnalysisRepository documentAnalysisRepository,
                                          UserRepository userRepository,
                                          ObjectMapper objectMapper,
                                          MedicalDocumentValidator medicalDocumentValidator,
                                          StorageService storageService,
                                          ClinicalRagService clinicalRagService) {
        this(pdfExtractionService, doctorSemanticSearchService, medicalDocumentRepository,
             documentAnalysisRepository, userRepository, objectMapper, medicalDocumentValidator,
             storageService, clinicalRagService, null);
    }

    private final java.util.concurrent.Semaphore ocrSemaphore = new java.util.concurrent.Semaphore(5, true);

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.beans.factory.annotation.Qualifier("medicalOcrExecutor")
    private java.util.concurrent.Executor medicalOcrExecutor;

    public void setMedicalOcrExecutor(java.util.concurrent.Executor medicalOcrExecutor) {
        this.medicalOcrExecutor = medicalOcrExecutor;
    }

    private DocumentAnalysisResponse buildCachedResponse(MedicalDocument existingDoc, String fallbackFileName) {
        Optional<DocumentAnalysis> existingAnalysisOpt = documentAnalysisRepository.findByDocumentId(existingDoc.getId());
        if (existingAnalysisOpt.isEmpty()) {
            return null;
        }
        DocumentAnalysis existingAnalysis = existingAnalysisOpt.get();

        // 🚨 STALE OFFLINE CACHE INVALIDATION: If previously processed in Safe Offline mode, do NOT serve stale cache
        String summary = existingAnalysis.getClinicalSummary();
        boolean isStaleOffline = summary != null && (
                summary.contains("Chế độ Ngoại tuyến") ||
                summary.contains("Ngoại tuyến") ||
                summary.contains("chưa kết nối API Key") ||
                summary.contains("chưa có kết nối mô hình")
        );
        if (isStaleOffline) {
            log.info("🔄 [STALE OFFLINE CACHE INVALIDATED] Existing analysis for document '{}' was generated in Safe Offline Fallback mode. Invalidating cache to trigger live Online AI analysis.", existingDoc.getFileName());
            return null;
        }

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
        resp.setFileName(existingDoc.getFileName() != null ? existingDoc.getFileName() : fallbackFileName);
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
        resp.setModelUsed("SHA-256 Deduplication Cache (0 LLM Tokens)");
        if (matchedDoctors != null && !matchedDoctors.isEmpty()) {
            resp.setDoctorRecommendationReason(matchedDoctors.get(0).getAiRecommendationReason());
        }

        if (existingAnalysis.getMetadataJson() != null && !existingAnalysis.getMetadataJson().isBlank()) {
            try {
                com.fasterxml.jackson.databind.JsonNode metaNode = objectMapper.readTree(existingAnalysis.getMetadataJson());
                if (metaNode.has("hospitalName") && !metaNode.get("hospitalName").isNull()) resp.setHospitalName(metaNode.get("hospitalName").asText());
                if (metaNode.has("departmentName") && !metaNode.get("departmentName").isNull()) resp.setDepartmentName(metaNode.get("departmentName").asText());
                if (metaNode.has("orderingDoctor") && !metaNode.get("orderingDoctor").isNull()) resp.setOrderingDoctor(metaNode.get("orderingDoctor").asText());
                if (metaNode.has("testDate") && !metaNode.get("testDate").isNull()) resp.setTestDate(metaNode.get("testDate").asText());
                if (metaNode.has("sidCode") && !metaNode.get("sidCode").isNull()) resp.setSidCode(metaNode.get("sidCode").asText());
                if (metaNode.has("patientName") && !metaNode.get("patientName").isNull()) resp.setPatientName(metaNode.get("patientName").asText());
                if (metaNode.has("patientAge") && !metaNode.get("patientAge").isNull()) resp.setPatientAge(metaNode.get("patientAge").asText());
                if (metaNode.has("patientGender") && !metaNode.get("patientGender").isNull()) resp.setPatientGender(metaNode.get("patientGender").asText());
                if (metaNode.has("deviceModel") && !metaNode.get("deviceModel").isNull()) resp.setDeviceModel(metaNode.get("deviceModel").asText());
            } catch (Exception ignored) {}
        }

        return resp;
    }

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
        MedicalDocument existingDoc = null;
        boolean isReanalyzingStaleOffline = false;

        if (existingDocOpt.isPresent()) {
            DocumentAnalysisResponse cachedResponse = buildCachedResponse(existingDocOpt.get(), fileName);
            if (cachedResponse != null) {
                log.info("⚡ [CACHE HIT - DEDUPLICATION] Document '{}' (hash: {}) previously analyzed for user {}. Returning cached result. 0 LLM tokens consumed.", fileName, fileHash, userEmail);
                return cachedResponse;
            }
            // If cachedResponse is null, it means the document was previously analyzed in Safe Offline Fallback mode.
            // In this case, we allow re-analysis with online AI without charging the user's scan quota again.
            existingDoc = existingDocOpt.get();
            isReanalyzingStaleOffline = true;
            log.info("🔄 [RE-ANALYZING STALE OFFLINE] Existing document '{}' found for user {}, but cached analysis was offline fallback. Re-analyzing with live online AI without charging additional quota.", fileName, userEmail);
        }

        // 3. Atomic Quota Pre-check & Reservation (Anti-Abuse & Race Condition Shield)
        boolean isVip = user.isVipActive();
        boolean quotaDeducted = false;
        if (!isVip && !isReanalyzingStaleOffline) {
            int rowsUpdated = userRepository.deductScanQuota(user.getId());
            if (rowsUpdated == 0) {
                log.warn("🚫 [QUOTA EXCEEDED] User {} has 0 scan quota and is not an active VIP subscriber.", userEmail);
                throw new com.mediassist.common.AppException(
                        org.springframework.http.HttpStatus.PAYMENT_REQUIRED,
                        "QUOTA_EXCEEDED",
                        "Bạn đã sử dụng hết lượt phân tích tài liệu miễn phí. Vui lòng mua gói quét lẻ (29.000đ) hoặc nâng cấp MediPass VIP (149.000đ/tháng) để tiếp tục."
                );
            }
            quotaDeducted = true;
            log.info("💳 Atomically deducted 1 scan quota for user {}. Starting analysis pipeline.", userEmail);
        }

        String storageUrl = null;
        MedicalDocument medDoc = null;
        try {
            // 4. Extract content from PDF, text or image stream (with scanned PDF fallback)
            String extractedText = extractDocumentText(fileBytes, contentType, fileName);

            // 5. Gatekeeper Validation (Invalid / Blurry / Non-medical filter)
            // If validation fails, throws AppException(400) -> Compensating action restores quota!
            medicalDocumentValidator.validateDocument(fileBytes, contentType, extractedText, fileName);

            // 6. Dynamic Metadata Extraction from raw text
            Map<String, String> rawMeta = extractDocumentMetadata(extractedText);
            String patientGender = rawMeta.get("patientGender");

            // 7. Comprehensive Lab Scanning across all pages (columnar, delimiter & tab parsers)
            List<AbnormalIndicatorDto> parsedIndicators = parseIndicators(extractedText, fileName, patientGender);

            // 8. Smart Clinical Windowing for Multi-Page Verbose Documents
            String clinicalContext = distillClinicalContext(extractedText, fileName, parsedIndicators);

            // 9. AI-First Clinical Reasoning via Gemini / OpenRouter (or Safe Deterministic Fallback if offline)
            // NOTICE: AI processing happens completely in-memory on byte[] BEFORE any cloud upload!
            com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performDocumentRagAnalysis(clinicalContext, fileName, Collections.emptyList());

            // 10. Derive specialty and findings strictly from AI reasoning with clinical safety gating
            List<AbnormalIndicatorDto> indicators = (ragResult.getIndicators() != null && !ragResult.getIndicators().isEmpty())
                    ? ragResult.getIndicators()
                    : parsedIndicators;

            boolean hasClinicalIndicators = indicators != null && !indicators.isEmpty();

            String specialtySlug;
            String specialtyName;
            List<DoctorMatchDto> matchedDoctors;

            if (hasClinicalIndicators) {
                specialtySlug = (ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank())
                        ? ragResult.getRecommendedSpecialtySlug().toLowerCase().trim()
                        : "general-internal-medicine";
                specialtyName = (ragResult.getRecommendedSpecialtyName() != null && !ragResult.getRecommendedSpecialtyName().isBlank())
                        ? ragResult.getRecommendedSpecialtyName()
                        : getSpecialtyDisplayName(specialtySlug);

                // Focused pgvector Doctor Retrieval based on AI-reasoned specialty & abnormal indicators
                String focusedDoctorQuery = buildFocusedDoctorQuery(specialtySlug, specialtyName, indicators, fileName);
                matchedDoctors = doctorSemanticSearchService.searchDoctors(focusedDoctorQuery, 4);

                if (matchedDoctors != null && !matchedDoctors.isEmpty()) {
                    DoctorMatchDto top = matchedDoctors.get(0);
                    top.setAiRecommended(true);
                    top.setAiRecommendationReason(
                            ragResult.getDoctorRecommendationReason() != null && !ragResult.getDoctorRecommendationReason().isBlank()
                                    ? ragResult.getDoctorRecommendationReason()
                                    : "Bác sĩ có chuyên môn sâu về " + specialtyName + ", kinh nghiệm điều trị các ca lâm sàng có chỉ số bất thường tương tự."
                    );
                    ragResult.setDoctorRecommendationReason(top.getAiRecommendationReason());
                }
            } else {
                // CRITICAL MEDICAL INTEGRITY RULE: Zero Fake Recommendations on blank / blurry documents
                specialtySlug = null;
                specialtyName = "Chưa xác định (Cần bổ sung kết quả)";
                matchedDoctors = Collections.emptyList();
                ragResult.setRecommendedDoctorId(null);
                ragResult.setDoctorRecommendationReason("Không đủ cơ sở lâm sàng để đề xuất bác sĩ do tài liệu chưa có chỉ số kết quả xét nghiệm cụ thể hoặc hình ảnh quá mờ để nhận diện số liệu.");
            }

            String clinicalSummary = (ragResult.getClinicalSummary() != null && !ragResult.getClinicalSummary().isBlank())
                    ? ragResult.getClinicalSummary()
                    : (hasClinicalIndicators ? generateClinicalSummary(indicators, specialtyName) : "Tài liệu y tế chưa ghi nhận kết quả đo lường cụ thể hoặc hình ảnh quá mờ để nhận diện số liệu. Hệ thống không chỉ định chuyên khoa và bác sĩ khi thiếu dữ liệu lâm sàng.");

            String plainExplanation = (ragResult.getPlainLanguageExplanation() != null && !ragResult.getPlainLanguageExplanation().isBlank())
                    ? ragResult.getPlainLanguageExplanation()
                    : (hasClinicalIndicators ? generatePlainLanguageExplanation(indicators, specialtyName) : "⚠️ Thông báo an toàn y tế: Phiếu xét nghiệm của bạn chưa có kết quả đo lường (phiếu chỉ định trắng hoặc hình ảnh mờ không đọc được số liệu). Để bảo đảm an toàn và không chẩn đoán sai lệch, hệ thống chưa đề xuất chuyên khoa và bác sĩ. Vui lòng chụp lại ảnh rõ nét hoặc tải phiếu có kết quả đầy đủ từ bệnh viện.");

            List<String> suggestedQuestions = (ragResult.getSuggestedQuestions() != null && !ragResult.getSuggestedQuestions().isEmpty())
                    ? ragResult.getSuggestedQuestions() : generateSuggestedQuestions(indicators);

            // Dynamic Metadata Consolidation
            String finalHospital = (ragResult.getHospitalName() != null && !ragResult.getHospitalName().isBlank())
                    ? ragResult.getHospitalName() : rawMeta.get("hospitalName");
            String finalDept = (ragResult.getDepartmentName() != null && !ragResult.getDepartmentName().isBlank())
                    ? ragResult.getDepartmentName() : rawMeta.get("departmentName");
            String finalDoc = (ragResult.getOrderingDoctor() != null && !ragResult.getOrderingDoctor().isBlank())
                    ? ragResult.getOrderingDoctor() : rawMeta.get("orderingDoctor");
            String finalDate = (ragResult.getTestDate() != null && !ragResult.getTestDate().isBlank())
                    ? ragResult.getTestDate() : rawMeta.get("testDate");
            String finalSid = (ragResult.getSidCode() != null && !ragResult.getSidCode().isBlank())
                    ? ragResult.getSidCode() : rawMeta.get("sidCode");
            String finalPat = (ragResult.getPatientName() != null && !ragResult.getPatientName().isBlank())
                    ? ragResult.getPatientName() : rawMeta.get("patientName");
            String finalAge = (ragResult.getPatientAge() != null && !ragResult.getPatientAge().isBlank())
                    ? ragResult.getPatientAge() : rawMeta.get("patientAge");
            String finalGender = (ragResult.getPatientGender() != null && !ragResult.getPatientGender().isBlank())
                    ? ragResult.getPatientGender() : rawMeta.get("patientGender");
            String finalDev = (ragResult.getDeviceModel() != null && !ragResult.getDeviceModel().isBlank())
                    ? ragResult.getDeviceModel() : rawMeta.get("deviceModel");

            Map<String, String> metadataMap = new HashMap<>();
            if (finalHospital != null) metadataMap.put("hospitalName", finalHospital);
            if (finalDept != null) metadataMap.put("departmentName", finalDept);
            if (finalDoc != null) metadataMap.put("orderingDoctor", finalDoc);
            if (finalDate != null) metadataMap.put("testDate", finalDate);
            if (finalSid != null) metadataMap.put("sidCode", finalSid);
            if (finalPat != null) metadataMap.put("patientName", finalPat);
            if (finalAge != null) metadataMap.put("patientAge", finalAge);
            if (finalGender != null) metadataMap.put("patientGender", finalGender);
            if (finalDev != null) metadataMap.put("deviceModel", finalDev);

            // 11. LAZY CLOUD UPLOAD & PERSISTENCE
            // Architecture Rule: ONLY upload to Supabase Cloud when AI analysis has 100% SUCCEEDED!
            if (isReanalyzingStaleOffline && existingDoc != null) {
                medDoc = existingDoc;
                if (medDoc.getStorageUrl() == null || medDoc.getStorageUrl().isBlank()) {
                    storageUrl = storageService.uploadDocument(fileBytes, fileName, contentType, user.getId());
                    medDoc.setStorageUrl(storageUrl);
                    medDoc = medicalDocumentRepository.save(medDoc);
                } else {
                    storageUrl = medDoc.getStorageUrl();
                }
            } else {
                storageUrl = storageService.uploadDocument(fileBytes, fileName, contentType, user.getId());

                medDoc = new MedicalDocument();
                medDoc.setUser(user);
                medDoc.setFileName(fileName);
                medDoc.setFileSizeBytes(size);
                medDoc.setContentType(contentType);
                medDoc.setFileHash(fileHash);
                medDoc.setStorageUrl(storageUrl);
                medDoc.setValidMedical(true);
                medDoc.setStatus("PROCESSED");
                try {
                    medDoc = medicalDocumentRepository.saveAndFlush(medDoc);
                } catch (org.springframework.dao.DataIntegrityViolationException dive) {
                    log.warn("⚡ [RACE CONDITION RECOVERY] Concurrent duplicate upload detected for user {} with file hash {}. Rolling back duplicate and serving winner cached record.", userEmail, fileHash);
                    // 1. Compensating action: Restore scan quota that was deducted for this request
                    if (quotaDeducted) {
                        try {
                            userRepository.restoreScanQuota(user.getId());
                            quotaDeducted = false;
                            log.info("💳 [RACE RECOVERY] Restored deducted quota for duplicate upload of user {}", userEmail);
                        } catch (Exception restoreEx) {
                            log.error("Failed to restore quota during deduplication collision recovery: {}", restoreEx.getMessage());
                        }
                    }
                    // 2. Compensating action: Clean up redundant cloud storage upload
                    if (storageUrl != null) {
                        try {
                            storageService.deleteDocument(storageUrl);
                            storageUrl = null;
                        } catch (Exception delEx) {
                            log.error("Failed to delete duplicate storage file: {}", delEx.getMessage());
                        }
                    }
                    // 3. Gracefully retrieve the winning document and return its cached analysis
                    for (int attempt = 0; attempt < 5; attempt++) {
                        Optional<MedicalDocument> winnerDoc = medicalDocumentRepository.findFirstByUserIdAndFileHashOrderByCreatedAtDesc(user.getId(), fileHash);
                        if (winnerDoc.isPresent()) {
                            DocumentAnalysisResponse cached = buildCachedResponse(winnerDoc.get(), fileName);
                            if (cached != null) {
                                log.info("⚡ [RACE RECOVERY SUCCESS] Successfully returned concurrent winner analysis for user {}", userEmail);
                                return cached;
                            }
                        }
                        try {
                            Thread.sleep(150);
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            break;
                        }
                    }
                    throw dive;
                }
            }

            final MedicalDocument targetDoc = medDoc;
            Optional<DocumentAnalysis> existingAnalysisOpt = documentAnalysisRepository.findByDocumentId(targetDoc.getId());
            DocumentAnalysis analysis = existingAnalysisOpt.orElseGet(() -> {
                DocumentAnalysis da = new DocumentAnalysis();
                da.setDocument(targetDoc);
                return da;
            });
            analysis.setClinicalSummary(clinicalSummary);
            analysis.setPlainLanguageExplanation(plainExplanation);
            analysis.setRecommendedSpecialtySlug(specialtySlug);
            analysis.setRecommendedSpecialtyName(specialtyName);

            try {
                analysis.setMetadataJson(objectMapper.writeValueAsString(metadataMap));
                analysis.setAbnormalIndicatorsJson(objectMapper.writeValueAsString(indicators));
                analysis.setSuggestedQuestionsJson(objectMapper.writeValueAsString(suggestedQuestions));
            } catch (Exception e) {
                analysis.setAbnormalIndicatorsJson("[]");
                analysis.setSuggestedQuestionsJson("[]");
            }
            documentAnalysisRepository.save(analysis);

            if (rateLimiterService != null) {
                rateLimiterService.recordSuccessfulUpload(userEmail);
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
            response.setRecommendedSpecialtySlug(specialtySlug);
            response.setRecommendedSpecialtyName(specialtyName);
            response.setSuggestedQuestions(suggestedQuestions);
            response.setMatchedDoctors(matchedDoctors);
            response.setStorageUrl(storageUrl);
            response.setCachedResult(false);
            response.setModelUsed(ragResult.getModelUsed());
            response.setDoctorRecommendationReason(ragResult.getDoctorRecommendationReason());

            // Dynamic Clinical Metadata
            response.setHospitalName(finalHospital);
            response.setDepartmentName(finalDept);
            response.setOrderingDoctor(finalDoc);
            response.setTestDate(finalDate);
            response.setSidCode(finalSid);
            response.setPatientName(finalPat);
            response.setPatientAge(finalAge);
            response.setPatientGender(finalGender);
            response.setDeviceModel(finalDev);
            response.setPiiProtected(ragResult.isPiiProtected());
            response.setPiiEntitiesCount(ragResult.getPiiEntitiesCount());
            response.setPiiMaskedTypes(ragResult.getPiiMaskedTypes());

            return response;

        } catch (Exception e) {
            if (quotaDeducted) {
                try {
                    userRepository.restoreScanQuota(user.getId());
                    log.info("💳 [COMPENSATING ACTION] Restored 1 scan quota for user {} due to pipeline failure: {}", userEmail, e.getMessage());
                } catch (Exception restoreEx) {
                    log.error("Failed to restore scan quota for user {}: {}", userEmail, restoreEx.getMessage());
                }
            }
            if (storageUrl != null) {
                log.warn("🚨 [ROLLBACK COMPENSATING ACTION] Pipeline failure after cloud upload. Deleting orphan file: {}", storageUrl);
                try {
                    storageService.deleteDocument(storageUrl);
                } catch (Exception deleteEx) {
                    log.error("Failed to delete orphan file: {}", deleteEx.getMessage());
                }
            }
            if (medDoc != null && medDoc.getId() != null) {
                try {
                    medicalDocumentRepository.delete(medDoc);
                } catch (Exception deleteDocEx) {
                    log.error("Failed to rollback saved medical document: {}", deleteDocEx.getMessage());
                }
            }
            if (rateLimiterService != null) {
                rateLimiterService.recordFailedUpload(userEmail);
            }
            throw e;
        }
    }

    /**
     * Instant document analysis preview for testing & Landing Page without requiring patient login or quota deduction.
     * Enforces strict medical validation, real PDF/OCR extraction, and real pgvector doctor matching.
     */
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

        // 3. Dynamic Metadata Extraction from raw text
        Map<String, String> rawMeta = extractDocumentMetadata(extractedText);
        String patientGender = rawMeta.get("patientGender");

        // 4. Comprehensive Lab Scanning across all pages (columnar, delimiter & tab parsers)
        List<AbnormalIndicatorDto> parsedIndicators = parseIndicators(extractedText, fileName, patientGender);

        // 5. Smart Clinical Windowing for Multi-Page Verbose Documents
        String clinicalContext = distillClinicalContext(extractedText, fileName, parsedIndicators);

        // 6. AI-First Clinical Reasoning via Gemini / OpenRouter (or Safe Deterministic Fallback if offline)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performDocumentRagAnalysis(clinicalContext, fileName, Collections.emptyList());

        // 7. Derive specialty and findings strictly from AI reasoning with clinical safety gating
        List<AbnormalIndicatorDto> indicators = (ragResult.getIndicators() != null && !ragResult.getIndicators().isEmpty())
                ? ragResult.getIndicators()
                : parsedIndicators;

        boolean hasClinicalIndicators = indicators != null && !indicators.isEmpty();

        String specialtySlug;
        String specialtyName;
        List<DoctorMatchDto> matchedDoctors;

        if (hasClinicalIndicators) {
            specialtySlug = (ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank())
                    ? ragResult.getRecommendedSpecialtySlug().toLowerCase().trim()
                    : "general-internal-medicine";
            specialtyName = (ragResult.getRecommendedSpecialtyName() != null && !ragResult.getRecommendedSpecialtyName().isBlank())
                    ? ragResult.getRecommendedSpecialtyName()
                    : getSpecialtyDisplayName(specialtySlug);

            // 8. Focused pgvector Doctor Retrieval based on AI-reasoned specialty & abnormal indicators
            String focusedDoctorQuery = buildFocusedDoctorQuery(specialtySlug, specialtyName, indicators, fileName);
            matchedDoctors = doctorSemanticSearchService.searchDoctors(focusedDoctorQuery, 4);

            if (matchedDoctors != null && !matchedDoctors.isEmpty()) {
                DoctorMatchDto top = matchedDoctors.get(0);
                top.setAiRecommended(true);
                String reason = (ragResult.getDoctorRecommendationReason() != null && !ragResult.getDoctorRecommendationReason().isBlank())
                        ? ragResult.getDoctorRecommendationReason()
                        : buildClinicalDoctorRecommendationReason(top, specialtyName, indicators);
                top.setAiRecommendationReason(reason);
                ragResult.setRecommendedDoctorId(top.getDoctorId());
                ragResult.setDoctorRecommendationReason(reason);
            }
        } else {
            // CRITICAL MEDICAL INTEGRITY RULE: Zero Fake Recommendations on blank / blurry documents
            specialtySlug = null;
            specialtyName = "Chưa xác định (Cần bổ sung kết quả)";
            matchedDoctors = Collections.emptyList();
            ragResult.setRecommendedDoctorId(null);
            ragResult.setDoctorRecommendationReason("Không đủ cơ sở lâm sàng để đề xuất bác sĩ do tài liệu chưa có chỉ số kết quả xét nghiệm cụ thể hoặc hình ảnh quá mờ để nhận diện số liệu.");
        }

        String clinicalSummary = (ragResult.getClinicalSummary() != null && !ragResult.getClinicalSummary().isBlank())
                ? ragResult.getClinicalSummary()
                : (hasClinicalIndicators ? generateClinicalSummary(indicators, specialtyName) : "Tài liệu y tế chưa ghi nhận kết quả đo lường cụ thể hoặc hình ảnh quá mờ để nhận diện số liệu. Hệ thống không chỉ định chuyên khoa và bác sĩ khi thiếu dữ liệu lâm sàng.");

        String plainExplanation = (ragResult.getPlainLanguageExplanation() != null && !ragResult.getPlainLanguageExplanation().isBlank())
                ? ragResult.getPlainLanguageExplanation()
                : (hasClinicalIndicators ? generatePlainLanguageExplanation(indicators, specialtyName) : "⚠️ Thông báo an toàn y tế: Phiếu xét nghiệm của bạn chưa có kết quả đo lường (phiếu chỉ định trắng hoặc hình ảnh mờ không đọc được số liệu). Để bảo đảm an toàn và không chẩn đoán sai lệch, hệ thống chưa đề xuất chuyên khoa và bác sĩ. Vui lòng chụp lại ảnh rõ nét hoặc tải phiếu có kết quả đầy đủ từ bệnh viện.");

        List<String> suggestedQuestions = (ragResult.getSuggestedQuestions() != null && !ragResult.getSuggestedQuestions().isEmpty())
                ? ragResult.getSuggestedQuestions() : generateSuggestedQuestions(indicators);

        // Dynamic Metadata Consolidation
        String finalHospital = (ragResult.getHospitalName() != null && !ragResult.getHospitalName().isBlank())
                ? ragResult.getHospitalName() : rawMeta.get("hospitalName");
        String finalDept = (ragResult.getDepartmentName() != null && !ragResult.getDepartmentName().isBlank())
                ? ragResult.getDepartmentName() : rawMeta.get("departmentName");
        String finalDoc = (ragResult.getOrderingDoctor() != null && !ragResult.getOrderingDoctor().isBlank())
                ? ragResult.getOrderingDoctor() : rawMeta.get("orderingDoctor");
        String finalDate = (ragResult.getTestDate() != null && !ragResult.getTestDate().isBlank())
                ? ragResult.getTestDate() : rawMeta.get("testDate");
        String finalSid = (ragResult.getSidCode() != null && !ragResult.getSidCode().isBlank())
                ? ragResult.getSidCode() : rawMeta.get("sidCode");
        String finalPat = (ragResult.getPatientName() != null && !ragResult.getPatientName().isBlank())
                ? ragResult.getPatientName() : rawMeta.get("patientName");
        String finalAge = (ragResult.getPatientAge() != null && !ragResult.getPatientAge().isBlank())
                ? ragResult.getPatientAge() : rawMeta.get("patientAge");
        String finalGender = (ragResult.getPatientGender() != null && !ragResult.getPatientGender().isBlank())
                ? ragResult.getPatientGender() : rawMeta.get("patientGender");
        String finalDev = (ragResult.getDeviceModel() != null && !ragResult.getDeviceModel().isBlank())
                ? ragResult.getDeviceModel() : rawMeta.get("deviceModel");

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

        // Dynamic Clinical Metadata
        response.setHospitalName(finalHospital);
        response.setDepartmentName(finalDept);
        response.setOrderingDoctor(finalDoc);
        response.setTestDate(finalDate);
        response.setSidCode(finalSid);
        response.setPatientName(finalPat);
        response.setPatientAge(finalAge);
        response.setPatientGender(finalGender);
        response.setDeviceModel(finalDev);
        response.setPiiProtected(ragResult.isPiiProtected());
        response.setPiiEntitiesCount(ragResult.getPiiEntitiesCount());
        response.setPiiMaskedTypes(ragResult.getPiiMaskedTypes());

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

        boolean isVip = user.isVipActive();
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
        boolean isVip = updated.isVipActive();
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

    /**
     * Extracts administrative clinical metadata directly from the document header lines:
     * Hospital Name, Department, Ordering Doctor, Test Date, SID, Patient Name, Age, Gender, Device Model.
     */
    public Map<String, String> extractDocumentMetadata(String text) {
        Map<String, String> meta = new HashMap<>();
        if (text == null || text.isBlank()) return meta;

        // Hospital / Clinic Name: matches "Bệnh viện ...", "BV ...", "Trung tâm y tế ...", "Phòng khám ..."
        Matcher mHosp = Pattern.compile("(?ium)^[ \\t]*((?:bệnh\\s*viện|bv|trung\\s*tâm\\s*y\\s*tế|phòng\\s*khám|hospital|clinic)[ \\t]*[:–-]?[ \\t]*[^\\r\\n]{3,80})").matcher(text);
        if (mHosp.find()) {
            meta.put("hospitalName", mHosp.group(1).trim());
        }

        // Department:
        Matcher mDept = Pattern.compile("(?ium)^[ \\t]*((?:khoa|phòng|department)[ \\t]*[:–-]?[ \\t]*[^\\r\\n]{3,60})").matcher(text);
        if (mDept.find()) {
            meta.put("departmentName", mDept.group(1).trim());
        }

        // Ordering Doctor:
        Matcher mDoc = Pattern.compile("(?ium)(?:bác\\s*sĩ\\s*chỉ\\s*định|bs\\s*chỉ\\s*định|bác\\s*sĩ\\s*điều\\s*trị|bác\\s*sĩ|người\\s*ký|doctor)\\s*[:–-]?[ \\t]*([\\p{L}\\p{M}0-9_\\-. ]{3,40})").matcher(text);
        if (mDoc.find()) {
            meta.put("orderingDoctor", mDoc.group(1).trim());
        }

        // Test Date:
        Matcher mDate = Pattern.compile("(?ium)(?:ngày\\s*xét\\s*nghiệm|ngày\\s*lấy\\s*mẫu|ngày|thời\\s*gian|date|time)\\s*[:–-]?[ \\t]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}(?:[ \\t]+[0-9]{1,2}:[0-9]{1,2}(?::[0-9]{1,2})?)?)").matcher(text);
        if (mDate.find()) {
            meta.put("testDate", mDate.group(1).trim());
        }

        // SID / Barcode:
        Matcher mSid = Pattern.compile("(?ium)(?:mã\\s*sid|sid|mã\\s*xn|mã\\s*bn|số\\s*phiếu|barcode|stt)\\s*[:–-]?[ \\t]*([A-Za-z0-9_\\-]{3,25})").matcher(text);
        if (mSid.find()) {
            meta.put("sidCode", mSid.group(1).trim());
        }

        // Patient Name:
        Matcher mPatient = Pattern.compile("(?ium)(?:họ\\s*(?:và|&)?\\s*tên(?:\\s*bn|\\s*bệnh\\s*nhân)?|tên\\s*bệnh\\s*nhân|patient\\s*name)\\s*[:–-]?[ \\t]*([\\p{L}\\p{M} ]{3,40})").matcher(text);
        if (mPatient.find()) {
            meta.put("patientName", mPatient.group(1).trim());
        }

        // Patient Age:
        Matcher mAge = Pattern.compile("(?ium)(?:tuổi|tuoi|age)\\s*[:–-]?[ \\t]*([0-9]{1,3})\\b").matcher(text);
        if (mAge.find()) {
            meta.put("patientAge", mAge.group(1).trim());
        }

        // Patient Gender:
        Matcher mGender = Pattern.compile("(?ium)(?:giới\\s*tính|gioi\\s*tinh|gender|sex)\\s*[:–-]?[ \\t]*(nam|nữ|nu|male|female)(?:[^\\p{L}]|$)").matcher(text);
        if (mGender.find()) {
            String g = mGender.group(1).trim();
            meta.put("patientGender", (stripAccents(g).equalsIgnoreCase("nam") || g.equalsIgnoreCase("male")) ? "Nam" : "Nữ");
        }

        // Device Model:
        Matcher mDev = Pattern.compile("(?ium)(?:thiết\\s*bị|máy\\s*xn|máy\\s*xét\\s*nghiệm|máy\\s*tự\\s*động|analyzer|instrument)\\s*[:–-]?[ \\t]*([^\\r\\n]{3,40})").matcher(text);
        if (mDev.find()) {
            meta.put("deviceModel", mDev.group(1).trim());
        }

        return meta;
    }

    /**
     * Universal Dynamic Laboratory Indicator Extractor.
     * Operates with Multi-Pattern Resilient Strategy (Delimiter, Columnar, Tabular),
     * numeric values, units, reference ranges, and qualitative findings directly from the document.
     */
    public List<AbnormalIndicatorDto> parseIndicators(String text, String fileName) {
        return parseIndicators(text, fileName, null);
    }

    public List<AbnormalIndicatorDto> parseIndicators(String text, String fileName, String patientGender) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        List<AbnormalIndicatorDto> list = new ArrayList<>();
        String[] lines = text.split("\\r?\\n");
        Set<String> detected = new HashSet<>();

        // Pattern 1: Space-separated Table Row (Name Value Unit RefRange Remainder/Status)
        // Highly resilient for single-space PDFBox extraction: "Glucose huyet doi 9.6 mmol/L 3.9 - 6.4 [!] TANG CAO"
        Pattern tableRowPattern = Pattern.compile(
                "^\\s*(?:[0-9]+[.)-]|[-*•])?\\s*([\\p{L}\\p{M}0-9_\\-\\s()/+]{2,35}?)\\s+([0-9]+[.,]?[0-9]*)(?:\\s+([a-zA-Zµ/%]+(?:/[a-zA-Z0-9.]+)?))?\\s+([0-9]+[.,]?[0-9]*\\s*-\\s*[0-9]+[.,]?[0-9]*|[><=]\\s*[0-9]+[.,]?[0-9]*)(?:\\s+(.*))?$",
                Pattern.CASE_INSENSITIVE
        );

        // Pattern 2: Delimiter-based (Name : Value Unit RefRange or Name = Value, or Name - Value preceded by letter)
        Pattern genericPattern = Pattern.compile(
                "^\\s*(?:[0-9]+[.)-]|[-*•])?\\s*([\\p{L}\\p{M}0-9_\\-\\s()/+]{2,45}?)(?:\\s*[:=]\\s*|(?<=[\\p{L}\\)])\\s*[-–]\\s*)([0-9]+[.,]?[0-9]*)\\s*([a-zA-Zµ/%]+(?:/[a-zA-Z0-9.]+)?)*(.*)$",
                Pattern.CASE_INSENSITIVE
        );

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.length() < 5) continue;

            String candidateName = null;
            String valStr = null;
            String unit = "";
            String remainder = "";

            Matcher mTableRow = tableRowPattern.matcher(line);
            Matcher mGeneric = genericPattern.matcher(line);

            if (mTableRow.find()) {
                candidateName = mTableRow.group(1).trim();
                valStr = mTableRow.group(2).replace(',', '.');
                unit = mTableRow.group(3) != null ? mTableRow.group(3).trim() : "";
                String directRef = mTableRow.group(4) != null ? mTableRow.group(4).trim() : "";
                String rest = mTableRow.group(5) != null ? mTableRow.group(5).trim() : "";
                remainder = (directRef + " " + rest).trim();
            } else if (mGeneric.find()) {
                candidateName = mGeneric.group(1).trim();
                valStr = mGeneric.group(2).replace(',', '.');
                unit = mGeneric.group(3) != null ? mGeneric.group(3).trim() : "";
                remainder = mGeneric.group(4) != null ? mGeneric.group(4).trim() : "";
            } else {
                // Table-splitting strategy for whitespace or tab columns (2+ spaces or tabs)
                String[] parts = line.split("\\t+|\\s{2,}");
                if (parts.length >= 2) {
                    String col0 = parts[0].replaceAll("^(?:[0-9]+[.)-]|[-*•])\\s*", "").trim();
                    String col1 = parts[1].trim();

                    if (col1.matches("^[0-9]+[.,]?[0-9]*$")) {
                        candidateName = col0;
                        valStr = col1.replace(',', '.');

                        for (int p = 2; p < parts.length; p++) {
                            String part = parts[p].trim();
                            if (part.matches(".*[0-9]+[.,]?[0-9]*\\s*-\\s*[0-9]+[.,]?[0-9]*.*") || part.matches(".*[><=]\\s*[0-9]+.*")) {
                                if (remainder.isBlank()) {
                                    remainder = part;
                                } else {
                                    remainder += " " + part;
                                }
                            } else if (part.matches("^[a-zA-Zµ/%]+(/[a-zA-Z0-9.]+)?$") && !part.equalsIgnoreCase("H") && !part.equalsIgnoreCase("L")) {
                                if (unit.isBlank()) {
                                    unit = part;
                                } else {
                                    remainder += " " + part;
                                }
                            } else {
                                remainder = remainder.isBlank() ? part : remainder + " " + part;
                            }
                        }
                    }
                }
            }

            if (candidateName != null && valStr != null) {
                // Filter out non-test administrative lines, long identity numbers (CCCD/CMND/BHYT/Phone), and table headers
                String cleanName = stripAccents(candidateName).toLowerCase().trim();
                if (valStr.length() > 8 ||
                    cleanName.contains("ngay") || cleanName.contains("thang") || cleanName.contains("nam") ||
                    cleanName.contains("gio") || cleanName.contains("tuoi") || cleanName.contains("trang") ||
                    cleanName.contains("khoa") || cleanName.contains("dien thoai") || cleanName.contains("sdt") ||
                    cleanName.contains("stt") || cleanName.contains("ma bn") || cleanName.contains("ma hs") ||
                    cleanName.contains("dia chi") || cleanName.contains("bac si") || cleanName.contains("benh vien") ||
                    cleanName.contains("phong kham") || cleanName.contains("cccd") || cleanName.contains("cmnd") ||
                    cleanName.contains("bhyt") || cleanName.contains("the bhyt") || cleanName.contains("so the") ||
                    cleanName.contains("sid") || cleanName.contains("gioi tinh") || cleanName.contains("ho ten") ||
                    cleanName.contains("ho va ten") || cleanName.contains("ten chi so") || cleanName.contains("ket qua") ||
                    cleanName.contains("don vi") || cleanName.contains("tham chieu") || cleanName.contains("danh gia") ||
                    cleanName.contains("ghi chu")) {
                    continue;
                }

                // Check if already captured
                final String finalCandidate = candidateName;
                final String finalCleanName = cleanName;
                boolean alreadyCaptured = detected.stream().anyMatch(d -> d.equalsIgnoreCase(finalCandidate) || finalCleanName.contains(stripAccents(d).toLowerCase()));
                if (alreadyCaptured) continue;

                // Extract reference range from remainder (handles e.g. "Tham chiếu: 30 - 100", "(Ref: 2.8-8.0)", "[> 90]")
                String refRange = "-";
                Matcher mRef = Pattern.compile("([0-9]+[.,]?[0-9]*\\s*-\\s*[0-9]+[.,]?[0-9]*|[><=]\\s*[0-9]+[.,]?[0-9]*)").matcher(remainder);
                if (mRef.find()) {
                    refRange = mRef.group(1).trim();
                }

                Double valNum = null;
                try { valNum = Double.parseDouble(valStr); } catch (Exception ignored) {}

                String status = calculateStatus(valNum, refRange, null, null, line, patientGender);
                String significance = "Chỉ số cận lâm sàng đo được trong tài liệu y tế.";
                if ("ELEVATED".equals(status)) {
                    significance = String.format("Chỉ số %s đo được %s %s vượt ngưỡng tham chiếu (%s), cần đánh giá chuyên khoa.", candidateName, valStr, unit, refRange);
                } else if ("LOW".equals(status)) {
                    significance = String.format("Chỉ số %s đo được %s %s thấp hơn mức tham chiếu chuẩn (%s).", candidateName, valStr, unit, refRange);
                } else {
                    significance = String.format("Chỉ số %s đo được %s %s nằm trong giới hạn tham chiếu an toàn (%s).", candidateName, valStr, unit, refRange);
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
        return calculateStatus(valNum, refRange, defaultLow, defaultHigh, line, null);
    }

    private String calculateStatus(Double valNum, String refRange, Double defaultLow, Double defaultHigh, String line, String patientGender) {
        String lineClean = stripAccents(line).toLowerCase();
        String genderClean = patientGender != null ? stripAccents(patientGender).toLowerCase() : "";

        Double parsedLow = defaultLow;
        Double parsedHigh = defaultHigh;

        // Gender-specific reference range adaptation
        boolean isFemale = genderClean.contains("nu") || genderClean.contains("female") || lineClean.contains("gioi tinh: nu");
        boolean isMale = !isFemale && (genderClean.contains("nam") || genderClean.contains("male") || lineClean.contains("gioi tinh: nam"));

        String effectiveRange = refRange;
        String combined = (line + " " + (refRange != null ? refRange : "")).toLowerCase();

        if (isFemale) {
            Matcher mFem = Pattern.compile("(?:nữ|nu|female|f)\\s*[:=]?\\s*([0-9]+[.,]?[0-9]*)\\s*-\\s*([0-9]+[.,]?[0-9]*)").matcher(combined);
            if (mFem.find()) {
                effectiveRange = mFem.group(1) + " - " + mFem.group(2);
            }
        } else if (isMale) {
            Matcher mMal = Pattern.compile("(?:nam|male|m)\\s*[:=]?\\s*([0-9]+[.,]?[0-9]*)\\s*-\\s*([0-9]+[.,]?[0-9]*)").matcher(combined);
            if (mMal.find()) {
                effectiveRange = mMal.group(1) + " - " + mMal.group(2);
            }
        }

        if (effectiveRange != null && !effectiveRange.isBlank()) {
            Matcher mRange = Pattern.compile("([0-9]+[.,]?[0-9]*)\\s*-\\s*([0-9]+[.,]?[0-9]*)").matcher(effectiveRange);
            if (mRange.find()) {
                try {
                    parsedLow = Double.parseDouble(mRange.group(1).replace(',', '.'));
                    parsedHigh = Double.parseDouble(mRange.group(2).replace(',', '.'));
                } catch (Exception ignored) {}
            } else if (effectiveRange.contains(">")) {
                Matcher mGt = Pattern.compile(">\\s*([0-9]+[.,]?[0-9]*)").matcher(effectiveRange);
                if (mGt.find()) {
                    try { parsedLow = Double.parseDouble(mGt.group(1).replace(',', '.')); } catch (Exception ignored) {}
                }
            } else if (effectiveRange.contains("<")) {
                Matcher mLt = Pattern.compile("<\\s*([0-9]+[.,]?[0-9]*)").matcher(effectiveRange);
                if (mLt.find()) {
                    try { parsedHigh = Double.parseDouble(mLt.group(1).replace(',', '.')); } catch (Exception ignored) {}
                }
            }
        }

        boolean hasExplicitElevated = lineClean.contains("tang") || lineClean.contains("cao") ||
                lineClean.contains("high") || lineClean.contains("elevated") || lineClean.contains("(h)") ||
                lineClean.contains("duong tinh") || lineClean.contains("positive") || lineClean.contains("▲");
        boolean hasExplicitLow = lineClean.contains("giam") || lineClean.contains("thap") ||
                lineClean.contains("low") || lineClean.contains("(l)") || lineClean.contains("▼");

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

    private String buildClinicalDoctorRecommendationReason(DoctorMatchDto doctor, String specialtyName, List<AbnormalIndicatorDto> indicators) {
        String titleAndName = String.format("%s %s", doctor.getAcademicTitle() != null ? doctor.getAcademicTitle() : "BS", doctor.getFullName());

        if (indicators != null && !indicators.isEmpty()) {
            List<String> abnormalSummary = indicators.stream()
                    .filter(i -> "ELEVATED".equalsIgnoreCase(i.getStatus()) || "LOW".equalsIgnoreCase(i.getStatus()))
                    .map(i -> String.format("%s (%s %s)", i.getName(), i.getValue(), i.getUnit()))
                    .limit(3)
                    .toList();

            if (!abnormalSummary.isEmpty()) {
                return String.format("Đề xuất %s (%s) vì tài liệu xét nghiệm ghi nhận chỉ số bất thường: %s, cần bác sĩ chuyên khoa thăm khám lâm sàng và định hướng phác đồ can thiệp kịp thời.",
                        titleAndName, specialtyName, String.join(", ", abnormalSummary));
            }
        }

        return String.format("Đề xuất %s tiếp nhận thăm khám dựa trên năng lực chuyên môn sâu về %s phù hợp với hồ sơ cận lâm sàng.",
                titleAndName, specialtyName);
    }

    private static final Map<String, String> SPECIALTY_NAMES = Map.ofEntries(
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

    public static String getSpecialtyDisplayName(String slug) {
        if (slug == null || slug.isBlank()) {
            return "General Internal Medicine (Nội Tổng Quát)";
        }
        return SPECIALTY_NAMES.getOrDefault(slug.toLowerCase().trim(), "General Internal Medicine (Nội Tổng Quát)");
    }

    private String generateClinicalSummary(List<AbnormalIndicatorDto> indicators, String specialtyName) {
        long abnormalCount = indicators != null ? indicators.stream()
                .filter(i -> "ELEVATED".equals(i.getStatus()) || "LOW".equals(i.getStatus()))
                .count() : 0;
        int totalCount = indicators != null ? indicators.size() : 0;

        return String.format(
                "Chế độ Ngoại tuyến: Hệ thống đã bóc tách %d chỉ số xét nghiệm từ tài liệu (ghi nhận %d chỉ số nằm ngoài khoảng tham chiếu chuẩn). " +
                "Định hướng tham khảo chuyên khoa %s. Vui lòng tham vấn Bác sĩ chuyên môn để có chẩn đoán bệnh cảnh chính xác.",
                totalCount, abnormalCount, specialtyName
        );
    }

    private String generatePlainLanguageExplanation(List<AbnormalIndicatorDto> indicators, String specialtyName) {
        StringBuilder sb = new StringBuilder();
        sb.append("⚠️ **Thông báo Chế độ Ngoại tuyến (Offline Mode)**:\n\n");
        sb.append("Kết quả dưới đây được bóc tách kỹ thuật từ tài liệu của bạn và đối chiếu với khoảng tham chiếu tiêu chuẩn của phòng xét nghiệm. ");
        sb.append("Do hệ thống chưa kết nối mô hình Trí tuệ Nhân tạo (LLM), bản giải thích chi tiết về nguyên nhân bệnh lý chưa được khởi tạo.\n\n");

        if (indicators != null && !indicators.isEmpty()) {
            List<AbnormalIndicatorDto> abnormalList = indicators.stream()
                    .filter(i -> "ELEVATED".equals(i.getStatus()) || "LOW".equals(i.getStatus()))
                    .toList();
            if (!abnormalList.isEmpty()) {
                sb.append("**Các chỉ số cần lưu ý (nằm ngoài khoảng tham chiếu)**:\n");
                for (AbnormalIndicatorDto item : abnormalList) {
                    sb.append(String.format("• **%s**: %s %s (Tham chiếu: %s, Đánh giá: %s)\n",
                            item.getName(), item.getValue(), item.getUnit(), item.getReferenceRange(), item.getStatus()));
                }
                sb.append("\n");
            }
        }

        sb.append(String.format("👉 **Khuyến nghị**: Bạn vui lòng trao đổi trực tiếp với Bác sĩ chuyên khoa **%s** để được chẩn đoán chính xác và tư vấn phác đồ điều trị phù hợp.", specialtyName));
        return sb.toString();
    }

    private List<String> generateSuggestedQuestions(List<AbnormalIndicatorDto> indicators) {
        return List.of(
                "Bác sĩ có thể giải thích ý nghĩa các chỉ số nằm ngoài khoảng tham chiếu này không?",
                "Với kết quả này, tôi có cần làm thêm xét nghiệm hoặc chẩn đoán hình ảnh bổ sung nào không?",
                "Chế độ ăn uống, sinh hoạt hoặc dùng thuốc hiện tại của tôi cần điều chỉnh như thế nào?"
        );
    }

    private String extractDocumentText(byte[] fileBytes, String contentType, String fileName) {
        String extractedText = "";
        try {
            if (contentType.toLowerCase().contains("pdf")) {
                extractedText = pdfExtractionService.extractTextFromPdf(fileBytes);
                // Resilient fallback for Scanned Image-only PDFs without text layer
                if ((extractedText == null || extractedText.trim().length() < 30) && clinicalRagService.canProcessVision()) {
                    log.info("📄 PDF text layer is empty (< 30 chars). Invoking PDFRenderer + Vision OCR fallback for '{}' (up to {} pages)", fileName, maxPdfPages);
                    List<byte[]> pageImages = pdfExtractionService.renderPdfPagesToImages(fileBytes, Math.max(1, maxPdfPages));
                    if (!pageImages.isEmpty()) {
                        int totalPages = pageImages.size();
                        log.info("📄 Dispatching {} parallel Vision OCR tasks for '{}'...", totalPages, fileName);

                        String[] ocrResults = new String[totalPages];
                        List<java.util.concurrent.CompletableFuture<Void>> futures = new ArrayList<>();
                        java.util.concurrent.Executor executor = medicalOcrExecutor != null
                                ? medicalOcrExecutor
                                : java.util.concurrent.ForkJoinPool.commonPool();

                        for (int i = 0; i < totalPages; i++) {
                            final int pageIdx = i;
                            final byte[] imgData = pageImages.get(i);
                            futures.add(java.util.concurrent.CompletableFuture.runAsync(() -> {
                                boolean permitAcquired = false;
                                try {
                                    permitAcquired = ocrSemaphore.tryAcquire(25, java.util.concurrent.TimeUnit.SECONDS);
                                    if (permitAcquired) {
                                        String ocr = clinicalRagService.extractTextWithVision(imgData, "image/jpeg", fileName + " - Trang " + (pageIdx + 1));
                                        ocrResults[pageIdx] = ocr;
                                    } else {
                                        log.warn("OCR concurrency permit wait timed out for page {} of '{}'", pageIdx + 1, fileName);
                                        ocrResults[pageIdx] = "";
                                    }
                                } catch (Exception ex) {
                                    log.warn("Parallel OCR error on page {}: {}", pageIdx + 1, ex.getMessage());
                                    ocrResults[pageIdx] = "";
                                } finally {
                                    if (permitAcquired) {
                                        ocrSemaphore.release();
                                    }
                                }
                            }, executor));
                        }

                        // Wait for all pages to finish OCR with resilient 25s timeout
                        try {
                            java.util.concurrent.CompletableFuture.allOf(futures.toArray(new java.util.concurrent.CompletableFuture[0]))
                                    .get(25, java.util.concurrent.TimeUnit.SECONDS);
                        } catch (Exception ex) {
                            log.warn("Parallel OCR timed out or interrupted: {}. Assembling partial results...", ex.getMessage());
                        }

                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < totalPages; i++) {
                            String pageText = ocrResults[i];
                            if (pageText != null && !pageText.isBlank()) {
                                sb.append("--- TRANG ").append(i + 1).append(" ---\n").append(pageText).append("\n\n");
                            }
                        }

                        if (!sb.isEmpty()) {
                            extractedText = sb.toString().trim();
                            log.info("📄 Successfully extracted {} characters from scanned PDF via parallel Vision OCR", extractedText.length());
                        }
                    }
                }
            } else if (contentType.toLowerCase().contains("text") || contentType.toLowerCase().contains("plain")) {
                extractedText = new String(fileBytes, java.nio.charset.StandardCharsets.UTF_8);
            } else if (contentType.toLowerCase().contains("image/")) {
                if (clinicalRagService.canProcessVision()) {
                    boolean permitAcquired = false;
                    try {
                        permitAcquired = ocrSemaphore.tryAcquire(30, java.util.concurrent.TimeUnit.SECONDS);
                        if (permitAcquired) {
                            extractedText = clinicalRagService.extractTextWithVision(fileBytes, contentType, fileName);
                        } else {
                            log.warn("OCR concurrency throttle reached for image '{}'", fileName);
                            throw new com.mediassist.common.AppException(
                                    org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                                    "OCR_BUSY",
                                    "Hệ thống đang tiếp nhận nhiều lượt phân tích ảnh cùng lúc. Vui lòng thử lại sau giây lát."
                            );
                        }
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.warn("Interrupted while waiting for OCR permit: {}", ie.getMessage());
                    } finally {
                        if (permitAcquired) {
                            ocrSemaphore.release();
                        }
                    }
                }
            }
        } catch (com.mediassist.common.AppException appEx) {
            throw appEx;
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
    private String distillClinicalContext(String fullText, String fileName, List<AbnormalIndicatorDto> indicators) {
        if (fullText == null || fullText.isBlank() || fullText.length() <= 4500) {
            return fullText != null ? fullText : "";
        }

        log.info("🔍 [SMART CLINICAL WINDOWING] Document '{}' has {} chars. Distilling to high-density clinical context...",
                fileName, fullText.length());

        StringBuilder distilled = new StringBuilder();
        distilled.append("=== TÓM TẮT HỒ SƠ Y TẾ TẬP TRUNG (DISTILLED CLINICAL CONTEXT) ===\n");
        distilled.append(String.format("Tài liệu y tế: %s\n\n", fileName));

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
    private String buildFocusedDoctorQuery(String specialtySlug, String specialtyName, List<AbnormalIndicatorDto> indicators, String fileName) {
        StringBuilder query = new StringBuilder();
        query.append("Bác sĩ chuyên khoa ").append(specialtyName).append(". ");

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

        query.append("Tư vấn chẩn đoán và điều trị bệnh lý chuyên khoa ").append(specialtySlug).append(".");
        return query.toString();
    }

    private String stripAccents(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }
}
