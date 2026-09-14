package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.LoginRequest;
import com.mediassist.dto.UserDto;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
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
}
