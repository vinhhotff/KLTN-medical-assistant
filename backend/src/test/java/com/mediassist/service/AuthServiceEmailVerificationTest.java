package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.RegisterRequest;
import com.mediassist.event.EmailVerificationRequestedEvent;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.EmailVerificationToken;
import com.mediassist.model.entity.PasswordResetToken;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.EmailVerificationTokenRepository;
import com.mediassist.repository.PasswordResetTokenRepository;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.JwtTokenProvider;
import com.mediassist.security.SecureTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthServiceEmailVerificationTest {

    private UserRepository userRepository;
    private PatientProfileRepository patientProfileRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordResetTokenRepository passwordResetTokenRepository;
    private EmailVerificationTokenRepository verificationTokenRepository;
    private AuditLogRepository auditLogRepository;
    private ApplicationEventPublisher eventPublisher;
    private SecurityRateLimiterService rateLimiter;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        patientProfileRepository = mock(PatientProfileRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
        verificationTokenRepository = mock(EmailVerificationTokenRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        rateLimiter = mock(SecurityRateLimiterService.class);
        JwtTokenProvider tokenProvider = mock(JwtTokenProvider.class);
        when(tokenProvider.generateAccessToken(any())).thenReturn("jwt");
        when(rateLimiter.allowVerificationResendBurst(anyString())).thenReturn(true);
        when(rateLimiter.allowVerificationResendHourly(anyString())).thenReturn(true);

        authService = new AuthService(userRepository, patientProfileRepository, passwordEncoder, tokenProvider,
                passwordResetTokenRepository, auditLogRepository, eventPublisher, verificationTokenRepository, rateLimiter);
    }

    private User unverifiedPatient() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("new.patient@example.com");
        user.setFullName("Lê Thị Hoa");
        user.setRole(Role.PATIENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerified(false);
        return user;
    }

    private EmailVerificationToken storedToken(User user, String raw, LocalDateTime expiresAt, LocalDateTime usedAt) {
        EmailVerificationToken token = new EmailVerificationToken(user, SecureTokens.sha256Hex(raw), expiresAt);
        token.setId(UUID.randomUUID());
        token.setUsedAt(usedAt);
        when(verificationTokenRepository.findByTokenHash(SecureTokens.sha256Hex(raw))).thenReturn(Optional.of(token));
        return token;
    }

    @Test
    @DisplayName("Dang ky: tai khoan PATIENT chua xac thuc, van dang nhap ngay, token 24h luu dang hash, phat event gui mail")
    void registerIssuesVerification() {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        RegisterRequest req = new RegisterRequest();
        req.setEmail("New.Patient@Example.com");
        req.setPassword("Password123!");
        req.setFullName("Lê Thị Hoa");
        AuthResponse response = authService.register(req);

        assertFalse(response.getUser().isEmailVerified());
        assertEquals("jwt", response.getToken());

        ArgumentCaptor<EmailVerificationToken> saved = ArgumentCaptor.forClass(EmailVerificationToken.class);
        verify(verificationTokenRepository).save(saved.capture());
        ArgumentCaptor<EmailVerificationRequestedEvent> event = ArgumentCaptor.forClass(EmailVerificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());

        assertEquals("new.patient@example.com", event.getValue().email());
        assertEquals(SecureTokens.sha256Hex(event.getValue().rawToken()), saved.getValue().getTokenHash());
        assertNotEquals(event.getValue().rawToken(), saved.getValue().getTokenHash());
        assertTrue(saved.getValue().getExpiresAt().isAfter(LocalDateTime.now().plusHours(23)));
    }

    @Test
    @DisplayName("verify-email token dung: danh dau verified + thoi diem, tieu thu token, xoa token khac, audit EMAIL_VERIFIED")
    void verifyWithValidToken() {
        User user = unverifiedPatient();
        EmailVerificationToken token = storedToken(user, "good", LocalDateTime.now().plusHours(1), null);

        authService.verifyEmail("good");

        assertTrue(user.isEmailVerified());
        assertNotNull(user.getEmailVerifiedAt());
        assertNotNull(token.getUsedAt());
        verify(verificationTokenRepository).deleteByUserIdAndIdNot(user.getId(), token.getId());
        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(audit.capture());
        assertEquals("EMAIL_VERIFIED", audit.getValue().getAction());
    }

    @Test
    @DisplayName("verify-email token sai: 400 INVALID_TOKEN, user khong doi")
    void verifyWithUnknownToken() {
        when(verificationTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> authService.verifyEmail("wrong"));
        assertEquals("INVALID_TOKEN", ex.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("verify-email token het han: 400 TOKEN_EXPIRED, user van chua xac thuc")
    void verifyWithExpiredToken() {
        User user = unverifiedPatient();
        storedToken(user, "old", LocalDateTime.now().minusMinutes(1), null);

        AppException ex = assertThrows(AppException.class, () -> authService.verifyEmail("old"));
        assertEquals("TOKEN_EXPIRED", ex.getCode());
        assertFalse(user.isEmailVerified());
    }

    @Test
    @DisplayName("Bam lai link sau khi da xac thuc: thanh cong idempotent, khong ghi audit lan 2")
    void verifyTwiceIsIdempotent() {
        User user = unverifiedPatient();
        user.markEmailVerified(LocalDateTime.now().minusMinutes(5));
        storedToken(user, "used", LocalDateTime.now().plusHours(1), LocalDateTime.now().minusMinutes(5));

        assertDoesNotThrow(() -> authService.verifyEmail("used"));
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Resend: gui token moi (vo hieu token cu) va phat event")
    void resendSendsNewToken() {
        User user = unverifiedPatient();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertEquals(AuthService.ResendVerificationResult.SENT, authService.resendVerificationEmail(user.getId()));
        verify(verificationTokenRepository).deleteByUserId(user.getId());
        verify(verificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(eventPublisher).publishEvent(any(EmailVerificationRequestedEvent.class));
    }

    @Test
    @DisplayName("Resend bi rate limit 60 giay: 429, khong tao token, khong gui mail")
    void resendBurstLimited() {
        User user = unverifiedPatient();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(rateLimiter.allowVerificationResendBurst(user.getId().toString())).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () -> authService.resendVerificationEmail(user.getId()));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        verify(verificationTokenRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Resend bi rate limit 5 lan/gio: 429")
    void resendHourlyLimited() {
        User user = unverifiedPatient();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(rateLimiter.allowVerificationResendHourly(user.getId().toString())).thenReturn(false);

        AppException ex = assertThrows(AppException.class, () -> authService.resendVerificationEmail(user.getId()));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Resend khi da xac thuc: tra ALREADY_VERIFIED, khong ton luot rate limit, khong gui mail")
    void resendWhenAlreadyVerified() {
        User user = unverifiedPatient();
        user.markEmailVerified(LocalDateTime.now());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        assertEquals(AuthService.ResendVerificationResult.ALREADY_VERIFIED, authService.resendVerificationEmail(user.getId()));
        verifyNoInteractions(rateLimiter);
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Dat lai mat khau thanh cong cung danh dau email da xac thuc")
    void resetPasswordMarksVerified() {
        User user = unverifiedPatient();
        PasswordResetToken prt = new PasswordResetToken(user, SecureTokens.sha256Hex("reset"), LocalDateTime.now().plusMinutes(10));
        prt.setId(UUID.randomUUID());
        when(passwordResetTokenRepository.findByTokenHash(SecureTokens.sha256Hex("reset"))).thenReturn(Optional.of(prt));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        authService.resetPassword("reset", "NewPassword123");

        assertTrue(user.isEmailVerified());
        assertNotNull(user.getEmailVerifiedAt());
    }

    @Test
    @DisplayName("UserDto tra ve truong emailVerified")
    void userDtoExposesFlag() {
        User user = unverifiedPatient();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        assertFalse(authService.getCurrentUser(user.getId()).isEmailVerified());
        user.markEmailVerified(LocalDateTime.now());
        assertTrue(authService.getCurrentUser(user.getId()).isEmailVerified());
    }

    @Test
    @DisplayName("EmailVerificationGuard: chi chan PATIENT chua xac thuc; bac si/admin khong bi chan")
    void guardOnlyBlocksUnverifiedPatients() {
        User patient = unverifiedPatient();
        AppException ex = assertThrows(AppException.class, () -> EmailVerificationGuard.requireVerifiedPatient(patient));
        assertEquals("EMAIL_NOT_VERIFIED", ex.getCode());
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());

        patient.markEmailVerified(LocalDateTime.now());
        assertDoesNotThrow(() -> EmailVerificationGuard.requireVerifiedPatient(patient));

        User doctor = unverifiedPatient();
        doctor.setRole(Role.DOCTOR);
        assertDoesNotThrow(() -> EmailVerificationGuard.requireVerifiedPatient(doctor));
        User admin = unverifiedPatient();
        admin.setRole(Role.ADMIN);
        assertDoesNotThrow(() -> EmailVerificationGuard.requireVerifiedPatient(admin));
    }
}
