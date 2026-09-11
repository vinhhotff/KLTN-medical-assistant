package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.dto.AuthResponse;
import com.mediassist.dto.LoginRequest;
import com.mediassist.dto.UserDto;
import com.mediassist.security.UserPrincipal;
import com.mediassist.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Endpoints đăng nhập, đăng xuất và thông tin người dùng")
public class AuthController {

    private final AuthService authService;
    private final com.mediassist.service.SecurityRateLimiterService rateLimiterService;

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

        // Set Secure HttpOnly Cookie for access token
        Cookie cookie = new Cookie("accessToken", authResponse.getToken());
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Can be set true in production via profile
        cookie.setPath("/");
        cookie.setMaxAge(15 * 60); // 15 mins
        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.success(authResponse, "Đăng nhập thành công"));
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản bệnh nhân mới")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody com.mediassist.dto.RegisterRequest request,
            HttpServletResponse response
    ) {
        AuthResponse authResponse = authService.register(request);

        Cookie cookie = new Cookie("accessToken", authResponse.getToken());
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(15 * 60);
        response.addCookie(cookie);

        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(ApiResponse.success(authResponse, "Đăng ký tài khoản bệnh nhân thành công"));
    }

    @GetMapping("/me")
    @Operation(summary = "Lấy thông tin người dùng hiện tại đang đăng nhập")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserDto userDto = authService.getCurrentUser(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(userDto));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất tài khoản và xóa HttpOnly Cookie")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("accessToken", "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok(ApiResponse.success(null, "Đăng xuất thành công"));
    }
}
