package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.StorageService;
import com.mediassist.service.StorageService.FileUploadResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class StorageControllerTest {

    private StorageService storageService;
    private UserRepository userRepository;
    private DoctorProfileRepository doctorProfileRepository;
    private StorageController controller;

    private UUID userId;
    private UserPrincipal userPrincipal;
    private User mockUser;

    @BeforeEach
    void setUp() {
        storageService = mock(StorageService.class);
        userRepository = mock(UserRepository.class);
        doctorProfileRepository = mock(DoctorProfileRepository.class);
        controller = new StorageController(storageService, userRepository, doctorProfileRepository);

        userId = UUID.randomUUID();
        mockUser = new User();
        mockUser.setId(userId);
        mockUser.setEmail("test@example.com");
        mockUser.setRole(Role.PATIENT);
        mockUser.setStatus(UserStatus.ACTIVE);
        mockUser.setPasswordHash("pass");
        userPrincipal = UserPrincipal.create(mockUser);
    }

    @Test
    @DisplayName("Upload file hợp lệ -> trả về 200 OK với FileUploadResult")
    void upload_ValidFile_ReturnsSuccess() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});
        FileUploadResult result = new FileUploadResult("https://supabase.co/img.png", "avatars/u/img.png", "avatar.png", 3, "image/png");

        when(storageService.uploadFile(any(), eq("avatar.png"), eq("image/png"), eq("avatars"), eq(userId)))
                .thenReturn(result);

        ResponseEntity<ApiResponse<FileUploadResult>> resp = controller.upload(userPrincipal, file, "avatar");

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("https://supabase.co/img.png", resp.getBody().getData().url());
    }

    @Test
    @DisplayName("Upload file rỗng -> ném AppException BAD_REQUEST")
    void upload_EmptyFile_ThrowsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", new byte[0]);

        AppException ex = assertThrows(AppException.class, () -> controller.upload(userPrincipal, file, "avatar"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("FILE_EMPTY", ex.getCode());
    }

    @Test
    @DisplayName("Upload file ảnh định dạng không hỗ trợ (.exe) -> ném INVALID_FILE_TYPE")
    void upload_InvalidFileType_ThrowsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/x-msdownload", new byte[]{1, 2});

        AppException ex = assertThrows(AppException.class, () -> controller.upload(userPrincipal, file, "avatar"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_FILE_TYPE", ex.getCode());
    }

    @Test
    @DisplayName("Upload Avatar -> lưu avatarUrl vào User và trả về 200")
    void uploadAvatar_UpdatesUserAvatar() {
        MockMultipartFile file = new MockMultipartFile("file", "me.jpg", "image/jpeg", new byte[]{1, 2, 3, 4});
        FileUploadResult result = new FileUploadResult("https://supabase.co/me.jpg", "avatars/u/me.jpg", "me.jpg", 4, "image/jpeg");

        when(storageService.uploadFile(any(), eq("me.jpg"), eq("image/jpeg"), eq("avatars"), eq(userId)))
                .thenReturn(result);
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        ResponseEntity<ApiResponse<FileUploadResult>> resp = controller.uploadAvatar(userPrincipal, file);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("https://supabase.co/me.jpg", mockUser.getAvatarUrl());
        verify(userRepository).save(mockUser);
    }

    @Test
    @DisplayName("Bác sĩ upload CCHN -> lưu licenseDocumentUrl vào DoctorProfile")
    void uploadDoctorLicense_UpdatesDoctorProfile() {
        User docUser = new User();
        docUser.setId(userId);
        docUser.setEmail("doctor@example.com");
        docUser.setRole(Role.DOCTOR);
        docUser.setStatus(UserStatus.ACTIVE);
        docUser.setPasswordHash("pass");
        UserPrincipal doctorPrincipal = UserPrincipal.create(docUser);
        DoctorProfile docProfile = new DoctorProfile();
        docProfile.setId(UUID.randomUUID());

        MockMultipartFile file = new MockMultipartFile("file", "cchn.pdf", "application/pdf", new byte[]{1, 2, 3});
        FileUploadResult result = new FileUploadResult("https://supabase.co/cchn.pdf", "licenses/u/cchn.pdf", "cchn.pdf", 3, "application/pdf");

        when(storageService.uploadFile(any(), eq("cchn.pdf"), eq("application/pdf"), eq("licenses"), eq(userId)))
                .thenReturn(result);
        when(doctorProfileRepository.findByUserId(userId)).thenReturn(Optional.of(docProfile));

        ResponseEntity<ApiResponse<FileUploadResult>> resp = controller.uploadDoctorLicense(doctorPrincipal, file);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("https://supabase.co/cchn.pdf", docProfile.getLicenseDocumentUrl());
        verify(doctorProfileRepository).save(docProfile);
    }

    @Test
    @DisplayName("Local fallback /uploads/... được chuẩn hóa thành /api/v1/storage/files/... để Vite proxy hoạt động")
    void uploadAvatar_LocalFallback_RewritesUrlToApiFiles() {
        MockMultipartFile file = new MockMultipartFile("file", "local.jpg", "image/jpg", new byte[]{1, 2, 3});
        FileUploadResult localResult = new FileUploadResult(
                "/uploads/avatars/" + userId + "/abcd_local.jpg",
                "/uploads/avatars/" + userId + "/abcd_local.jpg",
                "local.jpg", 3, "image/jpg");

        when(storageService.uploadFile(any(), eq("local.jpg"), eq("image/jpg"), eq("avatars"), eq(userId)))
                .thenReturn(localResult);
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        ResponseEntity<ApiResponse<FileUploadResult>> resp = controller.uploadAvatar(userPrincipal, file);

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        String expectedUrl = "/api/v1/storage/files/avatars/" + userId + "/abcd_local.jpg";
        assertEquals(expectedUrl, resp.getBody().getData().url());
        assertEquals(expectedUrl, mockUser.getAvatarUrl());
    }

    @Test
    @DisplayName("Upload file đính kèm chat khám online (category=consultation) -> lưu vào thư mục consultations")
    void upload_ConsultationAttachment_ResolvesConsultationsFolder() {
        MockMultipartFile file = new MockMultipartFile("file", "symptom.png", "image/png", new byte[]{1, 2, 3});
        FileUploadResult localResult = new FileUploadResult(
                "/uploads/consultations/" + userId + "/abcd_symptom.png",
                "/uploads/consultations/" + userId + "/abcd_symptom.png",
                "symptom.png", 3, "image/png");

        when(storageService.uploadFile(any(), eq("symptom.png"), eq("image/png"), eq("consultations"), eq(userId)))
                .thenReturn(localResult);

        ResponseEntity<ApiResponse<FileUploadResult>> resp = controller.upload(userPrincipal, file, "consultation");

        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals("/api/v1/storage/files/consultations/" + userId + "/abcd_symptom.png",
                resp.getBody().getData().url());
    }

    @Test
    @DisplayName("serveLocalFile: chặn thư mục medical_documents và path traversal")
    void serveLocalFile_BlocksPrivateFoldersAndTraversal() {
        assertThrows(AppException.class, () -> controller.serveLocalFile("medical_documents", "u1", "secret.pdf"));
        assertThrows(AppException.class, () -> controller.serveLocalFile("avatars", "..", "etc.png"));
    }
}
