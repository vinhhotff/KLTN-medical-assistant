package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.ForgotPasswordRequest;
import com.mediassist.dto.TokenValidationResponse;
import com.mediassist.service.AuthService;
import com.mediassist.service.SecurityRateLimiterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AuthControllerPasswordResetTest {

    private AuthService authService;
    private SecurityRateLimiterService rateLimiter;
    private AuthController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        authService = mock(AuthService.class);
        rateLimiter = mock(SecurityRateLimiterService.class);
        controller = new AuthController(authService, rateLimiter);
        request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        when(rateLimiter.allowForgotPasswordByIp(anyString())).thenReturn(true);
        when(rateLimiter.allowForgotPasswordByEmail(anyString())).thenReturn(true);
        when(rateLimiter.allowResetTokenAttempt(anyString())).thenReturn(true);
    }

    @Test
    @DisplayName("forgot-password: email ton tai va khong ton tai tra response GIONG HET (chong do tim email)")
    void sameResponseForExistingAndUnknownEmail() {
        ResponseEntity<ApiResponse<Void>> existing = controller.forgotPassword(new ForgotPasswordRequest("patient@mediassist.local"), request);
        ResponseEntity<ApiResponse<Void>> unknown = controller.forgotPassword(new ForgotPasswordRequest("ghost@example.com"), request);

        assertEquals(existing.getStatusCode(), unknown.getStatusCode());
        assertEquals(HttpStatus.OK, unknown.getStatusCode());
        assertEquals(existing.getBody().getMessage(), unknown.getBody().getMessage());
        assertEquals(AuthController.FORGOT_PASSWORD_MESSAGE, unknown.getBody().getMessage());
        assertNull(unknown.getBody().getData());
    }

    @Test
    @DisplayName("forgot-password: email duoc chuan hoa lowercase/trim truoc khi rate limit va xu ly")
    void normalizesEmail() {
        controller.forgotPassword(new ForgotPasswordRequest("  Patient@MediAssist.local "), request);

        verify(rateLimiter).allowForgotPasswordByEmail("patient@mediassist.local");
        verify(authService).requestPasswordReset("patient@mediassist.local");
    }

    @Test
    @DisplayName("forgot-password: vuot gioi han theo EMAIL -> khong gui, van tra cung thong bao 200")
    void emailLimitIsSilent() {
        when(rateLimiter.allowForgotPasswordByEmail(anyString())).thenReturn(false);

        ResponseEntity<ApiResponse<Void>> response = controller.forgotPassword(new ForgotPasswordRequest("patient@mediassist.local"), request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(AuthController.FORGOT_PASSWORD_MESSAGE, response.getBody().getMessage());
        verify(authService, never()).requestPasswordReset(anyString());
    }

    @Test
    @DisplayName("forgot-password: vuot gioi han theo IP -> 429")
    void ipLimitReturns429() {
        when(rateLimiter.allowForgotPasswordByIp("10.0.0.1")).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> controller.forgotPassword(new ForgotPasswordRequest("patient@mediassist.local"), request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        verify(authService, never()).requestPasswordReset(anyString());
    }

    @Test
    @DisplayName("validate: tra {valid} va Cache-Control no-store")
    void validateReturnsFlag() {
        when(authService.isPasswordResetTokenValid("tok")).thenReturn(true);

        ResponseEntity<ApiResponse<TokenValidationResponse>> response = controller.validateResetToken("tok", request);

        assertTrue(response.getBody().getData().isValid());
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }
}
