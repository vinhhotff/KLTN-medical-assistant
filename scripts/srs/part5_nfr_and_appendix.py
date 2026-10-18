# -*- coding: utf-8 -*-
"""
Part 5: 4. Non-Functional Requirements & 5. Requirement Appendix
4.1 External Interfaces, 4.2 Quality Attributes,
5.1 Business Rules (BR-01 to BR-34), 5.2 Acronyms, 5.3 Common Requirements,
5.4 Application Messages List, 5.5 Requirements Traceability Matrix (RTM).
Derived 100% from actual MediAssist-AI codebase (Spring Boot 3.4 + React 18).
"""

def get_content():
    return """
---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 External Interfaces

#### 4.1.1 User Interfaces
- **UI-01 Clinical Design System:** The frontend user interface shall adhere to professional healthcare design standards built on TailwindCSS:
  - Primary Clinical Blue (`#0284c7`, `#0369a1`): Used for primary navigation, clinical action buttons, and verified badges.
  - Medical White / Soft Slate (`#f8fafc`, `#ffffff`): Reduces eye strain during long clinical documentation sessions.
  - Alert Red (`#ef4444`): High-visibility warning strictly reserved for Red-Flag 115 emergency lockouts.
  - Clinical Success Green (`#10b981`): Indicates completed clinical encounters, verified doctor credentials, and normal physiological ranges.
- **UI-02 Responsive Layouts & Split-Screen Viewport:** The application shall be responsive across desktop, tablet, and mobile devices. The Doctor Clinical Workstation (`SCR-12`) and Document Inspection (`SCR-10`) split-screen views shall be optimized for desktop displays (>= 1280px width) with split-pane horizontal divider controls.
- **UI-03 Typography & Language Localization:** Clean sans-serif typography (`Inter`, `system-ui`) with 100% Vietnamese diacritical support and clinical terminology.
- **UI-04 Accessibility:** Compliance with WCAG 2.1 Level AA standards, high contrast ratios (>= 4.5:1), and keyboard navigation support.

#### 4.1.2 Hardware Interfaces
- **Client Devices:** Compatible with any standard computing device with an HTML5 browser:
  - PC / Laptop: Minimum 4GB RAM, 1366x768 resolution.
  - Mobile Devices: iOS 15+ (Safari), Android 11+ (Chrome), minimum 3GB RAM.
- **Server Infrastructure:**
  - CPU: 64-bit x86_64 architecture with AVX2 / AVX-512 SIMD vector instructions for accelerating pgvector cosine distance calculations.
  - Memory: 16GB RAM with 4GB allocated to PostgreSQL `shared_buffers` and 2GB to Redis.
  - Storage: NVMe PCIe 4.0 SSD delivering >= 3500 MB/s sequential read throughput for fast HNSW index graph traversal.

#### 4.1.3 Software Interfaces
- **SI-01 Database Management System:** PostgreSQL 16 LTS with the `pgvector` extension enabled. Managed via Spring Data JPA and Hibernate 6 with connection pooling via HikariCP (Max pool size: 20).
- **SI-02 Distributed Cache & Rate Limiting:** Redis 7 LTS interfaced via Spring Data Redis. Stores distributed session tokens, sliding rate-limiting buckets, and query caches.
- **SI-03 Object Storage Service:** Supabase S3-compatible cloud storage. Stores patient avatars and private medical documents. External access mediated via HMAC-SHA256 signed URLs with a 15-minute TTL.
- **SI-04 Multimodal Vision AI Gateway:** Google Gemini 1.5 Flash Vision API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`) for PDF/Image OCR and biomarker extraction.
- **SI-05 Dense Vector Embedding API:** OpenAI API (`https://api.openai.com/v1/embeddings`) with model `text-embedding-3-small` producing 1536-dimensional continuous vectors. Fallback: Local Unsupervised Feature Hashing (FNV-1a Character N-gram).
- **SI-06 Payment Processing Gateway:** VNPay National Payment Gateway API (HMAC-SHA512) for online banking and VietQR processing, alongside MediAssist Mock Payment Gateway for development and testing.
- **SI-07 Transactional Email Gateway:** SMTP server with STARTTLS on port 587 (Production) and Mailpit local SMTP on port 1025 / Web UI 8025 (Development/Demo) for dispatching verification links and admission slips.

---

### 4.2 Quality Attributes

#### 4.2.1 Usability (NFR-USA)
- **NFR-USA-01:** First-time patients shall be able to complete an AI symptom triage conversation and view matching specialist doctors in under 2 minutes without external assistance.
- **NFR-USA-02:** Attending physicians shall be able to complete the entire clinical encounter workflow (pre-check raw scan, record vitals, select ICD-10 diagnosis, prescribe medication, and finalize EMR) in under 3 minutes on the Doctor Workstation.
- **NFR-USA-03:** All form inputs shall provide real-time inline validation feedback with Vietnamese error descriptions.
- **NFR-USA-04:** Mobile navigation shall include bottom tab bars and touch-friendly action targets (>= 44x44px).

#### 4.2.2 Reliability & Fault Tolerance (NFR-REL)
- **NFR-REL-01 Service Availability:** The platform shall maintain an operational uptime of >= 99.9% (excluding scheduled maintenance windows).
- **NFR-REL-02 3-Tier AI Resilience Fallback:** If the primary AI inference gateway (Google Gemini) returns HTTP 429 or times out (> 4000ms), the system shall automatically fail over to OpenRouter. If external connectivity fails, the system shall degrade gracefully to local rule-based triage and FNV-1a vector feature hashing without crashing.
- **NFR-REL-03 Payment Idempotency:** All payment and refund transactions shall execute with unique idempotency keys, preventing double-billing during network retries.
- **NFR-REL-04 Data Integrity:** All critical database modifications shall execute within atomic transactions (`@Transactional(isolation = Isolation.READ_COMMITTED)`).
- **NFR-REL-05 Automated Recovery:** Backend and database containers shall automatically restart upon abnormal termination via Docker Compose `restart: unless-stopped`.

#### 4.2.3 Performance & Scalability (NFR-PERF)
- **NFR-PERF-01 Vector Search Latency:** PostgreSQL 16 HNSW index scan for 1536-dimensional doctor embeddings shall execute in < 12ms. (Empirically verified in benchmark: **0.72ms** with session tuning).
- **NFR-PERF-02 Cache Retrieval Latency:** L1 Caffeine in-memory cache lookups shall complete in < 1ms; L2 Redis distributed cache lookups shall complete in < 3ms.
- **NFR-PERF-03 REST API Response Time:** 95% of standard read API endpoints shall respond in < 350ms under normal operating load.
- **NFR-PERF-04 High Concurrency Capacity:** The backend architecture (Java 21 Project Loom Virtual Threads) shall sustain >= 500 concurrent virtual users without thread starvation.
- **NFR-PERF-05 Database Scaling:** The database schema and pgvector HNSW index structure shall scale smoothly to 50,000 doctor profiles and 500,000 historical encounters on a 16GB RAM server configuration without exceeding 60% memory utilization.
- **NFR-PERF-06 Frontend Asset Bundling:** The production Vite frontend bundle shall complete initial paint in < 1.2s over standard 4G broadband connections through route-level code splitting (`React.lazy` and `Suspense`).

#### 4.2.4 Security & Regulatory Privacy (NFR-SEC)
- **NFR-SEC-01 Credential Hashing:** All user passwords shall be hashed using the Bcrypt algorithm with an adaptive cost factor of 12 (approx. 250ms hashing calculation per attempt), providing cryptographic resistance against brute-force attacks.
- **NFR-SEC-02 Stateless Dual-Transport Authentication:** System shall implement stateless JWT dual-transport: HttpOnly, Secure, SameSite=Lax cookies for browser sessions combined with JSON response bodies for mobile Bearer authorization headers.
- **NFR-SEC-03 Broken Object Level Authorization (BOLA/IDOR) Defense:** All access to patient medical documents, lab reports, and clinical records shall be strictly mediated by `PatientAccessGuard`. Doctors are granted access ONLY if an active care relationship exists (`SCHEDULED`, `IN_PROGRESS`, or `COMPLETED` appointment with that patient). All access events are recorded in `audit_logs` (`VIEW_PATIENT_RECORD`).
- **NFR-SEC-04 Private Cloud Storage Lockdown:** Medical document files shall reside exclusively in private Supabase S3 buckets. Direct public URLs are strictly forbidden (Security Fix V20). Authorized access is issued strictly via temporary 15-minute HMAC-SHA256 signed URLs.
- **NFR-SEC-05 Mock Payment Production Lockdown:** The mock payment gateway shall be permanently disabled in production environments (`app.payment.mock.enabled = false`), ensuring zero financial bypass risks (Security Audit BE-10).
- **NFR-SEC-06 PII Payload Guardrails:** The public de-identification endpoint shall enforce an input size limit of 20,000 characters (`@Size(max = 20000)`), mitigating ReDoS and CPU exhaustion attacks (Security Audit BE-12).
- **NFR-SEC-07 Regulatory Compliance:** The data processing pipeline shall comply with Vietnam Government Decree 13/2023/NĐ-CP on Personal Data Protection and the international HIPAA Safe Harbor de-identification standard.
- **NFR-SEC-08 Transport Layer Security:** All client-server and inter-service communications shall be strictly encrypted using TLS 1.3 over HTTPS, with HTTP Strict Transport Security (HSTS) headers enforced.

#### 4.2.5 Maintainability & Observability (NFR-MAINT)
- **NFR-MAINT-01 Comprehensive Automated Testing Baseline:** The backend codebase shall maintain a 100% pass rate across **306 automated unit and integration tests** (`mvn test` executing JUnit 5, Mockito, and Spring Boot slice tests).
- **NFR-MAINT-02 Strict TypeScript Compilation:** The frontend codebase shall compile with zero TypeScript errors under strict mode (`npm run build` compiling 2307+ modules).
- **NFR-MAINT-03 Deterministic Database Migrations:** Database schema evolution shall be managed exclusively through sequential Flyway migrations (`V1` through `V22`), ensuring 100% reproducible environments across development, staging, and production.
- **NFR-MAINT-04 Centralized Application Logging:** Application events shall be logged using SLF4J and Logback with structured JSON formatting.
- **NFR-MAINT-05 Metric Observability:** System shall expose Spring Boot Actuator health and metrics endpoints (`/actuator/health`, `/actuator/metrics`) for continuous infrastructure monitoring.

---

## 5. REQUIREMENT APPENDIX

### 5.1 Business Rules

| Rule ID | Rule Name | Formal Business Rule Definition & Backend Error Code | Enforcing Subsystem |
| :--- | :--- | :--- | :--- |
| **BR-01** | Password Complexity | Passwords must contain >= 8 characters, at least 1 uppercase letter, 1 number, and 1 special symbol. Hashed with Bcrypt cost 12 (`WEAK_PASSWORD`). | Identity & Access Management |
| **BR-02** | Login Rate Limiting | Maximum 5 consecutive failed login attempts per account/IP within 15 minutes before temporary lockout (`ACCOUNT_LOCKED`). | Spring Security / Rate Limiter |
| **BR-03** | JWT Entropy | JWT secret key (`APP_JWT_SECRET`) must provide at least 256 bits of cryptographic entropy. | Authentication Service |
| **BR-04** | Immediate Session Termination | Sign-out must immediately invalidate client tokens and clear the HttpOnly `jwt_token` cookie via zero Max-Age. | Authentication Service |
| **BR-05** | Password Non-Reuse | A newly configured password cannot be identical to the user's current password. | User Service |
| **BR-06** | Vietnamese Phone Validation | Phone numbers must conform to the Vietnamese national format: `^(0|\+84)(3|5|7|8|9)[0-9]{8}$` (`INVALID_PHONE`). | Patient Profile Subsystem |
| **BR-07** | Reset Token Hashing | Plaintext password reset tokens must NEVER be stored in the database. Only SHA-256 hashes (`token_hash`) are persisted (`INVALID_TOKEN`). | Identity & Access Management |
| **BR-08** | Reset Token Expiration | Password reset tokens have a strict lifespan of 15 minutes and can be consumed exactly once (`TOKEN_EXPIRED`). | Identity & Access Management |
| **BR-09** | Email Verification Gate | Accounts with `email_verified = false` are blocked from booking appointments or accessing medical records (`EMAIL_NOT_VERIFIED`). | Security Filter / Access Guard |
| **BR-10** | Mandatory Medical Disclaimer | Every AI triage response and lab document summary must display the official clinical safety disclaimer. | AI Triage & Document Subsystem |
| **BR-11** | Conversational Turn Cap | AI triage sessions are capped at a maximum of 5 conversational turns to prevent infinite dialogue loops. | Clinical Triage Engine |
| **BR-12** | Red-Flag Emergency Lockout | Acute emergency symptoms (Stroke FAST, Myocardial Infarction) trigger an immediate 115 hotline lockout with 0 network delays. | Clinical Query Defense Engine |
| **BR-13** | Doctor Vetting Gate | Only doctors with `is_verified = true` approved by an administrator are visible in public search and booking (`DOCTOR_NOT_VERIFIED`). | Doctor Directory Subsystem |
| **BR-14** | License Transparency | Doctor practice certificate numbers (CCHN) must be publicly displayed on doctor profiles. | Doctor Directory Subsystem |
| **BR-15** | Private Document Storage | Medical documents must reside in private S3 buckets. External access is granted exclusively via 15-minute signed URLs (Flyway V20). | Storage Subsystem |
| **BR-16** | Lab Value Exactness | Numerical biomarker values extracted by OCR must retain exact precision and units as shown on the original scan. | Document Analysis Subsystem |
| **BR-17** | Hospital Operating Hours | In-clinic appointments operate strictly Monday–Saturday, 08:00–12:00 and 13:30–17:00 (`INVALID_SLOT_DAY`, `INVALID_SLOT_TIME`). | Scheduling Subsystem |
| **BR-18** | Slot Concurrency Lock | Concurrent bookings for the same doctor and slot trigger optimistic lock conflict rejection (`SLOT_CONFLICT`). | Scheduling Subsystem |
| **BR-19** | Mock Payment Lockdown | In production mode (`mock.enabled = false`), the mock payment gateway is permanently disabled (`MOCK_PAYMENT_DISABLED`). | Payment Gateway Subsystem |
| **BR-20** | Sequential Queue (STT) | Admission queue numbers (STT) are sequential per doctor per day starting at STT 01 at 08:00 AM (`queue_number`). | Scheduling Subsystem |
| **BR-21** | Reschedule Policy | Patients may reschedule appointments up to 2 hours in advance without penalty (`CANNOT_RESCHEDULE`, `PAST_DATE`). | Scheduling Subsystem |
| **BR-22** | Cancellation Refund Policy | Patient refunds: >24h = 100%, 2-24h = 80%, <2h = 0%. Doctor cancellations always refund 100%. | Refund Subsystem |
| **BR-23** | Verified Review Policy | Only patients with verified `COMPLETED` appointments with a doctor can submit reviews for that doctor (`APPOINTMENT_NOT_COMPLETED`). | Feedback Subsystem |
| **BR-24** | PII Protection Compliance | Text inputs must be de-identified in compliance with Vietnam Decree 13/2023/NĐ-CP and HIPAA Safe Harbor (max 20,000 chars). | Anonymization Subsystem |
| **BR-25** | Pre-Encounter Clinical Review | Doctors must review the pre-encounter inspection split-screen before completing an encounter. | Doctor Workstation |
| **BR-26** | BOLA/IDOR Record Protection | Doctors cannot access medical records of patients with whom they have no verified care relationship (`FORBIDDEN_PATIENT_ACCESS`). | PatientAccessGuard |
| **BR-27** | Mandatory ICD-10 Coding | Finalized clinical encounters must include at least 1 primary standardized WHO ICD-10 diagnosis (`icd10_code`). | Doctor Workstation |
| **BR-28** | Prescription Direction Rigor | Prescription items must include dosage, administration route, frequency, and relationship to meals (`prescription_json`). | Outpatient Pharmacy |
| **BR-29** | Medical Record Immutability | Finalized clinical encounter records are legally immutable (`AppointmentStatus.COMPLETED`). | EMR Subsystem |
| **BR-30** | Doctor Cancel Full Refund | Any appointment cancellation initiated by a doctor triggers an automatic 100% full refund to the patient. | Refund Subsystem |
| **BR-31** | CCHN Immutability | A doctor cannot modify their CCHN license number once approved without administrative re-vetting. | Admin Governance |
| **BR-32** | Administrative Lockout | Locking a user account immediately invalidates all active authentication tokens and terminates web sessions. | Admin Governance |
| **BR-33** | AI Mode Administration | System-wide AI inference provider switching is strictly restricted to authenticated users with `ADMIN` role (Security Fix BE-1). | System Configuration |
| **BR-34** | Audit Log Immutability | Audit log entries are strictly append-only. Deletion or modification of audit records is programmatically blocked. | Audit Subsystem |

---

### 5.2 Acronyms and Abbreviations

- **AI:** Artificial Intelligence
- **ANN:** Approximate Nearest Neighbor (Vector search algorithm)
- **API:** Application Programming Interface
- **AVX:** Advanced Vector Extensions (x86 SIMD CPU instruction set)
- **BOLA:** Broken Object Level Authorization (OWASP API Security Top 1)
- **BYT:** Bộ Y Tế (Ministry of Health of Vietnam)
- **CCHN:** Chứng Chỉ Hành Nghề (Medical Practice Certificate)
- **C4:** Context, Containers, Components, Code (Software architecture model)
- **DTO:** Data Transfer Object
- **EMR:** Electronic Medical Record
- **FAST:** Face, Arm, Speech, Time (Acute stroke clinical protocol)
- **FNV-1a:** Fowler-Noll-Vo 1a (Non-cryptographic hash algorithm)
- **HNSW:** Hierarchical Navigable Small World (Graph-based vector indexing)
- **HTML:** HyperText Markup Language
- **HTTP:** HyperText Transfer Protocol
- **ICD-10:** International Classification of Diseases, 10th Revision (WHO)
- **IDOR:** Insecure Direct Object Reference
- **IEEE:** Institute of Electrical and Electronics Engineers
- **JWT:** JSON Web Token (RFC 7519)
- **L1 / L2:** Level 1 (Local Caffeine) / Level 2 (Distributed Redis) Cache
- **LOINC:** Logical Observation Identifiers Names and Codes
- **MOH:** Ministry of Health
- **NFR:** Non-Functional Requirement
- **O2O:** Online-to-Offline (Clinical scheduling model)
- **OCR:** Optical Character Recognition
- **OOD:** Out-of-Domain (Intent classification gating)
- **PDPD:** Personal Data Protection Decree (Nghị định 13/2023/NĐ-CP)
- **PII:** Personally Identifiable Information
- **RBAC:** Role-Based Access Control
- **REST:** Representational State Transfer
- **RTM:** Requirements Traceability Matrix
- **SBAR:** Situation, Background, Assessment, Recommendation
- **SHA:** Secure Hash Algorithm
- **SPA:** Single Page Application
- **SRS:** Software Requirement Specification
- **SSO:** Single Sign-On
- **STT:** Số Thứ Tự (Sequential Queue Number)
- **TLS:** Transport Layer Security
- **TTL:** Time-To-Live (Expiration period)
- **UI / UX:** User Interface / User Experience
- **WHRF:** Weighted Hybrid Re-Ranking Formula

---

### 5.3 Common Requirements & Architectural Constraints
1. **Virtual Thread Execution Model:** All backend synchronous request dispatching leverages Java 21 Project Loom virtual threads (`spring.threads.virtual.enabled = true`), providing lightweight task-per-thread concurrency without thread-pool exhaustion.
2. **Deterministic Data Seeding:** The development and test environments are seeded with realistic medical profiles:
   - 12 verified clinical specialties covering major medical domains (`SpecialtyRepository`).
   - Comprehensive doctor profiles with real-world 1536-dimensional continuous embeddings (`DataInitializer`).
   - Standardized WHO ICD-10 diagnostic codes and MOH LOINC laboratory catalogs (`ClinicalOntologyService`).
3. **Cross-Origin Resource Sharing (CORS):** Backend APIs strictly whitelist authorized frontend origins (`http://localhost:5173`, `http://localhost:3000`) and enforce credentials support (`allowCredentials = true`).
4. **Environment Isolation:** Secrets, API credentials, and private keys shall NEVER be hardcoded in application source code. Configurations are managed exclusively through environment variables and `.env` template profiles.

---

### 5.4 Application Messages List

| Message Code | Message Type | Vietnamese User String (Display Text) | English Internal String / Trigger |
| :--- | :---: | :--- | :--- |
| `AUTH_LOGIN_SUCCESS` | Success | Đăng nhập thành công! Đang chuyển hướng... | Authentication successful; redirecting to dashboard. |
| `INVALID_CREDENTIALS` | Error | Email hoặc mật khẩu không chính xác. | Invalid email or password provided. |
| `EMAIL_NOT_VERIFIED` | Warning | Tài khoản chưa được kích hoạt email. Vui lòng kiểm tra hộp thư. | Email verification required before login. |
| `ACCOUNT_LOCKED` | Error | Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên. | User account deactivated by administrator. |
| `AUTH_LOGOUT_SUCCESS` | Info | Bạn đã đăng xuất thành công khỏi hệ thống. | Session terminated; tokens invalidated. |
| `RESET_LINK_SENT` | Success | Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. | Password reset token email dispatched. |
| `TOKEN_EXPIRED` | Error | Đường dẫn đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. | Token expired (>15 min) or consumed. |
| `TRG_EMERGENCY_ALERT` | Danger | CẢNH BÁO NGUY HIỂM: Triệu chứng có dấu hiệu cấp cứu! Gọi 115 ngay! | Acute Red-Flag symptoms detected (FAST/AMI). |
| `TRG_OOD_GUIDANCE` | Info | MediAssist-AI là trợ lý sàng lọc y khoa. Đối với thủ tục hành chính, vui lòng gọi 1900-xxxx. | Out-of-Domain query intercepted. |
| `DOC_UPLOAD_SUCCESS` | Success | Tải hồ sơ thành công! AI đang tiến hành bóc tách kết quả... | Document uploaded to private S3 bucket. |
| `FILE_TOO_LARGE` | Error | Kích thước tệp vượt quá 10MB. Vui lòng nén tệp hoặc chụp lại ảnh. | Upload payload exceeds 10MB limit. |
| `INVALID_FILE` | Error | Vui lòng chọn ít nhất một tệp tài liệu y tế (PDF hoặc ảnh) để phân tích. | Invalid or empty document upload payload. |
| `SLOT_CONFLICT` | Error | Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác. | Concurrent booking collision detected. |
| `INVALID_SLOT_DAY` | Error | Bệnh viện không tiếp nhận lịch hẹn vào Chủ Nhật. | Booking attempted on Sunday. |
| `INVALID_SLOT_TIME` | Error | Khung giờ khám hợp lệ là 08:00-12:00 và 13:30-17:00. | Booking outside clinic operational hours. |
| `PAYMENT_SUCCESS` | Success | Thanh toán thành công! Phiếu khám điện tử đã được phát hành. | Payment captured; status = PAID. |
| `REFUND_SUCCESS` | Success | Đã hủy lịch và hoàn trả viện phí theo quy định về tài khoản của bạn. | Refund processed by AppointmentRefundService. |
| `CANNOT_RESCHEDULE` | Error | Chỉ có thể đổi lịch cho các cuộc hẹn đang ở trạng thái Đã Đặt (SCHEDULED). | Reschedule disallowed on non-scheduled appointment. |
| `PAST_DATE` | Error | Thời gian hẹn mới phải cách thời điểm hiện tại ít nhất 2 giờ. | Reschedule within 2-hour window rejected. |
| `FORBIDDEN_PATIENT_ACCESS`| Error | Bạn không có quyền xem hồ sơ của bệnh nhân này. Chỉ bác sĩ có lịch hẹn điều trị với bệnh nhân mới được truy cập. | BOLA/IDOR access violation blocked by PatientAccessGuard. |
| `REVIEW_ALREADY_EXISTS` | Error | Bạn đã gửi đánh giá cho ca khám này rồi. | Duplicate review attempt blocked. |
| `APPOINTMENT_NOT_COMPLETED`| Error | Chỉ có thể đánh giá ca khám đã hoàn tất. | Review submitted on incomplete appointment. |
| `QUEUE_EMPTY` | Info | Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay. | Doctor called next but queue has no remaining patients. |

---

### 5.5 Requirements Traceability Matrix (RTM)

The Requirements Traceability Matrix maps every Functional Requirement (FR) to its corresponding Use Case, Flyway Database Migration, and Automated Test Case within the **306/306 passing test baseline**:

| Functional Req ID | Core Feature / Capability | Use Case Specification | Flyway DB Migration | Automated Verification Test Case | Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-AUTH-01** | Bcrypt Authentication | UC-COMM-01 | V1, V2 | `AuthServiceTest.testLogin_Success` | 100% PASS |
| **FR-AUTH-02** | Google OAuth2 SSO | UC-COMM-01 | V8 (`google_id`) | `OAuth2AuthenticationSuccessHandlerTest` | 100% PASS |
| **FR-AUTH-03** | Dual-Transport JWT | UC-COMM-01 | V1 | `JwtTokenProviderTest.testTokenGeneration` | 100% PASS |
| **FR-AUTH-04** | Email Verification Gate | UC-COMM-06 | V22 (`email_verified`) | `EmailVerificationGuardTest.testGateEnforcement` | 100% PASS |
| **FR-AUTH-05** | SHA-256 Token Hash Reset | UC-COMM-05 | V21 (`token_hash`) | `AuthServiceTest.testResetPassword_Success` | 100% PASS |
| **FR-AUTH-06** | Brute-force Rate Limiting | UC-COMM-01 | V1 | `SecurityRateLimiterServiceTest.testLockout` | 100% PASS |
| **FR-TRG-01** | Multi-Turn AI Triage | UC-PAT-01 | V1, V15 | `TriageServiceTest.testAssess_Success` | 100% PASS |
| **FR-TRG-02** | Red-Flag 115 Interception | UC-PAT-02 | In-memory | `ClinicalQueryDefenseEngineTest.testRedFlagInterception` | 100% PASS |
| **FR-TRG-03** | Vietnamese Slang Normalization | UC-PAT-02 | In-memory | `ClinicalQueryDefenseEngineTest.testSlangNormalization` | 100% PASS |
| **FR-TRG-04** | Vietnamese NegEx Splitting | UC-PAT-02 | In-memory | `ClinicalQueryDefenseEngineTest.testNegExSplitting` | 100% PASS |
| **FR-TRG-05** | SBAR Structured Reporting | UC-PAT-01 | V15 | `TriageServiceTest.testSbarJsonSchema` | 100% PASS |
| **FR-VEC-01** | 1536-d Continuous Embeddings | UC-PAT-03 | V3, V11 | `EmbeddingServiceTest.testDimension1536` | 100% PASS |
| **FR-VEC-02** | PostgreSQL HNSW Indexing | UC-PAT-03 | V11 (`m=24, ef=128`) | `DoctorSemanticSearchServiceTest.testHnswIndexScan` | 100% PASS |
| **FR-VEC-03** | Session-Level HNSW Tuning | UC-PAT-03 | V11 | `DoctorSemanticSearchServiceTest.testSessionTuning` | 100% PASS |
| **FR-VEC-04** | WHRF-SOTA Re-ranking Engine | UC-PAT-03 | In-memory | `DoctorSemanticSearchServiceTest.testWhrfReRanking` | 100% PASS |
| **FR-VEC-05** | Doctor Vetting Constraint | UC-PAT-03 | V2, V14 | `DoctorServiceTest.testVerifiedDoctorsOnly` | 100% PASS |
| **FR-VEC-06** | WHO ICD-10 Autocomplete | UC-DOC-06 | In-memory / V18 | `ClinicalOntologyServiceTest.testSearchIcd10` | 100% PASS |
| **FR-VEC-07** | LOINC Lab Autocomplete | UC-DOC-07 | In-memory / V19 | `ClinicalOntologyServiceTest.testSearchLoinc` | 100% PASS |
| **FR-VEC-08** | Top-K Min-Heap Selection | UC-PAT-03 | In-memory | `DoctorSemanticSearchServiceTest.testTopKSelection` | 100% PASS |
| **FR-DOC-01** | Multimodal File Ingestion | UC-PAT-05 | V5 | `MedicalDocumentValidatorTest.testUploadPDFAndImage` | 100% PASS |
| **FR-DOC-02** | SHA-256 Deduplication | UC-PAT-05 | V5 (`file_hash`) | `MedicalDocumentAnalysisServiceTest.testDeduplication`| 100% PASS |
| **FR-DOC-03** | Private S3 Storage Path | UC-PAT-05 | V20 (`storage_path`) | `SupabaseStorageServiceTest.testPrivateBucketStorage` | 100% PASS |
| **FR-DOC-04** | 15-Minute Signed URLs | UC-PAT-07 | V20 | `SupabaseStorageServiceTest.testSignedUrlTTL` | 100% PASS |
| **FR-DOC-05** | Vision AI Biomarker OCR | UC-PAT-06 | V1, V5 | `MedicalDocumentAnalysisServiceTest.testBiomarkers` | 100% PASS |
| **FR-DOC-06** | Layperson Translation | UC-PAT-06 | V1, V5 | `MedicalDocumentAnalysisServiceTest.testLayperson` | 100% PASS |
| **FR-BOK-01** | Hospital Hours Validation | UC-PAT-09 | V4 | `AppointmentServiceTest.testClinicOperatingHours` | 100% PASS |
| **FR-BOK-02** | Slot Concurrency Lock | UC-PAT-09 | V4 | `AppointmentServiceTest.testDoubleBookingLock` | 100% PASS |
| **FR-BOK-03** | Sequential STT Allocation | UC-PAT-09 | V19 (`queue_number`) | `AppointmentServiceTest.testSequentialQueueNumber` | 100% PASS |
| **FR-BOK-04** | Electronic Admission Slip | UC-PAT-11 | V19 | `AppointmentServiceTest.testGetTicket` | 100% PASS |
| **FR-BOK-05** | Patient Arrival Check-In | UC-PAT-13 | V1 | `AppointmentServiceTest.testCheckIn` | 100% PASS |
| **FR-BOK-06** | 2-Hour Reschedule Window | UC-PAT-14 | V4 | `AppointmentServiceTest.testReschedulePolicy` | 100% PASS |
| **FR-BOK-07** | Automated Policy Refund | UC-PAT-15 | V7, V13 | `AppointmentRefundServiceTest.testRefundTiers` | 100% PASS |
| **FR-CLIN-01** | Doctor Queue & Call Next | UC-DOC-03 | V4, V19 | `DoctorServiceTest.testCallNextPatient` | 100% PASS |
| **FR-CLIN-02** | Split-Screen Pre-Check | UC-DOC-04 | V5, V20 | `MedicalDocumentFileAccessServiceTest.testAccess` | 100% PASS |
| **FR-CLIN-03** | BOLA IDOR Defense Guard | UC-DOC-05 | V1 | `PatientAccessGuardTest.testCareRelationshipEnforcement` | 100% PASS |
| **FR-CLIN-04** | Vital Signs Recording | UC-DOC-08 | V18 (`vital_signs_json`) | `AppointmentServiceTest.testCompleteClinical_Vitals` | 100% PASS |
| **FR-CLIN-05** | Mandatory ICD-10 Finalize | UC-DOC-08 | V18 (`icd10_code`) | `AppointmentServiceTest.testCompleteClinical_Icd10` | 100% PASS |
| **FR-CLIN-06** | Outpatient Prescriptions | UC-DOC-08 | V9 (`prescription_json`) | `AppointmentServiceTest.testCompleteClinical_Rx` | 100% PASS |
| **FR-CLIN-07** | EMR Legal Immutability | UC-DOC-08 | V1 | `AppointmentServiceTest.testCompleteClinical_Status` | 100% PASS |
| **FR-CLIN-08** | Encounter Summary PDF | UC-DOC-13 | In-memory | `MeddiesPdfGeneratorServiceTest.testGeneratePdf` | 100% PASS |
| **FR-ADM-01** | Executive Telemetry | UC-ADM-01 | V1, V13 | `AdminControllerTest.testGetStats` | 100% PASS |
| **FR-ADM-02** | Doctor Credential Vetting | UC-ADM-05 | V14 (`is_verified`) | `AdminVettingServiceTest.testVetDoctor` | 100% PASS |
| **FR-ADM-03** | AI FinOps Token Monitor | UC-ADM-02 | V1, V12 | `AiUsageAnalyticsServiceTest.testGetUsage` | 100% PASS |
| **FR-ADM-04** | AI Provider Failover Mode | UC-ADM-03 | In-memory | `SystemConfigControllerTest.testToggleAiMode` | 100% PASS |
| **FR-ADM-05** | Immutable Audit Trail | UC-ADM-11 | V1 (`audit_logs`) | `PatientAccessGuardTest.testAuditLogRecording` | 100% PASS |
| **FR-ADM-06** | Flyway Migration Baseline | Infr | V1 - V22 | `FlywayMigrationTest.testMigrationsBaseline` | 100% PASS |

---

*This concludes the official Software Requirement Specification (SRS) for the MediAssist-AI Telehealth & Clinical AI Retrieval Platform (Version 2.2.0, Capstone Defense Baseline).*
"""

if __name__ == "__main__":
    print("Part 5 module loaded successfully. Character count:", len(get_content()))
