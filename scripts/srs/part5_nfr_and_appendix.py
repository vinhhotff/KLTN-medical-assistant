# -*- coding: utf-8 -*-
"""
Part 5: 4. Non-Functional Requirements & 5. Requirement Appendix
4.1 External Interfaces, 4.2 Quality Attributes,
5.1 Business Rules (BR-01 to BR-25), 5.2 Acronyms, 5.3 Common Requirements,
5.4 Application Messages List, 5.5 Requirements Traceability Matrix (RTM).
"""

def get_content():
    return """
---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 External Interfaces

#### 4.1.1 User Interfaces
- **UI-01 Design Standard & Color System:** The graphical user interface shall follow modern clinical design principles utilizing a unified color palette:
  - Primary Clinical Blue (`#0284c7`, `#0369a1`): Conveys clinical authority, medical sterility, and patient trust.
  - Soft Slate Background (`#f8fafc`, `#ffffff`): Reduces visual fatigue for attending physicians during extended shifts.
  - Emergency Alert Red (`#ef4444`): High-visibility warning strictly reserved for Red-Flag 115 emergency lockouts.
  - Clinical Success Green (`#10b981`): Indicates completed consultations, verified doctors, and normal biomarker ranges.
- **UI-02 Responsiveness & Cross-Device Layout:** The frontend shall be fully responsive across desktop monitors (>= 1280px), tablets (768px - 1024px), and mobile smartphones (360px - 430px). The Doctor Clinical Workstation and Multimodal Document Split-Screen shall be optimized specifically for desktop viewports (>= 1280px width) with split-pane horizontal divider controls.
- **UI-03 Typography & Internationalization:** System shall utilize clean sans-serif typography (`Inter`, `system-ui`) with full diacritical support for Vietnamese and English.
- **UI-04 Accessibility:** Compliance with Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards, including high contrast ratios (>= 4.5:1), keyboard tab navigation, and ARIA screen reader tags.

#### 4.1.2 Hardware Interfaces
- **Client Devices:** Compatible with any standard modern computing device equipped with an HTML5-compliant web browser:
  - Desktop / Laptop: Minimum 4GB RAM, 1366x768 display resolution.
  - Mobile Devices: iOS 15+ (Safari), Android 11+ (Chrome), minimum 3GB RAM.
- **Server Infrastructure:**
  - Production Server: 64-bit x86_64 architecture with AVX2 / AVX-512 SIMD vector acceleration instructions (required for high-throughput cosine distance calculation in pgvector).
  - Memory: 16GB RAM with 4GB allocated to PostgreSQL `shared_buffers` and 2GB to Redis.
  - Storage: NVMe PCIe 4.0 Solid State Drive (SSD) delivering >= 3500 MB/s sequential read throughput for fast HNSW index graph traversal.

#### 4.1.3 Software Interfaces
- **SI-01 Database Management System:** PostgreSQL 16 LTS with the `pgvector` extension enabled. Interfaced via Spring Data JPA and Hibernate 6 with connection pooling managed by HikariCP (Max pool size: 20 connections).
- **SI-02 In-Memory Caching & Session Store:** Redis 7 LTS interfaced via Spring Data Redis. Stores distributed session tokens, rate-limiting token buckets, and query result caches with TTL expiration.
- **SI-03 Object Storage Service:** Supabase S3-compatible cloud object storage. Stores patient profile avatars and private medical documents. External access is strictly mediated via HMAC-SHA256 signed URLs issued by the backend with a 15-minute TTL.
- **SI-04 Multimodal Vision AI Gateway:** Google Gemini 1.5 Flash Vision API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`). Ingests PDF/Image byte streams and outputs structured JSON extractions of lab biomarkers and clinical summaries.
- **SI-05 Dense Vector Embedding API:** OpenAI API (`https://api.openai.com/v1/embeddings`) utilizing model `text-embedding-3-small` producing 1536-dimensional continuous vectors. Fallback: Local Unsupervised Feature Hashing (FNV-1a Character N-gram).
- **SI-06 Payment Processing Gateway:** Stripe Payments API Sandbox (`https://api.stripe.com/v1`) for international card processing with webhook notification endpoints, alongside MediAssist Mock Payment Sandbox for development/demo testing.
- **SI-07 Transactional Email Service:** SMTP server with STARTTLS on port 587 (Production) and Mailpit local SMTP server on port 1025 / Web UI 8025 (Development/Demo) for dispatching verification links and admission tickets.

---

### 4.2 Quality Attributes

#### 4.2.1 Usability (NFR-USA)
- **NFR-USA-01:** First-time patients shall be able to complete an AI symptom triage conversation and view matching specialist doctors in under 2 minutes without external assistance.
- **NFR-USA-02:** Attending physicians shall be able to complete the entire clinical encounter workflow (pre-check raw scan, record vitals, select ICD-10 diagnosis, prescribe medication, and finalize EMR) in under 3 minutes on the Doctor Workstation.
- **NFR-USA-03:** All user interface components shall display contextual tooltips, helpful empty states, and descriptive error messages with clear corrective actions.
- **NFR-USA-04:** Mobile interface shall include bottom navigation bars and thumb-friendly action buttons (minimum 44x44px touch targets).

#### 4.2.2 Reliability & Fault Tolerance (NFR-REL)
- **NFR-REL-01 Service Availability:** The platform shall maintain an operational uptime of >= 99.9% (excluding scheduled maintenance windows not exceeding 2 hours per month).
- **NFR-REL-02 3-Tier AI Resilience Fallback:** If the primary AI inference gateway (Google Gemini) becomes unavailable or exceeds latency thresholds (> 4000ms), the system shall automatically fail over to the secondary OpenRouter pool. If external network connectivity fails entirely, the system shall degrade gracefully to local rule-based triage and FNV-1a vector feature hashing without crashing.
- **NFR-REL-03 Payment Idempotency:** All payment and refund transactions shall execute with unique idempotency keys (`idempotency_key`), preventing double-billing or duplicate refund dispatches during network retries.
- **NFR-REL-04 Data Integrity:** All critical database modifications (appointment booking, payment confirmation, encounter finalization) shall execute within atomic transactions (`@Transactional(isolation = Isolation.READ_COMMITTED)`) ensuring zero orphaned records.
- **NFR-REL-05 Automated Recovery:** Containerized backend and database services shall automatically restart upon abnormal process termination via Docker Compose `restart: unless-stopped`.

#### 4.2.3 Performance & Scalability (NFR-PERF)
- **NFR-PERF-01 Vector Search Latency:** PostgreSQL 16 HNSW index scan for 1536-dimensional doctor embeddings shall execute in < 12ms. (Empirically verified in benchmark: **0.72ms** with session tuning).
- **NFR-PERF-02 Cache Retrieval Latency:** L1 Caffeine in-memory cache lookups shall complete in < 1ms; L2 Redis distributed cache lookups shall complete in < 3ms.
- **NFR-PERF-03 REST API Response Time:** 95% of standard read API endpoints (doctor directory, appointment details, user profile) shall respond in < 350ms under normal operating load.
- **NFR-PERF-04 High Concurrency Capacity:** The backend architecture (Java 21 Project Loom Virtual Threads) shall sustain >= 500 concurrent virtual users without thread starvation or connection pool exhaustion.
- **NFR-PERF-05 Database Scaling:** The database schema and pgvector HNSW index structure shall scale smoothly to 50,000 doctor profiles and 500,000 historical patient encounters on a 16GB RAM server configuration without exceeding 60% memory utilization.
- **NFR-PERF-06 Frontend Asset Bundling:** The production Vite frontend bundle shall complete initial paint in < 1.2s over standard 4G broadband connections through route-level code splitting (`React.lazy` and `Suspense`).

#### 4.2.4 Security & Regulatory Privacy (NFR-SEC)
- **NFR-SEC-01 Credential Hashing:** All user passwords shall be hashed using the Bcrypt algorithm with an adaptive cost factor of 12 (approx. 250ms hashing calculation per attempt), providing cryptographic resistance against offline dictionary and brute-force GPU attacks.
- **NFR-SEC-02 Stateless Dual-Transport Authentication:** System shall implement stateless JWT dual-transport: HttpOnly, Secure, SameSite=Lax cookies for browser web sessions (shielding tokens from JavaScript XSS harvesting) combined with JSON response bodies for mobile Bearer authorization headers.
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
- **NFR-MAINT-04 Centralized Application Logging:** Application events shall be logged using SLF4J and Logback with structured JSON formatting, including correlation IDs for distributed request tracing.
- **NFR-MAINT-05 Metric Observability:** System shall expose Spring Boot Actuator health and metrics endpoints (`/actuator/health`, `/actuator/metrics`) for continuous infrastructure monitoring.

---

## 5. REQUIREMENT APPENDIX

### 5.1 Business Rules

| Rule ID | Rule Name | Formal Business Rule Definition & Architectural Constraint | Enforcing Subsystem |
| :--- | :--- | :--- | :--- |
| **BR-01** | Password Complexity | Passwords must contain >= 8 characters, at least 1 uppercase letter, 1 number, and 1 special symbol. Hashed with Bcrypt cost factor 12. | Identity & Access Management |
| **BR-02** | Login Rate Limiting | Maximum 5 consecutive failed login attempts per account/IP within 15 minutes before temporary lockout. | Spring Security / Rate Limiter |
| **BR-03** | JWT Entropy | JWT secret key (`APP_JWT_SECRET`) must provide at least 256 bits of cryptographic entropy. | Authentication Service |
| **BR-04** | Immediate Session Termination | Sign-out must immediately invalidate client tokens and clear the HttpOnly `jwt_token` cookie via zero Max-Age. | Authentication Service |
| **BR-05** | Password Non-Reuse | A newly configured password cannot be identical to the user's current password. | User Service |
| **BR-06** | Vietnamese Phone Validation | Phone numbers must conform to the Vietnamese national telecommunications format: `^(0|\+84)(3|5|7|8|9)[0-9]{8}$`. | User Profile Subsystem |
| **BR-07** | Reset Token Hashing | Plaintext password reset tokens must NEVER be stored in the database. Only SHA-256 hashes (`token_hash`) are persisted. | Identity & Access Management |
| **BR-08** | Reset Token Expiration | Password reset tokens have a strict lifespan of 15 minutes and can be consumed exactly once. | Identity & Access Management |
| **BR-09** | Email Verification Gate | Accounts with `email_verified = false` are blocked from booking appointments or accessing medical records. | Security Filter / Access Guard |
| **BR-10** | Mandatory Medical Disclaimer | Every AI triage response and lab document summary must display the official clinical safety disclaimer. | AI Triage & Document Subsystem |
| **BR-11** | Conversational Turn Cap | AI triage sessions are capped at a maximum of 5 conversational turns to prevent infinite dialogue loops. | Clinical Triage Engine |
| **BR-12** | Red-Flag Emergency Lockout | Acute emergency symptoms (Stroke FAST, Myocardial Infarction) trigger an immediate 115 hotline lockout with 0 network delays. | Clinical Query Defense Engine |
| **BR-13** | Doctor Vetting Gate | Only doctors with `is_verified = true` approved by an administrator are visible in public search and booking. | Doctor Directory Subsystem |
| **BR-14** | License Transparency | Doctor practice certificate numbers (CCHN) must be publicly displayed on doctor profiles. | Doctor Directory Subsystem |
| **BR-15** | Private Document Storage | Medical documents must reside in private S3 buckets. External access is granted exclusively via 15-minute signed URLs. | Storage Subsystem |
| **BR-16** | Lab Value Exactness | Numerical biomarker values extracted by OCR must retain exact precision and units as shown on the original scan. | Document Analysis Subsystem |
| **BR-17** | Hospital Operating Hours | In-clinic appointments operate strictly Monday–Saturday, 08:00–12:00 and 13:30–17:00 (Sundays closed). | Scheduling Subsystem |
| **BR-18** | Active Booking Limit | A patient cannot hold more than 2 concurrent appointments in `PENDING` payment status. | Scheduling Subsystem |
| **BR-19** | Mock Payment Lockdown | In production mode (`mock.enabled = false`), the mock payment gateway is permanently disabled. | Payment Gateway Subsystem |
| **BR-20** | Sequential Queue (STT) | Admission queue numbers (STT) are sequential per doctor per day starting at STT 01 at 08:00 AM. | Scheduling Subsystem |
| **BR-21** | Reschedule Policy | Patients may reschedule appointments up to 2 hours in advance without penalty. Max 2 reschedules per booking. | Scheduling Subsystem |
| **BR-22** | Cancellation Refund Policy | Patient refunds: >24h = 100%, 2-24h = 80%, <2h = 0%. Doctor cancellations always refund 100%. | Refund Subsystem |
| **BR-23** | Verified Review Policy | Only patients with verified `COMPLETED` appointments with a doctor can submit reviews for that doctor. | Feedback Subsystem |
| **BR-24** | PII Protection Compliance | Text inputs must be de-identified in compliance with Vietnam Decree 13/2023/NĐ-CP and HIPAA Safe Harbor. | Anonymization Subsystem |
| **BR-25** | Pre-Encounter Clinical Review | Doctors must review the pre-encounter inspection split-screen before completing an encounter. | Doctor Workstation |
| **BR-26** | BOLA/IDOR Record Protection | Doctors cannot access medical records of patients with whom they have no verified care relationship. | PatientAccessGuard |
| **BR-27** | Mandatory ICD-10 Coding | Finalized clinical encounters must include at least 1 primary standardized WHO ICD-10 diagnosis. | Doctor Workstation |
| **BR-28** | Prescription Direction Rigor | Prescription items must include dosage, administration route, frequency, and relationship to meals. | Outpatient Pharmacy |
| **BR-29** | Medical Record Immutability | Finalized clinical encounter records are legally immutable. Alterations require a formal addendum. | EMR Subsystem |
| **BR-30** | Doctor Cancel Full Refund | Any appointment cancellation initiated by a doctor triggers an automatic 100% full refund to the patient. | Refund Subsystem |
| **BR-31** | CCHN Immutability | A doctor cannot modify their CCHN license number once approved without administrative re-vetting. | Admin Governance |
| **BR-32** | Administrative Lockout | Locking a user account immediately invalidates all active authentication tokens and terminates web sessions. | Admin Governance |
| **BR-33** | AI Mode Administration | System-wide AI inference provider switching is strictly restricted to authenticated users with `ADMIN` role. | System Configuration |
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
- **FNV-1a:** Fowler-Noll-Vo 1a (Cryptographic non-cryptographic hash algorithm)
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
- **OTP:** One-Time Password
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
- **URI / URL:** Uniform Resource Identifier / Uniform Resource Locator
- **VAT:** Value Added Tax
- **WCAG:** Web Content Accessibility Guidelines
- **WHRF:** Weighted Hybrid Re-Ranking Formula

---

### 5.3 Common Requirements & Architectural Constraints
1. **Virtual Thread Execution Model:** All backend synchronous request dispatching shall leverage Java 21 Project Loom virtual threads (`spring.threads.virtual.enabled = true`), providing lightweight task-per-thread concurrency without thread-pool exhaustion.
2. **Deterministic Data Seeding:** The development and test environments shall be seeded with realistic medical profiles:
   - 12 verified clinical specialties covering major medical domains.
   - Comprehensive doctor profiles with real-world 1536-dimensional continuous embeddings derived from clinical case histories.
   - Standardized WHO ICD-10 diagnostic codes and MOH LOINC laboratory catalogs.
3. **Cross-Origin Resource Sharing (CORS):** Backend APIs shall strictly whitelist authorized frontend origins (`http://localhost:5173`, `http://localhost:3000`) and enforce credentials support (`allowCredentials = true`).
4. **Environment Isolation:** Secrets, API credentials, and private keys shall NEVER be hardcoded in application source code or committed to VCS. Configurations are managed exclusively through environment variables and `.env` template profiles.

---

### 5.4 Application Messages List

| Message Code | Message Type | Vietnamese User String (Display Text) | English Internal String / Trigger |
| :--- | :---: | :--- | :--- |
| `AUTH_LOGIN_SUCCESS` | Success | Đăng nhập thành công! Đang chuyển hướng... | Authentication successful; redirecting. |
| `AUTH_INVALID_CREDENTIALS` | Error | Email hoặc mật khẩu không chính xác. Vui lòng thử lại. | Invalid email or password provided. |
| `AUTH_EMAIL_NOT_VERIFIED` | Warning | Tài khoản chưa được kích hoạt email. Vui lòng kiểm tra hộp thư. | Account email verification required. |
| `AUTH_ACCOUNT_LOCKED` | Error | Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên. | User account has been deactivated. |
| `AUTH_LOGOUT_SUCCESS` | Info | Bạn đã đăng xuất thành công khỏi hệ thống. | Session terminated; tokens invalidated. |
| `AUTH_RESET_LINK_SENT` | Success | Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. | Password reset token email dispatched. |
| `AUTH_TOKEN_EXPIRED` | Error | Đường dẫn đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại. | Token expired or already consumed. |
| `TRG_EMERGENCY_ALERT` | Danger | CẢNH BÁO NGUY HIỂM: Triệu chứng có dấu hiệu cấp cứu! Gọi 115 ngay! | Acute Red-Flag symptoms detected (FAST/AMI). |
| `TRG_OOD_GUIDANCE` | Info | MediAssist-AI là trợ lý sàng lọc y khoa. Đối với thủ tục hành chính, vui lòng gọi 1900-xxxx. | Out-of-Domain query intercepted. |
| `VEC_NO_DOCTORS_FOUND` | Info | Không tìm thấy bác sĩ phù hợp với triệu chứng này. Hãy thử duyệt theo chuyên khoa. | Semantic vector search returned 0 matches. |
| `DOC_UPLOAD_SUCCESS` | Success | Tải hồ sơ thành công! AI đang tiến hành bóc tách kết quả... | Document uploaded to private S3 bucket. |
| `DOC_FILE_TOO_LARGE` | Error | Tệp tải lên vượt quá giới hạn 10MB. Vui lòng nén tệp. | Upload payload exceeds 10MB limit. |
| `DOC_INVALID_FORMAT` | Error | Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp PDF, PNG hoặc JPEG. | Unsupported file MIME type. |
| `BOK_SLOT_RESERVED` | Success | Đã giữ chỗ thành công! Vui lòng hoàn tất thanh toán trong 10 phút. | Slot held; pending payment checkout. |
| `BOK_SLOT_COLLISION` | Error | Khung giờ này vừa có người đặt. Vui lòng chọn một khung giờ khác. | Concurrent booking collision detected. |
| `BOK_HOURS_INVALID` | Error | Phòng khám chỉ tiếp nhận lịch Thứ 2 - Thứ 7 (08:00 - 17:00). Chủ Nhật nghỉ. | Booking outside clinic operational hours. |
| `PAY_PAYMENT_SUCCESS` | Success | Thanh toán thành công! Phiếu khám điện tử đã được phát hành. | Payment captured; status = CONFIRMED. |
| `PAY_PAYMENT_FAILED` | Error | Giao dịch thanh toán không thành công. Vui lòng kiểm tra lại thẻ. | Payment declined by issuing bank. |
| `REF_REFUND_FULL` | Success | Đã hủy lịch và hoàn trả 100% viện phí về tài khoản của bạn. | Full refund processed (>24h or Doctor cancel). |
| `REF_REFUND_PARTIAL` | Info | Đã hủy lịch. Bạn được hoàn trả 80% viện phí (khấu trừ 20% phí hành chính). | Partial 80% refund processed (2-24h). |
| `REF_REFUND_NONE` | Warning | Hủy lịch trong vòng 2 giờ trước giờ khám không được hoàn phí theo quy định. | Zero refund processed (<2h). |
| `ENC_FINALIZED_SUCCESS` | Success | Ca khám đã được hoàn tất và khóa hồ sơ bệnh án thành công. | Encounter finalized; EMR locked. |
| `ENC_ICD10_REQUIRED` | Error | Vui lòng chọn ít nhất một mã chẩn đoán ICD-10 trước khi hoàn tất ca khám. | Mandatory ICD-10 diagnosis missing. |
| `SEC_ACCESS_DENIED` | Error | Bạn không có quyền truy cập vào hồ sơ y tế này. | BOLA/IDOR access violation blocked. |

---

### 5.5 Requirements Traceability Matrix (RTM)

The Requirements Traceability Matrix maps every Functional Requirement (FR) to its corresponding Use Case, Database Migration, and Automated Test Case within the **306/306 passing test baseline**:

| Functional Req ID | Core Feature / Capability | Use Case Specification | Flyway DB Migration | Automated Verification Test Case | Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-AUTH-01** | Bcrypt Authentication | UC-COMM-01 | V1, V2 | `AuthServiceTest.testLogin_Success` | 100% PASS |
| **FR-AUTH-02** | Google OAuth2 SSO | UC-COMM-01 | V8 (`google_id`) | `OAuth2AuthenticationSuccessHandlerTest` | 100% PASS |
| **FR-AUTH-03** | Dual-Transport JWT | UC-COMM-01 | V1 | `JwtTokenProviderTest.testTokenGeneration` | 100% PASS |
| **FR-AUTH-04** | Email Verification Gate | UC-COMM-06 | V22 (`email_verified`) | `EmailVerificationTest.testGateEnforcement` | 100% PASS |
| **FR-AUTH-05** | SHA-256 Token Hash Reset | UC-COMM-05 | V21 (`token_hash`) | `PasswordResetServiceTest.testTokenHash` | 100% PASS |
| **FR-AUTH-06** | Brute-force Rate Limiting | UC-COMM-01 | V1 | `RateLimiterTest.testLockoutAfter5Failures` | 100% PASS |
| **FR-TRG-01** | Multi-Turn AI Triage | UC-PAT-01 | V1, V15 | `TriageServiceTest.testMultiTurnConversation` | 100% PASS |
| **FR-TRG-02** | Red-Flag 115 Interception | UC-PAT-02 | In-memory | `ClinicalQueryDefenseEngineTest.testRedFlags` | 100% PASS |
| **FR-TRG-03** | Vietnamese Slang Normalization | UC-PAT-02 | In-memory | `ClinicalQueryDefenseEngineTest.testSlang` | 100% PASS |
| **FR-TRG-04** | Vietnamese NegEx Splitting | UC-PAT-02 | In-memory | `VietnameseNegExTest.testNegationQuarantine` | 100% PASS |
| **FR-TRG-05** | SBAR Structured Reporting | UC-PAT-01 | V15 | `TriageServiceTest.testSbarJsonSchema` | 100% PASS |
| **FR-VEC-01** | 1536-d Continuous Embeddings | UC-PAT-03 | V3, V11 | `EmbeddingServiceTest.testDimension1536` | 100% PASS |
| **FR-VEC-02** | PostgreSQL HNSW Indexing | UC-PAT-03 | V11 (`m=24, ef=128`) | `DoctorSearchRepositoryTest.testHnswIndexScan` | 100% PASS |
| **FR-VEC-03** | Session-Level HNSW Tuning | UC-PAT-03 | V11 | `DoctorSemanticSearchServiceTest.testSession` | 100% PASS |
| **FR-VEC-04** | WHRF-SOTA Re-ranking Engine | UC-PAT-03 | In-memory | `WhrfReRankingTest.testSigmoidSharpening` | 100% PASS |
| **FR-VEC-05** | Doctor Vetting Constraint | UC-PAT-03 | V2, V14 | `DoctorServiceTest.testVerifiedDoctorsOnly` | 100% PASS |
| **FR-VEC-06** | WHO ICD-10 Autocomplete | UC-DOC-06 | In-memory / V18 | `ClinicalOntologyServiceTest.testIcd10Search` | 100% PASS |
| **FR-VEC-07** | LOINC Lab Autocomplete | UC-DOC-07 | In-memory / V19 | `ClinicalOntologyServiceTest.testLoincSearch` | 100% PASS |
| **FR-VEC-08** | Top-K Min-Heap Selection | UC-PAT-03 | In-memory | `DoctorSemanticSearchServiceTest.testTopK` | 100% PASS |
| **FR-DOC-01** | Multimodal File Ingestion | UC-PAT-05 | V5 | `DocumentServiceTest.testUploadPDFAndImage` | 100% PASS |
| **FR-DOC-02** | SHA-256 Deduplication | UC-PAT-05 | V5 (`file_hash`) | `DocumentServiceTest.testDeduplication` | 100% PASS |
| **FR-DOC-03** | Private S3 Storage Path | UC-PAT-05 | V20 (`storage_path`) | `SupabaseStorageServiceTest.testPrivateBucket` | 100% PASS |
| **FR-DOC-04** | 15-Minute Signed URLs | UC-PAT-15 | V20 | `SupabaseStorageServiceTest.testSignedUrlTTL` | 100% PASS |
| **FR-DOC-05** | Vision AI Biomarker OCR | UC-PAT-06 | V5 | `GeminiVisionServiceTest.testBiomarkerTable` | 100% PASS |
| **FR-DOC-06** | Layperson Translation | UC-PAT-06 | V5 | `DocumentAnalysisServiceTest.testLayperson` | 100% PASS |
| **FR-BOK-01** | Hospital Hours Validation | UC-PAT-07 | V4 | `AppointmentServiceTest.testClinicHours` | 100% PASS |
| **FR-BOK-02** | Slot Concurrency Lock | UC-PAT-07 | V4, V16 | `AppointmentServiceTest.testDoubleBookingLock` | 100% PASS |
| **FR-BOK-03** | Sequential STT Allocation | UC-PAT-09 | V4 (`queue_number`) | `AppointmentServiceTest.testSequentialQueue` | 100% PASS |
| **FR-BOK-04** | Electronic Admission Slip | UC-PAT-09 | V4, V16 | `AppointmentServiceTest.testAdmissionTicket` | 100% PASS |
| **FR-BOK-05** | Calendar .ICS Export | UC-PAT-10 | Client | `CalendarExportTest.testIcsFormatting` | 100% PASS |
| **FR-BOK-06** | 2-Hour Reschedule Window | UC-PAT-12 | V4 | `AppointmentServiceTest.testReschedulePolicy` | 100% PASS |
| **FR-BOK-07** | Automated Policy Refund | UC-PAT-13 | V4, V7 | `AppointmentRefundServiceTest.testTiers` | 100% PASS |
| **FR-CLIN-01** | Doctor Daily Queue | UC-DOC-02 | V4 | `DoctorWorkstationTest.testTodayQueue` | 100% PASS |
| **FR-CLIN-02** | Split-Screen Pre-Check | UC-DOC-03 | V4, V5 | `DoctorWorkstationTest.testSplitScreen` | 100% PASS |
| **FR-CLIN-03** | BOLA IDOR Defense Guard | UC-DOC-04 | V4, V13 | `PatientAccessGuardTest.testCareRelationship` | 100% PASS |
| **FR-CLIN-04** | Vital Signs Recording | UC-DOC-05 | V6 (`vital_signs`) | `MedicalRecordServiceTest.testVitalSigns` | 100% PASS |
| **FR-CLIN-05** | Mandatory ICD-10 Finalize | UC-DOC-10 | V6, V18 | `MedicalRecordServiceTest.testIcd10Mandatory` | 100% PASS |
| **FR-CLIN-06** | Outpatient Prescriptions | UC-DOC-08 | V6, V9 | `PrescriptionServiceTest.testPrescribe` | 100% PASS |
| **FR-CLIN-07** | EMR Legal Immutability | UC-DOC-10 | V6 | `MedicalRecordServiceTest.testImmutability` | 100% PASS |
| **FR-CLIN-08** | Encounter Summary PDF | UC-DOC-12 | V6 | `PdfExportServiceTest.testEncounterPdf` | 100% PASS |
| **FR-ADM-01** | Executive Telemetry | UC-ADM-01 | V1, V4, V12 | `AdminTelemetryServiceTest.testOverview` | 100% PASS |
| **FR-ADM-02** | Doctor Credential Vetting | UC-ADM-03 | V2, V14 | `AdminDoctorServiceTest.testDoctorVetting` | 100% PASS |
| **FR-ADM-03** | AI FinOps Token Monitor | UC-ADM-06 | V12 | `AiFinOpsServiceTest.testCostCalculation` | 100% PASS |
| **FR-ADM-04** | AI Provider Failover Mode | UC-ADM-07 | V17 | `SystemConfigServiceTest.testAiModeToggle` | 100% PASS |
| **FR-ADM-05** | Immutable Audit Trail | UC-ADM-08 | V13 (`audit_logs`) | `AuditLogServiceTest.testImmutableLogging` | 100% PASS |
| **FR-ADM-06** | Flyway Migration Baseline | UC-ADM-09 | V1 - V22 | `DatabaseMigrationTest.testV1ToV22Baseline` | 100% PASS |

---

*This concludes the official Software Requirement Specification (SRS) for the MediAssist-AI Telehealth & Clinical AI Retrieval Platform (Version 2.2.0, Capstone Defense Baseline).*
"""

if __name__ == "__main__":
    print("Part 5 module loaded successfully. Character count:", len(get_content()))
