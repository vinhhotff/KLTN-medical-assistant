"""
Part 4 of SDD Generator: Section 3 Detailed Design (Features 3.11 to 3.20 - Appointments, EMR, Workstation, Reviews, Document Storage, OCR, BOLA Defense).
Fully expanded with Class Specification Tables, Step-by-Step Sequence Tables, and Error Handling Matrices.
"""

def get_part4_content():
    return '''#### 3.11 Telehealth Appointment Booking & Slot Concurrency Locking

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân (Authenticated Patient) hoặc Quản trị viên hỗ trợ đặt lịch.
* **Mục tiêu:** Cho phép bệnh nhân lựa chọn bác sĩ, ngày khám và khung giờ khám bệnh (Slot 30 phút), phân bổ số thứ tự tiếp đón hàng ngày (`STT 01`, `STT 02`, ...), đồng thời ngăn chặn tuyệt đối tình trạng đặt lịch trùng lặp khi có nhiều người dùng cùng bấm đặt một ca khám tại cùng một thời điểm.
* **Quy tắc nghiệp vụ & An ninh:**
  - Khung giờ khám phải nằm trong giờ hành chính hợp lệ: Sáng 08:00 – 12:00, Chiều 13:30 – 17:00, từ Thứ Hai đến Thứ Bảy (Chặn đặt lịch Chủ Nhật).
  - Áp dụng cơ chế **Khóa phân tán hai lớp (Two-Layer Distributed Lock)**: Redis Semaphore (`lock:slot:docId:timestamp` với TTL 10 giây) kết hợp ràng buộc CSDL độc quyền (Flyway V7: `idx_appointment_slot_unique`).
  - Khi phát hiện xung đột, giao dịch bị từ chối ngay lập tức với mã lỗi `SLOT_CONFLICT` (HTTP 409).

##### 3.11.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +bookAppointment(CreateAppointmentRequest request, UserPrincipal principal) ResponseEntity~ApiResponse~AppointmentDto~~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        -UserRepository userRepo
        -DoctorProfileRepository doctorRepo
        -RedisTemplate redisTemplate
        -EmailService emailService
        +bookAppointment(UUID patientId, CreateAppointmentRequest request) AppointmentDto
        -validateOperatingHours(LocalDateTime start, LocalDateTime end) void
        -generateDailyQueueNumber(UUID doctorId, LocalDate date) String
    }
    class Appointment {
        -UUID id
        -String appointmentCode
        -UUID patientId
        -UUID doctorId
        -LocalDateTime scheduledStart
        -LocalDateTime scheduledEnd
        -AppointmentStatus status
        -PaymentStatus paymentStatus
        -BigDecimal feeAmount
        -String queueNumber
        -String clinicRoom
        -Long version
    }
    class CreateAppointmentRequest {
        -UUID doctorId
        -LocalDateTime scheduledStart
        -LocalDateTime scheduledEnd
        -String chiefComplaint
        -UUID medicalDocumentId
        -UUID triageSessionId
    }
    class AppointmentDto {
        -UUID id
        -String appointmentCode
        -String doctorName
        -String specialtyName
        -LocalDateTime scheduledStart
        -String queueNumber
        -String clinicRoom
        -String status
    }

    AppointmentController --> AppointmentService
    AppointmentService --> Appointment
    AppointmentController ..> CreateAppointmentRequest
    AppointmentController ..> AppointmentDto
```

###### Table 3.11.1: Appointment Booking Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AppointmentController` | Presentation (REST) | Cung cấp endpoint `POST /api/v1/appointments`, kiểm tra quyền `@PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")`. | `+ bookAppointment(@AuthenticationPrincipal UserPrincipal, @Valid @RequestBody CreateAppointmentRequest): ResponseEntity<ApiResponse<AppointmentDto>>` |
| `AppointmentService` | Application Service | Quản lý giao dịch `@Transactional`, kiểm tra giờ làm việc, thực thi khóa slot Redis, sinh mã số thứ tự `queue_number` và tạo cuộc hẹn. | `+ bookAppointment(UUID, CreateAppointmentRequest): AppointmentDto`<br/>`- validateOperatingHours(LocalDateTime, LocalDateTime): void`<br/>`- generateDailyQueueNumber(UUID, LocalDate): String` |
| `CreateAppointmentRequest` | DTO | Dữ liệu đầu vào yêu cầu đặt lịch khám bệnh. | `- doctorId: UUID (@NotNull)`<br/>`- scheduledStart: LocalDateTime (@NotNull, @Future)`<br/>`- scheduledEnd: LocalDateTime (@NotNull)`<br/>`- chiefComplaint: String (@Size(max=1000))` |
| `AppointmentDto` | DTO | Thông tin cuộc hẹn đã khởi tạo thành công gửi về giao diện. | `- id: UUID`<br/>`- appointmentCode: String`<br/>`- queueNumber: String ("STT 04")`<br/>`- clinicRoom: String`<br/>`- status: String ("SCHEDULED")` |

##### 3.11.2. Sequence Diagram: Successful Booking & Daily Queue Number Allocation (`STT xx`)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (BookingModal)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant Redis as Redis (Slot Semaphore)
    participant DB as PostgreSQL (appointments)
    participant Mail as EmailService (@Async Loom)

    Patient->>UI: Chọn Bác sĩ, Ngày khám 19/10/2026, Khung giờ 09:00 - 09:30, bấm "Xác nhận đặt lịch"
    UI->>Ctrl: POST /api/v1/appointments (CreateAppointmentRequest)
    Ctrl->>Svc: bookAppointment(patientId, request)
    Svc->>Svc: validateOperatingHours(): Giờ 09:00 thuộc ca sáng (08:00-12:00), Thứ 2 (Hợp lệ)
    Svc->>Redis: SET lock:slot:docId:202610190900 NX EX 10 (Khóa phân tán 10s)
    Redis-->>Svc: OK (Giữ khóa độc quyền thành công)
    Svc->>DB: existsConflictSlot(doctorId, start, end, ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
    DB-->>Svc: false (Khung giờ còn trống)
    Svc->>DB: countTodayAppointments(doctorId, 2026-10-19)
    DB-->>Svc: 3 (Đã có 3 ca trước đó)
    Svc->>Svc: queueNumber = String.format("STT %02d", 3 + 1) -> "STT 04"
    Svc->>DB: INSERT INTO appointments (appointment_code='APT-20261019-7712', patient_id=patientId, doctor_id=doctorId, scheduled_start=start, scheduled_end=end, status='SCHEDULED', payment_status='UNPAID', queue_number='STT 04', clinic_room='Phòng 302 - Tòa A', fee_amount=500000)
    DB-->>Svc: Appointment Entity Created
    Svc->>Redis: DEL lock:slot:docId:202610190900 (Giải phóng khóa phân tán)
    Svc->>Mail: sendAppointmentBookedNotification(patient, appointment)
    Svc-->>Ctrl: AppointmentDto(queueNumber='STT 04', status='SCHEDULED')
    Ctrl-->>UI: 201 Created + AppointmentDto
    UI-->>Patient: Hiển thị màn hình đặt lịch thành công, phiếu khám điện tử và nút "Thanh toán VNPay"
```

###### Table 3.11.2: Step-by-Step Flow Specification (Booking Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Chọn bác sĩ và slot giờ | `doctorId, date, slot` | Bật hộp thoại `BookingModal`. |
| **2** | React SPA | `AppointmentController` | `POST /api/v1/appointments` | `CreateAppointmentRequest` | Chuyển tiếp yêu cầu đặt lịch kèm JWT Bearer. |
| **3** | Controller | `AppointmentService` | `bookAppointment()` | `patientId, request` | Bắt đầu giao dịch `@Transactional(Isolation.REPEATABLE_READ)`. |
| **4** | Service | Nội bộ | `validateOperatingHours()` | `start, end` | Kiểm tra thứ trong tuần và khoảng thời gian hành chính. |
| **5-6** | Service | Redis Cache | Thâu tóm Semaphore phân tán | `key: lock:slot:...` | `SET key NX EX 10`. Đảm bảo luồng chạy độc quyền. |
| **7-8** | Service | `AppointmentRepository` | `existsConflictSlot()` | `doctorId, start, end` | `SELECT EXISTS(SELECT 1 FROM appointments WHERE doctor_id=? AND scheduled_start=? AND status IN (...))`. |
| **9-11**| Service | `AppointmentRepository` | Đếm ca khám & Cấp STT | `doctorId, date` | `SELECT COUNT(*) FROM appointments ...` -> Cấp số `STT 04`. |
| **12-13**| Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `INSERT INTO appointments (status='SCHEDULED', queue_number='STT 04', ...)`. |
| **14** | Service | Redis Cache | Giải phóng Semaphore | `key: lock:slot:...` | `DEL key`. Mở khóa cho các yêu cầu khác. |
| **15** | Service | `EmailService` | `sendNotification()` | `appointment` | Gửi email xác nhận đặt lịch bất đồng bộ. |
| **16-17**| Controller | Bệnh nhân | `201 Created` | `AppointmentDto` | Render giao diện phiếu khám điện tử có mã QR. |

##### 3.11.3. Sequence Diagram: Concurrent Booking Collision (`SLOT_CONFLICT` 409)
```mermaid
sequenceDiagram
    autonumber
    actor PatientB as Bệnh nhân B
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    PatientB->>Ctrl: POST /api/v1/appointments (Cùng khung giờ Bệnh nhân A vừa đặt trước 50ms)
    Ctrl->>Svc: bookAppointment(patientBId, request)
    Svc->>DB: existsConflictSlot(doctorId, start, end, ACTIVE_STATUSES)
    DB-->>Svc: true (Khung giờ vừa bị chiếm bởi Bệnh nhân A)
    Svc-->>Ctrl: throw AppException(SLOT_CONFLICT, "Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác.")
    Ctrl-->>PatientB: 409 Conflict (ErrorCode: "SLOT_CONFLICT")
```

###### Table 3.11.3: Error Handling & Exception Matrix (Appointment Booking)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Trùng lịch khám (Concurrency Collision)** | `existsConflictSlot() == true` | `409 Conflict` | `SLOT_CONFLICT` | "Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác." Giải phóng khóa Redis. |
| **Đặt lịch vào ngày Chủ Nhật** | `start.getDayOfWeek() == SUNDAY` | `400 Bad Request` | `SUNDAY_BOOKING_NOT_SUPPORTED` | "Phòng khám không tiếp nhận đặt lịch vào ngày Chủ Nhật." |
| **Đặt lịch ngoài giờ hành chính** | Khung giờ trước 08:00, 12:00-13:30, sau 17:00 | `400 Bad Request` | `OUTSIDE_OPERATING_HOURS` | "Khung giờ đã chọn nằm ngoài thời gian làm việc của phòng khám." |
| **Email chưa kích hoạt** | `user.emailVerified == false` | `403 Forbidden` | `EMAIL_NOT_VERIFIED` | "Vui lòng xác thực tài khoản qua email trước khi đặt lịch khám bệnh." |

---

#### 3.12 Appointment Rescheduling & Operating Hours Validation

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân hoặc Bác sĩ điều trị.
* **Mục tiêu:** Cung cấp chức năng thay đổi thời gian khám bệnh (Reschedule) sang một khung giờ khác mà không làm mất thông tin bệnh án ban đầu.
* **Quy tắc kiểm soát:**
  - Ca khám chỉ được phép dời lịch khi đang ở trạng thái `SCHEDULED`.
  - Khung giờ mới phải chưa có người đặt và phải tuân thủ giờ hành chính y tế.

##### 3.12.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +rescheduleAppointment(UUID id, RescheduleAppointmentRequest request, UserPrincipal principal) ResponseEntity~ApiResponse~AppointmentDto~~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        +rescheduleAppointment(UUID id, UUID actorId, Role role, RescheduleAppointmentRequest request) AppointmentDto
    }
    class RescheduleAppointmentRequest {
        -LocalDateTime newStart
        -LocalDateTime newEnd
        -String reason
    }

    AppointmentController --> AppointmentService
    AppointmentController ..> RescheduleAppointmentRequest
```

###### Table 3.12.1: Reschedule Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AppointmentController` | Presentation (REST) | Cung cấp endpoint `PATCH /api/v1/appointments/{id}/reschedule`. | `+ rescheduleAppointment(@PathVariable UUID, @AuthenticationPrincipal UserPrincipal, @Valid @RequestBody RescheduleAppointmentRequest): ResponseEntity<ApiResponse<AppointmentDto>>` |
| `AppointmentService` | Application Service | Kiểm tra trạng thái cuộc hẹn, thẩm định giờ khám mới và cập nhật thời gian. | `+ rescheduleAppointment(UUID, UUID, Role, RescheduleAppointmentRequest): AppointmentDto` |

##### 3.12.2. Sequence Diagram: Valid Rescheduling & Schedule Slot Reassignment
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)
    participant Mail as EmailService (@Async Loom)

    Patient->>UI: Chọn ca khám, chọn ngày mới 20/10/2026 lúc 14:00, bấm "Xác nhận dời lịch"
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/reschedule (RescheduleAppointmentRequest)
    Ctrl->>Svc: rescheduleAppointment(id, patientId, Role.PATIENT, request)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment Entity (status='SCHEDULED', patient_id=patientId)
    Svc->>Svc: validateOperatingHours(newStart, newEnd) -> Hợp lệ
    Svc->>DB: existsConflictSlot(doctorId, newStart, newEnd)
    DB-->>Svc: false (Trống lịch)
    Svc->>DB: UPDATE appointments SET scheduled_start = newStart, scheduled_end = newEnd, updated_at = NOW() WHERE id = id
    Svc->>Mail: sendRescheduledNotification(patient, doctor, newStart)
    Svc-->>Ctrl: AppointmentDto (Thời gian mới)
    Ctrl-->>UI: 200 OK + AppointmentDto
    UI-->>Patient: Cập nhật thời gian khám mới trên lịch hẹn và gửi thông báo Toast thành công
```

###### Table 3.12.2: Step-by-Step Flow Specification (Reschedule Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Chọn dời lịch sang giờ mới | `id, newStart, newEnd` | Kiểm tra thời gian mới trong tương lai. |
| **2** | React SPA | `AppointmentController` | `PATCH /api/v1/appointments/{id}/reschedule` | `RescheduleAppointmentRequest` | Gửi yêu cầu dời lịch kèm JWT. |
| **3** | Controller | `AppointmentService` | `rescheduleAppointment()` | `id, actorId, role, req` | Bắt đầu quy trình kiểm tra nghiệp vụ dời lịch. |
| **4** | Service | `AppointmentRepository` | `findById()` | `id` | `SELECT * FROM appointments WHERE id = ?`. |
| **5** | Service | Nội bộ | Kiểm tra giờ khám | `newStart, newEnd` | Thẩm định khung giờ hành chính y tế. |
| **6-7** | Service | `AppointmentRepository` | `existsConflictSlot()` | `doctorId, newStart` | `SELECT EXISTS(SELECT 1 FROM appointments WHERE ...)`. |
| **8** | Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `UPDATE appointments SET scheduled_start = ?, scheduled_end = ? WHERE id = ?`. |
| **9** | Service | `EmailService` | `sendNotification()` | `appointment` | Gửi email thông báo dời lịch cho cả bác sĩ và bệnh nhân. |
| **10-11**| Controller | Bệnh nhân | `200 OK` | `AppointmentDto` | Cập nhật giao diện và hiển thị thông báo thành công. |

##### 3.12.3. Sequence Diagram: Invalid Rescheduling (Completed Appointment Lockout)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Cố tình yêu cầu dời lịch cho một ca khám đã hoàn thành (COMPLETED)
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/reschedule
    Ctrl->>Svc: rescheduleAppointment(id, patientId, Role.PATIENT, request)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (status='COMPLETED')
    Note over Svc: appointment.getStatus() != AppointmentStatus.SCHEDULED
    Svc-->>Ctrl: throw AppException(APPOINTMENT_CANNOT_BE_RESCHEDULED, "Chỉ có thể dời lịch đối với ca khám đang ở trạng thái Chờ khám (SCHEDULED).")
    Ctrl-->>UI: 400 Bad Request (ErrorCode: "CANNOT_RESCHEDULE")
    UI-->>Patient: Hiển thị cảnh báo lỗi từ chối thao tác
```

###### Table 3.12.3: Error Handling & Exception Matrix (Reschedule)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Ca khám không ở trạng thái SCHEDULED** | `status != SCHEDULED` | `400 Bad Request` | `CANNOT_RESCHEDULE` | "Chỉ có thể dời lịch đối với ca hẹn đang ở trạng thái Chờ khám." |
| **Khung giờ mới bị trùng lịch** | `existsConflictSlot() == true` | `409 Conflict` | `SLOT_CONFLICT` | "Khung giờ mới đã có bệnh nhân khác đặt. Vui lòng chọn giờ khác." |
| **Dời lịch vào ngày Chủ Nhật** | `newStart.getDayOfWeek() == SUNDAY` | `400 Bad Request` | `SUNDAY_NOT_ALLOWED` | "Phòng khám không tiếp nhận ca hẹn vào ngày Chủ Nhật." |

---

#### 3.13 Appointment Cancellation & Tiered Automated Refund Calculation

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân, Bác sĩ điều trị, Quản trị viên (All Roles).
* **Mục tiêu:** Cung cấp quy trình hủy lịch khám minh bạch kèm **Thuật toán tính tiền hoàn tự động phân tầng (Tiered Automated Refund)**:
  - **Trường hợp Bác sĩ hoặc Quản trị viên hủy:** Luôn hoàn trả **100% viện phí** cho bệnh nhân vô điều kiện.
  - **Trường hợp Bệnh nhân chủ động hủy:**
    * Hủy trước giờ khám $\ge 24\text{ giờ}$: Hoàn trả **100% viện phí**.
    * Hủy trước giờ khám từ $2\text{ giờ}$ đến $< 24\text{ giờ}$: Hoàn trả **80% viện phí** (Khấu trừ 20% phí giữ chỗ phòng khám).
    * Hủy sát giờ khám $< 2\text{ giờ}$: Hoàn trả **0% (Không hoàn tiền)** do phòng khám không thể kịp điều phối bệnh nhân khác.

##### 3.13.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +updateStatus(UUID id, Map~String, String~ body, UserPrincipal principal) ResponseEntity~ApiResponse~AppointmentDto~~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        -AppointmentRefundService refundService
        +updateAppointmentStatus(UUID id, UUID actorId, Role role, AppointmentStatus newStatus, String reason) AppointmentDto
    }
    class AppointmentRefundService {
        -PaymentService paymentService
        -PaymentTransactionRepository transactionRepo
        +calculateRefundAmount(Appointment appt, Role actorRole) BigDecimal
        +processRefund(Appointment appt, BigDecimal amount, String reason) void
    }

    AppointmentController --> AppointmentService
    AppointmentService --> AppointmentRefundService
```

###### Table 3.13.1: Cancellation & Refund Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AppointmentController` | Presentation (REST) | Cung cấp endpoint `PATCH /api/v1/appointments/{id}/status`. | `+ updateStatus(@PathVariable UUID, @AuthenticationPrincipal UserPrincipal, @RequestBody Map<String, String>): ResponseEntity<ApiResponse<AppointmentDto>>` |
| `AppointmentService` | Application Service | Xác thực quyền của chủ thể hủy lịch, cập nhật trạng thái `CANCELLED` và kích hoạt dịch vụ hoàn tiền. | `+ updateAppointmentStatus(UUID, UUID, Role, AppointmentStatus, String): AppointmentDto` |
| `AppointmentRefundService` | Financial Domain Service | Thực thi công thức toán học phân tầng tính số tiền hoàn và gọi cổng thanh toán VNPay hoàn trả tiền tự động. | `+ calculateRefundAmount(Appointment, Role): BigDecimal`<br/>`+ processRefund(Appointment, BigDecimal, String): void` |

##### 3.13.2. Sequence Diagram: Patient Cancellation & 100%/80% Automated Policy Refund
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (AppointmentDetail)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant RefundSvc as AppointmentRefundService
    participant PaySvc as PaymentService (VNPay Gateway)
    participant DB as PostgreSQL (appointments, payment_transactions)
    participant Mail as EmailService (@Async Loom)

    Patient->>UI: Bấm "Hủy lịch khám" (Trước giờ khám 26 tiếng), nhập lý do: "Bận công tác"
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/status (status='CANCELLED', notes='Bận công tác')
    Ctrl->>Svc: updateAppointmentStatus(id, patientId, Role.PATIENT, CANCELLED, notes)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (feeAmount=500.000 VND, payment_status='PAID', scheduled_start=NOW()+26h)
    Svc->>RefundSvc: calculateRefundAmount(appt, Role.PATIENT)
    Note over RefundSvc: Khoảng cách = 26 giờ (>= 24h) -> Tỷ lệ hoàn 100% -> refundAmount = 500.000 VND<br/>(Nếu khoảng cách từ 2h - 24h: Tỷ lệ hoàn 80% -> refundAmount = 400.000 VND)
    RefundSvc-->>Svc: refundAmount = 500.000 VND
    Svc->>RefundSvc: processRefund(appt, 500000, notes)
    RefundSvc->>PaySvc: refundTransaction(txCode, 500000)
    PaySvc-->>RefundSvc: Refund Success (Mã giao dịch hoàn VNPay: RF-9912)
    RefundSvc->>DB: INSERT INTO payment_transactions (order_type='REFUND', amount=500000, status='COMPLETED', gateway_reference='RF-9912')
    Svc->>DB: UPDATE appointments SET status='CANCELLED', payment_status='REFUNDED', refund_amount=500000, refunded_at=NOW(), cancellation_reason=notes
    Svc->>Mail: sendCancellationAndRefundReceipt(patient, appointment, 500000)
    Svc-->>Ctrl: AppointmentDto (status='CANCELLED', refundAmount=500000)
    Ctrl-->>UI: 200 OK + AppointmentDto
    UI-->>Patient: Hiển thị thông báo: "Lịch hẹn đã hủy thành công. Tiền hoàn 500.000 VND đã được xử lý về tài khoản."
```

###### Table 3.13.2: Step-by-Step Flow Specification (Cancellation & Tiered Refund)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhấn Hủy lịch khám | `id, lý do` | Mở hộp thoại `ConfirmDialog`. |
| **2** | React SPA | `AppointmentController` | `PATCH /api/v1/appointments/{id}/status` | `{status: "CANCELLED", notes: "..."}` | Gửi yêu cầu hủy lịch kèm Bearer Token. |
| **3** | Controller | `AppointmentService` | `updateAppointmentStatus()` | `id, actorId, role, status, notes` | Khởi động quy trình hủy và hoàn tiền. |
| **4** | Service | `AppointmentRepository` | `findById()` | `id` | `SELECT * FROM appointments WHERE id = ?`. |
| **5-6** | Service | `AppointmentRefundService` | `calculateRefundAmount()` | `appointment, role` | Tính toán số giờ còn lại tới giờ khám và áp tỷ lệ 100%, 80% hoặc 0%. |
| **7-9** | RefundService | `PaymentService` | `refundTransaction()` | `txCode, amount` | Gọi API VNPay Refund để hoàn tiền trực tiếp vào tài khoản nguồn. |
| **10** | RefundService | `PaymentTransactionRepository` | `save(refundTx)` | `PaymentTransaction` | `INSERT INTO payment_transactions (order_type='REFUND', ...)`. |
| **11** | Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `UPDATE appointments SET status='CANCELLED', payment_status='REFUNDED', ...`. |
| **12** | Service | `EmailService` | `sendReceipt()` | `patient, 500000` | Gửi biên lai hoàn tiền qua email. |
| **13-14**| Controller | Bệnh nhân | `200 OK` | `AppointmentDto` | Cập nhật giao diện sang trạng thái Đã hủy kèm số tiền hoàn. |

##### 3.13.3. Sequence Diagram: Late Cancellation Under 2 Hours (0% Non-Refundable)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant RefundSvc as AppointmentRefundService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Bấm Hủy lịch hẹn trước giờ khám 45 phút (< 2 giờ)
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/status (status='CANCELLED')
    Ctrl->>Svc: updateAppointmentStatus(id, patientId, Role.PATIENT, CANCELLED, ...)
    Svc->>RefundSvc: calculateRefundAmount(appt, Role.PATIENT)
    Note over RefundSvc: Khoảng cách = 45 phút (< 2h) -> Tỷ lệ hoàn 0% -> refundAmount = 0 VND
    RefundSvc-->>Svc: refundAmount = 0 VND
    Svc->>DB: UPDATE appointments SET status='CANCELLED', refund_amount=0, cancellation_reason='Hủy muộn < 2h'
    Svc-->>Ctrl: AppointmentDto (status='CANCELLED', refundAmount=0)
    Ctrl-->>UI: 200 OK
    UI-->>Patient: Cảnh báo: "Lịch hẹn đã hủy nhưng không được hoàn phí do hủy sát giờ (< 2 giờ) theo Điều khoản dịch vụ."
```

###### Table 3.13.3: Error Handling & Exception Matrix (Cancellation)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Ca khám đã hoàn tất** | `status == COMPLETED` | `400 Bad Request` | `APPOINTMENT_ALREADY_COMPLETED` | "Không thể hủy ca khám đã hoàn thành." |
| **Ca khám đang diễn ra** | `status == IN_PROGRESS` | `400 Bad Request` | `APPOINTMENT_IN_PROGRESS` | "Không thể hủy ca khám đang diễn ra với bác sĩ." |
| **Không có quyền hủy** | Người dùng không phải bệnh nhân hoặc bác sĩ của ca khám | `403 Forbidden` | `FORBIDDEN` | "Bạn không có quyền thực hiện thao tác hủy cuộc hẹn này." |

---

#### 3.14 Patient Clinic Check-In & Queue Management

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân có mặt tại phòng khám hoặc Nhân viên tiếp đón.
* **Mục tiêu:** Ghi nhận sự có mặt thực tế của bệnh nhân tại bệnh viện, cập nhật dấu thời gian `checked_in_at` và kích hoạt trạng thái sẵn sàng để Bác sĩ gọi vào khám (`call-next`).
* **Quy tắc kiểm tra:** Chỉ cho phép thực hiện điểm danh trong **chính ngày diễn ra ca khám** (`scheduled_start.toLocalDate().isEqual(today)`).

##### 3.14.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +checkIn(UUID id, UserPrincipal principal) ResponseEntity~ApiResponse~AppointmentDto~~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        +checkInPatient(UUID id, UUID actorId) AppointmentDto
    }

    AppointmentController --> AppointmentService
```

###### Table 3.14.1: Check-In Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AppointmentController` | Presentation (REST) | Cung cấp endpoint `PATCH /api/v1/appointments/{id}/check-in`. | `+ checkIn(@PathVariable UUID, @AuthenticationPrincipal UserPrincipal): ResponseEntity<ApiResponse<AppointmentDto>>` |
| `AppointmentService` | Application Service | Kiểm tra tính hợp lệ về ngày hẹn và lưu dấu thời gian điểm danh thực tế `checked_in_at`. | `+ checkInPatient(UUID appointmentId, UUID actorId): AppointmentDto` |

##### 3.14.2. Sequence Diagram: Successful Check-In & Queue Status Update
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân tại Bệnh viện
    participant UI as React 18 SPA (TicketView)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Mở Phiếu khám điện tử, quét mã QR hoặc bấm "Điểm danh tiếp đón"
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/check-in
    Ctrl->>Svc: checkInPatient(id, principal.getId())
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (status='SCHEDULED', scheduled_start=Hôm nay 09:00, checked_in_at=null)
    Svc->>Svc: Kiểm tra LocalDate(scheduled_start) == LocalDate.now() -> Khớp hôm nay
    Svc->>DB: UPDATE appointments SET checked_in_at = NOW(), updated_at = NOW() WHERE id = id
    Svc-->>Ctrl: AppointmentDto (checkedInAt = NOW)
    Ctrl-->>UI: 200 OK + AppointmentDto
    UI-->>Patient: Màn hình hiển thị: "Điểm danh thành công! Vui lòng chờ tại sảnh Phòng 302, số thứ tự STT 04."
```

###### Table 3.14.2: Step-by-Step Flow Specification (Check-In Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Bấm Điểm danh tiếp đón | `appointmentId` | Kích hoạt từ màn hình phiếu khám `TicketView`. |
| **2** | React SPA | `AppointmentController` | `PATCH /api/v1/appointments/{id}/check-in` | `id` | Gửi yêu cầu điểm danh qua REST API. |
| **3** | Controller | `AppointmentService` | `checkInPatient()` | `id, actorId` | Bắt đầu giao dịch kiểm tra điểm danh. |
| **4** | Service | `AppointmentRepository` | `findById()` | `id` | `SELECT * FROM appointments WHERE id = ?`. |
| **5** | Service | Nội bộ | So khớp ngày hiện tại | `scheduledStart` | So sánh ngày ca khám với ngày hệ thống `LocalDate.now()`. |
| **6** | Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `UPDATE appointments SET checked_in_at = NOW() WHERE id = ?`. |
| **7-8** | Controller | Bệnh nhân | `200 OK` | `AppointmentDto` | Render trạng thái Đã có mặt và hướng dẫn vào phòng chờ. |

##### 3.14.3. Sequence Diagram: Check-In on Non-Scheduled Day Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Bấm điểm danh cho ca khám của ngày mai
    UI->>Ctrl: PATCH /api/v1/appointments/{id}/check-in
    Ctrl->>Svc: checkInPatient(id, patientId)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (scheduled_start = Ngày mai)
    Note over Svc: scheduled_start.toLocalDate().isEqual(today) == false
    Svc-->>Ctrl: throw AppException(CHECK_IN_NOT_ALLOWED_TODAY, "Chỉ được phép điểm danh tiếp đón trong chính ngày diễn ra ca khám.")
    Ctrl-->>UI: 400 Bad Request (ErrorCode: "CHECK_IN_INVALID_DAY")
    UI-->>Patient: Hiển thị cảnh báo: "Chưa đến ngày khám, vui lòng quay lại vào ngày hẹn."
```

###### Table 3.14.3: Error Handling & Exception Matrix (Check-In)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Điểm danh sai ngày** | Ngày khám khác ngày hiện tại | `400 Bad Request` | `CHECK_IN_INVALID_DAY` | "Chỉ được phép điểm danh tiếp đón trong chính ngày diễn ra ca khám." |
| **Đã điểm danh trước đó** | `checked_in_at != null` | `400 Bad Request` | `ALREADY_CHECKED_IN` | "Quý khách đã thực hiện điểm danh trước đó. Vui lòng ngồi chờ tại sảnh." |

---

#### 3.15 Doctor Clinical Encounter & EMR Documentation

##### Context & Design Scope
* **Tác nhân:** Bác sĩ điều trị phụ trách ca khám.
* **Mục tiêu:** Cung cấp giao diện trạm làm việc lâm sàng để bác sĩ ghi nhận kết quả khám bệnh, sinh hiệu, chẩn đoán bệnh theo danh mục quốc tế **WHO ICD-10** (QĐ 7603/QĐ-BYT), chỉ định cận lâm sàng **LOINC** (QĐ 3280/QĐ-BYT), kê đơn thuốc điện tử dạng JSON và thiết lập phác đồ điều trị.
* **Quy tắc an ninh:** Bác sĩ bắt buộc phải phụ trách ca khám (`assertCanAccessPatient`) mới được phép truy cập và ban hành bệnh án điện tử, tuân thủ Thông tư 46/2018/TT-BYT.

##### 3.15.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +completeClinical(UUID id, ClinicalEncounterRequest request, UserPrincipal principal) ResponseEntity~ApiResponse~AppointmentDto~~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        -PatientAccessGuard patientAccessGuard
        -ClinicalOntologyService ontologyService
        +completeClinicalEncounter(UUID appointmentId, UUID doctorId, ClinicalEncounterRequest request) AppointmentDto
    }
    class ClinicalEncounterRequest {
        -String vitalSignsJson
        -String icd10Code
        -String icd10Name
        -String prescriptionJson
        -String treatmentPlan
        -LocalDate followUpDate
        -String consultationNotes
    }

    AppointmentController --> AppointmentService
    AppointmentService --> ClinicalEncounterRequest
```

###### Table 3.15.1: Clinical Encounter Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `AppointmentController` | Presentation (REST) | Cung cấp endpoint `POST /api/v1/appointments/{id}/complete-clinical`, bảo vệ quyền bác sĩ `@PreAuthorize("hasRole('DOCTOR')")`. | `+ completeClinical(@PathVariable UUID, @AuthenticationPrincipal UserPrincipal, @Valid @RequestBody ClinicalEncounterRequest): ResponseEntity<ApiResponse<AppointmentDto>>` |
| `AppointmentService` | Application Service | Kiểm tra phân quyền y tế qua `PatientAccessGuard`, xác thực mã ICD-10 chuẩn, lưu dữ liệu bệnh án điện tử EMR và chuyển trạng thái ca khám sang `COMPLETED`. | `+ completeClinicalEncounter(UUID, UUID, ClinicalEncounterRequest): AppointmentDto` |
| `ClinicalEncounterRequest` | DTO | Đóng gói toàn bộ hồ sơ lâm sàng gồm sinh hiệu, mã chẩn đoán, đơn thuốc và phác đồ. | `- vitalSignsJson: String`<br/>`- icd10Code: String (@NotBlank)`<br/>`- icd10Name: String (@NotBlank)`<br/>`- prescriptionJson: String`<br/>`- treatmentPlan: String` |

##### 3.15.2. Sequence Diagram: Consultation Completion, WHO ICD-10 Coding & Rx JSON Storage
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ điều trị
    participant UI as React 18 SPA (DoctorWorkstation / EncounterModal)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant Guard as PatientAccessGuard
    participant Ontology as ClinicalOntologyService
    participant DB as PostgreSQL (appointments)
    participant Mail as EmailService (@Async Loom)

    Doctor->>UI: Nhập sinh hiệu (BP: 120/80, HR: 75), chọn mã ICD-10 (I10 - Tăng huyết áp vô căn), kê đơn thuốc Amlodipine 5mg, bấm "Hoàn tất ca khám"
    UI->>Ctrl: POST /api/v1/appointments/{id}/complete-clinical (ClinicalEncounterRequest)
    Ctrl->>Svc: completeClinicalEncounter(id, doctorId, request)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment Entity (patient_id = patientId, doctor_id = doctorId)
    Svc->>Guard: assertCanAccessPatient(doctorId, Role.DOCTOR, patientId, "COMPLETE_CLINICAL_ENCOUNTER")
    Guard->>DB: existsCareRelationship(doctorId, patientId) -> true
    Guard-->>Svc: Phân quyền Hợp lệ
    Svc->>Ontology: validateIcd10Code(request.getIcd10Code())
    Ontology-->>Svc: true (Mã I10 chuẩn danh mục WHO/BYT)
    Svc->>DB: UPDATE appointments SET status='COMPLETED', vital_signs_json=request.vitalSignsJson, icd10_code='I10', icd10_name='Tăng huyết áp vô căn', prescription_json=request.prescriptionJson, treatment_plan=request.treatmentPlan, follow_up_date=request.followUpDate, consultation_notes=request.consultationNotes, updated_at=NOW() WHERE id = id
    DB-->>Svc: Lưu bệnh án thành công
    Svc->>Mail: sendPrescriptionAndSummaryEmail(patient, appointment)
    Svc-->>Ctrl: AppointmentDto (status='COMPLETED')
    Ctrl-->>UI: 200 OK + AppointmentDto
    UI-->>Doctor: Hiển thị thông báo: "Đã hoàn thành ca khám và ban hành đơn thuốc điện tử thành công."
```

###### Table 3.15.2: Step-by-Step Flow Specification (Clinical Encounter Completion)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bác sĩ | React SPA | Nhập sinh hiệu, mã ICD-10, đơn thuốc | Sinh hiệu, ICD-10, Đơn thuốc | Sử dụng thanh tìm kiếm ICD-10 Auto-complete. |
| **2** | React SPA | `AppointmentController` | `POST /api/v1/appointments/{id}/complete-clinical` | `ClinicalEncounterRequest` | Gửi dữ liệu bệnh án lâm sàng. |
| **3** | Controller | `AppointmentService` | `completeClinicalEncounter()` | `id, doctorId, request` | Bắt đầu giao dịch lưu trữ hồ sơ bệnh án. |
| **4** | Service | `AppointmentRepository` | `findById()` | `id` | `SELECT * FROM appointments WHERE id = ?`. |
| **5-7** | Service | `PatientAccessGuard` | `assertCanAccessPatient()` | `doctorId, patientId` | Thẩm định quan hệ khám chữa bệnh `CARE_RELATIONSHIP`. |
| **8-9** | Service | `ClinicalOntologyService` | `validateIcd10Code()` | `"I10"` | So khớp mã bệnh với bản thể luận lâm sàng trong L1 Cache. |
| **10** | Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `UPDATE appointments SET status='COMPLETED', vital_signs_json=..., icd10_code=...`. |
| **11** | Service | `EmailService` | `sendPrescription()` | `patient, appointment` | Tự động gửi bản sao đơn thuốc điện tử cho bệnh nhân. |
| **12-13**| Controller | Bác sĩ | `200 OK` | `AppointmentDto` | Cập nhật hàng đợi và chuyển trạng thái ca khám sang Hoàn thành. |

##### 3.15.3. Sequence Diagram: Non-Attending Doctor Unauthorized Access (BOLA 403)
```mermaid
sequenceDiagram
    autonumber
    actor RogueDoctor as Bác sĩ khác (Không phụ trách ca khám)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant Guard as PatientAccessGuard
    participant DB as PostgreSQL (appointments, audit_logs)

    RogueDoctor->>Ctrl: POST /api/v1/appointments/{victimAppointmentId}/complete-clinical
    Ctrl->>Svc: completeClinicalEncounter(victimAppointmentId, rogueDoctorId, request)
    Svc->>Guard: assertCanAccessPatient(rogueDoctorId, Role.DOCTOR, victimPatientId, "COMPLETE_CLINICAL")
    Guard->>DB: existsByDoctorIdAndPatientIdAndStatusIn(rogueDoctorId, victimPatientId, ...)
    DB-->>Guard: false (Không có quan hệ điều trị y tế!)
    Guard->>DB: INSERT INTO audit_logs (action='BOLA_CLINICAL_BREACH_BLOCKED', actor=rogueDoctorId, resource=victimAppointmentId)
    Guard-->>Svc: throw AppException(FORBIDDEN_CARE_RELATIONSHIP)
    Svc-->>Ctrl: Từ chối truy cập
    Ctrl-->>RogueDoctor: 403 Forbidden (Bảo vệ tính riêng tư bệnh án BOLA/IDOR)
```

###### Table 3.15.3: Error Handling & Exception Matrix (Clinical Encounter)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Bác sĩ không phụ trách ca khám (BOLA)** | Không tồn tại ca hẹn hợp lệ giữa bác sĩ và bệnh nhân | `403 Forbidden` | `FORBIDDEN_CARE_RELATIONSHIP` | "Bạn không có quan hệ khám chữa bệnh với bệnh nhân này." Ghi log kiểm toán khẩn cấp. |
| **Mã ICD-10 không hợp lệ** | Mã bệnh không thuộc danh mục WHO ICD-10 | `400 Bad Request` | `INVALID_ICD10_CODE` | "Mã chẩn đoán bệnh ICD-10 không hợp lệ hoặc không có trong danh mục." |

---

#### 3.16 Doctor Workstation Queue Supervision

##### Context & Design Scope
* **Tác nhân:** Bác sĩ điều trị tại phòng khám.
* **Mục tiêu:** Cung cấp bàn làm việc số hóa (Doctor Workstation), hiển thị danh sách bệnh nhân xếp hàng theo số thứ tự (`STT 01`, `STT 02`), trạng thái điểm danh và nút bấm gọi lượt khám tiếp theo (`call-next`).
* **Cơ chế chuyển trạng thái:** Khi bác sĩ bấm `call-next`, hệ thống tự động tìm ca khám sớm nhất đang ở trạng thái `SCHEDULED` (đã có mặt `checked_in_at != null`) và chuyển sang trạng thái `IN_PROGRESS`.

##### 3.16.1. Class Diagram
```mermaid
classDiagram
    class DoctorController {
        -DoctorService doctorService
        +getMyPatients(UserPrincipal principal) ResponseEntity~ApiResponse~List~DoctorPatientItemDto~~~
        +callNextPatient(UserPrincipal principal) ResponseEntity~ApiResponse~AppointmentDto~~
    }
    class DoctorService {
        -AppointmentRepository appointmentRepo
        -DoctorProfileRepository doctorRepo
        +getDoctorPatients(UUID doctorUserId) List~DoctorPatientItemDto~
        +callNextPatient(UUID doctorUserId) AppointmentDto
    }

    DoctorController --> DoctorService
```

###### Table 3.16.1: Doctor Workstation Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `DoctorController` | Presentation (REST) | Cung cấp endpoint `GET /api/v1/doctors/me/patients` và `POST /api/v1/doctors/me/call-next`. | `+ getMyPatients(@AuthenticationPrincipal UserPrincipal): ResponseEntity<ApiResponse<List<DoctorPatientItemDto>>>`<br/>`+ callNextPatient(@AuthenticationPrincipal UserPrincipal): ResponseEntity<ApiResponse<AppointmentDto>>` |
| `DoctorService` | Application Service | Quản lý logic hàng đợi tiếp đón phòng khám, điều phối chuyển trạng thái cuộc hẹn từ `SCHEDULED` sang `IN_PROGRESS`. | `+ getDoctorPatients(UUID): List<DoctorPatientItemDto>`<br/>`+ callNextPatient(UUID): AppointmentDto` |

##### 3.16.2. Sequence Diagram: Real-Time Queue Fetching & Status Transitions
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ
    participant UI as React 18 SPA (DoctorDashboard)
    participant Ctrl as DoctorController
    participant Svc as DoctorService
    participant DB as PostgreSQL (appointments)

    Doctor->>UI: Mở Bàn làm việc Bác sĩ (Doctor Workstation)
    UI->>Ctrl: GET /api/v1/doctors/me/patients
    Ctrl->>Svc: getDoctorPatients(doctorUserId)
    Svc->>DB: findTodayAppointmentsByDoctor(doctorUserId, LocalDate.now())
    DB-->>Svc: Danh sách ca khám (STT 01: COMPLETED, STT 02: IN_PROGRESS, STT 03: CHECKED_IN)
    Svc-->>Ctrl: List DoctorPatientItemDto
    Ctrl-->>UI: 200 OK + Danh sách hàng đợi khám
    Doctor->>UI: Bấm "Gọi lượt khám tiếp theo" (Call Next)
    UI->>Ctrl: POST /api/v1/doctors/me/call-next
    Ctrl->>Svc: callNextPatient(doctorUserId)
    Svc->>DB: findFirstByDoctorAndStatusScheduledOrderByScheduledStart(doctorUserId)
    DB-->>Svc: Appointment (STT 03, id=uuid)
    Svc->>DB: UPDATE appointments SET status='IN_PROGRESS', updated_at=NOW() WHERE id = uuid
    Svc-->>Ctrl: AppointmentDto (status='IN_PROGRESS')
    Ctrl-->>UI: 200 OK + AppointmentDto
    UI-->>Doctor: Tự động mở hộp thoại Bệnh án điện tử EMR cho bệnh nhân STT 03
```

###### Table 3.16.2: Step-by-Step Flow Specification (Doctor Workstation)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bác sĩ | React SPA | Truy cập bàn làm việc | - | Mở màn hình `DoctorDashboard`. |
| **2** | React SPA | `DoctorController` | `GET /api/v1/doctors/me/patients` | Header `Bearer <token>` | Lấy danh sách bệnh nhân hàng đợi hôm nay. |
| **3-5** | Controller | `DoctorService` | `getDoctorPatients()` | `doctorUserId` | `SELECT * FROM appointments WHERE doctor_id=? AND scheduled_start::date = CURRENT_DATE ORDER BY scheduled_start`. |
| **6-7** | Controller | Bác sĩ | `200 OK` | `List<DoctorPatientItemDto>` | Hiển thị hàng đợi thời gian thực. |
| **8** | Bác sĩ | React SPA | Bấm "Gọi lượt khám tiếp theo" | - | Bác sĩ gọi bệnh nhân tiếp theo vào khám. |
| **9-11**| Service | `AppointmentRepository` | Tìm ca khám kế tiếp | `doctorUserId` | `SELECT * FROM appointments WHERE doctor_id=? AND status='SCHEDULED' ORDER BY scheduled_start LIMIT 1`. |
| **12** | Service | `AppointmentRepository` | `save(appointment)` | `Appointment` | `UPDATE appointments SET status='IN_PROGRESS' WHERE id = ?`. |
| **13-15**| Controller | Bác sĩ | `200 OK` | `AppointmentDto` | Chuyển trạng thái sang `IN_PROGRESS` và mở form khám EMR. |

##### 3.16.3. Sequence Diagram: No Patients in Queue Notification
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ
    participant UI as React 18 SPA
    participant Ctrl as DoctorController
    participant Svc as DoctorService
    participant DB as PostgreSQL (appointments)

    Doctor->>UI: Bấm "Gọi lượt khám tiếp theo" khi hàng đợi đã khám hết
    UI->>Ctrl: POST /api/v1/doctors/me/call-next
    Ctrl->>Svc: callNextPatient(doctorUserId)
    Svc->>DB: findFirstByDoctorAndStatusScheduled(...)
    DB-->>Svc: Optional.empty() (Hết bệnh nhân chờ)
    Svc-->>Ctrl: throw AppException(NO_PATIENTS_IN_QUEUE, "Hàng đợi hôm nay không còn bệnh nhân nào đang chờ khám.")
    Ctrl-->>UI: 404 Not Found (ErrorCode: "QUEUE_EMPTY")
    UI-->>Doctor: Hiển thị thông báo Toast: "Đã hoàn thành toàn bộ danh sách khám trong ngày!"
```

###### Table 3.16.3: Error Handling & Exception Matrix (Workstation)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Hàng đợi trống** | Không còn cuộc hẹn nào `SCHEDULED` | `404 Not Found` | `NO_PATIENTS_IN_QUEUE` | "Không còn bệnh nhân nào trong hàng đợi chờ khám." |
| **Bác sĩ chưa được phê duyệt** | `doctorProfile.isVerified == false` | `403 Forbidden` | `DOCTOR_NOT_VERIFIED` | "Hồ sơ của bạn đang chờ phê duyệt. Không thể mở bàn làm việc." |

---

#### 3.17 Patient Review & Doctor Rating Submission

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân đã hoàn thành ca khám (`COMPLETED`).
* **Mục tiêu:** Cho phép người bệnh đánh giá chất lượng phục vụ và chuyên môn của bác sĩ (thang điểm 1 - 5 sao kèm nhận xét), tích hợp vào **Bộ giảm chấn độ tin cậy đánh giá (Credibility Damper)** trong thuật toán WHRF-SOTA (Flyway V17).
* **Quy tắc kiểm tra:** Mỗi cuộc hẹn chỉ được phép đánh giá duy nhất **1 lần** (Ràng buộc `UNIQUE (appointment_id)` trên bảng `doctor_reviews`).

##### 3.17.1. Class Diagram
```mermaid
classDiagram
    class DoctorReviewController {
        -DoctorReviewService reviewService
        +submitReview(DoctorReviewRequest request, UserPrincipal principal) ResponseEntity~ApiResponse~DoctorReviewDto~~
    }
    class DoctorReviewService {
        -DoctorReviewRepository reviewRepo
        -AppointmentRepository appointmentRepo
        -DoctorProfileRepository doctorRepo
        +createReview(UUID patientUserId, DoctorReviewRequest request) DoctorReviewDto
        -recalculateDoctorStats(UUID doctorUserId) void
    }
    class DoctorReviewRequest {
        -UUID appointmentId
        -int rating
        -String comment
        -String tags
    }
    class DoctorReviewDto {
        -UUID id
        -UUID appointmentId
        -int rating
        -String comment
        -String patientName
        -LocalDateTime createdAt
    }

    DoctorReviewController --> DoctorReviewService
    DoctorReviewService --> DoctorReviewRequest
    DoctorReviewService --> DoctorReviewDto
```

###### Table 3.17.1: Review Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `DoctorReviewController` | Presentation (REST) | Cung cấp endpoint `POST /api/v1/doctor-reviews`, kiểm tra quyền bệnh nhân. | `+ submitReview(@Valid @RequestBody DoctorReviewRequest, @AuthenticationPrincipal UserPrincipal): ResponseEntity<ApiResponse<DoctorReviewDto>>` |
| `DoctorReviewService` | Application Service | Xác thực ca khám hoàn tất, lưu đánh giá và tính toán lại điểm rating trung bình cùng `review_count` của bác sĩ. | `+ createReview(UUID, DoctorReviewRequest): DoctorReviewDto`<br/>`- recalculateDoctorStats(UUID): void` |

##### 3.17.2. Sequence Diagram: Verified Consultation Review & Credibility Damper Update
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (AppointmentHistory)
    participant Ctrl as DoctorReviewController
    participant Svc as DoctorReviewService
    participant DB as PostgreSQL (appointments, doctor_reviews, doctor_profiles)

    Patient->>UI: Đánh giá 5 sao: "Bác sĩ tư vấn rất tận tình, chẩn đoán chính xác", bấm "Gửi nhận xét"
    UI->>Ctrl: POST /api/v1/doctor-reviews (DoctorReviewRequest)
    Ctrl->>Svc: createReview(patientUserId, request)
    Svc->>DB: findById(request.getAppointmentId())
    DB-->>Svc: Appointment (status='COMPLETED', patient_id=patientUserId, doctor_id=docId)
    Svc->>DB: existsByAppointmentId(appointmentId)
    DB-->>Svc: false (Chưa từng đánh giá)
    Svc->>DB: INSERT INTO doctor_reviews (appointment_id, doctor_id, patient_id, rating=5, comment='...', tags='Tận tâm')
    Svc->>DB: UPDATE doctor_profiles SET review_count = review_count + 1, rating = (SELECT AVG(rating) FROM doctor_reviews WHERE doctor_id=docId) WHERE user_id = docId
    DB-->>Svc: Cập nhật thành công
    Svc-->>Ctrl: DoctorReviewDto
    Ctrl-->>UI: 201 Created + DoctorReviewDto
    UI-->>Patient: Hiển thị thông báo Toast "Cảm ơn quý khách đã gửi đánh giá!"
```

###### Table 3.17.2: Step-by-Step Flow Specification (Doctor Review Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Nhập số sao và nhận xét | 5 sao, lời bình luận | Mở modal đánh giá từ lịch sử khám. |
| **2** | React SPA | `DoctorReviewController` | `POST /api/v1/doctor-reviews` | `DoctorReviewRequest` | Gửi dữ liệu đánh giá kèm JWT Bearer. |
| **3** | Controller | `DoctorReviewService` | `createReview()` | `patientUserId, request` | Bắt đầu quy trình kiểm tra tính hợp lệ của đánh giá. |
| **4** | Service | `AppointmentRepository` | `findById()` | `appointmentId` | `SELECT * FROM appointments WHERE id = ?`. |
| **5** | Service | `DoctorReviewRepository` | `existsByAppointmentId()` | `appointmentId` | `SELECT EXISTS(SELECT 1 FROM doctor_reviews WHERE appointment_id = ?)`. |
| **6** | Service | `DoctorReviewRepository` | `save(review)` | `DoctorReview` | `INSERT INTO doctor_reviews (rating=5, comment=..., ...)`. |
| **7** | Service | `DoctorProfileRepository`| Tính lại điểm trung bình | `doctorUserId` | `UPDATE doctor_profiles SET rating = AVG(rating), review_count = review_count + 1`. |
| **8-9** | Controller | Bệnh nhân | `201 Created` | `DoctorReviewDto` | Cập nhật giao diện và đóng modal đánh giá. |

##### 3.17.3. Sequence Diagram: Uncompleted Appointment Review Attempt Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as DoctorReviewController
    participant Svc as DoctorReviewService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Cố tình gửi đánh giá cho ca khám bị hủy (CANCELLED)
    UI->>Ctrl: POST /api/v1/doctor-reviews (appointmentId)
    Ctrl->>Svc: createReview(patientUserId, request)
    Svc->>DB: findById(appointmentId)
    DB-->>Svc: Appointment (status='CANCELLED')
    Note over Svc: appointment.getStatus() != AppointmentStatus.COMPLETED
    Svc-->>Ctrl: throw AppException(REVIEW_ONLY_ALLOWED_FOR_COMPLETED_APPOINTMENT)
    Ctrl-->>UI: 400 Bad Request (ErrorCode: "APPOINTMENT_NOT_COMPLETED")
    UI-->>Patient: Hiển thị cảnh báo: "Chỉ có thể đánh giá ca khám đã hoàn thành."
```

###### Table 3.17.3: Error Handling & Exception Matrix (Doctor Review)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Ca khám chưa hoàn tất** | `appointment.status != COMPLETED` | `400 Bad Request` | `APPOINTMENT_NOT_COMPLETED` | "Chỉ có thể đánh giá sau khi ca khám đã hoàn thành." |
| **Đánh giá trùng lặp** | `existsByAppointmentId() == true` | `409 Conflict` | `REVIEW_ALREADY_EXISTS` | "Bạn đã gửi đánh giá cho ca khám này rồi." |

---

#### 3.18 Medical Document Upload & Private Supabase S3 Storage

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân (Authenticated Patient).
* **Mục tiêu:** Cho phép người bệnh tải lên các tệp tin kết quả xét nghiệm, đơn thuốc cũ, phiếu chụp X-quang/CT (định dạng PDF hoặc hình ảnh JPEG/PNG).
* **Kiến trúc lưu trữ an toàn (Flyway V20):**
  - Giới hạn tối đa **5 tệp/lần tải**, dung lượng tối đa **10MB/tệp**, tổng dung lượng cả lô không quá **25MB**.
  - Triệt tiêu hoàn toàn URL công khai. Cơ sở dữ liệu chỉ lưu trữ khóa nội bộ `storage_path` (ví dụ: `patients/{patientId}/docs/{uuid}.pdf`).
  - Mọi thao tác tải tệp về xem bắt buộc phải đi qua URL ký số HMAC-SHA256 ngắn hạn **15 phút**.

##### 3.18.1. Class Diagram
```mermaid
classDiagram
    class MedicalDocumentController {
        -MedicalDocumentAnalysisService analysisService
        -MedicalDocumentRepository medicalDocumentRepository
        -UserRepository userRepository
        -SecurityRateLimiterService rateLimiterService
        +analyzeDocument(MultipartFile file, List~MultipartFile~ files, Authentication auth) ResponseEntity~ApiResponse~DocumentAnalysisResponse~~
    }
    class MedicalDocumentAnalysisService {
        -StorageService storageService
        -MedicalDocumentRepository documentRepo
        +analyzeDocuments(List~MultipartFile~ files, String userEmail) DocumentAnalysisResponse
    }
    class StorageService {
        +store(MultipartFile file, String path) String
        +load(String path) Resource
    }

    MedicalDocumentController --> MedicalDocumentAnalysisService
    MedicalDocumentAnalysisService --> StorageService
```

###### Table 3.18.1: Document Upload Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `MedicalDocumentController` | Presentation (REST) | Cung cấp endpoint `POST /api/v1/documents/analyze`, xác thực định dạng MIME và kiểm tra giới hạn tải tệp. | `+ analyzeDocument(MultipartFile, List<MultipartFile>, Authentication): ResponseEntity<ApiResponse<DocumentAnalysisResponse>>` |
| `MedicalDocumentAnalysisService` | Application Service | Lưu trữ tệp vào Supabase S3 Private Bucket, tạo bản ghi siêu dữ liệu trong bảng `medical_documents` và kích hoạt OCR. | `+ analyzeDocuments(List<MultipartFile>, String): DocumentAnalysisResponse` |
| `StorageService` | Infrastructure Layer | Giao tiếp với Supabase S3 SDK, tạo đường dẫn nội bộ riêng tư và đẩy dữ liệu nhị phân. | `+ store(MultipartFile file, String path): String` |

##### 3.18.2. Sequence Diagram: Multipart Upload & Private Storage Key Persistence
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (DocumentSummarizerPage)
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentAnalysisService
    participant S3 as Supabase S3 Private Storage
    participant DB as PostgreSQL (medical_documents)

    Patient->>UI: Kéo thả tệp tin phiếu xét nghiệm máu (xet_nghiem.pdf, 4.2 MB), nhấn "Phân tích hồ sơ"
    UI->>Ctrl: POST /api/v1/documents/analyze (Multipart: files)
    Ctrl->>Ctrl: validateBatchConstraints(): Số tệp <= 5, tệp <= 10MB, tổng <= 25MB (Hợp lệ)
    Ctrl->>Svc: analyzeDocuments(files, userEmail)
    Svc->>Svc: Sinh khóa lưu trữ: storagePath = "patients/" + userId + "/docs/" + UUID.randomUUID() + ".pdf"
    Svc->>S3: putObject(Bucket="medical-documents", Key=storagePath, Bytes=fileBytes, ContentType="application/pdf")
    S3-->>Svc: Upload thành công vào Private Bucket
    Svc->>DB: INSERT INTO medical_documents (user_id, file_name='xet_nghiem.pdf', file_size_bytes=4404019, content_type='application/pdf', storage_path=storagePath, status='PROCESSED')
    DB-->>Svc: MedicalDocument Entity Saved
    Svc-->>Ctrl: DocumentAnalysisResponse
    Ctrl-->>UI: 200 OK + DocumentAnalysisResponse
    UI-->>Patient: Hiển thị tài liệu trong danh sách và mở kết quả phân tích
```

###### Table 3.18.2: Step-by-Step Flow Specification (Document Upload)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Chọn tệp tải lên | PDF / JPEG / PNG | Kiểm tra dung lượng tại Client trước khi gửi. |
| **2** | React SPA | `MedicalDocumentController` | `POST /api/v1/documents/analyze` | `MultipartFile` | Gửi dữ liệu nhị phân kèm Bearer Token. |
| **3** | Controller | Nội bộ | `validateBatchConstraints()` | `resolvedFiles` | Thẩm định số lượng tệp $\le 5$ và dung lượng $\le 10\text{MB}$. |
| **4** | Controller | `MedicalDocumentAnalysisService` | `analyzeDocuments()` | `files, userEmail` | Khởi động quy trình lưu trữ và bóc tách. |
| **5** | Service | Nội bộ | Tạo đường dẫn riêng tư | `userId, UUID` | `storagePath = "patients/{userId}/docs/{uuid}.ext"`. |
| **6-7** | Service | Supabase S3 Client | `putObject()` | `storagePath, bytes` | Lưu dữ liệu vào Private S3 Bucket với mã hóa AES-256. |
| **8** | Service | `MedicalDocumentRepository` | `save(doc)` | `MedicalDocument` | `INSERT INTO medical_documents (storage_path=..., status='PROCESSED')`. |
| **9-10**| Controller | Bệnh nhân | `200 OK` | `DocumentAnalysisResponse` | Trả về kết quả phân tích cho người dùng. |

##### 3.18.3. Sequence Diagram: File Size Quota Exceeded / Unsupported MIME Type Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as MedicalDocumentController

    Patient->>UI: Tải lên tệp vượt quá 10MB (ví dụ: video.mp4, 45MB)
    UI->>Ctrl: POST /api/v1/documents/analyze (file: 45MB)
    Note over Ctrl: validateBatchConstraints(): f.getSize() > 10 * 1024 * 1024 Bytes
    Ctrl-->>UI: 400 Bad Request (ErrorCode: "FILE_TOO_LARGE", Message: "Tệp tin có dung lượng vượt quá giới hạn an toàn 10MB.")
    UI-->>Patient: Hiển thị thông báo lỗi cảnh báo màu đỏ
```

###### Table 3.18.3: Error Handling & Exception Matrix (Document Upload)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Tệp quá 10MB** | `file.getSize() > 10MB` | `400 Bad Request` | `FILE_TOO_LARGE` | "Tệp tin vượt quá dung lượng tối đa 10MB." |
| **Quá 5 tệp trong 1 lần tải** | `files.size() > 5` | `400 Bad Request` | `TOO_MANY_FILES` | "Hệ thống chỉ hỗ trợ tải lên tối đa 5 tệp trong một lần phân tích." |
| **Tổng dung lượng > 25MB** | `totalSize > 25MB` | `400 Bad Request` | `TOTAL_SIZE_TOO_LARGE` | "Tổng dung lượng các tệp tải lên vượt quá giới hạn an toàn 25MB." |
| **Định dạng không hỗ trợ** | Không phải PDF, JPEG, PNG | `415 Unsupported Media` | `UNSUPPORTED_MEDIA_TYPE` | "Chỉ chấp nhận tệp định dạng PDF, PNG hoặc JPEG." |

---

#### 3.19 Document AI OCR & Clinical Summarization

##### Context & Design Scope
* **Tác nhân:** Bệnh nhân hoặc Bác sĩ điều trị.
* **Mục tiêu:** Tự động giải nghĩa kết quả cận lâm sàng từ ảnh chụp phiếu xét nghiệm hoặc tệp PDF, trích xuất các chỉ số xét nghiệm (Đường huyết, Men gan, Mỡ máu) và đối soát với ngưỡng tham chiếu chuẩn Bộ Y Tế.
* **Quy trình xử lý AI đa phương thức (Multimodal OCR Pipeline):**
  1. Trích xuất hình ảnh hoặc văn bản từ tệp tin qua Apache Tika / PdfExtractionService.
  2. Kích hoạt lớp che mờ thông tin cá nhân (`MedicalPiiService`) theo Nghị định 13/2023/NĐ-CP và HIPAA.
  3. Gửi payload ảnh đã khử định danh tới mô hình Google Gemini 1.5 Flash Vision.
  4. Chuẩn hóa chỉ số bất thường theo mã danh mục quốc tế **LOINC** (Logical Observation Identifiers Names and Codes).
  5. Đóng gói kết quả gồm: Bản tóm tắt chuyên môn lâm sàng cho bác sĩ, Bản giải nghĩa bằng ngôn ngữ phổ thông cho bệnh nhân, và Gợi ý câu hỏi khi gặp bác sĩ.

##### 3.19.1. Class Diagram
```mermaid
classDiagram
    class MedicalDocumentController {
        -MedicalDocumentAnalysisService analysisService
        +getDocumentAnalysis(UUID id, Authentication auth) ResponseEntity~ApiResponse~DocumentAnalysisResponse~~
    }
    class MedicalDocumentAnalysisService {
        -MedicalPiiService piiService
        -GeminiVisionClient geminiClient
        -ClinicalOntologyService ontologyService
        -DocumentAnalysisRepository analysisRepo
        +processDocumentOcr(UUID documentId) DocumentAnalysisResponse
    }
    class MedicalPiiService {
        +maskPii(String rawText) DeidentificationResult
    }
    class DocumentAnalysisResponse {
        -UUID documentId
        -String clinicalSummary
        -String plainLanguageExplanation
        -List~AbnormalIndicatorDto~ abnormalIndicators
        -String recommendedSpecialtyName
        -List~String~ suggestedQuestions
    }

    MedicalDocumentController --> MedicalDocumentAnalysisService
    MedicalDocumentAnalysisService --> MedicalPiiService
    MedicalDocumentAnalysisService --> DocumentAnalysisResponse
```

###### Table 3.19.1: Document OCR Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `MedicalDocumentAnalysisService` | Application Service | Điều phối quy trình OCR, khử định danh PII, gọi Gemini Flash và chuẩn hóa danh mục LOINC. | `+ processDocumentOcr(UUID): DocumentAnalysisResponse` |
| `MedicalPiiService` | Privacy Domain Service | Che giấu thông tin định danh cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP. | `+ maskPii(String): DeidentificationResult` |
| `DocumentAnalysisResponse` | DTO | Cấu trúc dữ liệu kết quả bóc tách chỉ số cận lâm sàng trả về cho người dùng. | `- clinicalSummary: String`<br/>`- abnormalIndicators: List<AbnormalIndicatorDto>`<br/>`- recommendedSpecialtyName: String` |

##### 3.19.2. Sequence Diagram: Gemini 1.5 Flash Extraction, PII Masking & LOINC Mapping
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (DocumentSummarizerPage)
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentAnalysisService
    participant PII as MedicalPiiService (Decree 13 Shield)
    participant AI as Google Gemini 1.5 Flash Vision
    participant Ontology as ClinicalOntologyService (LOINC)
    participant DB as PostgreSQL (document_analyses)

    Patient->>UI: Bấm "Xem kết quả giải nghĩa xét nghiệm"
    UI->>Ctrl: GET /api/v1/documents/{id}/analysis
    Ctrl->>Svc: processDocumentOcr(id)
    Svc->>PII: maskPii(rawExtractedText) -> Loại bỏ Họ tên, CCCD, BHYT, Địa chỉ
    PII-->>Svc: SanitizedPayload (Dữ liệu y tế an toàn không chứa PII)
    Svc->>AI: analyzeLaboratoryDocument(SanitizedPayload)
    AI-->>Svc: Raw OCR JSON (Chỉ số Glucose: 8.2 mmol/L, Cholesterol: 6.5 mmol/L)
    loop Chuẩn hóa từng chỉ số với Bản thể luận Bộ Y Tế
        Svc->>Ontology: matchLoincIndicator("Glucose", "8.2")
        Ontology-->>Svc: LabIndicatorDto(loincCode="1558-6", standardName="Đường huyết lúc đói", status="HIGH", normalRange="3.9 - 6.4 mmol/L")
    end
    Svc->>DB: INSERT INTO document_analyses (document_id, clinical_summary=..., plain_language_explanation='Chỉ số đường huyết của bạn đang ở mức cao...', abnormal_indicators_json='[...]', recommended_specialty_slug='noi-tiet', recommended_specialty_name='Chuyên khoa Nội tiết')
    DB-->>Svc: Analysis Entity Saved
    Svc-->>Ctrl: DocumentAnalysisResponse
    Ctrl-->>UI: 200 OK + DocumentAnalysisResponse
    UI-->>Patient: Hiển thị bảng chỉ số cận lâm sàng nổi bật màu đỏ: "Đường huyết cao", Lời khuyên dinh dưỡng và Nút đặt lịch Chuyên khoa Nội tiết
```

###### Table 3.19.2: Step-by-Step Flow Specification (OCR & LOINC Analysis)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bệnh nhân | React SPA | Xem kết quả giải nghĩa | `documentId` | Nhấn xem chi tiết từ danh sách hồ sơ. |
| **2** | React SPA | `MedicalDocumentController` | `GET /api/v1/documents/{id}/analysis` | `id` | Gửi yêu cầu qua REST API kèm Bearer Token. |
| **3** | Controller | `MedicalDocumentAnalysisService` | `processDocumentOcr()` | `id` | Khởi động quy trình phân tích AI. |
| **4-5** | Service | `MedicalPiiService` | `maskPii()` | `rawText` | Khử định danh PII theo Nghị định 13/2023/NĐ-CP. |
| **6-7** | Service | Google Gemini 1.5 Flash | `analyzeLaboratoryDocument()` | `SanitizedPayload` | Gọi mô hình thị giác máy tính bóc tách chỉ số y khoa. |
| **8-9** | Service | `ClinicalOntologyService` | `matchLoincIndicator()` | `name, value` | Đối soát với danh mục LOINC và ngưỡng tham chiếu Bộ Y Tế (QĐ 3280). |
| **10** | Service | `DocumentAnalysisRepository`| `save(analysis)` | `DocumentAnalysis` | `INSERT INTO document_analyses (...)`. |
| **11-13**| Controller | Bệnh nhân | `200 OK` | `DocumentAnalysisResponse` | Hiển thị bảng chỉ số trực quan và giải thích dễ hiểu. |

##### 3.19.3. Sequence Diagram: Blurry Image / Corrupted File Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentAnalysisService
    participant AI as Google Gemini 1.5 Flash

    Patient->>UI: Tải lên ảnh chụp quá mờ, lóa đèn flash không đọc được chữ
    UI->>Ctrl: GET /api/v1/documents/{id}/analysis
    Ctrl->>Svc: processDocumentOcr(id)
    Svc->>AI: analyzeLaboratoryDocument(...)
    AI-->>Svc: OCR Result (Confidence < 0.2, Text unreadable)
    Svc-->>Ctrl: throw AppException(OCR_IMAGE_TOO_BLURRY, "Hình ảnh quá mờ hoặc bị lóa sáng. Quý khách vui lòng chụp lại rõ nét hơn.")
    Ctrl-->>UI: 422 Unprocessable Entity (ErrorCode: "IMAGE_TOO_BLURRY")
    UI-->>Patient: Hiển thị thông báo hướng dẫn chụp lại góc sáng rõ ràng
```

###### Table 3.19.3: Error Handling & Exception Matrix (Document OCR)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Ảnh chụp quá mờ / không đọc được** | AI Confidence Score < 0.2 | `422 Unprocessable Entity` | `IMAGE_TOO_BLURRY` | "Hình ảnh quá mờ hoặc bị lóa sáng. Vui lòng chụp lại rõ nét hơn." |
| **Hết hạn ngạch phân tích (Quota)** | Người dùng vượt quá lượt quét miễn phí | `403 Forbidden` | `QUOTA_EXCEEDED` | "Bạn đã sử dụng hết lượt phân tích hồ sơ miễn phí. Vui lòng nâng cấp gói." |

---

#### 3.20 Broken Object Level Authorization (BOLA/IDOR) Defense

##### Context & Design Scope
* **Tác nhân:** Kẻ tấn công hoặc Bác sĩ cố tình truy cập hồ sơ bệnh nhân khác bằng cách thay đổi ID trên URL (Insecure Direct Object References - IDOR).
* **Mục tiêu:** Bảo vệ quyền riêng tư hồ sơ y tế tuyệt đối theo Nghị định 13/2023/NĐ-CP và tiêu chuẩn bảo mật HIPAA Security Rule.
* **Cơ chế phòng thủ `PatientAccessGuard`:**
  - Bệnh nhân chỉ được phép xem tài liệu của chính mình (`actorUserId.equals(ownerPatientId)`).
  - Bác sĩ chỉ được phép xem tài liệu của bệnh nhân nếu có **quan hệ khám chữa bệnh hợp lệ (`CARE_RELATIONSHIP`)**: Tồn tại lịch hẹn ở trạng thái `SCHEDULED`, `IN_PROGRESS`, hoặc `COMPLETED`.
  - Mọi lượt truy cập thành công đều được ghi nhận vào nhật ký kiểm toán với hành động `VIEW_PATIENT_RECORD`.
  - Khi được phép, hệ thống cấp phát **URL ký số HMAC-SHA256 với thời hạn giới hạn nghiêm ngặt 15 phút**, triệt tiêu nguy cơ chia sẻ liên kết bừa bãi.

##### 3.20.1. Class Diagram
```mermaid
classDiagram
    class PatientAccessGuard {
        -AppointmentRepository appointmentRepository
        -AuditLogRepository auditLogRepository
        +assertCanAccessPatient(UUID actorUserId, Role role, UUID patientId, String resource) void
        -recordView(UUID actorUserId, Role role, UUID patientId, String resource) void
    }
    class MedicalDocumentController {
        -MedicalDocumentFileAccessService fileAccessService
        -PatientAccessGuard patientAccessGuard
        +getSignedFileUrl(UUID id, boolean download, Authentication auth) ResponseEntity~ApiResponse~DocumentFileAccessDto~~
    }
    class MedicalDocumentFileAccessService {
        -MedicalDocumentRepository docRepo
        -PatientAccessGuard accessGuard
        -SupabaseStorageService storageService
        +issueAccess(User actor, UUID documentId, boolean download) DocumentFileAccessDto
    }

    MedicalDocumentController --> MedicalDocumentFileAccessService
    MedicalDocumentFileAccessService --> PatientAccessGuard
```

###### Table 3.20.1: BOLA Defense Class Specification
| Component Name | Architectural Layer | Responsibilities | Key Attributes & Method Signatures |
| :--- | :--- | :--- | :--- |
| `PatientAccessGuard` | Security Guard Component | Kiểm tra phân quyền đối tượng mức sâu: Xác thực quan hệ khám chữa bệnh của bác sĩ và ghi vết kiểm toán. | `+ assertCanAccessPatient(UUID, Role, UUID, String): void`<br/>`- recordView(UUID, Role, UUID, String): void` |
| `MedicalDocumentFileAccessService` | Application Service | Thẩm định quyền sở hữu tài liệu và sinh URL ký số HMAC-SHA256 có hạn sử dụng 15 phút. | `+ issueAccess(User actor, UUID documentId, boolean download): DocumentFileAccessDto` |

##### 3.20.2. Sequence Diagram: Validated Care Relationship & 15-Min HMAC URL Generation
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ điều trị
    participant UI as React 18 SPA (DoctorWorkstation)
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentFileAccessService
    participant Guard as PatientAccessGuard
    participant DB as PostgreSQL (appointments, audit_logs)
    participant S3 as Supabase S3 Storage

    Doctor->>UI: Bấm vào tệp xét nghiệm của bệnh nhân trong ca khám đang diễn ra
    UI->>Ctrl: GET /api/v1/documents/{id}/signed-url
    Ctrl->>Svc: issueAccess(doctorUser, id, download=false)
    Svc->>DB: findDocumentById(id)
    DB-->>Svc: MedicalDocument (owner_id = patientId, storage_path="patients/.../doc.pdf")
    Svc->>Guard: assertCanAccessPatient(doctorId, Role.DOCTOR, patientId, "medical_documents/" + id)
    Guard->>DB: existsByDoctorIdAndPatientIdAndStatusIn(doctorId, patientId, ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
    DB-->>Guard: true (Tồn tại ca khám hợp lệ!)
    Guard->>DB: INSERT INTO audit_logs (action='VIEW_PATIENT_RECORD', actor=doctorId, resource='medical_documents/'+id, ip_address=ip)
    Guard-->>Svc: Phân quyền Hợp lệ
    Svc->>S3: generatePresignedUrl(storagePath, Duration.ofMinutes(15))
    S3-->>Svc: Presigned URL: "https://supabase.co/storage/v1/object/sign/medical-documents/...&token=HMAC_SHA256"
    Svc-->>Ctrl: DocumentFileAccessDto(signedUrl, expiresInSeconds=900)
    Ctrl-->>UI: 200 OK + DocumentFileAccessDto
    UI-->>Doctor: Tự động mở xem tệp PDF an toàn trong tab trình duyệt
```

###### Table 3.20.2: Step-by-Step Flow Specification (BOLA Defense Success)
| Step (#) | Source | Target | Message / Method Call | Parameters / Payload | Database & System Action |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Bác sĩ | React SPA | Nhấn xem tệp xét nghiệm | `documentId` | Kích hoạt từ Bàn làm việc bác sĩ. |
| **2** | React SPA | `MedicalDocumentController` | `GET /api/v1/documents/{id}/signed-url` | `id` | Gửi yêu cầu xin cấp URL ký số tạm thời. |
| **3** | Controller | `MedicalDocumentFileAccessService` | `issueAccess()` | `doctorUser, id, download` | Bắt đầu quy trình kiểm tra quyền truy cập tệp. |
| **4** | Service | `MedicalDocumentRepository` | `findById()` | `id` | Lấy siêu dữ liệu tài liệu và xác định chủ sở hữu `patientId`. |
| **5-7** | Service | `PatientAccessGuard` | `assertCanAccessPatient()` | `doctorId, Role.DOCTOR, patientId` | `SELECT EXISTS(SELECT 1 FROM appointments WHERE doctor_id=? AND patient_id=? AND status IN (...))`. |
| **8** | Guard | `AuditLogRepository` | `save(auditLog)` | `AuditLog` | `INSERT INTO audit_logs (action='VIEW_PATIENT_RECORD', ...)`. Tuân thủ HIPAA. |
| **9-10**| Service | Supabase S3 Client | Sinh URL ký số HMAC | `storagePath, 15m` | Ký chuỗi URL với Access Secret Key, hạn sử dụng chính xác 900 giây. |
| **11-13**| Controller | Bác sĩ | `200 OK` | `DocumentFileAccessDto` | Trình duyệt mở xem tệp an toàn qua URL ký số. |

##### 3.20.3. Sequence Diagram: IDOR Breach Attempt Detection, Rejection & Audit Logging
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ tấn công / Bác sĩ không phụ trách
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentFileAccessService
    participant Guard as PatientAccessGuard
    participant DB as PostgreSQL (appointments, audit_logs)

    Attacker->>Ctrl: GET /api/v1/documents/{victimDocId}/signed-url (Cố tình dò quét ID tài liệu của người khác)
    Ctrl->>Svc: issueAccess(attackerUser, victimDocId, ...)
    Svc->>DB: findDocumentById(victimDocId)
    DB-->>Svc: MedicalDocument (owner_id = victimPatientId)
    Svc->>Guard: assertCanAccessPatient(attackerId, Role.DOCTOR, victimPatientId, ...)
    Guard->>DB: existsByDoctorIdAndPatientIdAndStatusIn(attackerId, victimPatientId, ...)
    DB-->>Guard: false (Hoàn toàn không có quan hệ khám chữa bệnh nào!)
    Guard->>DB: INSERT INTO audit_logs (action='BOLA_IDOR_BREACH_ATTEMPT_BLOCKED', actor=attackerId, resource=victimDocId, ip_address=ip)
    Guard-->>Svc: throw AppException(FORBIDDEN_CARE_RELATIONSHIP)
    Svc-->>Ctrl: Từ chối truy cập
    Ctrl-->>Attacker: 403 Forbidden (ErrorCode: "FORBIDDEN_CARE_RELATIONSHIP", Message: "Bác sĩ chỉ có quyền truy cập hồ sơ của bệnh nhân có lịch khám hợp lệ.")
```

###### Table 3.20.3: Error Handling & Exception Matrix (BOLA Defense)
| Error Scenario | Trigger Condition | HTTP Status | ErrorCode | User Message & System Defense Action |
| :--- | :--- | :---: | :---: | :--- |
| **Vi phạm BOLA/IDOR** | Bác sĩ truy cập hồ sơ bệnh nhân không có ca khám hợp lệ | `403 Forbidden` | `FORBIDDEN_CARE_RELATIONSHIP` | "Bác sĩ chỉ có quyền truy cập hồ sơ của bệnh nhân có lịch hẹn hợp lệ." Ghi log kiểm toán an ninh khẩn cấp. |
| **Bệnh nhân truy cập tệp người khác** | `actorUserId != ownerPatientId` | `403 Forbidden` | `FORBIDDEN` | "Bạn không có quyền xem hoặc tải tài liệu này." |
| **Tài liệu không tồn tại** | `docRepo.findById() == Optional.empty()` | `404 Not Found` | `DOCUMENT_NOT_FOUND` | "Không tìm thấy hồ sơ y tế yêu cầu." |
'''
