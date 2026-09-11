package com.mediassist;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.model.entity.DocumentAnalysis;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.repository.DocumentAnalysisRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.MedicalDocumentAnalysisService;
import com.mediassist.service.PdfExtractionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.List;
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

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MedicalDocumentAnalysisService analysisService;

    @BeforeEach
    void setUp() {
        when(medicalDocumentRepository.save(any(MedicalDocument.class)))
                .thenAnswer(inv -> {
                    MedicalDocument doc = inv.getArgument(0);
                    doc.setId(UUID.randomUUID());
                    return doc;
                });
        when(documentAnalysisRepository.save(any(DocumentAnalysis.class)))
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

        DocumentAnalysisResponse response = analysisService.analyzeDocument(file, null);

        assertNotNull(response);
        assertEquals("gastroenterology", response.getRecommendedSpecialtySlug());
        assertTrue(response.getIndicators().stream().anyMatch(i -> i.getName().contains("ALT") && "ELEVATED".equals(i.getStatus())));
    }
}
