package com.mediassist.service;

import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.TriageRequest;
import com.mediassist.dto.TriageResponse;
import com.mediassist.model.entity.*;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.TriageSessionRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class TriageService {

    private static final Logger log = LoggerFactory.getLogger(TriageService.class);

    private final RedFlagService redFlagService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final TriageSessionRepository triageSessionRepository;
    private final SpecialtyRepository specialtyRepository;
    private final UserRepository userRepository;
    private final ClinicalRagService clinicalRagService;

    public TriageService(RedFlagService redFlagService,
                         DoctorSemanticSearchService doctorSemanticSearchService,
                         TriageSessionRepository triageSessionRepository,
                         SpecialtyRepository specialtyRepository,
                         UserRepository userRepository,
                         ClinicalRagService clinicalRagService) {
        this.redFlagService = redFlagService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.triageSessionRepository = triageSessionRepository;
        this.specialtyRepository = specialtyRepository;
        this.userRepository = userRepository;
        this.clinicalRagService = clinicalRagService;
    }

    @Transactional
    public TriageResponse assessSymptoms(TriageRequest request, String userEmail) {
        String symptoms = request.getSymptoms().trim();
        log.info("🩺 Performing AI symptom triage for: '{}'", symptoms);

        User patientUser = null;
        if (userEmail != null && !userEmail.isBlank()) {
            patientUser = userRepository.findByEmail(userEmail).orElse(null);
        }

        // 1. HARD RULE: Check Emergency Red Flags (Zero LLM latency)
        Optional<String> redFlag = redFlagService.evaluateRedFlag(symptoms);
        if (redFlag.isPresent()) {
            return handleEmergency(symptoms, redFlag.get(), patientUser);
        }

        // 2. Clinical Evaluation & Urgency Classification
        TriageUrgencyLevel urgency = classifyUrgency(symptoms);
        SpecialtyMatch specialty = determineSpecialty(symptoms);

        // 3. SBAR Summary Generation (Situation - Background - Assessment - Recommendation)
        String sbar = buildSbarSummary(symptoms, urgency, specialty);
        String aiAdvice = buildClinicalAdvice(urgency, specialty);
        List<String> clarifyingQuestions = buildClarifyingQuestions(specialty);

        // 4. Semantic Doctor Matching via pgvector
        List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(
                symptoms + " " + specialty.slug() + " " + specialty.name(),
                4
        );

        // 5. Clinical RAG Triage Reasoning (OpenRouter / Fallback)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performTriageRagAnalysis(symptoms, urgency.name(), matchedDoctors);
        if (ragResult.getSbarSummary() != null && !ragResult.getSbarSummary().isBlank()) {
            sbar = ragResult.getSbarSummary();
        }
        if (ragResult.getAiAdvice() != null && !ragResult.getAiAdvice().isBlank()) {
            aiAdvice = ragResult.getAiAdvice();
        }

        // 5. Persist Triage Session
        TriageSession session = new TriageSession();
        session.setUser(patientUser);
        if (patientUser != null) {
            session.setPatientName(patientUser.getFullName());
        }
        session.setSymptomsText(symptoms);
        session.setEmergency(false);
        session.setUrgencyLevel(urgency);
        session.setPrimarySpecialty(specialty.slug());
        session.setSbarSummary(sbar);
        session.setAiAdvice(aiAdvice);
        session = triageSessionRepository.save(session);

        // 6. Build Response DTO
        TriageResponse response = new TriageResponse();
        response.setSessionId(session.getId());
        response.setEmergency(false);
        response.setEmergencyAlert(null);
        response.setUrgencyLevel(urgency);
        response.setPrimarySpecialtySlug(specialty.slug());
        response.setPrimarySpecialtyName(specialty.name());
        response.setSbarSummary(sbar);
        response.setAiAdvice(aiAdvice);
        response.setClarifyingQuestions(clarifyingQuestions);
        response.setMatchedDoctors(matchedDoctors);
        response.setModelUsed(ragResult.getModelUsed());
        response.setDoctorRecommendationReason(ragResult.getDoctorRecommendationReason());

        return response;
    }

    private TriageResponse handleEmergency(String symptoms, String emergencyMsg, User patientUser) {
        TriageSession session = new TriageSession();
        session.setUser(patientUser);
        if (patientUser != null) session.setPatientName(patientUser.getFullName());
        session.setSymptomsText(symptoms);
        session.setEmergency(true);
        session.setUrgencyLevel(TriageUrgencyLevel.EMERGENCY);
        session.setPrimarySpecialty("emergency");
        session.setSbarSummary("S (Situation): Cảnh báo dấu hiệu nguy kịch tức thời.\nA (Assessment): Nghi ngờ đột quỵ não hoặc hội chứng mạch vành cấp.\nR (Recommendation): Kích hoạt quy trình gọi 115 hoặc đưa người bệnh đến khoa Cấp cứu gần nhất ngay lập tức.");
        session.setAiAdvice(emergencyMsg);
        session = triageSessionRepository.save(session);

        TriageResponse res = new TriageResponse();
        res.setSessionId(session.getId());
        res.setEmergency(true);
        res.setEmergencyAlert(emergencyMsg);
        res.setUrgencyLevel(TriageUrgencyLevel.EMERGENCY);
        res.setPrimarySpecialtySlug("emergency");
        res.setPrimarySpecialtyName("Cấp Cứu Hồi Sức 115");
        res.setSbarSummary(session.getSbarSummary());
        res.setAiAdvice(emergencyMsg);
        res.setClarifyingQuestions(List.of("Bệnh nhân có còn tỉnh táo hay không?", "Người bệnh có đang ở một mình không?"));
        res.setMatchedDoctors(Collections.emptyList());
        return res;
    }

    private TriageUrgencyLevel classifyUrgency(String text) {
        String normalized = stripAccents(text.toLowerCase());
        if (normalized.contains("sot cao") || normalized.contains("du doi") ||
            normalized.contains("kho tho") || normalized.contains("dau quan") ||
            normalized.contains("chong mat nhieu") || normalized.contains("co giat")) {
            return TriageUrgencyLevel.URGENT;
        }
        return TriageUrgencyLevel.ROUTINE;
    }

    private SpecialtyMatch determineSpecialty(String text) {
        String n = stripAccents(text.toLowerCase());

        if (n.contains("tim") || n.contains("mach") || n.contains("huyet ap") || n.contains("hoi hop") || n.contains("trong nguc")) {
            return new SpecialtyMatch("cardiology", "Cardiology (Tim Mạch)");
        }
        if (n.contains("dau") || n.contains("nao") || n.contains("tien dinh") || n.contains("chong mat") || n.contains("mat ngu") || n.contains("te bi")) {
            return new SpecialtyMatch("neurology", "Neurology (Thần Kinh)");
        }
        if (n.contains("da") || n.contains("ngua") || n.contains("man do") || n.contains("mun") || n.contains("di ung")) {
            return new SpecialtyMatch("dermatology", "Dermatology (Da Liễu)");
        }
        if (n.contains("da day") || n.contains("ruot") || n.contains("bung") || n.contains("trao nguoc") || n.contains("gan") || n.contains("tieu chay") || n.contains("o chua")) {
            return new SpecialtyMatch("gastroenterology", "Gastroenterology (Tiêu Hóa)");
        }
        if (n.contains("tre") || n.contains("be") || n.contains("so sinh") || n.contains("bieng an")) {
            return new SpecialtyMatch("pediatrics", "Pediatrics (Nhi Khoa)");
        }
        return new SpecialtyMatch("general-internal-medicine", "General Internal Medicine (Nội Tổng Quát)");
    }

    private String buildSbarSummary(String symptoms, TriageUrgencyLevel urgency, SpecialtyMatch specialty) {
        return String.format("""
                • Situation (Tình huống): Bệnh nhân ghi nhận các triệu chứng chính: "%s".
                • Background (Tiền sử): Xuất hiện các đợt phát tác gần đây, chưa ghi nhận dị ứng cấp tính.
                • Assessment (Đánh giá): Mức độ khẩn cấp được xác định là [%s]. Triệu chứng có xu hướng khu trú thuộc chuyên khoa [%s].
                • Recommendation (Khuyến nghị): Theo dõi diễn tiến sinh hiệu, nghỉ ngơi tại chỗ, tránh dùng thuốc tự phát và nên đặt hẹn khám chuyên khoa để làm các xét nghiệm lâm sàng cần thiết.""",
                symptoms, urgency, specialty.name()
        );
    }

    private String buildClinicalAdvice(TriageUrgencyLevel urgency, SpecialtyMatch specialty) {
        if (urgency == TriageUrgencyLevel.URGENT) {
            return String.format("Các triệu chứng bạn đang gặp phải cần được bác sĩ chuyên khoa %s thăm khám sớm. Hãy nghỉ ngơi, giữ cơ thể ổn định và liên hệ đặt lịch khám ưu tiên với các bác sĩ dưới đây.", specialty.name());
        }
        return String.format("Tình trạng của bạn có thể theo dõi và đặt lịch hẹn khám tư vấn theo lịch trình bình thường với chuyên khoa %s. Đừng quên ghi chép lại tần suất xuất hiện triệu chứng để trao đổi với bác sĩ trong buổi khám.", specialty.name());
    }

    private List<String> buildClarifyingQuestions(SpecialtyMatch specialty) {
        if ("cardiology".equals(specialty.slug())) {
            return List.of(
                    "Cơn hồi hộp hoặc đau tức ngực xuất hiện khi gắng sức hay lúc bạn đang nghỉ ngơi?",
                    "Bạn có tiền sử huyết áp cao hoặc gia đình có người mắc bệnh mạch vành không?"
            );
        } else if ("neurology".equals(specialty.slug())) {
            return List.of(
                    "Đau đầu xuất hiện thành từng cơn hay âm ỉ liên tục cả ngày?",
                    "Bạn có kèm theo hoa mắt, sợ ánh sáng hay buồn nôn không?"
            );
        } else if ("gastroenterology".equals(specialty.slug())) {
            return List.of(
                    "Cơn đau bụng xuất hiện trước hay sau khi ăn?",
                    "Bạn có thấy ợ nóng, đầy hơi hoặc thay đổi thói quen đại tiện không?"
            );
        }
        return List.of(
                "Triệu chứng này bắt đầu xuất hiện từ bao giờ (mấy ngày qua)?",
                "Bạn đã từng sử dụng thuốc gì để giảm bớt cảm giác khó chịu này chưa?"
        );
    }

    private String stripAccents(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(n).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }

    private record SpecialtyMatch(String slug, String name) {}
}
