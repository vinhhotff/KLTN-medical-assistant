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

| Milestone | Phase Name | Status | Duration | Focus Area |
| :--- | :--- | :--- | :--- | :--- |
| **Milestone 1** | **Project Foundation, 2-Layer Cache & Resilience Skeleton** | 🟢 **COMPLETED** | Week 1 – 2 | Docker, Postgres(pgvector), Redis, L1/L2 Cache, Graceful Shutdown, Auth, Layouts, SRS |
| **Milestone 2** | **Core Medical & Booking Workflow** | 🟡 **READY TO START** | Week 3 – 5 | Doctor schedules, Admin verification, Booking CRUD, Cache invalidation, Email |
| **Milestone 3** | **AI Symptom Triage & Semantic Match** | ⚪ Planned | Week 6 – 8 | Chatbot UI, Guardrail prompts, pgvector semantic search, Rate limiters |
| **Milestone 4** | **Multimodal Medical Record Summarizer**| ⚪ Planned | Week 9 – 11 | S3 Presigned URL, BullMQ Worker, GPT-4o Vision OCR, Async progress |
| **Milestone 5** | **Admin Analytics & Cost Management** | ⚪ Planned | Week 12 – 13| Token cost tracking, doctor review queue, audit logs, System metrics |
| **Milestone 6** | **High-Load Testing, CI/CD & Final Defense** | ⚪ Planned | Week 14 – 16| k6 Load Test (500+ VU), Jest/Playwright (≥70%), Docker Nginx HTTPS, Defense Docs |

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

## 🚀 MILESTONE 2: Core Medical & Booking Workflow (Ready to Start)

### 🎯 Objective of Milestone 2
Build the core clinical consultation and appointment booking engine:
1. **Doctor Schedule Management:** Doctors configure available time slots and consultation fee.
2. **Appointment Booking Engine:** Patients book time slots with concurrency conflict guard (Pessimistic/Optimistic locking).
3. **Admin Doctor Vetting Workflow:** Admin reviews license certificates and approves/rejects doctor applications.
4. **Cache Invalidation:** Two-Layer Cache automatically evicts modified schedules.
5. **Notification & Email Service:** Automated email confirmations for scheduled appointments.

