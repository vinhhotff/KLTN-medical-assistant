"""
Part 3 of SDD Generator: Section 3 Detailed Design (Features 3.1 to 3.10 - Auth, Security, Profile, Triage, Doctor Search).
"""

def get_part3_content():
    return '''### 3. Detailed Design

Phần này đặc tả chi tiết thiết kế phần mềm ở cấp độ cài đặt (Detailed Design) cho 28 quy trình nghiệp vụ cốt lõi của hệ thống MediAssist-AI. Mỗi quy trình bao gồm:
1. **Biểu đồ lớp (Class Diagram)** thể hiện cấu trúc quan hệ giữa Controller, Service, Repository, DTO, Entity và Security Guard.
2. **Biểu đồ tuần tự luồng chính (Main/Success Flow Sequence Diagram)** mô tả chi tiết tương tác giữa các thành phần khi dữ liệu hợp lệ.
3. **Biểu đồ tuần tự luồng ngoại lệ/thất bại (Alternative/Error Flow Sequence Diagram)** mô tả cách hệ thống phát hiện vi phạm, kích hoạt phòng thủ an ninh và phản hồi mã lỗi chuẩn y tế `AppException`.

---

#### 3.1 Authentication with Stateless Dual-Transport JWT (Login)

##### 3.1.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +login(LoginRequest request, HttpServletResponse response) ResponseEntity~AuthResponse~
    }
    class AuthService {
        -AuthenticationManager authenticationManager
        -JwtTokenProvider jwtTokenProvider
        -UserRepository userRepository
        -AuditLogService auditLogService
        +authenticateUser(LoginRequest request, HttpServletResponse response) AuthResponse
    }
    class JwtTokenProvider {
        -String jwtSecret
        -long jwtExpirationMs
        -long refreshExpirationMs
        +generateAccessToken(Authentication authentication) String
        +generateRefreshToken(Authentication authentication) String
        +createHttpOnlyCookie(String token) ResponseCookie
    }
    class UserRepository {
        +findByEmail(String email) Optional~User~
        +save(User user) User
    }
    class User {
        -UUID id
        -String email
        -String passwordHash
        -Role role
        -String status
        -int failedLoginAttempts
        -LocalDateTime lockedUntil
    }
    class LoginRequest {
        -String email
        -String password
    }
    class AuthResponse {
        -String accessToken
        -UserDto user
    }

    AuthController --> AuthService
    AuthService --> JwtTokenProvider
    AuthService --> UserRepository
    UserRepository --> User
    AuthController ..> LoginRequest
    AuthController ..> AuthResponse
```

##### 3.1.2. Sequence Diagram: Successful Authentication & Dual-Transport Token Issuance
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân (Client)
    participant UI as React 18 SPA (LoginPage)
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Mgr as AuthenticationManager
    participant Token as JwtTokenProvider
    participant DB as PostgreSQL (users)
    participant Audit as AuditLogService

    Patient->>UI: Nhập Email và Mật khẩu, nhấn "Đăng nhập"
    UI->>Ctrl: POST /api/v1/auth/login (LoginRequest)
    Ctrl->>Svc: authenticateUser(request, response)
    Svc->>DB: findByEmail(request.getEmail())
    DB-->>Svc: User Entity (Active, email_verified=true)
    Svc->>Mgr: authenticate(UsernamePasswordAuthenticationToken)
    Mgr-->>Svc: Authentication (Xác thực thành công qua BCrypt)
    Svc->>Token: generateAccessToken(auth)
    Token-->>Svc: accessToken (Bearer JWT, hạn 60 phút)
    Svc->>Token: generateRefreshToken(auth)
    Token-->>Svc: refreshToken (JWT, hạn 7 ngày)
    Svc->>Token: createHttpOnlyCookie(refreshToken)
    Token-->>Svc: Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax
    Svc->>DB: resetFailedLoginAttempts(user.getId())
    Svc->>Audit: logAction("LOGIN", user.getId(), "Thành công", ipAddress)
    Svc-->>Ctrl: AuthResponse(accessToken, userDto)
    Ctrl-->>UI: 200 OK + Set-Cookie Header + JSON Body (accessToken)
    UI->>UI: Lưu accessToken vào Bộ nhớ RAM / Axios Header
    UI-->>Patient: Chuyển hướng tới /patient/dashboard
```

##### 3.1.3. Sequence Diagram: Invalid Credentials Failure & Account Lockout Guard
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Người dùng / Kẻ tấn công
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Mgr as AuthenticationManager
    participant DB as PostgreSQL (users)
    participant Audit as AuditLogService

    Attacker->>UI: Nhập sai mật khẩu liên tiếp (lần 5)
    UI->>Ctrl: POST /api/v1/auth/login
    Ctrl->>Svc: authenticateUser(request, response)
    Svc->>DB: findByEmail(request.getEmail())
    DB-->>Svc: User Entity (failedLoginAttempts = 4)
    Svc->>Mgr: authenticate(...)
    Mgr-->>Svc: BadCredentialsException
    Svc->>DB: incrementFailedLoginAttempts() -> 5
    Note over Svc,DB: Đạt ngưỡng 5 lần: lockedUntil = NOW() + 15 phút
    Svc->>DB: updateLockoutStatus(lockedUntil)
    Svc->>Audit: logSecurityAlert("ACCOUNT_LOCKOUT_TRIGGERED", ipAddress)
    Svc-->>Ctrl: throw AppException(ACCOUNT_LOCKED_15_MINUTES)
    Ctrl-->>UI: 401 Unauthorized (Error JSON: "Tài khoản bị tạm khóa 15 phút")
    UI-->>Attacker: Hiển thị cảnh báo khóa tài khoản & vô hiệu hóa nút bấm
```

---

#### 3.2 Patient Registration with Email Verification Gate

##### 3.2.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +registerPatient(RegisterRequest request) ResponseEntity~ApiResponse~
        +verifyEmail(String token) ResponseEntity~ApiResponse~
    }
    class AuthService {
        -UserRepository userRepository
        -PasswordEncoder passwordEncoder
        -EmailVerificationService emailVerificationService
        +registerPatient(RegisterRequest request) User
    }
    class EmailVerificationService {
        -EmailVerificationTokenRepository tokenRepo
        -EmailService emailService
        +createAndSendVerificationToken(User user) void
        +verifyToken(String rawToken) boolean
    }
    class EmailVerificationToken {
        -UUID id
        -UUID userId
        -String tokenHash
        -Instant expiresAt
        -Instant usedAt
    }

    AuthController --> AuthService
    AuthService --> EmailVerificationService
    EmailVerificationService --> EmailVerificationToken
```

##### 3.2.2. Sequence Diagram: Successful Registration & Verification Email Dispatch
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân mới
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant VerifySvc as EmailVerificationService
    participant DB as PostgreSQL (users, email_verification_tokens)
    participant Mail as EmailService (@Async)

    Patient->>UI: Điền thông tin họ tên, email, mật khẩu
    UI->>Ctrl: POST /api/v1/auth/register (RegisterRequest)
    Ctrl->>Svc: registerPatient(request)
    Svc->>DB: existsByEmail(request.getEmail())
    DB-->>Svc: false
    Svc->>Svc: passwordEncoder.encode(password) -> BCrypt
    Svc->>DB: save(User: email_verified=false, status=PENDING_VERIFICATION)
    DB-->>Svc: User Entity Saved
    Svc->>VerifySvc: createAndSendVerificationToken(user)
    VerifySvc->>VerifySvc: Sinh token ngẫu nhiên UUIDv4 (rawToken)
    VerifySvc->>VerifySvc: Tính mã băm SHA-256(rawToken) -> tokenHash
    VerifySvc->>DB: save(EmailVerificationToken: tokenHash, expiresAt=NOW+24h)
    VerifySvc->>Mail: sendActivationEmail(user.getEmail(), rawToken)
    Note over Mail: Luồng ảo Project Loom phát thư nền qua SMTP
    Svc-->>Ctrl: "Đăng ký thành công. Vui lòng kiểm tra hộp thư."
    Ctrl-->>UI: 201 Created (ApiResponse)
    UI-->>Patient: Hiển thị thông báo kiểm tra email để kích hoạt
```

##### 3.2.3. Sequence Diagram: Duplicate Email / Validation Failure
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant DB as PostgreSQL (users)

    Patient->>UI: Đăng ký với email đã tồn tại trong hệ thống
    UI->>Ctrl: POST /api/v1/auth/register
    Ctrl->>Svc: registerPatient(request)
    Svc->>DB: existsByEmail(request.getEmail())
    DB-->>Svc: true
    Svc-->>Ctrl: throw AppException(EMAIL_ALREADY_EXISTS)
    Ctrl-->>UI: 409 Conflict (Error: "Địa chỉ email đã được sử dụng")
    UI-->>Patient: Hiển thị thông báo lỗi trùng email trên form
```

---

#### 3.3 Google OAuth2 Single Sign-On (SSO) Flow

##### 3.3.1. Class Diagram
```mermaid
classDiagram
    class OAuth2AuthenticationSuccessHandler {
        -JwtTokenProvider jwtTokenProvider
        -UserRepository userRepository
        -HttpCookieOAuth2AuthorizationRequestRepository cookieRepo
        +onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth) void
    }
    class CustomOAuth2UserService {
        -UserRepository userRepository
        +loadUser(OAuth2UserRequest userRequest) OAuth2User
        -processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) OAuth2User
    }
    class User {
        -UUID id
        -String email
        -String fullName
        -String avatarUrl
        -boolean emailVerified
    }

    OAuth2AuthenticationSuccessHandler --> JwtTokenProvider
    OAuth2AuthenticationSuccessHandler --> UserRepository
    CustomOAuth2UserService --> UserRepository
    UserRepository --> User
```

##### 3.3.2. Sequence Diagram: Successful Google OAuth2 Exchange & Auto-Provisioning
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Browser as Trình duyệt web
    participant Google as Google Identity Server
    participant Backend as Spring Security OAuth2 Client
    participant Handler as OAuth2AuthenticationSuccessHandler
    participant DB as PostgreSQL (users)
    participant Token as JwtTokenProvider

    User->>Browser: Nhấp "Đăng nhập với Google"
    Browser->>Google: Điều hướng tới OAuth2 Consent Screen
    User->>Google: Cấp quyền thông tin hồ sơ (Email, FullName, Avatar)
    Google->>Backend: Redirect /login/oauth2/code/google?code=AUTH_CODE
    Backend->>Google: Trao đổi AUTH_CODE lấy ID Token & Access Token
    Google-->>Backend: GoogleUserInfo (email, name, picture)
    Backend->>DB: findByEmail(googleUser.email)
    alt Người dùng chưa tồn tại
        Backend->>DB: INSERT INTO users (email, full_name, avatar_url, role='PATIENT', email_verified=true, password_hash=NULL)
    else Người dùng đã tồn tại
        Backend->>DB: UPDATE users SET avatar_url=..., email_verified=true
    end
    Backend->>Handler: onAuthenticationSuccess(...)
    Handler->>Token: generateAccessToken(user) & generateRefreshToken(user)
    Handler->>Browser: Set-Cookie: refresh_token=...; Redirect /oauth2/callback?token=ACCESS_TOKEN
    Browser->>Browser: Lưu accessToken & điều hướng người dùng vào Dashboard
```

##### 3.3.3. Sequence Diagram: OAuth2 Token Exchange Failure / State Tampering
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ can thiệp
    participant Browser as Trình duyệt
    participant Backend as Spring Security OAuth2
    participant ErrorHandler as OAuth2AuthenticationFailureHandler

    Attacker->>Browser: Giả mạo state parameter trong callback OAuth2
    Browser->>Backend: GET /login/oauth2/code/google?state=INVALID_STATE
    Backend->>Backend: Kiểm tra state với session cookie thất bại
    Backend->>ErrorHandler: onAuthenticationFailure(OAuth2AuthenticationException)
    ErrorHandler->>Browser: Redirect /login?error=oauth2_state_mismatch
    Browser-->>Attacker: Hiển thị cảnh báo lỗi xác thực Google an toàn
```

---

#### 3.4 Forgot Password with SHA-256 Token Hash

##### 3.4.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -PasswordResetService passwordResetService
        +forgotPassword(ForgotPasswordRequest request) ResponseEntity~ApiResponse~
    }
    class PasswordResetService {
        -UserRepository userRepository
        -PasswordResetTokenRepository tokenRepo
        -EmailService emailService
        +sendResetToken(String email) void
    }
    class PasswordResetToken {
        -UUID id
        -UUID userId
        -String tokenHash
        -Instant expiresAt
        -boolean used
    }

    AuthController --> PasswordResetService
    PasswordResetService --> PasswordResetToken
```

##### 3.4.2. Sequence Diagram: Password Reset Request & SHA-256 Hashed Token Email
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA (ForgotPasswordPage)
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (users, password_reset_tokens)
    participant Mail as EmailService (@Async)

    User->>UI: Nhập email cần khôi phục mật khẩu
    UI->>Ctrl: POST /api/v1/auth/forgot-password (ForgotPasswordRequest)
    Ctrl->>Svc: sendResetToken(email)
    Svc->>DB: findByEmail(email)
    DB-->>Svc: User Entity
    Svc->>Svc: Sinh token ngẫu nhiên UUIDv4 (rawToken)
    Svc->>Svc: Tính mã băm SHA-256(rawToken) -> tokenHash
    Svc->>DB: save(PasswordResetToken: tokenHash, expiresAt=NOW+15m, used=false)
    Svc->>Mail: sendPasswordResetEmail(user.getEmail(), rawToken)
    Svc-->>Ctrl: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi."
    Ctrl-->>UI: 200 OK (Bảo toàn nguyên tắc chống dò vết tài khoản User Enumeration)
    UI-->>User: Hiển thị thông báo kiểm tra hòm thư
```

##### 3.4.3. Sequence Diagram: Non-Existent Email / Rate Limit Rejection
```mermaid
sequenceDiagram
    autonumber
    actor User as Kẻ dò tìm tài khoản
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (users)

    User->>UI: Gửi yêu cầu với email không tồn tại trong hệ thống
    UI->>Ctrl: POST /api/v1/auth/forgot-password
    Ctrl->>Svc: sendResetToken(email)
    Svc->>DB: findByEmail(email)
    DB-->>Svc: Optional.empty()
    Note over Svc: Không phát sinh token, không gửi email
    Svc-->>Ctrl: Trả về thành công ảo (Generic Success)
    Ctrl-->>UI: 200 OK (Chống kẻ tấn công biết email có trong CSDL hay không)
```

---

#### 3.5 Reset Password with Cryptographic Token Verification

##### 3.5.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -PasswordResetService passwordResetService
        +resetPassword(ResetPasswordRequest request) ResponseEntity~ApiResponse~
    }
    class PasswordResetService {
        -PasswordResetTokenRepository tokenRepo
        -UserRepository userRepository
        -PasswordEncoder passwordEncoder
        +resetPassword(String rawToken, String newPassword) void
    }
    class ResetPasswordRequest {
        -String token
        -String newPassword
    }

    AuthController --> PasswordResetService
    AuthController ..> ResetPasswordRequest
```

##### 3.5.2. Sequence Diagram: Successful Password Reset & BCrypt Hashing
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA (ResetPasswordPage)
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (password_reset_tokens, users)

    User->>UI: Nhập mật khẩu mới và gửi token từ link email
    UI->>Ctrl: POST /api/v1/auth/reset-password (rawToken, newPassword)
    Ctrl->>Svc: resetPassword(rawToken, newPassword)
    Svc->>Svc: Tính mã băm SHA-256(rawToken) -> tokenHash
    Svc->>DB: findByTokenHash(tokenHash)
    DB-->>Svc: PasswordResetToken Entity (used=false, expiresAt > NOW)
    Svc->>Svc: passwordEncoder.encode(newPassword) -> newHash
    Svc->>DB: UPDATE users SET password_hash = newHash, updated_at = NOW
    Svc->>DB: UPDATE password_reset_tokens SET used = true
    Svc-->>Ctrl: "Đặt lại mật khẩu thành công"
    Ctrl-->>UI: 200 OK
    UI-->>User: Chuyển hướng tới trang Đăng nhập
```

##### 3.5.3. Sequence Diagram: Expired or Previously Used Token Rejection
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (password_reset_tokens)

    User->>UI: Sử dụng lại link đã nhấn trước đó (used=true)
    UI->>Ctrl: POST /api/v1/auth/reset-password
    Ctrl->>Svc: resetPassword(rawToken, newPassword)
    Svc->>Svc: Tính SHA-256(rawToken)
    Svc->>DB: findByTokenHash(tokenHash)
    DB-->>Svc: Token Entity (used=true)
    Svc-->>Ctrl: throw AppException(INVALID_OR_EXPIRED_RESET_TOKEN)
    Ctrl-->>UI: 400 Bad Request (Error: "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng")
    UI-->>User: Hiển thị thông báo yêu cầu gửi lại yêu cầu mới
```

---

#### 3.6 Token Refresh & Sliding Session Rotation

##### 3.6.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +refreshToken(HttpServletRequest req, HttpServletResponse res) ResponseEntity~AuthResponse~
    }
    class AuthService {
        -JwtTokenProvider jwtTokenProvider
        -UserRepository userRepository
        +rotateRefreshToken(String rawRefreshToken, HttpServletResponse res) AuthResponse
    }
    class JwtTokenProvider {
        +validateToken(String token) boolean
        +getUserEmailFromToken(String token) String
        +generateAccessToken(Authentication auth) String
        +generateRefreshToken(Authentication auth) String
    }

    AuthController --> AuthService
    AuthService --> JwtTokenProvider
```

##### 3.6.2. Sequence Diagram: Successful Refresh Token Rotation via HttpOnly Cookie
```mermaid
sequenceDiagram
    autonumber
    actor Browser as Trình duyệt (Axios Interceptor)
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Token as JwtTokenProvider
    participant DB as PostgreSQL (users)

    Browser->>Ctrl: POST /api/v1/auth/refresh (Cookie: refresh_token=OLD_REFRESH_TOKEN)
    Ctrl->>Svc: rotateRefreshToken(cookieToken, response)
    Svc->>Token: validateToken(OLD_REFRESH_TOKEN)
    Token-->>Svc: true (Hợp lệ, chưa hết hạn)
    Svc->>Token: getUserEmailFromToken(OLD_REFRESH_TOKEN)
    Token-->>Svc: email
    Svc->>DB: findByEmail(email)
    DB-->>Svc: User Entity (Active)
    Svc->>Token: generateAccessToken(user) -> newAccessToken
    Svc->>Token: generateRefreshToken(user) -> newRefreshToken
    Svc->>Ctrl: Set-Cookie: refresh_token=newRefreshToken; HttpOnly; Secure; SameSite=Lax
    Ctrl-->>Browser: 200 OK + JSON Body: { accessToken: newAccessToken }
    Browser->>Browser: Tiếp tục gửi lại yêu cầu API vừa bị 401
```

##### 3.6.3. Sequence Diagram: Revoked / Tampered Refresh Token (Security Alert)
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ tấn công
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Token as JwtTokenProvider
    participant Audit as AuditLogService

    Attacker->>Ctrl: POST /api/v1/auth/refresh (Cookie giả mạo / đã hết hạn)
    Ctrl->>Svc: rotateRefreshToken(tamperedToken, response)
    Svc->>Token: validateToken(tamperedToken)
    Token-->>Svc: false (Chữ ký HMAC không khớp hoặc Token Expired)
    Svc->>Audit: logSecurityEvent("TOKEN_THEFT_OR_TAMPERING_DETECTED", ipAddress)
    Svc-->>Ctrl: throw AppException(UNAUTHORIZED_INVALID_REFRESH_TOKEN)
    Ctrl-->>Attacker: 401 Unauthorized + Set-Cookie: refresh_token=; Max-Age=0
```

---

#### 3.7 Secure Logout & Refresh Cookie Invalidation

##### 3.7.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +logout(HttpServletResponse response) ResponseEntity~ApiResponse~
    }
    class AuthService {
        -AuditLogService auditLogService
        +logout(UUID currentUserId, HttpServletResponse response) void
    }

    AuthController --> AuthService
```

##### 3.7.2. Sequence Diagram: Successful Logout & Cookie Clearing
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Audit as AuditLogService

    Patient->>UI: Nhấn nút "Đăng xuất"
    UI->>Ctrl: POST /api/v1/auth/logout (Bearer accessToken)
    Ctrl->>Svc: logout(userId, response)
    Svc->>Audit: logAction("LOGOUT", userId, "Đăng xuất an toàn", ipAddress)
    Svc->>Ctrl: Set-Cookie: refresh_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax
    Ctrl-->>UI: 200 OK (Thành công)
    UI->>UI: Xóa accessToken trong RAM, xóa toàn bộ bộ đệm ứng dụng
    UI-->>Patient: Chuyển hướng về trang chủ LandingPage
```

##### 3.7.3. Sequence Diagram: Expired Session Logout
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController

    User->>UI: Nhấn Đăng xuất khi phiên đã hết hạn từ lâu
    UI->>Ctrl: POST /api/v1/auth/logout
    Note over Ctrl: Không cần xác thực Bearer token bắt buộc khi đăng xuất
    Ctrl-->>UI: 200 OK + Header Max-Age=0 xóa cookie
    UI-->>User: Xóa sạch bộ nhớ cục bộ và trở về màn hình đăng nhập
```

---

#### 3.8 Update User Profile & Notification Preferences

##### 3.8.1. Class Diagram
```mermaid
classDiagram
    class UserController {
        -UserService userService
        +updateProfile(UpdateProfileRequest request, UserPrincipal principal) ResponseEntity~UserProfileDto~
    }
    class UserService {
        -UserRepository userRepository
        -PatientProfileRepository patientRepo
        +updateUserProfile(UUID userId, UpdateProfileRequest request) UserProfileDto
    }
    class UpdateProfileRequest {
        -String fullName
        -String phone
        -String address
        -String emergencyContactPhone
    }

    UserController --> UserService
    UserController ..> UpdateProfileRequest
```

##### 3.8.2. Sequence Diagram: Successful Profile & Demographic Update
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as UserController
    participant Svc as UserService
    participant DB as PostgreSQL (users, patient_profiles)

    Patient->>UI: Cập nhật số điện thoại, địa chỉ và lưu
    UI->>Ctrl: PUT /api/v1/users/me/profile (UpdateProfileRequest)
    Ctrl->>Svc: updateUserProfile(userId, request)
    Svc->>DB: findByUserId(userId)
    DB-->>Svc: User & PatientProfile Entities
    Svc->>DB: UPDATE users SET full_name=..., phone=...
    Svc->>DB: UPDATE patient_profiles SET address=..., emergency_contact_phone=...
    DB-->>Svc: Cập nhật thành công
    Svc-->>Ctrl: UserProfileDto
    Ctrl-->>UI: 200 OK + DTO mới
    UI-->>Patient: Hiển thị thông báo "Cập nhật hồ sơ thành công"
```

##### 3.8.3. Sequence Diagram: Validation Error / Unauthorized Access
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as UserController

    Patient->>UI: Nhập số điện thoại sai định dạng (ví dụ: chứa chữ cái)
    UI->>Ctrl: PUT /api/v1/users/me/profile
    Note over Ctrl: Kích hoạt Jakarta Validation (@Pattern)
    Ctrl-->>UI: 400 Bad Request (FieldError: "Số điện thoại không hợp lệ")
    UI-->>Patient: Hiển thị viền đỏ và thông báo lỗi tại ô nhập liệu
```

---

#### 3.9 AI Symptom Triage Analysis & 5-Stage Clinical Defense

##### 3.9.1. Class Diagram
```mermaid
classDiagram
    class SymptomTriageController {
        -SymptomTriageService triageService
        +analyzeSymptoms(TriageRequest request) ResponseEntity~TriageResponse~
    }
    class SymptomTriageService {
        -EmergencyKeywordDetector emergencyDetector
        -VietnameseSlangNormalizer slangNormalizer
        -NegationEngine negExEngine
        -GeminiVisionClient geminiClient
        -TriageSessionRepository sessionRepo
        +processTriage(TriageRequest request) TriageResponse
    }
    class TriageResponse {
        -boolean isEmergency
        -TriageUrgency urgencyLevel
        -String primarySpecialty
        -String sbarSummary
        -String aiAdvice
    }

    SymptomTriageController --> SymptomTriageService
    SymptomTriageService --> TriageResponse
```

##### 3.9.2. Sequence Diagram: Standard Symptom Analysis & Multi-Specialty Routing
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (SymptomTriagePage)
    participant Ctrl as SymptomTriageController
    participant Svc as SymptomTriageService
    participant Slang as VietnameseSlangNormalizer
    participant NegEx as NegationEngine (Vietnamese NegEx)
    participant AI as Google Gemini 1.5 Flash
    participant DB as PostgreSQL (triage_sessions)

    Patient->>UI: Nhập: "Tôi bị đau tức ngực âm ỉ 3 ngày, nhưng không khó thở, không sốt"
    UI->>Ctrl: POST /api/v1/triage/analyze (TriageRequest)
    Ctrl->>Svc: processTriage(request)
    Svc->>Svc: Stage 1: Kiểm tra từ khóa cấp cứu tối khẩn -> False
    Svc->>Slang: Stage 2: Chuẩn hóa teen-code & phương ngữ
    Slang-->>Svc: Văn bản y khoa chuẩn hóa
    Svc->>NegEx: Stage 3: Bóc tách mệnh đề phủ định
    Note over NegEx: Mệnh đề khẳng định: "đau tức ngực âm ỉ 3 ngày"<br/>Mệnh đề phủ định cách ly: "không khó thở", "không sốt"
    NegEx-->>Svc: CleanAffirmedSymptoms: "đau tức ngực âm ỉ 3 ngày"
    Svc->>AI: Stage 5: Gửi prompt cấu trúc lâm sàng SBAR tới Gemini Flash
    AI-->>Svc: JSON (PrimarySpecialty: Tim mạch, Urgency: URGENT, SBAR)
    Svc->>DB: INSERT INTO triage_sessions (...)
    DB-->>Svc: Session Saved
    Svc-->>Ctrl: TriageResponse (Specialty: Tim mạch, Khuyến nghị bác sĩ)
    Ctrl-->>UI: 200 OK + TriageResponse
    UI-->>Patient: Hiển thị kết quả phân luồng, huy hiệu Vàng (Khẩn) & Nút "Đặt lịch chuyên khoa Tim mạch"
```

##### 3.9.3. Sequence Diagram: Stage 1 Acute Red-Flag Emergency Lockout (Hotline 115)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân khẩn cấp
    participant UI as React 18 SPA
    participant Ctrl as SymptomTriageController
    participant Svc as SymptomTriageService
    participant DB as PostgreSQL (triage_sessions)

    Patient->>UI: Nhập: "Bố tôi bị méo miệng, liệt nửa người, nói ngọng đột ngột"
    UI->>Ctrl: POST /api/v1/triage/analyze
    Ctrl->>Svc: processTriage(request)
    Note over Svc: Stage 1: Khớp biểu thức Regex Dấu hiệu đột quỵ FAST (Cấp cứu tối khẩn)
    Svc->>DB: save(TriageSession: is_emergency=true, urgency=EMERGENCY)
    Svc-->>Ctrl: TriageResponse(isEmergency=true, aiAdvice="GỌI NGAY CẤP CỨU 115 HOẶC ĐẾN BỆNH VIỆN GẦN NHẤT")
    Ctrl-->>UI: 200 OK + Khóa toàn bộ tính năng đặt lịch khám thường
    UI-->>Patient: Hiển thị cảnh báo ĐỎ TOÀN MÀN HÌNH + Nút bấm gọi nhanh 115
```

---

#### 3.10 Doctor Semantic Vector Search & Hybrid Re-ranking (pgvector + WHRF)

##### 3.10.1. Class Diagram
```mermaid
classDiagram
    class DoctorSearchController {
        -DoctorSemanticSearchService searchService
        +searchDoctors(DoctorSearchRequest request) ResponseEntity~List~DoctorCardDto~~
    }
    class DoctorSemanticSearchService {
        -OpenAIClient openAiClient
        -DoctorProfileRepository doctorRepo
        -SpecialtyRepository specialtyRepo
        +hybridSearch(DoctorSearchRequest request) List~DoctorCardDto~
        -calculateWhrfScore(DoctorProfile doc, double cosineSim) double
    }
    class DoctorCardDto {
        -UUID doctorId
        -String fullName
        -String academicTitle
        -double rating
        -int reviewCount
        -double whrfScore
    }

    DoctorSearchController --> DoctorSemanticSearchService
    DoctorSemanticSearchService --> DoctorCardDto
```

##### 3.10.2. Sequence Diagram: HNSW Vector Search + Sigmoid Contrastive Re-Ranking
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (DoctorSearchPage)
    participant Ctrl as DoctorSearchController
    participant Svc as DoctorSemanticSearchService
    participant AI as OpenAI API (text-embedding-3-small)
    participant DB as PostgreSQL (doctor_profiles + pgvector HNSW)

    Patient->>UI: Nhập tìm kiếm: "Bác sĩ chữa đau nửa đầu mãn tính và mất ngủ"
    UI->>Ctrl: POST /api/v1/doctors/semantic-search
    Ctrl->>Svc: hybridSearch(request)
    Svc->>AI: generateEmbedding("Bác sĩ chữa đau nửa đầu mãn tính và mất ngủ")
    AI-->>Svc: Vector float[1536] (queryVector)
    Svc->>DB: SET LOCAL hnsw.ef_search = 120;<br/>SELECT id, bio, 1 - (bio_embedding <=> queryVector) AS cosine_sim FROM doctor_profiles WHERE is_verified=true ORDER BY bio_embedding <=> queryVector LIMIT 20;
    DB-->>Svc: Top 20 Doctor Profiles với Cosine Similarity thực tế
    loop Với từng bác sĩ trong Top 20
        Svc->>Svc: Tính Sigmoid Contrastive Sharpening: S_dense = 1 / (1 + exp(-8.0 * (CosineSim - 0.65)))
        Svc->>Svc: Tính Credibility Damper: W_cred = log10(review_count + 1) / log10(100)
        Svc->>Svc: Tính WHRF Score tổng hợp
    end
    Svc->>Svc: Sắp xếp qua Priority Queue Min-Heap lấy Top 10 bác sĩ điểm cao nhất
    Svc-->>Ctrl: Danh sách Top 10 Bác sĩ kèm điểm phù hợp
    Ctrl-->>UI: 200 OK + List DoctorCardDto
    UI-->>Patient: Hiển thị danh sách bác sĩ với huy hiệu tỷ lệ phù hợp (%)
```

##### 3.10.3. Sequence Diagram: Out-of-Domain Query Gating / Degraded Feature Hash Fallback
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as DoctorSearchController
    participant Svc as DoctorSemanticSearchService
    participant AI as OpenAI API

    User->>UI: Tìm kiếm khi mạng ngoài bị gián đoạn (OpenAI Timeout)
    UI->>Ctrl: POST /api/v1/doctors/semantic-search
    Ctrl->>Svc: hybridSearch(request)
    Svc->>AI: generateEmbedding(...)
    AI-->>Svc: ConnectTimeoutException (Mạng chập chờn)
    Note over Svc: Kích hoạt cơ chế Fallback suy thoái êm dịu (Graceful Degradation):<br/>Chuyển sang Local Character N-gram FNV-1a Hash + PostgreSQL pg_trgm Full-Text Search
    Svc->>Svc: localFallbackTrigramSearch(query)
    Svc-->>Ctrl: Kết quả tìm kiếm từ khóa cục bộ
    Ctrl-->>UI: 200 OK (Kèm cảnh báo tìm kiếm từ khóa dự phòng)
    UI-->>User: Hiển thị kết quả tìm kiếm không bị gián đoạn
```
'''
