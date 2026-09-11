# MediAssist-AI Project Roadmap & Sprint Tracker

> **Project:** MediAssist-AI (FPT University Capstone Project - SE-AI)  
> **Team Structure:**
> - **Tech Lead (You):** System Architecture, Code Review, Core Security & Resilience, AI Engine.
> - **Dev 1 (Fullstack / Backend & Data):** Database, 2-Layer Cache (LRU + Redis), BullMQ, APIs.
> - **Dev 2 (Frontend Lead / UI-UX):** React SPA, Tailwind, Layouts, Chat UI, Document Viewer.
> - **Dev 3 (Doc & QA Specialist):** SRS, UML 2.0 Diagrams, Test Specifications, Load Test Plan.
>
> **Workflow Rule:** Strictly work on **one Milestone at a time**. Do not start Milestone 2 until all checklist items of Milestone 1 pass Tech Lead review and achieve Definition of Done (DoD).

---

## High-Level Milestone Overview

| Milestone | Phase Name | Status | Git Branch / Tag | Focus Area |
| :--- | :--- | :--- | :--- | :--- |
| **Milestone 1** | **Project Foundation, 2-Layer Cache & Resilience Skeleton** | 🟢 **COMPLETED** | Tag `v1.0.0-m1` (`master`) | Docker, Postgres(pgvector), Redis, L1/L2 Cache, Graceful Shutdown, Auth, Layouts, SRS |
| **Milestone 2** | **Core Medical & Booking Workflow** | 🟢 **COMPLETED** | Tag `v2.0.0-m2` (`master`) | Doctor schedules, Admin verification, Booking CRUD, Concurrency guard, Cache invalidation |
| **Milestone 3** | **AI Symptom Triage & Semantic Match** | 🟢 **COMPLETED** | `feature/milestone-3-ai-triage` | Chatbot UI, Guardrail prompts, pgvector semantic search, Rate limiters |
| **Milestone 4** | **Multimodal Medical Record Summarizer & Hospital EMR**| 🟢 **COMPLETED** | `feature/hospital-grade-expansion` | PDF OCR analysis, Cosine doctor match, EMR Passport (BHYT/CCCD/Allergies), Clinical Workstation, ICD-10, e-Prescription |
| **Milestone 5** | **Zero-Trust Security, Anti-Brute Force Lockout & Rate Limiting** | 🟢 **COMPLETED** | `feature/milestone-5-security-zero-trust` | Account Lockout (5 attempts -> 15 min lock), Flyway V3, Zero-Trust Login-First (401), Redis Rate Limiting (IP & User), Dual-Tab Auth UI |
| **Milestone 6** | **Commercial Billing, MediPass VIP Subscriptions & Payment Gateway** | 🟡 **IN PROGRESS** | `feature/milestone-6-commercial-billing` | Telehealth consultation fees (85/15 split), Escrow holding/refunds, MediPass VIP subscription (149k/mo), VietQR dynamic & VNPay Sandbox |
| **Milestone 7** | **High-Load Testing, CI/CD & Final Defense** | ⚪ Planned | `feature/milestone-7-load-defense` | k6 Load Test (500+ VU), Jest/Playwright (≥70%), Docker Nginx HTTPS, Defense Docs |



---

## Detailed Breakdown: MILESTONE 1 — Foundation, 2-Layer Cache & Resilience Skeleton

### 🎯 Objective of Milestone 1
Establish a robust, enterprise-grade project skeleton designed for **zero-downtime / no-crash stability**:
1. Containerized infrastructure with PostgreSQL 16 (with `pgvector`) and Redis with healthchecks and restart policies.
2. Two-layer caching foundation (**L1: In-Memory LRU Cache** + **L2: Redis**).
3. Process resilience: Graceful shutdown (`SIGTERM`/`SIGINT`), connection pooling, and structured logging.
4. Base Google OAuth 2.0 & JWT authentication with 3-tier RBAC.
5. React frontend layout skeleton with permanent **Medical Disclaimer Banner**.
6. Initial FPT SRS documentation and UML diagrams.

---

### 📋 Task Allocation & Completion by Member (Milestone 1)

#### 👑 TECH LEAD (User)
* [x] **Task TL.1 (Architecture & Coding Standards):**
  * Review and lock `ARCHITECTURE.md` (Modular Monolith, anti-overengineering rules).
  * Setup repository branching model (`master`, `develop`, `feature/*`) and remote GitHub link.
  * Establish governance directives: `AGENTS.md`, `GEMINI.md`, `CONTRIBUTING.md`, `docs/TEAM_WORKFLOW.md`.
* [x] **Task TL.2 (Core Resilience & Process Lifecycle):**
  * Implement Graceful Shutdown in Spring Boot (`server.shutdown=graceful`, 10s drain timeout).
  * Configure structured logging with SLF4J / Logback and Actuator health probes.
  * Implement standard API response wrappers (`ApiResponse<T>`, `GlobalExceptionHandler`).
* [x] **Task TL.3 (Core Auth & RBAC Security):**
  * Design JWT payload with short-lived access token in `HttpOnly` cookie and long-lived refresh token.
  * Implement core Spring Security RBAC filter (`JwtAuthenticationFilter`, `@PreAuthorize`).
* [x] **Task TL.4 (Code Review & DoD Verification):**
  * Review Pull Requests and verify Definition of Done (DoD).
  * Run end-to-end sanity check and approve Milestone 1 completion.

---

#### 🛠️ CORE DEVELOPER (Fullstack / Backend & Data)
* [x] **Task D1.1 (Resilient Docker Infrastructure):**
  * Create `docker-compose.yml`:
    * `postgres`: `pgvector/pgvector:pg16` on host port `5433` with healthcheck (`pg_isready`), volume persistence.
    * `redis`: `redis:7-alpine` on host port `6379` with healthcheck (`redis-cli ping`).
    * Restart policy: `restart: unless-stopped`.
  * Separate multi-environment configs: `application.properties`, `application-dev.properties`, `application-prod.properties`.
* [x] **Task D1.2 (JPA Entities & Data Seeding):**
  * Define core entities: `User`, `Role`, `UserStatus`, `Specialty`, `DoctorProfile`, `AuditLog`.
  * Implement `DataInitializer` CommandLineRunner seeding Admin, Doctor (with profile & specialty), and Patient.
  * Verify `pgvector` extension is active in PostgreSQL.
* [x] **Task D1.3 (Two-Layer Caching Service L1 + L2):**
  * Implement `TwoLayerCacheService`:
    * Layer 1: Caffeine in-memory cache (< 1ms).
    * Layer 2: Redis distributed cache (1–3ms).
    * Unit tests passing: `TwoLayerCacheServiceTest`.
* [x] **Task D1.4 (Spring Boot Server Setup & Health Probes):**
  * Spring Security 6 with CORS, CSRF disabled for stateless JWT, and centralized exception handling.
  * Create Health check endpoints:
    * `GET /api/v1/health/live` (Process uptime).
    * `GET /api/v1/health/ready` (Validates PostgreSQL pool, Redis, and TwoLayerCache).
* [x] **Task D1.5 (Swagger / OpenAPI Documentation):**
  * Configure SpringDoc OpenAPI UI at `/api/docs` and `/swagger-ui/index.html`.

---

#### 🎨 FRONTEND LEAD (UI/UX)
* [x] **Task D2.1 (Vite + React + Tailwind Initialization):**
  * Initialize React app with Vite and TypeScript under `frontend/`.
  * Setup TailwindCSS, Lucide React icons, and clean responsive typography.
* [x] **Task D2.2 (Role Layout Architecture & Child Routes):**
  * Implement three clean layout shells:
    * `AdminLayout`: Sidebar navigation, system status indicator, Doctor Vetting, User Management, Specialty Management.
    * `DoctorLayout`: Medical provider header, Appointment schedule, Doctor Profile page.
    * `PatientLayout`: Responsive healthcare navigation, Symptom Triage, Document Summarizer, Doctor Search.
* [x] **Task D2.3 (Permanent Medical Disclaimer Banner):**
  * Build `MedicalDisclaimerBanner.tsx` displayed prominently on all Patient routes.
* [x] **Task D2.4 (Routing & Protected Route Auth Guard):**
  * Configure React Router v6 with `ProtectedRoute` role-based guards.
  * Implement `LoginPage` (Admin/Doctor/Patient credentials login + Google OAuth entry).
* [x] **Task D2.5 (Client State & Network Resilience):**
  * Configure Axios client with `withCredentials: true` and Bearer token fallback.
  * Setup Zustand store (`useAuthStore`) with instant localStorage state hydration.

---

#### 📝 DOC & QA SPECIALIST
* [x] **Task D3.1 (FPT SRS Document Initial Draft):**
  * Create `docs/SRS_MediAssist_AI.md` following FPT Capstone standard.
  * Create `docs/DATABASE_DESIGN.md`, `docs/STORYTELLING.md`, `docs/USE_CASES.md`, `docs/CAPSTONE_DEFENSE.md`.
* [x] **Task D3.2 (UML 2.0 Architectural Diagrams):**
  * Diagrams in `docs/diagrams/`:
    * Overall Use Case Diagram.
    * Sequence Diagram: Auth Handshake & JWT Cookie issuance.
    * Component & 2-Layer Cache Architecture Diagram.
* [x] **Task D3.3 (Postman Collection & Load Test Spec):**
  * Build Postman collection: `tests/postman/MediAssist_v1.postman_collection.json`.
  * Build k6 smoke load test script: `tests/k6/smoke_test.js`.

---

## 🏁 Definition of Done (DoD) Verification for Milestone 1

| DoD Checklist Item | Target Standard | Result | Status |
| :--- | :--- | :---: | :---: |
| 1. Docker infrastructure | Postgres 16 (pgvector, 5433) & Redis (6379) UP | Healthy | ✅ PASS |
| 2. Readiness Probe | `GET /api/v1/health/ready` returns 200 OK (DB + Redis + Cache UP) | 200 OK | ✅ PASS |
| 3. Two-Layer Cache | L1 Caffeine + L2 Redis read-through & invalidation | 3/3 Tests Pass | ✅ PASS |
| 4. Process Resilience | Graceful shutdown timeout (10s phase timeout) | Configured | ✅ PASS |
| 5. Database Seeding | Admin, Doctor, Patient, Specialties, DoctorProfile seeded | Seeded in DB | ✅ PASS |
| 6. RBAC Authentication | Admin, Doctor, Patient login with secure JWT & role routing | 200 OK | ✅ PASS |
| 7. Medical Disclaimer | Permanent banner rendered across patient routes | Visible | ✅ PASS |
| 8. API Documentation | OpenAPI spec at `/api/docs` & Swagger UI at `/swagger-ui/index.html` | 200 OK | ✅ PASS |
| 9. Documentation Suite | SRS, Database Design, Storytelling, Use Cases, Capstone Defense | Complete in `docs/` | ✅ PASS |
| 10. Tech Lead Review & Git | Clean commit history, branch pushed to origin master | Pushed | ✅ PASS |

> **MILESTONE 1 STATUS:** 🟢 **100% COMPLETED (Passed Definition of Done)**

---

## 🚀 Detailed Breakdown: MILESTONE 2 — Core Medical & Booking Workflow

### 🎯 Objective of Milestone 2
Build the core clinical consultation and appointment booking engine:
1. **Doctor Schedule Management:** Dynamic 30-minute time slot discovery with real-time booked appointment masking.
2. **Appointment Booking Engine:** Patients book time slots with concurrency conflict guard (Optimistic locking `@Version`, isolation level `REPEATABLE_READ`, and slot conflict verification).
3. **Admin Doctor Vetting Workflow:** Admin reviews license certificates (CCHN) and approves/rejects doctor applications with audit trail logging.
4. **Cache Invalidation:** Two-Layer Cache (L1 Caffeine + L2 Redis) automatically evicts modified doctor profiles and verified lists.
5. **Role-based Dashboards:** Full end-to-end frontend integration for Patient, Doctor, and Admin.

---

### 📋 Task Allocation & Completion by Member (Milestone 2)

#### 👑 TECH LEAD (User)
* [x] **Task TL.2.1 (Concurrency Design & Lock Strategy):**
  * Enforce Optimistic Locking with `@Version` and repeatable read isolation on booking transaction.
  * Design idempotent appointment code format: `AP-YYYYMMDD-XXXXXX`.
* [x] **Task TL.2.2 (Security & Permissions Review):**
  * Configure public access for doctor discovery (`GET /api/v1/doctors/**`).
  * Enforce RBAC for vetting (`ADMIN`), profile editing (`DOCTOR`), and booking (`PATIENT`/`ADMIN`).
* [x] **Task TL.2.3 (Code Review & DoD Verification):**
  * Validate unit test coverage: 6/6 tests passing.
  * Approve Milestone 2 completion.

---

#### 🛠️ CORE DEVELOPER (Fullstack / Backend & Data)
* [x] **Task D1.2.1 (Entities & Data Model):**
  * `Appointment` entity with `@Version`, `AppointmentStatus`, and `PaymentStatus`.
  * `DoctorScheduleSlot` entity with weekly recurring slot intervals.
  * PostgreSQL table migration and indexing: `idx_appointment_schedule`, `idx_appointment_code`.
* [x] **Task D1.2.2 (Doctor & Slot Discovery Engine):**
  * `DoctorService`: Dynamic slot generator taking doctor availability and masking already-booked appointments.
  * `DoctorController`: `GET /api/v1/doctors`, `GET /api/v1/doctors/{id}`, `GET /api/v1/doctors/{id}/slots`.
* [x] **Task D1.2.3 (Appointment Booking & Concurrency Guard):**
  * `AppointmentService`: `@Transactional(isolation = Isolation.REPEATABLE_READ)` with `existsConflict()` check.
  * Returns HTTP 409 `SLOT_CONFLICT` upon race condition.
  * Appointment lifecycle update: `PATCH /api/v1/appointments/{id}/status` (`SCHEDULED` -> `COMPLETED`/`CANCELLED`).
* [x] **Task D1.2.4 (Admin Doctor Vetting Service):**
  * `AdminVettingService`: `GET /api/v1/admin/doctors/pending`, `POST /api/v1/admin/doctors/{id}/vet`.
  * Automatic cache eviction: `cacheService.evict("doctors:verified")`.
  * Audit log recording on approval/rejection.
* [x] **Task D1.2.5 (Automated Unit Tests):**
  * `AppointmentServiceTest`: Booking success, slot conflict detection, and past date validation.
  * `TwoLayerCacheServiceTest`: L1 cache hit, cache miss, and eviction.

---

#### 🎨 FRONTEND LEAD (UI/UX)
* [x] **Task D2.2.1 (Doctor Search & Booking Modal):**
  * `DoctorSearchPage`: Dynamic listing from `GET /api/v1/doctors`, search filter by name, bio, and specialty.
  * Interactive booking modal: Date picker, live slot availability badges (active / disabled), notes input.
  * Confirmation dialog showing appointment code, date, and fee.
* [x] **Task D2.2.2 (Patient Dashboard Appointments):**
  * `PatientDashboard`: Display upcoming appointments from `GET /api/v1/appointments/my`.
  * Appointment cancellation action calling `PATCH /api/v1/appointments/{id}/status`.
* [x] **Task D2.2.3 (Doctor Dashboard Consultation Management):**
  * `DoctorDashboard`: List incoming scheduled appointments.
  * Actions: "Hoàn Thành Khám" with clinical conclusion notes input, "Hủy Ca".
* [x] **Task D2.2.4 (Doctor Profile Management):**
  * `DoctorProfilePage`: View and edit CCHN license number, consultation fee, bio, and specialties via `PUT /api/v1/doctors/me/profile`.
* [x] **Task D2.2.5 (Admin Doctor Vetting Page):**
  * `DoctorVettingPage`: Real-time queue of pending doctors with approve/reject actions and audit notices.

---

#### 📝 DOC & QA SPECIALIST
* [x] **Task D3.2.1 (Database Schema Specification Update):**
  * Updated `docs/DATABASE_DESIGN.md` with `appointments` and `doctor_schedule_slots` DDL and indexes.
* [x] **Task D3.2.2 (Enterprise Use Cases Specification Update):**
  * Updated `docs/USE_CASES.md` with concrete UC-OPS-05 and UC-ADM-06 endpoints and flows.
* [x] **Task D3.2.3 (Development Work Log):**
  * Appended `[WORK-LOG-#005]` in `docs/WORK_LOG.md`.

---

## 🏁 Definition of Done (DoD) Verification for Milestone 2

| DoD Checklist Item | Target Standard | Result | Status |
| :--- | :--- | :---: | :---: |
| 1. Doctor Directory API | `GET /api/v1/doctors` returns verified doctors with cache | 200 OK (2 Doctors) | ✅ PASS |
| 2. Slot Discovery Engine | `GET /api/v1/doctors/{id}/slots` returns 30-min slots | 200 OK (15 slots) | ✅ PASS |
| 3. Concurrency Protection | Concurrent booking on same slot returns 409 Conflict | HTTP 409 SLOT_CONFLICT | ✅ PASS |
| 4. Appointment Code Generator | Unique transaction format `AP-YYYYMMDD-XXXXXX` | Generated & Verified | ✅ PASS |
| 5. Admin Doctor Vetting | Approve doctor profile, update DB & evict Two-Layer Cache | 200 OK & Cache Evicted | ✅ PASS |
| 6. Audit Trail Logging | System records `APPOINTMENT_BOOKED` and `VET_DOCTOR_*` in `audit_logs` | Verified in DB | ✅ PASS |
| 7. Patient Booking UI | Modal with date picker, slot selection, and confirmation card | 0 TS errors | ✅ PASS |
| 8. Doctor & Admin UIs | Doctor appointment actions, profile update, and Admin vetting table | 0 TS errors | ✅ PASS |
| 9. Unit Test Suite | Maven test suite passes all tests without failures | 6/6 Tests PASS | ✅ PASS |
| 10. Documentation Sync | Database Design, Use Cases, Work Log, and Roadmap synchronized | 100% Synced | ✅ PASS |

> **MILESTONE 2 STATUS:** 🟢 **100% COMPLETED (Passed Definition of Done)**

---

## 🧠 Detailed Breakdown: MILESTONE 3 — AI Symptom Triage & Semantic Match

### 🎯 Objective of Milestone 3
Build the core clinical intelligence and semantic discovery pipeline:
1. **Hard Red-Flag Emergency Guardrail:** Zero-latency clinical keyword screening detecting acute emergencies (coronary syndrome, stroke FAST, anaphylaxis, acute hemorrhage) with instant 115 guidance and LLM bypass.
2. **AI Clinical Scribe & SBAR Triage:** Patient symptom intake, urgency classification (`ROUTINE`, `URGENT`, `EMERGENCY`), specialty determination, and structured SBAR clinical summaries.
3. **pgvector HNSW Cosine Similarity Search:** 1536-dimensional vector embedding of verified doctor profiles; native vector cosine search ranking doctors based on patient symptoms.
4. **Rate Limiter:** Token bucket rate limiter (15 req/min) in Redis with in-memory fallback.
5. **Interactive UI:** `SymptomTriagePage` with live chat/triage assessment, emergency banners, SBAR evaluation card, and matched doctors with direct slot booking modal integration.

---

### 📋 Task Allocation & Completion by Member (Milestone 3)

#### 👑 TECH LEAD (User)
* [x] **Task TL.3.1 (Vector Architecture & pgvector HNSW Index):**
  * Configured `vector(1536)` column on `doctor_profiles` and created HNSW index `idx_doctor_bio_hnsw` (`vector_cosine_ops`).
  * Enforced Red-Flag emergency rule to strictly bypass LLM calls for clinical safety.
* [x] **Task TL.3.2 (Rate Limiting & Security Policy):**
  * Configured Spring Security matchers for `/api/v1/triage/**`.
  * Implemented `TriageRateLimiterService` protecting AI endpoints.
* [x] **Task TL.3.3 (Code Review & DoD Verification):**
  * Validated 16/16 Maven unit tests passing, 0 TypeScript errors.
  * Approved Milestone 3 completion.

---

#### 🛠️ CORE DEVELOPER (Fullstack / Backend & Data)
* [x] **Task D1.3.1 (Entities & Repository):**
  * `TriageSession` entity and `TriageSessionRepository`.
  * `TriageUrgencyLevel` enum (`ROUTINE`, `URGENT`, `EMERGENCY`).
* [x] **Task D1.3.2 (Core Services):**
  * `RedFlagService`: Zero-latency regex pattern screening for stroke, heart attack, anaphylaxis.
  * `EmbeddingService`: 1536-d normalized vector generator with deterministic medical subspace hashing and LLM API gateway.
  * `DoctorSemanticSearchService`: Native `pgvector` Cosine Similarity query and startup doctor embedding sync.
  * `TriageService`: End-to-end triage assessment, SBAR generation, and doctor matching.
* [x] **Task D1.3.3 (REST Controller & DTOs):**
  * `POST /api/v1/triage/assess`: Triage evaluation with matched doctors.
  * `GET /api/v1/triage/history`: Patient triage consultation history.
  * `GET /api/v1/triage/search/semantic`: Standalone semantic doctor search.
* [x] **Task D1.3.4 (Automated Tests):**
  * `RedFlagServiceTest`, `EmbeddingServiceTest`, `TriageServiceTest`.

---

#### 🎨 FRONTEND LEAD (UI/UX)
* [x] **Task D2.3.1 (Symptom Triage Page):**
  * `SymptomTriagePage`: Textarea with quick medical sample chips, Red-Flag emergency banner with 115 call button, SBAR assessment card, and matched doctor cards.
* [x] **Task D2.3.2 (Seamless Booking Integration):**
  * Doctor match cards feature "Đặt Khám Ngay" button that opens interactive slot booking modal with dynamic 30-min slots and confirmation cards.
* [x] **Task D2.3.3 (Routing & Navigation):**
  * Added `/patient/triage` route in `App.tsx` and updated `PatientLayout.tsx` navigation.

---

#### 📝 DOC & QA SPECIALIST
* [x] **Task D3.3.1 (Database Specification Sync):**
  * Updated `docs/DATABASE_DESIGN.md` with `triage_sessions`, `doctor_profiles.bio_embedding vector(1536)`, and HNSW index.
* [x] **Task D3.3.2 (Use Cases Sync):**
  * Updated `docs/USE_CASES.md` with `UC-CLIN-02` and `UC-CLIN-04` endpoints.
* [x] **Task D3.3.3 (Development Work Log):**
  * Appended `[WORK-LOG-#008]` in `docs/WORK_LOG.md`.

---

## 🏁 Definition of Done (DoD) Verification for Milestone 3

| DoD Checklist Item | Target Standard | Result | Status |
| :--- | :--- | :---: | :---: |
| 1. Red-Flag Emergency Guard | Immediate 115 alert, 0ms LLM latency, LLM bypass | 5/5 Tests Pass & Live Verified | ✅ PASS |
| 2. pgvector Extension & Index | PostgreSQL `vector(1536)` with HNSW Cosine Index | Verified in PostgreSQL 16 | ✅ PASS |
| 3. Semantic Embedding Engine | 1536-d normalized unit vectors with medical clustering | 3/3 Tests Pass (L2 Norm = 1.0) | ✅ PASS |
| 4. Doctor Matching Query | Cosine similarity ranking verified doctors | Match score > 0.99 for cardiology | ✅ PASS |
| 5. SBAR Clinical Triage | Structured Situation, Background, Assessment, Recommendation | Generated & Persisted in DB | ✅ PASS |
| 6. Rate Limiting Protection | 15 req/min rate limit per IP / user | Configured with Redis & Fallback | ✅ PASS |
| 7. Patient Triage UI | Rich interactive triage workspace with sample chips & alerts | 0 TS errors | ✅ PASS |
| 8. Seamless Booking Integration | Triage result opens slot booking modal directly | 0 TS errors & Live Verified | ✅ PASS |
| 9. Unit Test Suite | Full test suite passes without failures | 16/16 Tests PASS | ✅ PASS |
| 10. Documentation Sync | Database Design, Use Cases, Roadmap, and Work Log synced | 100% Synced | ✅ PASS |

> **MILESTONE 3 STATUS:** 🟢 **100% COMPLETED (Passed Definition of Done)**

---

## 🚀 Milestone 4: Multimodal Medical Document Ingestion & Doctor Matching (COMPLETED)

### 🎯 Objective of Milestone 4
Build an intelligent multimodal laboratory and diagnostic document ingestion engine:
1. **PDF Medical Document Parsing:** Robust ingestion of clinical lab reports (PDF/text) using Apache PDFBox 3.0.4.
2. **Clinical Indicator Extraction:** Automated detection and parsing of biochemical biomarkers (Lipid panel: Cholesterol, Triglycerides; Liver panel: AST, ALT, GGT; Renal panel: Creatinine, eGFR; Glucose) with clinical normal reference ranges.
3. **Abnormal Findings Classification:** Gắn nhãn phân loại chỉ số sinh hóa (`ELEVATED`, `LOW`, `NORMAL`) và giải nghĩa ý nghĩa lâm sàng.
4. **Plain-Language Translation & Patient Q&A:** AI medical scribe generating layperson explanations and 3 critical questions for patients to ask their doctor.
5. **pgvector Semantic Doctor Recommendation:** Automated vector embedding of the patient's lab report findings and Cosine Similarity matching with verified specialist doctors (`vector_cosine_ops`).
6. **Rich Patient Experience:** Interactive `DocumentSummarizerPage` with drag-and-drop PDF upload, preset clinical sample reports, dynamic 3-step progress bar, indicator comparison table, and direct slot booking modal.

---

### 📋 Task Allocation & Completion by Member (Milestone 4)

#### 👑 TECH LEAD (User)
* [x] **Task TL.4.1 (Multimodal Architecture & Security Policy):**
  - Evaluated and integrated Apache PDFBox 3.0.4 (`org.apache.pdfbox:pdfbox`).
  - Configured Spring Security to permit multipart document analysis at `POST /api/v1/documents/analyze`.
  - Enforced enterprise GitFlow: feature branch development without direct commits to `master`.
* [x] **Task TL.4.2 (Code Review & DoD Verification):**
  - Proactively verified 18/18 Maven unit tests and 0 TypeScript errors in frontend build.

---

#### 🛠️ CORE DEVELOPER (Fullstack / Backend & Data)
* [x] **Task D1.4.1 (Entities & Repositories):**
  - Created `MedicalDocument` (`user_id`, `file_name`, `file_size_bytes`, `content_type`, `storage_path`, `status`).
  - Created `DocumentAnalysis` (`clinical_summary`, `plain_language_explanation`, `abnormal_indicators_json`, `recommended_specialty_slug`, `suggested_questions_json`).
  - Created `MedicalDocumentRepository` and `DocumentAnalysisRepository`.
* [x] **Task D1.4.2 (Services & Pipelines):**
  - `PdfExtractionService`: PDF extraction using Apache PDFBox 3.0.4 `Loader.loadPDF`.
  - `MedicalDocumentAnalysisService`: Biomarker extraction, normal range comparison, plain-language translation, and `pgvector` Cosine Similarity query via `DoctorSemanticSearchService`.
* [x] **Task D1.4.3 (REST Controller & DTOs):**
  - `POST /api/v1/documents/analyze`: Multipart upload handling both PDF and lab text files.
  - `GET /api/v1/documents/my`: Patient document history.
  - `DocumentAnalysisResponse` and `AbnormalIndicatorDto`.
* [x] **Task D1.4.4 (Automated Tests):**
  - `MedicalDocumentAnalysisServiceTest`: Unit tests for lipid panel (Cardiologist recommendation) and liver panel (Gastroenterologist recommendation).

---

#### 🎨 FRONTEND LEAD (UI/UX)
* [x] **Task D2.4.1 (Document Summarizer Page):**
  - Upgraded `DocumentSummarizerPage.tsx` with drag-and-drop file upload, file size validation (max 15MB), and preset buttons ("Mẫu Mỡ Máu Cao", "Mẫu Men Gan Cao").
* [x] **Task D2.4.2 (Clinical Visualization):**
  - 3-step dynamic progress bar (Đang trích xuất -> Phân tích chỉ số -> Khớp bác sĩ).
  - Plain-language explanation card with medical disclaimer.
  - Biomarker comparison table with color-coded status badges (`ELEVATED` in red, `LOW` in amber, `NORMAL` in green).
* [x] **Task D2.4.3 (Doctor Match & Seamless Booking):**
  - Matched doctor cards with similarity percentage, specialty tags, fee, and instant "Đặt Khám Ngay" slot booking modal.

---

#### 📝 DOC & QA SPECIALIST
* [x] **Task D3.4.1 (Database Design Documentation):**
  - Synchronized `docs/DATABASE_DESIGN.md` with `medical_documents` and `document_analyses` schema definitions and indexes.
* [x] **Task D3.4.2 (Use Cases Documentation):**
  - Synchronized `docs/USE_CASES.md` with `UC-CLIN-03` endpoint signatures and workflow.
* [x] **Task D3.4.3 (Development Work Log):**
  - Documented complete technical rationale, test results, and GitFlow compliance in `docs/WORK_LOG.md` (`[WORK-LOG-#009]`).

---

## 🏁 Definition of Done (DoD) Verification for Milestone 4

| DoD Checklist Item | Target Standard | Result | Status |
| :--- | :--- | :---: | :---: |
| 1. PDF Parser Engine | Apache PDFBox 3.0.4 text extraction from binary stream | Extracted & Verified | ✅ PASS |
| 2. Biomarker Extraction | Regex extraction of Lipid, Liver, Renal, and Glucose indicators | 100% Extracted | ✅ PASS |
| 3. Abnormal Classification | Auto-flagging `ELEVATED`, `LOW`, `NORMAL` against standard medical reference ranges | Accurate | ✅ PASS |
| 4. Plain-Language Scribe | Easy-to-understand explanation generated for patients | Clear & Friendly | ✅ PASS |
| 5. Question Generator | 3 targeted questions generated for doctor consultation | Contextual | ✅ PASS |
| 6. pgvector Doctor Match | Cosine similarity ranking verified doctors based on lab findings | Score > 0.985 | ✅ PASS |
| 7. Multi-Format Support | Handles binary PDF documents and raw laboratory text | Live Verified | ✅ PASS |
| 8. Frontend Lab UI | Interactive upload, sample chips, biomarker table, doctor cards, booking modal | 0 TS Errors | ✅ PASS |
| 9. Automated Test Suite | Maven unit tests covering document ingestion & doctor matching | 18/18 Tests PASS | ✅ PASS |
| 10. Documentation Sync | Database Design, Use Cases, Roadmap, and Work Log updated | 100% Synced | ✅ PASS |

> **MILESTONE 4 STATUS:** 🟢 **100% COMPLETED (Passed Definition of Done)**

---

## Detailed Breakdown: MILESTONE 5 — Zero-Trust Security, Anti-Brute Force Lockout & High-Load Rate Limiting

### 🎯 Objective of Milestone 5
Eliminate guest access vulnerabilities, prevent brute-force credential stuffing, protect against DDoS / high-concurrency scraping, and establish a login-first zero-trust boundary:
1. Flyway V3 migration adding `failed_login_attempts`, `locked_until`, and index `idx_users_locked_until` on PostgreSQL `users`.
2. Account Lockout defense in `AuthService`: 5 consecutive failed logins trigger immediate 15-minute account lockout (`HTTP 423 Locked`), logged with security warning.
3. Distributed Rate Limiting via `SecurityRateLimiterService` using Redis sliding window:
   - Login: max 5 attempts/minute per IP (`HTTP 429 Too Many Requests`).
   - Triage: max 10 requests/minute per user.
   - Medical Document upload: max 5 uploads/minute per user.
4. Zero-Trust Login-First: Revoked all public `permitAll` access from `/api/v1/triage/**` and `/api/v1/documents/**`. Anonymous calls strictly return `HTTP 401 Unauthorized`.
5. Patient Self-Registration endpoint `POST /api/v1/auth/register` with BCrypt encryption, auto-creation of EMR Patient Profile with unique hospital code `BN-2026-XXXXX`.
6. Frontend `LoginPage.tsx` dual-tab switcher (Login / Register), real-time lockout alerts, fast demo account chips, and commercial monetization tiers preview.
7. Automated verification: `SecurityHardeningTest.java` (6 unit tests, all pass) and `test_security_hardening.py` (9 E2E test scenarios, 100% pass).

### 📋 Task Allocation & Completion by Member (Milestone 5)

#### 👑 TECH LEAD (User)
* [x] **Task TL.5.1 (Security Architecture & Policy Definition):**
  - Defined strict zero-trust login-first mandate and anti-brute force policy (5 failed attempts -> 15 min lock).
  - Configured HTTP Security Headers in `SecurityConfig.java` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
  - Authored custom `AuthenticationEntryPoint` returning clean Vietnamese JSON 401 response.
* [x] **Task TL.5.2 (Code Review & DoD Verification):**
  - Reviewed and verified 27/27 Maven unit tests passing.
  - Verified 0 TypeScript errors in `npm run build`.
  - Approved feature branch `feature/milestone-5-security-zero-trust`.

---

#### 🛠️ CORE DEVELOPER (Fullstack / Backend & Data)
* [x] **Task D1.5.1 (Flyway V3 Migration & Entity Hardening):**
  - Authored `V3__account_lockout_and_security_hardening.sql`.
  - Updated `User.java` with `failedLoginAttempts`, `lockedUntil`, and `isAccountNonLocked()`.
* [x] **Task D1.5.2 (Authentication & Lockout Service):**
  - Enhanced `AuthService.login()` with brute-force lockout checking and counter reset.
  - Added `@Transactional(noRollbackFor = AppException.class)` to commit failed attempt counters across exception boundaries.
  - Implemented `AuthService.register()` generating patient profile and issuing JWT.
* [x] **Task D1.5.3 (Security Rate Limiter):**
  - Implemented `SecurityRateLimiterService` using `StringRedisTemplate` with in-memory fallback.
  - Enforced rate limits on `/api/v1/auth/login`, `/api/v1/triage/assess`, and `/api/v1/documents/analyze`.
* [x] **Task D1.5.4 (Automated Tests):**
  - Created `SecurityHardeningTest.java` testing lockout, IP rate limit, auto-reset, and registration.

---

#### 🎨 FRONTEND LEAD (UI/UX)
* [x] **Task D2.5.1 (Dual-Tab Authentication UI):**
  - Redesigned `LoginPage.tsx` with high-contrast dual-tab switcher: "Đăng Nhập" / "Đăng Ký Bệnh Nhân Mới".
  - Created patient registration form with validation: Full Name, Email, Password, Phone, Gender, DOB, Address.
* [x] **Task D2.5.2 (Security Alert Banners & Demo Pills):**
  - Added real-time account lockout alert box (`HTTP 423`) and rate limit warnings (`HTTP 429`).
  - Built quick-login pills for instant testing: Admin, Dr. Đăng Khoa, Patient Bình.
* [x] **Task D2.5.3 (Commercial Value Proposition):**
  - Integrated monetization tier preview: MediPass VIP (149k/mo), Telehealth consultation fees (250k-450k/session), Lab scan packs (miễn phí lần đầu, 29k/lần lẻ, 99k/5 lần).

---

#### 📝 DOC & QA SPECIALIST
* [x] **Task D3.5.1 (Documentation Synchronization):**
  - Updated `docs/DATABASE_DESIGN.md` with V3 Flyway migration and `idx_users_locked_until`.
  - Updated `docs/USE_CASES.md` with `UC-SEC-10` and `UC-BIZ-11`.
  - Logged all architectural decisions in `docs/WORK_LOG.md` (`[WORK-LOG-#012]`).
* [x] **Task D3.5.2 (E2E Security Test Suite):**
  - Created and ran `scratch/test_security_hardening.py` validating 9 security scenarios: unauthenticated 401, registration 201, authenticated 200, 5-attempt brute-force 423, single-IP DoS 429, and OWASP headers.

---

## 🏁 Definition of Done (DoD) Verification for Milestone 5

| DoD Checklist Item | Target Standard | Result | Status |
| :--- | :--- | :---: | :---: |
| 1. Flyway V3 Applied | Schema history contains V3 with zero errors | Applied in DB | ✅ PASS |
| 2. Anti-Brute Force Lockout | 5 consecutive wrong passwords locks user for 15 mins | 5th attempt: 423 Locked | ✅ PASS |
| 3. Account Auto-Reset | Successful login resets failed attempts counter to 0 | Counter reset to 0 | ✅ PASS |
| 4. Distributed Rate Limiter | > 5 login req/min from single IP triggers HTTP 429 | 6th attempt: 429 Blocked | ✅ PASS |
| 5. Zero-Trust Login-First | Unauthenticated requests to Triage/Documents rejected | 401 Unauthorized | ✅ PASS |
| 6. Patient Registration | Self-registration generates EMR profile and patient code | BN-2026-XXXXX created | ✅ PASS |
| 7. Security Headers | Strict `X-Frame-Options: DENY` & `nosniff` headers present | Verified on Actuator | ✅ PASS |
| 8. Dual-Tab Frontend UI | Smooth tab toggle between Login & Register with demo pills | 0 TS Errors | ✅ PASS |
| 9. Backend Unit Tests | SecurityHardeningTest + all prior suites (27 tests total) | 27/27 Tests PASS | ✅ PASS |
| 10. E2E Python Verification | Full automated test verifying all security boundaries | 9/9 Tests PASS | ✅ PASS |

> **MILESTONE 5 STATUS:** 🟢 **100% COMPLETED (Passed Definition of Done)**

---

## Detailed Breakdown: MILESTONE 6 — Commercial Billing, MediPass VIP Subscriptions & Payment Gateway

### 🎯 Objective of Milestone 6
1. **Billing Entity Models:** `SubscriptionPlan`, `UserSubscription`, `Transaction`, `PaymentMethod`.
2. **Payment Gateway Integration:** Dynamic VietQR generation (NAPAS standard) and VNPay Sandbox webhook integration.
3. **Escrow Holding & Fee Splitting:** Doctor consultation fee (85% Doctor, 15% Platform), Escrow holding upon booking, auto-release upon `COMPLETED`, 100% refund upon doctor cancellation.
4. **Lab Analysis Quota Enforcement:** 1 free trial scan, 29,000đ/single scan, 99,000đ/5-scan pack, unlimited for MediPass VIP.
5. **Subscription Lifecycle:** Active, Expired, Auto-renew, Grace period.

