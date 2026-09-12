package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.ClinicalEncounterRequest;
import com.mediassist.dto.CreateAppointmentRequest;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
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

        LocalDateTime scheduledStart = request.getScheduledStart();
        if (scheduledStart.isBefore(LocalDateTime.now().plusMinutes(5))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Thời gian hẹn khám phải lớn hơn thời điểm hiện tại");
        }

        // Concurrency Guard: Check if slot is already booked
        if (appointmentRepository.existsConflict(doctor.getId(), scheduledStart)) {
            log.warn("🚨 Conflict detected: Doctor {} already booked at {}", doctor.getId(), scheduledStart);
            throw new AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác.");
        }

        LocalDateTime scheduledEnd = scheduledStart.plusMinutes(30);

        // Fetch doctor consultation fee
        BigDecimal fee = doctorProfileRepository.findByUserId(doctor.getId())
                .map(DoctorProfile::getConsultationFee)
                .orElse(BigDecimal.valueOf(300000.00));

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
        appointment.setQueueNumber("STT " + String.format("%02d", (int)(Math.random() * 25 + 1)));
        appointment.setClinicRoom("Phòng Khám 204 - Khoa Chuyên Môn");
        appointment.setChiefComplaint(request.getNotes() != null && !request.getNotes().isBlank() ? request.getNotes() : "Đăng ký khám tư vấn chuyên khoa");

        Appointment saved = appointmentRepository.save(appointment);

        // Record Audit Log
        AuditLog audit = new AuditLog();
        audit.setUserId(patientId);
        audit.setAction("APPOINTMENT_BOOKED");
        audit.setResource("appointments/" + saved.getId());
        audit.setMetadata("Code: " + appointmentCode + ", Doctor: " + doctor.getFullName());
        auditLogRepository.save(audit);

        log.info("✅ Appointment booked: {} for patient {} with doctor {}", appointmentCode, patient.getEmail(), doctor.getEmail());
        return AppointmentDto.fromEntity(saved);
    }

    public List<AppointmentDto> getMyAppointments(UUID userId, Role role) {
        List<Appointment> list;
        if (role == Role.DOCTOR) {
            list = appointmentRepository.findByDoctorIdOrderByScheduledStartDesc(userId);
        } else {
            list = appointmentRepository.findByPatientIdOrderByScheduledStartDesc(userId);
        }
        return list.stream().map(AppointmentDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public AppointmentDto updateAppointmentStatus(UUID appointmentId, UUID userId, Role role, AppointmentStatus newStatus, String notes) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông tin cuộc hẹn"));

        // Authorization check
        boolean isDoctor = appointment.getDoctor().getId().equals(userId);
        boolean isPatient = appointment.getPatient().getId().equals(userId);
        boolean isAdmin = role == Role.ADMIN;

        if (!isDoctor && !isPatient && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền cập nhật cuộc hẹn này");
        }

        // Patient can only cancel
        if (isPatient && !isDoctor && !isAdmin) {
            if (newStatus != AppointmentStatus.CANCELLED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Bệnh nhân chỉ có thể hủy lịch hẹn");
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

        appointment.setStatus(newStatus);
        Appointment updated = appointmentRepository.save(appointment);

        log.info("ℹ️ Appointment {} status updated to {} by user {}", appointment.getAppointmentCode(), newStatus, userId);
        return AppointmentDto.fromEntity(updated);
    }

    @Transactional
    public AppointmentDto completeClinicalEncounter(UUID appointmentId, UUID doctorUserId, ClinicalEncounterRequest req) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
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
        return AppointmentDto.fromEntity(saved);
    }
}
