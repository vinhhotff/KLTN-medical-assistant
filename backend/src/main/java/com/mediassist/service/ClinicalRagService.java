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
                7. NGUYÊN TẮC AN TOÀN Y TẾ & PHÒNG CHỐNG BỊA ĐẶT (CRITICAL MEDICAL INTEGRITY):
                   - Nếu tài liệu KHÔNG có kết quả xét nghiệm cụ thể (phiếu chỉ định trắng chưa điền kết quả, ảnh mờ không đọc được số liệu, hoặc không có chỉ số lâm sàng nào):
                     + BẮT BUỘC ĐỂ:
                       "recommendedSpecialtySlug": null,
                       "recommendedSpecialtyName": "Chưa xác định (Cần bổ sung kết quả)",
                       "recommendedDoctorId": null,
                       "doctorRecommendationReason": "Không đủ cơ sở lâm sàng để đề xuất bác sĩ do tài liệu chưa có kết quả xét nghiệm cụ thể.",
                       "indicators": []
                     + clinicalSummary & plainLanguageExplanation: BẮT BUỘC giải thích rõ ràng tài liệu chưa có kết quả đo lường cụ thể (phiếu trắng hoặc ảnh chụp bị mờ), nhắc người bệnh chụp lại rõ nét hoặc tải phiếu có kết quả đầy đủ để bảo đảm an toàn.
                     + TUYỆT ĐỐI KHÔNG TỰ BỊA CHỈ SỐ, KHÔNG ĐOÁN MÒ CHUYÊN KHOA VÀ KHÔNG ĐỀ XUẤT BÁC SĨ KHI THIẾU KẾT QUẢ XÉT NGHIỆM!
                
                BẮT BUỘC TRẢ VỀ DUY NHẤT 1 JSON OBJECT HỢP LỆ THEO CẤU TRÚC:
                {
                  "clinicalSummary": "...",
                  "plainLanguageExplanation": "...",
                  "recommendedSpecialtySlug": "SLUG_HOAC_NULL",
                  "recommendedSpecialtyName": "TEN_HOAC_NULL",
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

        boolean hasExplicitDoctor = result.getRecommendedDoctorId() != null;
        boolean hasIndicators = result.getIndicators() != null && !result.getIndicators().isEmpty();

        if (hasExplicitDoctor && candidateDoctors != null) {
            for (DoctorMatchDto doc : candidateDoctors) {
                if (doc.getDoctorId() != null && doc.getDoctorId().equals(result.getRecommendedDoctorId())) {
                    doc.setAiRecommended(true);
                    doc.setAiRecommendationReason(result.getDoctorRecommendationReason());
                    log.info("RAG Doctor Match: {} selected: {}", doc.getFullName(), result.getDoctorRecommendationReason());
                }
            }
        }

        // Only enforce top fallback doctor if the document actually has clinical indicators!
        if (hasIndicators && candidateDoctors != null && !candidateDoctors.isEmpty()) {
            boolean anyRecommended = candidateDoctors.stream().anyMatch(DoctorMatchDto::isAiRecommended);
            if (!anyRecommended) {
                DoctorMatchDto top = candidateDoctors.get(0);
                top.setAiRecommended(true);
                String reason = (result.getDoctorRecommendationReason() != null && !result.getDoctorRecommendationReason().isBlank())
                        ? result.getDoctorRecommendationReason()
                        : String.format("Bác sĩ chuyên khoa %s được đề xuất dựa trên thuật toán tương đồng ngữ nghĩa pgvector (độ tương thích %d%%).",
                                (top.getSpecialties() != null && !top.getSpecialties().isEmpty()) ? top.getSpecialties().get(0) : "Chuyên khoa",
                                Math.round(top.getSimilarityScore() * 100));
                top.setAiRecommendationReason(reason);
                result.setRecommendedDoctorId(top.getDoctorId());
                result.setDoctorRecommendationReason(reason);
                log.info("RAG Top Doctor Match: Assigned {} as AI recommended", top.getFullName());
            }
        } else if (!hasIndicators && !hasExplicitDoctor && candidateDoctors != null) {
            // Safety gate: Wipe any recommendation flag when no lab indicators exist and no doctor was explicitly selected
            for (DoctorMatchDto doc : candidateDoctors) {
                doc.setAiRecommended(false);
                doc.setAiRecommendationReason(null);
            }
            result.setRecommendedDoctorId(null);
            result.setDoctorRecommendationReason("Không đủ cơ sở lâm sàng để đề xuất bác sĩ do tài liệu chưa có kết quả xét nghiệm cụ thể.");
        }
        return result;
    }

    public ClinicalAiResult performTriageRagAnalysis(String symptoms, List<DoctorMatchDto> candidateDoctors) {
        return performTriageRagAnalysis(symptoms, null, candidateDoctors);
    }

    public ClinicalAiResult performTriageRagAnalysis(String symptoms, String urgencyHint, List<DoctorMatchDto> candidateDoctors) {
        String systemPrompt = """
                Bạn là Trợ Lý Phân Luồng & Triage Lâm Sàng Trực Tuyến MediAssist-AI (Senior Clinical Triage Specialist).
                Nhiệm vụ của bạn là phân tích mô tả triệu chứng của người bệnh, suy luận lâm sàng để:
                1. Đánh giá mức độ khẩn cấp (urgencyLevel).
                2. Xác định chuyên khoa y tế mục tiêu phù hợp nhất (primarySpecialtySlug & primarySpecialtyName).
                3. Biên soạn bản tóm tắt lâm sàng theo chuẩn y khoa SBAR (sbarSummary).
                4. Cung cấp lời khuyên y tế chu đáo, an toàn cho người bệnh (aiAdvice).
                5. Gợi ý 2-3 câu hỏi làm rõ triệu chứng để bác sĩ khai thác thêm (clarifyingQuestions).
                6. Nếu có danh sách bác sĩ ứng viên, chọn bác sĩ phù hợp nhất và giải thích lý do chuyên môn.

                QUY TẮC ĐÁNH GIÁ MỨC ĐỘ KHẨN CẤP (urgencyLevel):
                - EMERGENCY: Dấu hiệu nguy kịch tức thời đe dọa tính mạng (đau ngực dữ dội, khó thở cấp, liệt mặt/chi đột ngột, sốc phản vệ, hôn mê, xuất huyết ồ ạt).
                - URGENT: Triệu chứng cấp tính hoặc nặng cần bác sĩ thăm khám trong ngày (sốt cao liên tục, đau bụng cấp dữ dội, đau quặn dữ dội, co giật, hoa mắt chóng mặt nhiều).
                - ROUTINE: Các triệu chứng thông thường, bán cấp, nhẹ hoặc tái phát có thể theo dõi và đặt lịch hẹn khám định kỳ bình thường.

                DANH MỤC 12 CHUYÊN KHOA BỆNH VIỆN HỢP LỆ (BẮT BUỘC CHỌN 1 SLUG):
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

                YÊU CẦU ĐỊNH DẠNG: TRẢ VỀ DUY NHẤT MỘT JSON OBJECT HỢP LỆ (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO NGOÀI JSON):
                {
                  "primarySpecialtySlug": "slug của 1 trong 12 chuyên khoa",
                  "primarySpecialtyName": "Tên chuyên khoa hiển thị tiếng Việt tương ứng",
                  "urgencyLevel": "ROUTINE" | "URGENT" | "EMERGENCY",
                  "sbarSummary": "• Situation (Tình huống): ...\\n• Background (Tiền sử): ...\\n• Assessment (Đánh giá): ...\\n• Recommendation (Khuyến nghị): ...",
                  "aiAdvice": "Lời khuyên lâm sàng chi tiết, an toàn, dễ hiểu cho người bệnh...",
                  "clarifyingQuestions": [
                    "Câu hỏi làm rõ triệu chứng 1...",
                    "Câu hỏi làm rõ triệu chứng 2..."
                  ],
                  "recommendedDoctorId": "UUID bác sĩ phù hợp nhất (nếu có ứng viên)",
                  "doctorRecommendationReason": "Lý do chuyên môn đề xuất bác sĩ này"
                }
                """;

        StringBuilder docsContext = new StringBuilder();
        if (candidateDoctors != null && !candidateDoctors.isEmpty()) {
            for (DoctorMatchDto d : candidateDoctors) {
                docsContext.append(String.format("\n- ID: %s | BS: %s %s | BV: %s", d.getDoctorId(), d.getAcademicTitle(), d.getFullName(), d.getHospitalAffiliation()));
            }
        }

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("Triệu chứng bệnh nhân mô tả: \"").append(symptoms).append("\"");
        if (urgencyHint != null && !urgencyHint.isBlank()) {
            userPrompt.append("\nGợi ý mức độ tham khảo ban đầu: ").append(urgencyHint);
        }
        if (docsContext.length() > 0) {
            userPrompt.append("\n\nDanh sách Bác sĩ ứng viên khả dụng:").append(docsContext);
        }

        return aiModelRouter.routeTriageAnalysis(systemPrompt, userPrompt.toString());
    }
}
