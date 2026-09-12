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
        lenient().when(storageService.uploadDocument(any(), any(), any(), any()))
                .thenReturn("https://supabase.co/storage/v1/object/public/medical-documents/test.pdf");

        lenient().when(medicalDocumentRepository.save(any(MedicalDocument.class)))
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
        verify(doctorSemanticSearchService).searchDoctors(queryCaptor.capture(), eq(4));
        String capturedQuery = queryCaptor.getValue();
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
}
