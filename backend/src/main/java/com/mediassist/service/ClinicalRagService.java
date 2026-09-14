package com.mediassist.service;
import com.mediassist.ai.AiModelRouter;
import com.mediassist.ai.ClinicalAiResult;
import com.mediassist.dto.DoctorMatchDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class ClinicalRagService {
    private static final Logger log = LoggerFactory.getLogger(ClinicalRagService.class);
    private final AiModelRouter aiModelRouter;
    private final MedicalPiiService medicalPiiService;

    @Autowired
    public ClinicalRagService(AiModelRouter aiModelRouter, MedicalPiiService medicalPiiService) {
        this.aiModelRouter = aiModelRouter;
        this.medicalPiiService = medicalPiiService;
    }

    public ClinicalRagService(AiModelRouter aiModelRouter) {
        this(aiModelRouter, new MedicalPiiService());
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
                
                QUY TẮC SUY LUẬN LÂM SÀNG & BÓC TÁCH DỮ LIỆU:
                0. BÓC TÁCH HÀNH CHÍNH & CƠ SỞ Y TẾ (metadata):
                   - hospitalName: Tên chính thức của bệnh viện / trung tâm y tế / phòng khám in trên phiếu (ví dụ: Bệnh viện Chợ Rẫy, Bệnh viện Bạch Mai, Trung tâm Xét nghiệm Medlatec, Bệnh viện ĐH Y Dược TP.HCM, v.v.). Tuyệt đối không bịa đặt tên bệnh viện giả. Nếu tài liệu không ghi, để null.
                   - departmentName: Tên khoa / phòng xét nghiệm (ví dụ: Khoa Xét nghiệm Hóa sinh, Khoa Huyết học...).
                   - orderingDoctor: Bác sĩ chỉ định hoặc bác sĩ ký duyệt kết quả.
                   - testDate: Ngày giờ tiếp nhận / lấy mẫu / in kết quả xét nghiệm.
                   - sidCode: Mã vạch, mã xét nghiệm (SID), số phiếu hoặc mã bệnh nhân (Mã BN).
                   - patientName: Họ và tên người bệnh ghi trên phiếu.
                   - patientAge: Tuổi hoặc năm sinh của người bệnh.
                   - patientGender: Giới tính người bệnh ("Nam" hoặc "Nữ").
                   - deviceModel: Thiết bị xét nghiệm tự động (nếu có ghi trên phiếu, ví dụ: Cobas 8000, Sysmex XN-1000, AU5800...).
                
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
                5. Nếu có danh sách ứng viên Bác sĩ pgvector được cung cấp, hãy chọn 1 Bác sĩ phù hợp nhất và nêu lý do chuyên môn (recommendedDoctorId, doctorRecommendationReason).
                   LÝ DO ĐỀ XUẤT BÁC SĨ BẮT BUỘC PHẢI GẮN VỚI CHỈ SỐ BẤT THƯỜNG CỤ THỂ CỦA BỆNH NHÂN (ví dụ: "Đề xuất BS Nguyễn Văn An vì bệnh nhân có LDL-C 4.5 mmol/L và Triglyceride 3.2 mmol/L vượt ngưỡng, cần chuyên khoa Tim mạch theo dõi xơ vữa").
                   Nếu chưa có danh sách ứng viên, hãy nêu định hướng chuyên khoa lâm sàng (ví dụ: "Bệnh nhân cần được thăm khám bởi Bác sĩ chuyên khoa Tim Mạch do Troponin T hs tăng cao"). TUYỆT ĐỐI KHÔNG DÙNG CÂU VĂN BÁO LỖI KỸ THUẬT ("không có ứng viên", "chưa có danh sách").
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
                  "metadata": {
                    "hospitalName": "Tên bệnh viện hoặc null",
                    "departmentName": "Tên khoa hoặc null",
                    "orderingDoctor": "Bác sĩ chỉ định hoặc null",
                    "testDate": "Ngày giờ hoặc null",
                    "sidCode": "Mã SID / Mã BN hoặc null",
                    "patientName": "Tên người bệnh hoặc null",
                    "patientAge": "Tuổi hoặc null",
                    "patientGender": "Nam / Nữ hoặc null",
                    "deviceModel": "Thiết bị xét nghiệm hoặc null"
                  },
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
        }

        // Medical PII De-identification (Decree 13/2023/ND-CP & HIPAA Privacy Shield)
        com.mediassist.dto.DeidentificationResult piiResult = medicalPiiService.maskPii(extractedText);
        String safeExtractedText = piiResult.getMaskedText();
        if (piiResult.isPiiProtected()) {
            log.info("🛡️ [PII SAFEGUARD] De-identified {} sensitive entities ({}) in '{}' prior to external LLM routing",
                    piiResult.getPiiEntitiesCount(), piiResult.getMaskedTypes(), fileName);
        }

        String docsSection = docsContext.length() > 0
                ? String.format("\n\n[BAC SI UNG VIEN PGVECTOR]:%s", docsContext.toString())
                : "";
        String userPrompt = String.format("[TAI LIEU]: %s\n\n[NOI DUNG XET NGHIEM (DA KHU DINH DANH PII)]:\n%s%s\n\nHay phan tich va tra ve JSON.",
                fileName, (safeExtractedText != null && !safeExtractedText.isBlank()) ? safeExtractedText : "(Chua co noi dung)", docsSection);

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis(systemPrompt, userPrompt);

        // Populate PII Protection stats and unmask tokens if present in summary/explanation
        result.setPiiProtected(piiResult.isPiiProtected());
        result.setPiiEntitiesCount(piiResult.getPiiEntitiesCount());
        result.setPiiMaskedTypes(piiResult.getMaskedTypes());
        if (piiResult.isPiiProtected()) {
            result.setClinicalSummary(piiResult.reidentify(result.getClinicalSummary()));
            result.setPlainLanguageExplanation(piiResult.reidentify(result.getPlainLanguageExplanation()));
        }

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
                        : buildClinicalRecommendationReason(top, result.getIndicators());
                top.setAiRecommendationReason(reason);
                result.setRecommendedDoctorId(top.getDoctorId());
                result.setDoctorRecommendationReason(reason);
                log.info("RAG Top Doctor Match: Assigned {} as AI recommended: {}", top.getFullName(), reason);
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

        // Medical PII De-identification (Decree 13/2023/ND-CP & HIPAA Privacy Shield)
        com.mediassist.dto.DeidentificationResult piiResult = medicalPiiService.maskPii(symptoms);
        String safeSymptoms = piiResult.getMaskedText();
        if (piiResult.isPiiProtected()) {
            log.info("🛡️ [PII SAFEGUARD] De-identified {} sensitive entities ({}) in triage description prior to LLM routing",
                    piiResult.getPiiEntitiesCount(), piiResult.getMaskedTypes());
        }

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("Triệu chứng bệnh nhân mô tả (đã khử định danh PII): \"").append(safeSymptoms).append("\"");
        if (urgencyHint != null && !urgencyHint.isBlank()) {
            userPrompt.append("\nGợi ý mức độ tham khảo ban đầu: ").append(urgencyHint);
        }
        if (docsContext.length() > 0) {
            userPrompt.append("\n\nDanh sách Bác sĩ ứng viên khả dụng:").append(docsContext);
        }

        ClinicalAiResult result = aiModelRouter.routeTriageAnalysis(systemPrompt, userPrompt.toString());

        // Populate PII Protection stats and unmask tokens if present in advice/sbar
        result.setPiiProtected(piiResult.isPiiProtected());
        result.setPiiEntitiesCount(piiResult.getPiiEntitiesCount());
        result.setPiiMaskedTypes(piiResult.getMaskedTypes());
        if (piiResult.isPiiProtected()) {
            result.setSbarSummary(piiResult.reidentify(result.getSbarSummary()));
            result.setAiAdvice(piiResult.reidentify(result.getAiAdvice()));
        }

        return result;
    }

    private String buildClinicalRecommendationReason(DoctorMatchDto doctor, List<com.mediassist.dto.AbnormalIndicatorDto> indicators) {
        String spec = (doctor.getSpecialties() != null && !doctor.getSpecialties().isEmpty()) ? doctor.getSpecialties().get(0) : "Chuyên khoa";
        String titleAndName = String.format("%s %s", doctor.getAcademicTitle() != null ? doctor.getAcademicTitle() : "BS", doctor.getFullName());

        if (indicators != null && !indicators.isEmpty()) {
            List<String> abnormalSummary = indicators.stream()
                    .filter(i -> "ELEVATED".equalsIgnoreCase(i.getStatus()) || "LOW".equalsIgnoreCase(i.getStatus()))
                    .map(i -> String.format("%s (%s %s)", i.getName(), i.getValue(), i.getUnit()))
                    .limit(3)
                    .toList();

            if (!abnormalSummary.isEmpty()) {
                return String.format("Đề xuất %s (%s) vì tài liệu ghi nhận chỉ số bất thường: %s, cần bác sĩ chuyên khoa thăm khám và định hướng phác đồ can thiệp.",
                        titleAndName, spec, String.join(", ", abnormalSummary));
            }
        }

        return String.format("Đề xuất %s tiếp nhận thăm khám dựa trên năng lực chuyên môn sâu về %s phù hợp với hồ sơ cận lâm sàng.",
                titleAndName, spec);
    }
}
