package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.Role;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.EnumSet;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientAccessGuardTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    private PatientAccessGuard guard;

    private final UUID patientId = UUID.randomUUID();
    private final UUID doctorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        guard = new PatientAccessGuard(appointmentRepository, auditLogRepository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.7");
        request.addHeader("X-Forwarded-For", "203.113.5.9, 10.0.0.1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("Bác sĩ có lịch hẹn điều trị với bệnh nhân được phép xem và ghi audit VIEW_PATIENT_RECORD")
    void doctorWithCareRelationship_IsAllowedAndAudited() {
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(doctorId, patientId,
                EnumSet.of(AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED)))
                .thenReturn(true);

        assertDoesNotThrow(() -> guard.assertCanAccessPatient(doctorId, Role.DOCTOR, patientId, "triage_sessions/patient/" + patientId));

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog audit = captor.getValue();
        assertEquals(doctorId, audit.getUserId());
        assertEquals(PatientAccessGuard.ACTION_VIEW_PATIENT_RECORD, audit.getAction());
        assertEquals("triage_sessions/patient/" + patientId, audit.getResource());
        assertEquals("203.113.5.9", audit.getIpAddress());
        assertTrue(audit.getMetadata().contains(patientId.toString()));
    }

    @Test
    @DisplayName("Bác sĩ không có lịch hẹn hợp lệ (không liên quan / chỉ có lịch đã hủy) bị chặn 403")
    void doctorWithoutCareRelationship_IsForbidden() {
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(any(), any(), any())).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> guard.assertCanAccessPatient(doctorId, Role.DOCTOR, patientId));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals(PatientAccessGuard.ERROR_CODE, ex.getCode());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bệnh nhân xem hồ sơ của chính mình được phép, không cần audit")
    void patientViewingOwnRecord_IsAllowed() {
        assertDoesNotThrow(() -> guard.assertCanAccessPatient(patientId, Role.PATIENT, patientId));
        verifyNoInteractions(appointmentRepository, auditLogRepository);
    }

    @Test
    @DisplayName("Bệnh nhân xem hồ sơ của người khác bị chặn 403")
    void patientViewingOtherRecord_IsForbidden() {
        AppException ex = assertThrows(AppException.class,
                () -> guard.assertCanAccessPatient(patientId, Role.PATIENT, UUID.randomUUID()));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals(PatientAccessGuard.ERROR_CODE, ex.getCode());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    @DisplayName("Admin được xem hồ sơ bệnh nhân nhưng bắt buộc ghi audit")
    void admin_IsAllowedButAudited() {
        UUID adminId = UUID.randomUUID();

        assertDoesNotThrow(() -> guard.assertCanAccessPatient(adminId, Role.ADMIN, patientId));

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals(adminId, captor.getValue().getUserId());
        assertEquals(PatientAccessGuard.ACTION_VIEW_PATIENT_RECORD, captor.getValue().getAction());
        assertEquals("patients/" + patientId, captor.getValue().getResource());
        verifyNoInteractions(appointmentRepository);
    }

    @Test
    @DisplayName("Tài liệu không có chủ sở hữu: bác sĩ bị chặn, không truy vấn lịch hẹn")
    void doctorAccessingOwnerlessRecord_IsForbidden() {
        AppException ex = assertThrows(AppException.class,
                () -> guard.assertCanAccessPatient(doctorId, Role.DOCTOR, null));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verifyNoInteractions(appointmentRepository, auditLogRepository);
    }
}
