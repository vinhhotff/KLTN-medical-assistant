package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.DocumentFileAccessDto;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.MedicalDocumentRepository;
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

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * UC-28: cấp signed URL xem tệp y tế gốc (PatientAccessGuard thật + StorageService mock).
 */
@ExtendWith(MockitoExtension.class)
class MedicalDocumentFileAccessServiceTest {

    private static final String OBJECT_KEY = "patients/owner/abcd1234_xet-nghiem.pdf";
    private static final String SIGNED = "https://demo.supabase.co/storage/v1/object/sign/medical-documents/" + OBJECT_KEY + "?token=t";

    @Mock private MedicalDocumentRepository medicalDocumentRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private StorageService storageService;

    private MedicalDocumentFileAccessService service;

    private final UUID patientId = UUID.randomUUID();
    private final UUID doctorId = UUID.randomUUID();
    private final UUID docId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        PatientAccessGuard guard = new PatientAccessGuard(appointmentRepository, auditLogRepository);
        service = new MedicalDocumentFileAccessService(medicalDocumentRepository, guard, storageService, auditLogRepository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.7");
        request.addHeader("X-Forwarded-For", "203.113.5.9, 10.0.0.1");
        request.addHeader("User-Agent", "JUnit-Browser");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("Bệnh nhân chủ tài liệu → nhận signed URL 900 giây và có audit DOCUMENT_SIGNED_URL_ISSUED")
    void ownerPatient_GetsSignedUrlAndAudit() {
        givenDocument(OBJECT_KEY);
        givenSigned(false);

        DocumentFileAccessDto dto = service.issueAccess(user(patientId, Role.PATIENT), docId, false);

        assertEquals(SIGNED, dto.getUrl());
        assertEquals(900, dto.getExpiresInSeconds());
        assertNotNull(dto.getExpiresAt());
        assertEquals("xet-nghiem.pdf", dto.getFileName());
        assertEquals("application/pdf", dto.getContentType());

        AuditLog audit = singleAudit();
        assertEquals("DOCUMENT_SIGNED_URL_ISSUED", audit.getAction());
        assertEquals(patientId, audit.getUserId());
        assertEquals("medical_documents/" + docId, audit.getResource());
        assertEquals("203.113.5.9", audit.getIpAddress());
        assertEquals("JUnit-Browser", audit.getUserAgent());
        assertTrue(audit.getMetadata().contains("Role: PATIENT"), audit.getMetadata());
        assertTrue(audit.getMetadata().contains("PatientId: " + patientId), audit.getMetadata());
        assertTrue(audit.getMetadata().contains("Download: false"), audit.getMetadata());
        assertTrue(audit.getMetadata().contains("TtlSeconds: 900"), audit.getMetadata());
        assertFalse(audit.getMetadata().contains("token"), "Audit metadata must never contain the signed URL");
    }

    @Test
    @DisplayName("Bệnh nhân khác → 403 FORBIDDEN_PATIENT_ACCESS và KHÔNG gọi hàm ký URL")
    void otherPatient_Gets403WithoutSigning() {
        givenDocument(OBJECT_KEY);

        AppException ex = assertThrows(AppException.class,
                () -> service.issueAccess(user(UUID.randomUUID(), Role.PATIENT), docId, false));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("FORBIDDEN_PATIENT_ACCESS", ex.getCode());
        verify(storageService, never()).createSignedUrl(any(), anyBoolean(), any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bác sĩ không có lịch hẹn → 403, không ký URL")
    void doctorWithoutAppointment_Gets403() {
        givenDocument(OBJECT_KEY);
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(eq(doctorId), eq(patientId), any())).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> service.issueAccess(user(doctorId, Role.DOCTOR), docId, false));

        assertEquals("FORBIDDEN_PATIENT_ACCESS", ex.getCode());
        verify(storageService, never()).createSignedUrl(any(), anyBoolean(), any());
    }

    @Test
    @DisplayName("Bác sĩ có lịch hẹn → OK, ghi cả VIEW_PATIENT_RECORD và DOCUMENT_SIGNED_URL_ISSUED")
    void doctorWithAppointment_GetsUrlAndAudit() {
        givenDocument(OBJECT_KEY);
        givenSigned(false);
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(eq(doctorId), eq(patientId), any())).thenReturn(true);

        DocumentFileAccessDto dto = service.issueAccess(user(doctorId, Role.DOCTOR), docId, false);

        assertEquals(SIGNED, dto.getUrl());
        List<String> actions = savedAudits().stream().map(AuditLog::getAction).toList();
        assertEquals(List.of("VIEW_PATIENT_RECORD", "DOCUMENT_SIGNED_URL_ISSUED"), actions);
    }

    @Test
    @DisplayName("Admin → OK, có audit DOCUMENT_SIGNED_URL_ISSUED với Role: ADMIN")
    void admin_GetsUrlAndAudit() {
        UUID adminId = UUID.randomUUID();
        givenDocument(OBJECT_KEY);
        givenSigned(false);

        service.issueAccess(user(adminId, Role.ADMIN), docId, false);

        AuditLog issued = savedAudits().stream()
                .filter(a -> "DOCUMENT_SIGNED_URL_ISSUED".equals(a.getAction())).findFirst().orElseThrow();
        assertEquals(adminId, issued.getUserId());
        assertTrue(issued.getMetadata().contains("Role: ADMIN"));
    }

    @Test
    @DisplayName("Tài liệu không có tệp → 404 FILE_NOT_AVAILABLE, không ký URL, không audit")
    void documentWithoutFile_Gets404() {
        givenDocument(null);

        AppException ex = assertThrows(AppException.class,
                () -> service.issueAccess(user(patientId, Role.PATIENT), docId, false));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        assertEquals("FILE_NOT_AVAILABLE", ex.getCode());
        verifyNoInteractions(storageService);
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tài liệu không tồn tại → 404 NOT_FOUND")
    void missingDocument_Gets404() {
        when(medicalDocumentRepository.findById(docId)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class,
                () -> service.issueAccess(user(patientId, Role.PATIENT), docId, false));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        verifyNoInteractions(storageService);
    }

    @Test
    @DisplayName("Object đã bị xóa trên Supabase → 404 FILE_NOT_AVAILABLE và KHÔNG ghi audit")
    void objectMissingOnSupabase_Gets404WithoutAudit() {
        givenDocument(OBJECT_KEY);
        when(storageService.createSignedUrl(OBJECT_KEY, false, "xet-nghiem.pdf"))
                .thenThrow(new AppException(HttpStatus.NOT_FOUND, "FILE_NOT_AVAILABLE", "x"));

        AppException ex = assertThrows(AppException.class,
                () -> service.issueAccess(user(patientId, Role.PATIENT), docId, false));

        assertEquals("FILE_NOT_AVAILABLE", ex.getCode());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Supabase lỗi / timeout → 503 STORAGE_UNAVAILABLE và KHÔNG ghi audit")
    void storageDown_Gets503WithoutAudit() {
        givenDocument(OBJECT_KEY);
        when(storageService.createSignedUrl(OBJECT_KEY, false, "xet-nghiem.pdf"))
                .thenThrow(new AppException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "x"));

        AppException ex = assertThrows(AppException.class,
                () -> service.issueAccess(user(patientId, Role.PATIENT), docId, false));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals("STORAGE_UNAVAILABLE", ex.getCode());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tệp local (fallback dev) → url đi qua backend /file, expiresAt = null, có audit")
    void localFile_ReturnsBackendUrl() {
        givenDocument("/uploads/medical_documents/owner/abcd_xet-nghiem.pdf");

        DocumentFileAccessDto dto = service.issueAccess(user(patientId, Role.PATIENT), docId, true);

        assertEquals("/api/v1/documents/" + docId + "/file?download=true", dto.getUrl());
        assertNull(dto.getExpiresAt());
        verifyNoInteractions(storageService);
        assertEquals("DOCUMENT_SIGNED_URL_ISSUED", singleAudit().getAction());
    }

    @Test
    @DisplayName("download=true được chuyển xuống StorageService kèm tên tệp gốc")
    void downloadFlag_PassedToStorage() {
        givenDocument(OBJECT_KEY);
        givenSigned(true);

        service.issueAccess(user(patientId, Role.PATIENT), docId, true);

        verify(storageService).createSignedUrl(OBJECT_KEY, true, "xet-nghiem.pdf");
        assertTrue(singleAudit().getMetadata().contains("Download: true"));
    }

    private void givenDocument(String storagePath) {
        MedicalDocument doc = new MedicalDocument();
        doc.setId(docId);
        doc.setUser(user(patientId, Role.PATIENT));
        doc.setFileName("xet-nghiem.pdf");
        doc.setContentType("application/pdf");
        doc.setStoragePath(storagePath);
        when(medicalDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
    }

    private void givenSigned(boolean download) {
        when(storageService.createSignedUrl(OBJECT_KEY, download, "xet-nghiem.pdf"))
                .thenReturn(new StorageService.SignedUrl(SIGNED, Instant.now().plusSeconds(900), 900));
    }

    private AuditLog singleAudit() {
        List<AuditLog> audits = savedAudits();
        assertEquals(1, audits.size());
        return audits.get(0);
    }

    private List<AuditLog> savedAudits() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, atLeastOnce()).save(captor.capture());
        return captor.getAllValues();
    }

    private User user(UUID id, Role role) {
        User u = new User();
        u.setId(id);
        u.setEmail(role.name().toLowerCase() + "@test.local");
        u.setRole(role);
        return u;
    }
}
