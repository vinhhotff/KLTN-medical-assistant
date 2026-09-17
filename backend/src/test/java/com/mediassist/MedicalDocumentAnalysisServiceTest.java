package com.mediassist;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.model.entity.DocumentAnalysis;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.repository.DocumentAnalysisRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.MedicalDocumentAnalysisService;
import com.mediassist.service.MedicalDocumentValidator;
import com.mediassist.service.PdfExtractionService;
import com.mediassist.service.StorageService;
import com.mediassist.service.SecurityRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MedicalDocumentAnalysisServiceTest {

    @Mock
    private PdfExtractionService pdfExtractionService;

    @Mock
    private DoctorSemanticSearchService doctorSemanticSearchService;

    @Mock
    private MedicalDocumentRepository medicalDocumentRepository;

    @Mock
    private DocumentAnalysisRepository documentAnalysisRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MedicalDocumentValidator medicalDocumentValidator;

    @Mock
    private StorageService storageService;

    @Mock
    private com.mediassist.service.ClinicalRagService clinicalRagService;

    @Mock
    private SecurityRateLimiterService rateLimiterService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MedicalDocumentAnalysisService analysisService;

    private com.mediassist.model.entity.User testUser;

    @BeforeEach
    void setUp() {
        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        mockResult.setClinicalSummary("Tóm tắt lâm sàng từ RAG OpenRouter");
        mockResult.setPlainLanguageExplanation("Giải thích bình dân từ AI");
        mockResult.setDoctorRecommendationReason("Bác sĩ có CCHN và chuyên môn phù hợp nhất");
        lenient().when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(mockResult);

        testUser = new com.mediassist.model.entity.User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("patient@mediassist.local");
        testUser.setScanQuota(1);
        testUser.setSubscriptionTier("FREE");

        lenient().when(userRepository.findByEmail(anyString())).thenReturn(java.util.Optional.of(testUser));
        lenient().when(userRepository.deductScanQuota(any())).thenAnswer(inv -> {
            if (testUser.getScanQuota() > 0) {
                testUser.setScanQuota(testUser.getScanQuota() - 1);
                return 1;
            }
            return 0;
        });
        lenient().when(userRepository.restoreScanQuota(any())).thenAnswer(inv -> {
            testUser.setScanQuota(testUser.getScanQuota() + 1);
            return 1;
        });
        lenient().when(storageService.uploadDocument(any(), any(), any(), any()))
                .thenReturn("https://supabase.co/storage/v1/object/public/medical-documents/test.pdf");

        lenient().when(medicalDocumentRepository.save(any(MedicalDocument.class)))
                .thenAnswer(inv -> {
                    MedicalDocument doc = inv.getArgument(0);
                    doc.setId(UUID.randomUUID());
                    return doc;
                });
        lenient().when(medicalDocumentRepository.saveAndFlush(any(MedicalDocument.class)))
                .thenAnswer(inv -> {
                    MedicalDocument doc = inv.getArgument(0);
                    doc.setId(UUID.randomUUID());
                    return doc;
                });
        lenient().when(documentAnalysisRepository.save(any(DocumentAnalysis.class)))
                .thenAnswer(inv -> {
                    DocumentAnalysis da = inv.getArgument(0);
                    da.setId(UUID.randomUUID());
                    return da;
                });
    }

    @Test
    @DisplayName("Should extract lipid markers from blood test PDF and recommend cardiology doctor via pgvector")
    void testAnalyzeLipidPanelPdf() {
        String mockPdfContent = """
                BỆNH VIỆN ĐẠI HỌC Y DƯỢC TP.HCM - KHOA XÉT NGHIỆM
                PHIẾU KẾT QUẢ XÉT NGHIỆM SINH HÓA MÁU
                Bệnh nhân: Nguyễn Văn B - Tuổi: 48
                1. Cholesterol toàn phần: 6.8 mmol/L (Tham chiếu: 3.9 - 5.2) -> TĂNG
                2. Triglyceride: 2.6 mmol/L (Tham chiếu: 0.46 - 1.88) -> TĂNG
                3. Fasting Glucose: 5.2 mmol/L (Tham chiếu: 4.1 - 5.9) -> Bình thường
                Kết luận: Rối loạn lipid máu hỗn hợp, nguy cơ xơ vữa mạch vành.
                """;

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(mockPdfContent);

        DoctorMatchDto cardioDoctor = new DoctorMatchDto(
                UUID.randomUUID(), "TS. BS. Nguyễn Văn An", "Chuyên gia tim mạch và mạch vành can thiệp",
                "008921/BYT-CCHN", 15, new BigDecimal("350000.00"), 0.98,
                List.of("Cardiology (Tim mạch)")
        );
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4)))
                .thenReturn(List.of(cardioDoctor));

        com.mediassist.ai.ClinicalAiResult cardioAiResult = new com.mediassist.ai.ClinicalAiResult();
        cardioAiResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        cardioAiResult.setRecommendedSpecialtySlug("cardiology");
        cardioAiResult.setRecommendedSpecialtyName("Cardiology (Tim Mạch)");
        cardioAiResult.setClinicalSummary("Rối loạn lipid máu hỗn hợp, nguy cơ xơ vữa mạch vành.");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(cardioAiResult);

        MockMultipartFile file = new MockMultipartFile(
                "file", "Ket_Qua_Xet_Nghiem_Mo_Mau.pdf", "application/pdf", mockPdfContent.getBytes()
        );

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("Ket_Qua_Xet_Nghiem_Mo_Mau.pdf", response.getFileName());
        assertEquals("cardiology", response.getRecommendedSpecialtySlug());
        assertFalse(response.getIndicators().isEmpty());

        // Verify indicators parsed
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("Cholesterol") && "ELEVATED".equals(i.getStatus())));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("Triglyceride") && "ELEVATED".equals(i.getStatus())));

        // Verify matched doctors via pgvector
        assertFalse(response.getMatchedDoctors().isEmpty());
        assertEquals("TS. BS. Nguyễn Văn An", response.getMatchedDoctors().get(0).getFullName());
        assertEquals(0.98, response.getMatchedDoctors().get(0).getSimilarityScore(), 0.001);
    }

    @Test
    @DisplayName("Should extract liver function markers and recommend gastroenterology doctor")
    void testAnalyzeLiverPanelDocument() {
        String mockReport = """
                PHIẾU XÉT NGHIỆM CHỨC NĂNG GAN MẬT
                Men gan ALT (GPT): 85 U/L (Bình thường: 0 - 41)
                Men gan AST (GOT): 78 U/L (Bình thường: 0 - 37)
                Bilirubin toàn phần: 14.5 µmol/L (Bình thường)
                Nghi ngờ viêm gan cấp hoặc gan nhiễm mỡ.
                """;

        MockMultipartFile file = new MockMultipartFile(
                "file", "Xet_Nghiem_Men_Gan.pdf", "application/pdf", mockReport.getBytes()
        );
        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(mockReport);

        com.mediassist.ai.ClinicalAiResult liverAiResult = new com.mediassist.ai.ClinicalAiResult();
        liverAiResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        liverAiResult.setRecommendedSpecialtySlug("gastroenterology");
        liverAiResult.setRecommendedSpecialtyName("Gastroenterology (Tiêu Hóa - Gan Mật)");
        liverAiResult.setClinicalSummary("Tăng men gan ALT/AST");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(liverAiResult);

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("gastroenterology", response.getRecommendedSpecialtySlug());
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("ALT") && "ELEVATED".equals(i.getStatus())));
    }

    @Test
    @DisplayName("Should throw HTTP 402 PAYMENT_REQUIRED when user scan quota is 0 and not VIP")
    void testQuotaExceededThrowsPaymentRequired() {
        testUser.setScanQuota(0);
        testUser.setSubscriptionTier("FREE");

        MockMultipartFile file = new MockMultipartFile(
                "file", "Lab.pdf", "application/pdf", "%PDF-1.4 sample content".getBytes()
        );

        AppException ex = assertThrows(AppException.class, () ->
                analysisService.analyzeDocument(file, "patient@mediassist.local")
        );

        assertEquals(HttpStatus.PAYMENT_REQUIRED, ex.getStatus());
        assertEquals("QUOTA_EXCEEDED", ex.getCode());
        // Verify no document saved and no storage upload attempted
        verify(medicalDocumentRepository, never()).save(any());
        verify(storageService, never()).uploadDocument(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should return cached analysis result via SHA-256 deduplication without consuming token or quota")
    void testSha256DeduplicationReturnsCachedResultWithoutTokenCost() {
        testUser.setScanQuota(1);

        byte[] fileBytes = "%PDF-1.4 DEDUPLICATED CONTENT".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "Deduplicated.pdf", "application/pdf", fileBytes);

        UUID existingDocId = UUID.randomUUID();
        MedicalDocument existingDoc = new MedicalDocument();
        existingDoc.setId(existingDocId);
        existingDoc.setFileName("Deduplicated.pdf");
        existingDoc.setFileSizeBytes((long) fileBytes.length);
        existingDoc.setContentType("application/pdf");
        existingDoc.setStorageUrl("https://supabase.co/storage/v1/object/public/medical-documents/cached.pdf");

        DocumentAnalysis existingAnalysis = new DocumentAnalysis();
        existingAnalysis.setId(UUID.randomUUID());
        existingAnalysis.setClinicalSummary("Chỉ số mỡ máu tăng nhẹ");
        existingAnalysis.setPlainLanguageExplanation("Người bệnh có cholesterol hơi cao");
        existingAnalysis.setRecommendedSpecialtySlug("cardiology");
        existingAnalysis.setRecommendedSpecialtyName("Tim mạch");
        existingAnalysis.setAbnormalIndicatorsJson("[]");
        existingAnalysis.setSuggestedQuestionsJson("[\"Tôi nên ăn gì để hạ men gan?\"]");

        when(medicalDocumentRepository.findFirstByUserIdAndFileHashOrderByCreatedAtDesc(eq(testUser.getId()), anyString()))
                .thenReturn(Optional.of(existingDoc));
        when(documentAnalysisRepository.findByDocumentId(existingDocId))
                .thenReturn(Optional.of(existingAnalysis));

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertTrue(response.isCachedResult(), "Response must be marked as cachedResult");
        assertEquals("https://supabase.co/storage/v1/object/public/medical-documents/cached.pdf", response.getStorageUrl());
        assertEquals("cardiology", response.getRecommendedSpecialtySlug());
        assertTrue(response.getModelUsed().contains("Deduplication"));

        // Verify storage upload was NOT triggered and quota was NOT deducted
        verify(storageService, never()).uploadDocument(any(), any(), any(), any());
        verify(medicalDocumentValidator, never()).validateDocument(any(), any(), any(), any());
        assertEquals(1, testUser.getScanQuota(), "Quota must remain untouched on deduplication cache hit");
    }

    @Test
    @DisplayName("Should handle verbose multi-page medical record, apply smart windowing and use focused doctor pgvector query")
    void testAnalyzeMultiPageVerboseDocumentWithSmartWindowing() {
        // Construct a simulated 10-page document (> 6,000 characters)
        StringBuilder multiPageText = new StringBuilder();
        multiPageText.append("BỆNH VIỆN ĐA KHOA QUỐC TẾ - HỒ SƠ TỔNG HỢP RA VIỆN\n");
        multiPageText.append("Họ và tên: Trần Văn D - Năm sinh: 1968 - Giới tính: Nam - Mã BN: BN-9988\n");
        multiPageText.append("Địa chỉ: 123 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh\n\n");

        // Add boilerplate hospital rules and insurance policies (> 5,000 chars)
        for (int p = 1; p <= 25; p++) {
            multiPageText.append(String.format("--- TRANG %d / 25: QUY ĐỊNH NỘI TRÚ VÀ VIỆN PHÍ ---\n", p));
            multiPageText.append("Quy định số tài khoản thanh toán viện phí và chính sách bảo hiểm y tế doanh nghiệp theo thông tư bộ y tế số 45/2024/TT-BYT. ")
                    .append("Người bệnh vui lòng giữ gìn vệ sinh chung, không hút thuốc lá trong khuôn viên phòng bệnh, chấp hành giờ thăm bệnh từ 16h đến 20h mỗi ngày. ")
                    .append("Mật khẩu wifi bệnh viện là bvquocte2026. Bệnh viện không chịu trách nhiệm về tư trang cá nhân của người bệnh. ")
                    .append("Xin chân thành cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ y tế của bệnh viện đa khoa quốc tế.\n\n");
        }

        // Add laboratory test results
        multiPageText.append("--- KẾT QUẢ XÉT NGHIỆM SINH HÓA MÁU VÀ CHỨC NĂNG GAN ---\n");
        multiPageText.append("Men gan ALT (GPT): 88 U/L (Tham chiếu: 0 - 41) -> TĂNG CAO\n");
        multiPageText.append("Men gan AST (GOT): 76 U/L (Tham chiếu: 0 - 37) -> TĂNG CAO\n");
        multiPageText.append("Fasting Glucose: 7.2 mmol/L (Tham chiếu: 3.9 - 6.4) -> TĂNG\n");
        multiPageText.append("Bilirubin toàn phần: 15.2 µmol/L (Tham chiếu: 5.1 - 17.0) -> Bình thường\n\n");

        // Add diagnostic summary and doctor orders
        multiPageText.append("--- TÓM TẮT BỆNH ÁN VÀ ĐỀ NGHỊ ĐIỀU TRỊ ---\n");
        multiPageText.append("Chẩn đoán xuất viện: Viêm gan cấp tính kết hợp rối loạn đường huyết đói.\n");
        multiPageText.append("Đề nghị: Tái khám chuyên khoa Tiêu hóa - Gan mật sau 2 tuần để đánh giá lại men gan.\n");

        String fullDocumentText = multiPageText.toString();
        assertTrue(fullDocumentText.length() > 4600, "Simulated document should exceed 4600 chars to trigger windowing");

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(fullDocumentText);

        DoctorMatchDto gastroDoc = new DoctorMatchDto(
                UUID.randomUUID(), "PGS. TS. Trần Minh Tuấn", "Chuyên gia gan mật tiêu hóa",
                "001928/BYT-CCHN", 22, new BigDecimal("400000.00"), 0.96,
                List.of("Gastroenterology (Tiêu Hóa - Gan Mật)")
        );
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4)))
                .thenReturn(List.of(gastroDoc));

        com.mediassist.ai.ClinicalAiResult multiPageAiResult = new com.mediassist.ai.ClinicalAiResult();
        multiPageAiResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        multiPageAiResult.setRecommendedSpecialtySlug("gastroenterology");
        multiPageAiResult.setRecommendedSpecialtyName("Gastroenterology (Tiêu Hóa - Gan Mật)");
        multiPageAiResult.setClinicalSummary("Viêm gan cấp tính kết hợp rối loạn đường huyết đói.");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(multiPageAiResult);

        MockMultipartFile file = new MockMultipartFile(
                "file", "Ho_So_Benh_An_10_Trang.pdf", "application/pdf", fullDocumentText.getBytes()
        );

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("gastroenterology", response.getRecommendedSpecialtySlug());

        // Verify indicators parsed across pages
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("ALT") && "ELEVATED".equals(i.getStatus())));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("AST") && "ELEVATED".equals(i.getStatus())));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("Glucose") && "ELEVATED".equals(i.getStatus())));

        // Verify doctor search query was focused, containing specialty and abnormal findings, NOT raw boilerplate
        org.mockito.ArgumentCaptor<String> queryCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(doctorSemanticSearchService, atLeastOnce()).searchDoctors(queryCaptor.capture(), eq(4));
        List<String> capturedQueries = queryCaptor.getAllValues();
        String capturedQuery = capturedQueries.get(capturedQueries.size() - 1);
        assertTrue(capturedQuery.contains("Gastroenterology"), "Query should specify target specialty");
        assertTrue(capturedQuery.contains("ALT") || capturedQuery.contains("AST"), "Query should mention abnormal findings");
        assertFalse(capturedQuery.contains("bvquocte2026"), "Query should not contain wifi or administrative boilerplate");

        // Verify Clinical RAG prompt received distilled context (shorter and filtered)
        org.mockito.ArgumentCaptor<String> ragPromptCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(clinicalRagService).performDocumentRagAnalysis(ragPromptCaptor.capture(), anyString(), any());
        String capturedRagText = ragPromptCaptor.getValue();
        assertTrue(capturedRagText.length() < fullDocumentText.length(), "RAG context should be distilled and shorter than full raw text");
        assertTrue(capturedRagText.contains("CÁC CHỈ SỐ CẬN LÂM SÀNG BẤT THƯỜNG GHI NHẬN"), "Should have prioritized lab indicators");
    }

    @Test
    @DisplayName("Should parse Thyroid hormone panel (TSH, FT4) and route dynamically to endocrinology")
    void testAnalyzeThyroidEndocrinologyPanel() {
        String mockThyroidReport = """
                TRUNG TÂM NỘI TIẾT & CHUYỂN HÓA - KẾT QUẢ XÉT NGHIỆM MIỄN DỊCH
                Bệnh nhân: Lê Thị H - Tuổi: 35
                1. TSH (Thyroid Stimulating Hormone): 8.5 µIU/mL (Tham chiếu: 0.27 - 4.2) -> TĂNG CAO
                2. FT4 (Free Thyroxine): 8.2 pmol/L (Tham chiếu: 12.0 - 22.0) -> GIẢM
                Chẩn đoán sơ bộ: Theo dõi suy giáp nguyên phát / viêm tuyến giáp Hashimoto.
                """;

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(mockThyroidReport);

        com.mediassist.ai.ClinicalAiResult thyroidAiResult = new com.mediassist.ai.ClinicalAiResult();
        thyroidAiResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        thyroidAiResult.setRecommendedSpecialtySlug("endocrinology");
        thyroidAiResult.setRecommendedSpecialtyName("Endocrinology & Diabetes (Nội Tiết & Đái Tháo Đường)");
        thyroidAiResult.setClinicalSummary("Theo dõi suy giáp nguyên phát");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(thyroidAiResult);

        MockMultipartFile file = new MockMultipartFile(
                "file", "Xet_Nghiem_Tuyen_Giap.pdf", "application/pdf", mockThyroidReport.getBytes()
        );

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("endocrinology", response.getRecommendedSpecialtySlug());
        assertTrue(response.getRecommendedSpecialtyName().contains("Nội Tiết"));

        // Verify indicators parsed
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("TSH") && "ELEVATED".equals(i.getStatus())));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("FT4") && "LOW".equals(i.getStatus())));

        // Verify questions
        assertNotNull(response.getSuggestedQuestions());
        assertFalse(response.getSuggestedQuestions().isEmpty());
    }

    @Test
    @DisplayName("Should parse Renal impairment panel (Creatinine, eGFR, BUN) and route to nephrology")
    void testAnalyzeRenalNephrologyPanel() {
        String mockRenalReport = """
                KHOA THẬN - TIẾT NIỆU & LỌC MÁU
                PHIẾU ĐÁNH GIÁ CHỨC NĂNG THẬN
                Bệnh nhân: Hoàng Văn K - Tuổi: 62
                - Creatinine huyết thanh: 185 µmol/L (Tham chiếu: 62 - 106) -> TĂNG
                - eGFR (Mức lọc cầu thận ước tính): 35 mL/min/1.73m2 (Tham chiếu: > 90) -> GIẢM
                - Ure máu (BUN): 14.5 mmol/L (Tham chiếu: 2.5 - 7.5) -> TĂNG
                Kết luận: Tổn thương thận mạn giai đoạn 3b.
                """;

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(mockRenalReport);

        com.mediassist.ai.ClinicalAiResult renalAiResult = new com.mediassist.ai.ClinicalAiResult();
        renalAiResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        renalAiResult.setRecommendedSpecialtySlug("nephrology");
        renalAiResult.setRecommendedSpecialtyName("Nephrology & Urology (Thận - Tiết Niệu)");
        renalAiResult.setClinicalSummary("Tổn thương thận mạn");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(renalAiResult);

        MockMultipartFile file = new MockMultipartFile(
                "file", "Chuc_Nang_Than_Creatinine.pdf", "application/pdf", mockRenalReport.getBytes()
        );

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("nephrology", response.getRecommendedSpecialtySlug());
        assertTrue(response.getRecommendedSpecialtyName().contains("Thận - Tiết Niệu"));

        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("Creatinine") && "ELEVATED".equals(i.getStatus())));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("eGFR") && "LOW".equals(i.getStatus())));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("Ure") && "ELEVATED".equals(i.getStatus())));
    }

    @Test
    @DisplayName("Should dynamically extract arbitrary unlisted lab parameter using Generic Tabular Parser")
    void testUniversalGenericLabExtraction() {
        String mockUnlistedReport = """
                BỆNH VIỆN ĐA KHOA TRUNG ƯƠNG
                KẾT QUẢ XÉT NGHIỆM CHUYÊN SÂU
                1. Total Testosterone: 1.2 ng/mL (Reference: 2.8 - 8.0)
                2. Vitamin D3: 15 ng/mL (Tham chiếu: 30 - 100)
                Kết luận: Suy giảm nội tiết sinh dục và thiếu hụt vitamin D.
                """;

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(mockUnlistedReport);

        MockMultipartFile file = new MockMultipartFile(
                "file", "Chuyen_Sau_Testosterone.pdf", "application/pdf", mockUnlistedReport.getBytes()
        );

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertFalse(response.getIndicators().isEmpty());

        // Generic tabular parser dynamically caught "Total Testosterone" or "Vitamin D3" with LOW status
        assertTrue(response.getIndicators().stream().anyMatch(i ->
                i.getName().toLowerCase().contains("testosterone") && "LOW".equals(i.getStatus())
        ));
        assertTrue(response.getIndicators().stream().anyMatch(i ->
                i.getName().toLowerCase().contains("vitamin") && "LOW".equals(i.getStatus())
        ));
    }

    @Test
    @DisplayName("Should transparently fall back to general internal medicine when AI is offline without fabricating diseases")
    void testOfflineFallbackDefaultsToGeneralInternalMedicineWithoutFabricatingDiseases() {
        com.mediassist.ai.ClinicalAiResult offlineResult = new com.mediassist.ai.ClinicalAiResult();
        offlineResult.setModelUsed("local-deterministic-engine (Safe Offline Fallback)");
        offlineResult.setProvider("LocalOfflineEngine");
        offlineResult.setRecommendedSpecialtySlug("general-internal-medicine");
        offlineResult.setRecommendedSpecialtyName("General Internal Medicine (Nội Tổng Quát - Tham Khảo Ngoại Tuyến)");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(offlineResult);

        String mockReport = """
                KẾT QUẢ XÉT NGHIỆM MÁU
                Glucose: 7.2 mmol/L (Tham chiếu: 3.9 - 6.4)
                """;
        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(mockReport);

        MockMultipartFile file = new MockMultipartFile("file", "General.pdf", "application/pdf", mockReport.getBytes());
        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("general-internal-medicine", response.getRecommendedSpecialtySlug());
        assertTrue(response.getModelUsed().contains("Offline"));
        assertFalse(response.getIndicators().isEmpty());
    }

    @Test
    @DisplayName("Should demonstrate Lazy Upload: Zero bytes uploaded to storage when AI analysis fails")
    void testLazyUploadDoesNotUploadToStorageWhenAiAnalysisFails() {
        testUser.setScanQuota(1);
        byte[] fileBytes = "%PDF-1.4 glucose cholesterol".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "lab_test.pdf", "application/pdf", fileBytes);

        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any()))
                .thenThrow(new RuntimeException("AI Model Down / Out of Memory"));

        assertThrows(RuntimeException.class, () ->
                analysisService.analyzeDocument(file, "patient@mediassist.local")
        );

        // Crucial: Storage upload must NEVER be invoked if AI analysis fails!
        verify(storageService, never()).uploadDocument(any(), any(), any(), any());
        verify(rateLimiterService).recordFailedUpload("patient@mediassist.local");
    }

    @Test
    @DisplayName("Should trigger Rollback Compensating Hook to delete orphan file if DB persistence fails")
    void testRollbackCompensatingHookDeletesStorageFileWhenDbSaveFails() {
        testUser.setScanQuota(1);
        byte[] fileBytes = "%PDF-1.4 glucose cholesterol".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "lab_test.pdf", "application/pdf", fileBytes);

        String uploadedUrl = "https://supabase.co/storage/v1/object/public/medical-documents/test.pdf";
        when(storageService.uploadDocument(any(), any(), any(), any())).thenReturn(uploadedUrl);
        when(medicalDocumentRepository.save(any())).thenThrow(new RuntimeException("DB Disk Full / Connection Lost"));

        assertThrows(RuntimeException.class, () ->
                analysisService.analyzeDocument(file, "patient@mediassist.local")
        );

        // Crucial: deleteDocument must be invoked to eliminate orphan file on Supabase!
        verify(storageService).deleteDocument(eq(uploadedUrl));
        verify(rateLimiterService).recordFailedUpload("patient@mediassist.local");
    }

    @Test
    @DisplayName("Should extract dynamic hospital metadata and parse columnar table format without colons")
    void testMultiPatternParserAndDynamicMetadataExtraction() {
        testUser.setScanQuota(1);
        String hospitalReport = """
                BỆNH VIỆN ĐẠI HỌC Y DƯỢC TP.HCM
                Khoa Hóa Sinh Lâm Sàng
                Mã SID: 2026-DHYD-88219
                Bác sĩ chỉ định: PGS.TS Trần Minh Tuấn
                Họ và tên: Lê Thị Mai
                Tuổi: 52
                Giới tính: Nữ
                Ngày xét nghiệm: 12/09/2026 09:15
                Thiết bị: Cobas Pro Integrated Solutions
                
                Tên xét nghiệm          Kết quả     Khoảng tham chiếu    Đơn vị
                Glucose                 9.2         3.9 - 6.4            mmol/L
                Creatinine              115         44 - 88              umol/L
                Acid Uric               420         150 - 360            umol/L
                """;

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(hospitalReport);

        DoctorMatchDto doctor = new DoctorMatchDto(
                UUID.randomUUID(), "PGS.TS Vũ Đình Hùng", "Chuyên khoa Nội tiết & Chuyển hóa",
                "001234/BYT-CCHN", 20, new BigDecimal("400000.00"), 0.95,
                List.of("Endocrinology (Nội tiết)")
        );
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4))).thenReturn(List.of(doctor));

        com.mediassist.ai.ClinicalAiResult customAiResult = new com.mediassist.ai.ClinicalAiResult();
        customAiResult.setModelUsed("gemini-1.5-flash (Google Direct)");
        customAiResult.setClinicalSummary("Đái tháo đường và suy giảm chức năng thận");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(customAiResult);

        MockMultipartFile file = new MockMultipartFile("file", "hospital_report.pdf", "application/pdf", hospitalReport.getBytes());

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertEquals("BỆNH VIỆN ĐẠI HỌC Y DƯỢC TP.HCM", response.getHospitalName());
        assertEquals("2026-DHYD-88219", response.getSidCode());
        assertEquals("PGS.TS Trần Minh Tuấn", response.getOrderingDoctor());
        assertEquals("Lê Thị Mai", response.getPatientName());
        assertEquals("Nữ", response.getPatientGender());
        assertEquals("52", response.getPatientAge());
        assertEquals("Cobas Pro Integrated Solutions", response.getDeviceModel());

        // Multi-pattern parser should extract Glucose, Creatinine, Acid Uric even without colons
        assertFalse(response.getIndicators().isEmpty());
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().equalsIgnoreCase("Glucose") && ("ELEVATED".equals(i.getStatus()) || "HIGH".equals(i.getStatus()))));
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().equalsIgnoreCase("Creatinine") && ("ELEVATED".equals(i.getStatus()) || "HIGH".equals(i.getStatus()))));

        // Clinical reason should mention the abnormal indicators
        assertNotNull(response.getDoctorRecommendationReason());
        assertTrue(response.getDoctorRecommendationReason().contains("Glucose") || response.getDoctorRecommendationReason().contains("chỉ số bất thường"));
    }

    @Test
    @DisplayName("Should deduct quota when VIP subscription has expired even if tier string contains VIP")
    void testExpiredVipUserHasQuotaDeducted() {
        testUser.setSubscriptionTier("VIP_MONTHLY");
        testUser.setVipValidUntil(java.time.LocalDateTime.now().minusDays(2)); // Expired 2 days ago
        testUser.setScanQuota(3);

        String mockDoc = "BỆNH VIỆN BẠCH MAI\nKHOA XÉT NGHIỆM\nGlucose: 8.5 mmol/L (3.9 - 6.4)\nKết luận: Đái tháo đường.";
        MockMultipartFile file = new MockMultipartFile("file", "expired_vip.pdf", "application/pdf", mockDoc.getBytes());

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");
        assertNotNull(response);

        // Expired VIP must have their quota atomically deducted
        assertEquals(2, testUser.getScanQuota(), "Expired VIP quota must be decremented from 3 to 2");
        verify(userRepository, atLeastOnce()).deductScanQuota(eq(testUser.getId()));
    }

    @Test
    @DisplayName("Should NOT deduct quota for active VIP subscribers")
    void testActiveVipUserNeverHasQuotaDeducted() {
        testUser.setSubscriptionTier("VIP_MONTHLY");
        testUser.setVipValidUntil(java.time.LocalDateTime.now().plusDays(28)); // Active VIP for 28 days
        testUser.setScanQuota(5);

        String mockDoc = "BỆNH VIỆN CHỢ RẪY\nKHOA SINH HÓA\nCholesterol: 7.2 mmol/L (3.9 - 5.2)\nKết luận: Tăng mỡ máu.";
        MockMultipartFile file = new MockMultipartFile("file", "active_vip.pdf", "application/pdf", mockDoc.getBytes());

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");
        assertNotNull(response);

        // Active VIP quota must NEVER be touched
        assertEquals(5, testUser.getScanQuota(), "Active VIP scan quota must remain 5");
        verify(userRepository, never()).deductScanQuota(any());
    }

    @Test
    @DisplayName("Should trigger compensating action to restore quota if document validation fails")
    void testQuotaRestoredWhenValidationFails() {
        testUser.setScanQuota(2);
        testUser.setSubscriptionTier("FREE");

        doThrow(new AppException(HttpStatus.BAD_REQUEST, "NON_MEDICAL_DOCUMENT", "Tài liệu phi y tế"))
                .when(medicalDocumentValidator).validateDocument(any(), any(), any(), any());

        String receiptText = "HÓA ĐƠN TIỀN ĐIỆN VÀ NƯỚC THÁNG 9 NĂM 2026";
        MockMultipartFile file = new MockMultipartFile("file", "receipt.pdf", "application/pdf", receiptText.getBytes());

        AppException ex = assertThrows(AppException.class, () ->
                analysisService.analyzeDocument(file, "patient@mediassist.local")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());

        // Quota was deducted then restored by compensating rollback hook
        assertEquals(2, testUser.getScanQuota(), "User quota must be restored back to 2 after validation failure");
        verify(userRepository, times(1)).restoreScanQuota(eq(testUser.getId()));
        verify(rateLimiterService, times(1)).recordFailedUpload("patient@mediassist.local");
    }

    @Test
    @DisplayName("Should recover gracefully from concurrent deduplication race condition, restore extra quota, and return winning analysis")
    void testConcurrentDeduplicationRaceCondition_RecoversAndRestoresQuota() {
        testUser.setScanQuota(1);
        testUser.setSubscriptionTier("FREE");

        String mockDoc = "BỆNH VIỆN BẠCH MAI\nKHOA HUYẾT HỌC\nWBC: 12.5 G/L (4.0 - 10.0)\nBạch cầu tăng nhẹ.";
        MockMultipartFile file = new MockMultipartFile("file", "blood_race.pdf", "application/pdf", mockDoc.getBytes());

        UUID winnerDocId = UUID.randomUUID();
        MedicalDocument winnerDoc = new MedicalDocument();
        winnerDoc.setId(winnerDocId);
        winnerDoc.setUser(testUser);
        winnerDoc.setFileName("blood_race.pdf");
        winnerDoc.setFileSizeBytes(mockDoc.length());
        winnerDoc.setContentType("application/pdf");
        winnerDoc.setStorageUrl("https://supabase.co/storage/v1/object/public/medical-documents/winner.pdf");

        DocumentAnalysis winnerAnalysis = new DocumentAnalysis();
        winnerAnalysis.setId(UUID.randomUUID());
        winnerAnalysis.setDocument(winnerDoc);
        winnerAnalysis.setClinicalSummary("Chỉ số bạch cầu tăng nhẹ cảnh báo phản ứng viêm nhiễm.");
        winnerAnalysis.setPlainLanguageExplanation("Số lượng bạch cầu trong máu của bạn cao hơn bình thường.");
        winnerAnalysis.setRecommendedSpecialtySlug("infectious-diseases");
        winnerAnalysis.setRecommendedSpecialtyName("Truyền nhiễm - Huyết học");
        winnerAnalysis.setAbnormalIndicatorsJson("[]");
        winnerAnalysis.setSuggestedQuestionsJson("[]");

        // Simulate save throwing DataIntegrityViolationException due to concurrent duplicate
        when(medicalDocumentRepository.save(any(MedicalDocument.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key violates idx_med_doc_user_hash_unique"));

        when(medicalDocumentRepository.findFirstByUserIdAndFileHashOrderByCreatedAtDesc(eq(testUser.getId()), anyString()))
                .thenReturn(Optional.empty()) // first check at beginning
                .thenReturn(Optional.of(winnerDoc)); // during race recovery

        when(documentAnalysisRepository.findByDocumentId(winnerDocId)).thenReturn(Optional.of(winnerAnalysis));

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertTrue(response.isCachedResult());
        assertEquals("Truyền nhiễm - Huyết học", response.getRecommendedSpecialtyName());
        // Quota was restored back to 1
        assertEquals(1, testUser.getScanQuota());
        verify(userRepository, times(1)).restoreScanQuota(eq(testUser.getId()));
        verify(storageService, times(1)).deleteDocument(anyString());
    }

    @Test
    @DisplayName("Should extract all 5 lab indicators from single-space table and ignore CCCD / administrative fields")
    void testParseIndicators_MeddiesSingleSpaceTableAndBlacklistAdministrative() {
        String meddiesDocText = """
                BENH VIEN BACH MAI
                Khoa Noi Tiet - Dai Thao Duong
                So CCCD: 042406641746 The BHYT: DN4123456789
                Ma BN: BN2612345 Bac si: TS.BS Nguyen Van An
                TEN CHI SO KET QUA DON VI THAM CHIEU DANH GIA
                Glucose huyet doi 9.6 mmol/L 3.9 - 6.4 [!] TANG CAO
                HbA1c 8.7 % 4.0 - 6.0 [!] TANG CAO
                Ure 7.4 mmol/L 2.5 - 7.5 BINH THUONG
                Creatinine 82.0 umol/L 44.0 - 88.0 BINH THUONG
                Acid Uric 340.0 umol/L 200.0 - 420.0 BINH THUONG
                GHI CHU LAM SANG:
                Cac chi so bat thuong can duoc doi chieu voi trieu chung lam sang.
                """;

        List<com.mediassist.dto.AbnormalIndicatorDto> indicators =
                analysisService.parseIndicators(meddiesDocText, "Phieu_Xet_Nghiem_Le_Thi_Lan.pdf");

        assertNotNull(indicators);
        assertEquals(5, indicators.size(), "Must extract exactly 5 clinical indicators, ignoring administrative CCCD/BHYT");

        // Verify none of the administrative fields were captured
        assertTrue(indicators.stream().noneMatch(i -> i.getName().toLowerCase().contains("cccd")));
        assertTrue(indicators.stream().noneMatch(i -> i.getName().toLowerCase().contains("bhyt")));
        assertTrue(indicators.stream().noneMatch(i -> i.getName().toLowerCase().contains("ma bn")));
        assertTrue(indicators.stream().noneMatch(i -> i.getName().toLowerCase().contains("chi so")));

        // Verify Glucose
        com.mediassist.dto.AbnormalIndicatorDto glucose = indicators.stream()
                .filter(i -> i.getName().equalsIgnoreCase("Glucose huyet doi"))
                .findFirst().orElse(null);
        assertNotNull(glucose);
        assertEquals("9.6", glucose.getValue());
        assertEquals("mmol/L", glucose.getUnit());
        assertEquals("3.9 - 6.4", glucose.getReferenceRange());
        assertEquals("ELEVATED", glucose.getStatus());

        // Verify HbA1c
        com.mediassist.dto.AbnormalIndicatorDto hba1c = indicators.stream()
                .filter(i -> i.getName().equalsIgnoreCase("HbA1c"))
                .findFirst().orElse(null);
        assertNotNull(hba1c);
        assertEquals("8.7", hba1c.getValue());
        assertEquals("%", hba1c.getUnit());
        assertEquals("ELEVATED", hba1c.getStatus());

        // Verify Creatinine normal
        com.mediassist.dto.AbnormalIndicatorDto creatinine = indicators.stream()
                .filter(i -> i.getName().equalsIgnoreCase("Creatinine"))
                .findFirst().orElse(null);
        assertNotNull(creatinine);
        assertEquals("82.0", creatinine.getValue());
        assertEquals("NORMAL", creatinine.getStatus());
    }

    @Test
    @DisplayName("Should invalidate stale offline cache, trigger live AI analysis, and not double-charge quota")
    void testAnalyzeDocument_InvalidatesStaleOfflineCacheAndUpserts() {
        testUser.setScanQuota(1);
        testUser.setSubscriptionTier("FREE");

        String docText = """
                BENH VIEN BACH MAI
                Glucose huyet doi 9.6 mmol/L 3.9 - 6.4 [!] TANG CAO
                HbA1c 8.7 % 4.0 - 6.0 [!] TANG CAO
                """;
        MockMultipartFile file = new MockMultipartFile("file", "Phieu_Xet_Nghiem_Le_Thi_Lan.pdf", "application/pdf", docText.getBytes());

        UUID existingDocId = UUID.randomUUID();
        MedicalDocument staleDoc = new MedicalDocument();
        staleDoc.setId(existingDocId);
        staleDoc.setUser(testUser);
        staleDoc.setFileName("Phieu_Xet_Nghiem_Le_Thi_Lan.pdf");
        staleDoc.setStorageUrl("https://supabase.co/storage/v1/object/public/medical-documents/stale.pdf");

        DocumentAnalysis staleAnalysis = new DocumentAnalysis();
        staleAnalysis.setId(UUID.randomUUID());
        staleAnalysis.setDocument(staleDoc);
        staleAnalysis.setClinicalSummary("Chế độ Ngoại tuyến: Hệ thống đã bóc tách các chỉ số xét nghiệm thô từ tài liệu. Chưa có suy luận chẩn đoán bệnh lý do chưa kết nối API Key.");
        staleAnalysis.setAbnormalIndicatorsJson("[]");

        when(medicalDocumentRepository.findFirstByUserIdAndFileHashOrderByCreatedAtDesc(eq(testUser.getId()), anyString()))
                .thenReturn(Optional.of(staleDoc));
        when(documentAnalysisRepository.findByDocumentId(existingDocId))
                .thenReturn(Optional.of(staleAnalysis));

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertFalse(response.isCachedResult(), "Stale offline cache must be invalidated and re-analyzed with live AI");
        // Quota should NOT be deducted when re-analyzing stale offline
        assertEquals(1, testUser.getScanQuota(), "Quota should not be deducted again for stale offline re-analysis");
        verify(documentAnalysisRepository, times(1)).save(any(DocumentAnalysis.class));
    }

    @Test
    @DisplayName("Should return 0 doctors and clinical warning on cached blank/unreadable document")
    void testBuildCachedResponseOnBlankDocument_ZeroFakeRecommendations() {
        MockMultipartFile file = new MockMultipartFile("file", "blank.pdf", "application/pdf", "blank test content".getBytes());

        UUID existingDocId = UUID.randomUUID();
        MedicalDocument blankDoc = new MedicalDocument();
        blankDoc.setId(existingDocId);
        blankDoc.setUser(testUser);
        blankDoc.setFileName("blank.pdf");
        blankDoc.setStorageUrl("https://supabase.co/storage/v1/object/public/medical-documents/blank.pdf");

        DocumentAnalysis blankAnalysis = new DocumentAnalysis();
        blankAnalysis.setId(UUID.randomUUID());
        blankAnalysis.setDocument(blankDoc);
        blankAnalysis.setClinicalSummary("Tài liệu y tế chưa ghi nhận kết quả đo lường cụ thể.");
        blankAnalysis.setPlainLanguageExplanation("Phiếu xét nghiệm của bạn chưa có kết quả đo lường.");
        blankAnalysis.setRecommendedSpecialtySlug(null); // null specialty!
        blankAnalysis.setRecommendedSpecialtyName("Chưa xác định (Cần bổ sung kết quả)");
        blankAnalysis.setAbnormalIndicatorsJson("[]");
        blankAnalysis.setSuggestedQuestionsJson("[]");

        when(medicalDocumentRepository.findFirstByUserIdAndFileHashOrderByCreatedAtDesc(eq(testUser.getId()), anyString()))
                .thenReturn(Optional.of(blankDoc));
        when(documentAnalysisRepository.findByDocumentId(existingDocId))
                .thenReturn(Optional.of(blankAnalysis));

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertTrue(response.isCachedResult());
        assertNull(response.getRecommendedSpecialtySlug());
        // Verify ZERO fake doctor recommendations on cached blank document!
        assertNotNull(response.getMatchedDoctors());
        assertTrue(response.getMatchedDoctors().isEmpty(), "Matched doctors must be empty on cached blank document");
        assertNotNull(response.getDoctorRecommendationReason());
        assertTrue(response.getDoctorRecommendationReason().contains("Không đủ cơ sở lâm sàng"),
                "Doctor recommendation reason must explain insufficient clinical evidence");
    }

    @Test
    @DisplayName("Should preserve clinical fungal tests, wet mounts, and 24-hour urine/glucose indicators")
    void testParseIndicators_PreservesFungalTestsAndWetMountAnd24HourTests() {
        String labText = """
                BỆNH VIỆN BẠCH MAI - KHOA VI SINH & SINH HÓA
                Họ và tên: Nguyễn Văn E - Tuổi: 35 - Giới tính: Nam
                Ngày lấy mẫu: 15/09/2026 - Giờ: 08:30
                
                Soi tươi tìm nấm: 2.0 CFU/ml (Tham chiếu: 0.0 - 0.0) -> TĂNG
                Nấm men: 10.5 CFU/ml (Tham chiếu: 0.0 - 0.0) -> TĂNG CAO
                Protein niệu 24 giờ: 0.85 g/24h (Tham chiếu: 0.0 - 0.15) -> TĂNG CAO
                Glucose 2 giờ: 11.2 mmol/L (Tham chiếu: 3.9 - 7.8) -> TĂNG CAO
                """;

        List<com.mediassist.dto.AbnormalIndicatorDto> indicators = analysisService.parseIndicators(labText, "test_microbiology.pdf");

        assertNotNull(indicators);
        assertFalse(indicators.isEmpty(), "Indicators must not be empty");

        boolean hasSoiTuoi = indicators.stream().anyMatch(i -> i.getName().toLowerCase().contains("soi") || i.getName().toLowerCase().contains("tươi"));
        boolean hasNamMen = indicators.stream().anyMatch(i -> i.getName().toLowerCase().contains("nấm") || i.getName().toLowerCase().contains("nam"));
        boolean hasProtein24h = indicators.stream().anyMatch(i -> i.getName().toLowerCase().contains("protein") || i.getName().toLowerCase().contains("24"));
        boolean hasGlucose2h = indicators.stream().anyMatch(i -> i.getName().toLowerCase().contains("glucose"));

        assertTrue(hasSoiTuoi, "Wet mount / fungal indicator must be preserved");
        assertTrue(hasNamMen, "Fungal indicator (Nấm men) must not be suppressed by 'nam' blacklist");
        assertTrue(hasProtein24h, "24-hour urine protein test must not be suppressed by 'gio' blacklist");
        assertTrue(hasGlucose2h, "2-hour glucose test must not be suppressed by 'gio' blacklist");
    }

    @Test
    @DisplayName("Should re-order matchedDoctors in analyzeDocument when AI explicitly selects specific candidate")
    void testAnalyzeDocument_ReordersMatchedDoctorsWhenAiSelectsSpecificCandidate() {
        String docText = """
                BỆNH VIỆN BẠCH MAI
                Glucose huyet doi: 9.6 mmol/L (Tham chiếu: 3.9 - 6.4) -> TĂNG CAO
                HbA1c: 8.7 % (Tham chiếu: 4.0 - 6.0) -> TĂNG CAO
                """;
        MockMultipartFile file = new MockMultipartFile("file", "xet_nghiem.pdf", "application/pdf", docText.getBytes());

        UUID docAId = UUID.randomUUID();
        DoctorMatchDto docA = new DoctorMatchDto(
                docAId, "BS. A", "Nội tiết", "CCHN-01", 10, new BigDecimal("300000"), 0.95, List.of("Endocrinology")
        );

        UUID docBId = UUID.randomUUID();
        DoctorMatchDto docB = new DoctorMatchDto(
                docBId, "TS. BS. B", "Đái tháo đường", "CCHN-02", 18, new BigDecimal("450000"), 0.90, List.of("Endocrinology")
        );

        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        mockResult.setRecommendedSpecialtySlug("endocrinology");
        mockResult.setRecommendedSpecialtyName("Endocrinology & Diabetes");
        mockResult.setClinicalSummary("Bệnh nhân có tăng đường huyết mạn tính.");
        mockResult.setPlainLanguageExplanation("Đường huyết của bạn cao.");
        // AI explicitly recommends Doctor B
        mockResult.setRecommendedDoctorId(docBId);
        mockResult.setDoctorRecommendationReason("Bác sĩ B chuyên sâu về đái tháo đường type 2");

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(docText);
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(mockResult);
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4))).thenReturn(new java.util.ArrayList<>(List.of(docA, docB)));

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, "patient@mediassist.local");

        assertNotNull(response);
        assertNotNull(response.getMatchedDoctors());
        assertEquals(2, response.getMatchedDoctors().size());
        // Verify Doc B was promoted to index 0!
        assertEquals(docBId, response.getMatchedDoctors().get(0).getDoctorId());
        assertTrue(response.getMatchedDoctors().get(0).isAiRecommended());
        assertEquals(docAId, response.getMatchedDoctors().get(1).getDoctorId());
        assertFalse(response.getMatchedDoctors().get(1).isAiRecommended());
    }

    @Test
    @DisplayName("Should analyze multiple documents (PDF + Image) simultaneously in batch mode")
    void testAnalyzeDocuments_MultiFileBatchSimultaneousUpload() {
        byte[] pdfMagic = new byte[]{'%', 'P', 'D', 'F', '-', '1', '.', '4', '\n'};
        String pdfContent = "BỆNH VIỆN BẠCH MAI\nGlucose huyet doi: 8.5 mmol/L (Tham chiếu: 3.9 - 6.4) -> TĂNG CAO";
        byte[] pdfBytes = new byte[pdfMagic.length + pdfContent.getBytes().length];
        System.arraycopy(pdfMagic, 0, pdfBytes, 0, pdfMagic.length);
        System.arraycopy(pdfContent.getBytes(), 0, pdfBytes, pdfMagic.length, pdfContent.getBytes().length);

        // JPEG Magic bytes 0xFF 0xD8 0xFF
        byte[] jpegMagic = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1};
        String ocrContent = "PHÒNG XÉT NGHIỆM ĐA KHOA\nCreatinine: 145 umol/L (Tham chiếu: 62 - 106) -> TĂNG CAO";
        byte[] jpegBytes = new byte[jpegMagic.length + ocrContent.getBytes().length];
        System.arraycopy(jpegMagic, 0, jpegBytes, 0, jpegMagic.length);
        System.arraycopy(ocrContent.getBytes(), 0, jpegBytes, jpegMagic.length, ocrContent.getBytes().length);

        MockMultipartFile file1 = new MockMultipartFile("files", "blood_test.pdf", "application/pdf", pdfBytes);
        MockMultipartFile file2 = new MockMultipartFile("files", "kidney_scan.jpg", "image/jpeg", jpegBytes);

        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        mockResult.setRecommendedSpecialtySlug("endocrinology");
        mockResult.setRecommendedSpecialtyName("Endocrinology & Diabetes");
        mockResult.setClinicalSummary("Bệnh nhân có tăng đường huyết và tăng Creatinine máu.");
        mockResult.setPlainLanguageExplanation("Chỉ số đường huyết và chức năng thận của bạn bất thường.");

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(pdfContent);
        when(clinicalRagService.canProcessVision()).thenReturn(true);
        when(clinicalRagService.extractTextWithVision(any(byte[].class), anyString(), anyString())).thenReturn(ocrContent);
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(mockResult);

        DocumentAnalysisResponse response = analysisService.analyzeDocuments(List.of(file1, file2), "patient@mediassist.local");

        assertNotNull(response);
        assertEquals(2, response.getFilesCount());
        assertNotNull(response.getFileNames());
        assertEquals(2, response.getFileNames().size());
        assertTrue(response.getFileNames().contains("blood_test.pdf"));
        assertTrue(response.getFileNames().contains("kidney_scan.jpg"));
        // Deducted exactly 1 quota for the entire multi-file batch
        assertEquals(0, testUser.getScanQuota());
    }

    @Test
    @DisplayName("Should truncate synthesized filename under 250 chars to avoid VARCHAR(255) database exception")
    void testAnalyzeDocuments_LongFilenamesTruncatedUnderVarchar255() {
        testUser.setScanQuota(1);

        byte[] pdfMagic = new byte[]{'%', 'P', 'D', 'F', '-'};
        String pdfContent = "HỒ SƠ BỆNH ÁN CHI TIẾT - PHIẾU XÉT NGHIỆM TỔNG QUÁT\nGlucose: 10.5 mmol/L";
        byte[] pdfBytes = new byte[pdfMagic.length + pdfContent.getBytes().length];
        System.arraycopy(pdfMagic, 0, pdfBytes, 0, pdfMagic.length);
        System.arraycopy(pdfContent.getBytes(), 0, pdfBytes, pdfMagic.length, pdfContent.getBytes().length);

        String longName1 = "Bao_cao_ket_qua_xet_nghiem_tong_quat_benh_vien_da_khoa_trung_uong_can_tho_ngay_15_09_2026_khoa_hoa_sinh_lam_sang_bac_si_le_van_tam.pdf";
        String longName2 = "Phieu_chup_x_quang_ky_thuat_so_tim_phoi_thang_chuan_doan_hinh_anh_benh_vien_cho_ray_thanh_pho_ho_chi_minh_20260915_001239.pdf";
        String longName3 = "Giay_ra_vien_va_don_thuoc_dien_tu_dieu_tri_ngoai_tru_benh_vien_dai_hoc_y_duoc_thanh_pho_ho_chi_minh_co_so_1_khoa_kham_benh.pdf";

        MockMultipartFile f1 = new MockMultipartFile("files", longName1, "application/pdf", pdfBytes);
        MockMultipartFile f2 = new MockMultipartFile("files", longName2, "application/pdf", pdfBytes);
        MockMultipartFile f3 = new MockMultipartFile("files", longName3, "application/pdf", pdfBytes);

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(pdfContent);
        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setModelUsed("mock-model");
        mockResult.setClinicalSummary("Summary");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(mockResult);

        DocumentAnalysisResponse response = analysisService.analyzeDocuments(List.of(f1, f2, f3), "patient@mediassist.local");

        assertNotNull(response);
        assertEquals(3, response.getFilesCount());
        // Verify document saved has fileName <= 250 characters
        verify(medicalDocumentRepository).save(argThat(doc -> doc.getFileName() != null && doc.getFileName().length() <= 250 && doc.getFileName().endsWith("...")));
    }

    @Test
    @DisplayName("Should detect multi-patient batch and segregate individual clinical analysis and matched doctors")
    void testAnalyzeDocuments_MultiPatient_SegregatesIndividually() {
        testUser.setScanQuota(1);

        byte[] pdfMagic = new byte[]{'%', 'P', 'D', 'F', '-'};
        String p1Content = "BỆNH VIỆN BẠCH MAI\nBỆNH NHÂN: NGUYỄN VĂN BÌNH\nTuổi: 52\nGiới tính: Nam\nGlucose: 14.5 mmol/L";
        String p2Content = "BỆNH VIỆN CHỢ RẪY\nBỆNH NHÂN: HOÀNG THU TRANG\nTuổi: 29\nGiới tính: Nữ\nAST: 85 U/L";

        byte[] b1 = new byte[pdfMagic.length + p1Content.getBytes().length];
        System.arraycopy(pdfMagic, 0, b1, 0, pdfMagic.length);
        System.arraycopy(p1Content.getBytes(), 0, b1, pdfMagic.length, p1Content.getBytes().length);

        byte[] b2 = new byte[pdfMagic.length + p2Content.getBytes().length];
        System.arraycopy(pdfMagic, 0, b2, 0, pdfMagic.length);
        System.arraycopy(p2Content.getBytes(), 0, b2, pdfMagic.length, p2Content.getBytes().length);

        MockMultipartFile f1 = new MockMultipartFile("files", "nguyen_van_binh_blood.pdf", "application/pdf", b1);
        MockMultipartFile f2 = new MockMultipartFile("files", "hoang_thu_trang_liver.pdf", "application/pdf", b2);

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenAnswer(inv -> {
            byte[] arg = inv.getArgument(0);
            String str = new String(arg, java.nio.charset.StandardCharsets.UTF_8);
            if (str.contains("HOÀNG THU TRANG")) {
                return p2Content;
            }
            return p1Content;
        });

        com.mediassist.ai.ClinicalAiResult res1 = new com.mediassist.ai.ClinicalAiResult();
        res1.setModelUsed("gemini-flash");
        res1.setClinicalSummary("Bệnh nhân Bình có đường huyết tăng cao");
        res1.setRecommendedSpecialtySlug("endocrinology");
        res1.setRecommendedSpecialtyName("Nội tiết - Đái tháo đường");

        com.mediassist.ai.ClinicalAiResult res2 = new com.mediassist.ai.ClinicalAiResult();
        res2.setModelUsed("gemini-flash");
        res2.setClinicalSummary("Bệnh nhân Trang có men gan tăng cao");
        res2.setRecommendedSpecialtySlug("gastroenterology");
        res2.setRecommendedSpecialtyName("Tiêu hóa - Gan mật");

        when(clinicalRagService.performDocumentRagAnalysis(anyString(), eq("nguyen_van_binh_blood.pdf"), any()))
                .thenReturn(res1);
        when(clinicalRagService.performDocumentRagAnalysis(anyString(), eq("hoang_thu_trang_liver.pdf"), any()))
                .thenReturn(res2);

        DoctorMatchDto docEndo = new DoctorMatchDto();
        docEndo.setDoctorId(UUID.randomUUID());
        docEndo.setFullName("BS CKII Lê Văn Nội Tiết");

        DoctorMatchDto docGastro = new DoctorMatchDto();
        docGastro.setDoctorId(UUID.randomUUID());
        docGastro.setFullName("BS CKI Trần Thị Tiêu Hóa");

        lenient().when(doctorSemanticSearchService.searchDoctors(anyString(), anyInt()))
                .thenAnswer(inv -> {
                    String q = inv.getArgument(0);
                    if (q.contains("endocrinology") || q.contains("Glucose") || q.contains("BÌNH")) {
                        return List.of(docEndo);
                    }
                    return List.of(docGastro);
                });

        DocumentAnalysisResponse resp = analysisService.analyzeDocuments(List.of(f1, f2), "patient@mediassist.local");

        assertNotNull(resp);
        assertTrue(resp.isMultiPatientDetected());
        assertEquals(2, resp.getFilesCount());
        assertNotNull(resp.getPatientAnalyses());
        assertEquals(2, resp.getPatientAnalyses().size());

        var pAnalysis1 = resp.getPatientAnalyses().get(0);
        assertEquals("nguyen_van_binh_blood.pdf", pAnalysis1.getSourceFileName());
        assertTrue(pAnalysis1.getPatientName().toUpperCase().contains("NGUYỄN VĂN BÌNH"));
        assertEquals("Nội tiết - Đái tháo đường", pAnalysis1.getRecommendedSpecialtyName());

        var pAnalysis2 = resp.getPatientAnalyses().get(1);
        assertEquals("hoang_thu_trang_liver.pdf", pAnalysis2.getSourceFileName());
        assertTrue(pAnalysis2.getPatientName().toUpperCase().contains("HOÀNG THU TRANG"));
        assertEquals("Tiêu hóa - Gan mật", pAnalysis2.getRecommendedSpecialtyName());

        assertEquals(0, testUser.getScanQuota());
    }

    @Test
    @DisplayName("Should not trigger multi-patient segregation when all files belong to same patient")
    void testAnalyzeDocuments_SamePatientMultiFiles_Consolidates() {
        testUser.setScanQuota(1);

        byte[] pdfMagic = new byte[]{'%', 'P', 'D', 'F', '-'};
        String p1Content = "BỆNH VIỆN BẠCH MAI\nBỆNH NHÂN: NGUYỄN VĂN BÌNH\nTuổi: 52\nGiới tính: Nam\nGlucose: 14.5 mmol/L";
        String p2Content = "BỆNH VIỆN BẠCH MAI\nBỆNH NHÂN: NGUYỄN VĂN BÌNH\nTuổi: 52\nGiới tính: Nam\nHbA1c: 8.5 %";

        byte[] b1 = new byte[pdfMagic.length + p1Content.getBytes().length];
        System.arraycopy(pdfMagic, 0, b1, 0, pdfMagic.length);
        System.arraycopy(p1Content.getBytes(), 0, b1, pdfMagic.length, p1Content.getBytes().length);

        byte[] b2 = new byte[pdfMagic.length + p2Content.getBytes().length];
        System.arraycopy(pdfMagic, 0, b2, 0, pdfMagic.length);
        System.arraycopy(p2Content.getBytes(), 0, b2, pdfMagic.length, p2Content.getBytes().length);

        MockMultipartFile f1 = new MockMultipartFile("files", "page1.pdf", "application/pdf", b1);
        MockMultipartFile f2 = new MockMultipartFile("files", "page2.pdf", "application/pdf", b2);

        when(pdfExtractionService.extractTextFromPdf(any(byte[].class))).thenReturn(p1Content);

        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setModelUsed("mock-model");
        mockResult.setClinicalSummary("Bệnh nhân Bình đái tháo đường");
        when(clinicalRagService.performDocumentRagAnalysis(any(), any(), any())).thenReturn(mockResult);

        DocumentAnalysisResponse resp = analysisService.analyzeDocuments(List.of(f1, f2), "patient@mediassist.local");

        assertNotNull(resp);
        assertFalse(resp.isMultiPatientDetected());
        assertEquals(2, resp.getFilesCount());
        assertEquals(0, testUser.getScanQuota());
    }
}
