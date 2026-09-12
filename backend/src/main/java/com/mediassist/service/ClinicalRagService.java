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

        String systemPrompt = """
                Bạn là Bác sĩ Trưởng Khoa Cố Vấn Y Khoa cấp cao của nền tảng MediAssist-AI.
                Nhiệm vụ của bạn là đọc và phân tích chuyên sâu hồ sơ y tế / phiếu kết quả xét nghiệm của bệnh nhân bằng tư duy suy luận y khoa thực thụ (Clinical Reasoning & Differential Diagnosis).
                
                QUY TẮC SUY LUẬN LÂM SÀNG:
                1. Đọc và bóc tách TOÀN BỘ các chỉ số xét nghiệm cận lâm sàng xuất hiện trong tài liệu (cả bình thường và bất thường).
                   Mỗi chỉ số bao gồm:
                   - name: Tên đầy đủ của xét nghiệm (ví dụ: TSH, FT4, Creatinine, eGFR, Glucose, AST, ALT, Acid Uric, v.v.).
                   - value: Giá trị số hoặc định tính đo được.
                   - unit: Đơn vị đo lường (mmol/L, U/L, µmol/L, ng/mL, pg/mL, v.v.).
                   - referenceRange: Khoảng tham chiếu chuẩn ghi trong tài liệu hoặc theo chuẩn y khoa.
                   - status: Đánh giá lâm sàng ("ELEVATED" nếu vượt ngưỡng cao, "LOW" nếu dưới ngưỡng thấp, "NORMAL" nếu trong giới hạn an toàn).
                   - clinicalSignificance: Giải thích ý nghĩa y khoa của giá trị này đối với cơ thể và gợi ý bệnh lý liên quan.
                2. Tóm tắt lâm sàng (clinicalSummary): Tổng hợp bệnh cảnh y khoa cô đọng, nêu rõ các phát hiện bất thường chủ yếu và mức độ tổn thương cơ quan.
                3. Giải thích bình dân (plainLanguageExplanation): Lời giải thích ân cần, dễ hiểu bằng tiếng Việt cho người bệnh không có chuyên môn y tế.
                4. Phân luồng chuyên khoa (recommendedSpecialtySlug & recommendedSpecialtyName): Suy luận chuyên khoa phù hợp nhất từ 12 chuyên khoa bệnh viện sau:
                   - cardiology: Cardiology (Tim Mạch)
                   - endocrinology: Endocrinology & Diabetes (Nội Tiết & Đái Tháo Đường)
                   - nephrology: Nephrology & Urology (Thận - Tiết Niệu)
                   - gastroenterology: Gastroenterology (Tiêu Hóa - Gan Mật)
                   - pulmonology: Pulmonology (Hô Hấp & Phổi)
                   - neurology: Neurology (Thần Kinh)
                   - orthopedics: Orthopedics (Cơ Xương Khớp & Chấn Thương Chỉnh Hình)
                   - dermatology: Dermatology (Da Liễu)
                   - pediatrics: Pediatrics (Nhi Khoa)
                   - obstetrics-gynecology: Obstetrics & Gynecology (Sản Phụ Khoa)
                   - ent: Otolaryngology (Tai Mũi Họng)
                   - general-internal-medicine: General Internal Medicine (Nội Tổng Quát)
                5. Chọn 1 Bác sĩ phù hợp nhất từ danh sách ứng viên pgvector được cung cấp và nêu lý do chuyên môn (recommendedDoctorId, doctorRecommendationReason).
                6. Gợi ý 3 câu hỏi sâu sắc (suggestedQuestions) mà người bệnh nên hỏi Bác sĩ trong buổi khám.
                
                BẮT BUỘC TRẢ VỀ DUY NHẤT 1 JSON OBJECT HỢP LỆ THEO CẤU TRÚC:
                {
                  "clinicalSummary": "...",
                  "plainLanguageExplanation": "...",
                  "recommendedSpecialtySlug": "...",
                  "recommendedSpecialtyName": "...",
                  "recommendedDoctorId": "UUID_HOAC_NULL",
                  "doctorRecommendationReason": "...",
                  "indicators": [
                    {
                      "name": "...",
                      "value": "...",
                      "unit": "...",
                      "referenceRange": "...",
                      "status": "ELEVATED | LOW | NORMAL",
                      "clinicalSignificance": "..."
                    }
                  ],
                  "suggestedQuestions": ["...", "...", "..."]
                }
                """;

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

        // Ensure at least one doctor is prominently marked as AI-recommended from candidates
        if (candidateDoctors != null && !candidateDoctors.isEmpty()) {
            boolean anyRecommended = candidateDoctors.stream().anyMatch(DoctorMatchDto::isAiRecommended);
            if (!anyRecommended) {
                DoctorMatchDto top = candidateDoctors.get(0);
                top.setAiRecommended(true);
                String reason = (result.getDoctorRecommendationReason() != null && !result.getDoctorRecommendationReason().isBlank())
                        ? result.getDoctorRecommendationReason()
                        : String.format("Bác sĩ chuyên khoa %s có độ tương thích cao nhất (%d%%) với các chỉ số trong tài liệu này theo phân tích pgvector.",
                                (top.getSpecialties() != null && !top.getSpecialties().isEmpty()) ? top.getSpecialties().get(0) : "Chuyên khoa",
                                Math.round(top.getSimilarityScore() * 100));
                top.setAiRecommendationReason(reason);
                result.setRecommendedDoctorId(top.getDoctorId());
                result.setDoctorRecommendationReason(reason);
                log.info("RAG Top Doctor Match: Assigned {} as AI recommended", top.getFullName());
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
