package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorMatchDto;
import com.mediassist.dto.TriageRequest;
import com.mediassist.dto.TriageResponse;
import com.mediassist.model.entity.*;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.TriageSessionRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
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
        if (request == null || request.getSymptoms() == null || request.getSymptoms().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "Mô tả triệu chứng không được để trống");
        }
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

        // 2. Pre-RAG Semantic Retrieval: Fetch doctor candidates from pgvector BEFORE calling LLM
        //    so that Gemini receives real doctor profiles and can make a personalized recommendation.
        List<DoctorMatchDto> preRagCandidates = doctorSemanticSearchService.searchDoctors(symptoms, 4);
        log.info("🧠 [PRE-RAG] Found {} doctor candidates from pgvector for symptom-based broad search", preRagCandidates != null ? preRagCandidates.size() : 0);

        // 3. AI-First Clinical Reasoning via LLM with real doctor candidates injected
        com.mediassist.ai.ClinicalAiResult ragResult = clinicalRagService.performTriageRagAnalysis(
                symptoms, preRagCandidates != null ? preRagCandidates : Collections.emptyList());

        boolean isMedical = ragResult.isMedicalRelated();

        String specialtySlug;
        String specialtyName;
        TriageUrgencyLevel urgency;
        String sbar;
        String aiAdvice;
        List<String> clarifyingQuestions;
        List<DoctorMatchDto> matchedDoctors;

        if (!isMedical) {
            log.info("ℹ️ [OFF-TOPIC GUARD] Query '{}' identified as non-medical / off-topic. Suppressing doctor matching.", symptoms);
            specialtySlug = null;
            specialtyName = "Không thuộc phạm vi y tế";
            urgency = TriageUrgencyLevel.ROUTINE;
            sbar = (ragResult.getSbarSummary() != null && !ragResult.getSbarSummary().isBlank())
                    ? ragResult.getSbarSummary()
                    : "• Situation: Yêu cầu không thuộc phạm vi triệu chứng y khoa lâm sàng.\n• Assessment: Chưa ghi nhận triệu chứng bệnh lý bất thường.\n• Recommendation: Vui lòng cung cấp mô tả về các dấu hiệu sức khỏe để hệ thống phân luồng.";
            aiAdvice = (ragResult.getAiAdvice() != null && !ragResult.getAiAdvice().isBlank())
                    ? ragResult.getAiAdvice()
                    : "Chào bạn! Tôi là Trợ lý Phân luồng Lâm sàng MediAssist-AI. Câu hỏi hoặc nội dung bạn vừa nhập không liên quan đến triệu chứng sức khỏe hay vấn đề y tế. Xin vui lòng mô tả các biểu hiện sức khỏe bạn đang gặp phải (ví dụ: sốt, đau ngực, đau đầu, mệt mỏi...) để tôi có thể hỗ trợ phân loại mức độ khẩn cấp và kết nối bạn với Bác sĩ chuyên khoa phù hợp.";
            clarifyingQuestions = (ragResult.getClarifyingQuestions() != null && !ragResult.getClarifyingQuestions().isEmpty())
                    ? ragResult.getClarifyingQuestions()
                    : List.of("Bạn có đang gặp bất kỳ biểu hiện khó chịu hoặc triệu chứng sức khỏe nào không?",
                              "Bạn cần được tư vấn về vấn đề y tế hoặc chuyên khoa cụ thể nào?");
            matchedDoctors = Collections.emptyList();
            ragResult.setRecommendedDoctorId(null);
            ragResult.setDoctorRecommendationReason(null);
        } else {
            // 4. Derive specialty and urgency strictly from AI reasoning
            specialtySlug = (ragResult.getRecommendedSpecialtySlug() != null && !ragResult.getRecommendedSpecialtySlug().isBlank())
                    ? ragResult.getRecommendedSpecialtySlug().toLowerCase().trim()
                    : "general-internal-medicine";
            specialtyName = (ragResult.getRecommendedSpecialtyName() != null && !ragResult.getRecommendedSpecialtyName().isBlank())
                    ? ragResult.getRecommendedSpecialtyName()
                    : MedicalDocumentAnalysisService.getSpecialtyDisplayName(specialtySlug);

            urgency = parseUrgencyLevel(ragResult.getUrgencyLevel());

            sbar = (ragResult.getSbarSummary() != null && !ragResult.getSbarSummary().isBlank())
                    ? ragResult.getSbarSummary()
                    : buildFallbackSbarSummary(symptoms, urgency, specialtyName);

            aiAdvice = (ragResult.getAiAdvice() != null && !ragResult.getAiAdvice().isBlank())
                    ? ragResult.getAiAdvice()
                    : buildFallbackClinicalAdvice(urgency, specialtyName);

            clarifyingQuestions = (ragResult.getClarifyingQuestions() != null && !ragResult.getClarifyingQuestions().isEmpty())
                    ? ragResult.getClarifyingQuestions()
                    : (ragResult.getSuggestedQuestions() != null && !ragResult.getSuggestedQuestions().isEmpty()
                            ? ragResult.getSuggestedQuestions()
                            : defaultClarifyingQuestions());

            // 5. Focused pgvector Doctor Retrieval based on AI-reasoned specialty (clean query, no noise)
            String focusedDoctorQuery = buildFocusedTriageDoctorQuery(specialtySlug, specialtyName, symptoms);
            matchedDoctors = doctorSemanticSearchService.searchDoctors(focusedDoctorQuery, 4);

            // Fallback to pre-RAG candidates if focused search yields nothing
            if ((matchedDoctors == null || matchedDoctors.isEmpty()) && preRagCandidates != null && !preRagCandidates.isEmpty()) {
                matchedDoctors = preRagCandidates;
            }

            if (matchedDoctors != null && !matchedDoctors.isEmpty()) {
                matchedDoctors = new ArrayList<>(matchedDoctors);
                // If AI explicitly recommended a doctor from pre-RAG candidates, align display order so that doctor is index 0
                if (ragResult.getRecommendedDoctorId() != null) {
                    UUID recId = ragResult.getRecommendedDoctorId();
                    int recIdx = -1;
                    for (int i = 0; i < matchedDoctors.size(); i++) {
                        if (recId.equals(matchedDoctors.get(i).getDoctorId())) {
                            recIdx = i;
                            break;
                        }
                    }
                    if (recIdx > 0) {
                        DoctorMatchDto recDoc = matchedDoctors.remove(recIdx);
                        matchedDoctors.add(0, recDoc);
                    }
                }

                DoctorMatchDto top = matchedDoctors.get(0);
                top.setAiRecommended(true);

                String aiReason = ragResult.getDoctorRecommendationReason();
                boolean isMeta = MedicalDocumentAnalysisService.isMetaComplaint(aiReason);

                String finalReason = isMeta
                        ? buildClinicalTriageRecommendationReason(top, specialtyName, symptoms)
                        : aiReason;

                top.setAiRecommendationReason(finalReason);
                ragResult.setRecommendedDoctorId(top.getDoctorId());
                ragResult.setDoctorRecommendationReason(finalReason);
            }
        }

        // 6. Persist Triage Session
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

        // 7. Build Response DTO
        TriageResponse response = new TriageResponse();
        response.setSessionId(session.getId());
        response.setEmergency(false);
        response.setEmergencyAlert(null);
        response.setMedicalRelated(isMedical);
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

    /**
     * Builds a clean, focused query for pgvector doctor search in triage context.
     * Avoids polluting the embedding with long free-text symptom descriptions
     * which would create noise across the 1536-d vector space.
     */
    private String buildFocusedTriageDoctorQuery(String specialtySlug, String specialtyName, String symptoms) {
        StringBuilder query = new StringBuilder();
        query.append("Bác sĩ chuyên khoa ").append(specialtyName).append(". ");
        query.append(specialtySlug).append(". ");

        // Extract only the first 80 chars of symptoms to provide minimal context
        // without overwhelming the domain-specific semantic boost
        if (symptoms != null && !symptoms.isBlank()) {
            String briefSymptoms = symptoms.length() > 80 ? symptoms.substring(0, 80) : symptoms;
            query.append("Triệu chứng: ").append(briefSymptoms).append(". ");
        }

        query.append("Tư vấn chẩn đoán và điều trị chuyên khoa ").append(specialtySlug).append(".");
        return query.toString();
    }

    /**
     * Builds a professional clinical recommendation reason for the top matched doctor
     * in triage context, tied to the patient's specialty and symptoms.
     */
    private String buildClinicalTriageRecommendationReason(DoctorMatchDto doctor, String specialtyName, String symptoms) {
        String titleAndName = String.format("%s %s",
                doctor.getAcademicTitle() != null ? doctor.getAcademicTitle() : "BS.",
                doctor.getFullName());
        String hospital = doctor.getHospitalAffiliation() != null ? " (" + doctor.getHospitalAffiliation() + ")" : "";

        // Extract brief symptom essence (max 60 chars for reason text)
        String briefSymptom = "";
        if (symptoms != null && !symptoms.isBlank()) {
            briefSymptom = symptoms.length() > 60 ? symptoms.substring(0, 60) + "..." : symptoms;
        }

        return String.format(
                "Đề xuất %s%s thuộc chuyên khoa %s vì bệnh nhân mô tả triệu chứng \"%s\", phù hợp với lĩnh vực chuyên sâu và kinh nghiệm %d năm của bác sĩ.",
                titleAndName, hospital, specialtyName, briefSymptom, doctor.getYearsOfExperience());
    }
}
