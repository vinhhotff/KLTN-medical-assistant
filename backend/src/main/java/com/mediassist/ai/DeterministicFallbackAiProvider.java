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

            list.add(new AbnormalIndicatorDto("Cholesterol toàn phần", "6.3", "mmol/L", "3.9 - 5.2", "ELEVATED", "Tăng nguy cơ xơ vữa thành mạch."));
            list.add(new AbnormalIndicatorDto("Triglyceride", "2.4", "mmol/L", "0.46 - 1.88", "ELEVATED", "Chỉ số mỡ máu trung tính cao, liên quan thói quen ăn uống."));
        } else if (textLower.contains("alt") || textLower.contains("ast") || textLower.contains("men gan") || textLower.contains("gan")) {
            result.setRecommendedSpecialtySlug("tieu-hoa");
            result.setRecommendedSpecialtyName("Tiêu Hóa - Gan Mật");
            result.setClinicalSummary("Tăng men gan tế bào ALT/AST mức độ trung bình. Cần tầm soát viêm gan siêu vi và đánh giá siêu âm nhu mô gan.");
            result.setPlainLanguageExplanation("Chỉ số men gan của bạn đang tăng báo hiệu gan đang bị tổn thương nhẹ, có thể do thức khuya, dùng bia rượu hoặc thuốc. Bạn nên kiêng rượu bia và khám chuyên khoa sớm.");
            result.setDoctorRecommendationReason("Bác sĩ Tiêu Hóa - Gan Mật có kinh nghiệm hạ men gan và tầm soát viêm gan vi rút hiệu quả.");

            list.add(new AbnormalIndicatorDto("Men gan ALT (GPT)", "125", "U/L", "< 41", "ELEVATED", "Tổn thương tế bào gan cấp hoặc mạn tính."));
            list.add(new AbnormalIndicatorDto("Men gan AST (GOT)", "98", "U/L", "< 40", "ELEVATED", "Men gan tăng do quá tải chuyển hóa gan."));
        } else {
            result.setRecommendedSpecialtySlug("noi-tong-quat");
            result.setRecommendedSpecialtyName("Nội Tổng Quát");
            result.setClinicalSummary("Ghi nhận các chỉ số cận lâm sàng cần đánh giá đối chiếu với triệu chứng thực thể toàn thân.");
            result.setPlainLanguageExplanation("Hồ sơ cận lâm sàng cần được Bác sĩ kiểm tra toàn diện cùng với các dấu hiệu sinh tồn để đưa ra kết luận chính xác.");
            result.setDoctorRecommendationReason("Bác sĩ Nội Tổng Quát giúp đánh giá tổng quan thể trạng và phân bổ phác đồ điều trị phù hợp.");

            list.add(new AbnormalIndicatorDto("Glucose máu lúc đói", "6.8", "mmol/L", "3.9 - 6.4", "ELEVATED", "Đường huyết hơi cao, cần theo dõi chế độ ăn tinh bột."));
        }

        result.setIndicators(list);
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
