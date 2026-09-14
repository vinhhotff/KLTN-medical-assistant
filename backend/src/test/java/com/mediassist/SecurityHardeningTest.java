package com.mediassist;

import com.mediassist.common.AppException;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.LoginRequest;
import com.mediassist.dto.RegisterRequest;
import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.security.JwtTokenProvider;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AuthService;
import com.mediassist.service.SecurityRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SecurityHardeningTest {

    private UserRepository userRepository;
    private PatientProfileRepository patientProfileRepository;
    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider tokenProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        patientProfileRepository = mock(PatientProfileRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokenProvider = mock(JwtTokenProvider.class);
        authService = new AuthService(userRepository, patientProfileRepository, passwordEncoder, tokenProvider);
    }

    @Test
    @DisplayName("Should increment failed attempts and warn user on wrong password")
    void testWrongPassword_IncrementsAttempts() {
        User user = new User();
        user.setEmail("test@patient.local");
        user.setPasswordHash("hashed_pass");
        user.setRole(Role.PATIENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);

        when(userRepository.findByEmail("test@patient.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPass123", "hashed_pass")).thenReturn(false);

        LoginRequest req = new LoginRequest("test@patient.local", "WrongPass123");
        AppException ex = assertThrows(AppException.class, () -> authService.login(req));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals("INVALID_CREDENTIALS", ex.getCode());
        assertEquals(1, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("Should lock account for 15 minutes after 5 failed login attempts")
    void testAccountLockout_AfterFiveAttempts() {
        User user = new User();
        user.setEmail("hacker@target.local");
        user.setPasswordHash("hashed_pass");
        user.setRole(Role.PATIENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(4); // 4th attempt already failed

        when(userRepository.findByEmail("hacker@target.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("BadPassword", "hashed_pass")).thenReturn(false);

        LoginRequest req = new LoginRequest("hacker@target.local", "BadPassword");
        AppException ex = assertThrows(AppException.class, () -> authService.login(req));

        assertEquals(HttpStatus.LOCKED, ex.getStatus());
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        assertEquals(5, user.getFailedLoginAttempts());
        assertNotNull(user.getLockedUntil());
        assertTrue(user.getLockedUntil().isAfter(LocalDateTime.now().plusMinutes(14)));
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("Should reject login if account is currently locked")
    void testLogin_WhileAccountIsLocked_RejectsImmediately() {
        User user = new User();
        user.setEmail("locked@user.local");
        user.setPasswordHash("hashed_pass");
        user.setRole(Role.PATIENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(5);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10)); // Locked for 10 more minutes

        when(userRepository.findByEmail("locked@user.local")).thenReturn(Optional.of(user));

        LoginRequest req = new LoginRequest("locked@user.local", "AnyPassword");
        AppException ex = assertThrows(AppException.class, () -> authService.login(req));

        assertEquals(HttpStatus.LOCKED, ex.getStatus());
        assertEquals("ACCOUNT_LOCKED", ex.getCode());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    @DisplayName("Should reset failed attempts and lockout on successful login")
    void testSuccessfulLogin_ResetsLockoutCounter() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("patient@mediassist.local");
        user.setPasswordHash("correct_hash");
        user.setFullName("Trần Thị Bình");
        user.setRole(Role.PATIENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(3); // Had 3 failed attempts previously

        when(userRepository.findByEmail("patient@mediassist.local")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Patient@SecurePass2026!", "correct_hash")).thenReturn(true);
        when(tokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("mock_jwt_token");

        LoginRequest req = new LoginRequest("patient@mediassist.local", "Patient@SecurePass2026!");
        AuthResponse resp = authService.login(req);

        assertNotNull(resp);
        assertEquals("mock_jwt_token", resp.getToken());
        assertEquals(0, user.getFailedLoginAttempts());
        assertNull(user.getLockedUntil());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("Should register new patient and auto-create patient profile")
    void testRegisterNewPatient_Success() {
        when(userRepository.findByEmail("newpatient@mediassist.local")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("SecurePass2026!")).thenReturn("encoded_hash");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(patientProfileRepository.save(any(PatientProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tokenProvider.generateAccessToken(any(UserPrincipal.class))).thenReturn("registered_jwt_token");

        RegisterRequest req = new RegisterRequest("newpatient@mediassist.local", "SecurePass2026!", "Nguyễn Hoàng Long", "0911223344");
        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("newpatient@mediassist.local", resp.getUser().getEmail());
        assertEquals("Nguyễn Hoàng Long", resp.getUser().getFullName());
        assertEquals("registered_jwt_token", resp.getToken());
        verify(patientProfileRepository, times(1)).save(any(PatientProfile.class));
    }

    @Test
    @DisplayName("Should enforce IP rate limiting on login attempts")
    void testSecurityRateLimiter_LoginLimit() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        // First 5 attempts allowed
        when(valueOps.increment(startsWith("ratelimit:login:"))).thenReturn(1L, 2L, 3L, 4L, 5L, 6L);

        SecurityRateLimiterService rateLimiter = new SecurityRateLimiterService(redisTemplate);

        assertTrue(rateLimiter.allowLoginAttempt("192.168.1.100"));
        assertTrue(rateLimiter.allowLoginAttempt("192.168.1.100"));
        assertTrue(rateLimiter.allowLoginAttempt("192.168.1.100"));
        assertTrue(rateLimiter.allowLoginAttempt("192.168.1.100"));
        assertTrue(rateLimiter.allowLoginAttempt("192.168.1.100"));
        // 6th attempt blocked!
        assertFalse(rateLimiter.allowLoginAttempt("192.168.1.100"));
    }

    @Test
    @DisplayName("Should enforce IP rate limiting on registration attempts (Anti-Spam / BCrypt DoS)")
    void testSecurityRateLimiter_RegistrationLimit() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        when(valueOps.increment(startsWith("ratelimit:register:"))).thenReturn(1L, 2L, 3L, 4L, 5L, 6L);

        SecurityRateLimiterService rateLimiter = new SecurityRateLimiterService(redisTemplate);

        assertTrue(rateLimiter.allowRegistrationAttempt("10.0.0.1"));
        assertTrue(rateLimiter.allowRegistrationAttempt("10.0.0.1"));
        assertTrue(rateLimiter.allowRegistrationAttempt("10.0.0.1"));
        assertTrue(rateLimiter.allowRegistrationAttempt("10.0.0.1"));
        assertTrue(rateLimiter.allowRegistrationAttempt("10.0.0.1"));
        // 6th attempt blocked!
        assertFalse(rateLimiter.allowRegistrationAttempt("10.0.0.1"));
    }

    @Test
    @DisplayName("JwtAuthenticationFilter should block SUSPENDED user with HTTP 403")
    void testJwtFilter_BlocksSuspendedUser() throws Exception {
        com.mediassist.security.JwtAuthenticationFilter filter =
                new com.mediassist.security.JwtAuthenticationFilter(tokenProvider, userRepository);

        org.springframework.mock.web.MockHttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid_suspended_token");
        org.springframework.mock.web.MockHttpServletResponse response = new org.springframework.mock.web.MockHttpServletResponse();
        jakarta.servlet.FilterChain chain = mock(jakarta.servlet.FilterChain.class);

        UUID userId = UUID.randomUUID();
        when(tokenProvider.validateToken("valid_suspended_token")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("valid_suspended_token")).thenReturn(userId);

        User suspendedUser = new User();
        suspendedUser.setId(userId);
        suspendedUser.setEmail("suspended@mediassist.local");
        suspendedUser.setStatus(UserStatus.SUSPENDED);
        suspendedUser.setRole(Role.PATIENT);
        when(userRepository.findById(userId)).thenReturn(Optional.of(suspendedUser));

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("ACCOUNT_SUSPENDED"));
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("JwtAuthenticationFilter should block LOCKED user with HTTP 423")
    void testJwtFilter_BlocksLockedUser() throws Exception {
        com.mediassist.security.JwtAuthenticationFilter filter =
                new com.mediassist.security.JwtAuthenticationFilter(tokenProvider, userRepository);

        org.springframework.mock.web.MockHttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid_locked_token");
        org.springframework.mock.web.MockHttpServletResponse response = new org.springframework.mock.web.MockHttpServletResponse();
        jakarta.servlet.FilterChain chain = mock(jakarta.servlet.FilterChain.class);

        UUID userId = UUID.randomUUID();
        when(tokenProvider.validateToken("valid_locked_token")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("valid_locked_token")).thenReturn(userId);

        User lockedUser = new User();
        lockedUser.setId(userId);
        lockedUser.setEmail("locked@mediassist.local");
        lockedUser.setStatus(UserStatus.ACTIVE);
        lockedUser.setRole(Role.PATIENT);
        lockedUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findById(userId)).thenReturn(Optional.of(lockedUser));

        filter.doFilter(request, response, chain);

        assertEquals(423, response.getStatus());
        assertTrue(response.getContentAsString().contains("ACCOUNT_LOCKED"));
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("JwtAuthenticationFilter should authenticate ACTIVE user and call filterChain")
    void testJwtFilter_PassesActiveUser() throws Exception {
        com.mediassist.security.JwtAuthenticationFilter filter =
                new com.mediassist.security.JwtAuthenticationFilter(tokenProvider, userRepository);

        org.springframework.mock.web.MockHttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid_active_token");
        org.springframework.mock.web.MockHttpServletResponse response = new org.springframework.mock.web.MockHttpServletResponse();
        jakarta.servlet.FilterChain chain = mock(jakarta.servlet.FilterChain.class);

        UUID userId = UUID.randomUUID();
        when(tokenProvider.validateToken("valid_active_token")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("valid_active_token")).thenReturn(userId);

        User activeUser = new User();
        activeUser.setId(userId);
        activeUser.setEmail("active@mediassist.local");
        activeUser.setStatus(UserStatus.ACTIVE);
        activeUser.setRole(Role.PATIENT);
        activeUser.setFullName("Bệnh nhân An");
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeUser));

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        verify(chain, times(1)).doFilter(request, response);
        assertNotNull(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }
}
