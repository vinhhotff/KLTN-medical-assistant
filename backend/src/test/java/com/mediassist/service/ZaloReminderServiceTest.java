package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.ConsultationType;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZaloReminderServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    private ZaloOaGateway zaloOaGateway;
    private ZaloReminderService zaloReminderService;
    private User patient;
    private User doctor;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        zaloOaGateway = new ZaloOaGateway(true, "mock", "", "", "", "", "", "", objectMapper);
        zaloReminderService = new ZaloReminderService(
                zaloOaGateway, userRepository, appointmentRepository, objectMapper, "http://localhost:5173"
        );

        patient = new User();
        patient.setId(UUID.randomUUID());
        patient.setFullName("Nguyễn Văn Bệnh Nhân");
        patient.setEmail("patient@mediassist.local");

        doctor = new User();
        doctor.setId(UUID.randomUUID());
        doctor.setFullName("BS. Trần Minh Tim");
    }

    @Test
    @DisplayName("linkZalo sets zaloUserId, optedIn=true and sends welcome message in MOCK mode")
    void testLinkZalo_Success() {
        when(userRepository.findByZaloUserId("zalo_12345")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> status = zaloReminderService.linkZalo(patient, "zalo_12345");

        assertEquals(true, status.get("linked"));
        assertEquals("zalo_12345", status.get("zaloUserId"));
        assertEquals("MOCK", status.get("mode"));
        assertTrue(patient.isZaloOptedIn());
    }

    @Test
    @DisplayName("sendAppointmentReminderForUser formats appointment details and marks reminded")
    void testSendAppointmentReminder_Success() {
        patient.setZaloUserId("zalo_999");
        patient.setZaloOptedIn(true);

        Appointment apt = new Appointment();
        apt.setId(UUID.randomUUID());
        apt.setAppointmentCode("APT-ZALO-01");
        apt.setPatient(patient);
        apt.setDoctor(doctor);
        apt.setStatus(AppointmentStatus.SCHEDULED);
        apt.setConsultationType(ConsultationType.ONLINE);
        apt.setScheduledStart(LocalDateTime.now().plusHours(12));

        when(appointmentRepository.findByIdWithUsers(apt.getId())).thenReturn(Optional.of(apt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = zaloReminderService.sendAppointmentReminderForUser(patient, apt.getId());

        assertEquals(true, res.get("success"));
        assertNotNull(apt.getZaloAppointmentRemindedAt());
        String preview = (String) res.get("preview");
        assertTrue(preview.contains("APT-ZALO-01"));
        assertTrue(preview.contains("BS. Trần Minh Tim"));
        assertTrue(preview.contains("Online"));
    }

    @Test
    @DisplayName("sendMedicationReminderForUser uses strictly doctor-prescribed prescriptionJson")
    void testSendMedicationReminder_ReadsDoctorPrescription() {
        patient.setZaloUserId("zalo_999");
        patient.setZaloOptedIn(true);

        Appointment apt = new Appointment();
        apt.setId(UUID.randomUUID());
        apt.setAppointmentCode("APT-MED-02");
        apt.setPatient(patient);
        apt.setDoctor(doctor);
        apt.setStatus(AppointmentStatus.COMPLETED);
        apt.setConsultationNotes("Uống sau ăn no");
        apt.setPrescriptionJson("[{\"name\":\"Atorvastatin 20mg\",\"dosage\":\"1 viên\",\"frequency\":\"Tối\",\"duration\":\"30 ngày\"}]");

        when(appointmentRepository.findByIdWithUsers(apt.getId())).thenReturn(Optional.of(apt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = zaloReminderService.sendMedicationReminderForUser(patient, apt.getId());

        assertEquals(true, res.get("success"));
        assertNotNull(apt.getZaloMedicationRemindedDate());
        String preview = (String) res.get("preview");
        assertTrue(preview.contains("Atorvastatin 20mg"));
        assertTrue(preview.contains("Uống sau ăn no"));
    }

    @Test
    @DisplayName("sendMedicationReminderForUser throws NO_PRESCRIPTION when doctor did not prescribe medication")
    void testSendMedicationReminder_NoPrescription_Throws() {
        patient.setZaloUserId("zalo_999");
        patient.setZaloOptedIn(true);

        Appointment apt = new Appointment();
        apt.setId(UUID.randomUUID());
        apt.setPatient(patient);
        apt.setDoctor(doctor);
        apt.setStatus(AppointmentStatus.COMPLETED);
        apt.setPrescriptionJson("[]");

        when(appointmentRepository.findByIdWithUsers(apt.getId())).thenReturn(Optional.of(apt));

        AppException ex = assertThrows(AppException.class,
                () -> zaloReminderService.sendMedicationReminderForUser(patient, apt.getId()));
        assertEquals("NO_PRESCRIPTION", ex.getCode());
    }
}
