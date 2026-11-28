package com.mediassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.ConsultationType;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service quản lý liên kết Zalo OA và tự động nhắc nhở:
 * 1) Nhắc lịch khám sắp tới (trước 24h)
 * 2) Nhắc uống thuốc hàng ngày theo đúng đơn thuốc do bác sĩ đã kê (prescriptionJson)
 *    - Tuyệt đối không tự bịa đơn thuốc (tuân thủ Zero-Prescription Guardrail).
 */
@Service
public class ZaloReminderService {

    private static final Logger log = LoggerFactory.getLogger(ZaloReminderService.class);
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm 'ngày' dd/MM/yyyy");

    private final ZaloOaGateway zaloOaGateway;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final ObjectMapper objectMapper;
    private final String clientBaseUrl;

    public ZaloReminderService(
            ZaloOaGateway zaloOaGateway,
            UserRepository userRepository,
            AppointmentRepository appointmentRepository,
            ObjectMapper objectMapper,
            @Value("${app.client-base-url:http://localhost:5173}") String clientBaseUrl
    ) {
        this.zaloOaGateway = zaloOaGateway;
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.objectMapper = objectMapper;
        this.clientBaseUrl = clientBaseUrl;
    }

    public Map<String, Object> getStatus(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("linked", user.isZaloOptedIn() && user.getZaloUserId() != null && !user.getZaloUserId().isBlank());
        map.put("zaloUserId", user.getZaloUserId());
        map.put("optedIn", user.isZaloOptedIn());
        map.put("linkedAt", user.getZaloLinkedAt());
        map.put("mode", zaloOaGateway.getMode());
        map.put("oaId", zaloOaGateway.getOaId());
        map.put("oaQrUrl", zaloOaGateway.getOaQrUrl());
        return map;
    }

    @Transactional
    public Map<String, Object> linkZalo(User user, String zaloUserId) {
        String cleanId = (zaloUserId != null && !zaloUserId.isBlank())
                ? zaloUserId.trim()
                : "DEMO_ZALO_" + user.getId().toString().substring(0, 8).toUpperCase();

        userRepository.findByZaloUserId(cleanId).ifPresent(existing -> {
            if (!existing.getId().equals(user.getId())) {
                throw new AppException(HttpStatus.CONFLICT, "ZALO_ALREADY_LINKED",
                        "Zalo User ID này đã được liên kết với một tài khoản khác.");
            }
        });

        user.setZaloUserId(cleanId);
        user.setZaloOptedIn(true);
        user.setZaloLinkedAt(LocalDateTime.now());
        userRepository.save(user);

        zaloOaGateway.sendTextMessage(cleanId,
                "🏥 MediAssist-AI: Tài khoản của " + user.getFullName() + " đã liên kết thành công!\n"
                        + "Hệ thống sẽ tự động nhắc lịch khám trước 24 giờ và nhắc lịch uống thuốc theo đơn bác sĩ.\n"
                        + "Xem hồ sơ: " + clientBaseUrl + "/patient/dashboard");

        return getStatus(user);
    }

    @Transactional
    public Map<String, Object> unlinkZalo(User user) {
        user.setZaloOptedIn(false);
        user.setZaloUserId(null);
        user.setZaloLinkedAt(null);
        userRepository.save(user);
        return getStatus(user);
    }

    @Transactional
    public Map<String, Object> sendAppointmentReminderForUser(User user, UUID appointmentId) {
        Appointment apt = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "APPOINTMENT_NOT_FOUND", "Không tìm thấy lịch hẹn."));
        if (!apt.getPatient().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền gửi nhắc lịch cho lịch hẹn này.");
        }
        if (!user.isZaloOptedIn() || user.getZaloUserId() == null || user.getZaloUserId().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "ZALO_NOT_LINKED", "Vui lòng liên kết tài khoản Zalo trước khi gửi nhắc lịch.");
        }

        String message = buildAppointmentReminderText(apt);
        ZaloOaGateway.SendResult result = zaloOaGateway.sendTextMessage(user.getZaloUserId(), message);
        if (!result.success()) {
            throw new AppException(HttpStatus.BAD_GATEWAY, "ZALO_SEND_FAILED", "Không gửi được tin nhắn Zalo: " + result.error());
        }
        apt.setZaloAppointmentRemindedAt(LocalDateTime.now());
        appointmentRepository.save(apt);

        return Map.of(
                "success", true,
                "mode", result.mode(),
                "messageId", result.messageId() != null ? result.messageId() : "",
                "preview", message
        );
    }

    @Transactional
    public Map<String, Object> sendMedicationReminderForUser(User user, UUID appointmentId) {
        Appointment apt = appointmentRepository.findByIdWithUsers(appointmentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "APPOINTMENT_NOT_FOUND", "Không tìm thấy ca khám."));
        if (!apt.getPatient().getId().equals(user.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền gửi nhắc thuốc cho ca khám này.");
        }
        if (!user.isZaloOptedIn() || user.getZaloUserId() == null || user.getZaloUserId().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "ZALO_NOT_LINKED", "Vui lòng liên kết tài khoản Zalo trước khi gửi nhắc thuốc.");
        }
        if (apt.getStatus() != AppointmentStatus.COMPLETED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "NOT_COMPLETED", "Chỉ gửi nhắc uống thuốc cho ca khám đã hoàn thành và có đơn thuốc bác sĩ.");
        }

        String message = buildMedicationReminderText(apt);
        if (message == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "NO_PRESCRIPTION", "Ca khám này chưa có đơn thuốc được bác sĩ kê.");
        }

        ZaloOaGateway.SendResult result = zaloOaGateway.sendTextMessage(user.getZaloUserId(), message);
        if (!result.success()) {
            throw new AppException(HttpStatus.BAD_GATEWAY, "ZALO_SEND_FAILED", "Không gửi được tin nhắn Zalo: " + result.error());
        }
        apt.setZaloMedicationRemindedDate(LocalDate.now());
        appointmentRepository.save(apt);

        return Map.of(
                "success", true,
                "mode", result.mode(),
                "messageId", result.messageId() != null ? result.messageId() : "",
                "preview", message
        );
    }

    /**
     * Scheduled every 15 minutes:
     * 1. Send 24-hour advance appointment reminders.
     * 2. Send daily medication adherence reminders based strictly on completed doctor prescriptions.
     */
    @Scheduled(fixedDelay = 900_000, initialDelay = 60_000)
    @Transactional
    public void processScheduledReminders() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Appointment reminders within next 24h
        List<Appointment> upcoming = appointmentRepository.findUpcomingForZaloReminder(now, now.plusHours(24));
        for (Appointment apt : upcoming) {
            String zaloId = apt.getPatient().getZaloUserId();
            ZaloOaGateway.SendResult res = zaloOaGateway.sendTextMessage(zaloId, buildAppointmentReminderText(apt));
            if (res.success()) {
                apt.setZaloAppointmentRemindedAt(now);
                appointmentRepository.save(apt);
            }
        }

        // 2. Medication reminders for completed visits in last 7 days (once per day)
        LocalDate today = LocalDate.now();
        List<Appointment> medVisits = appointmentRepository.findCompletedWithPrescriptionForZaloReminder(now.minusDays(7), today);
        for (Appointment apt : medVisits) {
            String text = buildMedicationReminderText(apt);
            if (text == null) continue;
            ZaloOaGateway.SendResult res = zaloOaGateway.sendTextMessage(apt.getPatient().getZaloUserId(), text);
            if (res.success()) {
                apt.setZaloMedicationRemindedDate(today);
                appointmentRepository.save(apt);
            }
        }

        if (!upcoming.isEmpty() || !medVisits.isEmpty()) {
            log.info("📲 [ZALO SCHEDULER] Processed {} appointment reminders and {} medication reminders.",
                    upcoming.size(), medVisits.size());
        }
    }

    public String buildAppointmentReminderText(Appointment apt) {
        String timeStr = apt.getScheduledStart() != null ? apt.getScheduledStart().format(TIME_FMT) : "sắp tới";
        String doctorName = apt.getDoctor() != null ? apt.getDoctor().getFullName() : "Bác sĩ";
        boolean isOnline = apt.getConsultationType() == ConsultationType.ONLINE;

        StringBuilder sb = new StringBuilder();
        sb.append("📅 NHẮC LỊCH KHÁM MEDIASSIST-AI\n");
        sb.append("Xin chào ").append(apt.getPatient().getFullName()).append(",\n");
        sb.append("• Mã lịch: ").append(apt.getAppointmentCode()).append("\n");
        sb.append("• Thời gian: ").append(timeStr).append("\n");
        sb.append("• Bác sĩ: ").append(doctorName).append("\n");
        if (isOnline) {
            sb.append("• Hình thức: Khám Online (Video Call)\n");
            sb.append("👉 Vui lòng vào phòng trước 5-10 phút để kiểm tra mic & camera.\n");
        } else {
            sb.append("• Hình thức: Khám trực tiếp");
            if (apt.getClinicRoom() != null && !apt.getClinicRoom().isBlank()) {
                sb.append(" tại ").append(apt.getClinicRoom());
            }
            sb.append("\n👉 Vui lòng có mặt trước 15 phút và mang theo phiếu xét nghiệm cũ (nếu có).\n");
        }
        sb.append("🔗 Chi tiết lịch hẹn: ").append(clientBaseUrl).append("/patient/dashboard");
        return sb.toString();
    }

    public String buildMedicationReminderText(Appointment apt) {
        List<String> items = parsePrescriptionItems(apt.getPrescriptionJson());
        if (items.isEmpty()) {
            return null;
        }
        String doctorName = apt.getDoctor() != null ? apt.getDoctor().getFullName() : "Bác sĩ điều trị";
        StringBuilder sb = new StringBuilder();
        sb.append("💊 NHẮC UỐNG THUỐC THEO ĐƠN BÁC SĨ\n");
        sb.append("Xin chào ").append(apt.getPatient().getFullName()).append(",\n");
        sb.append("Đây là đơn thuốc do ").append(doctorName).append(" đã kê (Mã ca: ").append(apt.getAppointmentCode()).append("):\n");
        for (int i = 0; i < Math.min(items.size(), 6); i++) {
            sb.append(i + 1).append(". ").append(items.get(i)).append("\n");
        }
        if (apt.getConsultationNotes() != null && !apt.getConsultationNotes().isBlank()) {
            sb.append("📝 Dặn dò bác sĩ: ").append(apt.getConsultationNotes()).append("\n");
        }
        sb.append("⚠️ Vui lòng uống đúng liều lượng bác sĩ đã kê. Nếu có dấu hiệu bất thường, hãy nhắn tin bác sĩ hoặc đặt tái khám tại: ")
                .append(clientBaseUrl).append("/patient/dashboard");
        return sb.toString();
    }

    private List<String> parsePrescriptionItems(String prescriptionJson) {
        List<String> lines = new ArrayList<>();
        if (prescriptionJson == null || prescriptionJson.isBlank()) {
            return lines;
        }
        try {
            JsonNode root = objectMapper.readTree(prescriptionJson);
            if (root.isArray()) {
                for (JsonNode node : root) {
                    String name = node.path("name").asText(node.path("medicineName").asText(""));
                    if (name.isBlank()) continue;
                    String dosage = node.path("dosage").asText("");
                    String freq = node.path("frequency").asText("");
                    String duration = node.path("duration").asText("");
                    StringBuilder item = new StringBuilder(name);
                    if (!dosage.isBlank()) item.append(" — ").append(dosage);
                    if (!freq.isBlank()) item.append(" (").append(freq).append(")");
                    if (!duration.isBlank()) item.append(" x ").append(duration);
                    lines.add(item.toString());
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse prescriptionJson for Zalo reminder: {}", e.getMessage());
        }
        return lines;
    }
}
