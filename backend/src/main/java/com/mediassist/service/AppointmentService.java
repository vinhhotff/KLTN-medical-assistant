package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.ClinicalEncounterRequest;
import com.mediassist.dto.CreateAppointmentRequest;
import com.mediassist.dto.RescheduleAppointmentRequest;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentService.class);

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final AuditLogRepository auditLogRepository;
    private final TwoLayerCacheService cacheService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private MedicalDocumentRepository medicalDocumentRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.mediassist.repository.TriageSessionRepository triageSessionRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.mediassist.repository.PaymentTransactionRepository paymentTransactionRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              UserRepository userRepository,
                              DoctorProfileRepository doctorProfileRepository,
                              AuditLogRepository auditLogRepository,
                              TwoLayerCacheService cacheService) {
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.auditLogRepository = auditLogRepository;
        this.cacheService = cacheService;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public AppointmentDto bookAppointment(UUID patientId, CreateAppointmentRequest request) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bệnh nhân không tồn tại"));

        User doctor = userRepository.findById(request.getDoctorId())
                .or(() -> doctorProfileRepository.findById(request.getDoctorId()).map(DoctorProfile::getUser))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bác sĩ không tồn tại"));

        if (doctor.getRole() != Role.DOCTOR) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Người dùng được chỉ định không phải bác sĩ");
        }

        if (doctor.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "DOCTOR_NOT_ACTIVE", "Bác sĩ này hiện đang tạm ngưng hoạt động trên hệ thống");
        }

        DoctorProfile doctorProfile = doctorProfileRepository.findByUserId(doctor.getId())
                .or(() -> doctorProfileRepository.findById(request.getDoctorId()))
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "NO_DOCTOR_PROFILE", "Bác sĩ chưa có hồ sơ chuyên môn"));

        if (!doctorProfile.isVerified()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "DOCTOR_NOT_VERIFIED", "Bác sĩ này chưa được xác minh chứng chỉ hành nghề. Vui lòng chọn bác sĩ đã được phê duyệt.");
        }

        LocalDateTime scheduledStart = request.getScheduledStart();
        if (scheduledStart.isBefore(LocalDateTime.now().plusMinutes(5))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Thời gian hẹn khám phải lớn hơn thời điểm hiện tại");
        }

        // Validate Working Hours: 08:00 - 12:00, 13:30 - 17:00, not Sunday
        if (scheduledStart.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_DAY", "Bệnh viện không tiếp nhận lịch hẹn vào Chủ Nhật.");
        }
        java.time.LocalTime slotTime = scheduledStart.toLocalTime();
        boolean isMorning = !slotTime.isBefore(java.time.LocalTime.of(8, 0)) && slotTime.isBefore(java.time.LocalTime.of(12, 0));
        boolean isAfternoon = !slotTime.isBefore(java.time.LocalTime.of(13, 30)) && slotTime.isBefore(java.time.LocalTime.of(17, 0));
        if (!isMorning && !isAfternoon) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_TIME", "Khung giờ khám hợp lệ là 08:00-12:00 và 13:30-17:00.");
        }

        // Concurrency Guard: Check if slot is already booked
        if (appointmentRepository.existsConflict(doctor.getId(), scheduledStart)) {
            log.warn("🚨 Conflict detected: Doctor {} already booked at {}", doctor.getId(), scheduledStart);
            throw new AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác.");
        }

        LocalDateTime scheduledEnd = scheduledStart.plusMinutes(30);

        // Fetch doctor consultation fee
        BigDecimal fee = doctorProfile.getConsultationFee() != null
                ? doctorProfile.getConsultationFee()
                : BigDecimal.valueOf(300000.00);

        // Generate Appointment Code: AP-YYYYMMDD-XXXXXX
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String appointmentCode = "AP-" + datePrefix + "-" + randomSuffix;

        Appointment appointment = Appointment.builder()
                .appointmentCode(appointmentCode)
                .patient(patient)
                .doctor(doctor)
                .scheduledStart(scheduledStart)
                .scheduledEnd(scheduledEnd)
                .status(AppointmentStatus.SCHEDULED)
                .feeAmount(fee)
                .paymentStatus(PaymentStatus.UNPAID)
                .consultationNotes(request.getNotes())
                .build();
        if (request.getMedicalDocumentId() != null) {
            appointment.setMedicalDocumentId(request.getMedicalDocumentId());
        }
        if (request.getTriageSessionId() != null) {
            appointment.setTriageSessionId(request.getTriageSessionId());
        }

        // Sequential Queue Number per Doctor per Day
        LocalDate apptDate = scheduledStart.toLocalDate();
        long activeCountToday = appointmentRepository.countActiveAppointmentsByDoctorAndDateRange(
                doctor.getId(), apptDate.atStartOfDay(), apptDate.atTime(23, 59, 59));
        appointment.setQueueNumber("STT " + String.format("%02d", activeCountToday + 1));

        String room = (doctorProfile.getDepartment() != null && !doctorProfile.getDepartment().isBlank())
                ? "Phòng Khám - " + doctorProfile.getDepartment().trim()
                : "Phòng Khám 204 - Khoa Chuyên Môn";
        appointment.setClinicRoom(room);
        appointment.setChiefComplaint(request.getNotes() != null && !request.getNotes().isBlank() ? request.getNotes() : "Đăng ký khám tư vấn chuyên khoa");

        Appointment saved;
        try {
            saved = appointmentRepository.saveAndFlush(appointment);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            log.warn("🚨 [CONCURRENCY RACE DETECTED] Doctor {} slot at {} was concurrently claimed: {}", doctor.getId(), scheduledStart, ex.getMessage());
            throw new AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác.");
        }

        // Record Audit Log
        AuditLog audit = new AuditLog();
        audit.setUserId(patientId);
        audit.setAction("APPOINTMENT_BOOKED");
        audit.setResource("appointments/" + saved.getId());
        audit.setMetadata("Code: " + appointmentCode + ", Doctor: " + doctor.getFullName());
        auditLogRepository.save(audit);

        log.info("✅ Appointment booked: {} for patient {} with doctor {}", appointmentCode, patient.getEmail(), doctor.getEmail());
        return toDto(saved);
    }

    public List<AppointmentDto> getMyAppointments(UUID userId, Role role) {
        List<Appointment> list;
        if (role == Role.DOCTOR) {
            list = appointmentRepository.findByDoctorIdWithUsersOrderByScheduledStartDesc(userId);
        } else {
            list = appointmentRepository.findByPatientIdWithUsersOrderByScheduledStartDesc(userId);
        }
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public AppointmentDto updateAppointmentStatus(UUID appointmentId, UUID userId, Role role, AppointmentStatus newStatus, String notes) {
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .or(() -> appointmentRepository.findById(appointmentId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông tin cuộc hẹn"));

        // Authorization check
        boolean isDoctor = appointment.getDoctor().getId().equals(userId);
        boolean isPatient = appointment.getPatient().getId().equals(userId);
        boolean isAdmin = role == Role.ADMIN;

        if (!isDoctor && !isPatient && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền cập nhật cuộc hẹn này");
        }

        // State Machine validation
        AppointmentStatus currentStatus = appointment.getStatus();
        java.util.Map<AppointmentStatus, java.util.Set<AppointmentStatus>> validTransitions = java.util.Map.of(
                AppointmentStatus.SCHEDULED, java.util.Set.of(AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW),
                AppointmentStatus.IN_PROGRESS, java.util.Set.of(AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED),
                AppointmentStatus.COMPLETED, java.util.Set.of(),
                AppointmentStatus.CANCELLED, java.util.Set.of(),
                AppointmentStatus.NO_SHOW, java.util.Set.of()
        );
        java.util.Set<AppointmentStatus> allowed = validTransitions.getOrDefault(currentStatus, java.util.Set.of());
        if (!allowed.contains(newStatus)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION",
                    String.format("Không thể chuyển trạng thái từ %s sang %s.", currentStatus, newStatus));
        }

        // Patient can only cancel
        if (isPatient && !isDoctor && !isAdmin) {
            if (newStatus != AppointmentStatus.CANCELLED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Bệnh nhân chỉ có thể hủy lịch hẹn");
            }
            if (currentStatus == AppointmentStatus.IN_PROGRESS) {
                throw new AppException(HttpStatus.FORBIDDEN, "CANNOT_CANCEL_IN_PROGRESS", "Không thể hủy ca khám đang diễn ra. Vui lòng liên hệ bác sĩ.");
            }
            appointment.setCancellationReason(notes);
        }

        if (isDoctor || isAdmin) {
            if (newStatus == AppointmentStatus.CANCELLED) {
                appointment.setCancellationReason(notes);
            } else if (newStatus == AppointmentStatus.COMPLETED) {
                appointment.setConsultationNotes(notes);
            }
        }

        // Auto-refund when cancelled and paid
        if (newStatus == AppointmentStatus.CANCELLED && appointment.getPaymentStatus() == PaymentStatus.PAID) {
            try {
                if (paymentTransactionRepository != null) {
                    paymentTransactionRepository
                            .findFirstByReferenceIdAndStatus(appointment.getId().toString(), TransactionStatus.COMPLETED)
                            .ifPresent(tx -> {
                                tx.setStatus(TransactionStatus.REFUNDED);
                                paymentTransactionRepository.save(tx);
                            });
                }
                appointment.setPaymentStatus(PaymentStatus.REFUNDED);
                log.info("💸 [AUTO-REFUND] Appointment {} refunded due to cancellation", appointment.getAppointmentCode());
            } catch (Exception e) {
                log.warn("Refund trigger warning for appointment {}: {}", appointment.getAppointmentCode(), e.getMessage());
            }
        }

        appointment.setStatus(newStatus);
        Appointment updated = appointmentRepository.save(appointment);

        log.info("ℹ️ Appointment {} status updated to {} by user {}", appointment.getAppointmentCode(), newStatus, userId);
        return toDto(updated);
    }

    @Transactional
    public AppointmentDto completeClinicalEncounter(UUID appointmentId, UUID doctorUserId, ClinicalEncounterRequest req) {
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .or(() -> appointmentRepository.findById(appointmentId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông tin cuộc hẹn"));

        if (!appointment.getDoctor().getId().equals(doctorUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Chỉ bác sĩ phụ trách mới có quyền hoàn thành ca khám lâm sàng này");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        if (req.getChiefComplaint() != null && !req.getChiefComplaint().isBlank()) {
            appointment.setChiefComplaint(req.getChiefComplaint().trim());
        }
        if (req.getVitalSignsJson() != null && !req.getVitalSignsJson().isBlank()) {
            appointment.setVitalSignsJson(req.getVitalSignsJson().trim());
        }
        if (req.getIcd10Code() != null && !req.getIcd10Code().isBlank()) {
            appointment.setIcd10Code(req.getIcd10Code().trim());
        }
        if (req.getIcd10Name() != null && !req.getIcd10Name().isBlank()) {
            appointment.setIcd10Name(req.getIcd10Name().trim());
        }
        if (req.getPrescriptionJson() != null && !req.getPrescriptionJson().isBlank()) {
            appointment.setPrescriptionJson(req.getPrescriptionJson().trim());
        }
        if (req.getTreatmentPlan() != null && !req.getTreatmentPlan().isBlank()) {
            appointment.setTreatmentPlan(req.getTreatmentPlan().trim());
        }
        if (req.getConsultationNotes() != null && !req.getConsultationNotes().isBlank()) {
            appointment.setConsultationNotes(req.getConsultationNotes().trim());
        }
        if (req.getFollowUpDate() != null) {
            appointment.setFollowUpDate(req.getFollowUpDate());
        }
        if (req.getClinicRoom() != null && !req.getClinicRoom().isBlank()) {
            appointment.setClinicRoom(req.getClinicRoom().trim());
        }

        Appointment saved = appointmentRepository.save(appointment);

        // Record Audit Log
        AuditLog audit = new AuditLog();
        audit.setUserId(doctorUserId);
        audit.setAction("CLINICAL_ENCOUNTER_COMPLETED");
        audit.setResource("appointments/" + saved.getId());
        audit.setMetadata("ICD10: " + saved.getIcd10Code() + " - " + saved.getIcd10Name() + ", Code: " + saved.getAppointmentCode());
        auditLogRepository.save(audit);

        log.info("🩺 Clinical encounter completed: {} with ICD-10: {}", saved.getAppointmentCode(), saved.getIcd10Code());
        return toDto(saved);
    }

    /**
     * Lấy toàn bộ lịch sử các ca khám của bệnh nhân (dành cho bác sĩ / admin hội chẩn).
     */
    @Transactional(readOnly = true)
    public List<AppointmentDto> getPatientAppointmentHistory(UUID patientId) {
        List<Appointment> list = appointmentRepository.findByPatientIdWithUsersOrderByScheduledStartDesc(patientId);
        if (list == null || list.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Bác sĩ trực tiếp đặt lịch hẹn tái khám cho bệnh nhân ngay từ trạm khám lâm sàng.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public AppointmentDto createFollowUpAppointment(UUID doctorUserId, com.mediassist.dto.FollowUpAppointmentRequest req) {
        User patient = userRepository.findById(req.getPatientId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bệnh nhân không tồn tại"));

        User doctor = userRepository.findById(doctorUserId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bác sĩ không tồn tại"));

        if (doctor.getRole() != Role.DOCTOR) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Người dùng không phải bác sĩ");
        }

        LocalDateTime scheduledStart = req.getScheduledStart();
        if (scheduledStart.isBefore(LocalDateTime.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Thời gian hẹn tái khám phải lớn hơn thời điểm hiện tại");
        }

        if (appointmentRepository.existsConflict(doctor.getId(), scheduledStart)) {
            throw new AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này bác sĩ đã có lịch hẹn. Vui lòng chọn khung giờ khác.");
        }

        LocalDateTime scheduledEnd = scheduledStart.plusMinutes(30);

        BigDecimal fee = doctorProfileRepository.findByUserId(doctor.getId())
                .map(DoctorProfile::getConsultationFee)
                .orElse(BigDecimal.valueOf(300000.00));

        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String appointmentCode = "AP-TK-" + datePrefix + "-" + randomSuffix;

        Appointment appointment = Appointment.builder()
                .appointmentCode(appointmentCode)
                .patient(patient)
                .doctor(doctor)
                .scheduledStart(scheduledStart)
                .scheduledEnd(scheduledEnd)
                .status(AppointmentStatus.SCHEDULED)
                .feeAmount(fee)
                .paymentStatus(PaymentStatus.UNPAID)
                .consultationNotes(req.getNotes() != null && !req.getNotes().isBlank() ? req.getNotes().trim() : "Lịch hẹn tái khám theo chỉ định bác sĩ")
                .build();
        appointment.setQueueNumber("TK " + String.format("%02d", (int)(Math.random() * 20 + 1)));
        appointment.setClinicRoom(req.getClinicRoom() != null && !req.getClinicRoom().isBlank() ? req.getClinicRoom().trim() : "Phòng Khám Chuyên Khoa");
        appointment.setChiefComplaint(req.getNotes() != null && !req.getNotes().isBlank() ? req.getNotes().trim() : "Tái khám theo hẹn bác sĩ");

        Appointment saved;
        try {
            saved = appointmentRepository.saveAndFlush(appointment);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            throw new AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này đã có ca khám khác được đặt.");
        }

        AuditLog audit = new AuditLog();
        audit.setUserId(doctorUserId);
        audit.setAction("FOLLOW_UP_APPOINTMENT_CREATED");
        audit.setResource("appointments/" + saved.getId());
        audit.setMetadata("Follow-up: " + appointmentCode + " for patient " + patient.getEmail());
        auditLogRepository.save(audit);

        log.info("🩺 Doctor {} scheduled follow-up: {} for patient {}", doctor.getEmail(), appointmentCode, patient.getEmail());
        return toDto(saved);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public AppointmentDto rescheduleAppointment(UUID appointmentId, UUID userId, Role role, RescheduleAppointmentRequest req) {
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .or(() -> appointmentRepository.findById(appointmentId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông tin cuộc hẹn"));

        boolean isDoctor = appointment.getDoctor().getId().equals(userId);
        boolean isPatient = appointment.getPatient().getId().equals(userId);
        boolean isAdmin = role == Role.ADMIN;

        if (!isDoctor && !isPatient && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền đổi lịch hẹn này");
        }

        if (appointment.getStatus() != AppointmentStatus.SCHEDULED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "CANNOT_RESCHEDULE", "Chỉ có thể đổi lịch cho các cuộc hẹn đang ở trạng thái Đã Đặt (SCHEDULED)");
        }

        LocalDateTime newStart = req.getNewScheduledStart();
        if (newStart.isBefore(LocalDateTime.now().plusMinutes(5))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Thời gian hẹn mới phải lớn hơn thời điểm hiện tại");
        }

        if (newStart.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_DAY", "Bệnh viện không tiếp nhận lịch hẹn vào Chủ Nhật.");
        }
        java.time.LocalTime slotTime = newStart.toLocalTime();
        boolean isMorning = !slotTime.isBefore(java.time.LocalTime.of(8, 0)) && slotTime.isBefore(java.time.LocalTime.of(12, 0));
        boolean isAfternoon = !slotTime.isBefore(java.time.LocalTime.of(13, 30)) && slotTime.isBefore(java.time.LocalTime.of(17, 0));
        if (!isMorning && !isAfternoon) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_TIME", "Khung giờ khám hợp lệ là 08:00-12:00 và 13:30-17:00.");
        }

        if (appointmentRepository.existsConflictExcluding(appointment.getDoctor().getId(), newStart, appointment.getId())) {
            throw new AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ mới này đã có bệnh nhân khác đặt trước. Vui lòng chọn khung giờ khác.");
        }

        appointment.setScheduledStart(newStart);
        appointment.setScheduledEnd(newStart.plusMinutes(30));

        LocalDate apptDate = newStart.toLocalDate();
        long activeCountToday = appointmentRepository.countActiveAppointmentsByDoctorAndDateRange(
                appointment.getDoctor().getId(), apptDate.atStartOfDay(), apptDate.atTime(23, 59, 59));
        appointment.setQueueNumber("STT " + String.format("%02d", activeCountToday + 1));

        if (req.getReason() != null && !req.getReason().isBlank()) {
            String note = (appointment.getConsultationNotes() != null ? appointment.getConsultationNotes() + " | " : "")
                    + "[Đổi Lịch]: " + req.getReason().trim();
            appointment.setConsultationNotes(note);
        }

        Appointment saved = appointmentRepository.save(appointment);

        AuditLog audit = new AuditLog();
        audit.setUserId(userId);
        audit.setAction("APPOINTMENT_RESCHEDULED");
        audit.setResource("appointments/" + saved.getId());
        audit.setMetadata("Rescheduled: " + saved.getAppointmentCode() + " to " + newStart);
        auditLogRepository.save(audit);

        log.info("🗓️ Appointment {} rescheduled to {} by user {}", saved.getAppointmentCode(), newStart, userId);
        return toDto(saved);
    }

    private AppointmentDto toDto(Appointment a) {
        if (a == null) return null;
        AppointmentDto dto = AppointmentDto.fromEntity(a);
        if (a.getMedicalDocumentId() != null && medicalDocumentRepository != null) {
            try {
                medicalDocumentRepository.findById(a.getMedicalDocumentId())
                        .ifPresent(doc -> dto.setMedicalDocumentFileName(doc.getFileName()));
            } catch (Exception ignored) {}
        }
        if (a.getTriageSessionId() != null && triageSessionRepository != null) {
            try {
                triageSessionRepository.findById(a.getTriageSessionId()).ifPresent(session -> {
                    dto.setTriageSbarSummary(session.getSbarSummary());
                    if (session.getUrgencyLevel() != null) {
                        dto.setTriageUrgencyLevel(session.getUrgencyLevel().name());
                    }
                });
            } catch (Exception ignored) {}
        }
        return dto;
    }
}
