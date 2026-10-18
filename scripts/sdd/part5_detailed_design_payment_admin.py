"""
Part 5 of SDD Generator: Section 3 Detailed Design (Features 3.21 to 3.28 - VNPay, Refunds, Admin Approval, Specialties, Users, Auditing, Mail Engine).
"""

def get_part5_content():
    return '''#### 3.21 VNPay Payment Gateway Initialization & Cryptographic Checksum

##### 3.21.1. Class Diagram
```mermaid
classDiagram
    class PaymentController {
        -PaymentService paymentService
        +createPaymentUrl(CreatePaymentRequest request, HttpServletRequest httpRequest) ResponseEntity~PaymentUrlResponse~
    }
    class PaymentService {
        -PaymentTransactionRepository transactionRepo
        -VNPayGatewayAdapter vnpayAdapter
        -AppointmentRepository appointmentRepo
        +initializePaymentOrder(UUID userId, CreatePaymentRequest request, String clientIp) PaymentUrlResponse
    }
    class VNPayGatewayAdapter {
        -String vnpTmnCode
        -String vnpHashSecret
        -String vnpUrl
        +generatePaymentUrl(PaymentTransaction tx, String clientIp) String
        -hmacSHA512(String key, String data) String
    }
    class PaymentTransaction {
        -UUID id
        -String transactionCode
        -UUID userId
        -BigDecimal amount
        -PaymentStatus status
        -String paymentGateway
    }

    PaymentController --> PaymentService
    PaymentService --> VNPayGatewayAdapter
    PaymentService --> PaymentTransaction
```

##### 3.21.2. Sequence Diagram: Order Creation & HMAC-SHA512 Payment URL Generation
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (BookingModal / PaymentCheckout)
    participant Ctrl as PaymentController
    participant Svc as PaymentService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (payment_transactions, appointments)

    Patient->>UI: Chọn phương thức "Thanh toán qua VNPay"
    UI->>Ctrl: POST /api/v1/payments/create-url (CreatePaymentRequest: appointmentCode="APT-7712")
    Ctrl->>Svc: initializePaymentOrder(patientId, request, clientIp)
    Svc->>DB: findByAppointmentCode("APT-7712")
    DB-->>Svc: Appointment (feeAmount = 500000 VND)
    Svc->>DB: INSERT INTO payment_transactions (transaction_code='TX-...', user_id=patientId, amount=500000, status='PENDING', payment_gateway='VNPAY')
    DB-->>Svc: Transaction Entity Saved
    Svc->>Adapter: generatePaymentUrl(tx, clientIp)
    Adapter->>Adapter: Sắp xếp các tham số truy vấn theo bảng chữ cái A-Z
    Adapter->>Adapter: Tính chuỗi mã hóa vnp_SecureHash = HMAC_SHA512(vnpHashSecret, queryString)
    Adapter-->>Svc: Full URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=50000000&...&vnp_SecureHash=...
    Svc-->>Ctrl: PaymentUrlResponse(paymentUrl)
    Ctrl-->>UI: 200 OK + { paymentUrl: "https://..." }
    UI->>UI: window.location.href = paymentUrl (Chuyển hướng cổng VNPay)
    UI-->>Patient: Hiển thị cổng thanh toán VNPay QR / Thẻ ngân hàng
```

##### 3.21.3. Sequence Diagram: Invalid Order Amount / Currency Parameter Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ tấn công
    participant UI as React 18 SPA
    participant Ctrl as PaymentController
    participant Svc as PaymentService

    Attacker->>Ctrl: POST /api/v1/payments/create-url (amount = -50000 hoặc currency = "USD")
    Ctrl->>Svc: initializePaymentOrder(...)
    Note over Svc: Ràng buộc nghiệp vụ y tế: Số tiền khám phải > 0 và đơn vị tiền tệ bắt buộc là VND
    Svc-->>Ctrl: throw AppException(INVALID_PAYMENT_AMOUNT_OR_CURRENCY)
    Ctrl-->>Attacker: 400 Bad Request
```

---

#### 3.22 VNPay IPN Webhook Processing & Idempotency Locking

##### 3.22.1. Class Diagram
```mermaid
classDiagram
    class PaymentWebhookController {
        -PaymentService paymentService
        +handleVnpayIpn(HttpServletRequest request) ResponseEntity~VNPayIpnResponse~
    }
    class PaymentService {
        -PaymentTransactionRepository transactionRepo
        -AppointmentRepository appointmentRepo
        -VNPayGatewayAdapter vnpayAdapter
        -EmailService emailService
        +processVnpayIpn(Map~String, String~ vnpParams) VNPayIpnResponse
    }

    PaymentWebhookController --> PaymentService
```

##### 3.22.2. Sequence Diagram: Valid Checksum Verification & Idempotent Order Fulfillment
```mermaid
sequenceDiagram
    autonumber
    actor VNPayServer as Máy chủ VNPay (IPN Gateway)
    participant Ctrl as PaymentWebhookController
    participant Svc as PaymentService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (payment_transactions, appointments)
    participant Mail as EmailService (@Async)

    VNPayServer->>Ctrl: GET /api/v1/payments/vnpay-ipn?vnp_Amount=50000000&vnp_ResponseCode=00&vnp_TxnRef=TX-9912&vnp_SecureHash=...
    Ctrl->>Svc: processVnpayIpn(vnpParams)
    Svc->>Adapter: verifySecureHash(vnpParams)
    Adapter-->>Svc: true (Chữ ký HMAC-SHA512 chuẩn xác từ VNPay)
    Svc->>DB: findByTransactionCodeWithLock("TX-9912")
    DB-->>Svc: PaymentTransaction (status='PENDING')
    alt Transaction đã ở trạng thái COMPLETED (Idempotency Check)
        Svc-->>Ctrl: VNPayIpnResponse(RspCode="02", Message="Order already confirmed")
    else Transaction đang PENDING và vnp_ResponseCode == "00"
        Svc->>DB: UPDATE payment_transactions SET status='COMPLETED', gateway_reference=vnp_TransactionNo, updated_at=NOW()
        Svc->>DB: UPDATE appointments SET payment_status='PAID', status='SCHEDULED' WHERE appointment_code=tx.referenceId
        Svc->>Mail: sendPaymentSuccessReceiptEmail(patient, appointment)
        Svc-->>Ctrl: VNPayIpnResponse(RspCode="00", Message="Confirm Success")
    end
    Ctrl-->>VNPayServer: 200 OK + JSON { RspCode: "00", Message: "Confirm Success" }
```

##### 3.22.3. Sequence Diagram: Tampered Checksum / Duplicate Webhook Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ can thiệp gói tin Webhook
    participant Ctrl as PaymentWebhookController
    participant Svc as PaymentService
    participant Adapter as VNPayGatewayAdapter
    participant Audit as AuditLogService

    Attacker->>Ctrl: GET /api/v1/payments/vnpay-ipn?vnp_ResponseCode=00&vnp_SecureHash=INVALID_HASH
    Ctrl->>Svc: processVnpayIpn(params)
    Svc->>Adapter: verifySecureHash(params)
    Adapter-->>Svc: false (Chữ ký bị sai lệch!)
    Svc->>Audit: logSecurityAlert("VNPAY_IPN_CHECKSUM_INVALID", params)
    Svc-->>Ctrl: VNPayIpnResponse(RspCode="97", Message="Invalid Checksum")
    Ctrl-->>Attacker: 200 OK + JSON { RspCode: "97", Message: "Invalid Checksum" }
```

---

#### 3.23 Automated Refund Processing & Payment Reconciliation

##### 3.23.1. Class Diagram
```mermaid
classDiagram
    class AppointmentRefundService {
        -PaymentService paymentService
        -PaymentTransactionRepository transactionRepo
        -AppointmentRepository appointmentRepo
        +executeRefund(UUID appointmentId, BigDecimal refundAmount, String reason) RefundResult
    }
    class VNPayGatewayAdapter {
        +callVnpayRefundApi(RefundRequest request) VNPayRefundResponse
    }

    AppointmentRefundService --> VNPayGatewayAdapter
```

##### 3.23.2. Sequence Diagram: Successful VNPay / Mock Gateway Refund Execution
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ bận việc đột xuất
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant RefundSvc as AppointmentRefundService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (appointments, payment_transactions)
    participant Mail as EmailService (@Async)

    Doctor->>Ctrl: POST /api/v1/doctor/appointments/{id}/cancel (reason: "Bác sĩ có ca phẫu thuật cấp cứu")
    Ctrl->>Svc: cancelAppointment(id, reason, Role.DOCTOR)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (feeAmount=500.000 VND)
    Note over Svc: Bác sĩ hủy ca hẹn: Tự động hoàn tiền 100% (500.000 VND) vô điều kiện
    Svc->>RefundSvc: executeRefund(id, 500000, reason)
    RefundSvc->>Adapter: callVnpayRefundApi(txCode, 500000)
    Adapter-->>RefundSvc: VNPay Refund Approved (vnp_ResponseId=RF-8812)
    RefundSvc->>DB: UPDATE appointments SET status='CANCELLED', payment_status='REFUNDED'
    RefundSvc->>DB: INSERT INTO payment_transactions (order_type='REFUND', status='COMPLETED', amount=500000)
    RefundSvc->>Mail: sendRefundNotificationEmail(patient, appointment, 500000)
    RefundSvc-->>Svc: RefundResult(success=true)
    Svc-->>Ctrl: 200 OK
    Ctrl-->>Doctor: "Đã hủy ca khám và hoàn 100% viện phí cho bệnh nhân"
```

##### 3.23.3. Sequence Diagram: Gateway Communication Timeout & Retry Outbox
```mermaid
sequenceDiagram
    autonumber
    actor System as Hệ thống
    participant RefundSvc as AppointmentRefundService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (payment_transactions)

    RefundSvc->>Adapter: callVnpayRefundApi(...)
    Adapter-->>RefundSvc: SocketTimeoutException (Cổng VNPay không phản hồi)
    Note over RefundSvc: Ghi nhận giao dịch hoàn tiền vào trạng thái PENDING_RETRY trong CSDL
    RefundSvc->>DB: INSERT INTO payment_transactions (order_type='REFUND', status='PENDING')
    Note over System: Scheduled Job (chạy mỗi 5 phút) quét các đơn PENDING để đối soát & gọi lại tự động
    System->>RefundSvc: retryPendingRefunds()
```

---

#### 3.24 Doctor License Verification & Credential Approval (Admin)

##### 3.24.1. Class Diagram
```mermaid
classDiagram
    class AdminDoctorController {
        -AdminDoctorService adminDoctorService
        +verifyDoctor(UUID doctorId, VerifyDoctorRequest request) ResponseEntity~ApiResponse~
        +rejectDoctor(UUID doctorId, RejectDoctorRequest request) ResponseEntity~ApiResponse~
    }
    class AdminDoctorService {
        -DoctorProfileRepository doctorRepo
        -DoctorSemanticSearchService searchService
        -EmailService emailService
        -AuditLogService auditLogService
        +approveDoctorProfile(UUID doctorId) void
        +rejectDoctorProfile(UUID doctorId, String reason) void
    }

    AdminDoctorController --> AdminDoctorService
```

##### 3.24.2. Sequence Diagram: Admin Verification, Vector Bio-Embedding Generation & Approval
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (DoctorManagementPage)
    participant Ctrl as AdminDoctorController
    participant Svc as AdminDoctorService
    participant SearchSvc as DoctorSemanticSearchService
    participant AI as OpenAI API (text-embedding-3-small)
    participant DB as PostgreSQL (doctor_profiles, users, audit_logs)
    participant Mail as EmailService (@Async)

    Admin->>UI: Kiểm tra chứng chỉ hành nghề, nhấn "Phê duyệt bác sĩ"
    UI->>Ctrl: POST /api/v1/admin/doctors/{id}/verify
    Ctrl->>Svc: approveDoctorProfile(id)
    Svc->>DB: findByIdWithDetails(id)
    DB-->>Svc: DoctorProfile (is_verified = false, bio = "...")
    Svc->>SearchSvc: generateBioEmbedding(doctorProfile.getBio())
    SearchSvc->>AI: POST /v1/embeddings (input: bioText)
    AI-->>SearchSvc: Vector float[1536] (bioEmbedding)
    Svc->>DB: UPDATE doctor_profiles SET is_verified=true, verified_at=NOW(), bio_embedding=bioEmbedding WHERE id=id
    Svc->>DB: UPDATE users SET status='ACTIVE' WHERE id=doctorProfile.userId
    Svc->>DB: INSERT INTO audit_logs (action='APPROVE_DOCTOR_LICENSE', actor='ADMIN', resource=id)
    Svc->>Mail: sendDoctorAccountActivatedEmail(doctor.getEmail())
    Svc-->>Ctrl: "Phê duyệt thành công"
    Ctrl-->>UI: 200 OK
    UI-->>Admin: Cập nhật trạng thái bác sĩ thành "Đã xác minh" (Huy hiệu Xanh)
```

##### 3.24.3. Sequence Diagram: Credential Rejection with Justification Feedback
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA
    participant Ctrl as AdminDoctorController
    participant Svc as AdminDoctorService
    participant DB as PostgreSQL (doctor_profiles, users)
    participant Mail as EmailService (@Async)

    Admin->>UI: Nhập lý do từ chối: "Ảnh chụp chứng chỉ mờ, không rõ số CCHN"
    UI->>Ctrl: POST /api/v1/admin/doctors/{id}/reject (reason: "...")
    Ctrl->>Svc: rejectDoctorProfile(id, reason)
    Svc->>DB: UPDATE users SET status='SUSPENDED' WHERE id=doctorProfile.userId
    Svc->>Mail: sendDoctorApplicationRejectedEmail(doctor.getEmail(), reason)
    Svc-->>Ctrl: "Đã từ chối hồ sơ bác sĩ"
    Ctrl-->>UI: 200 OK
    UI-->>Admin: Chuyển trạng thái bác sĩ sang "Bị từ chối"
```

---

#### 3.25 Specialty Taxonomy & Clinical Catalog Management (Admin)

##### 3.25.1. Class Diagram
```mermaid
classDiagram
    class AdminSpecialtyController {
        -SpecialtyService specialtyService
        +createSpecialty(CreateSpecialtyRequest request) ResponseEntity~SpecialtyDto~
        +updateSpecialty(UUID id, UpdateSpecialtyRequest request) ResponseEntity~SpecialtyDto~
    }
    class SpecialtyService {
        -SpecialtyRepository specialtyRepo
        -CaffeineCacheManager cacheManager
        +createSpecialty(CreateSpecialtyRequest request) SpecialtyDto
    }

    AdminSpecialtyController --> SpecialtyService
```

##### 3.25.2. Sequence Diagram: Specialty Creation & Secondary Specialty Association
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (SpecialtyManagementPage)
    participant Ctrl as AdminSpecialtyController
    participant Svc as SpecialtyService
    participant DB as PostgreSQL (specialties)
    participant Cache as Caffeine In-Memory Cache (L1)

    Admin->>UI: Nhập tên: "Chuyên khoa Ung bướu", Slug: "ung-buou", Mô tả lâm sàng
    UI->>Ctrl: POST /api/v1/admin/specialties (CreateSpecialtyRequest)
    Ctrl->>Svc: createSpecialty(request)
    Svc->>DB: existsBySlug("ung-buou")
    DB-->>Svc: false
    Svc->>DB: INSERT INTO specialties (name='Chuyên khoa Ung bướu', slug='ung-buou', description=...)
    DB-->>Svc: Specialty Entity Created
    Svc->>Cache: evict("specialties_all") (Xóa sạch cache cũ để cập nhật tức thời)
    Svc-->>Ctrl: SpecialtyDto
    Ctrl-->>UI: 201 Created
    UI-->>Admin: Hiển thị chuyên khoa mới trong bảng danh mục
```

##### 3.25.3. Sequence Diagram: Duplicate Specialty Code Conflict
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA
    participant Ctrl as AdminSpecialtyController
    participant Svc as SpecialtyService
    participant DB as PostgreSQL (specialties)

    Admin->>UI: Tạo chuyên khoa trùng slug "tim-mach" đã tồn tại
    UI->>Ctrl: POST /api/v1/admin/specialties
    Ctrl->>Svc: createSpecialty(request)
    Svc->>DB: existsBySlug("tim-mach")
    DB-->>Svc: true
    Svc-->>Ctrl: throw AppException(SPECIALTY_SLUG_ALREADY_EXISTS)
    Ctrl-->>UI: 409 Conflict
    UI-->>Admin: Báo lỗi trùng lặp mã định danh chuyên khoa
```

---

#### 3.26 User Account State Management & Security Lockout (Admin)

##### 3.26.1. Class Diagram
```mermaid
classDiagram
    class AdminUserController {
        -AdminUserService adminUserService
        +updateUserStatus(UUID userId, UpdateStatusRequest request) ResponseEntity~ApiResponse~
    }
    class AdminUserService {
        -UserRepository userRepo
        -AuditLogService auditLogService
        +changeUserStatus(UUID targetUserId, String newStatus, String reason, UUID adminId) void
    }

    AdminUserController --> AdminUserService
```

##### 3.26.2. Sequence Diagram: Admin Account Suspend / Reactivate with Audit Logging
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (UserManagementPage)
    participant Ctrl as AdminUserController
    participant Svc as AdminUserService
    participant DB as PostgreSQL (users, audit_logs)

    Admin->>UI: Nhấn "Khóa tài khoản" người dùng vi phạm chính sách
    UI->>Ctrl: PUT /api/v1/admin/users/{id}/status (status='SUSPENDED', reason="Spam đặt lịch ảo")
    Ctrl->>Svc: changeUserStatus(id, "SUSPENDED", reason, adminId)
    Svc->>DB: findById(id)
    DB-->>Svc: User Entity
    Svc->>Svc: Kiểm tra không cho phép tự khóa tài khoản của chính Admin
    Svc->>DB: UPDATE users SET status='SUSPENDED', is_active=false, updated_at=NOW()
    Svc->>DB: INSERT INTO audit_logs (action='SUSPEND_USER_ACCOUNT', actor='ADMIN', resource=id, details=reason)
    Svc-->>Ctrl: "Đã cập nhật trạng thái tài khoản"
    Ctrl-->>UI: 200 OK
    UI-->>Admin: Trạng thái tài khoản chuyển sang màu đỏ "SUSPENDED"
```

##### 3.26.3. Sequence Diagram: Self-Deactivation / Super-Admin Lockout Protection
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant Ctrl as AdminUserController
    participant Svc as AdminUserService

    Admin->>Ctrl: PUT /api/v1/admin/users/{myOwnId}/status (status='SUSPENDED')
    Ctrl->>Svc: changeUserStatus(adminId, "SUSPENDED", ...)
    Note over Svc: adminId.equals(targetUserId) == true
    Svc-->>Ctrl: throw AppException(CANNOT_SUSPEND_SELF, "Quản trị viên không thể tự khóa tài khoản của chính mình.")
    Ctrl-->>Admin: 400 Bad Request
```

---

#### 3.27 Clinical Audit Trail & Access Supervision (Admin)

##### 3.27.1. Class Diagram
```mermaid
classDiagram
    class AdminAuditLogController {
        -AuditLogService auditLogService
        +getAuditLogs(AuditFilterRequest filter, Pageable pageable) ResponseEntity~Page~AuditLogDto~~
    }
    class AuditLogService {
        -AuditLogRepository auditRepo
        +searchAuditLogs(AuditFilterRequest filter, Pageable pageable) Page~AuditLogDto~
    }

    AdminAuditLogController --> AuditLogService
```

##### 3.27.2. Sequence Diagram: Paginated Audit Log Filtering with Actor & Date Range
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (AuditLogPage)
    participant Ctrl as AdminAuditLogController
    participant Svc as AuditLogService
    participant DB as PostgreSQL (audit_logs)

    Admin->>UI: Chọn bộ lọc: Hành động = VIEW_PATIENT_RECORD, Từ ngày 10/10/2026 đến 18/10/2026
    UI->>Ctrl: GET /api/v1/admin/audit-logs?action=VIEW_PATIENT_RECORD&startDate=...&page=0&size=20
    Ctrl->>Svc: searchAuditLogs(filter, pageable)
    Svc->>DB: SELECT * FROM audit_logs WHERE action='VIEW_PATIENT_RECORD' AND created_at BETWEEN ... ORDER BY created_at DESC LIMIT 20 OFFSET 0;
    DB-->>Svc: Page 20 dòng nhật ký kiểm toán y tế
    Svc-->>Ctrl: Page AuditLogDto
    Ctrl-->>UI: 200 OK + Phân trang nhật ký
    UI-->>Admin: Hiển thị bảng nhật ký truy vết chi tiết (Thời gian, Bác sĩ, Người bệnh, IP, Thiết bị)
```

##### 3.27.3. Sequence Diagram: Export Audit Log Data to Encrypted Report
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA
    participant Ctrl as AdminAuditLogController
    participant Svc as AuditLogService
    participant DB as PostgreSQL (audit_logs)

    Admin->>UI: Bấm "Xuất báo cáo kiểm toán CSV"
    UI->>Ctrl: GET /api/v1/admin/audit-logs/export
    Ctrl->>Svc: generateAuditCsvStream()
    Svc->>DB: Stream toàn bộ bản ghi theo bộ lọc
    DB-->>Svc: Luồng dữ liệu bản ghi
    Svc-->>Ctrl: ByteArrayOutputStream (Content-Type: text/csv)
    Ctrl-->>UI: 200 OK + File Download (audit_report_20261018.csv)
    UI-->>Admin: Tự động tải về tệp tin báo cáo phục vụ thanh tra y tế
```

---

#### 3.28 Transactional Email Dispatch & Retry Engine (Async Outbox)

##### 3.28.1. Class Diagram
```mermaid
classDiagram
    class EmailService {
        -JavaMailSender mailSender
        -TemplateEngine templateEngine
        -EmailOutboxRepository outboxRepo
        +sendEmailAsync(String to, String subject, String template, Map~String, Object~ model) CompletableFuture~Void~
        +processFailedOutboxEmails() void
    }
    class JavaMailSender {
        +send(MimeMessage message) void
    }

    EmailService --> JavaMailSender
```

##### 3.28.2. Sequence Diagram: `@Async("mailExecutor")` Event Listener & SMTP Delivery
```mermaid
sequenceDiagram
    autonumber
    actor System as Nghiệp vụ hệ thống (Booking/Register)
    participant Listener as AppointmentEventListener
    participant MailSvc as EmailService (@Async Project Loom)
    participant SMTP as Máy chủ SMTP (Brevo / Transactional Gateway)
    participant DB as PostgreSQL (email_outbox)

    System->>Listener: publishEvent(AppointmentBookedEvent)
    Note over Listener: Giao dịch DB nghiệp vụ đã COMMIT an toàn (@TransactionalEventListener(AFTER_COMMIT))
    Listener->>MailSvc: sendConfirmationEmail(patientEmail, details)
    Note over MailSvc: Luồng ảo Virtual Thread Project Loom thực thi bất đồng bộ
    MailSvc->>SMTP: Gửi email giao dịch (TLS 587)
    SMTP-->>MailSvc: 250 OK (Thư đã gửi thành công)
    Note over MailSvc: Kết thúc hoàn hảo, không làm trễ phản hồi HTTP của người dùng
```

##### 3.28.3. Sequence Diagram: SMTP Server Failure & Exponential Backoff Retry Outbox
```mermaid
sequenceDiagram
    autonumber
    actor System as Nghiệp vụ
    participant MailSvc as EmailService
    participant SMTP as Máy chủ SMTP
    participant DB as PostgreSQL (email_outbox)
    participant Scheduler as OutboxRetryScheduler

    MailSvc->>SMTP: send(...)
    SMTP-->>MailSvc: MailConnectException (Mất kết nối SMTP)
    Note over MailSvc: Bắt lỗi kết nối mạng an toàn (Không làm vỡ luồng người dùng)
    MailSvc->>DB: INSERT INTO email_outbox (recipient=to, subject=..., payload=..., status='PENDING', retry_count=0, next_retry_at=NOW()+2m)
    Note over Scheduler: Sau 2 phút, Cron Job quét các email bị lỗi để phát lại
    Scheduler->>DB: findPendingEmailsReadyToRetry()
    DB-->>Scheduler: List Pending Emails
    Scheduler->>SMTP: Thử gửi lại lần 1
    SMTP-->>Scheduler: 250 OK
    Scheduler->>DB: UPDATE email_outbox SET status='SENT', sent_at=NOW()
```
'''
