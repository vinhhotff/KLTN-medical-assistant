package com.mediassist;

import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorReviewDto;
import com.mediassist.dto.DoctorReviewRequest;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.DoctorReviewRepository;
import com.mediassist.service.DoctorReviewService;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.NotificationService;
import com.mediassist.service.TwoLayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorReviewServiceTest {

    @Mock
    private DoctorReviewRepository doctorReviewRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private DoctorProfileRepository doctorProfileRepository;

    @Mock
    private TwoLayerCacheService twoLayerCacheService;

    @Mock
    private DoctorSemanticSearchService doctorSemanticSearchService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogRepository auditLogRepository;

    private DoctorReviewService reviewService;

    private User patientUser;
    private User doctorUser;
    private DoctorProfile doctorProfile;
    private Appointment completedAppointment;
    private UUID appointmentId;

    @BeforeEach
    void setUp() {
        reviewService = new DoctorReviewService(
                doctorReviewRepository,
                appointmentRepository,
                doctorProfileRepository,
                twoLayerCacheService,
                doctorSemanticSearchService,
                notificationService,
                auditLogRepository
        );

        patientUser = new User();
        patientUser.setId(UUID.randomUUID());
        patientUser.setEmail("patient@mediassist.local");
        patientUser.setFullName("Nguyễn Văn Bình");

        doctorUser = new User();
        doctorUser.setId(UUID.randomUUID());
        doctorUser.setEmail("doctor@mediassist.local");
        doctorUser.setFullName("BS. Nguyễn Văn An");

        doctorProfile = new DoctorProfile();
        doctorProfile.setId(UUID.randomUUID());
        doctorProfile.setUser(doctorUser);
        doctorProfile.setRating(4.8);
        doctorProfile.setReviewCount(10);

        appointmentId = UUID.randomUUID();
        completedAppointment = new Appointment();
        completedAppointment.setId(appointmentId);
        completedAppointment.setAppointmentCode("AP-2026-TEST01");
        completedAppointment.setPatient(patientUser);
        completedAppointment.setDoctor(doctorUser);
        completedAppointment.setStatus(AppointmentStatus.COMPLETED);
        completedAppointment.setScheduledStart(LocalDateTime.now().minusDays(1));
        completedAppointment.setScheduledEnd(LocalDateTime.now().minusDays(1).plusMinutes(30));
        completedAppointment.setFeeAmount(BigDecimal.valueOf(350000));
    }

    @Test
    @DisplayName("submitReview successfully persists review, recalculates doctor rating, evicts cache, and notifies doctor")
    void testSubmitReview_Success() {
        DoctorReviewRequest request = new DoctorReviewRequest(5, "Bác sĩ rất tận tâm và giải thích cặn kẽ.", "Tận tâm, Chuyên môn cao");

        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(completedAppointment));
        when(doctorReviewRepository.existsByAppointmentId(appointmentId)).thenReturn(false);
        when(doctorReviewRepository.save(any(DoctorReview.class))).thenAnswer(invocation -> {
            DoctorReview r = invocation.getArgument(0);
            r.setId(UUID.randomUUID());
            r.setCreatedAt(LocalDateTime.now());
            return r;
        });

        when(doctorProfileRepository.findByUserId(doctorUser.getId())).thenReturn(Optional.of(doctorProfile));
        when(doctorReviewRepository.calculateAverageRatingByDoctorId(doctorUser.getId())).thenReturn(4.95);
        when(doctorReviewRepository.countByDoctorId(doctorUser.getId())).thenReturn(11L);

        DoctorReviewDto dto = reviewService.submitReview(appointmentId, patientUser.getId(), request);

        assertNotNull(dto);
        assertEquals(5, dto.getRating());
        assertEquals("Bác sĩ rất tận tâm và giải thích cặn kẽ.", dto.getComment());
        assertEquals("Tận tâm, Chuyên môn cao", dto.getTags());
        assertEquals("Nguyễn V. Bình", dto.getPatientName(), "Patient name must be anonymized for privacy");
        assertEquals("AP-2026-TEST01", dto.getAppointmentCode());

        // Verify doctor profile stats recalculated
        assertEquals(4.95, doctorProfile.getRating());
        assertEquals(11, doctorProfile.getReviewCount());
        verify(doctorProfileRepository).save(doctorProfile);

        // Verify cache evictions
        verify(twoLayerCacheService).evict("doctors:verified");
        verify(twoLayerCacheService).evict("doctors:" + doctorUser.getId());
        verify(doctorSemanticSearchService).invalidateCache();

        // Verify notification sent to doctor
        verify(notificationService).sendNotification(eq(doctorUser.getId()), eq("APPOINTMENT_REVIEW"), contains("5/5 Sao"), anyString(), anyString());

        // Verify audit log
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("submitReview throws 404 when appointment does not exist")
    void testSubmitReview_AppointmentNotFound() {
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () ->
                reviewService.submitReview(appointmentId, patientUser.getId(), new DoctorReviewRequest(5, "Tốt", "Tận tâm"))
        );
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        assertEquals("APPOINTMENT_NOT_FOUND", ex.getCode());
    }

    @Test
    @DisplayName("submitReview throws 403 when user is not the appointment's patient")
    void testSubmitReview_Forbidden_NotAppointmentPatient() {
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(completedAppointment));
        UUID differentUserId = UUID.randomUUID();

        AppException ex = assertThrows(AppException.class, () ->
                reviewService.submitReview(appointmentId, differentUserId, new DoctorReviewRequest(5, "Tốt", "Tận tâm"))
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
    }

    @Test
    @DisplayName("submitReview throws 400 when appointment is not COMPLETED")
    void testSubmitReview_NotCompleted_ThrowsBadRequest() {
        completedAppointment.setStatus(AppointmentStatus.SCHEDULED);
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(completedAppointment));

        AppException ex = assertThrows(AppException.class, () ->
                reviewService.submitReview(appointmentId, patientUser.getId(), new DoctorReviewRequest(5, "Tốt", "Tận tâm"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("APPOINTMENT_NOT_COMPLETED", ex.getCode());
    }

    @Test
    @DisplayName("submitReview throws 409 when appointment already has a review")
    void testSubmitReview_AlreadyReviewed_ThrowsConflict() {
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(completedAppointment));
        when(doctorReviewRepository.existsByAppointmentId(appointmentId)).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () ->
                reviewService.submitReview(appointmentId, patientUser.getId(), new DoctorReviewRequest(5, "Tốt", "Tận tâm"))
        );
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("REVIEW_ALREADY_EXISTS", ex.getCode());
    }

    @Test
    @DisplayName("submitReview throws 400 when rating is less than 1 or greater than 5")
    void testSubmitReview_InvalidRating_ThrowsBadRequest() {
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(completedAppointment));
        when(doctorReviewRepository.existsByAppointmentId(appointmentId)).thenReturn(false);

        AppException ex1 = assertThrows(AppException.class, () ->
                reviewService.submitReview(appointmentId, patientUser.getId(), new DoctorReviewRequest(0, "Quá tệ", "Không hài lòng"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex1.getStatus());
        assertEquals("INVALID_RATING", ex1.getCode());

        AppException ex2 = assertThrows(AppException.class, () ->
                reviewService.submitReview(appointmentId, patientUser.getId(), new DoctorReviewRequest(6, "Quá đỉnh", "Tuyệt vời"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex2.getStatus());
        assertEquals("INVALID_RATING", ex2.getCode());
    }

    @Test
    @DisplayName("getReviewsForDoctor returns list with anonymized patient names")
    void testGetReviewsForDoctor_Success() {
        DoctorReview r = new DoctorReview(completedAppointment, doctorUser, patientUser, 5, "Bác sĩ giỏi", "Chuyên môn cao");
        r.setId(UUID.randomUUID());
        r.setCreatedAt(LocalDateTime.now());

        when(doctorReviewRepository.findByDoctorIdWithPatient(doctorUser.getId())).thenReturn(List.of(r));

        List<DoctorReviewDto> list = reviewService.getReviewsForDoctor(doctorUser.getId());
        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("Nguyễn V. Bình", list.get(0).getPatientName());
        assertEquals(5, list.get(0).getRating());
    }
}
