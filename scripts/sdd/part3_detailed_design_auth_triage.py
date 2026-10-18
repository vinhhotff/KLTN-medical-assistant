"""
Part 3 of SDD Generator: Section 3 Detailed Design (Features 3.1 to 3.10 - Auth, Security, Profile, Triage, Doctor Search).
Fully expanded with Class Specification Tables, Step-by-Step Sequence Tables, and Error Handling Matrices.
"""

def get_part3_content():
    return '''### 3. Detailed Design

Phần này đặc tả chi tiết thiết kế phần mềm ở cấp độ cài đặt (Detailed Design) cho 28 quy trình nghiệp vụ cốt lõi của hệ thống MediAssist-AI. Mỗi quy trình được cấu trúc chuẩn mực bao gồm 4 tiểu mục:
1. **Bối cảnh & Mục tiêu thiết kế (Context & Design Scope):** Phạm vi nghiệp vụ, tác nhân tham gia, tiền/hậu điều kiện và các ràng buộc bảo mật / lâm sàng.
2. **3.X.1 Class Diagram & Bảng Đặc tả Lớp (Class Specification Table):** Biểu đồ lớp Mermaid thể hiện cấu trúc tĩnh và bảng mô tả chi tiết từng lớp, kiểu tầng, thuộc tính và phương thức với đầy đủ kiểu dữ liệu.
3. **3.X.2 Sequence Diagram: Luồng chính (Main Success Flow):** Biểu đồ tuần tự Mermaid đánh số bước và bảng mô tả luồng sự kiện chi tiết từ giao diện React SPA đến CSDL PostgreSQL và các dịch vụ ngoài.
4. **3.X.3 Sequence Diagram: Luồng ngoại lệ (Alternative & Exception Flows):** Biểu đồ tuần tự Mermaid cho các kịch bản lỗi và bảng ma trận xử lý ngoại lệ ánh xạ trực tiếp sang các mã lỗi `AppException` và phản hồi HTTP.

---

#### 3.1 Authentication with Stateless Dual-Transport JWT (Login)

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân, Bác sĩ, Quản trị viên (All Roles).
* **Mục tiêu:** Cung cấp cơ chế xác thực danh tính an toàn, bảo mật cao chống tấn công XSS (Cross-Site Scripting) và CSRF (Cross-Site Request Forgery).
* **Nguyên lý bảo mật:** Áp dụng kiến trúc **Dual-Transport Token**:
  - `Access Token` (JWT, thời hạn 60 phút): Phát hành qua JSON Response Body để Client lưu trữ tạm thời trong bộ nhớ RAM ứng dụng hoặc Authorization Header `Bearer <token>` cho các lệnh gọi REST API.
  - `Refresh Token` (JWT, thời hạn 7 ngày): Đóng gói trong Cookie phản hồi `Set-Cookie` với các cờ `HttpOnly` (chặn JavaScript truy cập), `Secure` (chỉ truyền qua HTTPS) và `SameSite=Lax`.
* **Cơ chế chống Brute-Force (Flyway V3):** Đếm số lần đăng nhập sai liên tiếp `failed_login_attempts`. Khi đạt ngưỡng 5 lần, tự động khóa tài khoản tạm thời trong 15 phút (`locked_until = NOW() + 15m`).

##### 3.1.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +login(LoginRequest request, HttpServletResponse response) ResponseEntity~ApiResponse~AuthResponse~~
    }
    class AuthService {
        -AuthenticationManager authenticationManager
        -JwtTokenProvider jwtTokenProvider
        -UserRepository userRepository
        -AuditLogService auditLogService
        +authenticateUser(LoginRequest request, HttpServletResponse response) AuthResponse
        -checkAccountLockout(User user) void
        -handleFailedLogin(String email) void
        -resetFailedAttempts(User user) void
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
        -boolean emailVerified
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

###### Table 3.1.1: Authentication Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AuthController` | Presentation (REST) | Tiếp nhận yêu cầu HTTP POST `/api/v1/auth/login`, kích hoạt kiểm tra `@Valid`, điều phối `AuthService`. | `+ login(@Valid @RequestBody LoginRequest, HttpServletResponse): ResponseEntity<ApiResponse<AuthResponse>>` |
| `AuthService` | Application Service | Xác thực thông tin qua Spring Security `AuthenticationManager`, kiểm tra khóa tài khoản, tạo token và ghi vết kiểm toán. | `+ authenticateUser(LoginRequest, HttpServletResponse): AuthResponse`<br/>`- checkAccountLockout(User): void`<br/>`- handleFailedLogin(String): void` |
| `JwtTokenProvider` | Security Infrastructure | Ký số mã hóa JWT với thuật toán HMAC-SHA256, sinh Access Token, Refresh Token và tạo cookie HttpOnly. | `+ generateAccessToken(Authentication): String`<br/>`+ generateRefreshToken(Authentication): String`<br/>`+ createHttpOnlyCookie(String): ResponseCookie` |
| `UserRepository` | Persistence Repository | Truy vấn thực thể `User` từ bảng `users` theo email đăng nhập. | `+ findByEmail(String email): Optional<User>`<br/>`+ save(User): User` |
| `LoginRequest` | DTO | Chứa dữ liệu đầu vào xác thực gồm email và mật khẩu thuần. | `- email: String (@NotBlank, @Email)`<br/>`- password: String (@NotBlank, @Size(min=6))` |
| `AuthResponse` | DTO | Đóng gói dữ liệu trả về cho client gồm chuỗi JWT Access Token và thông tin cơ bản của người dùng. | `- accessToken: String`<br/>`- user: UserDto` |

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
    Svc->>Svc: checkAccountLockout(user) -> Hợp lệ (locked_until == null)
    Svc->>Mgr: authenticate(UsernamePasswordAuthenticationToken)
    Mgr-->>Svc: Authentication (BCrypt hash khớp)
    Svc->>Token: generateAccessToken(auth)
    Token-->>Svc: accessToken (Bearer JWT, hạn 60 phút)
    Svc->>Token: generateRefreshToken(auth)
    Token-->>Svc: refreshToken (JWT, hạn 7 ngày)
    Svc->>Token: createHttpOnlyCookie(refreshToken)
    Token-->>Svc: ResponseCookie (Name="refresh_token", Path="/", HttpOnly, Secure, SameSite=Lax)
    Svc->>DB: UPDATE users SET failed_login_attempts=0, last_login_at=NOW()
    Svc->>Audit: logAction("LOGIN", user.getId(), "Đăng nhập thành công", ipAddress)
    Svc-->>Ctrl: AuthResponse(accessToken, userDto)
    Ctrl-->>UI: 200 OK + Set-Cookie Header + Body: { accessToken: "...", user: {...} }
    UI->>UI: Lưu accessToken vào Bộ nhớ RAM / Cấu hình Axios Header
    UI-->>Patient: Chuyển hướng tới màn hình Dashboard tương ứng vai trò
```

###### Table 3.1.2: Step-by-Step Flow Specification (Login Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhập thông tin form đăng nhập | Email, Mật khẩu | Kích hoạt xác thực phía Client. |
| **2** | React SPA | `AuthController` | `POST /api/v1/auth/login` | `LoginRequest(email, password)` | Gửi yêu cầu qua kết nối HTTPS an toàn. |
| **3** | `AuthController` | `AuthService` | `authenticateUser()` | `request, response` | Chuyển tiếp luồng xử lý tới tầng nghiệp vụ. |
| **4** | `AuthService` | `UserRepository` | `findByEmail()` | `request.getEmail()` | `SELECT * FROM users WHERE email = ?` |
| **5** | `AuthService` | `AuthService` | `checkAccountLockout()` | `user` | Kiểm tra `lockedUntil == null` hoặc `lockedUntil < NOW()`. |
| **6** | `AuthService` | `AuthenticationManager` | `authenticate()` | `UsernamePasswordAuthenticationToken` | So sánh chuỗi băm BCrypt giữa mật khẩu nhập và `password_hash`. |
| **7-8** | `AuthService` | `JwtTokenProvider` | `generateAccessToken()` | `authentication` | Ký số JWT HS256 chứa Subject, Claims (Role, UserId), hết hạn 60m. |
| **9-10**| `AuthService` | `JwtTokenProvider` | `generateRefreshToken()` | `authentication` | Ký số Refresh Token JWT hết hạn 7 ngày. |
| **11** | `AuthService` | `JwtTokenProvider` | `createHttpOnlyCookie()` | `refreshToken` | Đóng gói cookie an toàn `HttpOnly; Secure; SameSite=Lax`. |
| **12** | `AuthService` | `UserRepository` | `save(user)` | `user` | `UPDATE users SET failed_login_attempts = 0, last_login_at = NOW()`. |
| **13** | `AuthService` | `AuditLogService` | `logAction()` | `"LOGIN", userId, ipAddress` | `INSERT INTO audit_logs (action, user_id, ip_address, ...)`. |
| **14-15**| `AuthController` | React SPA | `200 OK` | `AuthResponse` + Set-Cookie | Trả về JSON Body kèm Cookie xác thực phiên. |
| **16** | React SPA | Bệnh nhân | Điều hướng giao diện | Route `/patient/dashboard` | Lưu token vào RAM, chuyển hướng màn hình. |

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

    Attacker->>UI: Nhập sai mật khẩu liên tiếp (lần thứ 5)
    UI->>Ctrl: POST /api/v1/auth/login (email, wrong_password)
    Ctrl->>Svc: authenticateUser(request, response)
    Svc->>DB: findByEmail(request.getEmail())
    DB-->>Svc: User Entity (failed_login_attempts = 4, locked_until = null)
    Svc->>Mgr: authenticate(UsernamePasswordAuthenticationToken)
    Mgr-->>Svc: BadCredentialsException (Sai mật khẩu)
    Svc->>Svc: handleFailedLogin(email)
    Svc->>DB: UPDATE users SET failed_login_attempts = 5, locked_until = NOW() + INTERVAL '15 minutes'
    Svc->>Audit: logSecurityAlert("ACCOUNT_LOCKOUT_TRIGGERED", email, ipAddress)
    Svc-->>Ctrl: throw AppException(ACCOUNT_LOCKED_15_MINUTES)
    Ctrl-->>UI: 401 Unauthorized (ErrorCode: "ACCOUNT_LOCKED", Message: "Tài khoản bị tạm khóa 15 phút do nhập sai 5 lần liên tiếp.")
    UI-->>Attacker: Hiển thị thông báo cảnh báo đỏ & Khóa form đăng nhập 15 phút
```

###### Table 3.1.3: Error Handling & Exception Matrix (Login)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Sai mật khẩu (Lần 1 - 4)** | Mật khẩu không khớp BCrypt | `401 Unauthorized` | `INVALID_CREDENTIALS` | "Email hoặc mật khẩu không chính xác." Tăng `failed_login_attempts` thêm 1. |
| **Tài khoản bị khóa (Lần 5)** | `failed_login_attempts >= 5` | `401 Unauthorized` | `ACCOUNT_LOCKED` | "Tài khoản bị tạm khóa 15 phút." Cập nhật `locked_until = NOW() + 15m`. |
| **Tài khoản bị vô hiệu hóa** | `user.status == 'SUSPENDED'` | `403 Forbidden` | `ACCOUNT_SUSPENDED` | "Tài khoản của bạn đã bị khóa bởi Quản trị viên." Ghi log kiểm toán. |
| **Email chưa kích hoạt** | `user.email_verified == false` | `403 Forbidden` | `EMAIL_NOT_VERIFIED` | "Vui lòng kiểm tra hộp thư và kích hoạt tài khoản trước khi đăng nhập." |

---

#### 3.2 Patient Registration with Email Verification Gate

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân mới (Guest).
* **Mục tiêu:** Cho phép người bệnh đăng ký tài khoản tự phục vụ, áp dụng cơ chế xác thực quyền sở hữu hòm thư nghiêm ngặt (Email Verification Gate - Flyway V22) để chống tài khoản rác và spam đặt lịch.
* **Quy tắc an ninh:**
  - Mật khẩu băm một chiều với BCrypt (độ phức tạp cost factor 10).
  - Token kích hoạt sinh ngẫu nhiên UUIDv4 có thời hạn **24 giờ**.
  - Cơ sở dữ liệu chỉ lưu trữ mã băm SHA-256 của token (`token_hash`), token gốc chỉ nằm trong liên kết gửi qua thư điện tử.
  - Bệnh nhân chưa kích hoạt (`email_verified = false`) bị chặn hoàn toàn quyền đặt lịch khám và thanh toán viện phí.

##### 3.2.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        -EmailVerificationService emailVerificationService
        +registerPatient(RegisterRequest request) ResponseEntity~ApiResponse~UserDto~~
        +verifyEmail(String token) ResponseEntity~ApiResponse~String~~
    }
    class AuthService {
        -UserRepository userRepository
        -PasswordEncoder passwordEncoder
        -EmailVerificationService emailVerificationService
        +registerPatient(RegisterRequest request) UserDto
    }
    class EmailVerificationService {
        -EmailVerificationTokenRepository tokenRepo
        -UserRepository userRepo
        -EmailService emailService
        +createAndSendVerificationToken(User user) void
        +verifyEmailToken(String rawToken) boolean
        -sha256Hex(String data) String
    }
    class EmailVerificationToken {
        -UUID id
        -UUID userId
        -String tokenHash
        -Instant expiresAt
        -Instant usedAt
        -Instant createdAt
    }

    AuthController --> AuthService
    AuthController --> EmailVerificationService
    AuthService --> EmailVerificationService
    EmailVerificationService --> EmailVerificationToken
```

###### Table 3.2.1: Registration Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AuthController` | Presentation (REST) | Tiếp nhận yêu cầu đăng ký `POST /api/v1/auth/register` và xác thực email `GET /api/v1/auth/verify-email`. | `+ registerPatient(@Valid @RequestBody RegisterRequest): ResponseEntity<ApiResponse<UserDto>>`<br/>`+ verifyEmail(@RequestParam String token): ResponseEntity<ApiResponse<String>>` |
| `AuthService` | Application Service | Kiểm tra trùng lặp email, băm mật khẩu BCrypt, tạo bản ghi `User` mới và kích hoạt phát tán email xác nhận. | `+ registerPatient(RegisterRequest): UserDto` |
| `EmailVerificationService` | Security Service | Sinh chuỗi token ngẫu nhiên, tính toán mã băm SHA-256, lưu vào bảng `email_verification_tokens` và thẩm định token. | `+ createAndSendVerificationToken(User): void`<br/>`+ verifyEmailToken(String): boolean`<br/>`- sha256Hex(String): String` |
| `EmailVerificationToken` | Domain Entity | Thực thể CSDL đại diện cho bản ghi token xác thực email (Flyway V22). | `- id: UUID`<br/>`- userId: UUID`<br/>`- tokenHash: String (VARCHAR(64))`<br/>`- expiresAt: Instant`<br/>`- usedAt: Instant` |

##### 3.2.2. Sequence Diagram: Successful Registration & Verification Email Dispatch
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân mới
    participant UI as React 18 SPA (RegisterModal)
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant VerifySvc as EmailVerificationService
    participant DB as PostgreSQL (users, email_verification_tokens)
    participant Mail as EmailService (@Async Loom)

    Patient->>UI: Điền form: Họ tên, Email, Mật khẩu, Số điện thoại
    UI->>Ctrl: POST /api/v1/auth/register (RegisterRequest)
    Ctrl->>Svc: registerPatient(request)
    Svc->>DB: existsByEmail(request.getEmail())
    DB-->>Svc: false (Chưa tồn tại)
    Svc->>Svc: passwordEncoder.encode(password) -> BCrypt Hash
    Svc->>DB: INSERT INTO users (email, password_hash, full_name, phone, role='PATIENT', status='PENDING_VERIFICATION', email_verified=false)
    DB-->>Svc: User Entity Saved (id=UUID)
    Svc->>VerifySvc: createAndSendVerificationToken(user)
    VerifySvc->>VerifySvc: Sinh rawToken = UUID.randomUUID().toString()
    VerifySvc->>VerifySvc: Tính tokenHash = SHA-256(rawToken)
    VerifySvc->>DB: INSERT INTO email_verification_tokens (user_id, token_hash, expires_at=NOW()+24h)
    VerifySvc->>Mail: sendActivationEmail(user.getEmail(), rawToken)
    Note over Mail: Luồng ảo Project Loom phát thư kích hoạt nền qua SMTP TLS 587
    Svc-->>Ctrl: UserDto
    Ctrl-->>UI: 201 Created (Message: "Đăng ký thành công. Vui lòng kiểm tra email kích hoạt.")
    UI-->>Patient: Hiển thị màn hình thông báo kiểm tra hộp thư
```

###### Table 3.2.2: Step-by-Step Flow Specification (Registration & Email Verification)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhập dữ liệu đăng ký | Họ tên, email, mật khẩu, SĐT | Kiểm tra tính hợp lệ cơ bản tại Client. |
| **2** | React SPA | `AuthController` | `POST /api/v1/auth/register` | `RegisterRequest` | Chuyển tiếp payload JSON tới máy chủ. |
| **3** | `AuthController` | `AuthService` | `registerPatient()` | `request` | Bắt đầu quy trình đăng ký người dùng mới. |
| **4** | `AuthService` | `UserRepository` | `existsByEmail()` | `email` | `SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)` |
| **5** | `AuthService` | `PasswordEncoder` | `encode()` | `rawPassword` | Băm mật khẩu qua BCrypt với cost factor 10. |
| **6** | `AuthService` | `UserRepository` | `save(user)` | `User Entity` | `INSERT INTO users (role='PATIENT', email_verified=false, ...)`. |
| **7** | `AuthService` | `EmailVerificationService` | `createAndSendVerificationToken()` | `user` | Kích hoạt chu trình phát hành mã kích hoạt an toàn. |
| **8-9** | `EmailVerificationService` | Nội bộ | Sinh token & Băm SHA-256 | `rawToken` | `tokenHash = DigestUtils.sha256Hex(rawToken)`. |
| **10** | `EmailVerificationService` | `TokenRepository` | `save(token)` | `EmailVerificationToken` | `INSERT INTO email_verification_tokens (token_hash, expires_at=NOW()+24h)`. |
| **11** | `EmailVerificationService` | `EmailService` | `sendActivationEmail()` | `email, rawToken` | Khởi chạy luồng ảo Loom phát thư HTML chứa link kích hoạt. |
| **12-13**| `AuthController` | React SPA | `201 Created` | `UserDto` | Trả về thông báo thành công và yêu cầu xác thực. |

##### 3.2.3. Sequence Diagram: Duplicate Email / Validation Failure
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant DB as PostgreSQL (users)

    Patient->>UI: Đăng ký với email đã có người sử dụng
    UI->>Ctrl: POST /api/v1/auth/register (email="vinh@example.com")
    Ctrl->>Svc: registerPatient(request)
    Svc->>DB: existsByEmail("vinh@example.com")
    DB-->>Svc: true (Đã tồn tại)
    Svc-->>Ctrl: throw AppException(EMAIL_ALREADY_EXISTS, "Địa chỉ email này đã được đăng ký trong hệ thống.")
    Ctrl-->>UI: 409 Conflict (ErrorCode: "EMAIL_ALREADY_EXISTS")
    UI-->>Patient: Hiển thị cảnh báo lỗi viền đỏ tại ô nhập Email
```

###### Table 3.2.3: Error Handling & Exception Matrix (Registration)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Email đã tồn tại** | `existsByEmail(email) == true` | `409 Conflict` | `EMAIL_ALREADY_EXISTS` | "Địa chỉ email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác." |
| **Mật khẩu yếu** | Mật khẩu < 6 ký tự hoặc thiếu số/chữ | `400 Bad Request` | `VALIDATION_FAILED` | "Mật khẩu phải chứa ít nhất 6 ký tự, gồm cả chữ và số." |
| **Số điện thoại sai định dạng** | Không khớp biểu thức chuẩn E.164 | `400 Bad Request` | `INVALID_PHONE` | "Số điện thoại liên hệ không hợp lệ." |

---

#### 3.3 Google OAuth2 Single Sign-On (SSO) Flow

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân, Bác sĩ (All Users).
* **Mục tiêu:** Cung cấp trải nghiệm đăng nhập tức thì không cần ghi nhớ mật khẩu thông qua tài khoản Google OpenID Connect (OIDC).
* **Đặc tả kỹ thuật (Flyway V8):**
  - Cột `password_hash` trên bảng `users` cho phép giá trị `NULL` đối với các tài khoản sinh từ luồng OAuth2.
  - Tự động kích hoạt cờ `email_verified = true` vì Google đã xác thực quyền sở hữu hòm thư.
  - Tự động tải và đồng bộ ảnh đại diện `avatar_url` từ thông tin hồ sơ Google.

##### 3.3.1. Class Diagram
```mermaid
classDiagram
    class CustomOAuth2UserService {
        -UserRepository userRepository
        +loadUser(OAuth2UserRequest userRequest) OAuth2User
        -processOAuth2User(OAuth2UserRequest request, OAuth2User oAuth2User) OAuth2User
    }
    class OAuth2AuthenticationSuccessHandler {
        -JwtTokenProvider jwtTokenProvider
        -UserRepository userRepository
        -HttpCookieOAuth2AuthorizationRequestRepository cookieRepo
        +onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth) void
    }
    class User {
        -UUID id
        -String email
        -String fullName
        -String avatarUrl
        -boolean emailVerified
    }

    CustomOAuth2UserService --> UserRepository
    OAuth2AuthenticationSuccessHandler --> JwtTokenProvider
    OAuth2AuthenticationSuccessHandler --> UserRepository
    UserRepository --> User
```

###### Table 3.3.1: Google OAuth2 Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `CustomOAuth2UserService` | Security Infrastructure | Xử lý phản hồi OIDC từ Google Authorization Server, tự động trích xuất Email, Name, Picture và đồng bộ vào bảng `users`. | `+ loadUser(OAuth2UserRequest): OAuth2User`<br/>`- processOAuth2User(OAuth2UserRequest, OAuth2User): OAuth2User` |
| `OAuth2AuthenticationSuccessHandler` | Security Handler | Đón bắt sự kiện xác thực Google thành công, phát hành Access Token & Refresh Token, và thực hiện chuyển hướng về Client. | `+ onAuthenticationSuccess(HttpServletRequest, HttpServletResponse, Authentication): void` |

##### 3.3.2. Sequence Diagram: Successful Google OAuth2 Exchange & Auto-Provisioning
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Browser as Trình duyệt Web
    participant Google as Google Identity Provider
    participant Backend as Spring Security OAuth2 Client
    participant Handler as OAuth2AuthenticationSuccessHandler
    participant DB as PostgreSQL (users)
    participant Token as JwtTokenProvider

    User->>Browser: Nhấp "Đăng nhập với Google"
    Browser->>Backend: GET /oauth2/authorization/google
    Backend-->>Browser: 302 Redirect tới Google Consent Screen (Client_ID, Scope: profile, email)
    Browser->>Google: Chuyển hướng tới accounts.google.com
    User->>Google: Xác nhận chọn tài khoản và cấp quyền chia sẻ hồ sơ
    Google-->>Browser: 302 Redirect /login/oauth2/code/google?code=AUTHORIZATION_CODE&state=...
    Browser->>Backend: GET /login/oauth2/code/google?code=AUTHORIZATION_CODE
    Backend->>Google: Trao đổi AUTHORIZATION_CODE lấy ID Token qua giao thức HTTPS
    Google-->>Backend: ID Token Payload (email: "user@gmail.com", name: "Nguyen Van A", picture: "https://...")
    Backend->>DB: findByEmail("user@gmail.com")
    alt Người dùng đăng nhập lần đầu (Chưa có tài khoản)
        Backend->>DB: INSERT INTO users (email="user@gmail.com", password_hash=NULL, full_name="Nguyen Van A", avatar_url="https://...", role='PATIENT', status='ACTIVE', email_verified=true)
    else Người dùng đã có tài khoản trước đó
        Backend->>DB: UPDATE users SET avatar_url="https://...", email_verified=true, last_login_at=NOW()
    end
    Backend->>Handler: onAuthenticationSuccess(...)
    Handler->>Token: generateAccessToken(user) -> accessToken
    Handler->>Token: generateRefreshToken(user) -> refreshToken
    Handler->>Browser: Set-Cookie: refresh_token=refreshToken, HttpOnly, Secure, SameSite=Lax
    Handler-->>Browser: 302 Redirect tới /oauth2/callback?token=ACCESS_TOKEN
    Browser->>Browser: Đọc token từ URL query parameter, lưu vào RAM, dọn URL và mở Dashboard
```

###### Table 3.3.2: Step-by-Step Flow Specification (Google OAuth2 Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1-3** | Người dùng | Trình duyệt | Chọn Đăng nhập Google | Redirect Authorization URL | Khởi tạo phiên OAuth2 và lưu trữ state cookie an toàn. |
| **4-6** | Trình duyệt | Google Server | Cấp quyền chia sẻ tài khoản | Tài khoản Google cá nhân | Google thẩm định danh tính người dùng. |
| **7-8** | Google | Backend | Trả về Authorization Code | `code, state` | Trình duyệt chuyển tiếp mã code về máy chủ Spring Boot. |
| **9-10**| Backend | Google Server | Trao đổi Token Backend-to-Backend | `code, client_secret` | Gọi API Google OIDC lấy thông tin người dùng được ký số. |
| **11** | Backend | `UserRepository` | `findByEmail()` | `email` | `SELECT * FROM users WHERE email = ?` |
| **12-13**| Backend | `UserRepository` | Tự động tạo hoặc cập nhật tài khoản | `User Entity` | Cấp mới tài khoản với `password_hash = NULL` và `email_verified = true`. |
| **14-16**| `Handler` | `JwtTokenProvider` | Sinh bộ đôi Access & Refresh Token | `user` | Ký số JWT và khởi tạo cookie `refresh_token`. |
| **17-19**| Backend | Trình duyệt | `302 Redirect` | URL Callback kèm Token | Trình duyệt tiếp nhận token và chuyển hướng vào trang chủ. |

##### 3.3.3. Sequence Diagram: OAuth2 Token Exchange Failure / State Tampering
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ can thiệp
    participant Browser as Trình duyệt
    participant Backend as Spring Security OAuth2
    participant Handler as OAuth2AuthenticationFailureHandler

    Attacker->>Browser: Giả mạo hoặc sửa đổi tham số state parameter trong URL callback
    Browser->>Backend: GET /login/oauth2/code/google?state=TAMPERED_STATE&code=...
    Backend->>Backend: So sánh state nhận được với state lưu trong Session Cookie -> Không khớp!
    Backend->>Handler: onAuthenticationFailure(OAuth2AuthenticationException)
    Handler-->>Browser: 302 Redirect tới /login?error=oauth2_state_mismatch
    Browser-->>Attacker: Hiển thị thông báo lỗi bảo mật xác thực Google
```

###### Table 3.3.3: Error Handling & Exception Matrix (OAuth2)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **State Mismatch (CSRF Attack)** | `state != cookie_state` | `302 Redirect` | `OAUTH2_STATE_MISMATCH` | "Yêu cầu xác thực bị nghi ngờ có can thiệp. Vui lòng đăng nhập lại." |
| **Người dùng hủy cấp quyền** | Người dùng nhấn "Cancel" tại Google Consent | `302 Redirect` | `OAUTH2_ACCESS_DENIED` | "Bạn đã hủy quá trình đăng nhập qua tài khoản Google." |
| **Tài khoản Google bị khóa** | Tài khoản nội bộ khớp email đang bị `SUSPENDED` | `302 Redirect` | `ACCOUNT_SUSPENDED` | "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ban quản trị viện." |

---

#### 3.4 Forgot Password with SHA-256 Token Hash

##### Context & Design Scope
* **Tác nhân:** Người dùng quên mật khẩu (All Users).
* **Mục tiêu:** Cung cấp luồng khôi phục mật khẩu tự động qua email, bảo mật chống rò rỉ dữ liệu theo Flyway V21.
* **Nguyên lý bảo mật một chiều (One-Way Hashing):**
  - Token gửi cho người dùng qua email là chuỗi ký tự ngẫu nhiên `rawToken` (UUIDv4).
  - Máy chủ **chỉ lưu trữ mã băm SHA-256** của chuỗi đó (`token_hash`) trong bảng `password_reset_tokens`.
  - Nếu cơ sở dữ liệu bị lộ, kẻ tấn công không thể đảo ngược mã băm SHA-256 để chiếm quyền đặt lại mật khẩu của nạn nhân.
  - Áp dụng nguyên tắc **Chống dò tìm tài khoản (Anti-User Enumeration)**: Luôn trả về thông báo thành công dù email có tồn tại hay không.

##### 3.4.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -PasswordResetService passwordResetService
        +forgotPassword(ForgotPasswordRequest request) ResponseEntity~ApiResponse~String~~
    }
    class PasswordResetService {
        -UserRepository userRepository
        -PasswordResetTokenRepository tokenRepo
        -EmailService emailService
        +sendResetToken(String email) void
        -sha256Hex(String data) String
    }
    class PasswordResetToken {
        -UUID id
        -UUID userId
        -String tokenHash
        -Instant expiresAt
        -boolean used
        -Instant createdAt
    }

    AuthController --> PasswordResetService
    PasswordResetService --> PasswordResetToken
```

###### Table 3.4.1: Forgot Password Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AuthController` | Presentation (REST) | Tiếp nhận yêu cầu quên mật khẩu `POST /api/v1/auth/forgot-password`. | `+ forgotPassword(@Valid @RequestBody ForgotPasswordRequest): ResponseEntity<ApiResponse<String>>` |
| `PasswordResetService` | Application Service | Tìm kiếm người dùng, phát sinh token UUIDv4, tính mã băm SHA-256, lưu CSDL và điều phối gửi email giao dịch. | `+ sendResetToken(String email): void`<br/>`- sha256Hex(String data): String` |
| `PasswordResetToken` | Domain Entity | Thực thể CSDL quản lý mã băm token đặt lại mật khẩu (Flyway V16, V21). | `- id: UUID`<br/>`- userId: UUID`<br/>`- tokenHash: String (VARCHAR(64))`<br/>`- expiresAt: Instant`<br/>`- used: boolean` |

##### 3.4.2. Sequence Diagram: Password Reset Request & SHA-256 Hashed Token Email
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA (ForgotPasswordPage)
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (users, password_reset_tokens)
    participant Mail as EmailService (@Async Loom)

    User->>UI: Nhập email cần khôi phục mật khẩu, nhấn "Gửi hướng dẫn"
    UI->>Ctrl: POST /api/v1/auth/forgot-password (email: "user@example.com")
    Ctrl->>Svc: sendResetToken("user@example.com")
    Svc->>DB: findByEmail("user@example.com")
    DB-->>Svc: User Entity
    Svc->>Svc: Sinh rawToken = UUID.randomUUID().toString()
    Svc->>Svc: Tính tokenHash = DigestUtils.sha256Hex(rawToken)
    Svc->>DB: INSERT INTO password_reset_tokens (user_id, token_hash, expires_at=NOW()+15m, used=false)
    Svc->>Mail: sendPasswordResetEmail(user.getEmail(), rawToken)
    Note over Mail: Luồng ảo Project Loom gửi email chứa liên kết: /reset-password?token={rawToken}
    Svc-->>Ctrl: Thành công
    Ctrl-->>UI: 200 OK (Message: "Nếu địa chỉ email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.")
    UI-->>User: Hiển thị thông báo kiểm tra hòm thư
```

###### Table 3.4.2: Step-by-Step Flow Specification (Forgot Password)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Người dùng | React SPA | Nhập email yêu cầu | `email` | Xác thực định dạng email RFC 5322. |
| **2** | React SPA | `AuthController` | `POST /api/v1/auth/forgot-password` | `ForgotPasswordRequest(email)` | Gửi yêu cầu qua HTTP POST. |
| **3** | `AuthController` | `PasswordResetService` | `sendResetToken()` | `email` | Bắt đầu chu trình xử lý quên mật khẩu. |
| **4** | `PasswordResetService` | `UserRepository` | `findByEmail()` | `email` | `SELECT * FROM users WHERE email = ?` |
| **5-6** | `PasswordResetService` | Nội bộ | Sinh token & Băm SHA-256 | `rawToken` | Sinh chuỗi ngẫu nhiên 128-bit và băm ra 64 ký tự hex. |
| **7** | `PasswordResetService` | `TokenRepository` | `save(token)` | `PasswordResetToken` | `INSERT INTO password_reset_tokens (token_hash, expires_at=NOW()+15m)`. |
| **8** | `PasswordResetService` | `EmailService` | `sendPasswordResetEmail()` | `email, rawToken` | Bắn tác vụ gửi thư nền qua Project Loom. |
| **9-11**| `AuthController` | Người dùng | `200 OK` | Generic Success Message | Phản hồi đồng nhất bảo vệ quyền riêng tư người dùng. |

##### 3.4.3. Sequence Diagram: Non-Existent Email (Anti-User Enumeration Defense)
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ dò tìm tài khoản
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (users)

    Attacker->>UI: Nhập email ngẫu nhiên để thăm dò tài khoản tồn tại
    UI->>Ctrl: POST /api/v1/auth/forgot-password (email="victim@notexist.com")
    Ctrl->>Svc: sendResetToken("victim@notexist.com")
    Svc->>DB: findByEmail("victim@notexist.com")
    DB-->>Svc: Optional.empty()
    Note over Svc: Tuyệt đối không ném lỗi 404 để tránh lộ danh sách người dùng!<br/>Bỏ qua bước sinh token và không gửi email.
    Svc-->>Ctrl: Thành công giả lập
    Ctrl-->>UI: 200 OK (Message: "Nếu địa chỉ email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.")
    UI-->>Attacker: Hiển thị thông điệp thành công chung chung
```

###### Table 3.4.3: Error Handling & Exception Matrix (Forgot Password)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Email không tồn tại** | `findByEmail() == Optional.empty()` | `200 OK` | `NONE` | Luôn trả về 200 OK để chống kỹ thuật dò quét tài khoản (User Enumeration). |
| **Spam yêu cầu liên tục** | Vượt quá 3 yêu cầu/phút từ 1 IP | `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ 5 phút trước khi thử lại." |

---

#### 3.5 Reset Password with Cryptographic Token Verification

##### Context & Design Scope
* **Tác nhân:** Người dùng có token hợp lệ.
* **Mục tiêu:** Cho phép người dùng đặt lại mật khẩu mới sau khi xác thực thành công chữ ký và tính hợp lệ của token qua liên kết email.
* **Quy tắc an ninh:**
  - Token phải chưa được sử dụng (`used == false`).
  - Dấu thời gian hiện tại phải nhỏ hơn thời hạn hết hạn (`expiresAt > NOW()`).
  - Sau khi đặt lại mật khẩu thành công, bản ghi token lập tức bị đánh dấu vô hiệu hóa vĩnh viễn (`used = true`).

##### 3.5.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -PasswordResetService passwordResetService
        +resetPassword(ResetPasswordRequest request) ResponseEntity~ApiResponse~String~~
    }
    class PasswordResetService {
        -PasswordResetTokenRepository tokenRepo
        -UserRepository userRepository
        -PasswordEncoder passwordEncoder
        +resetPassword(String rawToken, String newPassword) void
        -sha256Hex(String data) String
    }
    class ResetPasswordRequest {
        -String token
        -String newPassword
    }

    AuthController --> PasswordResetService
    AuthController ..> ResetPasswordRequest
```

###### Table 3.5.1: Reset Password Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AuthController` | Presentation (REST) | Tiếp nhận yêu cầu đặt lại mật khẩu `POST /api/v1/auth/reset-password`. | `+ resetPassword(@Valid @RequestBody ResetPasswordRequest): ResponseEntity<ApiResponse<String>>` |
| `PasswordResetService` | Application Service | Thẩm định tính hợp lệ của token SHA-256, mã hóa mật khẩu mới và cập nhật CSDL. | `+ resetPassword(String rawToken, String newPassword): void` |
| `ResetPasswordRequest` | DTO | Đóng gói token gốc và mật khẩu mới cần thiết lập. | `- token: String (@NotBlank)`<br/>`- newPassword: String (@NotBlank, @Size(min=6))` |

##### 3.5.2. Sequence Diagram: Successful Password Reset & BCrypt Hashing
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA (ResetPasswordPage)
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (password_reset_tokens, users)
    participant Audit as AuditLogService

    User->>UI: Nhập mật khẩu mới và xác nhận mật khẩu
    UI->>Ctrl: POST /api/v1/auth/reset-password (rawToken, newPassword)
    Ctrl->>Svc: resetPassword(rawToken, newPassword)
    Svc->>Svc: Tính tokenHash = DigestUtils.sha256Hex(rawToken)
    Svc->>DB: findByTokenHash(tokenHash)
    DB-->>Svc: PasswordResetToken (used=false, expires_at > NOW())
    Svc->>Svc: passwordEncoder.encode(newPassword) -> newBcryptHash
    Svc->>DB: UPDATE users SET password_hash = newBcryptHash, failed_login_attempts=0, locked_until=null, updated_at=NOW() WHERE id = token.userId
    Svc->>DB: UPDATE password_reset_tokens SET used = true WHERE id = token.id
    Svc->>Audit: logAction("PASSWORD_RESET_SUCCESS", token.getUserId(), "Đặt lại mật khẩu thành công", ipAddress)
    Svc-->>Ctrl: Thành công
    Ctrl-->>UI: 200 OK (Message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.")
    UI-->>User: Hiển thị thông báo thành công và chuyển hướng tới trang Đăng nhập
```

###### Table 3.5.2: Step-by-Step Flow Specification (Reset Password Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Người dùng | React SPA | Nhập mật khẩu mới | `newPassword` | Kiểm tra mật khẩu khớp nhau tại Client. |
| **2** | React SPA | `AuthController` | `POST /api/v1/auth/reset-password` | `ResetPasswordRequest` | Gửi chuỗi token và mật khẩu mới. |
| **3** | `AuthController` | `PasswordResetService` | `resetPassword()` | `rawToken, newPassword` | Bắt đầu quy trình thẩm định token. |
| **4** | `PasswordResetService` | Nội bộ | Băm SHA-256 | `rawToken` | `tokenHash = DigestUtils.sha256Hex(rawToken)`. |
| **5** | `PasswordResetService` | `TokenRepository` | `findByTokenHash()` | `tokenHash` | `SELECT * FROM password_reset_tokens WHERE token_hash = ?`. |
| **6** | `PasswordResetService` | `PasswordEncoder` | `encode()` | `newPassword` | Băm mật khẩu mới qua BCrypt. |
| **7** | `PasswordResetService` | `UserRepository` | `updatePassword()` | `userId, newHash` | Cập nhật mật khẩu và mở khóa tài khoản nếu đang bị khóa. |
| **8** | `PasswordResetService` | `TokenRepository` | `markAsUsed()` | `tokenId` | `UPDATE password_reset_tokens SET used = true WHERE id = ?`. |
| **9** | `PasswordResetService` | `AuditLogService` | `logAction()` | `userId, ipAddress` | Ghi nhật ký kiểm toán sự kiện đổi mật khẩu. |
| **10-11**| `AuthController` | Người dùng | `200 OK` | Success Message | Hoàn tất chu trình, điều hướng về màn hình đăng nhập. |

##### 3.5.3. Sequence Diagram: Expired or Previously Used Token Rejection
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as PasswordResetService
    participant DB as PostgreSQL (password_reset_tokens)

    User->>UI: Sử dụng lại link đã đặt lại mật khẩu trước đó (used=true)
    UI->>Ctrl: POST /api/v1/auth/reset-password (rawToken, newPassword)
    Ctrl->>Svc: resetPassword(rawToken, newPassword)
    Svc->>Svc: Tính tokenHash = SHA-256(rawToken)
    Svc->>DB: findByTokenHash(tokenHash)
    DB-->>Svc: PasswordResetToken Entity (used=true)
    Note over Svc: Phát hiện token đã bị sử dụng hoặc đã quá thời hạn 15 phút
    Svc-->>Ctrl: throw AppException(INVALID_OR_EXPIRED_RESET_TOKEN)
    Ctrl-->>UI: 400 Bad Request (ErrorCode: "TOKEN_EXPIRED", Message: "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.")
    UI-->>User: Hiển thị cảnh báo lỗi và nút bấm yêu cầu gửi lại link mới
```

###### Table 3.5.3: Error Handling & Exception Matrix (Reset Password)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Token không tồn tại** | `findByTokenHash() == Optional.empty()` | `400 Bad Request` | `INVALID_RESET_TOKEN` | "Liên kết đặt lại mật khẩu không hợp lệ." |
| **Token đã được sử dụng** | `token.used == true` | `400 Bad Request` | `RESET_TOKEN_ALREADY_USED` | "Liên kết này đã được sử dụng trước đó. Vui lòng yêu cầu liên kết mới." |
| **Token đã hết hạn** | `token.expiresAt < Instant.now()` | `400 Bad Request` | `RESET_TOKEN_EXPIRED` | "Liên kết đặt lại mật khẩu đã hết hạn (tối đa 15 phút)." |

---

#### 3.6 Token Refresh & Sliding Session Rotation

##### Context & Design Scope
* **Tác nhân:** Trình duyệt Client (Tự động thực hiện qua Axios Interceptor).
* **Mục tiêu:** Duy trì phiên làm việc liên tục (Sliding Session) cho người dùng mà không bắt buộc phải đăng nhập lại sau mỗi 60 phút, đồng thời ngăn chặn các cuộc tấn công chiếm quyền phiên.
* **Cơ chế Token Rotation:** Mỗi khi cấp mới Access Token, hệ thống đồng thời **hủy bỏ Refresh Token cũ và phát hành Refresh Token mới** vào HttpOnly Cookie. Nếu phát hiện một Refresh Token đã bị thu hồi được tái sử dụng, hệ thống lập tức kích hoạt cảnh báo an ninh và vô hiệu hóa toàn bộ phiên làm việc của người dùng.

##### 3.6.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +refreshToken(HttpServletRequest req, HttpServletResponse res) ResponseEntity~ApiResponse~AuthResponse~~
    }
    class AuthService {
        -JwtTokenProvider jwtTokenProvider
        -UserRepository userRepository
        -AuditLogService auditLogService
        +rotateRefreshToken(String oldRefreshToken, HttpServletResponse res) AuthResponse
    }
    class JwtTokenProvider {
        +validateToken(String token) boolean
        +getUserEmailFromToken(String token) String
        +generateAccessToken(Authentication auth) String
        +generateRefreshToken(Authentication auth) String
        +createHttpOnlyCookie(String token) ResponseCookie
    }

    AuthController --> AuthService
    AuthService --> JwtTokenProvider
```

###### Table 3.6.1: Token Refresh Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AuthController` | Presentation (REST) | Tiếp nhận yêu cầu làm mới phiên `POST /api/v1/auth/refresh`, trích xuất cookie `refresh_token`. | `+ refreshToken(HttpServletRequest, HttpServletResponse): ResponseEntity<ApiResponse<AuthResponse>>` |
| `AuthService` | Application Service | Xác thực chữ ký Refresh Token, nạp thông tin người dùng, xoay vòng mã token mới và ghi nhận kiểm toán. | `+ rotateRefreshToken(String, HttpServletResponse): AuthResponse` |
| `JwtTokenProvider` | Security Infrastructure | Thẩm định chữ ký số HMAC-SHA256, kiểm tra thời hạn và sinh token mới. | `+ validateToken(String): boolean`<br/>`+ getUserEmailFromToken(String): String` |

##### 3.6.2. Sequence Diagram: Successful Refresh Token Rotation via HttpOnly Cookie
```mermaid
sequenceDiagram
    autonumber
    actor Browser as Trình duyệt (Axios Interceptor)
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Token as JwtTokenProvider
    participant DB as PostgreSQL (users)

    Note over Browser: Access Token trong RAM vừa hết hạn 60 phút -> Nhận phản hồi 401 Unauthorized
    Browser->>Ctrl: POST /api/v1/auth/refresh (Cookie: refresh_token=OLD_REFRESH_TOKEN)
    Ctrl->>Svc: rotateRefreshToken(cookieToken, response)
    Svc->>Token: validateToken(OLD_REFRESH_TOKEN)
    Token-->>Svc: true (Chữ ký hợp lệ, chưa hết hạn)
    Svc->>Token: getUserEmailFromToken(OLD_REFRESH_TOKEN)
    Token-->>Svc: email = "patient@example.com"
    Svc->>DB: findByEmail("patient@example.com")
    DB-->>Svc: User Entity (Active)
    Svc->>Token: generateAccessToken(user) -> newAccessToken (Hạn 60m)
    Svc->>Token: generateRefreshToken(user) -> newRefreshToken (Hạn 7d)
    Svc->>Token: createHttpOnlyCookie(newRefreshToken)
    Token-->>Svc: ResponseCookie (Set-Cookie: refresh_token=newRefreshToken)
    Svc-->>Ctrl: AuthResponse(newAccessToken, userDto)
    Ctrl-->>Browser: 200 OK + Set-Cookie Header + Body: { accessToken: newAccessToken }
    Browser->>Browser: Cập nhật accessToken mới vào RAM và tự động gửi lại request ban đầu bị lỗi 401
```

###### Table 3.6.2: Step-by-Step Flow Specification (Token Rotation Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Trình duyệt | `AuthController` | `POST /api/v1/auth/refresh` | Cookie `refresh_token` | Tự động kích hoạt khi nhận lỗi 401 từ các API khác. |
| **2** | `AuthController` | `AuthService` | `rotateRefreshToken()` | `oldToken, response` | Khởi chạy quy trình xoay vòng token phiên. |
| **3-4** | `AuthService` | `JwtTokenProvider` | `validateToken()` | `oldToken` | Giải mã chữ ký số bí mật và kiểm tra thời hạn Claims. |
| **5-6** | `AuthService` | `JwtTokenProvider` | `getUserEmailFromToken()` | `oldToken` | Trích xuất Subject email từ JWT claims. |
| **7-8** | `AuthService` | `UserRepository` | `findByEmail()` | `email` | `SELECT * FROM users WHERE email = ? AND status = 'ACTIVE'`. |
| **9-11**| `AuthService` | `JwtTokenProvider` | Sinh bộ đôi token mới | `user` | Sinh `newAccessToken` (60m) và `newRefreshToken` (7d). |
| **12-14**| `AuthController` | Trình duyệt | `200 OK` | `newAccessToken` + Cookie | Trả về token mới, trình duyệt gửi lại request bị gián đoạn. |

##### 3.6.3. Sequence Diagram: Revoked / Tampered Refresh Token (Security Alert)
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ tấn công
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Token as JwtTokenProvider
    participant Audit as AuditLogService

    Attacker->>Ctrl: POST /api/v1/auth/refresh (Cookie Refresh Token giả mạo hoặc đã bị thu hồi)
    Ctrl->>Svc: rotateRefreshToken(tamperedToken, response)
    Svc->>Token: validateToken(tamperedToken)
    Token-->>Svc: false (Chữ ký HMAC không khớp hoặc Token đã bị Revoke)
    Svc->>Audit: logSecurityEvent("TOKEN_TAMPERING_DETECTED", ipAddress)
    Svc->>Ctrl: Set-Cookie: refresh_token=, Max-Age=0 (Xóa cookie kẻ tấn công)
    Svc-->>Ctrl: throw AppException(UNAUTHORIZED_INVALID_REFRESH_TOKEN)
    Ctrl-->>Attacker: 401 Unauthorized (ErrorCode: "INVALID_REFRESH_TOKEN", Message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
```

###### Table 3.6.3: Error Handling & Exception Matrix (Token Refresh)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Không có Cookie Refresh Token** | `cookie == null` | `401 Unauthorized` | `MISSING_REFRESH_TOKEN` | "Không tìm thấy phiên làm việc. Vui lòng đăng nhập." |
| **Token giả mạo / Hết hạn** | `validateToken() == false` | `401 Unauthorized` | `INVALID_REFRESH_TOKEN` | Xóa cookie phiên ngay lập tức, chuyển hướng về trang Login. |
| **Người dùng bị khóa trong lúc dùng** | `user.status == 'SUSPENDED'` | `403 Forbidden` | `ACCOUNT_SUSPENDED` | Hủy bỏ phiên làm việc, từ chối cấp token mới. |

---

#### 3.7 Secure Logout & Refresh Cookie Invalidation

##### Context & Design Scope
* **Tác nhân:** Tất cả người dùng đã đăng nhập.
* **Mục tiêu:** Cho phép người dùng chủ động kết thúc phiên làm việc an toàn, xóa sạch token khỏi bộ nhớ trình duyệt và hủy cookie `refresh_token` ở cấp độ giao thức HTTP.
* **Cơ chế an toàn:** Gửi chỉ thị `Set-Cookie` với giá trị rỗng và `Max-Age=0`, buộc trình duyệt xóa bỏ hoàn toàn tệp tin cookie khỏi bộ nhớ an toàn của hệ điều hành.

##### 3.7.1. Class Diagram
```mermaid
classDiagram
    class AuthController {
        -AuthService authService
        +logout(HttpServletResponse response, UserPrincipal principal) ResponseEntity~ApiResponse~String~~
    }
    class AuthService {
        -AuditLogService auditLogService
        +logout(UUID userId, HttpServletResponse response) void
    }

    AuthController --> AuthService
```

###### Table 3.7.1: Logout Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AuthController` | Presentation (REST) | Tiếp nhận yêu cầu đăng xuất `POST /api/v1/auth/logout`. | `+ logout(HttpServletResponse, UserPrincipal): ResponseEntity<ApiResponse<String>>` |
| `AuthService` | Application Service | Ghi nhật ký kiểm toán hành vi đăng xuất và thiết lập chỉ thị hủy bỏ cookie HTTP. | `+ logout(UUID userId, HttpServletResponse response): void` |

##### 3.7.2. Sequence Diagram: Successful Logout & Cookie Clearing
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AuthController
    participant Svc as AuthService
    participant Audit as AuditLogService

    Patient->>UI: Nhấn nút "Đăng xuất" trên thanh Header
    UI->>Ctrl: POST /api/v1/auth/logout (Header: Bearer accessToken)
    Ctrl->>Svc: logout(principal.getId(), response)
    Svc->>Audit: logAction("LOGOUT", principal.getId(), "Đăng xuất an toàn", ipAddress)
    Svc->>Ctrl: Set-Cookie: refresh_token=, Path=/, Max-Age=0, HttpOnly, SameSite=Lax
    Ctrl-->>UI: 200 OK (Message: "Đăng xuất thành công")
    UI->>UI: Xóa accessToken khỏi RAM, xóa toàn bộ Cache bộ đệm giao diện
    UI-->>Patient: Chuyển hướng người dùng về trang chủ LandingPage
```

###### Table 3.7.2: Step-by-Step Flow Specification (Logout)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhấn "Đăng xuất" | Tương tác UI | Kích hoạt sự kiện logout từ Menu hồ sơ cá nhân. |
| **2** | React SPA | `AuthController` | `POST /api/v1/auth/logout` | Header `Bearer <token>` | Gửi yêu cầu chấm dứt phiên làm việc. |
| **3** | `AuthController` | `AuthService` | `logout()` | `userId, response` | Bắt đầu quy trình dọn dẹp phiên máy chủ. |
| **4** | `AuthService` | `AuditLogService` | `logAction()` | `"LOGOUT", userId` | `INSERT INTO audit_logs (action='LOGOUT', ...)`. |
| **5** | `AuthService` | `HttpServletResponse` | `addHeader()` | `Set-Cookie: Max-Age=0` | Chỉ thị trình duyệt xóa vĩnh viễn cookie phiên. |
| **6-8** | `AuthController` | Bệnh nhân | `200 OK` | Điều hướng `/` | Trình duyệt dọn sạch bộ nhớ RAM và trở về trang Landing. |

##### 3.7.3. Sequence Diagram: Expired Session Logout
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as AuthController

    User->>UI: Nhấn Đăng xuất khi Access Token đã hết hạn từ lâu
    UI->>Ctrl: POST /api/v1/auth/logout (Token đã hết hạn)
    Note over Ctrl: Bộ lọc bảo mật cho phép endpoint /logout hoạt động ngay cả khi token hết hạn<br/>để đảm bảo client luôn xóa được cookie phiên.
    Ctrl-->>UI: 200 OK + Set-Cookie: refresh_token=, Max-Age=0
    UI-->>User: Xóa sạch bộ nhớ cục bộ và trở về màn hình đăng nhập
```

###### Table 3.7.3: Error Handling & Exception Matrix (Logout)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Phiên đã hết hạn trước đó** | Access token đã hết hạn | `200 OK` | `NONE` | Vẫn trả về 200 OK và xóa cookie để đảm bảo trạng thái sạch tại Client. |

---

#### 3.8 Update User Profile & Notification Preferences

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân, Bác sĩ (Authenticated Users).
* **Mục tiêu:** Cho phép người dùng cập nhật thông tin cá nhân (Họ tên, Số điện thoại, Địa chỉ cư trú, Thông tin liên hệ khẩn cấp) và quản lý tùy chọn nhận thông báo.
* **Quy tắc an ninh:**
  - Người dùng chỉ được phép chỉnh sửa hồ sơ của chính mình (`principal.getId()`).
  - Số điện thoại phải thỏa mãn định dạng viễn thông quốc gia.
  - Mọi thao tác cập nhật thông tin y tế nhạy cảm đều được ghi nhật ký kiểm toán.

##### 3.8.1. Class Diagram
```mermaid
classDiagram
    class PatientProfileController {
        -PatientProfileService profileService
        +getMyProfile(UserPrincipal principal) ResponseEntity~ApiResponse~PatientProfileDto~~
        +updateProfile(UpdateProfileRequest request, UserPrincipal principal) ResponseEntity~ApiResponse~PatientProfileDto~~
    }
    class PatientProfileService {
        -UserRepository userRepository
        -PatientProfileRepository patientRepo
        -AuditLogService auditLogService
        +updateProfile(UUID userId, UpdateProfileRequest request) PatientProfileDto
    }
    class UpdateProfileRequest {
        -String fullName
        -String phone
        -String address
        -String emergencyContactName
        -String emergencyContactPhone
        -String emergencyContactRelationship
    }
    class PatientProfileDto {
        -UUID id
        -String patientCode
        -String fullName
        -String phone
        -String citizenId
        -String healthInsuranceNumber
        -String address
        -String bloodGroup
        -String allergies
    }

    PatientProfileController --> PatientProfileService
    PatientProfileController ..> UpdateProfileRequest
    PatientProfileController ..> PatientProfileDto
```

###### Table 3.8.1: Profile Management Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `PatientProfileController` | Presentation (REST) | Cung cấp API `GET /api/v1/patient-profiles/me` và `PUT /api/v1/patient-profiles/me`. | `+ updateProfile(@Valid @RequestBody UpdateProfileRequest, UserPrincipal): ResponseEntity<ApiResponse<PatientProfileDto>>` |
| `PatientProfileService` | Application Service | Cập nhật đồng bộ bảng `users` và bảng `patient_profiles`, đảm bảo tính toàn vẹn dữ liệu giao dịch `@Transactional`. | `+ updateProfile(UUID userId, UpdateProfileRequest request): PatientProfileDto` |

##### 3.8.2. Sequence Diagram: Successful Profile & Demographic Update
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (PatientDashboard)
    participant Ctrl as PatientProfileController
    participant Svc as PatientProfileService
    participant DB as PostgreSQL (users, patient_profiles)
    participant Audit as AuditLogService

    Patient->>UI: Thay đổi số điện thoại và địa chỉ thường trú, nhấn "Lưu thay đổi"
    UI->>Ctrl: PUT /api/v1/patient-profiles/me (UpdateProfileRequest)
    Ctrl->>Svc: updateProfile(principal.getId(), request)
    Svc->>DB: findByUserId(userId)
    DB-->>Svc: User Entity & PatientProfile Entity
    Svc->>DB: UPDATE users SET full_name = request.fullName, phone = request.phone, updated_at = NOW() WHERE id = userId
    Svc->>DB: UPDATE patient_profiles SET address = request.address, emergency_contact_name = request.emergencyContactName, emergency_contact_phone = request.emergencyContactPhone, updated_at = NOW() WHERE user_id = userId
    Svc->>Audit: logAction("UPDATE_PROFILE", userId, "Cập nhật hồ sơ bệnh nhân", ipAddress)
    Svc-->>Ctrl: PatientProfileDto (Đã cập nhật)
    Ctrl-->>UI: 200 OK + Body: { status: "success", data: PatientProfileDto }
    UI-->>Patient: Hiển thị thông báo Toast "Cập nhật thông tin hồ sơ thành công"
```

###### Table 3.8.2: Step-by-Step Flow Specification (Update Profile)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhập dữ liệu mới | Địa chỉ, SĐT, Người liên hệ | Kiểm tra định dạng cơ bản tại Client. |
| **2** | React SPA | `PatientProfileController` | `PUT /api/v1/patient-profiles/me` | `UpdateProfileRequest` | Gửi dữ liệu cập nhật kèm Bearer Token. |
| **3** | Controller | `PatientProfileService` | `updateProfile()` | `userId, request` | Bắt đầu giao dịch `@Transactional`. |
| **4** | Service | `UserRepository` | `findByUserId()` | `userId` | `SELECT * FROM users JOIN patient_profiles ...` |
| **5** | Service | `UserRepository` | `save(user)` | `User` | `UPDATE users SET full_name = ?, phone = ? WHERE id = ?`. |
| **6** | Service | `PatientProfileRepository` | `save(profile)` | `PatientProfile` | `UPDATE patient_profiles SET address = ? WHERE user_id = ?`. |
| **7** | Service | `AuditLogService` | `logAction()` | `"UPDATE_PROFILE", userId` | `INSERT INTO audit_logs (action='UPDATE_PROFILE', ...)`. |
| **8-9** | Controller | Bệnh nhân | `200 OK` | `PatientProfileDto` | Trả về thông tin hồ sơ mới và hiển thị Toast xanh. |

##### 3.8.3. Sequence Diagram: Validation Error / Duplicate Phone Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as PatientProfileController
    participant Svc as PatientProfileService
    participant DB as PostgreSQL (users)

    Patient->>UI: Cập nhật số điện thoại đã thuộc về một tài khoản khác
    UI->>Ctrl: PUT /api/v1/patient-profiles/me (phone="0912345678")
    Ctrl->>Svc: updateProfile(userId, request)
    Svc->>DB: existsByPhoneAndIdNot("0912345678", userId)
    DB-->>Svc: true (Đã có người dùng khác đăng ký số này)
    Svc-->>Ctrl: throw AppException(PHONE_ALREADY_IN_USE, "Số điện thoại này đã được sử dụng bởi một tài khoản khác.")
    Ctrl-->>UI: 409 Conflict (ErrorCode: "PHONE_ALREADY_IN_USE")
    UI-->>Patient: Hiển thị thông báo lỗi trùng số điện thoại
```

###### Table 3.8.3: Error Handling & Exception Matrix (Profile Management)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Trùng số điện thoại** | `existsByPhoneAndIdNot() == true` | `409 Conflict` | `PHONE_ALREADY_IN_USE` | "Số điện thoại này đã được sử dụng bởi tài khoản khác." |
| **Số điện thoại không hợp lệ** | `@Pattern` không khớp định dạng | `400 Bad Request` | `INVALID_PHONE_FORMAT` | "Số điện thoại phải từ 10 đến 11 chữ số hợp lệ." |

---

#### 3.9 AI Symptom Triage Analysis & 5-Stage Clinical Defense

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân (Guest hoặc Authenticated Patient).
* **Mục tiêu:** Cung cấp trợ lý ảo thông minh tiếp nhận mô tả triệu chứng bệnh bằng ngôn ngữ tự nhiên tiếng Việt, phân tích mức độ khẩn cấp y tế và gợi ý chuyên khoa khám bệnh chính xác.
* **Động cơ phòng thủ lâm sàng 5 tầng (5-Stage Clinical Query Defense Engine):**
  1. **Stage 1 (Acute Red-Flag Emergency Regex):** Quét các mẫu triệu chứng đe dọa tính mạng (Đột quỵ FAST, Nhồi máu cơ tim cấp, Sốc phản vệ). Nếu phát hiện, **ngay lập tức khóa luồng khám thường** và kích hoạt còi báo động khuyên gọi Cấp cứu 115.
  2. **Stage 2 (Vietnamese Slang & Teen-code Normalization):** Chuẩn hóa phương ngữ và từ lóng tiếng Việt (ví dụ: "chong mat", "xot ruot", "met moi kinh khung").
  3. **Stage 3 (Vietnamese NegEx Negation Clause Splitting):** Phân tách mệnh đề phủ định ("nhưng không sốt", "chưa từng đau tim") để cách ly hoàn toàn triệu chứng bị loại trừ, tránh định tuyến nhầm chuyên khoa.
  4. **Stage 4 (Out-of-Domain Gating):** Chặn các câu hỏi phi lâm sàng (Hỏi giá tiền, thủ tục bảo hiểm, chào hỏi vu vơ).
  5. **Stage 5 (Compound Multi-Symptom Decomposition & SBAR Summary):** Gọi mô hình Google Gemini 1.5 Flash sinh tóm tắt cấu trúc y khoa chuẩn SBAR (Situation, Background, Assessment, Recommendation).

##### 3.9.1. Class Diagram
```mermaid
classDiagram
    class TriageController {
        -TriageService triageService
        -TriageRateLimiterService rateLimiterService
        +analyzeSymptoms(TriageRequest request) ResponseEntity~ApiResponse~TriageResponse~~
    }
    class TriageService {
        -RedFlagService redFlagService
        -ClinicalQueryDefenseEngine defenseEngine
        -GeminiVisionClient geminiClient
        -TriageSessionRepository sessionRepo
        +processTriage(TriageRequest request, UUID userId) TriageResponse
    }
    class RedFlagService {
        +detectEmergency(String text) RedFlagResult
    }
    class ClinicalQueryDefenseEngine {
        -VietnameseSlangNormalizer slangNormalizer
        -NegationEngine negExEngine
        +sanitizeAndFilter(String text) ClinicalQueryDefenseResult
    }
    class TriageResponse {
        -boolean isEmergency
        -TriageUrgency urgencyLevel
        -String primarySpecialty
        -String sbarSummary
        -String aiAdvice
        -List~String~ recommendedDoctorIds
    }

    TriageController --> TriageService
    TriageService --> RedFlagService
    TriageService --> ClinicalQueryDefenseEngine
    TriageService --> TriageResponse
```

###### Table 3.9.1: Symptom Triage Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `TriageController` | Presentation (REST) | Tiếp nhận yêu cầu phân luồng `POST /api/v1/triage/analyze`, kiểm soát giới hạn tần suất (Rate Limiting). | `+ analyzeSymptoms(@Valid @RequestBody TriageRequest): ResponseEntity<ApiResponse<TriageResponse>>` |
| `TriageService` | Application Service | Điều phối đường ống 5 tầng, ghi nhật ký phiên vào bảng `triage_sessions` và lưu trữ lịch sử hội thoại. | `+ processTriage(TriageRequest, UUID): TriageResponse` |
| `RedFlagService` | Clinical Defense | Quét biểu thức chính quy phát hiện dấu hiệu cấp cứu tối khẩn (Stroke FAST, Coronary, Anaphylaxis). | `+ detectEmergency(String): RedFlagResult` |
| `ClinicalQueryDefenseEngine` | NLP Pipeline | Chuẩn hóa tiếng Việt, bóc tách mệnh đề phủ định NegEx và kiểm tra câu hỏi ngoài phạm vi y khoa. | `+ sanitizeAndFilter(String): ClinicalQueryDefenseResult` |
| `TriageResponse` | DTO | Kết quả phân luồng lâm sàng trả về cho người bệnh. | `- isEmergency: boolean`<br/>`- urgencyLevel: TriageUrgency`<br/>`- primarySpecialty: String`<br/>`- sbarSummary: String` |

##### 3.9.2. Sequence Diagram: Standard Symptom Analysis & Multi-Specialty Routing (NegEx + SBAR)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (SymptomTriagePage)
    participant Ctrl as TriageController
    participant Svc as TriageService
    participant RedFlag as RedFlagService (Stage 1)
    participant Defense as ClinicalQueryDefenseEngine (Stage 2-4)
    participant AI as Google Gemini 1.5 Flash (Stage 5)
    participant DB as PostgreSQL (triage_sessions)

    Patient->>UI: Nhập: "Tôi bị đau tức ngực âm ỉ 3 ngày, nhưng không khó thở, không sốt"
    UI->>Ctrl: POST /api/v1/triage/analyze (TriageRequest)
    Ctrl->>Svc: processTriage(request, userId)
    Svc->>RedFlag: detectEmergency(text)
    RedFlag-->>Svc: RedFlagResult (isEmergency = false) -> Vượt qua Stage 1 an toàn
    Svc->>Defense: sanitizeAndFilter(text)
    Note over Defense: Stage 2: Chuẩn hóa teen-code & phương ngữ<br/>Stage 3 (Vietnamese NegEx): Tách mệnh đề khẳng định C_aff ("đau tức ngực âm ỉ 3 ngày") và cách ly mệnh đề phủ định C_neg ("không khó thở", "không sốt")<br/>Stage 4: Xác nhận câu hỏi hoàn toàn thuộc phạm vi y khoa lâm sàng
    Defense-->>Svc: ClinicalQueryDefenseResult (cleanSymptoms: "đau tức ngực âm ỉ 3 ngày")
    Svc->>AI: generateSbarTriage(cleanSymptoms)
    AI-->>Svc: JSON (primarySpecialty="Tim mạch", urgencyLevel="URGENT", sbarSummary=..., aiAdvice=...)
    Svc->>DB: INSERT INTO triage_sessions (user_id, symptoms_text, is_emergency=false, urgency_level='URGENT', primary_specialty='Tim mạch', sbar_summary=...)
    DB-->>Svc: TriageSession Entity Saved
    Svc-->>Ctrl: TriageResponse (Khuyên khám Tim mạch, Huy hiệu Vàng)
    Ctrl-->>UI: 200 OK + TriageResponse
    UI-->>Patient: Hiển thị kết quả phân tích SBAR & Nút "Đặt lịch ngay với Bác sĩ Tim mạch"
```

###### Table 3.9.2: Step-by-Step Flow Specification (Symptom Triage Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhập triệu chứng bệnh | Chuỗi văn bản tiếng Việt | Kiểm tra độ dài văn bản (>= 5 ký tự). |
| **2** | React SPA | `TriageController` | `POST /api/v1/triage/analyze` | `TriageRequest(symptoms)` | Gửi yêu cầu qua REST API. |
| **3** | `TriageController` | `TriageService` | `processTriage()` | `request, userId` | Khởi động đường ống phân luồng 5 tầng. |
| **4-5** | `TriageService` | `RedFlagService` | `detectEmergency()` | `symptomsText` | Stage 1: Quét Regex từ khóa cấp cứu tối khẩn. |
| **6-7** | `TriageService` | `ClinicalQueryDefenseEngine` | `sanitizeAndFilter()` | `symptomsText` | Stage 2 (Chuẩn hóa) -> Stage 3 (NegEx bóc tách phủ định) -> Stage 4 (Kiểm tra OOD). |
| **8-9** | `TriageService` | `GeminiVisionClient` | `generateSbarTriage()` | `cleanSymptoms` | Stage 5: Gọi mô hình Gemini Flash sinh cấu trúc SBAR. |
| **10** | `TriageService` | `TriageSessionRepository` | `save(session)` | `TriageSession` | `INSERT INTO triage_sessions (...)`. |
| **11-13**| `TriageController` | Bệnh nhân | `200 OK` | `TriageResponse` | Hiển thị kết quả và gợi ý đặt lịch chuyên khoa. |

##### 3.9.3. Sequence Diagram: Stage 1 Acute Red-Flag Emergency Lockout (Hotline 115)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân cấp cứu
    participant UI as React 18 SPA
    participant Ctrl as TriageController
    participant Svc as TriageService
    participant RedFlag as RedFlagService (Stage 1)
    participant DB as PostgreSQL (triage_sessions)

    Patient->>UI: Nhập: "Bố tôi bị méo miệng, liệt nửa người, nói ngọng đột ngột"
    UI->>Ctrl: POST /api/v1/triage/analyze
    Ctrl->>Svc: processTriage(request, userId)
    Svc->>RedFlag: detectEmergency(text)
    Note over RedFlag: Khớp biểu thức Regex Đột quỵ FAST: [meo mieng, liet nua nguoi]<br/>Kích hoạt trạng thái Cấp cứu tối khẩn y tế!
    RedFlag-->>Svc: RedFlagResult (isEmergency = true, triggerPattern = "ACUTE_STROKE_FAST")
    Svc->>DB: INSERT INTO triage_sessions (is_emergency=true, urgency_level='EMERGENCY', ai_advice="GỌI NGAY CẤP CỨU 115 HOẶC ĐẾN BỆNH VIỆN GẦN NHẤT")
    Svc-->>Ctrl: TriageResponse(isEmergency=true, urgencyLevel=EMERGENCY)
    Ctrl-->>UI: 200 OK + TriageResponse (Khóa tính năng đặt lịch thường)
    UI-->>Patient: Bật màn hình cảnh báo ĐỎ TOÀN BỘ + Nút gọi nhanh Cấp cứu 115
```

###### Table 3.9.3: Error Handling & Exception Matrix (Triage)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Cấp cứu tối khẩn (Red-Flag)** | Khớp mẫu đột quỵ, nhồi máu cơ tim, sốc phản vệ | `200 OK` (Cờ `isEmergency=true`) | `EMERGENCY_LOCKOUT` | "DẤU HIỆU CẤP CỨU NGUY KỊCH! Vui lòng gọi ngay 115 hoặc đến cơ sở y tế gần nhất." Khóa toàn bộ tính năng đặt lịch. |
| **Câu hỏi ngoài phạm vi y khoa** | Stage 4 phát hiện câu hỏi hành chính, viện phí, chào hỏi | `200 OK` (Cờ `isOod=true`) | `OUT_OF_DOMAIN_QUERY` | "Hệ thống chỉ hỗ trợ phân luồng triệu chứng bệnh lý. Vui lòng liên hệ bộ phận chăm sóc khách hàng để hỏi thủ tục." |
| **Mô tả quá ngắn / vô nghĩa** | Văn bản < 5 ký tự hoặc toàn ký tự đặc biệt | `400 Bad Request` | `SYMPTOM_TEXT_TOO_SHORT` | "Vui lòng mô tả chi tiết biểu hiện khó chịu của bạn để hệ thống hỗ trợ tốt nhất." |

---

#### 3.10 Doctor Semantic Vector Search & Hybrid Re-ranking (pgvector + WHRF)

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân (Guest hoặc Authenticated Patient).
* **Mục tiêu:** Cung cấp động cơ tìm kiếm bác sĩ thông minh dựa trên ngữ nghĩa tự nhiên của bệnh nhân (ví dụ: "bác sĩ giỏi chữa đau nửa đầu và mất ngủ kinh niên"), kết hợp khoảng cách vector với các yếu tố uy tín lâm sàng.
* **Động cơ tái xếp hạng đa tiêu chí WHRF-SOTA:**
  - **Chỉ mục HNSW (Hierarchical Navigable Small World):** Tìm kiếm vector 1536 chiều trên cột `bio_embedding` với độ trễ dưới **0.72ms** (Flyway V19).
  - **Hàm làm sắc nét Sigmoid Contrastive Sharpening:**
    $$S_{dense} = \frac{1}{1 + e^{-8.0 \cdot (\text{CosineSim} - 0.65)}}$$
  - **Bộ giảm chấn độ tin cậy đánh giá (Credibility Damper):**
    $$W_{cred} = \frac{\log_{10}(\text{review\_count} + 1)}{\log_{10}(100)}$$
  - **Cơ chế suy thoái êm dịu (Graceful Degradation):** Tự động chuyển sang Local Unsupervised Feature Hashing (FNV-1a 1536-dim) kết hợp PostgreSQL Trigram khi mất kết nối mạng ngoài.

##### 3.10.1. Class Diagram
```mermaid
classDiagram
    class DoctorController {
        -DoctorSemanticSearchService searchService
        +searchDoctors(String query, String specialty, Double maxFee) ResponseEntity~ApiResponse~List~DoctorMatchDto~~~
    }
    class DoctorSemanticSearchService {
        -EmbeddingService embeddingService
        -DoctorProfileRepository doctorRepo
        -SpecialtyRepository specialtyRepo
        -TwoLayerCacheService cacheService
        +searchDoctors(String query, String specialty, Double maxFee) List~DoctorMatchDto~
        -calculateWhrfScore(DoctorProfile doc, double cosineSim, String query) double
    }
    class EmbeddingService {
        -OpenAIClient openAiClient
        -boolean forceOfflineSimulation
        +getEmbedding(String text) float[]
        -generateLocalFeatureHash(String text) float[]
    }
    class DoctorMatchDto {
        -UUID doctorId
        -String fullName
        -String academicTitle
        -String hospitalAffiliation
        -double rating
        -int reviewCount
        -double consultationFee
        -double matchPercentage
        -double whrfScore
    }

    DoctorController --> DoctorSemanticSearchService
    DoctorSemanticSearchService --> EmbeddingService
    DoctorSemanticSearchService --> DoctorMatchDto
```

###### Table 3.10.1: Doctor Search Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `DoctorController` | Presentation (REST) | Cung cấp API `GET /api/v1/doctors` và `GET /api/v1/doctors/search`. | `+ searchDoctors(@RequestParam String query, ...): ResponseEntity<ApiResponse<List<DoctorMatchDto>>>` |
| `DoctorSemanticSearchService` | Application Service | Điều phối tìm kiếm lai HNSW, áp dụng công thức toán học WHRF và sắp xếp qua Min-Heap Priority Queue. | `+ searchDoctors(String, String, Double): List<DoctorMatchDto>`<br/>`- calculateWhrfScore(DoctorProfile, double, String): double` |
| `EmbeddingService` | AI Infrastructure | Gọi OpenAI API sinh vector 1536 chiều; tự động chuyển sang Feature Hashing cục bộ khi offline. | `+ getEmbedding(String): float[]`<br/>`- generateLocalFeatureHash(String): float[]` |
| `DoctorMatchDto` | DTO | Đóng gói thông tin bác sĩ kèm điểm số mức độ phù hợp hiển thị trên giao diện người dùng. | `- doctorId: UUID`<br/>`- fullName: String`<br/>`- matchPercentage: double`<br/>`- whrfScore: double` |

##### 3.10.2. Sequence Diagram: HNSW Vector Search + Sigmoid Contrastive Re-Ranking
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (DoctorSearchPage)
    participant Ctrl as DoctorController
    participant Svc as DoctorSemanticSearchService
    participant Embed as EmbeddingService
    participant AI as OpenAI API (text-embedding-3-small)
    participant DB as PostgreSQL 16 (doctor_profiles + pgvector HNSW)

    Patient->>UI: Nhập: "Bác sĩ chuyên điều trị đau nửa đầu mãn tính và mất ngủ"
    UI->>Ctrl: GET /api/v1/doctors/search?query=...
    Ctrl->>Svc: searchDoctors(query, specialty, maxFee)
    Svc->>Embed: getEmbedding(query)
    Embed->>AI: POST /v1/embeddings (input: query)
    AI-->>Embed: Vector float[1536] (queryVector)
    Embed-->>Svc: queryVector
    Svc->>DB: HNSW Query: SET LOCAL hnsw.ef_search = 120 -- SELECT dp.*, cosine_sim FROM doctor_profiles WHERE is_verified=true ORDER BY bio_embedding <=> queryVector LIMIT 20
    DB-->>Svc: Top 20 Ứng viên Bác sĩ có khoảng cách Cosine gần nhất
    loop Áp dụng Thuật toán WHRF-SOTA cho từng Bác sĩ
        Svc->>Svc: S_dense = 1 / (1 + exp(-8.0 * (cosine_sim - 0.65)))
        Svc->>Svc: W_cred = log10(review_count + 1) / log10(100)
        Svc->>Svc: Điểm thưởng Chuyên khoa (+0.12) & Điểm thưởng Học vị (+0.08 nếu GS, +0.05 nếu PGS)
        Svc->>Svc: WHRF_Score = 0.50*S_dense + 0.20*S_sparse + 0.15*Rating*W_cred + SpecialtyBonus
    end
    Svc->>Svc: Sắp xếp lấy Top 10 bác sĩ có điểm WHRF cao nhất
    Svc-->>Ctrl: List DoctorMatchDto
    Ctrl-->>UI: 200 OK + List DoctorMatchDto
    UI-->>Patient: Hiển thị danh sách bác sĩ với huy hiệu tỷ lệ phù hợp (%) và nút "Đặt lịch khám"
```

###### Table 3.10.2: Step-by-Step Flow Specification (Doctor Search Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhập câu hỏi tìm kiếm | Chuỗi văn bản triệu chứng | Áp dụng Hook `useDebounce(300ms)` chống quá tải máy chủ. |
| **2** | React SPA | `DoctorController` | `GET /api/v1/doctors/search` | `query, specialty, maxFee` | Gửi yêu cầu tìm kiếm qua REST API. |
| **3** | `DoctorController` | `DoctorSemanticSearchService` | `searchDoctors()` | `query, ...` | Khởi động quy trình tìm kiếm vector ngữ nghĩa. |
| **4-6** | `DoctorSemanticSearchService` | `EmbeddingService` | `getEmbedding()` | `query` | Gọi OpenAI API lấy vector nhúng 1536 chiều. |
| **7** | `DoctorSemanticSearchService` | `DoctorProfileRepository` | Native HNSW Query | `queryVector` | `SET LOCAL hnsw.ef_search = 120; SELECT ... ORDER BY bio_embedding <=> ? LIMIT 20`. |
| **8-12**| `DoctorSemanticSearchService` | Nội bộ | Tính toán công thức WHRF | `doc, cosine_sim` | Áp dụng Sigmoid Sharpening, Credibility Damper, Thưởng chuyên khoa. |
| **13** | Service | Controller | Trả về kết quả | `List<DoctorMatchDto>` | Đóng gói dữ liệu hiển thị (Match %, Bio, Review count). |
| **14-15**| Controller | Bệnh nhân | `200 OK` | Danh sách thẻ bác sĩ | Render giao diện danh sách bác sĩ kèm thông tin trực quan. |

##### 3.10.3. Sequence Diagram: Out-of-Domain Query Gating / Degraded Feature Hash Fallback
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as DoctorController
    participant Svc as DoctorSemanticSearchService
    participant Embed as EmbeddingService
    participant AI as OpenAI API
    participant DB as PostgreSQL (pg_trgm Full-Text Search)

    User->>UI: Tìm kiếm bác sĩ khi đường truyền quốc tế gặp sự cố (OpenAI Timeout)
    UI->>Ctrl: GET /api/v1/doctors/search?query=...
    Ctrl->>Svc: searchDoctors(...)
    Svc->>Embed: getEmbedding(query)
    Embed->>AI: POST /v1/embeddings
    AI-->>Embed: ResourceAccessException / ConnectTimeoutException
    Note over Embed: Kích hoạt cơ chế Fallback suy thoái êm dịu (Graceful Degradation):<br/>Chuyển sang Unsupervised Character N-gram Feature Hashing (FNV-1a 1536-dim)
    Embed->>Embed: generateLocalFeatureHash(query) -> localVector
    Embed-->>Svc: localVector
    Svc->>DB: Tìm kiếm kết hợp vector cục bộ và Full-Text Search tiếng Việt (pg_trgm)
    DB-->>Svc: Danh sách bác sĩ phù hợp theo từ khóa
    Svc-->>Ctrl: List DoctorMatchDto (Kèm cờ offlineSimulation = true)
    Ctrl-->>UI: 200 OK + Danh sách bác sĩ
    UI-->>User: Hiển thị kết quả tìm kiếm bình thường không bị gián đoạn dịch vụ
```

###### Table 3.10.3: Error Handling & Exception Matrix (Doctor Search)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Mất mạng ngoài / OpenAI lỗi** | `TimeoutException` khi gọi OpenAI | `200 OK` (Fallback Mode) | `OFFLINE_SEARCH_ACTIVE` | Tự động chuyển sang Feature Hashing cục bộ và Full-Text Search PostgreSQL, không làm sập giao diện. |
| **Bộ lọc viện phí không hợp lệ** | `maxFee < 0` | `400 Bad Request` | `INVALID_FEE_FILTER` | "Mức viện phí lọc phải lớn hơn 0 VND." |
'''
