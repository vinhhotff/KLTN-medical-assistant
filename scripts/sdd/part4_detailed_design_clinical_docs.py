"""
Part 4 of SDD Generator: Section 3 Detailed Design (Features 3.11 to 3.20 - Appointments, EMR, Workstation, Reviews, Document Storage, OCR, BOLA Defense).
"""

def get_part4_content():
    return '''#### 3.11 Telehealth Appointment Booking & Slot Concurrency Locking

##### 3.11.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +bookAppointment(CreateAppointmentRequest request, UserPrincipal principal) ResponseEntity~AppointmentDto~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        -UserRepository userRepo
        -DoctorProfileRepository doctorRepo
        -RedisTemplate redisTemplate
        +createAppointment(UUID patientId, CreateAppointmentRequest request) AppointmentDto
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
        -Long version
    }
    class CreateAppointmentRequest {
        -UUID doctorId
        -LocalDateTime scheduledStart
        -LocalDateTime scheduledEnd
        -String chiefComplaint
    }

    AppointmentController --> AppointmentService
    AppointmentService --> Appointment
    AppointmentController ..> CreateAppointmentRequest
```

##### 3.11.2. Sequence Diagram: Successful Booking & Daily Queue Number Allocation (`STT xx`)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (DoctorSearch / BookingModal)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant Redis as Redis (Slot Lock Semaphore)
    participant DB as PostgreSQL (appointments)
    participant Mail as EmailService (@Async)

    Patient->>UI: Chọn Bác sĩ, Ngày khám 19/10/2026, Khung giờ 09:00 - 09:30
    UI->>Ctrl: POST /api/v1/appointments (CreateAppointmentRequest)
    Ctrl->>Svc: createAppointment(patientId, request)
    Svc->>Svc: validateOperatingHours(): Giờ làm việc 08:00-12:00, 13:30-17:00, Thứ 2 - Thứ 7 (Hợp lệ)
    Svc->>Redis: SET lock:slot:docId:202610190900 NX EX 10 (Khóa phân tán 10s)
    Redis-->>Svc: OK (Giữ khóa thành công)
    Svc->>DB: existsConflictSlot(doctorId, start, end, ACTIVE_STATUSES)
    DB-->>Svc: false (Chưa có ai đặt)
    Svc->>DB: countTodayAppointments(doctorId, 2026-10-19)
    DB-->>Svc: 3 ca khám đã đặt
    Svc->>Svc: queueNumber = String.format("STT %02d", 3 + 1) -> "STT 04"
    Svc->>DB: INSERT INTO appointments (code='APT-...', status='SCHEDULED', queue_number='STT 04', payment_status='UNPAID')
    DB-->>Svc: Appointment Entity Created
    Svc->>Redis: DEL lock:slot:docId:202610190900 (Giải phóng khóa)
    Svc->>Mail: sendAppointmentConfirmationEmail(patient, appointment)
    Svc-->>Ctrl: AppointmentDto(id, code, queueNumber='STT 04', status='SCHEDULED')
    Ctrl-->>UI: 201 Created + AppointmentDto
    UI-->>Patient: Hiển thị màn hình xác nhận đặt lịch & nút "Thanh toán viện phí VNPay"
```

##### 3.11.3. Sequence Diagram: Concurrent Booking Collision (`SLOT_CONFLICT` 409)
```mermaid
sequenceDiagram
    autonumber
    actor PatientB as Bệnh nhân B
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    PatientB->>Ctrl: POST /api/v1/appointments (Cùng khung giờ Bệnh nhân A vừa đặt)
    Ctrl->>Svc: createAppointment(patientBId, request)
    Svc->>DB: existsConflictSlot(doctorId, start, end)
    DB-->>Svc: true (Bệnh nhân A đã hoàn tất giao dịch đặt trước 100ms)
    Svc-->>Ctrl: throw AppException(SLOT_CONFLICT, "Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác.")
    Ctrl-->>PatientB: 409 Conflict (Error JSON)
```

---

#### 3.12 Appointment Rescheduling & Operating Hours Validation

##### 3.12.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +rescheduleAppointment(UUID id, RescheduleRequest request) ResponseEntity~AppointmentDto~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        +rescheduleAppointment(UUID id, LocalDateTime newStart, LocalDateTime newEnd) AppointmentDto
    }

    AppointmentController --> AppointmentService
```

##### 3.12.2. Sequence Diagram: Valid Rescheduling & Schedule Slot Reassignment
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Yêu cầu đổi lịch sang ngày mai 14:00 - 14:30
    UI->>Ctrl: PUT /api/v1/appointments/{id}/reschedule (newStart, newEnd)
    Ctrl->>Svc: rescheduleAppointment(id, newStart, newEnd)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment Entity (status=SCHEDULED)
    Svc->>Svc: Kiểm tra khung giờ mới trong giờ hành chính y tế
    Svc->>DB: existsConflictSlot(doctorId, newStart, newEnd)
    DB-->>Svc: false (Trống lịch)
    Svc->>DB: UPDATE appointments SET scheduled_start=newStart, scheduled_end=newEnd, updated_at=NOW
    Svc-->>Ctrl: AppointmentDto mới
    Ctrl-->>UI: 200 OK
    UI-->>Patient: Cập nhật lịch mới trên giao diện
```

##### 3.12.3. Sequence Diagram: Invalid Rescheduling (Sunday Operating Hours Lockout)
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService

    Patient->>UI: Chọn dời lịch sang ngày Chủ Nhật (Sunday)
    UI->>Ctrl: PUT /api/v1/appointments/{id}/reschedule
    Ctrl->>Svc: rescheduleAppointment(id, sundayStart, sundayEnd)
    Svc->>Svc: validateOperatingHours(newStart): newStart.getDayOfWeek() == SUNDAY
    Svc-->>Ctrl: throw AppException(SUNDAY_BOOKING_NOT_SUPPORTED, "Phòng khám không tiếp nhận ca hẹn vào ngày Chủ Nhật.")
    Ctrl-->>UI: 400 Bad Request
    UI-->>Patient: Hiển thị cảnh báo lỗi vi phạm giờ làm việc
```

---

#### 3.13 Appointment Cancellation & Tiered Automated Refund Calculation

##### 3.13.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +cancelAppointment(UUID id, CancelRequest request, UserPrincipal principal) ResponseEntity~AppointmentDto~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        -AppointmentRefundService refundService
        +cancelAppointment(UUID id, String reason, Role actorRole) AppointmentDto
    }
    class AppointmentRefundService {
        -PaymentService paymentService
        +calculateRefundAmount(Appointment appt, Role actorRole) BigDecimal
        +processRefund(Appointment appt, BigDecimal amount) void
    }

    AppointmentController --> AppointmentService
    AppointmentService --> AppointmentRefundService
```

##### 3.13.2. Sequence Diagram: Patient Cancellation & 100%/80% Automated Policy Refund
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant RefundSvc as AppointmentRefundService
    participant PaymentSvc as PaymentService (VNPay Refund)
    participant DB as PostgreSQL (appointments, payment_transactions)

    Patient->>UI: Bấm Hủy lịch hẹn (trước giờ khám 26 tiếng)
    UI->>Ctrl: POST /api/v1/appointments/{id}/cancel (reason: "Bận đột xuất")
    Ctrl->>Svc: cancelAppointment(id, reason, Role.PATIENT)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (fee=500.000 VND, payment_status=PAID)
    Svc->>RefundSvc: calculateRefundAmount(appt, Role.PATIENT)
    Note over RefundSvc: Khoảng cách = 26 giờ (>= 24 giờ): Hoàn 100% = 500.000 VND<br/>(Nếu từ 2h - 24h: Hoàn 80% = 400.000 VND)
    RefundSvc-->>Svc: refundAmount = 500.000 VND
    Svc->>RefundSvc: processRefund(appt, 500.000 VND)
    RefundSvc->>PaymentSvc: initiateRefund(transactionCode, 500.000 VND)
    PaymentSvc-->>RefundSvc: Refund Success (Mã giao dịch hoàn: RF-9912)
    Svc->>DB: UPDATE appointments SET status='CANCELLED', payment_status='REFUNDED'
    Svc->>DB: INSERT INTO payment_transactions (order_type='REFUND', status='COMPLETED', amount=500000)
    Svc-->>Ctrl: AppointmentDto(status='CANCELLED', refundAmount=500000)
    Ctrl-->>UI: 200 OK
    UI-->>Patient: Thông báo hủy thành công & tiền hoàn 500.000 VND đã được chuyển
```

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
    UI->>Ctrl: POST /api/v1/appointments/{id}/cancel
    Ctrl->>Svc: cancelAppointment(id, reason, Role.PATIENT)
    Svc->>RefundSvc: calculateRefundAmount(appt, Role.PATIENT)
    Note over RefundSvc: Khoảng cách < 2 giờ: Hoàn 0% theo Điều khoản dịch vụ
    RefundSvc-->>Svc: refundAmount = 0 VND
    Svc->>DB: UPDATE appointments SET status='CANCELLED' (payment_status giữ nguyên PAID)
    Svc-->>Ctrl: AppointmentDto(status='CANCELLED', refundAmount=0)
    Ctrl-->>UI: 200 OK
    UI-->>Patient: Cảnh báo: "Lịch hẹn đã hủy nhưng không được hoàn phí do hủy sát giờ (< 2h)"
```

---

#### 3.14 Patient Clinic Check-In & Queue Management

##### 3.14.1. Class Diagram
```mermaid
classDiagram
    class AppointmentController {
        -AppointmentService appointmentService
        +checkIn(UUID id, UserPrincipal principal) ResponseEntity~AppointmentDto~
    }
    class AppointmentService {
        -AppointmentRepository appointmentRepo
        +checkInAppointment(UUID id) AppointmentDto
    }

    AppointmentController --> AppointmentService
```

##### 3.14.2. Sequence Diagram: Successful Check-In & Queue Status Update
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân đến phòng khám
    participant UI as React 18 SPA (PatientPortal)
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Nhấn "Điểm danh tiếp đón" khi có mặt tại bệnh viện
    UI->>Ctrl: POST /api/v1/appointments/{id}/check-in
    Ctrl->>Svc: checkInAppointment(id)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment (status=SCHEDULED, scheduled_start=Hôm nay)
    Svc->>DB: UPDATE appointments SET checked_in_at = NOW()
    Svc-->>Ctrl: AppointmentDto(checkedInAt=NOW)
    Ctrl-->>UI: 200 OK
    UI-->>Patient: Màn hình hiển thị: "Điểm danh thành công! Quý khách có số STT 04 tại Phòng 302"
```

##### 3.14.3. Sequence Diagram: Check-In on Non-Scheduled Day Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService

    Patient->>UI: Nhấn điểm danh cho ca hẹn của tuần sau
    UI->>Ctrl: POST /api/v1/appointments/{id}/check-in
    Ctrl->>Svc: checkInAppointment(id)
    Note over Svc: appointment.getScheduledStart().toLocalDate().isEqual(today) == false
    Svc-->>Ctrl: throw AppException(CHECK_IN_NOT_ALLOWED_TODAY, "Chỉ được phép điểm danh trong ngày diễn ra ca khám.")
    Ctrl-->>UI: 400 Bad Request
    UI-->>Patient: Hiển thị thông báo chưa đến ngày khám
```

---

#### 3.15 Doctor Clinical Encounter & EMR Documentation

##### 3.15.1. Class Diagram
```mermaid
classDiagram
    class DoctorEncounterController {
        -DoctorEncounterService encounterService
        +completeEncounter(UUID appointmentId, EncounterRecordRequest request, UserPrincipal principal) ResponseEntity~AppointmentDto~
    }
    class DoctorEncounterService {
        -AppointmentRepository appointmentRepo
        -PatientAccessGuard accessGuard
        -ClinicalOntologyService ontologyService
        +completeConsultation(UUID doctorId, UUID appointmentId, EncounterRecordRequest request) AppointmentDto
    }
    class EncounterRecordRequest {
        -String vitalSignsJson
        -String icd10Code
        -String icd10Name
        -String prescriptionJson
        -String treatmentPlan
        -LocalDate followUpDate
    }

    DoctorEncounterController --> DoctorEncounterService
    DoctorEncounterService --> EncounterRecordRequest
```

##### 3.15.2. Sequence Diagram: Consultation Completion, WHO ICD-10 Coding & Rx JSON Storage
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ điều trị
    participant UI as React 18 SPA (DoctorDashboard / EncounterModal)
    participant Ctrl as DoctorEncounterController
    participant Svc as DoctorEncounterService
    participant Guard as PatientAccessGuard
    participant Ontology as ClinicalOntologyService
    participant DB as PostgreSQL (appointments)

    Doctor->>UI: Nhập sinh hiệu (BP: 120/80, HR: 75), chọn mã ICD-10 (I10 - Tăng huyết áp vô căn), kê đơn thuốc Amlodipine 5mg
    UI->>Ctrl: POST /api/v1/doctor/encounters/{id}/complete (EncounterRecordRequest)
    Ctrl->>Svc: completeConsultation(doctorId, id, request)
    Svc->>DB: findById(id)
    DB-->>Svc: Appointment Entity
    Svc->>Guard: assertCanAccessPatient(doctorId, Role.DOCTOR, appt.getPatientId(), "COMPLETE_ENCOUNTER")
    Guard-->>Svc: Hợp lệ (Quan hệ điều trị chăm sóc tồn tại)
    Svc->>Ontology: validateIcd10Code(request.getIcd10Code())
    Ontology-->>Svc: true (Mã I10 chuẩn danh mục WHO/BYT)
    Svc->>DB: UPDATE appointments SET status='COMPLETED', vital_signs_json=..., icd10_code='I10', icd10_name='Tăng huyết áp vô căn', prescription_json=..., treatment_plan=..., follow_up_date=...
    DB-->>Svc: Lưu bệnh án thành công
    Svc-->>Ctrl: AppointmentDto (Hoàn tất)
    Ctrl-->>UI: 200 OK
    UI-->>Doctor: Hiển thị thông báo "Đã hoàn thành ca khám và ban hành đơn thuốc điện tử"
```

##### 3.15.3. Sequence Diagram: Non-Attending Doctor Unauthorized Access (BOLA 403)
```mermaid
sequenceDiagram
    autonumber
    actor RogueDoctor as Bác sĩ khác (Không phụ trách ca khám)
    participant Ctrl as DoctorEncounterController
    participant Svc as DoctorEncounterService
    participant Guard as PatientAccessGuard

    RogueDoctor->>Ctrl: POST /api/v1/doctor/encounters/{otherId}/complete
    Ctrl->>Svc: completeConsultation(rogueDoctorId, otherId, request)
    Svc->>Guard: assertCanAccessPatient(rogueDoctorId, Role.DOCTOR, patientId, "COMPLETE_ENCOUNTER")
    Guard->>Guard: Kiểm tra quan hệ khám: existsByDoctorIdAndPatientId(...) == false
    Guard-->>Svc: throw AppException(FORBIDDEN_CARE_RELATIONSHIP)
    Svc-->>Ctrl: Bị từ chối
    Ctrl-->>RogueDoctor: 403 Forbidden (Bảo vệ tính riêng tư bệnh án BOLA/IDOR)
```

---

#### 3.16 Doctor Workstation Queue Supervision

##### 3.16.1. Class Diagram
```mermaid
classDiagram
    class DoctorWorkstationController {
        -DoctorWorkstationService workstationService
        +getTodayQueue(UserPrincipal principal) ResponseEntity~List~QueueItemDto~~
    }
    class DoctorWorkstationService {
        -AppointmentRepository appointmentRepo
        +getDoctorDailyQueue(UUID doctorId, LocalDate date) List~QueueItemDto~
    }

    DoctorWorkstationController --> DoctorWorkstationService
```

##### 3.16.2. Sequence Diagram: Real-Time Queue Fetching & Status Transitions
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ
    participant UI as React 18 SPA (DoctorDashboard)
    participant Ctrl as DoctorWorkstationController
    participant Svc as DoctorWorkstationService
    participant DB as PostgreSQL (appointments)

    Doctor->>UI: Mở Bàn làm việc Bác sĩ (Doctor Workstation)
    UI->>Ctrl: GET /api/v1/doctor/workstation/queue?date=2026-10-18
    Ctrl->>Svc: getDoctorDailyQueue(doctorId, date)
    Svc->>DB: findByDoctorIdAndDateOrderByQueueNumber(doctorId, date)
    DB-->>Svc: Danh sách các ca khám (STT 01: COMPLETED, STT 02: IN_PROGRESS, STT 03: CHECKED_IN)
    Svc-->>Ctrl: List QueueItemDto
    Ctrl-->>UI: 200 OK + Danh sách hàng đợi thời gian thực
    UI-->>Doctor: Hiển thị danh sách bệnh nhân chờ khám kèm chỉ số sinh hiệu và trạng thái
```

##### 3.16.3. Sequence Diagram: Unverified Doctor Profile Locked Out
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ mới đăng ký (Chưa được duyệt)
    participant UI as React 18 SPA
    participant Ctrl as DoctorWorkstationController
    participant DB as PostgreSQL (doctor_profiles)

    Doctor->>UI: Truy cập Bàn làm việc bác sĩ
    UI->>Ctrl: GET /api/v1/doctor/workstation/queue
    Ctrl->>DB: findByUserId(doctorId)
    DB-->>Ctrl: DoctorProfile (is_verified = false)
    Ctrl-->>UI: 403 Forbidden (Error: "Hồ sơ bác sĩ đang chờ Admin phê duyệt chứng chỉ hành nghề.")
    UI-->>Doctor: Khóa giao diện bàn làm việc và chuyển hướng sang trang chờ duyệt
```

---

#### 3.17 Patient Review & Doctor Rating Submission

##### 3.17.1. Class Diagram
```mermaid
classDiagram
    class DoctorReviewController {
        -DoctorReviewService reviewService
        +submitReview(CreateReviewRequest request, UserPrincipal principal) ResponseEntity~DoctorReviewDto~
    }
    class DoctorReviewService {
        -DoctorReviewRepository reviewRepo
        -AppointmentRepository appointmentRepo
        -DoctorProfileRepository doctorRepo
        +createReview(UUID patientId, CreateReviewRequest request) DoctorReviewDto
        -recalculateDoctorRating(UUID doctorProfileId) void
    }
    class CreateReviewRequest {
        -UUID appointmentId
        -int rating
        -String comment
        -String tags
    }

    DoctorReviewController --> DoctorReviewService
    DoctorReviewService --> CreateReviewRequest
```

##### 3.17.2. Sequence Diagram: Verified Consultation Review & Credibility Damper Update
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (PatientDashboard / History)
    participant Ctrl as DoctorReviewController
    participant Svc as DoctorReviewService
    participant DB as PostgreSQL (appointments, doctor_reviews, doctor_profiles)

    Patient->>UI: Đánh giá 5 sao: "Bác sĩ tư vấn rất tận tình, chẩn đoán chính xác"
    UI->>Ctrl: POST /api/v1/reviews (CreateReviewRequest)
    Ctrl->>Svc: createReview(patientId, request)
    Svc->>DB: findById(request.getAppointmentId())
    DB-->>Svc: Appointment (status=COMPLETED, patientId khớp)
    Svc->>DB: existsByAppointmentId(appointmentId)
    DB-->>Svc: false (Chưa từng đánh giá)
    Svc->>DB: INSERT INTO doctor_reviews (appointment_id, doctor_id, patient_id, rating=5, comment=...)
    Svc->>DB: UPDATE doctor_profiles SET review_count = review_count + 1, rating = (SELECT AVG(rating) FROM doctor_reviews WHERE doctor_id=...)
    DB-->>Svc: Cập nhật thành công
    Svc-->>Ctrl: DoctorReviewDto
    Ctrl-->>UI: 201 Created
    UI-->>Patient: Thông báo: "Cảm ơn quý khách đã gửi đánh giá!"
```

##### 3.17.3. Sequence Diagram: Unattended Appointment Review Attempt Rejection
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as DoctorReviewController
    participant Svc as DoctorReviewService
    participant DB as PostgreSQL (appointments)

    Patient->>UI: Cố tình gửi đánh giá cho ca khám bị hủy (CANCELLED)
    UI->>Ctrl: POST /api/v1/reviews
    Ctrl->>Svc: createReview(patientId, request)
    Svc->>DB: findById(appointmentId)
    DB-->>Svc: Appointment (status=CANCELLED)
    Svc-->>Ctrl: throw AppException(REVIEW_ONLY_ALLOWED_FOR_COMPLETED_APPOINTMENT)
    Ctrl-->>UI: 400 Bad Request
    UI-->>Patient: Hiển thị thông báo không đủ điều kiện đánh giá
```

---

#### 3.18 Medical Document Upload & Private Supabase S3 Storage

##### 3.18.1. Class Diagram
```mermaid
classDiagram
    class MedicalDocumentController {
        -MedicalDocumentService documentService
        +uploadDocument(MultipartFile file, UserPrincipal principal) ResponseEntity~MedicalDocumentDto~
    }
    class MedicalDocumentService {
        -MedicalDocumentRepository documentRepo
        -SupabaseStorageClient storageClient
        +uploadPatientDocument(UUID patientId, MultipartFile file) MedicalDocumentDto
    }
    class SupabaseStorageClient {
        +uploadPrivateFile(String bucket, String path, byte[] bytes, String mime) String
        +generatePresignedDownloadUrl(String bucket, String path, Duration duration) URL
    }

    MedicalDocumentController --> MedicalDocumentService
    MedicalDocumentService --> SupabaseStorageClient
```

##### 3.18.2. Sequence Diagram: Multipart Upload & Private Storage Key Persistence
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA (DocumentSummarizerPage)
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentService
    participant S3 as Supabase S3 Private Storage
    participant DB as PostgreSQL (medical_documents)

    Patient->>UI: Kéo thả tệp tin PDF phiếu xét nghiệm (4.2 MB)
    UI->>Ctrl: POST /api/v1/patient/documents/upload (Multipart/form-data)
    Ctrl->>Svc: uploadPatientDocument(patientId, file)
    Svc->>Svc: Kiểm tra định dạng (PDF/JPEG/PNG) & dung lượng (<= 10MB) -> Hợp lệ
    Svc->>Svc: Tạo khóa lưu trữ nội bộ riêng tư: String storagePath = "patients/" + patientId + "/docs/" + UUID.randomUUID() + ".pdf"
    Svc->>S3: uploadPrivateFile("medical-documents", storagePath, bytes, "application/pdf")
    S3-->>Svc: Upload thành công vào Private Bucket
    Svc->>DB: INSERT INTO medical_documents (user_id, file_name, file_size_bytes, content_type, storage_path, status='PROCESSED')
    DB-->>Svc: Document Entity Created
    Svc-->>Ctrl: MedicalDocumentDto(id, fileName, storagePath)
    Ctrl-->>UI: 201 Created + MedicalDocumentDto
    UI-->>Patient: Hiển thị tệp tin trong danh sách hồ sơ cá nhân
```

##### 3.18.3. Sequence Diagram: File Size Quota Exceeded / Unsupported MIME Type
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Người dùng
    participant UI as React 18 SPA
    participant Ctrl as MedicalDocumentController
    participant Svc as MedicalDocumentService

    Patient->>UI: Tải lên tệp thực thi độc hại (file.exe) hoặc tệp quá lớn (> 10MB)
    UI->>Ctrl: POST /api/v1/patient/documents/upload
    Ctrl->>Svc: uploadPatientDocument(...)
    Note over Svc: Kiểm tra MIME Type qua Apache Tika: "application/x-msdownload" không thuộc danh sách trắng
    Svc-->>Ctrl: throw AppException(UNSUPPORTED_MEDIA_TYPE, "Chỉ chấp nhận tệp định dạng PDF, PNG hoặc JPEG.")
    Ctrl-->>UI: 415 Unsupported Media Type
    UI-->>Patient: Cảnh báo từ chối tệp không an toàn
```

---

#### 3.19 Document AI OCR & Clinical Summarization

##### 3.19.1. Class Diagram
```mermaid
classDiagram
    class DocumentAnalysisController {
        -DocumentAnalysisService analysisService
        +analyzeDocument(UUID documentId, UserPrincipal principal) ResponseEntity~DocumentAnalysisDto~
    }
    class DocumentAnalysisService {
        -MedicalDocumentRepository docRepo
        -DocumentAnalysisRepository analysisRepo
        -GeminiVisionClient geminiClient
        -PiiDeidentificationService piiService
        +processDocumentOcr(UUID patientId, UUID documentId) DocumentAnalysisDto
    }
    class GeminiVisionClient {
        +extractClinicalEntitiesFromImage(byte[] imageBytes) String
    }

    DocumentAnalysisController --> DocumentAnalysisService
    DocumentAnalysisService --> GeminiVisionClient
```

##### 3.19.2. Sequence Diagram: Gemini 1.5 Flash Extraction, PII Masking & LOINC Mapping
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as DocumentAnalysisController
    participant Svc as DocumentAnalysisService
    participant S3 as Supabase S3 Private Storage
    participant PII as PiiDeidentificationService
    participant AI as Google Gemini 1.5 Flash Vision
    participant DB as PostgreSQL (document_analyses)

    Patient->>UI: Bấm "Giải nghĩa xét nghiệm AI"
    UI->>Ctrl: POST /api/v1/patient/documents/{id}/analyze
    Ctrl->>Svc: processDocumentOcr(patientId, id)
    Svc->>S3: getObjectBytes(document.getStoragePath())
    S3-->>Svc: byte[] tệp ảnh xét nghiệm
    Svc->>PII: maskSensitivePatientData(imageBytes) -> Loại bỏ tên, địa chỉ, số CMND
    PII-->>Svc: Sanitized Payload
    Svc->>AI: analyzeLaboratoryDocument(SanitizedImageBytes)
    AI-->>Svc: JSON (clinicalSummary, plainLanguageExplanation, abnormalIndicators: [{name: 'Glucose máu', value: '8.2 mmol/L', loinc: '1558-6', status: 'HIGH'}])
    Svc->>DB: INSERT INTO document_analyses (document_id, clinical_summary, plain_language_explanation, abnormal_indicators_json, recommended_specialty_slug='noi-tiet')
    DB-->>Svc: Analysis Entity Saved
    Svc-->>Ctrl: DocumentAnalysisDto
    Ctrl-->>UI: 200 OK + DocumentAnalysisDto
    UI-->>Patient: Hiển thị bảng chỉ số xét nghiệm: Đường huyết cao (Màu Đỏ), Giải thích dễ hiểu và gợi ý khám Chuyên khoa Nội tiết
```

##### 3.19.3. Sequence Diagram: Corrupted Image / AI Inference Quota Exhaustion
```mermaid
sequenceDiagram
    autonumber
    actor Patient as Bệnh nhân
    participant UI as React 18 SPA
    participant Ctrl as DocumentAnalysisController
    participant Svc as DocumentAnalysisService
    participant AI as Google Gemini 1.5 Flash

    Patient->>UI: Gửi ảnh chụp mờ, rách nát không thể đọc chữ
    UI->>Ctrl: POST /api/v1/patient/documents/{id}/analyze
    Ctrl->>Svc: processDocumentOcr(...)
    Svc->>AI: analyzeLaboratoryDocument(...)
    AI-->>Svc: Response (Confidence < 0.2, Không nhận diện được văn bản)
    Svc-->>Ctrl: throw AppException(OCR_IMAGE_TOO_BLURRY, "Hình ảnh quá mờ hoặc bị lóa sáng. Quý khách vui lòng chụp lại rõ nét hơn.")
    Ctrl-->>UI: 422 Unprocessable Entity
    UI-->>Patient: Hướng dẫn chụp lại ảnh tài liệu y tế chuẩn
```

---

#### 3.20 Broken Object Level Authorization (BOLA/IDOR) Defense

##### 3.20.1. Class Diagram
```mermaid
classDiagram
    class PatientAccessGuard {
        -AppointmentRepository appointmentRepo
        -AuditLogService auditLogService
        +assertCanAccessPatient(UUID actorUserId, Role role, UUID patientId, String resource) void
        -recordView(UUID actorUserId, Role role, UUID patientId, String resource) void
    }
    class MedicalDocumentController {
        -MedicalDocumentService documentService
        -PatientAccessGuard accessGuard
        +downloadDocument(UUID documentId, UserPrincipal principal) ResponseEntity~DownloadUrlResponse~
    }

    MedicalDocumentController --> PatientAccessGuard
```

##### 3.20.2. Sequence Diagram: Validated Care Relationship & 15-Min HMAC URL Generation
```mermaid
sequenceDiagram
    autonumber
    actor Doctor as Bác sĩ điều trị
    participant UI as React 18 SPA (DoctorWorkstation)
    participant Ctrl as MedicalDocumentController
    participant Guard as PatientAccessGuard
    participant Svc as MedicalDocumentService
    participant S3 as Supabase S3 Storage Client
    participant DB as PostgreSQL (appointments, audit_logs)

    Doctor->>UI: Bấm xem tài liệu xét nghiệm của bệnh nhân trong ca khám
    UI->>Ctrl: GET /api/v1/documents/{documentId}/download-url
    Ctrl->>Svc: getDocumentMetadata(documentId)
    Svc-->>Ctrl: MedicalDocument (owner = patientId, storagePath="patients/.../doc.pdf")
    Ctrl->>Guard: assertCanAccessPatient(doctorId, Role.DOCTOR, patientId, "VIEW_MEDICAL_DOCUMENT")
    Guard->>DB: existsByDoctorIdAndPatientIdAndStatusIn(doctorId, patientId, ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])
    DB-->>Guard: true (Tồn tại ca khám hẹn giữa hai bên)
    Guard->>DB: INSERT INTO audit_logs (action='VIEW_PATIENT_RECORD', actor=doctorId, resource=documentId)
    Guard-->>Ctrl: Phân quyền Hợp lệ
    Ctrl->>S3: createSignedDownloadUrl(storagePath, Duration.ofMinutes(15))
    S3-->>Ctrl: Signed URL: https://supabase.co/.../doc.pdf?X-Amz-Signature=... (Hạn 15 phút)
    Ctrl-->>UI: 200 OK + { downloadUrl: "https://..." }
    UI-->>Doctor: Tự động mở xem tệp tin an toàn trong tab trình duyệt
```

##### 3.20.3. Sequence Diagram: IDOR Breach Attempt Detection, Rejection & Audit Logging
```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Kẻ tấn công / Bác sĩ không phụ trách
    participant Ctrl as MedicalDocumentController
    participant Guard as PatientAccessGuard
    participant DB as PostgreSQL (appointments, audit_logs)

    Attacker->>Ctrl: GET /api/v1/documents/{victimDocumentId}/download-url
    Ctrl->>Guard: assertCanAccessPatient(attackerId, Role.DOCTOR, victimPatientId, "VIEW_MEDICAL_DOCUMENT")
    Guard->>DB: existsByDoctorIdAndPatientIdAndStatusIn(attackerId, victimPatientId, ...)
    DB-->>Guard: false (Không có bất kỳ quan hệ khám chữa bệnh nào!)
    Guard->>DB: INSERT INTO audit_logs (action='IDOR_BREACH_ATTEMPT_BLOCKED', actor=attackerId, resource=victimDocumentId, ip=...)
    Guard-->>Ctrl: throw AppException(FORBIDDEN_CARE_RELATIONSHIP)
    Ctrl-->>Attacker: 403 Forbidden (Từ chối truy cập tuyệt đối & Kích hoạt chuông báo an ninh)
```
'''
