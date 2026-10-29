package com.mediassist.service;
import com.mediassist.ai.AiModelRouter;
import com.mediassist.ai.ClinicalAiResult;
import com.mediassist.dto.AbnormalIndicatorDto;
import com.mediassist.dto.DoctorMatchDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collections;
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
        return performDocumentRagAnalysis(extractedText, fileName, candidateDoctors, Collections.emptyList());
    }

    public ClinicalAiResult performDocumentRagAnalysis(String extractedText, String fileName, List<DoctorMatchDto> candidateDoctors, List<AbnormalIndicatorDto> verifiedIndicators) {
        log.info("Assembling Clinical RAG Prompt for document '{}' with {} candidate doctors, {} verified indicators",
                fileName, candidateDoctors != null ? candidateDoctors.size() : 0, verifiedIndicators != null ? verifiedIndicators.size() : 0);

        String systemPrompt = """
                Bạn là Cố Vấn Hỗ Trợ Ra Quyết Định Tiền Lâm Sàng (Clinical Decision Support - CDSS) cấp cao của nền tảng MediAssist-AI.
                Nhiệm vụ của bạn là đọc và phân tích chuyên sâu hồ sơ y tế / phiếu kết quả xét nghiệm của bệnh nhân bằng phương pháp Y học Chứng cứ (Evidence-based Medicine), Chẩn đoán Phân biệt định hướng (Differential Reasoning - DDx) và đối soát chuẩn WHO LOINC (Quyết định 3280/QĐ-BYT của Bộ Y Tế).
                LƯU Ý PHÁP LÝ & Y ĐỨC: Hệ thống KHÔNG đưa ra chẩn đoán độc nhất xác định thay thế Bác sĩ lâm sàng (tuân thủ Luật Khám bệnh, chữa bệnh số 15/2023/QH15). Mục tiêu là giải nghĩa rõ ràng các chỉ số xét nghiệm, phân luồng đúng chuyên khoa và ghép nối bác sĩ phù hợp nhất.

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
                   ĐẶC BIỆT: BẮT BUỘC ĐỐI CHIẾU VÀ SỬ DỤNG BẢNG ĐỐI SOÁT Y HỌC CHỨNG CỨ CHUẨN BỘ Y TẾ (QĐ 3280/QĐ-BYT & LOINC) ĐÃ ĐƯỢC CUNG CẤP TRONG DỮ LIỆU ĐẦU VÀO để gán đúng khoảng tham chiếu chuẩn và đánh giá tình trạng "ELEVATED" / "LOW" / "NORMAL". TUYỆT ĐỐI KHÔNG TỰ BỊA KHOẢNG THAM CHIẾU SAI LỆCH VỚI CHUẨN BỘ Y TẾ.
                   Mỗi chỉ số bao gồm:
                   - name: Tên đầy đủ của xét nghiệm (ví dụ: TSH, FT4, Creatinine, eGFR, Glucose, AST, ALT, Acid Uric, v.v.).
                   - value: Giá trị số hoặc định tính đo được.
                   - unit: Đơn vị đo lường (mmol/L, U/L, µmol/L, ng/mL, pg/mL, v.v.).
                   - referenceRange: Khoảng tham chiếu chuẩn (ưu tiên theo bảng chuẩn Bộ Y Tế / LOINC nếu có).
                   - status: Đánh giá lâm sàng ("ELEVATED" nếu vượt ngưỡng cao, "LOW" nếu dưới ngưỡng thấp, "NORMAL" nếu trong giới hạn an toàn).
                   - clinicalSignificance: Giải thích ý nghĩa y khoa dựa trên chứng cứ khoa học thực tế, cơ chế sinh bệnh lý và mức độ ảnh hưởng cơ quan.
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

        // Build Scientific Evidence Grounding Table (QĐ 3280/QĐ-BYT & LOINC v2.76)
        StringBuilder evidenceTable = new StringBuilder();
        if (verifiedIndicators != null && !verifiedIndicators.isEmpty()) {
            boolean hasEvidence = false;
            for (AbnormalIndicatorDto ind : verifiedIndicators) {
                if (ind.getLoincCode() != null && !ind.getLoincCode().isBlank()) {
                    if (!hasEvidence) {
                        evidenceTable.append("\n\n[BẢNG ĐỐI SOÁT Y HỌC CHỨNG CỨ CHUẨN BỘ Y TẾ (QĐ 3280/QĐ-BYT) & LOINC v2.76]:\n");
                        evidenceTable.append("Các chỉ số sau đây đã được hệ thống đối chiếu chính xác với Ngưỡng Tham Chiếu Sinh Học Chuẩn Quốc Gia:\n");
                        hasEvidence = true;
                    }
                    evidenceTable.append(String.format("• %s [LOINC: %s]: Giá trị đo = %s %s | Ngưỡng chuẩn BYT: %s | Đánh giá: %s\n  -> Định hướng lâm sàng: %s\n",
                            ind.getName(), ind.getLoincCode(), ind.getValue(), ind.getUnit(),
                            ind.getBytReferenceRange() != null ? ind.getBytReferenceRange() : ind.getReferenceRange(),
                            ind.getStatus(), ind.getClinicalSignificance()));
                }
            }
        }

        String evidenceSection = evidenceTable.toString();
        String docsSection = docsContext.length() > 0
                ? String.format("\n\n[BAC SI UNG VIEN PGVECTOR]:%s", docsContext.toString())
                : "";
        String userPrompt = String.format("[TAI LIEU]: %s%s\n\n[NOI DUNG XET NGHIEM (DA KHU DINH DANH PII)]:\n%s%s\n\nHay phan tich va tra ve JSON.",
                fileName, evidenceSection, (safeExtractedText != null && !safeExtractedText.isBlank()) ? safeExtractedText : "(Chua co noi dung)", docsSection);

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
                Nhiệm vụ của bạn là phân tích mô tả của người dùng và thực hiện đánh giá theo các bước:

                BƯỚC 1: XÁC ĐỊNH PHẠM VI Y TẾ (isMedicalRelated):
                - Đặt "isMedicalRelated": true nếu nội dung mô tả triệu chứng sức khỏe, cảm giác cơ thể bất thường, vấn đề tâm lý, bệnh lý, đơn thuốc, hoặc thắc mắc y tế.
                - Đặt "isMedicalRelated": false nếu nội dung HOÀN TOÀN KHÔNG LIÊN QUAN Y TẾ (ví dụ: chào hỏi xã giao thuần túy "Xin chào/Hello", hỏi thời tiết, toán học, lập trình, công nghệ, chính trị, đố vui, văn bản ngẫu nhiên, hoặc spam).

                BƯỚC 2: NẾU KHÔNG THUỘC PHẠM VI Y TẾ ("isMedicalRelated": false):
                - "primarySpecialtySlug": null
                - "primarySpecialtyName": "Không thuộc phạm vi y tế"
                - "urgencyLevel": "ROUTINE"
                - "recommendedDoctorId": null
                - "doctorRecommendationReason": null
                - "sbarSummary": "• Situation: Người dùng gửi câu hỏi/nội dung không thuộc phạm vi y khoa.\\n• Assessment: Chưa ghi nhận triệu chứng bệnh lý lâm sàng.\\n• Recommendation: Vui lòng mô tả chi tiết các biểu hiện sức khỏe bất thường (nếu có) để hệ thống hỗ trợ phân luồng."
                - "aiAdvice": "Chào bạn! Tôi là Trợ lý Phân luồng Lâm sàng MediAssist-AI. Nội dung bạn vừa nhập không liên quan đến triệu chứng sức khỏe hay vấn đề y tế. Xin vui lòng mô tả các biểu hiện sức khỏe bạn đang gặp phải (ví dụ: sốt, đau ngực, đau đầu, ho, phát ban...) để tôi có thể hỗ trợ phân loại mức độ khẩn cấp và kết nối bạn với Bác sĩ chuyên khoa phù hợp."
                - "clarifyingQuestions": [
                    "Bạn có đang gặp bất kỳ biểu hiện khó chịu hoặc triệu chứng sức khỏe nào không?",
                    "Bạn cần được tư vấn về vấn đề y tế hoặc chuyên khoa cụ thể nào?"
                  ]

                BƯỚC 3: NẾU THUỘC PHẠM VI Y TẾ ("isMedicalRelated": true):
                1. Đánh giá mức độ khẩn cấp (urgencyLevel):
                   - EMERGENCY: Dấu hiệu nguy kịch tức thời đe dọa tính mạng (đau ngực dữ dội, khó thở cấp, liệt mặt/chi đột ngột, sốc phản vệ, hôn mê, xuất huyết ồ ạt).
                   - URGENT: Triệu chứng cấp tính hoặc nặng cần bác sĩ thăm khám trong ngày (sốt cao liên tục, đau bụng cấp dữ dội, đau quặn dữ dội, co giật, hoa mắt chóng mặt nhiều).
                   - ROUTINE: Các triệu chứng thông thường, bán cấp, nhẹ hoặc tái phát có thể theo dõi và đặt lịch hẹn khám định kỳ bình thường.

                2. Xác định chuyên khoa y tế mục tiêu (DANH MỤC 12 CHUYÊN KHOA HỢP LỆ - BẮT BUỘC CHỌN 1 SLUG):
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

                3. Biên soạn SBAR (sbarSummary): Đầy đủ 4 phần Situation, Background, Assessment, Recommendation.
                4. Lời khuyên y tế (aiAdvice): Ân cần, an toàn, dễ hiểu.
                5. 2-3 câu hỏi làm rõ triệu chứng (clarifyingQuestions).
                6. Đề xuất bác sĩ từ danh sách ứng viên (nếu có) và lý do lâm sàng cụ thể.

                YÊU CẦU ĐỊNH DẠNG: TRẢ VỀ DUY NHẤT MỘT JSON OBJECT HỢP LỆ (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO NGOÀI JSON):
                {
                  "isMedicalRelated": true,
                  "primarySpecialtySlug": "slug của 1 trong 12 chuyên khoa hoặc null",
                  "primarySpecialtyName": "Tên chuyên khoa hiển thị tiếng Việt tương ứng",
                  "urgencyLevel": "ROUTINE" | "URGENT" | "EMERGENCY",
                  "sbarSummary": "• Situation (Tình huống): ...\\n• Background (Tiền sử): ...\\n• Assessment (Đánh giá): ...\\n• Recommendation (Khuyến nghị): ...",
                  "aiAdvice": "Lời khuyên lâm sàng chi tiết, an toàn, dễ hiểu cho người bệnh...",
                  "clarifyingQuestions": [
                    "Câu hỏi làm rõ triệu chứng 1...",
                    "Câu hỏi làm rõ triệu chứng 2..."
                  ],
                  "recommendedDoctorId": "UUID bác sĩ phù hợp nhất (nếu có ứng viên hoặc null)",
                  "doctorRecommendationReason": "Lý do chuyên môn đề xuất bác sĩ này hoặc null"
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
