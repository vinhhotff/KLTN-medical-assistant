# Software Requirement Specification (SRS) - MediAssist-AI
## Enterprise-Grade Resilient Telehealth Platform with Multimodal Clinical AI

> **Document Code:** FPT-CAPSTONE-SRS-MEDASSIST-01  
> **Project:** MediAssist-AI (Telehealth Platform for Smart Symptom Triage & Medical Record Summarization)  
> **Major:** Software Engineering - Artificial Intelligence (SE-AI)  
> **Target Standard:** IEEE 830 / ISO/IEC/IEEE 29148:2018 Systems and Software Engineering  
> **Status:** Approved (Complete System Release - Milestone 7 Final Baseline)  
> **Version:** 2.0.0  

---

## 📑 Table of Contents

- [1. Introduction](#1-introduction)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Document Conventions](#12-document-conventions)
  - [1.3 Intended Audience](#13-intended-audience)
  - [1.4 Project Scope & Medical Disclaimer Constraint](#14-project-scope--medical-disclaimer-constraint)
- [2. Overall System Description](#2-overall-system-description)
  - [2.1 Product Perspective & Context](#21-product-perspective--context)
  - [2.2 User Classes and Characteristics (Actors)](#22-user-classes-and-characteristics-actors)
  - [2.3 Operating Environment & Deployment Architecture](#23-operating-environment--deployment-architecture)
  - [2.4 Design and Implementation Constraints](#24-design-and-implementation-constraints)
  - [2.5 Assumptions and Dependencies](#25-assumptions-and-dependencies)
- [3. System Features & Functional Requirements (FR)](#3-system-features--functional-requirements-fr)
  - [3.1 Authentication & Identity Governance (FR-AUTH)](#31-authentication--identity-governance-fr-auth)
  - [3.2 AI Symptom Triage & Emergency Red-Flag Gating (FR-TRG)](#32-ai-symptom-triage--emergency-red-flag-gating-fr-trg)
  - [3.3 Multimodal Document Summarizer & Lab OCR (FR-DOC)](#33-multimodal-document-summarizer--lab-ocr-fr-doc)
  - [3.4 Clinical pgvector Semantic Search & Doctor Discovery (FR-VEC)](#34-clinical-pgvector-semantic-search--doctor-discovery-fr-vec)
  - [3.5 Online-to-Offline (O2O) In-Clinic Scheduling & Admission Tickets (FR-BOK)](#35-online-to-offline-o2o-in-clinic-scheduling--admission-tickets-fr-bok)
  - [3.6 Doctor Clinical Workstation & Longitudinal EMR (FR-CLIN)](#36-doctor-clinical-workstation--longitudinal-emr-fr-clin)
  - [3.7 Multi-Channel Payments & Commercial Quotas (FR-PAY)](#37-multi-channel-payments--commercial-quotas-fr-pay)
  - [3.8 Enterprise Admin Supervision & AI FinOps Analytics (FR-ADM)](#38-enterprise-admin-supervision--ai-finops-analytics-fr-adm)
- [4. External Interface Requirements](#4-external-interface-requirements)
  - [4.1 User Interfaces (UI)](#41-user-interfaces-ui)
  - [4.2 Software Interfaces (APIs & Gateways)](#42-software-interfaces-apis--gateways)
  - [4.3 Hardware & Network Interfaces](#43-hardware--network-interfaces)
- [5. System Non-Functional Requirements (NFR & SLA)](#5-system-non-functional-requirements-nfr--sla)
  - [5.1 Performance & Latency Thresholds](#51-performance--latency-thresholds)
  - [5.2 High Availability & Resilience (Zero Downtime)](#52-high-availability--resilience-zero-downtime)
  - [5.3 Information Security & Data Protection](#53-information-security--data-protection)
  - [5.4 Maintainability & Extensibility](#54-maintainability--extensibility)
- [6. Requirements Traceability Matrix (RTM Mapping)](#6-requirements-traceability-matrix-rtm-mapping)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for **MediAssist-AI**, an enterprise-grade digital telehealth platform combining modern web architectures with commercial multimodal clinical AI APIs, vector similarity search, and automated clinical triage. It provides a single point of reference for developers, quality assurance engineers, project supervisors, and graduation defense committee members.

### 1.2 Document Conventions
- **Mandatory Requirements:** Expressed using "SHALL" or "MUST".
- **Recommended Features:** Expressed using "SHOULD".
- **Identifers:** `FR-<MODULE>-<NUMBER>` for Functional Requirements, `NFR-<CATEGORY>-<NUMBER>` for Non-Functional Requirements.
- **Traceability:** Directly traceable to the 33 Use Cases in [`docs/USE_CASES.md`](./USE_CASES.md) and [`docs/MASTER_TRACEABILITY_INDEX.md`](./MASTER_TRACEABILITY_INDEX.md).

### 1.3 Intended Audience
1. **Capstone Evaluation Committee & Academic Supervisors:** Verification of engineering scope, rigorous architectural decisions, and clinical safety compliance.
2. **Tech Lead & Engineering Team:** Blueprint for sprint implementation, interface contracts, and automated tests.
3. **Quality Assurance (QA) & DevOps Specialists:** Criteria for unit, integration, Playwright E2E, and k6 high-load benchmark validation.

### 1.4 Project Scope & Medical Disclaimer Constraint
MediAssist-AI bridges the communication gap between patients and healthcare providers by combining modern web architectures with multimodal LLM APIs (Google Gemini 1.5 Flash Vision, OpenRouter AI Gateway).
* **Core Clinical Boundary:** The platform acts strictly as an **informational assistant, plain-language document interpreter, and pre-clinical triage router**. It does **NOT** provide definitive medical diagnoses, replace certified physician judgment, or train machine learning models from scratch.
* **Mandatory Medical Disclaimer:** A non-negotiable legal disclaimer banner MUST be permanently rendered across all patient-facing routes:
  > *"Thông tin do AI cung cấp chỉ mang tính tham khảo sơ bộ, không thay thế chẩn đoán của bác sĩ. Trong trường hợp khẩn cấp, vui lòng gọi 115 hoặc đến cơ sở y tế gần nhất."*

---

## 2. Overall System Description

### 2.1 Product Perspective & Context
In Vietnam's tertiary public hospitals (Bach Mai, Cho Ray, University Medical Center), severe overcrowding forces patients to travel across provinces and wait 6 to 8 hours for a 3-minute doctor consultation. Patients struggle with esoteric laboratory reports and fall victim to misleading online self-diagnosis ("Dr. Google").

MediAssist-AI operates on an **Online-to-Offline (O2O)** healthcare model:
1. **Online (Pre-clinical):** Patients summarize diagnostic lab reports, consult the AI Symptom Triage chatbot, and discover matched medical specialists via `pgvector`.
2. **Offline (In-Clinic Consultation):** Patients book guaranteed appointment slots, receive QR-coded admission tickets, and visit the hospital clinic in person. Physicians review structured SBAR summaries and original diagnostic documents on a synchronized dual-screen clinical workstation.

```
[ Patients / Caregivers ]         [ Licensed Doctors ]          [ System Administrators ]
           │                               │                                │
           └───────────────────────┬───────┴────────────────────────────────┘
                                   ▼
                  [ React 18 Single Page Application ]
                  (Vite, TailwindCSS, Zustand Store)
                                   │
                                   ▼ HTTPS / Dual Auth (Cookie + Bearer)
              [ Java 21 / Spring Boot 3.4 Enterprise Core ]
          ├── Security Pipeline (Stateless JWT, Bcrypt cost 12, RBAC)
          ├── Two-Layer Cache Manager (L1 Caffeine <1ms + L2 Redis 1-3ms)
          ├── Clinical AI Orchestrator (Red-Flag Regex + Model Router)
          └── Persistence Layer (HikariCP Connection Pool)
                                   │
                                   ▼
                   [ PostgreSQL 16 + pgvector ]
          ├── 3NF Relational Tables (19 Flyway Migrations V1-V19)
          └── HNSW Vector Graph Index (1536-dim, m=24, ef_construction=128)
```

### 2.2 User Classes and Characteristics (Actors)
1. **Guest / Unauthenticated User:** Can browse the public landing page, interactive live triage simulator, and submit preview document scans subject to IP rate limiting (3 scans / 10 mins).
2. **Patient (Registered Consumer):** Authenticated user with role `PATIENT`. Can conduct multi-turn symptom triage, upload lab records, search verified specialists via semantic similarity, book clinic slots, access longitudinal EMR Medical Passports, and submit reviews.
3. **Doctor (Healthcare Provider):** Authenticated user with role `DOCTOR`. Must be vetted and verified by an Admin. Configures weekly working schedules, conducts clinic consultations, checks in patients, records vital signs and ICD-10 diagnoses, and issues electronic prescriptions.
4. **Admin (System Administrator):** Authenticated user with role `ADMIN`. Manages users, inspects doctor credentials (Admin Vetting), oversees medical specialties, monitors audit logs, and tracks AI token expenditures via FinOps analytics.

### 2.3 Operating Environment & Deployment Architecture
- **Server OS:** Ubuntu 22.04 LTS / Alpine Linux in Docker containers.
- **Runtime Environment:** OpenJDK 21 LTS, Node.js 20 LTS.
- **Relational & Vector Database:** PostgreSQL 16 with `pgvector` 0.7+ and `pg_trgm` extensions.
- **Distributed Cache:** Redis 7 on port `6379`.
- **Cloud Storage:** Supabase S3-compatible Object Storage for medical assets.
- **Reverse Proxy:** Nginx with SSL/TLS 1.3 termination, HTTP/2, Gzip compression, and rate limiting.

### 2.4 Design and Implementation Constraints
1. **Modular Monolith Architecture:** Single deployable Maven artifact (`backend.jar`) avoiding microservice latency overhead and distributed transaction failures.
2. **Stateless Backend Nodes:** Zero session state stored in local JVM memory; all session data and tokens reside in Redis and PostgreSQL.
3. **Two-Layer Cache Pattern:** Mandatory L1 (Caffeine In-Memory) + L2 (Distributed Redis) read-through and write-invalidate caching.
4. **Database Migration Lifecycle:** 100% of schema evolution and seed data managed through versioned Flyway SQL scripts (`V1` through `V19`).
5. **Zero-Trust Login-First:** Clinical endpoints strictly require validated JWT tokens; anonymous access is rejected with `HTTP 401 Unauthorized`.
6. **Medical Data Privacy:** Mandatory PII de-identification adhering to Vietnam Decree 13/2023/ND-CP and HIPAA Safe Harbor before dispatching prompts to external LLMs.

### 2.5 Assumptions and Dependencies
- Relies on external commercial LLM APIs (Google Gemini 1.5 Flash Vision, OpenRouter AI Gateway).
- Implements a local deterministic fallback engine (`DeterministicFallbackAiProvider`) to guarantee continuous operations during external API outages.

---

## 3. System Features & Functional Requirements (FR)

### 3.1 Authentication & Identity Governance (FR-AUTH)

* **FR-AUTH-01 (Dual-Transport Authentication):** The system SHALL authenticate users via `POST /api/v1/auth/login` and issue short-lived JWT access tokens (15-minute TTL) delivered simultaneously in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie and in the JSON response body.
* **FR-AUTH-02 (Google OAuth2 Social Sign-In):** The system SHALL support single sign-on via Google OAuth 2.0 (`/oauth2/authorization/google`), automatically upserting new patient records and issuing JWT credentials.
* **FR-AUTH-03 (Role-Based Access Control - RBAC):** The system SHALL enforce strict RBAC across roles `ADMIN`, `DOCTOR`, and `PATIENT` via Spring Security `@PreAuthorize` guards.
* **FR-AUTH-04 (Anti-Brute Force Account Lockout):** The system SHALL automatically lock user accounts for 15 minutes (`HTTP 423 Locked`) upon 5 consecutive failed login attempts, storing `locked_until` in PostgreSQL to withstand distributed botnet attacks.
* **FR-AUTH-05 (Secure Password Reset):** The system SHALL generate single-use, 60-minute expiring UUID tokens via `POST /api/v1/auth/forgot-password` and permit password updates via `POST /api/v1/auth/reset-password`.
* **FR-AUTH-06 (IP & User Rate Limiting):** The system SHALL enforce Redis sliding-window rate limits: maximum 5 login attempts/min/IP and 5 registration attempts/10 mins/IP.

### 3.2 AI Symptom Triage & Emergency Red-Flag Gating (FR-TRG)

* **FR-TRG-01 (Hard Red-Flag Emergency Gating):** The system SHALL execute deterministic regex scanning on patient input prior to any LLM invocation. Upon detecting acute emergency patterns (coronary syndrome, stroke FAST, anaphylaxis, severe hemorrhage), the system MUST halt LLM dispatch (0ms LLM latency) and return emergency alerts directing the user to dial 115.
* **FR-TRG-02 (Conversational SBAR Assessment):** For non-emergency symptoms, the system SHALL assemble an AI prompt returning structured clinical triage results: urgency classification (`ROUTINE`, `URGENT`, `EMERGENCY`), SBAR clinical summary, AI recommendations, and 2-3 clarifying questions.
* **FR-TRG-03 (Off-Topic & Non-Medical Guard):** The system SHALL detect non-medical prompts (greetings, weather, math, coding) and set `isMedicalRelated = false`, suppressing doctor recommendations and guiding the user back to physical symptoms.
* **FR-TRG-04 (Medical PII De-identification):** Before transmitting prompts to external AI providers, the system SHALL mask 6 PII entity types (name, national ID/BHYT/SID, phone, address, DOB, email) into anonymous tokens, and re-identify them client-side in the response.

### 3.3 Multimodal Document Summarizer & Lab OCR (FR-DOC)

* **FR-DOC-01 (Multi-File Ingestion Queue):** The system SHALL accept up to 5 concurrent medical files (PDF, JPEG, PNG; $\le 10\text{MB}$ each, batch $\le 25\text{MB}$) via `POST /api/v1/documents/analyze`.
* **FR-DOC-02 (Cryptographic Deduplication Sieve):** The system SHALL compute SHA-256 composite checksums of incoming files. If identical records exist in the patient's EMR, the system SHALL return cached analyses immediately (0ms latency, 0 AI tokens, 0 quota deducted).
* **FR-DOC-03 (Gatekeeper Sieve Validation):** The system SHALL inspect binary magic bytes (`%PDF`, `\xFF\xD8\xFF`, `\x89PNG`) and enforce a clinical keyword threshold. Non-medical files (receipts, memes, blurred photos) MUST be rejected with `HTTP 400` with automated quota restoration.
* **FR-DOC-04 (Parallel OCR Extraction):** The system SHALL extract text using Apache PDFBox 3.0.4 for native PDFs and Google Gemini 1.5 Flash Vision (with OpenRouter fallback) for scanned PDFs and images, bounded by a 5-permit Semaphore.
* **FR-DOC-05 (Lazy Cloud Upload & Zero Orphan Files):** Binary files SHALL be uploaded to Supabase Storage only after AI processing succeeds. If database persistence fails, an automated compensating rollback SHALL delete the cloud asset.

### 3.4 Clinical pgvector Semantic Search & Doctor Discovery (FR-VEC)

* **FR-VEC-01 (True Neural 1536-d Embedding):** The system SHALL project patient queries and clinical doctor profiles into a 1536-dimensional continuous semantic space using `text-embedding-3-small`, without hardcoded disease dictionaries.
* **FR-VEC-02 (HNSW High-Precision Indexing):** The database SHALL index verified doctor embeddings using HNSW (`m = 24`, `ef_construction = 128`), executing queries with `SET LOCAL hnsw.ef_search = 100` to guarantee $\ge 99.8\%$ nearest-neighbor recall in $< 12\text{ms}$.
* **FR-VEC-03 (WHRF Multi-Criteria Re-Ranking):** The system SHALL re-rank doctor candidates in L1 cache ($O(M \log K)$ Bounded Min-Heap) using weighted criteria:
  $$\text{Score} = 0.50 \cdot \text{CosineSim} + 0.20 \cdot \text{Rating} \cdot \text{Credibility} + 0.15 \cdot \text{Experience} + 0.15 \cdot \text{Academic} + \text{SpecialtyBonus}$$
* **FR-VEC-04 (Credibility Damper):** For doctors with fewer than 5 patient reviews, the system SHALL apply a credibility damper ($\text{Credibility} = 0.70 + 0.06 \cdot \text{reviewCount}$) to prevent artificial 5-star manipulation.

### 3.5 Online-to-Offline (O2O) In-Clinic Scheduling & Admission Tickets (FR-BOK)

* **FR-BOK-01 (Working Hours Guard):** The system SHALL restrict appointment bookings to hospital operating hours: `08:00 - 12:00` and `13:30 - 17:00`, Monday through Saturday (Sundays closed).
* **FR-BOK-02 (Concurrency Collision Guard):** The database SHALL prevent double-booking through a partial unique index on `appointments(doctor_id, scheduled_start) WHERE status != 'CANCELLED'` and `@Transactional(isolation = REPEATABLE_READ)`.
* **FR-BOK-03 (Electronic Admission Ticket):** Upon successful booking, the system SHALL generate an O2O admission ticket containing a sequential daily queue number (`STT 01`), clinic room, hospital location, and a scannable RFC 8259-compliant QR code.
* **FR-BOK-04 (Appointment Rescheduling):** Patients SHALL be permitted to reschedule appointments to available future slots at least 2 hours in advance.
* **FR-BOK-05 (Cancellation & Auto-Refund):** When an appointment with `payment_status = 'PAID'` is cancelled, the system SHALL automatically trigger payment refund and update status to `REFUNDED`.

### 3.6 Doctor Clinical Workstation & Longitudinal EMR (FR-CLIN)

* **FR-CLIN-01 (Dual-Screen Split-Screen Workstation):** The doctor workstation SHALL render a 50/50 split-screen view presenting original diagnostic documents (PDF/image) adjacent to AI-extracted biochemical indicators and SBAR summaries.
* **FR-CLIN-02 (Clinical Encounter Recording):** Doctors SHALL record clinical encounters including vital signs (blood pressure, pulse, temperature, SpO2, BMI), ICD-10 diagnostic codes, clinical notes, and multi-item electronic prescriptions.
* **FR-CLIN-03 (Sequential Queue Calling):** Doctors SHALL advance the patient queue via `callNextPatient`, automatically transitioning the earliest `SCHEDULED` patient to `IN_PROGRESS` with optimistic locking.
* **FR-CLIN-04 (Follow-Up Scheduling):** Doctors SHALL directly book follow-up appointments for patients within the active consultation screen.
* **FR-CLIN-05 (Doctor Review System):** Patients with `COMPLETED` appointments SHALL be permitted to submit a 1-to-5 star rating and review, updating the doctor's composite score and review count.

### 3.7 Multi-Channel Payments & Commercial Quotas (FR-PAY)

* **FR-PAY-01 (Multi-Channel Payment Gateways):** The system SHALL support payments via Stripe Sandbox, VietQR, and Local Mock gateways with immutable `payment_transactions` ledger tracking.
* **FR-PAY-02 (Atomic Scan Quota Deduction):** The system SHALL atomically deduct 1 scan quota per multi-file analysis batch, with a compensating rollback hook restoring quota if pipeline failures occur.
* **FR-PAY-03 (MediPass VIP Subscriptions):** The system SHALL support VIP subscriptions (149,000 VND/month) conferring unlimited scans, priority consultations, and family EMR storage.

### 3.8 Enterprise Admin Supervision & AI FinOps Analytics (FR-ADM)

* **FR-ADM-01 (Doctor Credential Vetting):** Administrators SHALL inspect doctor medical licenses and approve or reject profiles before they become publicly bookable.
* **FR-ADM-02 (AI Token & FinOps Dashboard):** The system SHALL record every AI invocation in `ai_token_usage` (prompt tokens, completion tokens, USD cost) and display time-series cost charts on the Admin Dashboard.
* **FR-ADM-03 (System Health Probes):** The system SHALL expose Actuator health probes: Liveness (`/api/v1/health/live`) and Readiness (`/api/v1/health/ready` verifying DB pool and Redis connectivity).
* **FR-ADM-04 (Audit Trail Logging):** The system SHALL persist tamper-evident records of sensitive actions (user status updates, doctor approvals, cancellations) in `audit_logs`.

---

## 4. External Interface Requirements

### 4.1 User Interfaces (UI)
* **Framework:** React 18, Vite, TypeScript, TailwindCSS.
* **Design Language:** Clinical White & Medical Blue theme (`#0284c7`, `#0ea5e9`, `#f8fafc`).
* **Responsiveness:** Fluid grid layouts adapting from mobile viewports (375px) to dual-monitor desktop workstations (1920px+).
* **Real-Time Indicators:** Animated ECG cardiac monitor simulation and dynamic status badges.

### 4.2 Software Interfaces (APIs & Gateways)
* **REST API:** 33 resource-oriented controllers adhering to OpenAPI 3.0 / Swagger UI (`/swagger-ui.html`).
* **AI Gateways:** Google Gemini REST API (v1beta), OpenRouter HTTP/2 API.
* **Object Storage:** Supabase S3-compatible REST API.
* **Payment Gateways:** Stripe Java SDK 33.4.2, VietQR image payload generator.

### 4.3 Hardware & Network Interfaces
* **Protocols:** HTTPS (TLS 1.3 mandated), WebSockets for real-time notifications, HTTP/2 for API calls.
* **Database Ports:** PostgreSQL internal port `5433` (container 5432), Redis port `6379`.

---

## 5. System Non-Functional Requirements (NFR & SLA)

### 5.1 Performance & Latency Thresholds
* **NFR-PERF-01:** L1 Caffeine in-memory cached reads SHALL achieve latency $p95 < 1\text{ms}$.
* **NFR-PERF-02:** L2 Redis cached reads SHALL achieve latency $p95 < 3\text{ms}$.
* **NFR-PERF-03:** PostgreSQL relational database reads SHALL achieve latency $p95 < 50\text{ms}$.
* **NFR-PERF-04:** HNSW vector similarity search over 100,000 vectors SHALL execute in $< 12\text{ms}$.
* **NFR-PERF-05:** End-to-end multimodal document analysis SHALL complete in $\le 15 - 20\text{s}$ with asynchronous progress indication.

### 5.2 High Availability & Resilience (Zero Downtime)
* **NFR-AVAIL-01:** System availability SHALL meet $\ge 99.9\%$ uptime under continuous operation.
* **NFR-AVAIL-02:** The system SHALL sustain $\ge 500$ concurrent Virtual Users (VU) without connection pool exhaustion or unhandled 500 errors.
* **NFR-AVAIL-03:** Process management SHALL support graceful shutdown with a 10-second request draining timeout.
* **NFR-AVAIL-04:** Upon external AI service failure, the system SHALL execute speculative failover and gracefully degrade to deterministic offline rules.

### 5.3 Information Security & Data Protection
* **NFR-SEC-01:** Passwords SHALL be hashed using Bcrypt with a work factor of 12.
* **NFR-SEC-02:** Access tokens SHALL be signed with HMAC-SHA256 (256-bit secret) and transported in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
* **NFR-SEC-03:** Patient PII SHALL be de-identified prior to cloud transmission in compliance with Decree 13/2023/ND-CP.
* **NFR-SEC-04:** Security headers MUST include `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict CORS policies.

### 5.4 Maintainability & Extensibility
* **NFR-MAINT-01:** Automated unit and slice test suites SHALL achieve 100% pass rate across $\ge 140$ tests.
* **NFR-MAINT-02:** Frontend codebase SHALL compile cleanly with zero TypeScript errors under strict mode (`tsc`).
* **NFR-MAINT-03:** Database changes SHALL be strictly versioned using Flyway migration scripts.

---

## 6. Requirements Traceability Matrix (RTM Mapping)

| Requirement ID | Module / Feature Name | Use Case Code | Database / Migration | Target SLA / Verification |
| :--- | :--- | :---: | :--- | :--- |
| **FR-AUTH-01..03** | Dual Authentication & RBAC | `UC-01` | `users`, `roles` (V1, V3) | Playwright `auth.spec.ts` |
| **FR-AUTH-04** | Anti-Brute Force Lockout | `UC-10` | `users(locked_until)` (V3) | `SecurityHardeningTest.java` |
| **FR-AUTH-05** | Secure Password Reset | `UC-24` | `password_reset_tokens` (V16) | `PasswordResetTest.java` |
| **FR-TRG-01** | Red-Flag Emergency Gating | `UC-02` | `triage_sessions` (V1) | `RedFlagServiceTest.java` |
| **FR-TRG-02..04** | AI Triage & PII De-identification | `UC-02` | `triage_sessions` (V1, V15) | `MedicalPiiServiceTest.java` |
| **FR-DOC-01..03** | Multi-File Ingestion & Gatekeeper | `UC-03` | `medical_documents` (V1, V4) | `MedicalDocumentValidatorTest.java` |
| **FR-DOC-04..05** | Parallel OCR & Zero Orphan Files | `UC-03` | `document_analyses` (V1, V5) | `MedicalDocumentAnalysisServiceTest.java` |
| **FR-VEC-01..02** | True Neural Embedding & HNSW | `UC-04` | `doctor_profiles` (V1, V10, V19)| `DoctorSemanticSearchServiceTest.java` |
| **FR-VEC-03..04** | WHRF Re-Ranking & Credibility Damper | `UC-04` | `doctor_profiles` (V17, V19) | `DoctorSemanticSearchServiceTest.java` |
| **FR-BOK-01..02** | O2O Scheduling & Concurrency Guard | `UC-05` | `appointments` (V1, V7) | `AppointmentServiceTest.java` |
| **FR-BOK-03** | Admission Ticket & O2O QR | `UC-27` | `appointments(queue_number)` (V2) | `admission-ticket.spec.ts` |
| **FR-BOK-04..05** | Rescheduling & Auto-Refund | `UC-23, 25`| `appointments(status=REFUNDED)` (V15)| `AppointmentServiceTest.java` |
| **FR-CLIN-01..03** | Workstation & Queue Advancing | `UC-20, 28`| `appointments` (V1, V2) | `doctor-workstation.spec.ts` |
| **FR-CLIN-04..05** | Follow-Up Booking & Doctor Reviews | `UC-20, 26`| `doctor_reviews` (V17) | `DoctorReviewServiceTest.java` |
| **FR-PAY-01..03** | Multi-Channel Pay & Quotas | `UC-11, 14, 19`| `payment_transactions` (V13) | `PaymentServiceTest.java` |
| **FR-ADM-01** | Doctor Vetting & CCHN Verification | `UC-06` | `doctor_profiles` (V1, V9) | `AdminVettingServiceTest.java` |
| **FR-ADM-02** | AI FinOps Cost Tracking | `UC-29` | `ai_token_usage` (V18) | `AiUsageAnalyticsServiceTest.java` |
| **FR-ADM-03..04** | Health Probes & Audit Trail | `UC-07, 17`| `audit_logs` (V1, V6, V12) | Actuator `/api/v1/health/ready` |
