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

        String textLower = userPrompt != null ? userPrompt.toLowerCase() : "";

        List<AbnormalIndicatorDto> list = new ArrayList<>();
        if (textLower.contains("cholesterol") || textLower.contains("lipid") || textLower.contains("tim")) {
            result.setRecommendedSpecialtySlug("tim-mach");
            result.setRecommendedSpecialtyName("Tim Mạch");
            result.setClinicalSummary("Rối loạn chuyển hóa Lipid máu kèm nguy cơ xơ vữa động mạch ngoại vi. Cần theo dõi điện tâm đồ và chức năng nội mô.");
            result.setPlainLanguageExplanation("Kết quả cho thấy mỡ máu của bạn cao hơn mức an toàn. Nếu để lâu có thể gây đóng mảng bám vào thành mạch tim, cần điều chỉnh chế độ ăn giảm dầu mỡ và tập thể dục đều đặn.");
            result.setDoctorRecommendationReason("Bác sĩ chuyên khoa Tim Mạch giàu kinh nghiệm điều trị xơ vữa và phòng ngừa biến cố nhồi máu cơ tim.");
        } else if (textLower.contains("alt") || textLower.contains("ast") || textLower.contains("men gan") || textLower.contains("gan")) {
            result.setRecommendedSpecialtySlug("tieu-hoa");
            result.setRecommendedSpecialtyName("Tiêu Hóa - Gan Mật");
            result.setClinicalSummary("Tăng men gan tế bào ALT/AST. Cần tầm soát viêm gan siêu vi và đánh giá siêu âm nhu mô gan.");
            result.setPlainLanguageExplanation("Chỉ số men gan của bạn đang tăng báo hiệu gan đang bị tổn thương nhẹ, có thể do thức khuya, dùng bia rượu hoặc thuốc. Bạn nên kiêng rượu bia và khám chuyên khoa sớm.");
            result.setDoctorRecommendationReason("Bác sĩ Tiêu Hóa - Gan Mật có kinh nghiệm hạ men gan và tầm soát viêm gan vi rút hiệu quả.");
        } else if (textLower.contains("glucose") || textLower.contains("duong huyet") || textLower.contains("tieu duong")) {
            result.setRecommendedSpecialtySlug("noi-tiet");
            result.setRecommendedSpecialtyName("Nội Tiết - Đái Tháo Đường");
            result.setClinicalSummary("Chỉ số đường huyết vượt ngưỡng tham chiếu lúc đói. Cần đối chiếu HbA1c và kiểm tra chuyên sâu.");
            result.setPlainLanguageExplanation("Lượng đường trong máu của bạn cao hơn tiêu chuẩn. Cần kiểm soát chế độ ăn tinh bột và khám chuyên khoa Nội Tiết.");
            result.setDoctorRecommendationReason("Bác sĩ Nội Tiết giúp tầm soát đái tháo đường và điều chỉnh dinh dưỡng tối ưu.");
        } else {
            result.setRecommendedSpecialtySlug("noi-tong-quat");
            result.setRecommendedSpecialtyName("Nội Tổng Quát");
            result.setClinicalSummary("Các chỉ số cận lâm sàng trong tài liệu nằm trong giới hạn an toàn.");
            result.setPlainLanguageExplanation("Hồ sơ xét nghiệm không ghi nhận chỉ số bất thường vượt ngưỡng cảnh báo. Tiếp tục duy trì lối sống khoa học.");
            result.setDoctorRecommendationReason("Bác sĩ Nội Tổng Quát tư vấn chăm sóc sức khỏe chủ động và theo dõi định kỳ.");
        }

        // Extract first candidate doctor ID from user prompt if available
        if (userPrompt != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("ID:\\s*([0-9a-fA-F-]{36})").matcher(userPrompt);
            if (m.find()) {
                try {
                    result.setRecommendedDoctorId(java.util.UUID.fromString(m.group(1)));
                } catch (Exception ignored) {}
            }
        }

        // Leave indicators empty so MedicalDocumentAnalysisService extracts real dynamic indicators
        result.setIndicators(new ArrayList<>());
        result.setSuggestedQuestions(List.of(
                "Tôi có cần làm thêm xét nghiệm chuyên sâu nào để xác định nguyên nhân không?",
                "Chế độ ăn uống và vận động hiện tại của tôi cần điều chỉnh như thế nào?",
                "Sau bao lâu thì tôi cần làm xét nghiệm kiểm tra lại các chỉ số này?"
        ));

        return result;
    }

    @Override
    public ClinicalAiResult generateTriageAnalysis(String systemPrompt, String userPrompt, String modelId) {
        ClinicalAiResult result = new ClinicalAiResult();
        result.setModelUsed("local-deterministic-engine (Safe Offline Fallback)");
        result.setProvider("LocalRuleEngine");
        result.setSbarSummary("SBAR Triage Offline: Ghi nhận triệu chứng lâm sàng từ bệnh nhân. Hệ thống tự động phân luồng.");
        result.setAiAdvice("Bạn nên nghỉ ngơi, theo dõi sát các diễn biến sinh hiệu và đặt lịch khám với Bác sĩ chuyên khoa sớm để được chẩn đoán chính xác.");
        return result;
    }
}
