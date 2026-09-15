package com.mediassist;

import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.TriageRequest;
import com.mediassist.dto.TriageResponse;
import com.mediassist.model.entity.TriageSession;
import com.mediassist.model.entity.TriageUrgencyLevel;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.TriageSessionRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.RedFlagService;
import com.mediassist.service.TriageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TriageServiceTest {

    @Mock
    private RedFlagService redFlagService;

    @Mock
    private DoctorSemanticSearchService doctorSemanticSearchService;

    @Mock
    private TriageSessionRepository triageSessionRepository;

    @Mock
    private SpecialtyRepository specialtyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.mediassist.service.ClinicalRagService clinicalRagService;

    @InjectMocks
    private TriageService triageService;

    @BeforeEach
    void setUp() {
        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        mockResult.setRecommendedSpecialtySlug("cardiology");
        mockResult.setRecommendedSpecialtyName("Cardiology (Tim Mạch)");
        mockResult.setUrgencyLevel("ROUTINE");
        mockResult.setSbarSummary("SBAR RAG summary");
        mockResult.setAiAdvice("Clinical advice from AI");
        mockResult.setClarifyingQuestions(List.of("Cơn hồi hộp xuất hiện lúc gắng sức hay nghỉ ngơi?"));

        lenient().when(clinicalRagService.performTriageRagAnalysis(anyString(), anyList())).thenReturn(mockResult);
        lenient().when(clinicalRagService.performTriageRagAnalysis(anyString(), any(), anyList())).thenReturn(mockResult);

        lenient().when(triageSessionRepository.save(any(TriageSession.class)))
                .thenAnswer(inv -> {
                    TriageSession s = inv.getArgument(0);
                    s.setId(UUID.randomUUID());
                    return s;
                });
    }

    @Test
    @DisplayName("Should immediately trigger Emergency mode when red-flag detected")
    void testAssessSymptomsWithEmergency() {
        when(redFlagService.evaluateRedFlag(anyString()))
                .thenReturn(Optional.of("CẢNH BÁO Y TẾ KHẨN CẤP: Gọi ngay 115!"));

        TriageRequest request = new TriageRequest("Tôi bị đau thắt ngực dữ dội", null);
        TriageResponse response = triageService.assessSymptoms(request, null);

        assertTrue(response.isEmergency());
        assertEquals(TriageUrgencyLevel.EMERGENCY, response.getUrgencyLevel());
        assertNotNull(response.getEmergencyAlert());
        assertTrue(response.getMatchedDoctors().isEmpty());
        verify(doctorSemanticSearchService, never()).searchDoctors(anyString(), anyInt());
    }

    @Test
    @DisplayName("Should perform AI-first clinical triage and match doctors via pgvector")
    void testAssessSymptomsRoutine() {
        when(redFlagService.evaluateRedFlag(anyString())).thenReturn(Optional.empty());

        DoctorMatchDto match = new DoctorMatchDto(
                UUID.randomUUID(), "TS. BS. Nguyễn Văn An", "Chuyên gia tim mạch",
                "008921/BYT-CCHN", 15, new BigDecimal("350000.00"), 0.92,
                List.of("Cardiology (Tim Mạch)")
        );
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4)))
                .thenReturn(List.of(match));

        TriageRequest request = new TriageRequest("Tôi thỉnh thoảng thấy hồi hộp và đánh trống ngực", null);
        TriageResponse response = triageService.assessSymptoms(request, null);

        assertFalse(response.isEmergency());
        assertEquals(TriageUrgencyLevel.ROUTINE, response.getUrgencyLevel());
        assertEquals("cardiology", response.getPrimarySpecialtySlug());
        assertEquals("Cardiology (Tim Mạch)", response.getPrimarySpecialtyName());
        assertNotNull(response.getSbarSummary());
        assertFalse(response.getMatchedDoctors().isEmpty());
        assertEquals("TS. BS. Nguyễn Văn An", response.getMatchedDoctors().get(0).getFullName());
        assertEquals(0.92, response.getMatchedDoctors().get(0).getSimilarityScore(), 0.001);
        assertFalse(response.getClarifyingQuestions().isEmpty());
    }

    @Test
    @DisplayName("Should safely fallback to General Internal Medicine when AI returns empty specialty without hardcoding")
    void testAssessSymptomsOfflineFallback() {
        when(redFlagService.evaluateRedFlag(anyString())).thenReturn(Optional.empty());

        com.mediassist.ai.ClinicalAiResult offlineResult = new com.mediassist.ai.ClinicalAiResult();
        offlineResult.setModelUsed("local-deterministic-engine (Safe Offline Fallback)");
        offlineResult.setRecommendedSpecialtySlug(null);
        offlineResult.setUrgencyLevel("ROUTINE");
        offlineResult.setSbarSummary("SBAR Offline Fallback");
        offlineResult.setAiAdvice("Offline advice");

        when(clinicalRagService.performTriageRagAnalysis(anyString(), anyList())).thenReturn(offlineResult);
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4))).thenReturn(Collections.emptyList());

        TriageRequest request = new TriageRequest("Tôi bị mệt mỏi và chán ăn kéo dài", null);
        TriageResponse response = triageService.assessSymptoms(request, null);

        assertFalse(response.isEmergency());
        assertEquals("general-internal-medicine", response.getPrimarySpecialtySlug());
        assertEquals("General Internal Medicine (Nội Tổng Quát)", response.getPrimarySpecialtyName());
        assertEquals(TriageUrgencyLevel.ROUTINE, response.getUrgencyLevel());
        assertNotNull(response.getClarifyingQuestions());
    }

    @Test
    @DisplayName("Should throw BAD_REQUEST AppException when request or symptoms are null or blank")
    void testAssessSymptomsThrowsOnNullOrBlankRequest() {
        assertThrows(com.mediassist.common.AppException.class, () -> triageService.assessSymptoms(null, null));
        assertThrows(com.mediassist.common.AppException.class, () -> triageService.assessSymptoms(new TriageRequest(null, null), null));
        assertThrows(com.mediassist.common.AppException.class, () -> triageService.assessSymptoms(new TriageRequest("   ", null), null));
    }

    @Test
    @DisplayName("Should re-order matchedDoctors so that doctor recommended by AI is placed at index 0")
    void testAssessSymptomsReordersMatchedDoctorsWhenAiSelectsSpecificDoctor() {
        when(redFlagService.evaluateRedFlag(anyString())).thenReturn(Optional.empty());

        UUID docAId = UUID.randomUUID();
        DoctorMatchDto docA = new DoctorMatchDto(
                docAId, "BS. CKII Lê Văn A", "Tim mạch", "CCHN-01", 10, new BigDecimal("300000"), 0.95, List.of("Cardiology")
        );

        UUID docBId = UUID.randomUUID();
        DoctorMatchDto docB = new DoctorMatchDto(
                docBId, "TS. BS. Nguyễn Văn B", "Tim mạch chuyên sâu", "CCHN-02", 18, new BigDecimal("450000"), 0.90, List.of("Cardiology")
        );

        // AI explicitly recommends Doctor B
        com.mediassist.ai.ClinicalAiResult mockResult = new com.mediassist.ai.ClinicalAiResult();
        mockResult.setRecommendedSpecialtySlug("cardiology");
        mockResult.setRecommendedSpecialtyName("Cardiology (Tim Mạch)");
        mockResult.setUrgencyLevel("ROUTINE");
        mockResult.setSbarSummary("SBAR RAG summary");
        mockResult.setAiAdvice("Clinical advice from AI");
        mockResult.setRecommendedDoctorId(docBId);
        mockResult.setDoctorRecommendationReason("Bác sĩ B có chuyên môn sâu về rối loạn nhịp tim");

        when(clinicalRagService.performTriageRagAnalysis(anyString(), anyList())).thenReturn(mockResult);
        // pgvector broad search and focused search returns docA at index 0, docB at index 1
        when(doctorSemanticSearchService.searchDoctors(anyString(), eq(4))).thenReturn(new java.util.ArrayList<>(List.of(docA, docB)));

        TriageRequest request = new TriageRequest("Tôi hay bị đánh trống ngực hồi hộp", null);
        TriageResponse response = triageService.assessSymptoms(request, null);

        assertNotNull(response);
        assertEquals(2, response.getMatchedDoctors().size());
        // Verify Doc B was moved to index 0!
        assertEquals(docBId, response.getMatchedDoctors().get(0).getDoctorId());
        assertTrue(response.getMatchedDoctors().get(0).isAiRecommended());
        assertEquals("Bác sĩ B có chuyên môn sâu về rối loạn nhịp tim", response.getMatchedDoctors().get(0).getAiRecommendationReason());
        // Verify Doc A is at index 1 and not marked as top
        assertEquals(docAId, response.getMatchedDoctors().get(1).getDoctorId());
        assertFalse(response.getMatchedDoctors().get(1).isAiRecommended());
    }

    @Test
    @DisplayName("Should detect non-medical / off-topic input, set medicalRelated=false, and suppress doctor matching")
    void testAssessSymptomsOffTopicNonMedical() {
        when(redFlagService.evaluateRedFlag(anyString())).thenReturn(Optional.empty());

        com.mediassist.ai.ClinicalAiResult offTopicResult = new com.mediassist.ai.ClinicalAiResult();
        offTopicResult.setModelUsed("google/gemini-2.5-flash");
        offTopicResult.setMedicalRelated(false);
        offTopicResult.setRecommendedSpecialtySlug(null);
        offTopicResult.setRecommendedSpecialtyName("Không thuộc phạm vi y tế");
        offTopicResult.setUrgencyLevel("ROUTINE");
        offTopicResult.setSbarSummary("• Situation: Yêu cầu không thuộc phạm vi triệu chứng lâm sàng.");
        offTopicResult.setAiAdvice("Chào bạn! Tôi là Trợ lý Phân luồng Lâm sàng MediAssist-AI. Câu hỏi của bạn không liên quan đến y tế.");

        when(clinicalRagService.performTriageRagAnalysis(anyString(), anyList())).thenReturn(offTopicResult);

        TriageRequest request = new TriageRequest("Thời tiết hôm nay thế nào, trời có mưa không?", null);
        TriageResponse response = triageService.assessSymptoms(request, null);

        assertNotNull(response);
        assertFalse(response.isEmergency());
        assertFalse(response.isMedicalRelated());
        assertNull(response.getPrimarySpecialtySlug());
        assertEquals("Không thuộc phạm vi y tế", response.getPrimarySpecialtyName());
        assertEquals(TriageUrgencyLevel.ROUTINE, response.getUrgencyLevel());
        assertNotNull(response.getMatchedDoctors());
        assertTrue(response.getMatchedDoctors().isEmpty(), "Matched doctors must be empty for off-topic query");
        assertNull(response.getDoctorRecommendationReason(), "Doctor recommendation reason must be null for off-topic query");
        assertNotNull(response.getAiAdvice());
        assertNotNull(response.getClarifyingQuestions());
    }
}
