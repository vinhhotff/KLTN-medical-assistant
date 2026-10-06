package com.mediassist;

import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.CreateAppointmentRequest;
import com.mediassist.dto.RescheduleAppointmentRequest;
import com.mediassist.event.AppointmentBookedEvent;
import com.mediassist.event.AppointmentCancelledEvent;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.PaymentTransactionRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.AppointmentRefundService;
import com.mediassist.service.AppointmentService;
import com.mediassist.service.TwoLayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DoctorProfileRepository doctorProfileRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private TwoLayerCacheService cacheService;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private AppointmentService appointmentService;

    private UUID patientId;
    private UUID doctorId;
    private User patientUser;
    private User doctorUser;
    private DoctorProfile doctorProfile;

    @BeforeEach
    void setUp() {
        appointmentService = new AppointmentService(
                appointmentRepository,
                userRepository,
                doctorProfileRepository,
                auditLogRepository,
                cacheService,
                new AppointmentRefundService(paymentTransactionRepository),
                eventPublisher
        );

        patientId = UUID.randomUUID();
        doctorId = UUID.randomUUID();

        patientUser = User.builder()
                .id(patientId)
                .email("patient@mediassist.local")
                .fullName("Trần Thị Bình")
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .emailVerified(true)
                .build();

        doctorUser = User.builder()
                .id(doctorId)
                .email("doctor@mediassist.local")
                .fullName("BS. Nguyễn Văn An")
                .role(Role.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build();

        doctorProfile = new DoctorProfile();
        doctorProfile.setUser(doctorUser);
        doctorProfile.setVerified(true);
        doctorProfile.setConsultationFee(new BigDecimal("350000.00"));
    }

    private LocalDateTime getNextWeekdaySlot(int plusDays, int hour, int minute) {
        LocalDate date = LocalDate.now().plusDays(plusDays);
        while (date.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date.atTime(hour, minute);
    }

    @Test
    void testBookAppointment_Success() {
        LocalDateTime futureTime = getNextWeekdaySlot(2, 9, 0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám kiểm tra đau ngực");

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(false);
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));

        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        AppointmentDto result = appointmentService.bookAppointment(patientId, request);

        assertNotNull(result);
        assertNotNull(result.getAppointmentCode());
        assertTrue(result.getAppointmentCode().startsWith("AP-"));
        assertEquals(AppointmentStatus.SCHEDULED, result.getStatus());
        assertEquals(doctorUser.getFullName(), result.getDoctorName());
        assertEquals(patientUser.getFullName(), result.getPatientName());
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    void testBookAppointment_SlotConflict_ThrowsException() {
        LocalDateTime futureTime = getNextWeekdaySlot(1, 10, 0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám tổng quát");

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> appointmentService.bookAppointment(patientId, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("SLOT_CONFLICT", ex.getCode());
        verify(appointmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void testBookAppointment_ConcurrentSlotCollision_DataIntegrityViolation_ThrowsSlotConflict() {
        LocalDateTime futureTime = getNextWeekdaySlot(1, 14, 0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám chuyên khoa");

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(false);
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));

        // Simulate concurrent transaction committing first and triggering DB unique index violation
        when(appointmentRepository.saveAndFlush(any(Appointment.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key value violates unique constraint idx_appointment_unique_active_slot"));

        AppException ex = assertThrows(AppException.class, () -> appointmentService.bookAppointment(patientId, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("SLOT_CONFLICT", ex.getCode());
        assertTrue(ex.getMessage().contains("Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước"));
    }

    @Test
    void testBookAppointment_PastTime_ThrowsException() {
        LocalDateTime pastTime = LocalDateTime.now().minusHours(1);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, pastTime, "Khám muộn");

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));

        AppException ex = assertThrows(AppException.class, () -> appointmentService.bookAppointment(patientId, request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("PAST_DATE", ex.getCode());
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void testCompleteClinicalEncounter_Success() {
        UUID appointmentId = UUID.randomUUID();
        Appointment appointment = Appointment.builder()
                .id(appointmentId)
                .appointmentCode("AP-20260911-TEST01")
                .doctor(doctorUser)
                .patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .build();

        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        com.mediassist.dto.ClinicalEncounterRequest req = new com.mediassist.dto.ClinicalEncounterRequest();
        req.setChiefComplaint("Đau ngực trái");
        req.setVitalSignsJson("{\"bloodPressure\":\"130/80\"}");
        req.setIcd10Code("I10");
        req.setIcd10Name("Tăng huyết áp nguyên phát");
        req.setPrescriptionJson("[{\"drugName\":\"Amlodipine 5mg\"}]");
        req.setTreatmentPlan("Uống thuốc buổi sáng");

        AppointmentDto result = appointmentService.completeClinicalEncounter(appointmentId, doctorId, req);

        assertNotNull(result);
        assertEquals(AppointmentStatus.COMPLETED, result.getStatus());
        assertEquals("I10", result.getIcd10Code());
        assertEquals("Tăng huyết áp nguyên phát", result.getIcd10Name());
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    void testGetPatientAppointmentHistory_Success() {
        Appointment apt = Appointment.builder()
                .id(UUID.randomUUID())
                .appointmentCode("AP-HIST-01")
                .doctor(doctorUser)
                .patient(patientUser)
                .status(AppointmentStatus.COMPLETED)
                .build();

        when(appointmentRepository.findByPatientIdWithUsersOrderByScheduledStartDesc(patientId))
                .thenReturn(java.util.List.of(apt));

        java.util.List<AppointmentDto> list = appointmentService.getPatientAppointmentHistory(patientId);

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("AP-HIST-01", list.get(0).getAppointmentCode());
    }

    @Test
    void testCreateFollowUpAppointment_Success() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(7).withHour(10).withMinute(0);
        com.mediassist.dto.FollowUpAppointmentRequest req = new com.mediassist.dto.FollowUpAppointmentRequest();
        req.setPatientId(patientId);
        req.setScheduledStart(futureTime);
        req.setNotes("Tái khám theo dõi huyết áp sau 1 tuần");
        req.setClinicRoom("Phòng 204");

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(false);
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(i -> {
            Appointment a = i.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        AppointmentDto result = appointmentService.createFollowUpAppointment(doctorId, req);

        assertNotNull(result);
        assertTrue(result.getAppointmentCode().startsWith("AP-TK-"));
        assertEquals(AppointmentStatus.SCHEDULED, result.getStatus());
        assertEquals("Phòng 204", result.getClinicRoom());
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    void testBookAppointment_WithMedicalDocumentId_Success() {
        LocalDateTime futureTime = getNextWeekdaySlot(3, 14, 0);
        UUID docId = UUID.randomUUID();
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám theo kết quả xét nghiệm máu", docId);

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(false);
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));

        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        AppointmentDto result = appointmentService.bookAppointment(patientId, request);

        assertNotNull(result);
        assertEquals(docId, result.getMedicalDocumentId());
        assertEquals(AppointmentStatus.SCHEDULED, result.getStatus());
        verify(appointmentRepository, times(1)).saveAndFlush(argThat(a -> docId.equals(a.getMedicalDocumentId())));
    }

    @Test
    void testRescheduleAppointment_Success() {
        UUID apptId = UUID.randomUUID();
        LocalDateTime oldStart = getNextWeekdaySlot(2, 9, 0);
        LocalDateTime newStart = getNextWeekdaySlot(3, 10, 0);

        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-2026-RESCHED")
                .doctor(doctorUser)
                .patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(oldStart)
                .scheduledEnd(oldStart.plusMinutes(30))
                .build();

        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.existsConflictExcluding(eq(doctorId), eq(newStart), eq(apptId))).thenReturn(false);
        when(appointmentRepository.countActiveAppointmentsByDoctorAndDateRange(eq(doctorId), any(), any())).thenReturn(1L);
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        RescheduleAppointmentRequest req = new RescheduleAppointmentRequest(newStart, "Bận việc đột xuất");
        AppointmentDto result = appointmentService.rescheduleAppointment(apptId, patientId, Role.PATIENT, req);

        assertNotNull(result);
        assertEquals(newStart, result.getScheduledStart());
        assertEquals("STT 02", result.getQueueNumber());
        assertTrue(result.getConsultationNotes().contains("Bận việc đột xuất"));
    }

    @Test
    void testRescheduleAppointment_Conflict_ThrowsException() {
        UUID apptId = UUID.randomUUID();
        LocalDateTime oldStart = getNextWeekdaySlot(2, 9, 0);
        LocalDateTime newStart = getNextWeekdaySlot(3, 10, 0);

        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-2026-RESCHED-ERR")
                .doctor(doctorUser)
                .patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(oldStart)
                .scheduledEnd(oldStart.plusMinutes(30))
                .build();

        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.existsConflictExcluding(eq(doctorId), eq(newStart), eq(apptId))).thenReturn(true);

        RescheduleAppointmentRequest req = new RescheduleAppointmentRequest(newStart, "Bận việc đột xuất");
        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.rescheduleAppointment(apptId, patientId, Role.PATIENT, req));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("SLOT_CONFLICT", ex.getCode());
    }

    @Test
    void testUpdateStatus_InvalidTransition_ThrowsException() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-2026-COMPLETED")
                .doctor(doctorUser)
                .patient(patientUser)
                .status(AppointmentStatus.COMPLETED)
                .build();

        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));

        AppException ex = assertThrows(AppException.class, () ->
                appointmentService.updateAppointmentStatus(apptId, doctorId, Role.DOCTOR, AppointmentStatus.SCHEDULED, "Back to scheduled"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_STATUS_TRANSITION", ex.getCode());
    }

    @Test
    void testUpdateStatus_AutoRefund_WhenPaidAndCancelled() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId)
                .appointmentCode("AP-2026-REFUND")
                .doctor(doctorUser)
                .patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .paymentStatus(PaymentStatus.PAID)
                .build();

        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDto result = appointmentService.updateAppointmentStatus(apptId, patientId, Role.PATIENT, AppointmentStatus.CANCELLED, "Bệnh nhân hủy");

        assertNotNull(result);
        assertEquals(AppointmentStatus.CANCELLED, result.getStatus());
        assertEquals(PaymentStatus.REFUNDED, result.getPaymentStatus());
    }

    // ===== Rao chan EMAIL_NOT_VERIFIED (WORK_LOG #083 phan C) =====

    @Test
    void testBookAppointment_UnverifiedPatient_BlockedBeforeAnySave() {
        patientUser.setEmailVerified(false);
        LocalDateTime futureTime = getNextWeekdaySlot(2, 9, 0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám tổng quát");
        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));

        AppException ex = assertThrows(AppException.class, () -> appointmentService.bookAppointment(patientId, request));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("EMAIL_NOT_VERIFIED", ex.getCode());
        verify(appointmentRepository, never()).saveAndFlush(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    void testRescheduleAppointment_UnverifiedPatient_Blocked() {
        patientUser.setEmailVerified(false);
        UUID apptId = UUID.randomUUID();
        LocalDateTime oldStart = getNextWeekdaySlot(2, 9, 0);
        Appointment appt = Appointment.builder()
                .id(apptId).appointmentCode("AP-2026-UNVERIFIED")
                .doctor(doctorUser).patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(oldStart).scheduledEnd(oldStart.plusMinutes(30))
                .build();
        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));

        RescheduleAppointmentRequest req = new RescheduleAppointmentRequest(getNextWeekdaySlot(3, 10, 0), "Bận");
        AppException ex = assertThrows(AppException.class,
                () -> appointmentService.rescheduleAppointment(apptId, patientId, Role.PATIENT, req));

        assertEquals("EMAIL_NOT_VERIFIED", ex.getCode());
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void testRescheduleAppointment_ByDoctor_UnverifiedPatient_Allowed() {
        patientUser.setEmailVerified(false);
        UUID apptId = UUID.randomUUID();
        LocalDateTime oldStart = getNextWeekdaySlot(2, 9, 0);
        LocalDateTime newStart = getNextWeekdaySlot(3, 10, 0);
        Appointment appt = Appointment.builder()
                .id(apptId).appointmentCode("AP-2026-DOC-RESCHED")
                .doctor(doctorUser).patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(oldStart).scheduledEnd(oldStart.plusMinutes(30))
                .build();
        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.existsConflictExcluding(eq(doctorId), eq(newStart), eq(apptId))).thenReturn(false);
        when(appointmentRepository.countActiveAppointmentsByDoctorAndDateRange(eq(doctorId), any(), any())).thenReturn(0L);
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDto result = appointmentService.rescheduleAppointment(apptId, doctorId, Role.DOCTOR,
                new RescheduleAppointmentRequest(newStart, "Bác sĩ đổi ca"));

        assertEquals(newStart, result.getScheduledStart());
    }

    // ===== Email nghiep vu: event dat lich / huy lich (WORK_LOG #083 phan D) =====

    @Test
    void testBookAppointment_PublishesBookedEvent_WithoutClinicalData() {
        LocalDateTime futureTime = getNextWeekdaySlot(2, 9, 0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Đau ngực trái lan xuống cánh tay");
        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(false);
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(inv -> {
            Appointment saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        AppointmentDto result = appointmentService.bookAppointment(patientId, request);

        ArgumentCaptor<AppointmentBookedEvent> captor = ArgumentCaptor.forClass(AppointmentBookedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        AppointmentBookedEvent event = captor.getValue();
        assertFalse(event.followUp());
        assertEquals(result.getAppointmentCode(), event.appointment().appointmentCode());
        assertEquals(futureTime, event.appointment().scheduledStart());
        assertEquals(patientUser.getEmail(), event.appointment().patientEmail());
        assertEquals(doctorUser.getEmail(), event.appointment().doctorEmail());
        assertEquals(doctorUser.getFullName(), event.appointment().doctorName());
        // Ly do kham (chiefComplaint / consultationNotes) KHONG nam trong event
        assertFalse(event.toString().contains("Đau ngực"));
    }

    @Test
    void testBookAppointment_SlotConflict_DoesNotPublish() {
        LocalDateTime futureTime = getNextWeekdaySlot(1, 10, 0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám tổng quát");
        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(true);

        assertThrows(AppException.class, () -> appointmentService.bookAppointment(patientId, request));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void testCreateFollowUp_PublishesBookedEvent_FollowUpFlag() {
        LocalDateTime futureTime = getNextWeekdaySlot(3, 9, 0);
        com.mediassist.dto.FollowUpAppointmentRequest req = new com.mediassist.dto.FollowUpAppointmentRequest();
        req.setPatientId(patientId);
        req.setScheduledStart(futureTime);
        req.setNotes("Theo dõi huyết áp sau điều chỉnh thuốc");
        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(false);
        when(doctorProfileRepository.findByUserId(doctorId)).thenReturn(Optional.of(doctorProfile));
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        appointmentService.createFollowUpAppointment(doctorId, req);

        ArgumentCaptor<AppointmentBookedEvent> captor = ArgumentCaptor.forClass(AppointmentBookedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertTrue(captor.getValue().followUp());
        assertFalse(captor.getValue().toString().contains("huyết áp"));
    }

    @Test
    void testCancelByPatient_Paid_PublishesCancelledEventWithRefund() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId).appointmentCode("AP-2026-CANCEL-PAID")
                .doctor(doctorUser).patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(getNextWeekdaySlot(2, 9, 0))
                .paymentStatus(PaymentStatus.PAID)
                .feeAmount(new BigDecimal("350000.00"))
                .build();
        PaymentTransaction tx = new PaymentTransaction();
        tx.setAmount(new BigDecimal("350000.00"));
        tx.setStatus(TransactionStatus.COMPLETED);
        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentTransactionRepository.findFirstByReferenceIdAndStatus(apptId.toString(), TransactionStatus.COMPLETED))
                .thenReturn(Optional.of(tx));

        appointmentService.updateAppointmentStatus(apptId, patientId, Role.PATIENT, AppointmentStatus.CANCELLED, "Bị sốt cao không đi được");

        assertEquals(TransactionStatus.REFUNDED, tx.getStatus());
        ArgumentCaptor<AppointmentCancelledEvent> captor = ArgumentCaptor.forClass(AppointmentCancelledEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        AppointmentCancelledEvent event = captor.getValue();
        assertEquals(AppointmentCancelledEvent.CancelledBy.PATIENT, event.cancelledBy());
        assertTrue(event.refunded());
        assertEquals(0, new BigDecimal("350000").compareTo(event.refundAmount()));
        // Ly do huy tu go KHONG nam trong event
        assertFalse(event.toString().contains("sốt cao"));
    }

    @Test
    void testCancelByDoctor_Unpaid_PublishesCancelledEventWithoutRefund() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId).appointmentCode("AP-2026-CANCEL-DOC")
                .doctor(doctorUser).patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(getNextWeekdaySlot(2, 9, 0))
                .paymentStatus(PaymentStatus.UNPAID)
                .build();
        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        appointmentService.updateAppointmentStatus(apptId, doctorId, Role.DOCTOR, AppointmentStatus.CANCELLED, "Bác sĩ đi hội chẩn");

        ArgumentCaptor<AppointmentCancelledEvent> captor = ArgumentCaptor.forClass(AppointmentCancelledEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertEquals(AppointmentCancelledEvent.CancelledBy.DOCTOR, captor.getValue().cancelledBy());
        assertFalse(captor.getValue().refunded());
        verifyNoInteractions(paymentTransactionRepository);
    }

    @Test
    void testUpdateStatus_NonCancel_DoesNotPublish() {
        UUID apptId = UUID.randomUUID();
        Appointment appt = Appointment.builder()
                .id(apptId).appointmentCode("AP-2026-START")
                .doctor(doctorUser).patient(patientUser)
                .status(AppointmentStatus.SCHEDULED)
                .build();
        when(appointmentRepository.findByIdWithUsers(apptId)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        appointmentService.updateAppointmentStatus(apptId, doctorId, Role.DOCTOR, AppointmentStatus.IN_PROGRESS, null);

        verify(eventPublisher, never()).publishEvent(any());
    }
}
