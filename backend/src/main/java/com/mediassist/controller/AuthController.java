package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.common.ClientRequestInfo;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.LoginRequest;
import com.mediassist.dto.TokenValidationResponse;
import com.mediassist.dto.UserDto;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Endpoints đăng nhập, đăng xuất và thông tin người dùng")
public class AuthController {

    static final String FORGOT_PASSWORD_MESSAGE =
            "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (kể cả thư rác).";

    private final AuthService authService;
    private final com.mediassist.service.SecurityRateLimiterService rateLimiterService;

    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    public AuthController(AuthService authService, com.mediassist.service.SecurityRateLimiterService rateLimiterService) {
        this.authService = authService;
        this.rateLimiterService = rateLimiterService;
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập với Email và Mật khẩu")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            jakarta.servlet.http.HttpServletRequest servletRequest,
            HttpServletResponse response
    ) {
        String clientIp = servletRequest.getHeader("X-Forwarded-For");
        if (clientIp != null && !clientIp.isBlank()) {
            clientIp = clientIp.split(",")[0].trim();
        } else {
            clientIp = servletRequest.getRemoteAddr();
        }

        if (!rateLimiterService.allowLoginAttempt(clientIp)) {
            throw new com.mediassist.common.AppException(
                    org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMIT_EXCEEDED",
                    "Bạn đã gửi quá nhiều yêu cầu đăng nhập trong thời gian ngắn. Vui lòng thử lại sau 1 phút."
            );
        }

        AuthResponse authResponse = authService.login(request);

        // Set Secure HttpOnly Cookie with SameSite=Lax for access token (Dual-Transport)
        ResponseCookie cookie = ResponseCookie.from("accessToken", authResponse.getToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMinutes(15))
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success(authResponse, "Đăng nhập thành công"));
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản bệnh nhân mới")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody com.mediassist.dto.RegisterRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse response
    ) {
        String clientIp = servletRequest.getHeader("X-Forwarded-For");
        if (clientIp != null && !clientIp.isBlank()) {
            clientIp = clientIp.split(",")[0].trim();
        } else {
            clientIp = servletRequest.getRemoteAddr();
        }

        if (!rateLimiterService.allowRegistrationAttempt(clientIp)) {
            throw new com.mediassist.common.AppException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "RATE_LIMIT_EXCEEDED",
                    "Bạn đã gửi quá nhiều yêu cầu đăng ký trong thời gian ngắn. Vui lòng thử lại sau 10 phút."
            );
        }

        AuthResponse authResponse = authService.register(request);

        ResponseCookie cookie = ResponseCookie.from("accessToken", authResponse.getToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofMinutes(15))
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(authResponse, "Đăng ký tài khoản bệnh nhân thành công"));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin người dùng hiện tại đang đăng nhập")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            throw new com.mediassist.common.AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập tài khoản");
        }
        UserDto userDto = authService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(userDto));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất tài khoản và xóa HttpOnly Cookie")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("accessToken", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(ApiResponse.success(null, "Đăng xuất thành công"));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Yêu cầu liên kết đặt lại mật khẩu qua email")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody com.mediassist.dto.ForgotPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        if (!rateLimiterService.allowForgotPasswordByIp(ClientRequestInfo.clientIp(servletRequest))) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                    "Bạn đã gửi quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau 15 phút.");
        }
        String email = request.getEmail().trim().toLowerCase();
        // Vuot gioi han theo email: im lang bo qua va van tra CUNG thong bao, khong de lo email co ton tai hay khong
        if (rateLimiterService.allowForgotPasswordByEmail(email)) {
            authService.requestPasswordReset(email);
        }
        return ResponseEntity.ok(ApiResponse.success(null, FORGOT_PASSWORD_MESSAGE));
    }

    @GetMapping("/reset-password/validate")
    @Operation(summary = "Kiểm tra liên kết đặt lại mật khẩu còn hiệu lực")
    public ResponseEntity<ApiResponse<TokenValidationResponse>> validateResetToken(
            @RequestParam(value = "token", required = false) String token,
            HttpServletRequest servletRequest
    ) {
        requireResetTokenRateLimit(servletRequest);
        boolean valid = authService.isPasswordResetTokenValid(token);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(new TokenValidationResponse(valid)));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt mật khẩu mới bằng liên kết trong email")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody com.mediassist.dto.ResetPasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        requireResetTokenRateLimit(servletRequest);
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."));
    }

    private void requireResetTokenRateLimit(HttpServletRequest servletRequest) {
        if (!rateLimiterService.allowResetTokenAttempt(ClientRequestInfo.clientIp(servletRequest))) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED",
                    "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 10 phút.");
        }
    }
}
