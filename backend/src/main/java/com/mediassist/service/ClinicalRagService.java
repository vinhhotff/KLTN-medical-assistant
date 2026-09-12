package com.mediassist.service;
import com.mediassist.ai.AiModelRouter;
import com.mediassist.ai.ClinicalAiResult;
import com.mediassist.dto.DoctorMatchDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class ClinicalRagService {
    private static final Logger log = LoggerFactory.getLogger(ClinicalRagService.class);
    private final AiModelRouter aiModelRouter;

    public ClinicalRagService(AiModelRouter aiModelRouter) {
        this.aiModelRouter = aiModelRouter;
    }

    public boolean canProcessVision() {
        return aiModelRouter.canProcessVision();
    }

    public String extractTextWithVision(byte[] imageBytes, String contentType, String fileName) {
        return aiModelRouter.extractTextWithVision(imageBytes, contentType, fileName);
    }

    public ClinicalAiResult performDocumentRagAnalysis(String extractedText, String fileName, List<DoctorMatchDto> candidateDoctors) {
        log.info("Assembling Clinical RAG Prompt for document '{}' with {} candidate doctors", fileName, candidateDoctors != null ? candidateDoctors.size() : 0);

        String systemPrompt = "Ban la Bac si Truong Khoa Co Van Y Khoa cap cao cua MediAssist-AI.\n" +
                "Nhiem vu: 1. Phan tich phieu xet nghiem. 2. Trich xuat chi so bat thuong (name, value, unit, referenceRange, flag ELEVATED/LOW/NORMAL, clinicalSignificance). " +
                "3. Tom tat lam sang (clinicalSummary) va giai thich de hieu (plainLanguageExplanation). " +
                "4. Chon 1 Bac si phu hop nhat tu danh sach ung vien pgvector va giai thich ly do (doctorRecommendationReason). " +
                "5. Goi y 3 cau hoi (suggestedQuestions).\n" +
                "BAT BUOC tra ve JSON Object hop le: clinicalSummary, plainLanguageExplanation, recommendedSpecialtySlug, recommendedSpecialtyName, recommendedDoctorId, doctorRecommendationReason, indicators (array), suggestedQuestions (array).";

        StringBuilder docsContext = new StringBuilder();
        if (candidateDoctors != null && !candidateDoctors.isEmpty()) {
            for (int i = 0; i < candidateDoctors.size(); i++) {
                DoctorMatchDto d = candidateDoctors.get(i);
                String specs = d.getSpecialties() != null ? String.join(", ", d.getSpecialties()) : "Chuyen khoa";
                docsContext.append(String.format("\n%d. ID: %s | BS: %s %s | Chuyen khoa: %s | BV: %s | CCHN: %s | Kinh nghiem: %d nam | Phi: %s",
                        (i + 1), d.getDoctorId(), d.getAcademicTitle(), d.getFullName(), specs,
                        d.getHospitalAffiliation(), d.getLicenseNumber(), d.getYearsOfExperience(), d.getConsultationFee()));
            }
        } else {
            docsContext.append("\n(Khong co ung vien bac si)");
        }

        String userPrompt = String.format("[TAI LIEU]: %s\n\n[NOI DUNG XET NGHIEM]:\n%s\n\n[BAC SI UNG VIEN PGVECTOR]:%s\n\nHay phan tich va tra ve JSON.",
                fileName, (extractedText != null && !extractedText.isBlank()) ? extractedText : "(Chua co noi dung)", docsContext.toString());

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis(systemPrompt, userPrompt);

        if (candidateDoctors != null && result.getRecommendedDoctorId() != null) {
            for (DoctorMatchDto doc : candidateDoctors) {
                if (doc.getDoctorId() != null && doc.getDoctorId().equals(result.getRecommendedDoctorId())) {
                    doc.setAiRecommended(true);
                    doc.setAiRecommendationReason(result.getDoctorRecommendationReason());
                    log.info("RAG Doctor Match: {} selected: {}", doc.getFullName(), result.getDoctorRecommendationReason());
                }
            }
        }
        return result;
    }

    public ClinicalAiResult performTriageRagAnalysis(String symptoms, String urgencyLevel, List<DoctorMatchDto> candidateDoctors) {
        String systemPrompt = "Ban la Tro Ly Triage Lam Sang MediAssist-AI. Tra ve JSON gom sbarSummary, aiAdvice, doctorRecommendationReason, recommendedDoctorId.";
        StringBuilder docsContext = new StringBuilder();
        if (candidateDoctors != null) {
            for (DoctorMatchDto d : candidateDoctors) {
                docsContext.append(String.format("\n- ID: %s | BS: %s %s | BV: %s", d.getDoctorId(), d.getAcademicTitle(), d.getFullName(), d.getHospitalAffiliation()));
            }
        }
        String userPrompt = String.format("Trieu chung: %s\nMuc do: %s\nBac si ung vien:\n%s", symptoms, urgencyLevel, docsContext.toString());
        return aiModelRouter.routeTriageAnalysis(systemPrompt, userPrompt);
    }
}
