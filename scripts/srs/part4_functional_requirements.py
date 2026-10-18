# -*- coding: utf-8 -*-
"""
Part 4: 3. Functional Requirements
3.1 System Functional Overview
    3.1.1 Screens Flow (Website & Mobile State Machines)
    3.1.2 Screen Descriptions (Table 3.1.2 & Detailed 18 Screen Wireframe Specs SCR-01 to SCR-18)
    3.1.3 Screen Authorization (Table 3.1.3 RBAC Matrix)
    3.1.4 Non-Screen Functions (Table 3.1.4 NSF-01 to NSF-06)
    3.1.5 Physical Entity Relationship Diagram (Mermaid ERD + 17-Table Data Dictionary)
3.2 Applications for Patients, Doctors, and Admins
    3.2.1 Welcome & Authentication Flow (FR-AUTH)
    3.2.2 Main Hub & Navigation Flow
    3.2.3 Clinical AI Triage & Defensive Screening Subsystem (FR-TRG + NegEx Algorithm)
    3.2.4 Semantic Vector Search & Doctor Matching Subsystem (FR-VEC + WHRF-SOTA Algorithm)
    3.2.5 Multimodal Medical Document Ingestion & LOINC Interpretation (FR-DOC)
    3.2.6 O2O In-Clinic Scheduling & Multi-Channel Payment (FR-BOK + Refund Engine)
    3.2.7 Doctor Clinical Workstation Subsystem (FR-CLIN + PatientAccessGuard + ICD-10/LOINC Autocomplete)
    3.2.8 Enterprise Admin Governance & AI FinOps Subsystem (FR-ADM + AI Mode Router)
Derived 100% factually from actual MediAssist-AI codebase.
"""

def get_content():
    return """
---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 System Functional Overview

#### 3.1.1 Screens Flow

The user interface transitions within MediAssist-AI are governed by a deterministic finite state machine operating across the three user roles (`PATIENT`, `DOCTOR`, `ADMIN`) configured in `frontend/src/App.tsx`:

```mermaid
stateDiagram-v2
    [*] --> SCR01_LandingPage: Public Navigation

    state "Authentication & Onboarding Flow" as AuthFlow {
        SCR01_LandingPage --> SCR02_LoginPage: Click "Đăng Nhập" / "Bắt Đầu"
        SCR02_LoginPage --> SCR03_ForgotPassword: Click "Quên Mật Khẩu"
        SCR03_ForgotPassword --> SCR04_ResetPassword: Click Link Trong Email
        SCR04_ResetPassword --> SCR02_LoginPage: Đổi Mật Khẩu Thành Công
        SCR02_LoginPage --> SCR05_VerifyEmail: Đăng Ký Tài Khoản Mới
        SCR05_VerifyEmail --> SCR02_LoginPage: Kích Hoạt Token Thành Công
        SCR02_LoginPage --> SCR06_OAuth2Callback: Sign in with Google Redirect
        SCR06_OAuth2Callback --> RoleRouting: Token Ingested
    }

    state "Role-Based Protected Routing" as RoleRouting {
        SCR02_LoginPage --> SCR07_PatientDashboard: Role = PATIENT
        SCR02_LoginPage --> SCR12_DoctorWorkstation: Role = DOCTOR
        SCR02_LoginPage --> SCR15_AdminDashboard: Role = ADMIN
    }

    state "Patient Portal Flow (/patient/*)" as PatientFlow {
        SCR07_PatientDashboard --> SCR08_SymptomTriage: Click "Sàng Lọc Triệu Chứng"
        SCR08_SymptomTriage --> SCR09_DoctorSearch: Matched Specialty / Search Doctors
        SCR07_PatientDashboard --> SCR09_DoctorSearch: Click "Tìm Bác Sĩ"
        SCR09_DoctorSearch --> BookingModal: Click "Đặt Lịch Khám"
        BookingModal --> SCR11_PaymentSuccess: Checkout & Payment Complete
        SCR07_PatientDashboard --> SCR10_DocumentSummarizer: Click "Tóm Tắt Xét Nghiệm"
        SCR10_DocumentSummarizer --> SplitViewModal: Click "Xem Phân Tích"
        SCR11_PaymentSuccess --> SCR07_PatientDashboard: Quay Lại Dashboard
    }

    state "Doctor Workstation Flow (/doctor/*)" as DoctorFlow {
        SCR12_DoctorWorkstation --> EncounterModal: Click "Gọi Khám Tiếp" (STT Queue)
        EncounterModal --> SCR12_DoctorWorkstation: Finalize Encounter (ICD-10 / Prescription)
        SCR12_DoctorWorkstation --> SCR13_DoctorPatientRecords: Click "Hồ Sơ Bệnh Nhân"
        SCR12_DoctorWorkstation --> SCR14_DoctorProfile: Click "Hồ Sơ & Lịch Khám"
    }

    state "Admin Operations Flow (/admin/*)" as AdminFlow {
        SCR15_AdminDashboard --> SCR16_DoctorManagement: Click "Quản Lý Bác Sĩ & Thẩm Định"
        SCR15_AdminDashboard --> SCR17_UserManagement: Click "Quản Lý Người Dùng"
        SCR15_AdminDashboard --> SCR18_SupervisionConsole: Click "Giám Sát Lịch Hẹn & AI FinOps"
    }
```

---

#### 3.1.2 Screen Descriptions

##### Table 3.1.2 : Website Screen Descriptions

| # | Feature Domain | Screen Name | Route Path (`frontend/src/App.tsx`) | Description & Purpose |
| :-: | :--- | :--- | :--- | :--- |
| **1** | Landing | Landing Page | `/`, `/landing` (`LandingPage.tsx`) | Modern Telehealth landing page with Hero section, live triage simulator, 4-step workflow, and doctor quick-search. |
| **2** | Authentication | Sign-In & Registration | `/login` (`LoginPage.tsx`) | Dual-transport JWT authentication via Email/Password or Google OAuth2, with embedded registration tab and demo quick login drawer. |
| **3** | Authentication | Forgot Password | `/forgot-password` (`ForgotPasswordPage.tsx`) | Password recovery entry point generating single-use SHA-256 hashed reset token with 15-minute TTL (BE-5). |
| **4** | Authentication | Reset Password | `/reset-password` (`ResetPasswordPage.tsx`) | Secure password reset submission validating token hash and enforcing Bcrypt cost 12 complexity. |
| **5** | Authentication | Verify Email Gate | `/verify-email` (`VerifyEmailPage.tsx`) | Account activation gate validating verification token and enabling clinical features (Flyway V22). |
| **6** | Authentication | OAuth2 Callback | `/oauth2/callback` (`OAuth2CallbackPage.tsx`) | Captures Google authorization redirect, stores JWT in state/cookie, and routes user to target role dashboard. |
| **7** | Patient Hub | Patient Dashboard | `/patient` (`PatientDashboard.tsx`) | Patient central hub displaying upcoming appointments, clinical reminders, remaining AI quota, and quick actions. |
| **8** | Clinical AI | Symptom Triage | `/patient/triage` (`SymptomTriagePage.tsx`) | Conversational symptom evaluation with 5-stage defense engine, 115 emergency banner, and structured SBAR report card. |
| **9** | Clinical Discovery | Doctor Search & Booking | `/patient/doctors` (`DoctorSearchPage.tsx`) | pgvector semantic similarity search with WHRF re-ranking, specialty filters, doctor profiles, and `BookingModal`. |
| **10** | Multimodal AI | Document Summarizer | `/patient/documents` (`DocumentSummarizerPage.tsx`) | PDF/Image upload (<10MB), SHA-256 deduplication, quota management, and Split-View biomarker extraction table with LOINC. |
| **11** | Billing & Receipt | Payment Success | `/payment/success` (`PaymentSuccessPage.tsx`) | Payment settlement confirmation, transaction code, digital receipt, and electronic admission ticket preview. |
| **12** | Doctor Workstation | Clinical Workstation | `/doctor` (`DoctorDashboard.tsx`) | Attending doctor daily patient queue (sequential STT), call-next dispatcher, and Split-Screen Clinical Encounter Modal. |
| **13** | Doctor Clinical | Patient Records | `/doctor/patients` (`DoctorPatientRecordsPage.tsx`) | Longitudinal patient medical records accessible strictly under care-relationship `PatientAccessGuard` (BOLA/IDOR). |
| **14** | Doctor Practice | Profile & Schedule | `/doctor/profile` (`DoctorProfilePage.tsx`) | Doctor bio, consultation fee, clinic room, and weekly recurring shift matrix (`doctor_schedule_slots`). |
| **15** | Admin Operations | Executive Dashboard | `/admin` (`AdminDashboard.tsx`) | Platform telemetry: active users, total consultations, system health, AI token usage, and provider mode toggle (BE-1). |
| **16** | Admin Vetting | Doctor Management | `/admin/doctors` (`DoctorManagementPage.tsx`) | Doctor directory management, CCHN license vetting queue (`POST /vet`), and batch vector embedding sync. |
| **17** | Admin Access | User Management | `/admin/users` (`UserManagementPage.tsx`) | User directory, role filtering, account status toggle, and mandatory reason locking (`is_active = false`). |
| **18** | Admin Oversight | Supervision Console | `/admin/appointments`, `/triage`, `/specialties`, `/audit-logs` | Master appointment supervision with force-cancel override, triage session audit, specialty CRUD, and immutable security audit logs. |

---

#### 3.1.3 Role-Based Screen Authorization Matrix

##### Table 3.1.3 : Screen Authorization

| # | Screen Name | Route Path | Guest | Patient | Doctor | Admin | Security Guard & Enforcement Mechanism |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| **1** | Landing Page | `/` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public unauthenticated access. |
| **2** | Login & Registration | `/login` | **ALLOW** | **REDIRECT** | **REDIRECT** | **REDIRECT** | Authenticated users auto-redirected to designated dashboard. |
| **3** | Forgot Password | `/forgot-password` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public route; token generated and emailed. |
| **4** | Reset Password | `/reset-password` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Validates SHA-256 token hash server-side. |
| **5** | Verify Email Gate | `/verify-email` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public token redemption endpoint. |
| **6** | OAuth2 Callback | `/oauth2/callback` | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Ingests JWT from Google OAuth2 redirect. |
| **7** | Patient Dashboard | `/patient` | DENY | **ALLOW** | DENY | **ALLOW** | `ProtectedRoute(allowedRoles=['PATIENT', 'ADMIN'])`. |
| **8** | Symptom Triage | `/patient/triage` | DENY | **ALLOW** | DENY | **ALLOW** | Protected patient route; enforces email verification. |
| **9** | Doctor Search & Booking | `/patient/doctors` | DENY | **ALLOW** | DENY | **ALLOW** | Protected patient route; slot booking checks verified account. |
| **10** | Document Summarizer | `/patient/documents` | DENY | **ALLOW** | DENY | **ALLOW** | Protected patient route; checks remaining AI quota. |
| **11** | Payment Success | `/payment/success` | DENY | **ALLOW** | DENY | **ALLOW** | Protected callback verification route. |
| **12** | Doctor Workstation | `/doctor` | DENY | DENY | **ALLOW** | DENY | `ProtectedRoute(allowedRoles=['DOCTOR'])` with `is_verified = true`. |
| **13** | Doctor Patient Records | `/doctor/patients` | DENY | DENY | **ALLOW\*** | DENY | **`PatientAccessGuard`**: Requires active appointment relationship. |
| **14** | Doctor Profile & Schedule | `/doctor/profile` | DENY | DENY | **ALLOW** | DENY | Protected doctor route. |
| **15** | Admin Dashboard | `/admin` | DENY | DENY | DENY | **ALLOW** | `ProtectedRoute(allowedRoles=['ADMIN'])`. |
| **16** | Doctor Management | `/admin/doctors` | DENY | DENY | DENY | **ALLOW** | Protected admin route; `@PreAuthorize("hasRole('ADMIN')")`. |
| **17** | User Management | `/admin/users` | DENY | DENY | DENY | **ALLOW** | Protected admin route. |
| **18** | Supervision Console | `/admin/*` | DENY | DENY | DENY | **ALLOW** | Protected admin route. |

*\*Access strictly guarded by `PatientAccessGuard` verifying an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment) and logging `VIEW_PATIENT_RECORD` to `audit_logs`.*

---

#### 3.1.4 Non-Screen Functions

##### Table 3.1.4 : Non-Screen Functions

| # | Function ID | Function Name | Trigger Mechanism | Background Architecture | Algorithmic Process & Responsibilities |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `NSF-01` | Transactional Email Dispatch | Spring `@TransactionalEventListener(phase = AFTER_COMMIT)` | `@Async("mailExecutor")` (4 Core, 10 Max, 500 Queue) | Asynchronously dispatches account verification links, password reset tokens, and appointment tickets via Mailpit (dev) or SMTP STARTTLS (prod). |
| **2** | `NSF-02` | Slot Hold Expiration & Lock Release | Scheduled Cron `@Scheduled(fixedRate = 60000)` | Spring TaskScheduler on Loom Virtual Thread | Identifies appointments in `UNPAID` status exceeding 10-minute hold window, marks `CANCELLED`, and releases slot back to pool. |
| **3** | `NSF-03` | Vector Index Session Tuning | Invoked immediately before `DoctorSemanticSearchService` query | Thread-local JDBC Connection Session | Injects `SET LOCAL hnsw.ef_search = 120`, `SET LOCAL enable_seqscan = off`, and `SET LOCAL work_mem = '64MB'` to force HNSW index scan. |
| **4** | `NSF-04` | Flyway Database Migration Runner | Spring Boot Application Startup (`onApplicationEvent`) | Flyway Core Engine prior to JPA EntityManager initialization | Sequentially validates and applies migration scripts `V1` through `V22`, maintaining schema integrity in `flyway_schema_history`. |
| **5** | `NSF-05` | Multimodal OCR Vision Pipeline | Dispatched upon multipart upload to `/api/v1/documents/analyze` | Project Loom Task-per-Thread | Streams document bytes to Google Gemini 1.5 Flash Vision, extracts biomarker JSON, matches LOINC codes, and saves to `document_analyses`. |
| **6** | `NSF-06` | Cache Invalidation & Telemetry Aggregator | Triggered by review submission, schedule update, or AI API call | Redis Pub/Sub & Caffeine Cache Eviction | Invalidates stale doctor slot caches (`doctor:slots:*`), re-computes rating averages, and aggregates daily AI token expenditures into `ai_token_usage`. |

---

#### 3.1.5 Physical Entity Relationship Diagram

##### Data Dictionary: 17 Core PostgreSQL Tables (Flyway V1 – V22 Baseline)

1. **`users`:** Stores authentication identity, hashed credentials, roles, and account status.
   - `id` (UUID, PK), `email` (VARCHAR(255), UK), `password_hash` (VARCHAR(255)), `full_name` (VARCHAR(150)), `phone_number` (VARCHAR(20), UK), `role` (VARCHAR(20): `PATIENT`, `DOCTOR`, `ADMIN`), `is_active` (BOOLEAN), `email_verified` (BOOLEAN), `google_id` (VARCHAR(255), UK), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
2. **`patient_profiles`:** Stores demographic, physiological, and clinical passport metadata.
   - `id` (UUID, PK), `user_id` (UUID, FK, UK), `date_of_birth` (DATE), `gender` (VARCHAR(20)), `blood_type` (VARCHAR(10)), `allergies` (TEXT), `emergency_contact` (VARCHAR(50)), `medical_history_summary` (TEXT), `remaining_ai_quota` (INTEGER), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
3. **`doctor_profiles`:** Stores medical credentials, CCHN license, clinical bio, and 1536-d vector embeddings.
   - `id` (UUID, PK), `user_id` (UUID, FK, UK), `specialty_id` (UUID, FK), `license_number` (VARCHAR(255), UK), `academic_title` (VARCHAR(50)), `bio` (TEXT), `bio_embedding` (VECTOR(1536)), `consultation_fee` (NUMERIC(10,2)), `rating_avg` (DOUBLE PRECISION), `review_count` (INTEGER), `is_verified` (BOOLEAN), `clinic_room` (VARCHAR(100)), `hospital_name` (VARCHAR(150)), `hospital_address` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
4. **`specialties`:** Master taxonomy of clinical specialties.
   - `id` (UUID, PK), `name` (VARCHAR(150), UK), `code` (VARCHAR(50), UK), `description` (TEXT), `icon_name` (VARCHAR(50)), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
5. **`doctor_specialties`:** Many-to-many join table for doctor sub-specialties.
   - `id` (UUID, PK), `doctor_id` (UUID, FK), `specialty_id` (UUID, FK).
6. **`doctor_schedule_slots`:** Master shift configuration templates per doctor.
   - `id` (UUID, PK), `doctor_id` (UUID, FK), `day_of_week` (VARCHAR(20)), `start_time` (TIME), `end_time` (TIME), `is_available` (BOOLEAN), `max_patients` (INTEGER), `created_at` (TIMESTAMPTZ).
7. **`appointments`:** Central transaction entity storing appointments and comprehensive clinical encounter records.
   - `id` (UUID, PK), `appointment_code` (VARCHAR(50), UK), `patient_id` (UUID, FK), `doctor_id` (UUID, FK), `scheduled_start` (TIMESTAMP), `scheduled_end` (TIMESTAMP), `status` (VARCHAR(30): `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `cancellation_reason` (TEXT), `consultation_notes` (TEXT), `queue_number` (VARCHAR(20)), `clinic_room` (VARCHAR(100)), `chief_complaint` (TEXT), `vital_signs_json` (TEXT), `icd10_code` (VARCHAR(50)), `icd10_name` (VARCHAR(255)), `prescription_json` (TEXT), `treatment_plan` (TEXT), `follow_up_date` (DATE), `fee_amount` (NUMERIC(12,2)), `payment_status` (VARCHAR(30): `UNPAID`, `PAID`, `REFUNDED`), `medical_document_id` (UUID, FK), `triage_session_id` (UUID, FK), `checked_in_at` (TIMESTAMP), `version` (BIGINT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
8. **`triage_sessions`:** AI symptom triage sessions and SBAR clinical reports.
   - `id` (UUID, PK), `user_id` (UUID, FK), `chief_complaint` (TEXT), `raw_symptoms` (TEXT), `sbar_summary` (TEXT), `urgency_level` (VARCHAR(20): `ROUTINE`, `URGENT`, `EMERGENCY`), `recommended_specialty_id` (UUID, FK), `red_flags_detected` (BOOLEAN), `clarifying_turns_json` (TEXT), `created_at` (TIMESTAMPTZ).
9. **`medical_documents`:** Ingested lab scans and object storage keys.
   - `id` (UUID, PK), `patient_id` (UUID, FK), `file_name` (VARCHAR(255)), `file_type` (VARCHAR(50)), `file_size` (BIGINT), `file_hash` (VARCHAR(64)), `storage_path` (VARCHAR(255)), `status` (VARCHAR(30)), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
10. **`document_analyses`:** Structured OCR extractions, biomarker indicators, and LOINC codes.
    - `id` (UUID, PK), `document_id` (UUID, FK, UK), `biomarkers_json` (TEXT), `abnormal_indicators_json` (TEXT), `layperson_summary` (TEXT), `loinc_codes_json` (TEXT), `recommended_specialty_id` (UUID, FK), `created_at` (TIMESTAMPTZ).
11. **`payment_transactions`:** Financial ledger recording fees, refunds, and gateway interactions.
    - `id` (UUID, PK), `transaction_code` (VARCHAR(50), UK), `user_id` (UUID, FK), `appointment_id` (UUID, FK), `order_type` (VARCHAR(30): `APPOINTMENT_FEE`, `QUOTA_PURCHASE`), `amount` (NUMERIC(12,2)), `currency` (VARCHAR(10)), `status` (VARCHAR(30): `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`), `payment_method` (VARCHAR(30): `STRIPE`, `MOCK`), `gateway_transaction_id` (VARCHAR(255)), `metadata_json` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
12. **`password_reset_tokens`:** Single-use SHA-256 hashed password recovery tokens.
    - `id` (UUID, PK), `user_id` (UUID, FK), `token_hash` (VARCHAR(64)), `expires_at` (TIMESTAMP), `consumed` (BOOLEAN), `consumed_at` (TIMESTAMP), `created_at` (TIMESTAMPTZ).
13. **`email_verification_tokens`:** Account activation verification tokens.
    - `id` (UUID, PK), `user_id` (UUID, FK), `token` (VARCHAR(255), UK), `expires_at` (TIMESTAMP), `created_at` (TIMESTAMPTZ).
14. **`notifications`:** User notification alerts.
    - `id` (UUID, PK), `user_id` (UUID, FK), `title` (VARCHAR(255)), `message` (TEXT), `type` (VARCHAR(50)), `is_read` (BOOLEAN), `metadata_json` (TEXT), `created_at` (TIMESTAMPTZ).
15. **`doctor_reviews`:** Post-consultation patient feedback and ratings.
    - `id` (UUID, PK), `appointment_id` (UUID, FK, UK), `patient_id` (UUID, FK), `doctor_id` (UUID, FK), `rating` (INTEGER), `comment` (TEXT), `created_at` (TIMESTAMPTZ).
16. **`audit_logs`:** Immutable security audit trails and IDOR monitoring.
    - `id` (UUID, PK), `user_id` (UUID, FK), `action` (VARCHAR(100): `VIEW_PATIENT_RECORD`, `USER_LOGIN`...), `entity_type` (VARCHAR(50)), `entity_id` (UUID), `ip_address` (VARCHAR(45)), `details_json` (TEXT), `created_at` (TIMESTAMPTZ).
17. **`ai_token_usage`:** FinOps telemetry recording API token consumption and costs.
    - `id` (UUID, PK), `provider` (VARCHAR(50): `GEMINI`, `OPENAI`, `OPENROUTER`), `model_name` (VARCHAR(100)), `prompt_tokens` (INTEGER), `completion_tokens` (INTEGER), `estimated_cost_usd` (NUMERIC(10,6)), `created_at` (TIMESTAMPTZ).

---

### 3.2 Applications for Patients, Doctors, and Admins

#### 3.2.1 Welcome & Authentication Flow (FR-AUTH)

##### 3.2.1.1 Splash & Welcome Page (`SCR-01`)
- **Function Description:** Modern clinical landing page introducing the MediAssist-AI ecosystem, featuring the live triage simulator, 4-step O2O workflow, and quick physician search.
- **Function Trigger:** User visits `/` or `/landing`.
- **UI Elements & Navigation:**
  * Search Bar: Enter symptom query -> triggers client-side triage simulator or redirects to `/patient/doctors`.
  * "Bắt Đầu Sàng Lọc Ngay" button -> routes to `/patient/triage`.
  * "Tìm Bác Sĩ Chuyên Khoa" button -> routes to `/patient/doctors`.
  * "Đăng Nhập" / "Đăng Ký" buttons -> route to `/login`.

##### 3.2.1.2 Sign-In Page (Email & Password - `SCR-02`)
- **Function Description:** Primary authentication screen supporting dual-transport JWT credentials verification, password visibility toggling, and demo role quick-login.
- **Function Trigger:** Navigated from landing page or unauthenticated route intercept.
- **UI Controls Table:**

| # | Control Name | Type | Format / Constraints | Description | Action / Event |
| :-: | :--- | :--- | :--- | :--- | :--- |
| 1 | `email` | Input Text | Valid email regex (RFC 5322) | Registered account email | Validates format on blur |
| 2 | `password` | Input Password | Min 8 chars, 1 uppercase, 1 digit | Account secret password | Toggles eye visibility icon |
| 3 | `rememberMe` | Checkbox | Boolean | Persist session state | Saves preference in client |
| 4 | `loginBtn` | Action Button | Text "Đăng Nhập" | Submits auth credentials | Dispatches `POST /api/v1/auth/login` |
| 5 | `googleBtn` | Action Button | SVG Google Icon | Triggers Google SSO | Navigates to `/login/oauth2/code/google` |
| 6 | `forgotLink` | Navigation Link | Text "Quên mật khẩu?" | Opens recovery flow | Routes to `/forgot-password` |

- **Algorithmic Logic:**
  * Bcrypt password verification: $\text{verify}(\text{rawPassword}, \text{storedHash})$ computed with cost factor 12.
  * Brute-force protection: Tracks failed attempts in `users.failed_login_attempts`. If $\ge 5$, sets `locked_until = \text{now}() + 15\text{ minutes}$ and throws `AppException(HttpStatus.LOCKED, "ACCOUNT_LOCKED")`.
  * Dual-Transport issuance: Generates signed JWT (HMAC-SHA256, 24h TTL) injected into `Set-Cookie: jwt_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api` and returned in `AuthResponse` body.

##### 3.2.1.3 Google OAuth2 Sign-In Flow (`SCR-06`)
- **Function Description:** Single Sign-On (SSO) authorization code exchange handler.
- **Function Trigger:** Google redirects browser to `/oauth2/callback?token=...`.
- **Algorithmic Logic:** Backend exchanges authorization code with Google OAuth2 server, queries user by `google_id`, auto-creates user record with role `PATIENT` if absent (Flyway V8), issues JWT, and redirects client.

##### 3.2.1.4 Email Verification Gate (`SCR-05`)
- **Function Description:** Account activation gate enforcing verified email ownership before permitting clinical booking or document operations.
- **Function Trigger:** User clicks activation link in email client (`/verify-email?token=...`).
- **Algorithmic Logic:** Backend calls `POST /api/v1/auth/verify-email`, searches `email_verification_tokens`, updates `users.email_verified = true`, and purges consumed token (Flyway V22).

##### 3.2.1.5 Forgot & Reset Password Flow (`SCR-03`, `SCR-04`)
- **Function Description:** Secure password recovery using single-use SHA-256 token hashing.
- **Function Trigger:** User requests recovery via `/forgot-password` and redeems via `/reset-password?token=...`.
- **Algorithmic Logic (BE-5 / Flyway V21):**
  1. Backend generates 32-byte cryptographically secure random token: $\text{rawToken} \leftarrow \text{SecureRandom}$.
  2. Computes SHA-256 hash: $\text{tokenHash} = \text{SHA-256}(\text{rawToken})$.
  3. Persists $\text{tokenHash}$ into `password_reset_tokens` with $\text{expires\_at} = \text{now}() + 15\text{ minutes}$.
  4. Dispatches email containing $\text{rawToken}$. Plaintext token is NEVER persisted in database.
  5. Upon reset submission, hashes inbound token and verifies: $\text{expires\_at} > \text{now}() \land \text{consumed} = \text{false}$.
  6. Replaces password with Bcrypt hash and sets $\text{consumed} = \text{true}$.

---

#### 3.2.2 Main Hub & Navigation Flow

- **Role-Based Home Dashboards (`SCR-07`, `SCR-12`, `SCR-15`):** Dynamically rendered based on decoded JWT claims:
  * `PATIENT` -> `/patient` (`PatientDashboard.tsx`)
  * `DOCTOR` -> `/doctor` (`DoctorDashboard.tsx`)
  * `ADMIN` -> `/admin` (`AdminDashboard.tsx`)
- **Universal Top Header & Navigation Drawer:** Renders clinical notification bell (`GET /api/v1/notifications/unread-count`), user avatar, role badge, language selector, and "Đăng Xuất" trigger (`POST /api/v1/auth/logout`).

---

#### 3.2.3 Clinical AI Triage & Defensive Screening Subsystem (FR-TRG)

##### 3.2.3.1 Conversational Triage Chat Interface (`SCR-08`)
- **Function Description:** Multi-turn conversational interface evaluating patient symptoms, asking clarifying questions, and generating SBAR clinical handoff reports.
- **Function Trigger:** Patient sends symptom query on `/patient/triage`.
- **API Endpoint:** `POST /api/v1/triage/assess` with `TriageRequest(symptoms, conversationHistory, age, gender)`.

##### 3.2.3.2 5-Stage Clinical Query Defense Engine & Vietnamese NegEx Algorithm
All inbound symptom queries pass through the 5-Stage Defense Engine in `ClinicalQueryDefenseEngine.java`:

```mermaid
graph TD
    Raw[Inbound Raw Patient Query] --> Stage1[Stage 1: Acute Red-Flag Emergency Regex]
    Stage1 -->|Emergency Match| EmergencyLockout[Trigger 115 Emergency Hotline Lockout]
    Stage1 -->|Pass| Stage2[Stage 2: Vietnamese Slang & Teen-Code Normalizer]
    Stage2 --> Stage3[Stage 3: Vietnamese NegEx Clause-Level Splitting]
    Stage3 --> Stage4[Stage 4: Out-of-Domain OOD Intent Gating]
    Stage4 -->|OOD Match| AdminGuidance[Return Hospital Administrative Guidance]
    Stage4 -->|Pass| Stage5[Stage 5: Compound Multi-Symptom Decomposition]
    Stage5 --> Embedding[Pass Affirmative Symptoms to Vector Embedding]
    Stage3 -.->|Quarantine| NegatedStore[Quarantine Negated Symptoms: Zero False Specialist Routing]
```

1. **Stage 1 — Acute Red-Flag Emergency Regex:**
   Evaluates input against acute life-threatening medical patterns:
   - Stroke (FAST): `méo miệng|liệt nửa người|nói ngọng|mờ mắt đột ngột|yếu một bên tay`
   - Acute Myocardial Infarction: `đau thắt ngực|đè nặng sau xương ức|lan ra cánh tay trái|vã mồ hôi lạnh|khó thở dữ dội`
   - Anaphylaxis: `khó thở sau dùng thuốc|sưng phù môi họng|thắt nghẽn đường thở|mẩn ngứa toàn thân tím tái`
   - Severe Hemorrhage: `nôn ra máu tươi|ho ra máu sét đánh|đi ngoài phân đen như bã cà phê`
   *Action:* Immediately sets `isEmergency = true`, halts inference, and displays flashing red banner directing user to call **115**.
2. **Stage 2 — Vietnamese Slang & Teen-Code Normalization:**
   Maps colloquialisms and unaccented phrases:
   $\text{Normalize}(\text{text}) = \{\text{"ko"} \rightarrow \text{"không"}, \text{"bs"} \rightarrow \text{"bác sĩ"}, \text{"dau da day"} \rightarrow \text{"đau dạ dày"}, \text{"met"} \rightarrow \text{"mệt mỏi"}, \text{"sot cao"} \rightarrow \text{"sốt cao"}\}$
3. **Stage 3 — Vietnamese NegEx Clause-Level Negation Splitting:**
   Scans for negation triggers $T_{neg} \in \{\text{"không bị"}, \text{"chưa từng"}, \text{"không có"}, \text{"không sốt"}, \text{"không đau"}\}$. Splits query into:
   - Affirmative Clause $C_{aff}$: Symptoms present (passed to vector embedding).
   - Negated Clause $C_{neg}$: Symptoms explicitly denied (quarantined).
   *Example:* "Tôi bị đau tức ngực dữ dội nhưng không bị sốt" $\rightarrow C_{aff} = \text{"Tôi bị đau tức ngực dữ dội"}$ (routes to Cardiology), $C_{neg} = \text{"không bị sốt"}$ (quarantined to eliminate false routing to Pulmonology/Infectious Disease).
4. **Stage 4 — Out-of-Domain (OOD) Intent Gating:**
   Detects non-clinical administrative chatter (viện phí, giờ khám, bảo hiểm) and provides customer support hotline guidance.
5. **Stage 5 — Compound Multi-Symptom Decomposition:**
   Splits complex multi-symptom conjunctions (`đồng thời`, `kèm theo`, `và`) into distinct clinical facets.

##### 3.2.3.3 SBAR Report Generation & Emergency 115 Interception
- If acute symptoms detected, locks booking interface and highlights Hotline 115 calling button.
- If non-emergency, LLM outputs structured SBAR JSON (`Situation`, `Background`, `Assessment`, `Recommendation`) saved in `triage_sessions.sbar_summary`.

---

#### 3.2.4 Semantic Vector Search & Doctor Matching Subsystem (FR-VEC)

##### 3.2.4.1 Doctor Search Directory & Filter Controls (`SCR-09`)
- Natural language query input, specialty filter, consultation fee slider, star rating filter, and doctor result cards with match compatibility percentages.

##### 3.2.4.2 1536-Dimensional Continuous Embeddings & HNSW Graph Indexing
- **Vector Space:** `openai/text-embedding-3-small` generating 1536-dimensional continuous dense embeddings normalized to unit length ($\|v\|_2 = 1.0$).
- **HNSW Index:** Built on PostgreSQL 16 `doctor_profiles.bio_embedding` via Flyway V11:
  ```sql
  CREATE INDEX idx_doctor_bio_hnsw_verified ON doctor_profiles
  USING hnsw (bio_embedding vector_cosine_ops)
  WITH (m = 24, ef_construction = 128)
  WHERE is_verified = TRUE;
  ```
- **Session-Level Database Parameter Tuning:**
  Executed within transaction prior to similarity search in `DoctorSemanticSearchService.java`:
  ```sql
  SET LOCAL hnsw.ef_search = 120;
  SET LOCAL enable_seqscan = off;
  SET LOCAL work_mem = '64MB';
  ```
  Guarantees index scan execution plan and achieves **0.72ms** query latency with $> 99.95\%$ Recall.

##### 3.2.4.3 WHRF-SOTA Bounded Min-Heap Re-Ranking Algorithm
Candidates retrieved from HNSW index scan are processed through a Bounded Min-Heap executing the Weighted Hybrid Re-Ranking Formula (WHRF):

$$\text{FinalScore} = S_{dense} + 0.15 \cdot S_{sparse} + \Delta_{specialty} + W_{cred} \cdot \left(\frac{\text{Rating} - 3.0}{2.0}\right) + \Delta_{academic}$$

Where:
1. **Sigmoid Contrastive Sharpening:**
   $$S_{dense} = \frac{1}{1 + e^{-8.0 \cdot (\text{CosineSim} - 0.65)}}$$
   Amplifies subtle clinical differentiation above the 0.65 cosine threshold while dampening irrelevant matches.
2. **Sparse Lexical Overlap ($S_{sparse}$):** Jaccard/BM25 token overlap between patient query and doctor clinical keywords.
3. **Specialty Differential ($\Delta_{specialty}$):**
   $$\Delta_{specialty} = \begin{cases} +0.12 & \text{if candidate specialty matches recommended triage specialty} \\ -0.10 & \text{if candidate specialty contradicts clinical presentation} \\ 0.00 & \text{otherwise} \end{cases}$$
4. **Review Credibility Damper ($W_{cred}$):**
   $$W_{cred} = \frac{\log_{10}(\text{review\_count} + 1)}{\log_{10}(100)}$$
   Suppresses rating bias for doctors with very few reviews, preventing rating manipulation.
5. **Academic Credential Multiplier ($\Delta_{academic}$):**
   Prof (+0.08), Assoc Prof (+0.05), PhD / CKII (+0.03).

##### 3.2.4.4 In-Clinic Appointment Slot Booking Modal (`BookingModal.tsx`)
- Date picker (Monday through Saturday, Sundays disabled - BR-17).
- 30-minute consultation slots (08:00–12:00 and 13:30–17:00).
- Assigns sequential queue number: $\text{STT} = \text{String.format}("STT\ \%02d", \text{countToday} + 1)$ (BR-20).

---

#### 3.2.5 Multimodal Medical Document Ingestion & LOINC Interpretation (FR-DOC)

##### 3.2.5.1 Document Upload Portal & SHA-256 Deduplication (`SCR-10`)
- Validates file format (PDF, PNG, JPEG), file size ($\le 10\text{MB}$), and PDF pages ($\le 10$ pages) via `MedicalDocumentValidator`.
- Computes SHA-256 cryptographic hash: $\text{fileHash} = \text{SHA-256}(\text{fileBytes})$. If duplicate exists for patient, returns cached analysis without re-billing AI tokens (0 token, 0đ).

##### 3.2.5.2 Gemini 1.5 Flash Vision OCR & Biomarker Extraction Engine
- Ingests document image bytes and prompts Google Gemini 1.5 Flash Vision to extract structured JSON:
  * Biomarker test name, numerical value, unit, reference range, status (`NORMAL`, `ELEVATED`, `LOW`).
  * Standardized LOINC codes.
  * Layperson Vietnamese clinical summary.
  * Recommended specialist.
- Saves record in `document_analyses` table (Flyway V1, V5).

##### 3.2.5.3 Split-View Document Analysis Modal & LOINC Standardization
- Renders Split-Screen interface: Original scan viewer on left, structured biomarker table with LOINC codes on right.

##### 3.2.5.4 15-Minute HMAC Signed URLs via Private S3 Cloud Storage
- In accordance with Flyway V20 security hardening: Medical documents are stored strictly under internal keys (`storage_path`) in private Supabase S3 bucket `medical-documents`.
- External file access is issued strictly via temporary 15-minute HMAC-SHA256 signed URLs (`createSignedUrl(path, 900)`). Public URLs are permanently disabled.

##### 3.2.5.5 AI Analysis Quota Management & Package Purchase
- Each patient profile tracks `remaining_ai_quota`. Patients can purchase quota packages via `POST /api/v1/documents/quota/purchase` and Stripe / Mock checkout.

---

#### 3.2.6 O2O In-Clinic Scheduling & Multi-Channel Payment (FR-BOK)

##### 3.2.6.1 O2O Scheduling Engine & Concurrency Lock
- In-clinic consultations operate strictly Monday–Saturday, 08:00–12:00 and 13:30–17:00 (BR-17).
- Enforces slot conflict lock: Rejects concurrent booking collisions with `AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT")` (BR-18).
- Sequential STT allocation per doctor per day starting at STT 01 at 08:00 AM (BR-20).

##### 3.2.6.2 Multi-Channel Payment Processing
- `PaymentController.checkout`: Initializes Stripe Checkout Session or Mock Sandbox based on `app.payment.mock.enabled`.
- Production lockdown: In production (`mock.enabled = false`), mock verification throws `MOCK_PAYMENT_DISABLED` (Security Audit BE-10).
- Webhook signature verification: Verifies Stripe HMAC-SHA256 signature on `/api/v1/payments/webhook/stripe`.

##### 3.2.6.3 Electronic Patient Admission Slip (`AppointmentController.getTicket`)
- Generates digital admission ticket with Queue Number (`STT 05`), Clinic Room ("Phòng Khám 204"), Doctor Name, Google Maps coordinates, and fasting/preparation instructions.

##### 3.2.6.4 Appointment Rescheduling & Automated Refund Engine
- **Rescheduling (`PATCH /appointments/{id}/reschedule`):** Permitted up to 2 hours prior to scheduled appointment time (`PAST_DATE` - BR-21).
- **Automated Refund Calculation (`AppointmentRefundService.java` - BR-22):**
  $$\text{RefundAmount} = \begin{cases} 1.00 \times \text{Fee} & \text{if cancelled } > 24\text{ hours before appointment} \\ 0.80 \times \text{Fee} & \text{if cancelled between } 2 \text{ and } 24\text{ hours (20\% admin retention)} \\ 0.00 & \text{if cancelled } < 2\text{ hours before appointment} \\ 1.00 \times \text{Fee} & \text{if cancellation is doctor-initiated (unconditional 100\% refund)} \end{cases}$$

##### 3.2.6.5 Patient Arrival Check-In Protocol
- Patient or reception triggers `PATCH /api/v1/appointments/{id}/check-in`. Records `checked_in_at = now()`, advancing patient in doctor queue.

---

#### 3.2.7 Doctor Clinical Workstation Subsystem (FR-CLIN)

##### 3.2.7.1 Daily Sequential Patient Queue & Call-Next Dispatcher (`SCR-12`)
- Workstation renders patients scheduled today ordered by `queue_number ASC` (STT 01, STT 02...).
- Doctor clicks "Gọi Khám Tiếp" (`POST /api/v1/doctors/me/call-next`): Advances queue pointer, sets next patient's status to `IN_PROGRESS`, and opens Clinical Encounter Modal.

##### 3.2.7.2 Pre-Encounter Split-Screen Clinical Inspection Workspace
- Left pane renders high-resolution source lab scan via 15-minute signed URL.
- Right pane renders AI SBAR clinical summary and extracted biomarker table, allowing attending doctor to cross-examine evidence before calling patient into consultation room (BR-25).

##### 3.2.7.3 Broken Object Level Authorization (BOLA/IDOR) Defense via PatientAccessGuard
All requests to access patient clinical documents, lab files, or appointment histories are strictly validated by `PatientAccessGuard.java`:

```java
public void assertCanAccessPatient(UUID actorUserId, Role role, UUID patientId, String resource) {
    if (actorUserId == null || role == null) throw forbidden();
    switch (role) {
        case PATIENT -> {
            if (patientId == null || !actorUserId.equals(patientId)) throw forbidden();
        }
        case DOCTOR -> {
            if (patientId == null || !appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(
                    actorUserId, patientId, CARE_RELATIONSHIP_STATUSES)) throw forbidden();
            recordView(actorUserId, role, patientId, resource);
        }
        case ADMIN -> recordView(actorUserId, role, patientId, resource);
        default -> throw forbidden();
    }
}
```
*Enforcement:* A doctor CANNOT access a patient's records unless an appointment exists in `SCHEDULED`, `IN_PROGRESS`, or `COMPLETED` status. Every authorized access records an immutable `VIEW_PATIENT_RECORD` audit entry (BR-26).

##### 3.2.7.4 WHO ICD-10 & MOH Decision 7603/QĐ-BYT Autocomplete Engine
- Provides high-speed prefix search over standardized WHO ICD-10 codes (`GET /api/v1/clinical/ontology/icd10?query=...`) in $< 30\text{ms}$. Primary diagnosis code is mandatory for encounter finalization (BR-27).

##### 3.2.7.5 LOINC Lab Indicator Autocomplete Engine (Decision 3280/QĐ-BYT)
- Provides autocomplete search for standardized clinical laboratory test orders (`GET /api/v1/clinical/ontology/lab-indicators`).

##### 3.2.7.6 Outpatient Prescription Generator & EMR Legal Immutability Finalization
- Doctor submits `POST /api/v1/appointments/{id}/complete-clinical` with `ClinicalEncounterRequest`.
- Persists vital signs JSON, primary ICD-10 code/name, prescription JSON, treatment plan, and consultation notes directly on `appointments` table.
- Sets `status = COMPLETED`, locking the medical record as legally immutable (BR-29).
- Triggers `MeddiesPdfGeneratorService` to generate print-ready prescription PDF.

##### 3.2.7.7 Doctor Patient Historical Records & Follow-up Scheduling (`SCR-13`)
- View past encounters, vital signs history, and schedule in-clinic follow-up checkups (`POST /api/v1/appointments/follow-up`).

##### 3.2.7.8 Doctor Schedule Slots & Profile Management (`SCR-14`)
- Manage weekly consultation shift templates (`doctor_schedule_slots`) and update professional bio (triggers asynchronous vector re-embedding).

---

#### 3.2.8 Enterprise Admin Governance & AI FinOps Subsystem (FR-ADM)

##### 3.2.8.1 Executive Telemetry & System Health Dashboard (`SCR-15`)
- High-level platform KPIs: total registered accounts, active verified doctors, today's appointments, gross revenue, and infrastructure service health checks (`GET /api/v1/admin/stats`).

##### 3.2.8.2 Doctor CCHN Credential Vetting & Vector Sync (`SCR-16`)
- Inspect pending doctor license applications (`GET /api/v1/admin/doctors/pending`).
- Audit medical practice certificate (CCHN) and approve doctor for public directory (`POST /api/v1/admin/doctors/{id}/vet`).
- Trigger batch re-embedding synchronization (`POST /api/v1/admin/doctors/sync-vectors`).

##### 3.2.8.3 User Directory Management & Account Access Control (`SCR-17`)
- Search users, filter by role, and toggle account status (`PATCH /api/v1/admin/users/{id}/status`).
- Enforces mandatory 10-character reason when locking accounts (`is_active = false`). Terminating sessions immediately invalidates JWT tokens (BR-32).

##### 3.2.8.4 Clinical Specialty & Department Administration (`SCR-18c`)
- Create and organize medical specialties and department taxonomies (`POST /api/v1/admin/specialties`).

##### 3.2.8.5 Master Appointment Supervision & Force-Cancel Override (`SCR-18a`)
- Audit all appointments hospital-wide. Execute administrative force-cancel with automatic refund override during clinical emergencies or disputes (`PATCH /api/v1/admin/appointments/{id}/cancel`).

##### 3.2.8.6 AI Triage Supervision & SBAR Audit (`SCR-18b`)
- Inspect anonymized clinical triage logs and urgency distributions (`GET /api/v1/admin/triage-sessions`).

##### 3.2.8.7 AI FinOps Telemetry & Token Cost Projection
- Queries `ai_token_usage` table (Flyway V1, V18). Tracks prompt and completion tokens across Gemini 1.5 Flash, OpenAI Embeddings, and OpenRouter. Projects financial expenditure in USD and VNĐ (`AI_COST_VND_PER_USD = 25450`).

##### 3.2.8.8 System-Wide AI Provider Mode Toggle
- Restricts provider failover switching strictly to users with `ADMIN` role (`POST /api/v1/system/ai-mode/toggle` - Security Fix BE-1). Supports switching between Primary (Gemini), Secondary (OpenRouter), and Offline (Local Heuristics + FNV-1a Hashing).

##### 3.2.8.9 Security Audit Log Viewer & VIEW_PATIENT_RECORD Monitoring (`SCR-18d`)
- Searchable immutable audit trail table in `audit_logs` tracking authentication events, administrative overrides, and doctor patient document accesses (`VIEW_PATIENT_RECORD`).
"""

if __name__ == "__main__":
    print("Part 4 module loaded successfully. Character count:", len(get_content()))
