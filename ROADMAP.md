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
| **Milestone 1** | **Project Foundation, 2-Layer Cache & Resilience Skeleton** | 🟡 **IN PROGRESS** | Week 1 – 2 | Docker, Postgres(pgvector), Redis, L1/L2 Cache, Graceful Shutdown, Auth, Layouts, SRS |
| **Milestone 2** | **Core Medical & Booking Workflow** | ⚪ Planned | Week 3 – 5 | Doctor schedules, Admin verification, Booking CRUD, Cache invalidation, Email |
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

### 📋 Task Allocation by Member

#### 👑 TECH LEAD (User)
* [ ] **Task TL.1 (Architecture & Coding Standards):**
  * Review and lock `ARCHITECTURE.md` (Modular Monolith, anti-overengineering rules).
  * Setup repository branching model (`main`, `develop`, `feature/*`).
  * Enforce strict TypeScript config, ESLint, and Prettier across workspaces.
* [ ] **Task TL.2 (Core Resilience & Process Lifecycle):**
  * Implement Graceful Shutdown handler in `backend/src/server.ts` (intercepting `SIGTERM`/`SIGINT`, draining HTTP requests, closing DB pools and Redis clients).
  * Configure structured logging with Pino (Request ID tracking for every incoming call).
  * Implement standard API response helpers (`sendSuccess`, `sendError`).
* [ ] **Task TL.3 (Core Auth & RBAC Security):**
  * Design JWT payload with short-lived access token in `HttpOnly` cookie and long-lived refresh token.
  * Implement core RBAC middleware (`authorizeRoles(['ADMIN', 'DOCTOR', 'PATIENT'])`).
* [ ] **Task TL.4 (Code Review & DoD Verification):**
  * Review Pull Requests from Dev 1, Dev 2, Dev 3.
  * Run end-to-end sanity check and approve Milestone 1 completion.

---

#### 🛠️ DEV 1 (Fullstack / Backend & Data)
* [ ] **Task D1.1 (Resilient Docker Infrastructure):**
  * Create `docker-compose.yml` with:
    * `postgres`: `pgvector/pgvector:pg16` with healthcheck (`pg_isready`), volume persistence, connection limit tuning.
    * `redis`: `redis:7-alpine` with healthcheck (`redis-cli ping`).
    * Restart policy: `restart: unless-stopped`.
  * Document all environment variables in `backend/.env.example`.
* [ ] **Task D1.2 (Prisma ORM & pgvector Migration):**
  * Initialize Prisma in `backend/` with PostgreSQL provider.
  * Enable `pgvector` extension via SQL migration.
  * Define base `User` schema (`ADMIN`, `DOCTOR`, `PATIENT`, status, googleId).
  * Create `prisma/seed.ts` to seed initial Admin account and default medical specialties.
* [ ] **Task D1.3 (Two-Layer Caching Service L1 + L2):**
  * Create `src/services/cache/cacheService.ts`:
    * Layer 1: `lru-cache` for in-process memory caching (< 1ms).
    * Layer 2: `ioredis` for distributed caching (1–3ms).
    * Methods: `get<T>(key)`, `set<T>(key, value, ttlSeconds)`, `del(key)`.
* [ ] **Task D1.4 (Express Server Setup & Health Probes):**
  * Setup Express with Helmet, CORS, Cookie-Parser, and Centralized Error Middleware.
  * Create Health check endpoints:
    * `GET /api/health/live` (Process is running).
    * `GET /api/health/ready` (Validates PostgreSQL & Redis connectivity).
* [ ] **Task D1.5 (Google OAuth 2.0 & Swagger OpenAPI):**
  * Setup Passport.js with Google Strategy and JWT authentication endpoints.
  * Configure `swagger-ui-express` at `/api/docs`.

---

#### 🎨 DEV 2 (Frontend & UI/UX Lead)
* [ ] **Task D2.1 (Vite + React + Tailwind Initialization):**
  * Initialize React app with Vite and TypeScript under `frontend/`.
  * Setup TailwindCSS, Lucide React icons, and base typography.
* [ ] **Task D2.2 (Role Layout Architecture):**
  * Implement three clean layout shells:
    * `AdminLayout`: Collapsible navigation, system status indicator, content container.
    * `DoctorLayout`: Medical provider header & navigation.
    * `PatientLayout`: Responsive, mobile-first healthcare navigation.
* [ ] **Task D2.3 (Permanent Medical Disclaimer Banner):**
  * Build `MedicalDisclaimerBanner.tsx` displayed prominently on all Patient routes:
    > *"Thông báo y tế: Nền tảng MediAssist-AI chỉ cung cấp thông tin tham khảo sơ bộ và hỗ trợ diễn giải hồ sơ y khoa, hoàn toàn không thay thế chẩn đoán hoặc chỉ định từ bác sĩ chuyên khoa."*
* [ ] **Task D2.4 (Routing & Protected Route Auth Guard):**
  * Configure React Router v6 with public and role-protected route guards.
  * Implement `LoginPage` (Sign in with Google button + Admin email/password form).
* [ ] **Task D2.5 (Client State & Network Resilience):**
  * Configure Axios client with `withCredentials: true` and 401 retry interceptor.
  * Setup Zustand store (`useAuthStore`) and React Query (`QueryClient` with default staleTime 1 minute).

---

#### 📝 DEV 3 (Documentation & QA Specialist)
* [ ] **Task D3.1 (FPT SRS Document Initial Draft):**
  * Create `docs/SRS_MediAssist_AI.md` following FPT Capstone standard:
    * Section 1: Scope, Objectives, High-Availability targets (≥ 500 concurrent users, 99% uptime).
    * Section 2: User Roles & System Context.
    * Section 3: Functional Requirements for Milestone 1.
* [ ] **Task D3.2 (UML 2.0 Architectural Diagrams):**
  * Create diagrams in `docs/diagrams/`:
    * Overall Use Case Diagram (Admin, Doctor, Patient).
    * Sequence Diagram: Google OAuth 2.0 Handshake & JWT Cookie issuance.
    * High-Level Component & 2-Layer Cache Architecture Diagram.
* [ ] **Task D3.3 (Postman Collection & Load Test Spec):**
  * Build Postman collection `MediAssist_v1.postman_collection.json`.
  * Draft the initial k6 load test script outline in `backend/tests/load/smoke.js` for `/api/health` validation.

---

## 🏁 Definition of Done (DoD) for Milestone 1

Milestone 1 is strictly considered **COMPLETE** when:
1. `docker compose up -d` boots up Postgres 16 (with pgvector) and Redis cleanly with passing container healthchecks.
2. `GET /api/health/ready` returns `200 OK` confirming both DB connection pool and Redis are healthy.
3. Two-Layer Cache (`cacheService.ts`) successfully retrieves data from L1 on subsequent calls without hitting Redis/DB.
4. Process handles `SIGINT`/`SIGTERM` gracefully without dropping active connections.
5. Seeding command `npm run seed` executes successfully.
6. Google OAuth and Admin login issue secure `HttpOnly` JWT cookies and navigate users to their respective role dashboards.
7. `MedicalDisclaimerBanner` is clearly visible on patient routes.
8. Swagger API documentation is available at `/api/docs`.
9. Dev 3 delivers draft of SRS and UML diagrams.
10. Tech Lead conducts code review and approves all PRs into `develop`.

---

## Review & Transition Protocol

When all tasks above are checked:
1. Tech Lead prompts AI: *"Review Milestone 1 completion against DoD"*.
2. AI validates codebase, health endpoints, and documentation.
3. Once validated, AI will update this file, mark Milestone 1 as **✅ DONE**, and generate the detailed breakdown for **Milestone 2 (Core Medical & Booking Workflow)**.
