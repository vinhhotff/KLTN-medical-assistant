package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.DoctorRegisterRequest;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.EmailVerificationTokenRepository;
import com.mediassist.repository.PasswordResetTokenRepository;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthServiceDoctorRegistrationTest {

    private UserRepository userRepository;
    private PatientProfileRepository patientProfileRepository;
    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider tokenProvider;
    private PasswordResetTokenRepository passwordResetTokenRepository;
    private AuditLogRepository auditLogRepository;
    private ApplicationEventPublisher eventPublisher;
    private EmailVerificationTokenRepository emailVerificationTokenRepository;
    private SecurityRateLimiterService rateLimiterService;
    private DoctorProfileRepository doctorProfileRepository;
    private SpecialtyRepository specialtyRepository;
    private StorageService storageService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        patientProfileRepository = mock(PatientProfileRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokenProvider = mock(JwtTokenProvider.class);
        passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        emailVerificationTokenRepository = mock(EmailVerificationTokenRepository.class);
        rateLimiterService = mock(SecurityRateLimiterService.class);
        doctorProfileRepository = mock(DoctorProfileRepository.class);
        specialtyRepository = mock(SpecialtyRepository.class);
        storageService = mock(StorageService.class);

        authService = new AuthService(
                userRepository, patientProfileRepository, passwordEncoder, tokenProvider,
                passwordResetTokenRepository, auditLogRepository, eventPublisher,
                emailVerificationTokenRepository, rateLimiterService,
                doctorProfileRepository, specialtyRepository, storageService
        );
    }

    @Test
    @DisplayName("Đăng ký bác sĩ multipart kèm Avatar & CCHN -> lưu URL vào User & DoctorProfile")
    void registerDoctorMultipart_UploadsAvatarAndLicense() {
        DoctorRegisterRequest req = new DoctorRegisterRequest();
        req.setEmail("bs.anh@mediassist.local");
        req.setPassword("Doctor@Pass2026!");
        req.setFullName("Nguyễn Minh Anh");
        req.setPhone("0901234567");
        req.setSpecialtySlugs(List.of("cardiology"));

        UUID newUserId = UUID.randomUUID();
        when(userRepository.findByEmail("bs.anh@mediassist.local")).thenReturn(Optional.empty());
        when(userRepository.existsByPhone("0901234567")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pw");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) u.setId(newUserId);
            return u;
        });
        when(specialtyRepository.findBySlug("cardiology")).thenReturn(Optional.of(new Specialty()));
        when(doctorProfileRepository.save(any(DoctorProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tokenProvider.generateAccessToken(any())).thenReturn("jwt-doctor-token");

        MockMultipartFile avatar = new MockMultipartFile("avatar", "portrait.jpg", "image/jpeg", new byte[]{1, 2, 3});
        MockMultipartFile license = new MockMultipartFile("license", "cchn.pdf", "application/pdf", new byte[]{4, 5, 6});

        when(storageService.uploadFile(any(), eq("portrait.jpg"), eq("image/jpeg"), eq("avatars"), eq(newUserId)))
                .thenReturn(new StorageService.FileUploadResult(
                        "https://wakgzrzchmqdqyrgxlaq.supabase.co/storage/v1/object/public/medical-documents/avatars/portrait.jpg",
                        "avatars/portrait.jpg", "portrait.jpg", 3, "image/jpeg"));
        when(storageService.uploadFile(any(), eq("cchn.pdf"), eq("application/pdf"), eq("licenses"), eq(newUserId)))
                .thenReturn(new StorageService.FileUploadResult(
                        "/uploads/licenses/" + newUserId + "/cchn.pdf",
                        "/uploads/licenses/" + newUserId + "/cchn.pdf", "cchn.pdf", 3, "application/pdf"));

        AuthResponse response = authService.registerDoctor(req, avatar, license);

        assertNotNull(response);
        assertEquals("jwt-doctor-token", response.getToken());
        assertEquals(
                "https://wakgzrzchmqdqyrgxlaq.supabase.co/storage/v1/object/public/medical-documents/avatars/portrait.jpg",
                response.getUser().getAvatarUrl());

        verify(doctorProfileRepository).save(argThat(profile ->
                ("/api/v1/storage/files/licenses/" + newUserId + "/cchn.pdf").equals(profile.getLicenseDocumentUrl())));
    }

    @Test
    @DisplayName("Đăng ký bác sĩ multipart với file avatar sai định dạng -> chặn trước khi tạo User")
    void registerDoctorMultipart_InvalidAvatarType_RejectsBeforeSavingUser() {
        DoctorRegisterRequest req = new DoctorRegisterRequest();
        req.setEmail("bs.bad@mediassist.local");
        req.setPassword("Doctor@Pass2026!");
        req.setFullName("Bác sĩ Test");
        req.setPhone("0901234568");

        MockMultipartFile badAvatar = new MockMultipartFile("avatar", "virus.exe", "application/octet-stream", new byte[]{1, 2});

        AppException ex = assertThrows(AppException.class, () -> authService.registerDoctor(req, badAvatar, null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_FILE_TYPE", ex.getCode());
        verify(userRepository, never()).save(any());
        verify(doctorProfileRepository, never()).save(any());
    }
}
