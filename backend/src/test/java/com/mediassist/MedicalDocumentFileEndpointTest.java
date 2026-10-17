package com.mediassist;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.controller.MedicalDocumentController;
import com.mediassist.dto.DocumentAnalysisResponse;
import com.mediassist.dto.DocumentFileAccessDto;
import com.mediassist.dto.MedicalDocumentDto;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.MeddiesPdfGeneratorService;
import com.mediassist.service.MedicalDocumentAnalysisService;
import com.mediassist.service.MedicalDocumentFileAccessService;
import com.mediassist.service.PatientAccessGuard;
import com.mediassist.service.SecurityRateLimiterService;
import com.mediassist.service.StorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
 * Kiểm thử endpoint GET /documents/{id}/signed-url và GET /documents/{id}/file (bucket PRIVATE).
 */
@ExtendWith(MockitoExtension.class)
class MedicalDocumentFileEndpointTest {

    private static final String OBJECT_KEY = "patients/owner/abcd1234_xet-nghiem.pdf";
    private static final String SIGNED = "https://demo.supabase.co/storage/v1/object/sign/medical-documents/" + OBJECT_KEY + "?token=t";

    @Mock private MedicalDocumentRepository medicalDocumentRepository;
    @Mock private UserRepository userRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private StorageService storageService;
    @Mock private MeddiesPdfGeneratorService meddiesPdfGeneratorService;
    @Mock private SecurityRateLimiterService rateLimiter;

    private MedicalDocumentController controller;

    private final UUID patientId = UUID.randomUUID();
    private final UUID docId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        PatientAccessGuard guard = new PatientAccessGuard(appointmentRepository, auditLogRepository);
        MedicalDocumentFileAccessService fileAccessService =
                new MedicalDocumentFileAccessService(medicalDocumentRepository, guard, storageService, auditLogRepository);
        controller = new MedicalDocumentController(mock(MedicalDocumentAnalysisService.class), medicalDocumentRepository,
                userRepository, rateLimiter, meddiesPdfGeneratorService, guard, fileAccessService);
        lenient().when(rateLimiter.allowDocumentFileAccess(anyString())).thenReturn(true);
        lenient().when(userRepository.findByEmail("patient@test.local")).thenReturn(Optional.of(patient()));
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(new MockHttpServletRequest()));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    @DisplayName("GET /signed-url → 200, ApiResponse<DocumentFileAccessDto>, Cache-Control: no-store")
    void signedUrl_ReturnsDtoWithNoStore() {
        givenDocument(OBJECT_KEY);
        when(storageService.createSignedUrl(OBJECT_KEY, false, "xet-nghiem.pdf"))
                .thenReturn(new StorageService.SignedUrl(SIGNED, Instant.now().plusSeconds(900), 900));

        ResponseEntity<ApiResponse<DocumentFileAccessDto>> response = controller.getSignedFileUrl(docId, false, auth());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertEquals(SIGNED, response.getBody().getData().getUrl());
        assertEquals(900, response.getBody().getData().getExpiresInSeconds());
    }

    @Test
    @DisplayName("Vượt rate limit 30 lần/phút → 429, không ký URL")
    void signedUrl_RateLimited() {
        when(rateLimiter.allowDocumentFileAccess("patient@test.local")).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () -> controller.getSignedFileUrl(docId, false, auth()));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        verifyNoInteractions(storageService);
    }

    @Test
    @DisplayName("GET /file với tệp Supabase → 302 tới signed URL mới và ghi audit")
    void file_SupabaseObject_RedirectsToSignedUrl() {
        givenDocument(OBJECT_KEY);
        when(storageService.createSignedUrl(OBJECT_KEY, true, "xet-nghiem.pdf"))
                .thenReturn(new StorageService.SignedUrl(SIGNED + "&download=xet-nghiem.pdf", Instant.now().plusSeconds(900), 900));

        ResponseEntity<byte[]> response = controller.viewOrDownloadFile(docId, true, auth());

        assertEquals(HttpStatus.FOUND, response.getStatusCode());
        assertEquals(SIGNED + "&download=xet-nghiem.pdf", response.getHeaders().getFirst(HttpHeaders.LOCATION));
        assertNull(response.getBody());
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertEquals("DOCUMENT_SIGNED_URL_ISSUED", captor.getValue().getAction());
        verifyNoInteractions(meddiesPdfGeneratorService);
    }

    @Test
    @DisplayName("GET /file khi tài liệu không có tệp → 404 FILE_NOT_AVAILABLE, KHÔNG BAO GIỜ sinh PDF giả")
    void file_NoStoredFile_Returns404NeverFakePdf() {
        givenDocument(null);

        AppException ex = assertThrows(AppException.class, () -> controller.viewOrDownloadFile(docId, false, auth()));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        assertEquals("FILE_NOT_AVAILABLE", ex.getCode());
        verifyNoInteractions(meddiesPdfGeneratorService);
    }

    @Test
    @DisplayName("GET /file khi tệp local đã mất trên đĩa → 404 FILE_NOT_AVAILABLE, KHÔNG sinh PDF giả")
    void file_LocalFileMissing_Returns404NeverFakePdf() {
        givenDocument("/uploads/medical_documents/owner/khong-ton-tai-" + UUID.randomUUID() + ".pdf");

        AppException ex = assertThrows(AppException.class, () -> controller.viewOrDownloadFile(docId, false, auth()));

        assertEquals("FILE_NOT_AVAILABLE", ex.getCode());
        verifyNoInteractions(meddiesPdfGeneratorService);
    }

    @Test
    @DisplayName("GET /file khi Supabase không khả dụng → 503 STORAGE_UNAVAILABLE, KHÔNG sinh PDF giả, không audit")
    void file_StorageDown_Returns503NeverFakePdf() {
        givenDocument(OBJECT_KEY);
        when(storageService.createSignedUrl(OBJECT_KEY, false, "xet-nghiem.pdf"))
                .thenThrow(new AppException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "x"));

        AppException ex = assertThrows(AppException.class, () -> controller.viewOrDownloadFile(docId, false, auth()));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        verifyNoInteractions(meddiesPdfGeneratorService);
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("JSON của MedicalDocumentDto / DocumentAnalysisResponse / DocumentFileAccessDto không lộ storageUrl / storagePath")
    void dtoJson_NeverExposesStorageLocation() throws Exception {
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        MedicalDocument doc = document(OBJECT_KEY);

        String docJson = mapper.writeValueAsString(MedicalDocumentDto.fromEntity(doc));
        assertFalse(docJson.contains("storageUrl"), docJson);
        assertFalse(docJson.contains("storagePath"), docJson);
        assertFalse(docJson.contains(OBJECT_KEY), docJson);
        assertTrue(docJson.contains("\"hasFile\":true"), docJson);

        DocumentAnalysisResponse analysis = new DocumentAnalysisResponse();
        analysis.setHasFile(true);
        String analysisJson = mapper.writeValueAsString(analysis);
        assertFalse(analysisJson.contains("storageUrl"), analysisJson);
        assertFalse(analysisJson.contains("storagePath"), analysisJson);
        assertTrue(analysisJson.contains("\"hasFile\":true"), analysisJson);

        String noFileJson = mapper.writeValueAsString(MedicalDocumentDto.fromEntity(document(null)));
        assertTrue(noFileJson.contains("\"hasFile\":false"), noFileJson);
    }

    private void givenDocument(String storagePath) {
        when(medicalDocumentRepository.findById(docId)).thenReturn(Optional.of(document(storagePath)));
    }

    private MedicalDocument document(String storagePath) {
        MedicalDocument doc = new MedicalDocument();
        doc.setId(docId);
        doc.setUser(patient());
        doc.setFileName("xet-nghiem.pdf");
        doc.setContentType("application/pdf");
        doc.setStoragePath(storagePath);
        return doc;
    }

    private User patient() {
        User u = new User();
        u.setId(patientId);
        u.setEmail("patient@test.local");
        u.setRole(Role.PATIENT);
        return u;
    }

    private Authentication auth() {
        return new UsernamePasswordAuthenticationToken("patient@test.local", null,
                List.of(new SimpleGrantedAuthority("ROLE_PATIENT")));
    }
}
