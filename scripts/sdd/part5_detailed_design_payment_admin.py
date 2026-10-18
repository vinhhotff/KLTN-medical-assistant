"""
Part 5 of SDD Generator: Section 3 Detailed Design (Features 3.21 to 3.28 - VNPay, Refunds, Admin Approval, Specialties, Users, Auditing, Mail Engine).
Fully expanded with Class Specification Tables, Step-by-Step Sequence Tables, and Error Handling Matrices.
"""

def get_part5_content():
    return '''#### 3.21 VNPay Payment Gateway Initialization & Cryptographic Checksum

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân hoàn tất đặt lịch khám bệnh.
* **Mục tiêu:** Khởi tạo phiên thanh toán viện phí trực tuyến kết nối Cổng thanh toán quốc gia VNPay qua giao thức mã hóa dữ liệu **HMAC-SHA512**.
* **Nguyên tắc an toàn tài chính (Financial Security):**
  - Số tiền thanh toán tính theo đơn vị VND, nhân với hệ số $100$ theo chuẩn kỹ thuật của VNPay (`vnp_Amount = amount * 100`).
  - Sắp xếp toàn bộ tham số truy vấn theo thứ tự bảng chữ cái ASCII từ A-Z trước khi tính toán chuỗi băm bảo mật `vnp_SecureHash = HMAC_SHA512(vnp_HashSecret, queryString)`.
  - Khởi tạo bản ghi giao dịch trong bảng `payment_transactions` ở trạng thái `PENDING` kèm mã giao dịch nội bộ duy nhất `transaction_code`.

##### 3.21.1. Class Diagram
```mermaid
classDiagram
    class PaymentController {
        -PaymentService paymentService
        +createPaymentUrl(CreatePaymentRequest request, HttpServletRequest httpRequest, UserPrincipal principal) ResponseEntity~ApiResponse~PaymentResponseDto~~
    }
    class PaymentService {
        -PaymentTransactionRepository transactionRepo
        -VNPayGatewayAdapter vnpayAdapter
        -AppointmentRepository appointmentRepo
        +createPaymentOrder(UUID userId, CreatePaymentRequest request, String clientIp) PaymentResponseDto
    }
    class VNPayGatewayAdapter {
        -String vnpTmnCode
        -String vnpHashSecret
        -String vnpUrl
        -String vnpReturnUrl
        +buildPaymentUrl(PaymentTransaction tx, String clientIp) String
        -hmacSHA512(String key, String data) String
    }
    class PaymentTransaction {
        -UUID id
        -String transactionCode
        -UUID userId
        -BigDecimal amount
        -String currency
        -PaymentStatus status
        -String paymentGateway
        -String referenceId
    }
    class CreatePaymentRequest {
        -String appointmentCode
        -BigDecimal amount
        -String paymentMethod
    }
    class PaymentResponseDto {
        -String transactionCode
        -String paymentUrl
        -BigDecimal amount
        -LocalDateTime createdAt
    }

    PaymentController --> PaymentService
    PaymentService --> VNPayGatewayAdapter
    PaymentService --> PaymentTransaction
    PaymentController ..> CreatePaymentRequest
    PaymentController ..> PaymentResponseDto
```

###### Table 3.21.1: Payment Order Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `PaymentController` | Presentation (REST) | Cung cấp endpoint `POST /api/v1/payments/create-url`, trích xuất địa chỉ IP người dùng. | `+ createPaymentUrl(@Valid @RequestBody CreatePaymentRequest, HttpServletRequest, UserPrincipal): ResponseEntity<ApiResponse<PaymentResponseDto>>` |
| `PaymentService` | Application Service | Xác thực cuộc hẹn cần thanh toán, tạo bản ghi sổ cái tài chính `PaymentTransaction` và kích hoạt bộ điều hợp cổng VNPay. | `+ createPaymentOrder(UUID, CreatePaymentRequest, String): PaymentResponseDto` |
| `VNPayGatewayAdapter` | Gateway Integration | Sắp xếp tham số, tính chữ ký mã hóa HMAC-SHA512 và sinh đường dẫn redirect cổng thanh toán. | `+ buildPaymentUrl(PaymentTransaction, String): String`<br/>`- hmacSHA512(String key, String data): String` |
| `PaymentTransaction` | Domain Entity | Thực thể sổ cái tài chính lưu vết giao dịch thanh toán (Flyway V13). | `- id: UUID`<br/>`- transactionCode: String (VARCHAR(64))`<br/>`- amount: BigDecimal`<br/>`- status: PaymentStatus ('PENDING')` |

##### 3.21.2. Sequence Diagram: Order Creation & HMAC-SHA512 Payment URL Generation
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (PaymentCheckout)
    participant Ctrl as PaymentController
    participant Svc as PaymentService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (appointments, payment_transactions)

    Patient->>UI: Chọn "Thanh toán qua VNPay QR", nhấn "Tiến hành thanh toán"
    UI->>Ctrl: POST /api/v1/payments/create-url (appointmentCode: "APT-7712", amount: 500000)
    Ctrl->>Svc: createPaymentOrder(patientId, request, clientIp)
    Svc->>DB: findByAppointmentCode("APT-7712")
    DB-->>Svc: Appointment (fee_amount = 500.000 VND, payment_status='UNPAID')
    Svc->>Svc: Sinh transactionCode = "TX-" + System.currentTimeMillis() + "-" + RandomAlphanumeric(6)
    Svc->>DB: INSERT INTO payment_transactions (transaction_code=transactionCode, user_id=patientId, order_type='APPOINTMENT_FEE', reference_id='APT-7712', amount=500000, currency='VND', payment_method='VNPAY_QR', payment_gateway='VNPAY', status='PENDING')
    DB-->>Svc: Transaction Entity Saved
    Svc->>Adapter: buildPaymentUrl(tx, clientIp)
    Adapter->>Adapter: Sắp xếp các tham số: vnp_Amount=50000000, vnp_Command=pay, vnp_CreateDate=..., vnp_CurrCode=VND, vnp_IpAddr=..., vnp_Locale=vn, vnp_OrderInfo=..., vnp_ReturnUrl=..., vnp_TmnCode=..., vnp_TxnRef=transactionCode
    Adapter->>Adapter: Ký số HMAC-SHA512(vnpHashSecret, sortedQueryString) -> vnp_SecureHash
    Adapter-->>Svc: Full URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=50000000&...&vnp_SecureHash=...
    Svc-->>Ctrl: PaymentResponseDto(transactionCode, paymentUrl)
    Ctrl-->>UI: 200 OK + PaymentResponseDto
    UI->>UI: window.location.href = paymentUrl
    UI-->>Patient: Trình duyệt chuyển hướng sang cổng thanh toán VNPay hiển thị mã QR
```

###### Table 3.21.2: Step-by-Step Flow Specification (Payment URL Generation)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Chọn thanh toán VNPay | `appointmentCode, amount` | Bắt đầu thanh toán từ màn hình phiếu khám. |
| **2** | React SPA | `PaymentController` | `POST /api/v1/payments/create-url` | `CreatePaymentRequest` | Gửi yêu cầu khởi tạo đơn thanh toán. |
| **3** | Controller | `PaymentService` | `createPaymentOrder()` | `patientId, req, clientIp` | Bắt đầu giao dịch sổ cái tài chính. |
| **4** | Service | `AppointmentRepository` | `findByAppointmentCode()` | `"APT-7712"` | `SELECT * FROM appointments WHERE appointment_code = ?`. |
| **5-7** | Service | `PaymentTransactionRepository` | `save(tx)` | `PaymentTransaction` | `INSERT INTO payment_transactions (status='PENDING', amount=500000, ...)`. |
| **8-10**| Service | `VNPayGatewayAdapter` | `buildPaymentUrl()` | `tx, clientIp` | Sắp xếp bảng chữ cái ASCII và tính chuỗi mã băm HMAC-SHA512. |
| **11-13**| Controller | Bệnh nhân | `200 OK` | `paymentUrl` | Điều hướng trình duyệt sang cổng thanh toán VNPay. |

##### 3.21.3. Sequence Diagram: Invalid Order Amount / Currency Parameter Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ can thiệp
    participant UI as React 18 SPA
    participant Ctrl as PaymentController
    participant Svc as PaymentService

    Attacker->>Ctrl: POST /api/v1/payments/create-url (amount: -50000 hoặc currency: "USD")
    Ctrl->>Svc: createPaymentOrder(...)
    Note over Svc: Thẩm định giá trị viện phí: amount <= 0 hoặc khác đơn vị tiền tệ VND
    Svc-->>Ctrl: throw AppException(INVALID_PAYMENT_AMOUNT, "Số tiền thanh toán phải lớn hơn 0 và chỉ chấp nhận đồng tiền Việt Nam (VND).")
    Ctrl-->>Attacker: 400 Bad Request (ErrorCode: "INVALID_AMOUNT")
```

###### Table 3.21.3: Error Handling & Exception Matrix (Payment Initialization)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Số tiền không hợp lệ** | `amount <= 0` hoặc sai số tiền viện phí | `400 Bad Request` | `INVALID_PAYMENT_AMOUNT` | "Số tiền thanh toán viện phí không hợp lệ." |
| **Cuộc hẹn đã thanh toán** | `appointment.payment_status == 'PAID'` | `400 Bad Request` | `APPOINTMENT_ALREADY_PAID` | "Lịch hẹn này đã được thanh toán viện phí trước đó." |

---

#### 3.22 VNPay IPN Webhook Processing & Idempotency Locking

##### Context & Design Scope
* **Tác nhân:** Máy chủ Cổng thanh toán VNPay (Server-to-Server IPN Call).
* **Mục tiêu:** Tiếp nhận và xử lý tự động thông báo giao dịch thành công tức thời từ VNPay (Instant Payment Notification - IPN), cập nhật trạng thái lịch hẹn sang `PAID` mà không phụ thuộc vào việc trình duyệt của người dùng có đóng hay không.
* **Cơ chế chống thanh toán trùng lặp (Idempotency Locking):**
  - Xác thực nghiêm ngặt chữ ký số `vnp_SecureHash` từ các tham số webhook nhận được.
  - Sử dụng khóa bi quan `SELECT ... FOR UPDATE` (Pessimistic Write Lock) trên bảng `payment_transactions` để đảm bảo nếu VNPay gửi nhiều thông báo IPN đồng thời cho cùng một đơn hàng, hệ thống chỉ cập nhật cộng tiền và chuyển trạng thái đúng duy nhất **1 lần**.

##### 3.22.1. Class Diagram
```mermaid
classDiagram
    class PaymentWebhookController {
        -PaymentService paymentService
        +handleVnpayIpn(HttpServletRequest request) ResponseEntity~Map~String, String~~~
    }
    class PaymentService {
        -PaymentTransactionRepository transactionRepo
        -AppointmentRepository appointmentRepo
        -VNPayGatewayAdapter vnpayAdapter
        -EmailService emailService
        +processVnpayIpn(Map~String, String~ vnpParams) Map~String, String~
    }

    PaymentWebhookController --> PaymentService
```

###### Table 3.22.1: Payment Webhook Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `PaymentWebhookController` | Presentation (REST) | Tiếp nhận yêu cầu HTTP GET `/api/v1/payments/vnpay-ipn`, gom toàn bộ tham số truy vấn và trả về phản hồi JSON theo chuẩn VNPay. | `+ handleVnpayIpn(HttpServletRequest): ResponseEntity<Map<String, String>>` |
| `PaymentService` | Application Service | Xác thực chữ ký số HMAC-SHA512, khóa dòng dữ liệu chống lặp, cập nhật trạng thái `COMPLETED` và gửi email biên lai. | `+ processVnpayIpn(Map<String, String>): Map<String, String>` |

##### 3.22.2. Sequence Diagram: Valid Checksum Verification & Idempotent Order Fulfillment
```mermaid
sequenceDiagram
    autonumber
    actor VNPayServer as Máy chủ VNPay (IPN Gateway)
    participant Ctrl as PaymentWebhookController
    participant Svc as PaymentService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (payment_transactions, appointments)
    participant Mail as EmailService (@Async Loom)

    VNPayServer->>Ctrl: GET /api/v1/payments/vnpay-ipn?vnp_Amount=50000000&vnp_ResponseCode=00&vnp_TxnRef=TX-9912&vnp_SecureHash=...
    Ctrl->>Svc: processVnpayIpn(vnpParams)
    Svc->>Adapter: verifySecureHash(vnpParams)
    Adapter-->>Svc: true (Chữ ký HMAC-SHA512 chuẩn xác từ VNPay)
    Svc->>DB: SELECT * FROM payment_transactions WHERE transaction_code='TX-9912' FOR UPDATE
    DB-->>Svc: PaymentTransaction (status='PENDING', reference_id='APT-7712')
    alt Transaction đã ở trạng thái COMPLETED (Idempotency Check)
        Svc-->>Ctrl: Map: { RspCode: "02", Message: "Order already confirmed" }
    else Transaction đang PENDING và vnp_ResponseCode == "00"
        Svc->>DB: UPDATE payment_transactions SET status='COMPLETED', gateway_reference=vnp_TransactionNo, updated_at=NOW() WHERE transaction_code='TX-9912'
        Svc->>DB: UPDATE appointments SET payment_status='PAID', status='SCHEDULED', updated_at=NOW() WHERE appointment_code='APT-7712'
        Svc->>Mail: sendPaymentSuccessReceipt(patientEmail, appointmentCode, 500000)
        Svc-->>Ctrl: Map: { RspCode: "00", Message: "Confirm Success" }
    end
    Ctrl-->>VNPayServer: 200 OK + JSON { "RspCode": "00", "Message": "Confirm Success" }
```

###### Table 3.22.2: Step-by-Step Flow Specification (IPN Webhook Fulfillment)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | VNPay Server | `PaymentWebhookController` | `GET /vnpay-ipn` | Toàn bộ tham số `vnp_*` | Gọi Server-to-Server ngầm qua Internet. |
| **2** | Controller | `PaymentService` | `processVnpayIpn()` | `vnpParams` | Bắt đầu giao dịch `@Transactional(Isolation.SERIALIZABLE)`. |
| **3-4** | Service | `VNPayGatewayAdapter` | `verifySecureHash()` | `vnpParams` | Thẩm định chữ ký số tính lại từ Secret Key bí mật. |
| **5-6** | Service | `PaymentTransactionRepository` | Khóa dòng giao dịch | `transaction_code` | `SELECT * FROM payment_transactions WHERE ... FOR UPDATE`. |
| **7-8** | Service | Nội bộ | Kiểm tra Idempotency | `status` | Nếu đã `COMPLETED`, lập tức trả về `RspCode="02"` tránh cộng tiền 2 lần. |
| **9** | Service | `PaymentTransactionRepository` | Cập nhật hoàn tất | `COMPLETED` | `UPDATE payment_transactions SET status='COMPLETED', gateway_reference=?`. |
| **10** | Service | `AppointmentRepository` | Cập nhật lịch hẹn | `PAID` | `UPDATE appointments SET payment_status='PAID' WHERE appointment_code=?`. |
| **11** | Service | `EmailService` | `sendReceipt()` | `patient, 500000` | Bắn email biên lai thanh toán viện phí điện tử. |
| **12-13**| Controller | VNPay Server | `200 OK` | `RspCode="00"` | Xác nhận xử lý thành công cho cổng thanh toán. |

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
    Adapter-->>Svc: false (Chữ ký HMAC không khớp!)
    Svc->>Audit: logSecurityAlert("VNPAY_IPN_CHECKSUM_TAMPERED", params)
    Svc-->>Ctrl: Map: { RspCode: "97", Message: "Invalid Checksum" }
    Ctrl-->>Attacker: 200 OK + JSON { "RspCode": "97", "Message": "Invalid Checksum" }
```

###### Table 3.22.3: Error Handling & Exception Matrix (IPN Webhook)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Sai chữ ký bảo mật (Checksum Tampered)** | `verifySecureHash() == false` | `200 OK` | `RspCode: "97"` | "Chữ ký không hợp lệ." Ghi log cảnh báo an ninh ngân hàng. |
| **Không tìm thấy đơn hàng** | `findByTransactionCode() == empty` | `200 OK` | `RspCode: "01"` | "Không tìm thấy giao dịch tương ứng trong CSDL." |
| **Đơn hàng đã được xử lý trước đó** | `transaction.status == 'COMPLETED'` | `200 OK` | `RspCode: "02"` | "Giao dịch đã được cập nhật thành công trước đó." |

---

#### 3.23 Automated Refund Processing & Payment Reconciliation

##### Context & Design Scope
* **Tác nhân:** Bác sĩ hủy ca khám hoặc Hệ thống tự động kích hoạt hoàn phí khi bệnh nhân hủy lịch khám hợp lệ.
* **Mục tiêu:** Tự động hoàn trả viện phí vào tài khoản ngân hàng của bệnh nhân qua API hoàn tiền của VNPay, cập nhật trạng thái lịch hẹn sang `REFUNDED` và ghi nhận sổ cái tài chính.
* **Cơ chế chịu lỗi (Fault-Tolerance):** Nếu kết nối tới API hoàn tiền của cổng thanh toán bị quá hạn (Timeout), giao dịch được ghi nhận ở trạng thái `PENDING_RETRY` để bộ lập lịch ngầm tự động đối soát và thử lại sau mỗi 5 phút.

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

###### Table 3.23.1: Automated Refund Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AppointmentRefundService` | Financial Domain Service | Điều phối hoàn tiền, ghi sổ cái tài chính và gọi cổng thanh toán VNPay Refund API. | `+ executeRefund(UUID, BigDecimal, String): RefundResult` |
| `VNPayGatewayAdapter` | Gateway Integration | Đóng gói bản tin hoàn tiền theo định dạng Refund API của VNPay và gửi qua kết nối HTTPS có chữ ký điện tử. | `+ callVnpayRefundApi(RefundRequest): VNPayRefundResponse` |

##### 3.23.2. Sequence Diagram: Successful VNPay / Mock Gateway Refund Execution
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ bận lịch phẫu thuật
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant RefundSvc as AppointmentRefundService
    participant Adapter as VNPayGatewayAdapter
    participant DB as PostgreSQL (appointments, payment_transactions)
    participant Mail as EmailService (@Async Loom)

    Doctor->>UI: Bấm "Hủy ca khám", nhập lý do: "Bác sĩ có ca phẫu thuật cấp cứu"
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/status (status='CANCELLED', notes='...')
    Ctrl->>Svc: updateAppointmentStatus(id, doctorId, Role.DOCTOR, CANCELLED, notes)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (feeAmount=500.000 VND, payment_status='PAID')
    Note over Svc: Bác sĩ hủy ca khám -> Áp dụng chính sách hoàn 100% (500.000 VND)
    Svc->>RefundSvc: executeRefund(id, 500000, notes)
    RefundSvc->>Adapter: callVnpayRefundApi(txCode, 500000, notes)
    Adapter-->>RefundSvc: VNPayRefundResponse (vnp_ResponseCode="00", vnp_ResponseId="RF-8812")
    RefundSvc->>DB: INSERT INTO payment_transactions (order_type='REFUND', reference_id=appt.getCode(), amount=500000, status='COMPLETED', gateway_reference='RF-8812')
    Svc->>DB: UPDATE appointments SET status='CANCELLED', payment_status='REFUNDED', refund_amount=500000, refunded_at=NOW() WHERE id = id
    Svc->>Mail: sendRefundNotification(patient, 500000, "Bác sĩ có ca phẫu thuật cấp cứu")
    Svc-->>Ctrl: AppointmentDto (status='CANCELLED', refundAmount=500000)
    Ctrl-->>UI: 200 OK
    UI-->>Doctor: "Đã hủy ca khám thành công và hoàn trả 100% viện phí (500.000 VND) cho bệnh nhân."
```

###### Table 3.23.2: Step-by-Step Flow Specification (Automated Refund Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bác sĩ | React SPA | Hủy ca khám khẩn cấp | `id, lý do` | Kích hoạt từ Bàn làm việc bác sĩ. |
| **2** | React SPA | `AppointmentController` | `PATCH /api/v1/appointments/{id}/status` | `{status: "CANCELLED"}` | Gửi yêu cầu hủy ca khám. |
| **3** | Controller | `AppointmentService` | `updateAppointmentStatus()` | `id, doctorId, ...` | Bác sĩ hủy -> Kích hoạt hoàn phí 100%. |
| **4** | Service | `AppointmentRefundService` | `executeRefund()` | `id, 500000, reason` | Bắt đầu quy trình hoàn tiền tự động. |
| **5-6** | RefundService | `VNPayGatewayAdapter` | `callVnpayRefundApi()` | `txCode, 500000` | Gửi yêu cầu hoàn tiền Server-to-Server tới cổng VNPay. |
| **7** | RefundService | `PaymentTransactionRepository` | `save(refundTx)` | `PaymentTransaction` | `INSERT INTO payment_transactions (order_type='REFUND', ...)`. |
| **8** | Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `UPDATE appointments SET payment_status='REFUNDED', refund_amount=500000`. |
| **9** | Service | `EmailService` | `sendRefundNotification()` | `patient, 500000` | Thông báo tiền hoàn qua email cho người bệnh. |
| **10** | Controller | Bác sĩ | `200 OK` | `AppointmentDto` | Hoàn tất quy trình hủy và hoàn phí. |

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
    Note over RefundSvc: Bắt lỗi mạng an toàn: Ghi nhận giao dịch hoàn tiền vào CSDL với trạng thái PENDING_RETRY
    RefundSvc->>DB: INSERT INTO payment_transactions (order_type='REFUND', status='PENDING')
    Note over System: Scheduled Job (chạy mỗi 5 phút) quét các đơn PENDING để đối soát & gọi lại tự động
    System->>RefundSvc: retryPendingRefunds()
```

###### Table 3.23.3: Error Handling & Exception Matrix (Refund)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Cổng VNPay Refund Timeout** | Lỗi mạng kết nối tới cổng thanh toán | `200 OK` (Async Outbox) | `REFUND_PENDING_RETRY` | "Yêu cầu hoàn tiền đã được ghi nhận và đang được hệ thống tự động xử lý ngầm." |
| **Giao dịch gốc chưa thanh toán** | `payment_status != 'PAID'` | `400 Bad Request` | `NOT_PAID` | "Lịch hẹn này chưa được thanh toán nên không phát sinh hoàn tiền." |

---

#### 3.24 Doctor License Verification & Credential Approval (Admin)

##### Context & Design Scope
* **Tác nhân:** Quản trị viên hệ thống (Admin).
* **Mục tiêu:** Thẩm định tính hợp pháp của Chứng chỉ hành nghề khám chữa bệnh (CCHN), hồ sơ năng lực của bác sĩ đăng ký mới trước khi cho phép xuất hiện trên cổng đặt lịch của người bệnh.
* **Cơ chế đồng bộ Vector tự động:** Khi Admin nhấn **Phê duyệt (Verify)**, hệ thống tự động nạp tiểu sử chuyên môn `bio`, gọi OpenAI API sinh vector đặc trưng ngữ nghĩa 1536 chiều và lưu vào cột `bio_embedding` với chỉ mục HNSW để bác sĩ có thể được tìm kiếm ngay lập tức qua ngôn ngữ tự nhiên.

##### 3.24.1. Class Diagram
```mermaid
classDiagram
    class AdminController {
        -AdminVettingService adminVettingService
        +verifyDoctor(UUID doctorId, VetDoctorRequest request) ResponseEntity~ApiResponse~DoctorDetailDto~~
        +rejectDoctor(UUID doctorId, String reason) ResponseEntity~ApiResponse~DoctorDetailDto~~
    }
    class AdminVettingService {
        -DoctorProfileRepository doctorRepo
        -UserRepository userRepo
        -DoctorSemanticSearchService searchService
        -EmailService emailService
        -AuditLogService auditLogService
        +vetDoctor(UUID doctorProfileId, boolean approve, String notes) DoctorDetailDto
    }

    AdminController --> AdminVettingService
```

###### Table 3.24.1: Doctor Verification Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AdminController` | Presentation (REST) | Cung cấp endpoint `POST /api/v1/admin/doctors/{id}/vet`, bảo vệ quyền Admin `@PreAuthorize("hasRole('ADMIN')")`. | `+ verifyDoctor(@PathVariable UUID, @Valid @RequestBody VetDoctorRequest): ResponseEntity<ApiResponse<DoctorDetailDto>>` |
| `AdminVettingService` | Application Service | Cập nhật cờ `is_verified = true`, kích hoạt sinh vector `bio_embedding`, kích hoạt tài khoản `status = 'ACTIVE'`, và gửi email chúc mừng. | `+ vetDoctor(UUID, boolean, String): DoctorDetailDto` |

##### 3.24.2. Sequence Diagram: Admin Verification, Vector Bio-Embedding Generation & Approval
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (DoctorManagementPage)
    participant Ctrl as AdminController
    participant Svc as AdminVettingService
    participant SearchSvc as DoctorSemanticSearchService
    participant AI as OpenAI API (text-embedding-3-small)
    participant DB as PostgreSQL (doctor_profiles, users, audit_logs)
    participant Mail as EmailService (@Async Loom)

    Admin->>UI: Kiểm tra ảnh chụp chứng chỉ CCHN, nhấn "Phê duyệt hồ sơ"
    UI->>Ctrl: POST /api/v1/admin/doctors/{id}/vet (approve=true, notes="Chứng chỉ hợp lệ")
    Ctrl->>Svc: vetDoctor(id, true, notes)
    Svc->>DB: findByIdWithDetails(id)
    DB-->>Svc: DoctorProfile (is_verified = false, bio = "Bác sĩ chuyên khoa Tim mạch...")
    Svc->>SearchSvc: syncDoctorEmbedding(doctorProfile)
    SearchSvc->>AI: POST /v1/embeddings (input: bioText)
    AI-->>SearchSvc: Vector float[1536] (bioEmbedding)
    Svc->>DB: UPDATE doctor_profiles SET is_verified = true, verified_at = NOW(), bio_embedding = bioEmbedding WHERE id = id
    Svc->>DB: UPDATE users SET status = 'ACTIVE' WHERE id = doctorProfile.userId
    Svc->>DB: INSERT INTO audit_logs (action='APPROVE_DOCTOR_LICENSE', actor='ADMIN', resource=id)
    Svc->>Mail: sendDoctorAccountActivatedEmail(doctor.getEmail())
    Svc-->>Ctrl: DoctorDetailDto (isVerified = true)
    Ctrl-->>UI: 200 OK + DoctorDetailDto
    UI-->>Admin: Cập nhật giao diện: Huy hiệu chuyển sang "Đã xác minh" (Màu xanh)
```

###### Table 3.24.2: Step-by-Step Flow Specification (Doctor Approval)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Quản trị viên | React SPA | Nhấn Phê duyệt hồ sơ | `doctorId, notes` | Mở modal thẩm định `DoctorVettingModal`. |
| **2** | React SPA | `AdminController` | `POST /api/v1/admin/doctors/{id}/vet` | `VetDoctorRequest` | Gửi yêu cầu phê duyệt kèm Admin Bearer Token. |
| **3** | Controller | `AdminVettingService` | `vetDoctor()` | `id, approve, notes` | Bắt đầu quy trình kích hoạt và sinh vector. |
| **4** | Service | `DoctorProfileRepository` | `findByIdWithDetails()` | `id` | `SELECT * FROM doctor_profiles JOIN users ... WHERE id = ?`. |
| **5-7** | Service | `EmbeddingService` | Sinh vector ngữ nghĩa tiểu sử | `bioText` | Gọi OpenAI API chuyển hóa tiểu sử thành vector 1536 chiều. |
| **8** | Service | `DoctorProfileRepository` | Cập nhật trạng thái duyệt & vector | `bioEmbedding` | `UPDATE doctor_profiles SET is_verified=true, bio_embedding=? WHERE id=?`. |
| **9** | Service | `UserRepository` | Kích hoạt tài khoản | `ACTIVE` | `UPDATE users SET status='ACTIVE' WHERE id=?`. |
| **10** | Service | `AuditLogRepository` | `save(auditLog)` | `AuditLog` | Ghi nhật ký kiểm toán hành vi quản trị viên. |
| **11** | Service | `EmailService` | `sendWelcomeEmail()` | `doctorEmail` | Gửi email thông báo hồ sơ đã được phê duyệt. |
| **12-13**| Controller | Quản trị viên | `200 OK` | `DoctorDetailDto` | Hiển thị thông báo Toast phê duyệt thành công. |

##### 3.24.3. Sequence Diagram: Credential Rejection with Justification Feedback
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA
    participant Ctrl as AdminController
    participant Svc as AdminVettingService
    participant DB as PostgreSQL (doctor_profiles, users)
    participant Mail as EmailService (@Async Loom)

    Admin->>UI: Nhập lý do từ chối: "Ảnh chụp chứng chỉ mờ, không rõ số hiệu CCHN", bấm "Từ chối"
    UI->>Ctrl: POST /api/v1/admin/doctors/{id}/vet (approve=false, notes="...")
    Ctrl->>Svc: vetDoctor(id, false, notes)
    Svc->>DB: UPDATE users SET status = 'SUSPENDED' WHERE id = doctorProfile.userId
    Svc->>Mail: sendDoctorApplicationRejectedEmail(doctor.getEmail(), notes)
    Svc-->>Ctrl: DoctorDetailDto (isVerified = false)
    Ctrl-->>UI: 200 OK
    UI-->>Admin: Chuyển trạng thái bác sĩ sang "Bị từ chối" (Màu xám)
```

###### Table 3.24.3: Error Handling & Exception Matrix (Doctor Approval)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Hồ sơ bác sĩ không tồn tại** | `findById() == Optional.empty()` | `404 Not Found` | `DOCTOR_NOT_FOUND` | "Không tìm thấy hồ sơ bác sĩ yêu cầu." |
| **Không có quyền Admin** | Người dùng không mang vai trò `ADMIN` | `403 Forbidden` | `FORBIDDEN` | "Chỉ Quản trị viên hệ thống mới có quyền phê duyệt hồ sơ bác sĩ." |

---

#### 3.25 Specialty Taxonomy & Clinical Catalog Management (Admin)

##### Context & Design Scope
* **Tác nhân:** Quản trị viên hệ thống (Admin).
* **Mục tiêu:** Quản lý danh mục các chuyên khoa lâm sàng y tế (Tim mạch, Thần kinh, Tiêu hóa, v.v.), phục vụ phân luồng triệu chứng AI và tìm kiếm bác sĩ.
* **Cơ chế xóa bộ đệm tức thời (Cache Eviction):** Khi danh mục chuyên khoa được thêm mới hoặc chỉnh sửa, hệ thống tự động xóa bộ đệm L1 Caffeine (`specialties_all`) để các truy vấn của người bệnh trên toàn hệ thống nhận diện chuyên khoa mới ngay lập tức mà không cần khởi động lại máy chủ.

##### 3.25.1. Class Diagram
```mermaid
classDiagram
    class SpecialtyController {
        -SpecialtyRepository specialtyRepo
        -TwoLayerCacheService cacheService
        +getAllSpecialties() ResponseEntity~ApiResponse~List~SpecialtyDto~~~
        +createSpecialty(CreateSpecialtyRequest request) ResponseEntity~ApiResponse~SpecialtyDto~~
    }
    class SpecialtyRepository {
        +findBySlug(String slug) Optional~Specialty~
        +existsBySlug(String slug) boolean
        +findAll() List~Specialty~
    }
    class CreateSpecialtyRequest {
        -String name
        -String slug
        -String description
        -String iconUrl
    }

    SpecialtyController --> SpecialtyRepository
    SpecialtyController ..> CreateSpecialtyRequest
```

###### Table 3.25.1: Specialty Management Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `SpecialtyController` | Presentation (REST) | Cung cấp endpoint `GET /api/v1/specialties` (công khai) và `POST /api/v1/specialties` (Admin). | `+ createSpecialty(@Valid @RequestBody CreateSpecialtyRequest): ResponseEntity<ApiResponse<SpecialtyDto>>` |
| `SpecialtyRepository` | Persistence Repository | Quản lý truy vấn bảng `specialties` trong CSDL PostgreSQL. | `+ findBySlug(String): Optional<Specialty>`<br/>`+ existsBySlug(String): boolean` |

##### 3.25.2. Sequence Diagram: Specialty Creation & Cache Invalidation
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (SpecialtyManagementPage)
    participant Ctrl as SpecialtyController
    participant DB as PostgreSQL (specialties)
    participant Cache as TwoLayerCacheService (L1 Caffeine + L2 Redis)

    Admin->>UI: Điền form: Tên = "Chuyên khoa Ung bướu", Slug = "ung-buou", Mô tả = "...", bấm "Tạo mới"
    UI->>Ctrl: POST /api/v1/specialties (CreateSpecialtyRequest)
    Ctrl->>DB: existsBySlug("ung-buou")
    DB-->>Ctrl: false (Chưa tồn tại)
    Ctrl->>DB: INSERT INTO specialties (name='Chuyên khoa Ung bướu', slug='ung-buou', description='...', icon_url='...')
    DB-->>Ctrl: Specialty Entity Saved
    Ctrl->>Cache: evict("specialties_all")
    Note over Cache: Xóa sạch bộ đệm L1 Caffeine và L2 Redis để áp dụng danh mục mới tức thì
    Ctrl-->>UI: 201 Created + SpecialtyDto
    UI-->>Admin: Hiển thị chuyên khoa mới trong bảng danh mục quản trị
```

###### Table 3.25.2: Step-by-Step Flow Specification (Specialty Creation)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Quản trị viên | React SPA | Nhập thông tin chuyên khoa | Tên, slug, mô tả | Kiểm tra tính duy nhất của slug. |
| **2** | React SPA | `SpecialtyController` | `POST /api/v1/specialties` | `CreateSpecialtyRequest` | Gửi dữ liệu kèm Admin Bearer Token. |
| **3** | Controller | `SpecialtyRepository` | `existsBySlug()` | `"ung-buou"` | `SELECT EXISTS(SELECT 1 FROM specialties WHERE slug = ?)`. |
| **4** | Controller | `SpecialtyRepository` | `save(specialty)` | `Specialty` | `INSERT INTO specialties (...)`. |
| **5** | Controller | `TwoLayerCacheService` | `evict()` | `"specialties_all"` | Xóa cache L1 Caffeine và L2 Redis. |
| **6-7** | Controller | Quản trị viên | `201 Created` | `SpecialtyDto` | Cập nhật danh sách trên giao diện quản trị. |

##### 3.25.3. Sequence Diagram: Duplicate Specialty Slug Conflict
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA
    participant Ctrl as SpecialtyController
    participant DB as PostgreSQL (specialties)

    Admin->>UI: Tạo chuyên khoa với slug "tim-mach" đã tồn tại trước đó
    UI->>Ctrl: POST /api/v1/specialties (slug="tim-mach")
    Ctrl->>DB: existsBySlug("tim-mach")
    DB-->>Ctrl: true (Trùng slug)
    Ctrl-->>UI: 409 Conflict (ErrorCode: "SPECIALTY_SLUG_ALREADY_EXISTS", Message: "Mã định danh chuyên khoa (slug) đã tồn tại trong hệ thống.")
    UI-->>Admin: Hiển thị thông báo lỗi trùng mã chuyên khoa
```

###### Table 3.25.3: Error Handling & Exception Matrix (Specialty)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Trùng slug chuyên khoa** | `existsBySlug(slug) == true` | `409 Conflict` | `SPECIALTY_SLUG_EXISTS` | "Mã định danh chuyên khoa (slug) đã được sử dụng." |
| **Tên chuyên khoa để trống** | `@NotBlank` không thỏa mãn | `400 Bad Request` | `VALIDATION_FAILED` | "Tên chuyên khoa y tế không được phép để trống." |

---

#### 3.26 User Account State Management & Security Lockout (Admin)

##### Context & Design Scope
* **Tác nhân:** Quản trị viên hệ thống (Admin).
* **Mục tiêu:** Cung cấp công cụ quản lý trạng thái tài khoản người dùng (`ACTIVE`, `SUSPENDED`), cho phép khóa tài khoản vi phạm chính sách hoặc mở khóa tài khoản cho bệnh nhân/bác sĩ.
* **Quy tắc an ninh (Super-Admin Protection):**
  - Quản trị viên **tuyệt đối không được phép tự khóa tài khoản của chính mình** (`adminId.equals(targetUserId)`).
  - Mọi thao tác thay đổi trạng thái tài khoản đều bắt buộc phải nhập lý do và được ghi lại trong sổ nhật ký kiểm toán bất biến `audit_logs`.

##### 3.26.1. Class Diagram
```mermaid
classDiagram
    class AdminController {
        -AdminVettingService adminVettingService
        -UserRepository userRepository
        -AuditLogService auditLogService
        +updateUserStatus(UUID id, UpdateUserStatusRequest request, UserPrincipal principal) ResponseEntity~ApiResponse~UserDto~~
    }
    class UpdateUserStatusRequest {
        -String status
        -String reason
    }

    AdminController ..> UpdateUserStatusRequest
```

###### Table 3.26.1: Account Management Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AdminController` | Presentation (REST) | Cung cấp endpoint `PUT /api/v1/admin/users/{id}/status`, bảo vệ quyền Admin. | `+ updateUserStatus(@PathVariable UUID, @Valid @RequestBody UpdateUserStatusRequest, @AuthenticationPrincipal UserPrincipal): ResponseEntity<ApiResponse<UserDto>>` |

##### 3.26.2. Sequence Diagram: Admin Account Suspend / Reactivate with Audit Logging
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (UserManagementPage)
    participant Ctrl as AdminController
    participant DB as PostgreSQL (users, audit_logs)

    Admin->>UI: Bấm "Khóa tài khoản", nhập lý do: "Spam đặt lịch ảo nhiều lần", bấm "Xác nhận khóa"
    UI->>Ctrl: PUT /api/v1/admin/users/{id}/status (status='SUSPENDED', reason="Spam đặt lịch ảo")
    Ctrl->>DB: findById(id)
    DB-->>Ctrl: User Entity (status='ACTIVE')
    Ctrl->>Ctrl: Kiểm tra: adminId.equals(id) == false (Không phải tự khóa chính mình)
    Ctrl->>DB: UPDATE users SET status = 'SUSPENDED', is_active = false, updated_at = NOW() WHERE id = id
    Ctrl->>DB: INSERT INTO audit_logs (action='SUSPEND_USER_ACCOUNT', actor='ADMIN', resource=id, details=reason)
    Ctrl-->>UI: 200 OK + UserDto (status='SUSPENDED')
    UI-->>Admin: Cập nhật huy hiệu trạng thái người dùng sang màu đỏ "SUSPENDED"
```

###### Table 3.26.2: Step-by-Step Flow Specification (Account Lockout)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Quản trị viên | React SPA | Chọn Khóa tài khoản | `targetUserId, lý do` | Mở modal xác nhận an ninh. |
| **2** | React SPA | `AdminController` | `PUT /api/v1/admin/users/{id}/status` | `UpdateUserStatusRequest` | Gửi chỉ thị khóa tài khoản kèm Admin Token. |
| **3** | Controller | `UserRepository` | `findById()` | `id` | `SELECT * FROM users WHERE id = ?`. |
| **4** | Controller | Nội bộ | Kiểm tra Super-Admin | `adminId, id` | Chặn hành vi tự khóa tài khoản Admin hiện hành. |
| **5** | Controller | `UserRepository` | `save(user)` | `User` | `UPDATE users SET status='SUSPENDED', is_active=false WHERE id=?`. |
| **6** | Controller | `AuditLogRepository` | `save(auditLog)` | `AuditLog` | `INSERT INTO audit_logs (action='SUSPEND_USER_ACCOUNT', ...)`. |
| **7-8** | Controller | Quản trị viên | `200 OK` | `UserDto` | Cập nhật trạng thái hiển thị trên giao diện quản trị. |

##### 3.26.3. Sequence Diagram: Self-Deactivation / Super-Admin Lockout Protection
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant Ctrl as AdminController

    Admin->>Ctrl: PUT /api/v1/admin/users/{myOwnAdminId}/status (status='SUSPENDED')
    Note over Ctrl: Kiểm tra: principal.getId().equals(id) == true
    Ctrl-->>Admin: 400 Bad Request (ErrorCode: "CANNOT_SUSPEND_SELF", Message: "Quản trị viên không thể tự khóa tài khoản của chính mình.")
```

###### Table 3.26.3: Error Handling & Exception Matrix (Account State)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Tự khóa tài khoản Admin** | `adminId.equals(targetUserId)` | `400 Bad Request` | `CANNOT_SUSPEND_SELF` | "Quản trị viên không thể tự khóa tài khoản của chính mình." |
| **Người dùng không tồn tại** | `findById() == Optional.empty()` | `404 Not Found` | `USER_NOT_FOUND` | "Không tìm thấy người dùng yêu cầu." |

---

#### 3.27 Clinical Audit Trail & Access Supervision (Admin)

##### Context & Design Scope
* **Tác nhân:** Quản trị viên hệ thống hoặc Đoàn thanh tra y tế.
* **Mục tiêu:** Cung cấp giao diện tra cứu và xuất dữ liệu kiểm toán an ninh bất biến (Immutable Audit Trail) tuân thủ tiêu chuẩn **HIPAA Security Rule** và **Nghị định 13/2023/NĐ-CP**.
* **Đặc tả truy vấn:**
  - Lọc theo loại hành động (`VIEW_PATIENT_RECORD`, `LOGIN`, `CREATE_APPOINTMENT`, `REFUND`, `APPROVE_DOCTOR_LICENSE`).
  - Lọc theo khoảng thời gian `startDate` đến `endDate` và phân trang động.
  - Xuất báo cáo kiểm toán ra tệp tin CSV phục vụ lưu chiểu pháp lý.

##### 3.27.1. Class Diagram
```mermaid
classDiagram
    class AdminController {
        -AuditLogRepository auditRepo
        +getAuditLogs(String action, UUID userId, Pageable pageable) ResponseEntity~ApiResponse~Page~AuditLogDto~~~
        +exportAuditLogsCsv(HttpServletResponse response) void
    }
    class AuditLogRepository {
        +findByFilters(String action, UUID userId, Pageable pageable) Page~AuditLog~
    }
    class AuditLogDto {
        -UUID id
        -String action
        -String actor
        -UUID userId
        -String resource
        -String ipAddress
        -LocalDateTime createdAt
    }

    AdminController --> AuditLogRepository
    AdminController ..> AuditLogDto
```

###### Table 3.27.1: Audit Supervision Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AdminController` | Presentation (REST) | Cung cấp endpoint `GET /api/v1/admin/audit-logs` và `GET /api/v1/admin/audit-logs/export`. | `+ getAuditLogs(@RequestParam String action, Pageable): ResponseEntity<ApiResponse<Page<AuditLogDto>>>`<br/>`+ exportAuditLogsCsv(HttpServletResponse): void` |
| `AuditLogRepository` | Persistence Repository | Thực thi truy vấn phân trang trên bảng `audit_logs` có đánh chỉ mục `idx_audit_created`. | `+ findByFilters(...): Page<AuditLog>` |

##### 3.27.2. Sequence Diagram: Paginated Audit Log Filtering with Actor & Date Range
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA (AuditLogPage)
    participant Ctrl as AdminController
    participant DB as PostgreSQL (audit_logs)

    Admin->>UI: Chọn bộ lọc: Hành động = VIEW_PATIENT_RECORD, Trang 1, Kích thước 20 dòng
    UI->>Ctrl: GET /api/v1/admin/audit-logs?action=VIEW_PATIENT_RECORD&page=0&size=20
    Ctrl->>DB: SELECT * FROM audit_logs WHERE action = 'VIEW_PATIENT_RECORD' ORDER BY created_at DESC LIMIT 20 OFFSET 0
    DB-->>Ctrl: Page 20 bản ghi kiểm toán y tế
    Ctrl-->>UI: 200 OK + Page<AuditLogDto>
    UI-->>Admin: Hiển thị bảng nhật ký truy vết chi tiết (Thời gian, Bác sĩ, Người bệnh, IP, Thiết bị)
```

###### Table 3.27.2: Step-by-Step Flow Specification (Audit Log Query)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Quản trị viên | React SPA | Chọn tiêu chí lọc | `action, page=0, size=20` | Chọn bộ lọc trên giao diện `AuditLogPage`. |
| **2** | React SPA | `AdminController` | `GET /api/v1/admin/audit-logs` | Query parameters | Gửi yêu cầu truy vấn kèm Admin Token. |
| **3** | Controller | `AuditLogRepository` | `findByFilters()` | `action, pageable` | `SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT 20`. |
| **4** | Repository | Controller | Trả về Page Entity | `Page<AuditLog>` | Chuyển đổi sang `Page<AuditLogDto>`. |
| **5-6** | Controller | Quản trị viên | `200 OK` | `Page<AuditLogDto>` | Render bảng dữ liệu phân trang trên UI. |

##### 3.27.3. Sequence Diagram: Export Audit Log Data to CSV Report
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as React 18 SPA
    participant Ctrl as AdminController
    participant DB as PostgreSQL (audit_logs)

    Admin->>UI: Nhấn "Xuất báo cáo CSV"
    UI->>Ctrl: GET /api/v1/admin/audit-logs/export
    Ctrl->>DB: Stream toàn bộ bản ghi audit_logs trong 30 ngày gần nhất
    DB-->>Ctrl: Luồng dữ liệu bản ghi
    Ctrl-->>UI: 200 OK (Download CSV File audit_report_20261018.csv)
    UI-->>Admin: Tự động tải về tệp tin CSV phục vụ thanh tra an toàn y tế
```

###### Table 3.27.3: Error Handling & Exception Matrix (Audit Supervision)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Không có quyền Admin** | Vai trò không phải `ADMIN` | `403 Forbidden` | `FORBIDDEN` | "Chỉ Quản trị viên mới có quyền xem nhật ký kiểm toán hệ thống." |

---

#### 3.28 Transactional Email Dispatch & Retry Engine (Async Outbox)

##### Context & Design Scope
* **Tác nhân:** Động cơ nghiệp vụ nền hệ thống (Background Engine).
* **Mục tiêu:** Cung cấp dịch vụ gửi thư điện tử giao dịch không chặn (Non-blocking) cho các sự kiện trọng yếu: Kích hoạt tài khoản, Đặt lại mật khẩu, Xác nhận đặt lịch, Biên lai thanh toán và Thông báo hoàn tiền.
* **Cơ chế an toàn giao dịch & Phục hồi lỗi (Fault-Tolerant Outbox Pattern):**
  - Khai thác luồng ảo Java 21 Project Loom (`@Async("mailExecutor")`): Không làm chậm thời gian phản hồi HTTP của người dùng.
  - Sự kiện gửi email được kích hoạt sau khi giao dịch CSDL chính đã được `COMMIT` an toàn (`@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`).
  - Nếu máy chủ SMTP (Brevo) gặp sự cố mạng, hệ thống tự động lưu thư vào hộp thư chờ `email_outbox` kèm bộ lập lịch Retry tự động theo hàm mũ (Exponential Backoff: 2m, 5m, 15m).

##### 3.28.1. Class Diagram
```mermaid
classDiagram
    class EmailService {
        -JavaMailSender mailSender
        -SpringTemplateEngine templateEngine
        -EmailOutboxRepository outboxRepo
        +sendActivationEmail(String toEmail, String rawToken) void
        +sendPasswordResetEmail(String toEmail, String rawToken) void
        +sendAppointmentConfirmation(String toEmail, Appointment appt) void
        +sendRefundReceipt(String toEmail, BigDecimal amount) void
        -sendMimeMessage(String to, String subject, String htmlContent) void
        +processFailedOutboxEmails() void
    }
    class JavaMailSender {
        +send(MimeMessage mimeMessage) void
    }

    EmailService --> JavaMailSender
```

###### Table 3.28.1: Email Engine Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `EmailService` | Infrastructure Mail Service | Tạo nội dung HTML từ Thymeleaf template, kết nối máy chủ SMTP TLS 587 và thực thi cơ chế Outbox Retry. | `+ sendActivationEmail(String, String): void`<br/>`+ sendPasswordResetEmail(String, String): void`<br/>`+ sendAppointmentConfirmation(String, Appointment): void`<br/>`+ processFailedOutboxEmails(): void` |

##### 3.28.2. Sequence Diagram: `@Async("mailExecutor")` Event Listener & SMTP Delivery
```mermaid
sequenceDiagram
    autonumber
    actor System as Nghiệp vụ hệ thống (Booking/Register)
    participant Listener as AppointmentEventListener
    participant MailSvc as EmailService (@Async Project Loom)
    participant SMTP as Máy chủ SMTP (Brevo Transactional Gateway)

    System->>Listener: publishEvent(AppointmentBookedEvent)
    Note over Listener: Giao dịch CSDL chính đã COMMIT hoàn tất an toàn<br/>(@TransactionalEventListener(phase = AFTER_COMMIT))
    Listener->>MailSvc: sendAppointmentConfirmation(patientEmail, appt)
    Note over MailSvc: Luồng ảo Virtual Thread Project Loom thực thi bất đồng bộ hoàn toàn
    MailSvc->>MailSvc: Nạp Thymeleaf template "email/appointment-confirmation.html", gắn dữ liệu (Mã lịch hẹn, Giờ khám, Bác sĩ)
    MailSvc->>SMTP: Gửi email giao dịch qua cổng TLS 587
    SMTP-->>MailSvc: 250 OK (Thư đã tiếp nhận và gửi đi thành công)
    Note over MailSvc: Hoàn tất tác vụ ngầm, thời gian phản hồi HTTP của người dùng không bị trễ một mili-giây nào!
```

###### Table 3.28.2: Step-by-Step Flow Specification (Async Email Dispatch)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Nghiệp vụ chính | `EventPublisher` | `publishEvent()` | `AppointmentBookedEvent` | Kích hoạt sự kiện sau khi lưu lịch hẹn thành công. |
| **2** | `EventPublisher` | `Listener` | Bắt sự kiện sau COMMIT | `event` | Đảm bảo dữ liệu đã vào CSDL mới gửi email. |
| **3** | Listener | `EmailService` | `sendAppointmentConfirmation()` | `patientEmail, appt` | Bắn tác vụ sang luồng ảo `@Async("mailExecutor")`. |
| **4** | `EmailService` | Thymeleaf Engine | Render template HTML | `model` | Tạo mã HTML thư điện tử chuẩn nhận diện thương hiệu. |
| **5-6** | `EmailService` | SMTP Server | `send(mimeMessage)` | TLS 587 | Kết nối SMTP gửi thư điện tử giao dịch. |
| **7** | `EmailService` | Hệ thống | Hoàn tất | - | Ghi log `INFO [EMAIL_SENT]` hoàn tất chu trình. |

##### 3.28.3. Sequence Diagram: SMTP Server Failure & Exponential Backoff Retry Outbox
```mermaid
sequenceDiagram
    autonumber
    actor System as Nghiệp vụ hệ thống
    participant MailSvc as EmailService
    participant SMTP as Máy chủ SMTP
    participant DB as PostgreSQL (email_outbox)
    participant Scheduler as OutboxRetryScheduler (Cron Job)

    MailSvc->>SMTP: send(mimeMessage)
    SMTP-->>MailSvc: MailConnectException (Mất kết nối máy chủ thư điện tử)
    Note over MailSvc: Bắt lỗi kết nối mạng an toàn (Không làm vỡ luồng người dùng!)<br/>Lưu thông điệp vào bảng email_outbox để gửi lại sau
    MailSvc->>DB: INSERT INTO email_outbox (recipient=to, subject=..., content=..., status='PENDING', retry_count=0, next_retry_at=NOW()+INTERVAL '2 minutes')
    Note over Scheduler: Sau 2 phút, Cron Job quét các email bị lỗi để phát lại tự động
    Scheduler->>DB: SELECT * FROM email_outbox WHERE status='PENDING' AND next_retry_at <= NOW()
    DB-->>Scheduler: List Pending Emails (id=uuid)
    Scheduler->>SMTP: Thử gửi lại lần 1 (Retry #1)
    SMTP-->>Scheduler: 250 OK (Gửi thành công)
    Scheduler->>DB: UPDATE email_outbox SET status='SENT', sent_at=NOW() WHERE id = uuid
```

###### Table 3.28.3: Error Handling & Exception Matrix (Email Engine)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Mất kết nối máy chủ SMTP** | `MailConnectException` hoặc `SocketTimeoutException` | Không ảnh hưởng (Background) | `MAIL_SERVER_UNAVAILABLE` | Tự động lưu thư vào bảng `email_outbox` và lập lịch gửi lại sau (Retry Outbox Pattern). |
| **Địa chỉ email không tồn tại** | Lỗi SMTP 550 Mailbox Not Found | Không ảnh hưởng (Background) | `INVALID_RECIPIENT` | Đánh dấu bản ghi thư là `FAILED_PERMANENTLY` và dừng thử lại để tránh bị đánh dấu Spam. |
'''
