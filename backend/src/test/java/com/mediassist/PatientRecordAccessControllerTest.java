package com.mediassist;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.common.GlobalExceptionHandler;
import com.mediassist.controller.AppointmentController;
import com.mediassist.controller.MedicalDocumentController;
import com.mediassist.controller.PatientProfileController;
import com.mediassist.controller.TriageController;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.dto.MedicalDocumentDto;
import com.mediassist.dto.TriageSessionDto;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.TriageSession;
import com.mediassist.model.entity.TriageUrgencyLevel;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.TriageSessionRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AppointmentService;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.MeddiesPdfGeneratorService;
import com.mediassist.service.MedicalDocumentAnalysisService;
import com.mediassist.service.MedicalDocumentFileAccessService;
import com.mediassist.service.PatientAccessGuard;
import com.mediassist.service.PatientProfileService;
import com.mediassist.service.SecurityRateLimiterService;
import com.mediassist.service.StorageService;
import com.mediassist.service.TriageRateLimiterService;
import com.mediassist.service.TriageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Kiểm thử rào chắn quyền truy cập hồ sơ bệnh nhân ở tầng controller (PatientAccessGuard thật + repository mock).
 */
@ExtendWith(MockitoExtension.class)
class PatientRecordAccessControllerTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private TriageSessionRepository triageSessionRepository;
    @Mock private MedicalDocumentRepository medicalDocumentRepository;
    @Mock private UserRepository userRepository;
    @Mock private PatientProfileService patientProfileService;
    @Mock private AppointmentService appointmentService;
    @Mock private MedicalDocumentAnalysisService analysisService;

    private TriageController triageController;
    private PatientProfileController patientProfileController;
    private AppointmentController appointmentController;
    private MedicalDocumentController medicalDocumentController;

    private final UUID patientId = UUID.randomUUID();
    private final UUID doctorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        PatientAccessGuard guard = new PatientAccessGuard(appointmentRepository, auditLogRepository);
        triageController = new TriageController(mock(TriageService.class), mock(DoctorSemanticSearchService.class),
                mock(TriageRateLimiterService.class), triageSessionRepository, userRepository, guard);
        patientProfileController = new PatientProfileController(patientProfileService, guard);
        appointmentController = new AppointmentController(appointmentService, guard);
        SecurityRateLimiterService rateLimiter = mock(SecurityRateLimiterService.class);
        lenient().when(rateLimiter.allowDocumentFileAccess(anyString())).thenReturn(true);
        medicalDocumentController = new MedicalDocumentController(analysisService, medicalDocumentRepository,
                userRepository, rateLimiter, mock(MeddiesPdfGeneratorService.class), guard,
                new MedicalDocumentFileAccessService(medicalDocumentRepository, guard, mock(StorageService.class), auditLogRepository));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.20");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("Bác sĩ có lịch hẹn với bệnh nhân → 200, trả DTO và ghi audit kèm IP")
    void doctorWithAppointment_Gets200() {
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(eq(doctorId), eq(patientId), any())).thenReturn(true);
        TriageSession session = new TriageSession();
        session.setSymptomsText("Đau ngực, khó thở");
        session.setEmergency(true);
        session.setUrgencyLevel(TriageUrgencyLevel.EMERGENCY);
        when(triageSessionRepository.findByUserIdOrderByCreatedAtDesc(patientId)).thenReturn(List.of(session));

        ResponseEntity<ApiResponse<List<TriageSessionDto>>> response =
                triageController.getPatientTriageHistory(principal(doctorId, Role.DOCTOR), patientId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().getData().size());
        assertTrue(response.getBody().getData().get(0).isEmergency());

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("VIEW_PATIENT_RECORD", captor.getValue().getAction());
        assertEquals(doctorId, captor.getValue().getUserId());
        assertEquals("192.168.1.20", captor.getValue().getIpAddress());
    }

    @Test
    @DisplayName("Bác sĩ không liên quan → 403 FORBIDDEN_PATIENT_ACCESS, không đọc dữ liệu hồ sơ")
    void unrelatedDoctor_Gets403() {
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(eq(doctorId), eq(patientId), any())).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> patientProfileController.getProfileByUserId(principal(doctorId, Role.DOCTOR), patientId));

        assertForbiddenPatientAccess(ex);
        verifyNoInteractions(patientProfileService);
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Bác sĩ không liên quan mở tệp tài liệu theo ID → 403 (kiểm tra theo chủ sở hữu tài liệu)")
    void unrelatedDoctorOpeningDocumentFile_Gets403() {
        UUID docId = UUID.randomUUID();
        User doctor = user(doctorId, "doctor@test.local", Role.DOCTOR);
        when(userRepository.findByEmail("doctor@test.local")).thenReturn(Optional.of(doctor));
        when(medicalDocumentRepository.findById(docId)).thenReturn(Optional.of(document(docId, patientId)));
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(eq(doctorId), eq(patientId), any())).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> medicalDocumentController.viewOrDownloadFile(docId, false, auth("doctor@test.local", Role.DOCTOR)));

        assertForbiddenPatientAccess(ex);
    }

    @Test
    @DisplayName("Bệnh nhân xem tài liệu của người khác → 403")
    void patientViewingOtherPatientDocument_Gets403() {
        UUID otherPatientId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        User patient = user(patientId, "patient@test.local", Role.PATIENT);
        when(userRepository.findByEmail("patient@test.local")).thenReturn(Optional.of(patient));
        when(medicalDocumentRepository.findById(docId)).thenReturn(Optional.of(document(docId, otherPatientId)));

        AppException ex = assertThrows(AppException.class,
                () -> medicalDocumentController.getDocumentAnalysis(docId, auth("patient@test.local", Role.PATIENT)));

        assertForbiddenPatientAccess(ex);
        verifyNoInteractions(analysisService);
    }

    @Test
    @DisplayName("Bệnh nhân xem phân tích tài liệu của chính mình → 200, không ghi audit")
    void patientViewingOwnDocument_Gets200() {
        UUID docId = UUID.randomUUID();
        User patient = user(patientId, "patient@test.local", Role.PATIENT);
        when(userRepository.findByEmail("patient@test.local")).thenReturn(Optional.of(patient));
        when(medicalDocumentRepository.findById(docId)).thenReturn(Optional.of(document(docId, patientId)));
        when(analysisService.getDocumentAnalysis(docId)).thenReturn(new DocumentAnalysisResponse());

        ResponseEntity<ApiResponse<DocumentAnalysisResponse>> response =
                medicalDocumentController.getDocumentAnalysis(docId, auth("patient@test.local", Role.PATIENT));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    @DisplayName("Admin xem lịch sử khám của bệnh nhân → 200 và có audit log VIEW_PATIENT_RECORD")
    void admin_Gets200AndAuditLog() {
        UUID adminId = UUID.randomUUID();
        when(appointmentService.getPatientAppointmentHistory(patientId)).thenReturn(List.of(new AppointmentDto()));

        ResponseEntity<ApiResponse<List<AppointmentDto>>> response =
                appointmentController.getPatientHistory(principal(adminId, Role.ADMIN), patientId);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("VIEW_PATIENT_RECORD", captor.getValue().getAction());
        assertEquals(adminId, captor.getValue().getUserId());
        assertEquals("appointments/patient/" + patientId, captor.getValue().getResource());
        verifyNoInteractions(appointmentRepository);
    }

    @Test
    @DisplayName("Danh sách tài liệu trả DTO (không lộ fileHash / entity User) và giữ tên field isValidMedical")
    void doctorWithAppointment_GetsDocumentDtos() {
        User doctor = user(doctorId, "doctor@test.local", Role.DOCTOR);
        when(userRepository.findByEmail("doctor@test.local")).thenReturn(Optional.of(doctor));
        when(appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(eq(doctorId), eq(patientId), any())).thenReturn(true);
        when(medicalDocumentRepository.findByUserIdOrderByCreatedAtDesc(patientId))
                .thenReturn(List.of(document(UUID.randomUUID(), patientId)));

        ResponseEntity<ApiResponse<List<MedicalDocumentDto>>> response =
                medicalDocumentController.getPatientDocuments(patientId, auth("doctor@test.local", Role.DOCTOR));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        MedicalDocumentDto dto = response.getBody().getData().get(0);
        assertEquals("xet-nghiem.pdf", dto.getFileName());
        assertTrue(dto.isValidMedical());
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("JSON của DTO giữ đúng tên field frontend đang dùng và không lộ fileHash")
    void dtoJsonContract_MatchesFrontend() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        String docJson = mapper.writeValueAsString(MedicalDocumentDto.fromEntity(document(UUID.randomUUID(), patientId)));
        assertTrue(docJson.contains("\"isValidMedical\":true"), docJson);
        assertFalse(docJson.contains("fileHash"), docJson);

        TriageSession session = new TriageSession();
        session.setEmergency(true);
        String triageJson = mapper.writeValueAsString(TriageSessionDto.fromEntity(session));
        assertTrue(triageJson.contains("\"isEmergency\":true"), triageJson);
    }

    private void assertForbiddenPatientAccess(AppException ex) {
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("FORBIDDEN_PATIENT_ACCESS", ex.getCode());
        ResponseEntity<ApiResponse<Void>> mapped = new GlobalExceptionHandler().handleAppException(ex);
        assertEquals(HttpStatus.FORBIDDEN, mapped.getStatusCode());
        assertEquals("FORBIDDEN_PATIENT_ACCESS", mapped.getBody().getError().getCode());
    }

    private UserPrincipal principal(UUID id, Role role) {
        return new UserPrincipal(id, role.name().toLowerCase() + "@test.local", "x", role, UserStatus.ACTIVE,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
    }

    private Authentication auth(String email, Role role) {
        return new UsernamePasswordAuthenticationToken(email, null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
    }

    private User user(UUID id, String email, Role role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setRole(role);
        return u;
    }

    private MedicalDocument document(UUID docId, UUID ownerId) {
        MedicalDocument doc = new MedicalDocument();
        doc.setId(docId);
        doc.setUser(user(ownerId, "owner@test.local", Role.PATIENT));
        doc.setFileName("xet-nghiem.pdf");
        doc.setContentType("application/pdf");
        doc.setFileHash("abc123");
        return doc;
    }
}
