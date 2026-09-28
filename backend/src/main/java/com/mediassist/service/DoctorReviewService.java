package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorReviewDto;
import com.mediassist.dto.DoctorReviewRequest;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.DoctorReviewRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DoctorReviewService {

    private static final Logger log = LoggerFactory.getLogger(DoctorReviewService.class);

    private final DoctorReviewRepository doctorReviewRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final TwoLayerCacheService twoLayerCacheService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;

    public DoctorReviewService(DoctorReviewRepository doctorReviewRepository,
                               AppointmentRepository appointmentRepository,
                               DoctorProfileRepository doctorProfileRepository,
                               TwoLayerCacheService twoLayerCacheService,
                               DoctorSemanticSearchService doctorSemanticSearchService,
                               NotificationService notificationService,
                               AuditLogRepository auditLogRepository) {
        this.doctorReviewRepository = doctorReviewRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.twoLayerCacheService = twoLayerCacheService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.notificationService = notificationService;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Submits a patient review and rating for a COMPLETED appointment.
     * Enforces ownership, appointment status, single-review constraint,
     * recalculates doctor rating, invalidates caches, and dispatches notification.
     */
    @Transactional
    public DoctorReviewDto submitReview(UUID appointmentId, UUID patientUserId, DoctorReviewRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "APPOINTMENT_NOT_FOUND", "Không tìm thấy lịch hẹn."));

        // 1. Enforce patient ownership
        if (appointment.getPatient() == null || !appointment.getPatient().getId().equals(patientUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền đánh giá lịch hẹn này.");
        }

        // 2. Enforce appointment status
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "APPOINTMENT_NOT_COMPLETED", "Chỉ có thể đánh giá ca khám đã hoàn tất.");
        }

        // 3. Enforce single review constraint per appointment
        if (doctorReviewRepository.existsByAppointmentId(appointmentId)) {
            throw new AppException(HttpStatus.CONFLICT, "REVIEW_ALREADY_EXISTS", "Bạn đã gửi đánh giá cho ca khám này rồi.");
        }

        // 4. Validate rating
        int rating = request.getRating() != null ? request.getRating() : 5;
        if (rating < 1 || rating > 5) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_RATING", "Điểm đánh giá phải từ 1 đến 5 sao.");
        }

        User doctor = appointment.getDoctor();
        User patient = appointment.getPatient();

        // 5. Create and persist review
        DoctorReview review = new DoctorReview(appointment, doctor, patient, rating, request.getComment(), request.getTags());
        review = doctorReviewRepository.save(review);
        log.info("⭐ [DOCTOR REVIEW] Patient {} reviewed Doctor {} with {} stars for appointment {}",
                patient.getEmail(), doctor.getEmail(), rating, appointment.getAppointmentCode());

        // 6. Recalculate doctor profile statistics (average rating & review count)
        UUID doctorUserId = doctor.getId();
        Optional<DoctorProfile> profileOpt = doctorProfileRepository.findByUserId(doctorUserId);
        if (profileOpt.isPresent()) {
            DoctorProfile profile = profileOpt.get();
            Double avgRating = doctorReviewRepository.calculateAverageRatingByDoctorId(doctorUserId);
            long reviewCount = doctorReviewRepository.countByDoctorId(doctorUserId);

            if (avgRating != null) {
                double roundedAvg = Math.round(avgRating * 100.0) / 100.0;
                profile.setRating(roundedAvg);
            }
            profile.setReviewCount((int) reviewCount);
            doctorProfileRepository.save(profile);
            log.info("📊 Updated DoctorProfile ID: {} -> New Rating: {}, Review Count: {}",
                    profile.getId(), profile.getRating(), profile.getReviewCount());
        }

        // 7. Evict Two-Layer Cache and WHRF In-Memory Search Cache
        twoLayerCacheService.evict("doctors:verified");
        twoLayerCacheService.evict("doctors:" + doctorUserId);
        doctorSemanticSearchService.invalidateCache();

        // 8. Dispatch notification to doctor
        String notifMsg = String.format("Bệnh nhân %s vừa đánh giá %d sao cho ca khám %s%s",
                patient.getFullName(),
                rating,
                appointment.getAppointmentCode(),
                (request.getComment() != null && !request.getComment().isBlank()) ? ": \"" + request.getComment() + "\"" : ".");
        notificationService.sendNotification(doctorUserId, "APPOINTMENT_REVIEW", "Đánh Giá Mới ⭐ " + rating + "/5 Sao", notifMsg, "{\"appointmentId\":\"" + appointmentId + "\"}");

        // 9. Record HIPAA/NĐ 13 compliant audit log
        AuditLog audit = new AuditLog();
        audit.setUserId(patientUserId);
        audit.setAction("SUBMIT_DOCTOR_REVIEW");
        audit.setResource("doctor_reviews/" + review.getId());
        audit.setMetadata("{\"appointmentCode\":\"" + appointment.getAppointmentCode() + "\",\"rating\":" + rating + ",\"doctorId\":\"" + doctorUserId + "\"}");
        auditLogRepository.save(audit);

        return DoctorReviewDto.fromEntity(review);
    }

    /**
     * Gets review associated with a specific appointment.
     */
    @Transactional(readOnly = true)
    public DoctorReviewDto getReviewByAppointmentId(UUID appointmentId) {
        return doctorReviewRepository.findByAppointmentId(appointmentId)
                .map(DoctorReviewDto::fromEntity)
                .orElse(null);
    }

    /**
     * Gets all reviews for a specific doctor with patient names anonymized.
     */
    @Transactional(readOnly = true)
    public List<DoctorReviewDto> getReviewsForDoctor(UUID doctorUserId) {
        return doctorReviewRepository.findByDoctorIdWithPatient(doctorUserId)
                .stream()
                .map(DoctorReviewDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Gets all reviews submitted by the current patient.
     */
    @Transactional(readOnly = true)
    public List<DoctorReviewDto> getMyReviews(UUID patientUserId) {
        return doctorReviewRepository.findByPatientIdOrderByCreatedAtDesc(patientUserId)
                .stream()
                .map(DoctorReviewDto::fromEntity)
                .collect(Collectors.toList());
    }
}
