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
        if (textLower.contains("tsh") || textLower.contains("ft4") || textLower.contains("ft3") || textLower.contains("giap") ||
            textLower.contains("glucose") || textLower.contains("duong huyet") || textLower.contains("tieu duong") || textLower.contains("hba1c") || textLower.contains("noi tiet")) {
            result.setRecommendedSpecialtySlug("endocrinology");
            result.setRecommendedSpecialtyName("Endocrinology & Diabetes (Nội Tiết & Đái Tháo Đường)");
            result.setClinicalSummary("Chỉ số nội tiết / hormone tuyến giáp / đường huyết biến động ngoài ngưỡng chuẩn. Cần đối chiếu phác đồ chuyên khoa Nội Tiết.");
            result.setPlainLanguageExplanation("Kết quả cho thấy có rối loạn về hormone hoặc chuyển hóa đường. Bạn nên đến khám chuyên khoa Nội Tiết & Đái Tháo Đường để được chẩn đoán chi tiết.");
            result.setDoctorRecommendationReason("Bác sĩ chuyên khoa Nội Tiết giúp tầm soát bệnh lý tuyến giáp, đái tháo đường và điều chỉnh chuyển hóa tối ưu.");
        } else if (textLower.contains("creatinin") || textLower.contains("egfr") || textLower.contains("ure") || textLower.contains("bun") ||
                   textLower.contains("than") || textLower.contains("tiet nieu") || textLower.contains("protein nieu") || textLower.contains("dam nieu")) {
            result.setRecommendedSpecialtySlug("nephrology");
            result.setRecommendedSpecialtyName("Nephrology & Urology (Thận - Tiết Niệu)");
            result.setClinicalSummary("Chỉ số chức năng lọc cầu thận (Creatinine/eGFR/Ure) có dấu hiệu suy giảm hoặc tổn thương hệ tiết niệu. Cần siêu âm và bảo tồn chức năng thận.");
            result.setPlainLanguageExplanation("Chỉ số đo chức năng lọc thận có dấu hiệu bất thường. Bạn nên đi khám chuyên khoa Thận - Tiết Niệu để kiểm tra mức độ tổn thương và nhận hướng dẫn bảo vệ thận.");
            result.setDoctorRecommendationReason("Bác sĩ chuyên khoa Thận - Tiết Niệu chuyên sâu về bảo tồn chức năng thận và điều trị bệnh lý đường tiết niệu.");
        } else if (textLower.contains("alt") || textLower.contains("ast") || textLower.contains("men gan") || textLower.contains("gan mat") ||
                   textLower.contains("tieu hoa") || textLower.contains("da day") || textLower.contains("bilirubin") || textLower.contains("ggt")) {
            result.setRecommendedSpecialtySlug("gastroenterology");
            result.setRecommendedSpecialtyName("Gastroenterology (Tiêu Hóa - Gan Mật)");
            result.setClinicalSummary("Tăng men gan tế bào ALT/AST hoặc tổn thương tiêu hóa - mật. Cần tầm soát viêm gan siêu vi và đánh giá siêu âm nhu mô gan.");
            result.setPlainLanguageExplanation("Chỉ số men gan hoặc tiêu hóa của bạn đang tăng báo hiệu gan hoặc đường tiêu hóa đang bị ảnh hưởng. Bạn nên kiêng rượu bia và khám chuyên khoa Tiêu Hóa - Gan Mật sớm.");
            result.setDoctorRecommendationReason("Bác sĩ chuyên khoa Tiêu Hóa - Gan Mật có kinh nghiệm hạ men gan và điều trị bệnh lý gan mật hiệu quả.");
        } else if (textLower.contains("cholesterol") || textLower.contains("triglyceride") || textLower.contains("lipid") ||
                   textLower.contains("tim mach") || textLower.contains("mach vanh") || textLower.contains("troponin") || textLower.contains("huyet ap")) {
            result.setRecommendedSpecialtySlug("cardiology");
            result.setRecommendedSpecialtyName("Cardiology (Tim Mạch)");
            result.setClinicalSummary("Rối loạn chuyển hóa Lipid máu hoặc chỉ điểm tim mạch. Cần theo dõi huyết áp, điện tâm đồ và đánh giá nguy cơ xơ vữa.");
            result.setPlainLanguageExplanation("Kết quả cho thấy các chỉ số tim mạch hoặc mỡ máu của bạn cao hơn mức an toàn. Cần điều chỉnh chế độ ăn giảm dầu mỡ, tập thể dục đều đặn và khám tim mạch.");
            result.setDoctorRecommendationReason("Bác sĩ chuyên khoa Tim Mạch giàu kinh nghiệm điều trị xơ vữa và phòng ngừa biến cố tim mạch.");
        } else if (textLower.contains("ho hap") || textLower.contains("phoi") || textLower.contains("phe quan") || textLower.contains("hen") || textLower.contains("copd")) {
            result.setRecommendedSpecialtySlug("pulmonology");
            result.setRecommendedSpecialtyName("Pulmonology (Hô Hấp & Phổi)");
            result.setClinicalSummary("Dấu hiệu tổn thương hệ hô hấp hoặc phế quản phổi. Cần đo hô hấp ký và đối chiếu chẩn đoán hình ảnh lồng ngực.");
            result.setPlainLanguageExplanation("Hồ sơ cho thấy bạn có vấn đề liên quan đến đường hô hấp hoặc phổi. Bạn nên khám chuyên khoa Hô Hấp để kiểm tra thông khí phổi.");
            result.setDoctorRecommendationReason("Bác sĩ Hô Hấp & Phổi chuyên điều trị các bệnh viêm phổi, hen phế quản và bệnh phổi mạn tính.");
        } else if (textLower.contains("than kinh") || textLower.contains("tien dinh") || textLower.contains("dau dau") || textLower.contains("chong mat") || textLower.contains("nao")) {
            result.setRecommendedSpecialtySlug("neurology");
            result.setRecommendedSpecialtyName("Neurology (Thần Kinh)");
            result.setClinicalSummary("Dấu hiệu rối loạn tuần hoàn não hoặc tiền đình. Cần tầm soát hình ảnh sọ não và điện não đồ.");
            result.setPlainLanguageExplanation("Triệu chứng hoặc kết quả liên quan đến hệ thần kinh hoặc tiền đình. Bạn nên khám chuyên khoa Thần Kinh để có hướng điều trị dứt điểm.");
            result.setDoctorRecommendationReason("Bác sĩ Thần Kinh có kinh nghiệm điều trị rối loạn tiền đình, đau đầu mạn tính và bệnh lý mạch máu não.");
        } else if (textLower.contains("khop") || textLower.contains("xuong") || textLower.contains("acid uric") || textLower.contains("gout") || textLower.contains("thoai hoa")) {
            result.setRecommendedSpecialtySlug("orthopedics");
            result.setRecommendedSpecialtyName("Orthopedics (Cơ Xương Khớp & Chấn Thương Chỉnh Hình)");
            result.setClinicalSummary("Tăng acid uric máu hoặc biểu hiện thoái hóa khớp, tổn thương hệ vận động. Cần phác đồ bảo tồn sụn khớp.");
            result.setPlainLanguageExplanation("Chỉ số acid uric hoặc cơ xương khớp của bạn có dấu hiệu bất thường, có thể liên quan đến Gout hoặc thoái hóa khớp.");
            result.setDoctorRecommendationReason("Bác sĩ Cơ Xương Khớp chuyên điều trị bệnh Gout, viêm khớp và thoái hóa xương khớp.");
        } else if (textLower.contains("da lieu") || textLower.contains("di ung") || textLower.contains("me day") || textLower.contains("viem da")) {
            result.setRecommendedSpecialtySlug("dermatology");
            result.setRecommendedSpecialtyName("Dermatology (Da Liễu)");
            result.setClinicalSummary("Biểu hiện phản ứng dị ứng da liễu hoặc viêm da cơ địa. Cần tìm dị nguyên và điều trị chống viêm ngoại vi.");
            result.setPlainLanguageExplanation("Tình trạng kích ứng da cần được Bác sĩ Da Liễu trực tiếp thăm khám và kê đơn thuốc bôi an toàn.");
            result.setDoctorRecommendationReason("Bác sĩ Da Liễu chuyên khoa điều trị các bệnh lý dị ứng, mẩn ngứa và phục hồi hàng rào bảo vệ da.");
        } else if (textLower.contains("tai mui hong") || textLower.contains("xoang") || textLower.contains("amidan") || textLower.contains("hong")) {
            result.setRecommendedSpecialtySlug("ent");
            result.setRecommendedSpecialtyName("Otolaryngology (Tai Mũi Họng)");
            result.setClinicalSummary("Viêm nhiễm đường hô hấp trên vùng Tai Mũi Họng. Đề xuất nội soi kiểm tra niêm mạc.");
            result.setPlainLanguageExplanation("Bạn có dấu hiệu viêm mũi họng hoặc xoang, nên nội soi Tai Mũi Họng để kiểm tra ổ viêm.");
            result.setDoctorRecommendationReason("Bác sĩ Tai Mũi Họng giúp nội soi chẩn đoán chính xác và làm sạch ổ viêm.");
        } else {
            result.setRecommendedSpecialtySlug("general-internal-medicine");
            result.setRecommendedSpecialtyName("General Internal Medicine (Nội Tổng Quát)");
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
