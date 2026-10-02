package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.event.PasswordChangedEvent;
import com.mediassist.event.PasswordResetRequestedEvent;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.PasswordResetToken;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AuditLogRepository;
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

class AuthServicePasswordResetTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordResetTokenRepository tokenRepository;
    private AuditLogRepository auditLogRepository;
    private ApplicationEventPublisher eventPublisher;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokenRepository = mock(PasswordResetTokenRepository.class);
        auditLogRepository = mock(AuditLogRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        authService = new AuthService(userRepository, mock(PatientProfileRepository.class), passwordEncoder,
                mock(JwtTokenProvider.class), tokenRepository, auditLogRepository, eventPublisher);
    }

    private User user(UserStatus status) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("patient@example.com");
        user.setFullName("Nguyễn Văn Nam");
        user.setRole(Role.PATIENT);
        user.setStatus(status);
        return user;
    }

    private PasswordResetToken storedToken(User user, String rawToken, LocalDateTime expiresAt, boolean used) {
        PasswordResetToken token = new PasswordResetToken(user, SecureTokens.sha256Hex(rawToken), expiresAt);
        token.setId(UUID.randomUUID());
        token.setUsed(used);
        when(tokenRepository.findByTokenHash(SecureTokens.sha256Hex(rawToken))).thenReturn(Optional.of(token));
        return token;
    }

    @Test
    @DisplayName("Email khong ton tai: khong tao token, khong phat event gui mail, khong ghi audit")
    void unknownEmail_NoMailNoToken() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> authService.requestPasswordReset("Ghost@Example.com "));

        verify(tokenRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Token luu DB la SHA-256 hash cua token gui qua email, khong phai plaintext; TTL 30 phut")
    void tokenIsStoredHashed() {
        User user = user(UserStatus.ACTIVE);
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(user));

        authService.requestPasswordReset("patient@example.com");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());
        ArgumentCaptor<PasswordResetRequestedEvent> event = ArgumentCaptor.forClass(PasswordResetRequestedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());

        String rawToken = event.getValue().rawToken();
        assertTrue(rawToken.length() >= 43, "32 byte Base64 URL-safe");
        assertTrue(rawToken.matches("[A-Za-z0-9_-]+"), "URL-safe, khong padding");
        assertNotEquals(rawToken, saved.getValue().getTokenHash());
        assertEquals(SecureTokens.sha256Hex(rawToken), saved.getValue().getTokenHash());
        assertEquals(64, saved.getValue().getTokenHash().length());
        assertTrue(saved.getValue().getExpiresAt().isAfter(LocalDateTime.now().plusMinutes(29)));
        assertTrue(saved.getValue().getExpiresAt().isBefore(LocalDateTime.now().plusMinutes(31)));
        assertEquals("patient@example.com", event.getValue().email());

        // Tao token moi thi vo hieu token cu; audit chi ghi khi user ton tai
        verify(tokenRepository).deleteByUserId(user.getId());
        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(audit.capture());
        assertEquals("PASSWORD_RESET_REQUESTED", audit.getValue().getAction());
    }

    @Test
    @DisplayName("Tai khoan SUSPENDED: khong tao token, khong gui mail")
    void suspendedAccount_NoMail() {
        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(user(UserStatus.SUSPENDED)));

        authService.requestPasswordReset("patient@example.com");

        verify(tokenRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Token het han bi tu choi (validate=false, reset nem TOKEN_EXPIRED)")
    void expiredTokenRejected() {
        User user = user(UserStatus.ACTIVE);
        storedToken(user, "expired-token", LocalDateTime.now().minusMinutes(1), false);

        assertFalse(authService.isPasswordResetTokenValid("expired-token"));
        AppException ex = assertThrows(AppException.class, () -> authService.resetPassword("expired-token", "NewPassword123"));
        assertEquals("TOKEN_EXPIRED", ex.getCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Token da dung bi tu choi")
    void usedTokenRejected() {
        User user = user(UserStatus.ACTIVE);
        storedToken(user, "used-token", LocalDateTime.now().plusMinutes(10), true);

        assertFalse(authService.isPasswordResetTokenValid("used-token"));
        AppException ex = assertThrows(AppException.class, () -> authService.resetPassword("used-token", "NewPassword123"));
        assertEquals("TOKEN_EXPIRED", ex.getCode());
    }

    @Test
    @DisplayName("Token khong ton tai bi tu choi voi INVALID_TOKEN")
    void unknownTokenRejected() {
        when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertFalse(authService.isPasswordResetTokenValid("nope"));
        assertFalse(authService.isPasswordResetTokenValid(null));
        AppException ex = assertThrows(AppException.class, () -> authService.resetPassword("nope", "NewPassword123"));
        assertEquals("INVALID_TOKEN", ex.getCode());
    }

    @Test
    @DisplayName("Mat khau moi < 8 ky tu bi tu choi, token khong bi tieu thu")
    void weakPasswordRejected() {
        User user = user(UserStatus.ACTIVE);
        PasswordResetToken token = storedToken(user, "good-token", LocalDateTime.now().plusMinutes(10), false);

        AppException ex = assertThrows(AppException.class, () -> authService.resetPassword("good-token", "1234567"));
        assertEquals("WEAK_PASSWORD", ex.getCode());
        assertFalse(token.isUsed());
    }

    @Test
    @DisplayName("Reset thanh cong: doi mat khau, mo khoa, danh dau token da dung, xoa token khac, audit + email bao doi mat khau")
    void successfulReset() {
        User user = user(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        PasswordResetToken token = storedToken(user, "good-token", LocalDateTime.now().plusMinutes(10), false);
        when(passwordEncoder.encode("NewPassword123")).thenReturn("hashed-new");

        assertTrue(authService.isPasswordResetTokenValid("good-token"));
        authService.resetPassword("good-token", "NewPassword123");

        assertEquals("hashed-new", user.getPasswordHash());
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        assertTrue(token.isUsed());
        verify(tokenRepository).deleteByUserIdAndIdNot(user.getId(), token.getId());

        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(audit.capture());
        assertEquals("PASSWORD_RESET_COMPLETED", audit.getValue().getAction());

        ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertInstanceOf(PasswordChangedEvent.class, event.getValue());
    }

    @Test
    @DisplayName("Tai khoan bi dinh chi sau khi yeu cau: token khong con dung duoc")
    void suspendedAfterRequest_TokenRejected() {
        User user = user(UserStatus.SUSPENDED);
        storedToken(user, "good-token", LocalDateTime.now().plusMinutes(10), false);

        assertFalse(authService.isPasswordResetTokenValid("good-token"));
        assertThrows(AppException.class, () -> authService.resetPassword("good-token", "NewPassword123"));
    }

    @Test
    @DisplayName("SecureTokens: moi lan sinh mot token khac nhau, hash on dinh")
    void secureTokensAreRandom() {
        assertNotEquals(SecureTokens.generate(), SecureTokens.generate());
        assertEquals(SecureTokens.sha256Hex("abc"), SecureTokens.sha256Hex("abc"));
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", SecureTokens.sha256Hex("abc"));
    }
}
