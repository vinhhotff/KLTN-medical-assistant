package com.mediassist.service;

import com.mediassist.ai.AiModelRouter;
import com.mediassist.ai.ClinicalAiResult;
import com.mediassist.dto.DoctorMatchDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClinicalRagServiceTest {

    @Mock
    private AiModelRouter aiModelRouter;

    private ClinicalRagService clinicalRagService;

    @BeforeEach
    void setUp() {
        clinicalRagService = new ClinicalRagService(aiModelRouter);
    }

    @Test
    @DisplayName("Should assemble RAG prompt with candidate doctors and tag matched doctor")
    void shouldPerformDocumentRagAnalysisAndTagDoctor() {
        UUID doc1Id = UUID.randomUUID();
        UUID doc2Id = UUID.randomUUID();

        DoctorMatchDto doc1 = new DoctorMatchDto(
                doc1Id, "Nguyen Van A", "BS CKII chuyen khoa Noi tiet", "012345/CCHN",
                15, BigDecimal.valueOf(350000), 0.92, List.of("Noi tiet"),
                "BS.CKII", "BV Cho Ray"
        );
        DoctorMatchDto doc2 = new DoctorMatchDto(
                doc2Id, "Tran Thi B", "Thac si bac si tim mach", "067890/CCHN",
                10, BigDecimal.valueOf(300000), 0.85, List.of("Tim mach"),
                "ThS.BS", "BV Dai hoc Y Duoc"
        );

        List<DoctorMatchDto> candidates = new ArrayList<>(List.of(doc1, doc2));

        ClinicalAiResult aiResult = new ClinicalAiResult();
        aiResult.setClinicalSummary("Benh nhan co chi so Glucose va HbA1c cao, nghi ngo Dai thao duong typ 2.");
        aiResult.setPlainLanguageExplanation("Luong duong trong mau cua ban dang cao hon binh thuong.");
        aiResult.setRecommendedDoctorId(doc1Id);
        aiResult.setDoctorRecommendationReason("Bac si A la chuyen gia dau nganh Noi tiet tai BV Cho Ray.");
        aiResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");

        when(aiModelRouter.routeClinicalAnalysis(anyString(), anyString())).thenReturn(aiResult);

        ClinicalAiResult result = clinicalRagService.performDocumentRagAnalysis(
                "Ket qua xet nghiem: Glucose: 11.2 mmol/L, HbA1c: 8.5%", "xet-nghiem-mau.pdf", candidates
        );

        assertThat(result).isNotNull();
        assertThat(result.getModelUsed()).contains("gemini");
        assertThat(doc1.isAiRecommended()).isTrue();
        assertThat(doc1.getAiRecommendationReason()).contains("BV Cho Ray");
        assertThat(doc2.isAiRecommended()).isFalse();
    }

    @Test
    @DisplayName("Should perform Triage RAG Analysis")
    void shouldPerformTriageRagAnalysis() {
        ClinicalAiResult triageResult = new ClinicalAiResult();
        triageResult.setSbarSummary("SBAR Triage Result");
        triageResult.setAiAdvice("Can den co so y te de kiem tra");
        triageResult.setModelUsed("meta-llama/llama-3.3-70b-instruct:free (OpenRouter)");

        when(aiModelRouter.routeTriageAnalysis(anyString(), anyString())).thenReturn(triageResult);

        ClinicalAiResult result = clinicalRagService.performTriageRagAnalysis("Dau bung am i kem sot", "YELLOW", List.of());

        assertThat(result).isNotNull();
        assertThat(result.getSbarSummary()).isEqualTo("SBAR Triage Result");
        verify(aiModelRouter).routeTriageAnalysis(anyString(), anyString());
    }

    @Test
    @DisplayName("Should NOT recommend doctor when document has no indicators or is blank")
    void shouldNotRecommendDoctorWhenDocumentHasNoIndicatorsOrBlank() {
        UUID doc1Id = UUID.randomUUID();
        DoctorMatchDto doc1 = new DoctorMatchDto(
                doc1Id, "Bui Quang Huy", "BS CKI Noi tong quat", "099999/CCHN",
                12, BigDecimal.valueOf(300000), 0.75, List.of("Noi tong quat"),
                "BS.CKI", "BV Cho Ray"
        );
        List<DoctorMatchDto> candidates = new ArrayList<>(List.of(doc1));

        ClinicalAiResult blankResult = new ClinicalAiResult();
        blankResult.setClinicalSummary("Phieu xet nghiem trang, cot ket qua trong.");
        blankResult.setPlainLanguageExplanation("Phieu chua co ket qua.");
        blankResult.setRecommendedDoctorId(null);
        blankResult.setIndicators(List.of());

        when(aiModelRouter.routeClinicalAnalysis(anyString(), anyString())).thenReturn(blankResult);

        ClinicalAiResult result = clinicalRagService.performDocumentRagAnalysis(
                "Phieu chi dinh trang", "phieu-trang.pdf", candidates
        );

        assertThat(result).isNotNull();
        assertThat(result.getRecommendedDoctorId()).isNull();
        assertThat(doc1.isAiRecommended()).isFalse();
    }
}
