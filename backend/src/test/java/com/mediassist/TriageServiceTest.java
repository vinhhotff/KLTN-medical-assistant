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
        mockResult.setSbarSummary("SBAR RAG summary");
        mockResult.setAiAdvice("Clinical advice from AI");
        lenient().when(clinicalRagService.performTriageRagAnalysis(any(), any(), any())).thenReturn(mockResult);

        when(triageSessionRepository.save(any(TriageSession.class)))
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
    @DisplayName("Should perform clinical triage and match doctors for routine symptoms")
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
        assertNotNull(response.getSbarSummary());
        assertFalse(response.getMatchedDoctors().isEmpty());
        assertEquals("TS. BS. Nguyễn Văn An", response.getMatchedDoctors().get(0).getFullName());
        assertEquals(0.92, response.getMatchedDoctors().get(0).getSimilarityScore(), 0.001);
    }
}
