package com.mediassist.ai;

import com.mediassist.dto.AbnormalIndicatorDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DeterministicFallbackAiProvider implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(DeterministicFallbackAiProvider.class);

    @Override
    public String getProviderName() {
        return "DeterministicFallbackEngine";
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    @Override
    public ClinicalAiResult generateClinicalAnalysis(String systemPrompt, String userPrompt, String modelId) {
        log.info("Safe fallback deterministic clinical engine executed.");

        ClinicalAiResult result = new ClinicalAiResult();
        result.setModelUsed("local-deterministic-engine (Safe Offline Fallback)");
        result.setProvider("LocalRuleEngine");

        // Transparent offline fallback: Do NOT invent diseases or fabricate specialties via keyword matching
        result.setRecommendedSpecialtySlug("general-internal-medicine");
        result.setRecommendedSpecialtyName("General Internal Medicine (Nội Tổng Quát - Tham Khảo Ngoại Tuyến)");
        result.setClinicalSummary("Chế độ Ngoại tuyến: Hệ thống đã bóc tách các chỉ số xét nghiệm thô từ tài liệu. Chưa có suy luận chẩn đoán bệnh lý từ mô hình AI do chưa kết nối API Key hoặc ngoại tuyến.");
        result.setPlainLanguageExplanation("⚠️ Thông báo Chế độ Ngoại tuyến: Tài liệu y tế của bạn được trích xuất dữ liệu cận lâm sàng bằng bộ phân tích cú pháp thô. Do chưa có kết nối mô hình Trí tuệ Nhân tạo (LLM), hệ thống không suy diễn chẩn đoán hay kết luận bệnh lý. Vui lòng tham khảo ý kiến Bác sĩ chuyên môn bên dưới để được tư vấn chính xác.");
        result.setDoctorRecommendationReason("Đề xuất kết nối bác sĩ dựa trên thuật toán tương đồng ngữ nghĩa pgvector trong chế độ ngoại tuyến.");

        // Leave indicators empty so MedicalDocumentAnalysisService uses the real parsed indicators
        result.setIndicators(new ArrayList<>());
        result.setSuggestedQuestions(List.of(
                "Bác sĩ có thể giải thích ý nghĩa các chỉ số nằm ngoài khoảng tham chiếu này không?",
                "Với kết quả này, tôi có cần làm thêm xét nghiệm chuyên sâu nào để xác định nguyên nhân không?",
                "Chế độ ăn uống và sinh hoạt hiện tại của tôi cần điều chỉnh như thế nào?"
        ));

        return result;
    }

    @Override
    public ClinicalAiResult generateTriageAnalysis(String systemPrompt, String userPrompt, String modelId) {
        ClinicalAiResult result = new ClinicalAiResult();
        result.setModelUsed("local-deterministic-engine (Safe Offline Fallback)");
        result.setProvider("LocalRuleEngine");

        // Transparent offline fallback: Do NOT invent diseases, fake emergency levels, or guess specialties via keywords
        result.setRecommendedSpecialtySlug("general-internal-medicine");
        result.setRecommendedSpecialtyName("General Internal Medicine (Nội Tổng Quát - Tham Khảo Ngoại Tuyến)");
        result.setUrgencyLevel("ROUTINE");
        result.setSbarSummary("SBAR Triage (Chế độ Ngoại tuyến): Bệnh nhân ghi nhận các triệu chứng lâm sàng cần tham vấn. " +
                "Do hệ thống đang hoạt động ngoại tuyến (chưa kết nối AI LLM), trường hợp được định tuyến an toàn về chuyên khoa Nội Tổng Quát để bác sĩ thăm khám và đánh giá trực tiếp.");
        result.setAiAdvice("⚠️ Thông báo Chế độ Ngoại tuyến: Phân luồng triệu chứng hiện tại mang tính tham khảo kỹ thuật. " +
                "Bạn nên nghỉ ngơi, theo dõi sinh hiệu và đặt lịch hẹn khám trực tiếp với bác sĩ để có kết luận y khoa chính xác.");
        result.setClarifyingQuestions(List.of(
                "Triệu chứng này bắt đầu xuất hiện từ bao giờ (mấy ngày qua)?",
                "Bạn đã từng sử dụng thuốc gì hoặc có tiền sử bệnh nền mạn tính nào trước đây không?",
                "Triệu chứng có tăng lên khi gắng sức, thay đổi tư thế hoặc theo thời điểm cụ thể trong ngày không?"
        ));
        result.setSuggestedQuestions(result.getClarifyingQuestions());
        result.setDoctorRecommendationReason("Đề xuất kết nối bác sĩ chuyên khoa Nội Tổng Quát dựa trên thuật toán tương đồng ngữ nghĩa pgvector trong chế độ ngoại tuyến.");
        return result;
    }
}
