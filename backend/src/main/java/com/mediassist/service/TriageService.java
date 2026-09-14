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

import java.util.*;

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

        // 2. AI-First Clinical Reasoning via LLM (or Safe Deterministic Fallback if offline)
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performTriageRagAnalysis(symptoms, Collections.emptyList());

        // 3. Derive specialty and urgency strictly from AI reasoning
        String specialtySlug = (ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank())
                ? ragResult.getRecommendedSpecialtySlug().toLowerCase().trim()
                : "general-internal-medicine";
        String specialtyName = (ragResult.getRecommendedSpecialtyName() != null && !ragResult.getRecommendedSpecialtyName().isBlank())
                ? ragResult.getRecommendedSpecialtyName()
                : MedicalDocumentAnalysisService.getSpecialtyDisplayName(specialtySlug);

        TriageUrgencyLevel urgency = parseUrgencyLevel(ragResult.getUrgencyLevel());

        String sbar = (ragResult.getSbarSummary() != null && !ragResult.getSbarSummary().isBlank())
                ? ragResult.getSbarSummary()
                : buildFallbackSbarSummary(symptoms, urgency, specialtyName);

        String aiAdvice = (ragResult.getAiAdvice() != null && !ragResult.getAiAdvice().isBlank())
                ? ragResult.getAiAdvice()
                : buildFallbackClinicalAdvice(urgency, specialtyName);

        List<String> clarifyingQuestions = (ragResult.getClarifyingQuestions() != null && !ragResult.getClarifyingQuestions().isEmpty())
                ? ragResult.getClarifyingQuestions()
                : (ragResult.getSuggestedQuestions() != null && !ragResult.getSuggestedQuestions().isEmpty()
                        ? ragResult.getSuggestedQuestions()
                        : defaultClarifyingQuestions());

        // 4. Semantic Doctor Matching via pgvector based on AI-reasoned specialty & symptoms
        List<DoctorMatchDto> matchedDoctors = doctorSemanticSearchService.searchDoctors(
                symptoms + " " + specialtySlug + " " + specialtyName,
                4
        );

        if (matchedDoctors != null && !matchedDoctors.isEmpty()) {
            DoctorMatchDto top = matchedDoctors.get(0);
            top.setAiRecommended(true);
            String reason = (ragResult.getDoctorRecommendationReason() != null && !ragResult.getDoctorRecommendationReason().isBlank())
                    ? ragResult.getDoctorRecommendationReason()
                    : String.format("Bác sĩ chuyên khoa %s được đề xuất dựa trên thuật toán tương đồng ngữ nghĩa pgvector (độ tương thích %d%%).",
                            specialtyName, Math.round(top.getSimilarityScore() * 100));
            top.setAiRecommendationReason(reason);
            ragResult.setRecommendedDoctorId(top.getDoctorId());
            ragResult.setDoctorRecommendationReason(reason);
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
        session.setPrimarySpecialty(specialtySlug);
        session.setSbarSummary(sbar);
        session.setAiAdvice(aiAdvice);
        session = triageSessionRepository.save(session);

        // 6. Build Response DTO
        TriageResponse response = new TriageResponse();
        response.setSessionId(session.getId());
        response.setEmergency(false);
        response.setEmergencyAlert(null);
        response.setUrgencyLevel(urgency);
        response.setPrimarySpecialtySlug(specialtySlug);
        response.setPrimarySpecialtyName(specialtyName);
        response.setSbarSummary(sbar);
        response.setAiAdvice(aiAdvice);
        response.setClarifyingQuestions(clarifyingQuestions);
        response.setMatchedDoctors(matchedDoctors);
        response.setModelUsed(ragResult.getModelUsed());
        response.setDoctorRecommendationReason(ragResult.getDoctorRecommendationReason());
        response.setPiiProtected(ragResult.isPiiProtected());
        response.setPiiEntitiesCount(ragResult.getPiiEntitiesCount());
        response.setPiiMaskedTypes(ragResult.getPiiMaskedTypes());

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

    private TriageUrgencyLevel parseUrgencyLevel(String raw) {
        if (raw != null) {
            String clean = raw.trim().toUpperCase();
            if (clean.contains("EMERGENCY")) return TriageUrgencyLevel.EMERGENCY;
            if (clean.contains("URGENT")) return TriageUrgencyLevel.URGENT;
            if (clean.contains("ROUTINE")) return TriageUrgencyLevel.ROUTINE;
        }
        return TriageUrgencyLevel.ROUTINE;
    }

    private String buildFallbackSbarSummary(String symptoms, TriageUrgencyLevel urgency, String specialtyName) {
        return String.format("""
                • Situation (Tình huống): Bệnh nhân ghi nhận các triệu chứng lâm sàng: "%s".
                • Background (Tiền sử): Diễn biến triệu chứng ghi nhận ở mức độ [%s].
                • Assessment (Đánh giá): Định hướng tham khảo ban đầu thuộc chuyên khoa [%s].
                • Recommendation (Khuyến nghị): Theo dõi diễn tiến sinh hiệu, nghỉ ngơi tại chỗ, tránh tự ý dùng thuốc và nên đặt hẹn khám chuyên khoa để được bác sĩ chẩn đoán chính xác.""",
                symptoms, urgency, specialtyName
        );
    }

    private String buildFallbackClinicalAdvice(TriageUrgencyLevel urgency, String specialtyName) {
        if (urgency == TriageUrgencyLevel.URGENT) {
            return String.format("Các triệu chứng bạn đang gặp phải có dấu hiệu cấp tính cần được bác sĩ chuyên khoa %s thăm khám sớm. Hãy nghỉ ngơi, giữ cơ thể ổn định và liên hệ đặt lịch khám ưu tiên.", specialtyName);
        }
        return String.format("Tình trạng của bạn có thể theo dõi và đặt lịch hẹn khám tư vấn theo lịch trình bình thường với chuyên khoa %s. Đừng quên ghi chép lại tần suất xuất hiện triệu chứng để trao đổi với bác sĩ trong buổi khám.", specialtyName);
    }

    private List<String> defaultClarifyingQuestions() {
        return List.of(
                "Triệu chứng này bắt đầu xuất hiện từ bao giờ (mấy ngày qua)?",
                "Bạn đã từng sử dụng thuốc gì hoặc có tiền sử bệnh nền mạn tính nào trước đây không?",
                "Triệu chứng có tăng lên khi gắng sức, thay đổi tư thế hoặc theo thời điểm cụ thể trong ngày không?"
        );
    }
}
