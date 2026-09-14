package com.mediassist;

import com.mediassist.common.AppException;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.CreateAppointmentRequest;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.AppointmentService;
import com.mediassist.service.TwoLayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
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
                cacheService
        );

        patientId = UUID.randomUUID();
        doctorId = UUID.randomUUID();

        patientUser = User.builder()
                .id(patientId)
                .email("patient@mediassist.local")
                .fullName("Trần Thị Bình")
                .role(Role.PATIENT)
                .build();

        doctorUser = User.builder()
                .id(doctorId)
                .email("doctor@mediassist.local")
                .fullName("BS. Nguyễn Văn An")
                .role(Role.DOCTOR)
                .build();

        doctorProfile = new DoctorProfile();
        doctorProfile.setUser(doctorUser);
        doctorProfile.setConsultationFee(new BigDecimal("350000.00"));
    }

    @Test
    void testBookAppointment_Success() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(2).withHour(9).withMinute(0);
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
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        CreateAppointmentRequest request = new CreateAppointmentRequest(doctorId, futureTime, "Khám tổng quát");

        when(userRepository.findById(patientId)).thenReturn(Optional.of(patientUser));
        when(userRepository.findById(doctorId)).thenReturn(Optional.of(doctorUser));
        when(appointmentRepository.existsConflict(doctorId, futureTime)).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> appointmentService.bookAppointment(patientId, request));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("SLOT_CONFLICT", ex.getCode());
        verify(appointmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void testBookAppointment_ConcurrentSlotCollision_DataIntegrityViolation_ThrowsSlotConflict() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1).withHour(14).withMinute(0);
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
}
