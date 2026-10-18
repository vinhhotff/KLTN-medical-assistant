# -*- coding: utf-8 -*-
"""
Part 1: Record of Changes, 1. Product Overview, 2.1 Actors, 2.2 Use Cases (Diagrams & Descriptions),
2.3.1 Common Use Case Specifications (UC-COMM-01 to UC-COMM-06).
Derived 100% from actual MediAssist-AI codebase (Spring Boot 3.4 + React 18).
"""

def get_content():
    return """# CAPSTONE PROJECT REPORT — REPORT 3
## SOFTWARE REQUIREMENT SPECIFICATION (SRS) — MEDIASSIST-AI
### Enterprise-Grade Resilient Telehealth Platform with Multimodal Clinical AI & Semantic Doctor Matching

> **Document Code:** FPT-CAPSTONE-SRS-MEDASSIST-01
> **Project Name:** MediAssist-AI (Nền tảng Y tế Số Thông minh: Sàng lọc Triệu chứng & Tóm tắt Hồ sơ Bệnh án Đa phương thức)
> **Institution:** Trường Đại học FPT (FPT University) — Chuyên ngành Kỹ thuật Phần mềm & Trí tuệ Nhân tạo (SE-AI)
> **Academic Target Standard:** IEEE Std 830-1998 / ISO/IEC/IEEE 29148:2018 Systems and Software Engineering
> **Release Status:** Complete System Release (Milestone 7 — Final Capstone Defense Baseline)
> **Current Version:** 2.2.0
> **Date:** October 2026

---

## 📑 TABLE OF CONTENTS

- [I. Record of Changes](#i-record-of-changes)
- [1. Product Overview](#1-product-overview)
  - [1.1 Purpose & Executive Summary](#11-purpose--executive-summary)
  - [1.2 Scope of the System](#12-scope-of-the-system)
  - [1.3 Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
  - [1.4 References](#14-references)
  - [1.5 System Overview & High-Level Architecture](#15-system-overview--high-level-architecture)
- [2. User Requirements](#2-user-requirements)
  - [2.1 Actors & System Classes](#21-actors--system-classes)
  - [2.2 Use Cases](#22-use-cases)
    - [2.2.1 Diagram(s)](#221-diagrams)
    - [2.2.2 Descriptions](#222-descriptions)
  - [2.3 Use Case Specification(s)](#23-use-case-specifications)
    - [2.3.1 Common Use Case Specifications](#231-common-use-case-specifications)
      - [2.3.1.1 Sign In (UC-COMM-01)](#2311-sign-in-uc-comm-01)
      - [2.3.1.2 Sign Out (UC-COMM-02)](#2312-sign-out-uc-comm-02)
      - [2.3.1.3 Change Password (UC-COMM-03)](#2313-change-password-uc-comm-03)
      - [2.3.1.4 View & Update Patient Profile (UC-COMM-04)](#2314-view--update-patient-profile-uc-comm-04)
      - [2.3.1.5 Forgot Password & Token Hash Reset (UC-COMM-05)](#2315-forgot-password--token-hash-reset-uc-comm-05)
      - [2.3.1.6 Email Verification Gate (UC-COMM-06)](#2316-email-verification-gate-uc-comm-06)
    - [2.3.2 Patient (Portal & Triage)](#232-patient-portal--triage)
      - [2.3.2.1 Conversational AI Symptom Triage (UC-PAT-01)](#2321-conversational-ai-symptom-triage-uc-pat-01)
      - [2.3.2.2 5-Stage Clinical Query Defense (UC-PAT-02)](#2322-5-stage-clinical-query-defense-uc-pat-02)
      - [2.3.2.3 Semantic Doctor Search via pgvector HNSW (UC-PAT-03)](#2323-semantic-doctor-search-via-pgvector-hnsw-uc-pat-03)
      - [2.3.2.4 View Doctor Details & Available Slots (UC-PAT-04)](#2324-view-doctor-details--available-slots-uc-pat-04)
      - [2.3.2.5 Upload Medical Document & Vision OCR (UC-PAT-05)](#2325-upload-medical-document--vision-ocr-uc-pat-05)
      - [2.3.2.6 Inspect Extracted Biomarkers & LOINC Codes (UC-PAT-06)](#2326-inspect-extracted-biomarkers--loinc-codes-uc-pat-06)
      - [2.3.2.7 Download Document File via 15-Min Signed URL (UC-PAT-07)](#2327-download-document-file-via-15-min-signed-url-uc-pat-07)
      - [2.3.2.8 Purchase AI Analysis Quota (UC-PAT-08)](#2328-purchase-ai-analysis-quota-uc-pat-08)
      - [2.3.2.9 Book In-Clinic Appointment (UC-PAT-09)](#2329-book-in-clinic-appointment-uc-pat-09)
      - [2.3.2.10 Process Payment via Stripe / Mock Sandbox (UC-PAT-10)](#23210-process-payment-via-stripe--mock-sandbox-uc-pat-10)
      - [2.3.2.11 View Electronic Encounter Slip (STT) (UC-PAT-11)](#23211-view-electronic-encounter-slip-stt-uc-pat-11)
      - [2.3.2.12 View Patient Appointment History (UC-PAT-12)](#23212-view-patient-appointment-history-uc-pat-12)
      - [2.3.2.13 Patient Check-In for Appointment (UC-PAT-13)](#23213-patient-check-in-for-appointment-uc-pat-13)
      - [2.3.2.14 Reschedule Appointment (UC-PAT-14)](#23214-reschedule-appointment-uc-pat-14)
      - [2.3.2.15 Cancel Appointment with Automated Refund (UC-PAT-15)](#23215-cancel-appointment-with-automated-refund-uc-pat-15)
      - [2.3.2.16 Submit Doctor Review and Rating (UC-PAT-16)](#23216-submit-doctor-review-and-rating-uc-pat-16)
      - [2.3.2.17 View Triage History (UC-PAT-17)](#23217-view-triage-history-uc-pat-17)
      - [2.3.2.18 De-identify Medical PII in Text (UC-PAT-18)](#23218-de-identify-medical-pii-in-text-uc-pat-18)
    - [2.3.3 Doctor (Clinical Workstation)](#233-doctor-clinical-workstation)
      - [2.3.3.1 View Doctor Workstation Dashboard & Stats (UC-DOC-01)](#2331-view-doctor-workstation-dashboard--stats-uc-doc-01)
      - [2.3.3.2 Configure Doctor Schedule Slots (UC-DOC-02)](#2332-configure-doctor-schedule-slots-uc-doc-02)
      - [2.3.3.3 View Daily Patient Queue & Call Next (UC-DOC-03)](#2333-view-daily-patient-queue--call-next-uc-doc-03)
      - [2.3.3.4 Pre-Encounter Split-Screen Inspection (UC-DOC-04)](#2334-pre-encounter-split-screen-inspection-uc-doc-04)
      - [2.3.3.5 Access Patient Records via PatientAccessGuard (UC-DOC-05)](#2335-access-patient-records-via-patientaccessguard-uc-doc-05)
      - [2.3.3.6 Autocomplete Diagnosis with WHO ICD-10 (UC-DOC-06)](#2336-autocomplete-diagnosis-with-who-icd-10-uc-doc-06)
      - [2.3.3.7 Autocomplete Lab Indicators with LOINC (UC-DOC-07)](#2337-autocomplete-lab-indicators-with-loinc-uc-doc-07)
      - [2.3.3.8 Complete Clinical Encounter & Record EMR (UC-DOC-08)](#2338-complete-clinical-encounter--record-emr-uc-doc-08)
      - [2.3.3.9 Schedule In-Clinic Follow-up Visit (UC-DOC-09)](#2339-schedule-in-clinic-follow-up-visit-uc-doc-09)
      - [2.3.3.10 Doctor Cancel Appointment with 100% Refund (UC-DOC-10)](#23310-doctor-cancel-appointment-with-100-refund-uc-doc-10)
      - [2.3.3.11 View Patient Reviews & Ratings (UC-DOC-11)](#23311-view-patient-reviews--ratings-uc-doc-11)
      - [2.3.3.12 Update Doctor Profile & Biography (UC-DOC-12)](#23312-update-doctor-profile--biography-uc-doc-12)
      - [2.3.3.13 Export Medical Record & Prescription PDF (UC-DOC-13)](#23313-export-medical-record--prescription-pdf-uc-doc-13)
      - [2.3.3.14 Manage Assigned Clinical Specialties (UC-DOC-14)](#23314-manage-assigned-clinical-specialties-uc-doc-14)
    - [2.3.4 Admin (Governance & AI FinOps)](#234-admin-governance--ai-finops)
      - [2.3.4.1 View Executive Statistics & Overview (UC-ADM-01)](#2341-view-executive-statistics--overview-uc-adm-01)
      - [2.3.4.2 Monitor AI Token Usage & FinOps (UC-ADM-02)](#2342-monitor-ai-token-usage--finops-uc-adm-02)
      - [2.3.4.3 Toggle System-wide AI Provider & Fallback (UC-ADM-03)](#2343-toggle-system-wide-ai-provider--fallback-uc-adm-03)
      - [2.3.4.4 Sync Doctor Vector Embeddings (UC-ADM-04)](#2344-sync-doctor-vector-embeddings-uc-adm-04)
      - [2.3.4.5 Vet & Approve Doctor CCHN License (UC-ADM-05)](#2345-vet--approve-doctor-cchn-license-uc-adm-05)
      - [2.3.4.6 Manage Doctor Directory (UC-ADM-06)](#2346-manage-doctor-directory-uc-adm-06)
      - [2.3.4.7 User Access Control & Account Locking (UC-ADM-07)](#2347-user-access-control--account-locking-uc-adm-07)
      - [2.3.4.8 Manage Clinical Specialties & Taxonomy (UC-ADM-08)](#2348-manage-clinical-specialties--taxonomy-uc-adm-08)
      - [2.3.4.9 Supervise Appointments & Force Cancel (UC-ADM-09)](#2349-supervise-appointments--force-cancel-uc-adm-09)
      - [2.3.4.10 Supervise AI Triage Sessions (UC-ADM-10)](#23410-supervise-ai-triage-sessions-uc-adm-10)
      - [2.3.4.11 View Security Audit Logs & IDOR Records (UC-ADM-11)](#23411-view-security-audit-logs--idor-records-uc-adm-11)
- [3. Functional Requirements](#3-functional-requirements)
  - [3.1 System Functional Overview](#31-system-functional-overview)
    - [3.1.1 Screens Flow](#311-screens-flow)
    - [3.1.2 Screen Descriptions](#312-screen-descriptions)
    - [3.1.3 Screen Authorization Matrix](#313-screen-authorization-matrix)
    - [3.1.4 Non-Screen Functions](#314-non-screen-functions)
    - [3.1.5 Physical Entity Relationship Diagram](#315-physical-entity-relationship-diagram)
  - [3.2 Applications for Patients, Doctors, and Admins](#32-applications-for-patients-doctors-and-admins)
    - [3.2.1 Welcome & Authentication Flow](#321-welcome--authentication-flow)
    - [3.2.2 Conversational Triage & Clinical Defense Engine](#322-conversational-triage--clinical-defense-engine)
    - [3.2.3 Semantic Vector Search & Doctor Matching Engine](#323-semantic-vector-search--doctor-matching-engine)
    - [3.2.4 Multimodal Medical Document OCR & LOINC Summarizer](#324-multimodal-medical-document-ocr--loinc-summarizer)
    - [3.2.5 O2O Clinical Scheduling & Multi-Channel Payment](#325-o2o-clinical-scheduling--multi-channel-payment)
    - [3.2.6 Doctor Clinical Workstation & Longitudinal EMR](#326-doctor-clinical-workstation--longitudinal-emr)
    - [3.2.7 Admin Governance & AI FinOps Analytics](#327-admin-governance--ai-finops-analytics)
- [4. Non-Functional Requirements](#4-non-functional-requirements)
  - [4.1 External Interfaces](#41-external-interfaces)
    - [4.1.1 User Interfaces](#411-user-interfaces)
    - [4.1.2 Hardware Interfaces](#412-hardware-interfaces)
    - [4.1.3 Software Interfaces](#413-software-interfaces)
  - [4.2 Quality Attributes](#42-quality-attributes)
    - [4.2.1 Usability](#421-usability)
    - [4.2.2 Reliability & Fault Tolerance](#422-reliability--fault-tolerance)
    - [4.2.3 Performance & Scalability](#423-performance--scalability)
    - [4.2.4 Security & Regulatory Privacy](#424-security--regulatory-privacy)
    - [4.2.5 Maintainability & Observability](#425-maintainability--observability)
- [5. Requirement Appendix](#5-requirement-appendix)
  - [5.1 Business Rules](#51-business-rules)
  - [5.2 Acronyms and Abbreviations](#52-acronyms-and-abbreviations)
  - [5.3 Common Requirements](#53-common-requirements)
  - [5.4 Application Messages List](#54-application-messages-list)
  - [5.5 Requirements Traceability Matrix (RTM)](#55-requirements-traceability-matrix-rtm)

---

## I. RECORD OF CHANGES

| Version | Date | Author / Team | Change Description & Rationale | Approval Status |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-02-15 | SE-AI Capstone Team | Initial Project Charter and SRS draft based on IEEE 830 baseline. | Approved (Faculty) |
| **1.5.0** | 2026-05-20 | SE-AI Capstone Team | Mid-term Defense Update: Integrated Google Gemini Vision OCR, pgvector HNSW indexing, and initial O2O appointment flow. | Approved (Milestone 4) |
| **2.0.0** | 2026-08-30 | SE-AI Capstone Team | Pre-defense overhaul: Integrated 5-stage Clinical Defense Engine, WHRF-SOTA Re-ranking, and Doctor Workstation Split-Screen UI. | Approved (Milestone 6) |
| **2.1.0** | 2026-10-05 | SE-AI Capstone Team | Enterprise Hardening: Fixed BOLA/IDOR vulnerability with `PatientAccessGuard`, private Supabase S3 bucket with 15-minute signed URLs, Bcrypt cost 12, PII de-identification limit (20k chars). | Approved (Internal Audit) |
| **2.2.0** | 2026-10-18 | SE-AI Capstone Team | Final Capstone Defense Baseline: 1-to-1 IEEE 830 alignment with 108-page FPT Capstone structure. 49 full Use Cases, 18 Screen specs, WHO ICD-10 & LOINC MOH ontologies, Flyway V1–V22, and 306/306 test baseline. | Approved (Final Capstone) |

---

## 1. PRODUCT OVERVIEW

### 1.1 Purpose & Executive Summary
The purpose of this Software Requirement Specification (SRS) is to establish a rigorous, formal, and authoritative technical definition of the **MediAssist-AI** Telehealth & Clinical Decision Support System. This document serves as the primary technical contract for software engineering, artificial intelligence orchestration, cloud infrastructure, quality assurance, and academic defense at FPT University.

MediAssist-AI is an enterprise-grade **Online-to-Offline (O2O) Telehealth Ecosystem** that bridges the communication gap between patients and primary healthcare facilities. By leveraging Multimodal Vision Artificial Intelligence (Google Gemini 1.5 Flash), Vector Similarity Search (PostgreSQL 16 `pgvector`), and a 5-Stage Clinical Defense Engine, MediAssist-AI delivers intelligent symptom triage, lab test interpretation, semantic physician discovery, and streamlined clinical encounter management.

### 1.2 Scope of the System
The MediAssist-AI platform encompasses five tightly coupled operational subsystems:
1. **Conversational Clinical Triage & Defensive Screening Subsystem:** Processes natural language patient symptom queries, intercepts acute emergency red-flags (Hotline 115 lockouts), normalizes Vietnamese colloquialisms/slang, applies Vietnamese NegEx clause splitting, filters out-of-domain administrative chatter, and decomposes multi-symptom presentations.
2. **Clinical pgvector Semantic Doctor Matching Subsystem:** Generates 1536-dimensional continuous embeddings (`openai/text-embedding-3-small`), indexes clinical physician profiles via Hierarchical Navigable Small World (HNSW) graphs, and executes a Weighted Hybrid Re-Ranking Formula (WHRF) within a bounded min-heap to match patients with qualified specialists.
3. **Multimodal Medical Document Interpretation Subsystem:** Ingests unstructured patient lab reports, blood panels, and imaging scans (PDF/PNG/JPEG), performs optical character recognition (OCR), extracts numerical biomarkers into structured tables, maps findings to WHO LOINC standards, compares values against demographic physiological reference ranges, and translates jargon into layperson Vietnamese.
4. **O2O In-Clinic Appointment & Admission Ticket Subsystem:** Enables real-time scheduling within hospital operational windows (08:00–17:00, Monday–Saturday), prevents concurrent double-booking, issues digital admission slips with sequential queue numbers (STT), clinic room routing, Google Maps positioning, pre-encounter instructions, and `.ics` calendar exports.
5. **Doctor Clinical Workstation & Longitudinal EMR Subsystem:** Provides attending physicians with a split-screen workstation (original lab document vs. AI SBAR summary), full ICD-10 diagnosis autocomplete (WHO & Decision 7603/QĐ-BYT), LOINC test autocomplete (Decision 3280/QĐ-BYT), electronic prescription generation, and immutable medical record archiving protected by Broken Object Level Authorization (`PatientAccessGuard`) defenses.

*Out-of-Scope:* Pure telemedicine video consultation without physical examination, real-time ICU telemetry device streaming, autonomous robotic surgical control, and automated pharmacy dispensing without licensed physician sign-off.

### 1.3 Definitions, Acronyms, and Abbreviations
- **AI:** Artificial Intelligence.
- **ANN:** Approximate Nearest Neighbor search over high-dimensional vector spaces.
- **BOLA / IDOR:** Broken Object Level Authorization / Insecure Direct Object Reference (OWASP API Security Top 1).
- **EMR / EHR:** Electronic Medical Record / Electronic Health Record.
- **FAST:** Face, Arm, Speech, Time — standardized clinical protocol for acute stroke identification.
- **HNSW:** Hierarchical Navigable Small World graph indexing for pgvector ($m=24, ef\_construction=128$).
- **ICD-10:** International Statistical Classification of Diseases and Related Health Problems, 10th Revision (WHO).
- **JWT:** JSON Web Token (RFC 7519) utilizing stateless dual-transport (HttpOnly Secure Cookie + Response Body).
- **LOINC:** Logical Observation Identifiers Names and Codes for clinical laboratory test standardization.
- **MOH:** Ministry of Health of Vietnam (Bộ Y Tế).
- **NegEx:** Clinical Negation Extraction algorithm adapted for Vietnamese syntactic clause boundaries.
- **O2O:** Online-to-Offline clinical workflow (Online triage/scheduling $\rightarrow$ In-person physical examination).
- **OCR:** Optical Character Recognition.
- **PII:** Personally Identifiable Information governed by Decree 13/2023/NĐ-CP and HIPAA Safe Harbor.
- **RBAC:** Role-Based Access Control enforcing `PATIENT`, `DOCTOR`, and `ADMIN` privileges.
- **SBAR:** Situation, Background, Assessment, Recommendation — standardized clinical handoff framework.
- **WHRF:** Weighted Hybrid Re-Ranking Formula combining dense similarity, lexical overlap, and credentials.

### 1.4 References
1. IEEE Std 830-1998: *IEEE Recommended Practice for Software Requirements Specifications*.
2. ISO/IEC/IEEE 29148:2018: *Systems and Software Engineering — Life Cycle Processes — Requirements Engineering*.
3. Ministry of Health Vietnam: *Decision 7603/QĐ-BYT promulgating the Master List of ICD-10 Medical Diagnoses*.
4. Ministry of Health Vietnam: *Decision 3280/QĐ-BYT promulgating the Catalog of Technical Services and LOINC Codes*.
5. Government of Vietnam: *Decree 13/2023/NĐ-CP on Personal Data Protection (PDPD)*.
6. Malkov, Y. A., & Yashunin, D. A. (2018). *Efficient and robust approximate nearest neighbors using Hierarchical Navigable Small World graphs*. IEEE TPAMI.
7. Chapman, W. W., et al. (2001). *A simple algorithm for identifying negated findings and diseases in discharge summaries (NegEx)*. Journal of Biomedical Informatics.

### 1.5 System Overview & High-Level Architecture
MediAssist-AI follows an enterprise Modular Monolith architecture implemented with Spring Boot 3.4 (Java 21 LTS Project Loom Virtual Threads) and React 18 (TypeScript Vite SPA), integrated with PostgreSQL 16 `pgvector`, Redis distributed cache, Supabase S3 private storage, and AI inference gateways:

```mermaid
graph TD
    subgraph "Client Layer (Presentation - React 18 / Vite / TypeScript)"
        Landing[SCR-01: LandingPage]
        Login[SCR-02: LoginPage]
        PatientApp[SCR-07..10: Patient Portal SPA]
        DoctorApp[SCR-12..14: Doctor Workstation SPA]
        AdminApp[SCR-15..18: Admin Operations Console]
    end

    subgraph "Security & API Gateway (Spring Boot 3.4 / Spring Security 6)"
        SecurityFilterChain[Stateless Dual-Transport Security Filter]
        JWTFilter[JwtAuthenticationFilter: Cookie + Header]
        AccessGuard[PatientAccessGuard BOLA/IDOR Enforcer]
        RateLimiter[SecurityRateLimiterService: Sliding Bucket]
    end

    subgraph "Core Business Logic Services"
        AuthSvc[AuthService]
        TriageEngine[ClinicalQueryDefenseEngine & TriageService]
        VectorSearch[DoctorSemanticSearchService & EmbeddingService]
        DocAnalysis[MedicalDocumentAnalysisService & Validator]
        ApptSvc[AppointmentService & RefundService]
        OntologySvc[ClinicalOntologyService: ICD-10 & LOINC]
        PaymentSvc[PaymentService & GatewayRouter]
        VettingSvc[AdminVettingService & AiUsageAnalyticsService]
    end

    subgraph "Data Persistence & Cache Layer"
        PostgreSQL[(PostgreSQL 16 LTS + pgvector HNSW)]
        RedisCache[(Redis 7 LTS: L2 Cache & Distributed Rate Limits)]
        SupabaseS3[(Supabase S3 Private Storage: 15-min HMAC Signed URLs)]
    end

    subgraph "External Integration Gateways"
        Gemini[Google Gemini 1.5 Flash Vision API]
        OpenAI[OpenAI text-embedding-3-small API]
        OpenRouter[OpenRouter Free-tier Resilience Pool]
        Stripe[Stripe Payment Sandbox Gateway]
        SMTP[Mailpit / Production SMTP with STARTTLS]
    end

    Landing & Login & PatientApp & DoctorApp & AdminApp --> SecurityFilterChain
    SecurityFilterChain --> JWTFilter --> AccessGuard --> RateLimiter
    RateLimiter --> AuthSvc & TriageEngine & VectorSearch & DocAnalysis & ApptSvc & OntologySvc & PaymentSvc & VettingSvc
    TriageEngine --> Gemini & OpenRouter
    VectorSearch --> OpenAI
    DocAnalysis --> SupabaseS3 & Gemini
    PaymentSvc --> Stripe
    ApptSvc --> SMTP
    AuthSvc & ApptSvc & VectorSearch & OntologySvc --> PostgreSQL
    TriageEngine & VectorSearch & RateLimiter --> RedisCache
```

---

## 2. USER REQUIREMENTS

### 2.1 Actors & System Classes

| Actor Name | Type | Description & System Responsibilities |
| :--- | :--- | :--- |
| **Patient (`PATIENT`)** | Human (Primary) | Registered individual or authenticated guest. Interacts with AI triage, uploads medical documents, searches doctors via semantic vector matching, books in-clinic appointments (08:00–17:00), processes payments, checks in, and manages personal health profile. |
| **Doctor (`DOCTOR`)** | Human (Primary) | Licensed medical practitioner verified by administrators. Manages consultation schedules, views patient appointment queues, calls next patient, inspects pre-encounter split-screen evidence, records vital signs, inputs WHO ICD-10 diagnoses, orders LOINC tests, prescribes medication, and completes clinical encounters. |
| **Admin (`ADMIN`)** | Human (Secondary) | System administrator and medical director. Audits doctor medical practice certificates (CCHN), manages clinical specialties, supervises system-wide appointments, monitors AI token usage and FinOps costs (USD/VNĐ), controls user accounts, toggles AI provider failover mode, and inspects immutable audit logs. |
| **AI Inference Gateway** | External System | External LLM and Vision APIs (Google Gemini 1.5 Flash, OpenAI `text-embedding-3-small`, OpenRouter pool). Ingests clinical prompts and document images, returning structured triage classifications, OCR extractions, and dense vector embeddings. |
| **Payment Gateway** | External System | Payment infrastructure provider (Stripe Sandbox / Mock Payment Gateway). Processes credit card transactions, webhook notifications, and automated refund triggers. |
| **Email Delivery Gateway** | External System | Transactional email provider (Mailpit in development, Production SMTP with STARTTLS). Dispatches account verification links, password reset tokens, and appointment reminders. |
| **Clinical Ontology Registry** | External / Internal | Official medical terminology database loaded from WHO ICD-10, LOINC, and MOH Decisions 7603/QĐ-BYT & 3280/QĐ-BYT. Provides high-speed prefix search for diagnosis and lab coding. |

---

### 2.2 Use Cases

#### 2.2.1 Diagram(s)

```mermaid
graph LR
    subgraph "Actors"
        P((Patient))
        D((Doctor))
        A((Admin))
    end

    subgraph "Common System"
        UC_COMM01(UC-COMM-01: Sign In)
        UC_COMM02(UC-COMM-02: Sign Out)
        UC_COMM03(UC-COMM-03: Change Password)
        UC_COMM04(UC-COMM-04: Update Patient Profile)
        UC_COMM05(UC-COMM-05: Reset Password)
        UC_COMM06(UC-COMM-06: Email Verification Gate)
    end

    subgraph "Patient Domain"
        UC_PAT01(UC-PAT-01: AI Symptom Triage)
        UC_PAT02(UC-PAT-02: 5-Stage Query Defense)
        UC_PAT03(UC-PAT-03: Semantic Doctor Search)
        UC_PAT05(UC-PAT-05: Upload Lab Document)
        UC_PAT06(UC-PAT-06: Inspect Biomarkers & LOINC)
        UC_PAT09(UC-PAT-09: Book In-Clinic Slot)
        UC_PAT10(UC-PAT-10: Process Payment)
        UC_PAT11(UC-PAT-11: View Admission Slip)
        UC_PAT13(UC-PAT-13: Patient Check-In)
        UC_PAT14(UC-PAT-14: Reschedule Appointment)
        UC_PAT15(UC-PAT-15: Cancel & Refund)
        UC_PAT16(UC-PAT-16: Submit Doctor Review)
    end

    subgraph "Doctor Domain"
        UC_DOC01(UC-DOC-01: View Workstation & Stats)
        UC_DOC02(UC-DOC-02: Configure Schedule Slots)
        UC_DOC03(UC-DOC-03: View Daily Queue & Call Next)
        UC_DOC04(UC-DOC-04: Split-Screen Pre-Check)
        UC_DOC05(UC-DOC-05: Guarded Patient Records)
        UC_DOC06(UC-DOC-06: ICD-10 Autocomplete)
        UC_DOC07(UC-DOC-07: LOINC Autocomplete)
        UC_DOC08(UC-DOC-08: Complete Clinical Encounter)
        UC_DOC09(UC-DOC-09: Schedule Follow-up Visit)
        UC_DOC10(UC-DOC-10: Doctor Cancel with Refund)
    end

    subgraph "Admin Domain"
        UC_ADM01(UC-ADM-01: Executive Statistics)
        UC_ADM02(UC-ADM-02: AI FinOps Monitor)
        UC_ADM03(UC-ADM-03: Toggle AI Mode)
        UC_ADM04(UC-ADM-04: Sync Doctor Vectors)
        UC_ADM05(UC-ADM-05: Vet Doctor CCHN License)
        UC_ADM06(UC-ADM-06: Manage Doctor Directory)
        UC_ADM07(UC-ADM-07: User Access Control)
        UC_ADM08(UC-ADM-08: Manage Specialties)
        UC_ADM09(UC-ADM-09: Supervise Appointments)
        UC_ADM10(UC-ADM-10: Supervise Triage Sessions)
        UC_ADM11(UC-ADM-11: Inspect Audit Logs)
    end

    P --> UC_COMM01 & UC_COMM02 & UC_COMM03 & UC_COMM04 & UC_COMM05 & UC_COMM06
    P --> UC_PAT01 & UC_PAT02 & UC_PAT03 & UC_PAT05 & UC_PAT06 & UC_PAT09 & UC_PAT10 & UC_PAT11 & UC_PAT13 & UC_PAT14 & UC_PAT15 & UC_PAT16

    D --> UC_COMM01 & UC_COMM02 & UC_COMM03
    D --> UC_DOC01 & UC_DOC02 & UC_DOC03 & UC_DOC04 & UC_DOC05 & UC_DOC06 & UC_DOC07 & UC_DOC08 & UC_DOC09 & UC_DOC10

    A --> UC_COMM01 & UC_COMM02 & UC_COMM03
    A --> UC_ADM01 & UC_ADM02 & UC_ADM03 & UC_ADM04 & UC_ADM05 & UC_ADM06 & UC_ADM07 & UC_ADM08 & UC_ADM09 & UC_ADM10 & UC_ADM11
```

#### 2.2.2 Descriptions

| Use Case ID | Use Case Name | Primary Actor | Target Backend API Controller / Endpoint | Brief Purpose & Functional Description |
| :--- | :--- | :--- | :--- | :--- |
| **UC-COMM-01** | Sign In | All Roles | `AuthController.login`, `OAuth2` | Authenticate via Email/Password or Google OAuth2; issue dual-transport JWT HttpOnly cookie + Body. |
| **UC-COMM-02** | Sign Out | All Roles | `AuthController.logout` | Invalidate session cookies, revoke refresh tokens, and clear client-side state. |
| **UC-COMM-03** | Change Password | All Roles | `AuthController.resetPassword` | Validate existing password and update with Bcrypt cost 12 hash. |
| **UC-COMM-04** | Update Patient Profile | Patient | `PatientProfileController.updateProfile` | Update personal health profile (DOB, blood type, allergies, emergency contact). |
| **UC-COMM-05** | Reset Password | All Roles | `AuthController.forgotPassword` | Request password reset email and redeem single-use SHA-256 hashed token (`token_hash` V21). |
| **UC-COMM-06** | Email Verification Gate | All Roles | `AuthController.verifyEmail` | Enforce account activation by validating verification token (`email_verification_tokens` V22). |
| **UC-PAT-01** | AI Symptom Triage | Patient | `TriageController.assess` | Multi-turn conversational evaluation generating SBAR report and specialty recommendation. |
| **UC-PAT-02** | 5-Stage Query Defense | Patient | `ClinicalQueryDefenseEngine.process` | Intercept 115 emergency red-flags, teen-code slang, Vietnamese NegEx negation, and OOD chatter. |
| **UC-PAT-03** | Semantic Doctor Search | Patient | `TriageController.searchSemantic` | 1536-d pgvector HNSW search with WHRF-SOTA Min-Heap re-ranking. |
| **UC-PAT-04** | View Doctor Details | Patient | `DoctorController.getDoctorById` | Review doctor bio, CCHN license number, consultation fee, rating, and available slots. |
| **UC-PAT-05** | Upload Medical Document | Patient | `MedicalDocumentController.analyze` | Ingest lab scan (PDF/Image <= 10MB) with SHA-256 deduplication and private Supabase S3 storage. |
| **UC-PAT-06** | Inspect Biomarkers & LOINC | Patient | `MedicalDocumentController.getAnalysis` | View structured table of extracted biomarkers, LOINC codes, abnormal indicators, and layperson summary. |
| **UC-PAT-07** | Download Document File | Patient, Doctor | `MedicalDocumentController.getFile` | Retrieve document source bytes via temporary 15-minute HMAC signed Supabase S3 URL. |
| **UC-PAT-08** | Purchase AI Quota | Patient | `MedicalDocumentController.purchaseQuota` | Purchase document analysis quota packages (QUOTA_PURCHASE order type). |
| **UC-PAT-09** | Book In-Clinic Appointment | Patient | `AppointmentController.createAppointment` | Reserve 30-min slot (08:00–17:00), assign sequential STT queue number, and lock schedule. |
| **UC-PAT-10** | Process Payment | Patient | `PaymentController.checkout`, `verify` | Pay appointment consultation fee via Stripe Checkout or Mock Sandbox. |
| **UC-PAT-11** | View Admission Slip (STT) | Patient | `AppointmentController.getTicket` | Render digital encounter ticket with queue number, clinic room, and preparation instructions. |
| **UC-PAT-12** | View Appointment History | Patient | `AppointmentController.getMyAppointments` | List patient appointments with status badges (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`). |
| **UC-PAT-13** | Patient Check-In | Patient | `AppointmentController.checkIn` | Mark patient arrival at clinic (`checked_in_at`), advancing queue status. |
| **UC-PAT-14** | Reschedule Appointment | Patient | `AppointmentController.rescheduleAppointment` | Move active appointment to a new slot (allowed up to 2 hours in advance). |
| **UC-PAT-15** | Cancel & Auto-Refund | Patient | `AppointmentController.updateStatus` | Cancel booking and trigger automated refund via `AppointmentRefundService`. |
| **UC-PAT-16** | Submit Doctor Review | Patient | `DoctorReviewController.createReview` | Rate consultation (1–5 stars) and comment (allowed only once per completed appointment). |
| **UC-PAT-17** | View Triage History | Patient | `TriageController.getHistory` | Review past conversational triage sessions and generated SBAR reports. |
| **UC-PAT-18** | De-identify Medical PII | Patient | `MedicalPiiController.deidentify` | Redact Vietnamese citizen IDs, phone numbers, and names (max 20,000 characters). |
| **UC-DOC-01** | Doctor Workstation Stats | Doctor | `DoctorController.getMyStats` | View daily patient count, completed consultations, and current queue progress. |
| **UC-DOC-02** | Configure Schedule Slots | Doctor | `DoctorController.updateMySchedules` | Configure weekly recurring consultation slots (`doctor_schedule_slots`). |
| **UC-DOC-03** | Daily Queue & Call Next | Doctor | `DoctorController.callNextPatient` | Call next waiting patient in queue by sequential STT, updating status to `IN_PROGRESS`. |
| **UC-DOC-04** | Split-Screen Pre-Check | Doctor | `DoctorDashboard.tsx` (Split-View) | Cross-examine raw uploaded lab scan alongside AI SBAR synthesis before consultation. |
| **UC-DOC-05** | Guarded Patient Records | Doctor | `AppointmentController.getByPatient` | Access patient historical encounters strictly guarded by `PatientAccessGuard`. |
| **UC-DOC-06** | ICD-10 Autocomplete | Doctor | `ClinicalOntologyController.searchIcd10` | Prefix search WHO ICD-10 and MOH Decision 7603/QĐ-BYT diagnoses in < 30ms. |
| **UC-DOC-07** | LOINC Autocomplete | Doctor | `ClinicalOntologyController.searchLoinc` | Autocomplete laboratory test indicators according to MOH Decision 3280/QĐ-BYT. |
| **UC-DOC-08** | Complete Clinical Encounter | Doctor | `AppointmentController.completeClinical` | Save vital signs JSON, ICD-10 diagnosis, prescription JSON, treatment plan, and lock EMR. |
| **UC-DOC-09** | Schedule Follow-up Visit | Doctor | `AppointmentController.scheduleFollowUp` | Pre-book in-clinic follow-up visit linked to primary encounter. |
| **UC-DOC-10** | Doctor Cancel with Refund | Doctor | `AppointmentController.updateStatus` | Cancel appointment due to medical emergency; automatically issues 100% full patient refund. |
| **UC-DOC-11** | View Reviews & Ratings | Doctor | `DoctorReviewController.getDoctorReviews` | Track patient reviews, star rating distribution, and qualitative feedback. |
| **UC-DOC-12** | Update Doctor Profile | Doctor | `DoctorController.updateMyProfile` | Update bio, consultation fee, clinic room, and triggers async vector re-embedding. |
| **UC-DOC-13** | Export Encounter PDF | Doctor | `MeddiesPdfGeneratorService` | Export official print-ready consultation summary and prescription document. |
| **UC-DOC-14** | Manage Specialties | Doctor | `SpecialtyController.getAllSpecialties` | Select and link secondary medical specialties to doctor profile. |
| **UC-ADM-01** | Executive Statistics | Admin | `AdminController.getStats` | View high-level system telemetry: total users, active doctors, today's appointments. |
| **UC-ADM-02** | AI FinOps Monitor | Admin | `AdminController.getAiUsage` | Track token consumption and cost projection in USD and VNĐ (`AI_COST_VND_PER_USD`). |
| **UC-ADM-03** | Toggle AI Provider | Admin | `SystemConfigController.toggleAiMode` | Switch between Gemini, OpenRouter, and Local Hashing (`POST /api/v1/system/ai-mode/toggle`). |
| **UC-ADM-04** | Sync Doctor Vectors | Admin | `AdminController.syncVectors` | Re-compute 1536-d embeddings for all doctors and refresh HNSW index. |
| **UC-ADM-05** | Vet Doctor CCHN License | Admin | `AdminController.vetDoctor` | Audit medical practice certificate (CCHN) and approve doctor for public listing. |
| **UC-ADM-06** | Manage Doctor Directory | Admin | `AdminController.getDoctorsPaged` | Search, update, or toggle active status of doctors in system directory. |
| **UC-ADM-07** | User Access Control | Admin | `AdminController.updateUserStatus` | Search users, change role, or lock account (`is_active = false`). |
| **UC-ADM-08** | Manage Specialties | Admin | `AdminController.createSpecialty` | Create or update clinical specialties and medical department taxonomy. |
| **UC-ADM-09** | Supervise Appointments | Admin | `AdminController.getAppointments` | Master appointment table with force-cancel and automated refund override. |
| **UC-ADM-10** | Supervise Triage Sessions | Admin | `AdminController.getTriageSessions` | Inspect anonymized clinical triage logs and urgency distributions. |
| **UC-ADM-11** | Inspect Security Audit Logs | Admin | `AdminController.getAuditLogs` | Audit immutable security logs, including `VIEW_PATIENT_RECORD` IDOR monitoring. |

---

### 2.3 Use Case Specification(s)

#### 2.3.1 Common Use Case Specifications

##### 2.3.1.1 Sign In (UC-COMM-01)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-COMM-01` |
| **Use Case Name** | Sign In |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient, Doctor, Admin, Guest |
| **Secondary Actor** | Google Identity Provider, Transactional Email Gateway |
| **Description** | MediAssist-AI Identity & Access Management (IAM) — - User session is established.<br>- Server issues dual-transport JWT: HttpOnly Secure Cookie + Response JSON Body.<br>- User redirected to role-based dashboard:<br>* `PATIENT` -> `/patient`<br>* `DOCTOR`  -> `/doctor`<br>* `ADMIN`   -> `/admin` |
| **Trigger** | User clicks "Sign In" or submits authentication form. |
| **Pre-conditions** | - User has network connection to MediAssist-AI.<br>- If signing in with email/password, account exists in `users` table. |
| **Post-conditions** | - User session is established.<br>- Server issues dual-transport JWT: HttpOnly Secure Cookie + Response JSON Body.<br>- User redirected to role-based dashboard:<br>* `PATIENT` -> `/patient`<br>* `DOCTOR`  -> `/doctor`<br>* `ADMIN`   -> `/admin` |
| **Normal Flow** | Step 1: User navigates to `/login` and selects authentication mode (Password or Google OAuth2).<br>Step 2: User provides email and password or clicks "Sign in with Google".<br>Step 3: Frontend validates non-empty inputs and valid email format regex.<br>Step 4: Frontend sends HTTP POST request to `/api/v1/auth/login` with `LoginRequest` DTO.<br>Step 5: Backend `AuthenticationManager` verifies credentials against Bcrypt hash (cost 12) in `users`.<br>Step 6: Backend checks account status (`is_active == true` and `email_verified == true`).<br>Step 7: Backend generates signed JWT access token (24-hour expiration).<br>Step 8: Backend attaches `Set-Cookie: jwt_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api`.<br>Step 9: Backend returns HTTP 200 OK with `AuthResponse` DTO containing token and user profile metadata.<br>Step 10: Client stores token in Zustand store (`useAuthStore`) and redirects user to target dashboard. |
| **Alternative Flow** | - Alt Flow 11a: Google OAuth2 Sign-In:<br>1. User clicks "Sign in with Google".<br>2. Browser navigates to `/login/oauth2/code/google` authorization endpoint.<br>3. Google returns authorization code; backend exchanges for Google ID and user email.<br>4. If user does not exist, backend auto-provisions account with role `PATIENT` (Flyway V8 `google_id`).<br>5. Backend redirects to frontend `/oauth2/callback` with JWT token.<br>- Alt Flow 11b: Unverified Email Login:<br>1. Backend detects `email_verified == false` (Flyway V22 gate).<br>2. Backend throws `AppException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", ...)`.<br>3. Frontend displays verification notification with "Resend Verification Link" button. |
| **Exceptions** | - Exc Flow 12a: Invalid Credentials (Wrong email or password):<br>1. Backend throws `AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", ...)`.<br>2. Backend returns HTTP 401 Unauthorized.<br>3. Frontend displays inline alert: "Email hoặc mật khẩu không chính xác."<br>- Exc Flow 12b: Account Locked:<br>1. Backend detects `is_active == false`.<br>2. Backend throws `AppException(HttpStatus.LOCKED, "ACCOUNT_LOCKED", ...)`.<br>3. Frontend displays modal directing user to contact administrative support. |
| **Priority** | High (P0 - Architectural Blocker) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-01: Password complexity must be enforced (Min 8 chars, 1 uppercase, 1 digit, 1 special char).<br>- BR-02: Maximum 5 consecutive failed login attempts before 15-minute IP/account rate lock.<br>- BR-03: JWT secret key must have at least 256 bits entropy (`APP_JWT_SECRET`). |
| **Data Entities Involved** | - `users` (id, email, password_hash, role, is_active, email_verified, google_id).<br>- `audit_logs` (id, user_id, action, ip_address, created_at). |
| **User Interface Controls** | - Text inputs: `Email`, `Password`.<br>- Checkbox: `Remember Me`.<br>- Action buttons: `Đăng Nhập`, `Đăng Nhập Với Google`, `Quên Mật Khẩu`. |


##### 2.3.1.2 Sign Out (UC-COMM-02)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-COMM-02` |
| **Use Case Name** | Sign Out |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | All authenticated users (Patient, Doctor, Admin) |
| **Secondary Actor** | Google Identity Provider, Transactional Email Gateway |
| **Description** | MediAssist-AI Identity & Access Management (IAM) — - Client in-memory auth state, user profile, and cached tokens are wiped.<br>- Server clears the HttpOnly `jwt_token` cookie via zero-max-age expiration header.<br>- User is redirected to `/login` with an informational sign-out toast. |
| **Trigger** | User clicks "Sign Out" / "Đăng Xuất" in top navbar or drawer. |
| **Pre-conditions** | User is actively authenticated with a valid JWT token. |
| **Post-conditions** | - Client in-memory auth state, user profile, and cached tokens are wiped.<br>- Server clears the HttpOnly `jwt_token` cookie via zero-max-age expiration header.<br>- User is redirected to `/login` with an informational sign-out toast. |
| **Normal Flow** | Step 1: User clicks "Đăng Xuất" from the user menu avatar dropdown.<br>Step 2: Frontend dispatches HTTP POST to `/api/v1/auth/logout`.<br>Step 3: Backend invalidates session cookies: `Set-Cookie: jwt_token=; Max-Age=0; Path=/; HttpOnly`.<br>Step 4: Backend logs audit entry: `USER_LOGOUT` for telemetry compliance.<br>Step 5: Backend returns HTTP 200 OK with `{"message": "Logged out successfully"}`.<br>Step 6: Frontend clears Zustand stores (`useAuthStore.getState().logout()`).<br>Step 7: Frontend purges all cached sensitive clinical records from browser memory.<br>Step 8: Frontend redirects browser to `/login`. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-04: Terminating the session must invalidate client access immediately. |
| **Data Entities Involved** | - `audit_logs` (action = 'LOGOUT'). |
| **User Interface Controls** | - Menu Item: `Đăng Xuất` with icon `LogOut`. |


##### 2.3.1.3 Change Password (UC-COMM-03)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-COMM-03` |
| **Use Case Name** | Change Password |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient, Doctor, Admin |
| **Secondary Actor** | Google Identity Provider, Transactional Email Gateway |
| **Description** | MediAssist-AI Identity & Access Management (IAM) — - Old password hash in database is replaced with new Bcrypt hash.<br>- Security confirmation notification is dispatched. |
| **Trigger** | User submits password update form in settings. |
| **Pre-conditions** | User is authenticated and knows their current password. |
| **Post-conditions** | - Old password hash in database is replaced with new Bcrypt hash.<br>- Security confirmation notification is dispatched. |
| **Normal Flow** | Step 1: User navigates to security settings and inputs Current and New Password.<br>Step 2: Client validates matching passwords and complexity regex in real time.<br>Step 3: Frontend sends HTTP POST to `/api/v1/auth/reset-password` with `ResetPasswordRequest`.<br>Step 4: Backend verifies password complexity.<br>Step 5: Backend encodes new password with `BCryptPasswordEncoder(12)`.<br>Step 6: Backend commits update to `users.password_hash` within `@Transactional`.<br>Step 7: Backend publishes `PasswordChangedEvent` -> triggers async security notice email.<br>Step 8: Backend returns HTTP 200 OK.<br>Step 9: Frontend displays success toast: "Mật khẩu đã được cập nhật thành công." |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Weak New Password:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", ...)`.<br>2. Frontend displays: "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số." |
| **Priority** | Medium (P2) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-01: Minimum 8 characters, at least 1 uppercase letter, 1 number, and 1 special symbol.<br>- BR-05: New password cannot be identical to the previous password. |
| **Data Entities Involved** | - `users` (password_hash, updated_at). |
| **User Interface Controls** | - Password inputs: `Mật khẩu mới`, `Xác nhận mật khẩu mới`. |


##### 2.3.1.4 View & Update Patient Profile (UC-COMM-04)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-COMM-04` |
| **Use Case Name** | View & Update Patient Profile |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | Google Identity Provider, Transactional Email Gateway |
| **Description** | MediAssist-AI Patient Profile Subsystem — Patient entity in `patient_profiles` is retrieved or updated. |
| **Trigger** | Patient navigates to profile view or updates clinical demographics. |
| **Pre-conditions** | User is authenticated as `PATIENT`. |
| **Post-conditions** | Patient entity in `patient_profiles` is retrieved or updated. |
| **Normal Flow** | Step 1: Patient accesses profile modal/page.<br>Step 2: Frontend calls HTTP GET `/api/v1/patient/profile`.<br>Step 3: Backend retrieves `PatientProfile` linked to `user_id`.<br>Step 4: Backend returns `PatientProfileDto` (date of birth, gender, blood type, allergies, emergency contact, remaining AI quota).<br>Step 5: Patient updates Blood Type, Allergies, or Emergency Contact Phone.<br>Step 6: Frontend dispatches HTTP PUT `/api/v1/patient/profile` with updated DTO.<br>Step 7: Backend validates phone format and citizen ID regex if present.<br>Step 8: Backend commits update to `patient_profiles` table.<br>Step 9: Backend returns HTTP 200 OK with refreshed profile.<br>Step 10: Frontend renders toast: "Hồ sơ sức khỏe đã được cập nhật." |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Invalid Phone Format:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_PHONE", ...)`.<br>2. Frontend displays: "Số điện thoại không đúng định dạng Việt Nam (VD: 0901234567)." |
| **Priority** | Medium (P2) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-06: Vietnamese phone numbers must match regex `^(0\|\\+84)(3\|5\|7\|8\|9)[0-9]{8}$`. |
| **Data Entities Involved** | - `users`, `patient_profiles` (id, user_id, date_of_birth, gender, blood_type, allergies, emergency_contact, remaining_ai_quota). |
| **User Interface Controls** | - Text inputs (`Họ và tên`, `Số điện thoại`, `Người liên hệ khẩn cấp`), select (`Nhóm máu`, `Giới tính`), textarea (`Dị ứng thuốc`). |


##### 2.3.1.5 Forgot Password & Token Hash Reset (UC-COMM-05)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-COMM-05` |
| **Use Case Name** | Forgot Password & Token Hash Reset |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Unauthenticated User (Patient, Doctor, Admin) |
| **Secondary Actor** | Google Identity Provider, Transactional Email Gateway |
| **Description** | MediAssist-AI Identity & Access Management (IAM) — - Single-use SHA-256 hashed password reset token is generated with 15-minute TTL.<br>- Password reset email containing secure redemption link is dispatched asynchronously.<br>- Upon token redemption, user's password is reset and token marked as consumed. |
| **Trigger** | User clicks "Quên mật khẩu?" on login page. |
| **Pre-conditions** | User account exists with a verified email address. |
| **Post-conditions** | - Single-use SHA-256 hashed password reset token is generated with 15-minute TTL.<br>- Password reset email containing secure redemption link is dispatched asynchronously.<br>- Upon token redemption, user's password is reset and token marked as consumed. |
| **Normal Flow** | Step 1: User navigates to `/forgot-password`, inputs registered email, and clicks "Gửi Yêu Cầu".<br>Step 2: Frontend sends HTTP POST to `/api/v1/auth/forgot-password` with `ForgotPasswordRequest(email)`.<br>Step 3: Backend searches `userRepository.findByEmail(email)`.<br>(Security note: If email not found, backend still returns 200 OK to prevent account enumeration).<br>Step 4: Backend generates 32-byte cryptographically secure random token (`SecureRandom`).<br>Step 5: Backend computes SHA-256 hash of raw token (`DigestUtils.sha256Hex(rawToken)`).<br>Step 6: Backend stores hash, user ID, expiration timestamp (`now() + 15 minutes`), and `consumed = false`<br>in `password_reset_tokens` table (Flyway V21 migration).<br>Step 7: Backend asynchronously invokes `EmailService.sendPasswordResetMail(email, rawToken)`.<br>Step 8: User opens email, clicks reset link: `https://mediassist.local/reset-password?token={rawToken}`.<br>Step 9: Frontend calls HTTP GET `/api/v1/auth/reset-password/validate?token={rawToken}` to verify validity.<br>Step 10: User enters new password and confirms password on the reset page.<br>Step 11: Frontend sends HTTP POST to `/api/v1/auth/reset-password` with `rawToken` and `newPassword`.<br>Step 12: Backend hashes `rawToken` with SHA-256 and searches `password_reset_tokens.token_hash`.<br>Step 13: Backend verifies token is not expired (`expires_at > now()`) and not consumed (`consumed == false`).<br>Step 14: Backend updates user's `password_hash` with Bcrypt(cost 12) and marks `consumed = true`.<br>Step 15: Backend returns HTTP 200 OK. Frontend redirects to `/login` with success banner. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Expired or Already Consumed Token:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "TOKEN_EXPIRED", ...)`.<br>2. Backend returns HTTP 400 Bad Request.<br>3. Frontend displays: "Đường dẫn đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Vui lòng thử lại." |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-07: Plaintext reset tokens must NEVER be stored in the database. Only SHA-256 hashes are persisted (Flyway V21).<br>- BR-08: Token lifespan is strictly limited to 15 minutes. |
| **Data Entities Involved** | - `users`, `password_reset_tokens` (id, user_id, token_hash, expires_at, consumed, consumed_at). |
| **User Interface Controls** | - Input: `Email`, `Mật khẩu mới`, `Nhập lại mật khẩu`.<br>- Button: `Gửi Link Đặt Lại`, `Xác Nhận Mật Khẩu Mới`. |


##### 2.3.1.6 Email Verification Gate (UC-COMM-06)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-COMM-06` |
| **Use Case Name** | Email Verification Gate |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Newly registered user |
| **Secondary Actor** | Google Identity Provider, Transactional Email Gateway |
| **Description** | MediAssist-AI Identity & Access Management (IAM) — - User account marked `email_verified = true`.<br>- User is permitted to access full clinical features (booking, triage, consultation). |
| **Trigger** | User clicks the activation link received upon account registration. |
| **Pre-conditions** | Account created with `email_verified = false` (Flyway V22). |
| **Post-conditions** | - User account marked `email_verified = true`.<br>- User is permitted to access full clinical features (booking, triage, consultation). |
| **Normal Flow** | Step 1: Upon registration, backend generates verification token stored in `email_verification_tokens`.<br>Step 2: Backend dispatches HTML email containing activation link: `/verify-email?token={token}`.<br>Step 3: User clicks activation link in email client navigating to `/verify-email`.<br>Step 4: Frontend calls HTTP POST `/api/v1/auth/verify-email` with `VerifyEmailRequest(token)`.<br>Step 5: Backend verifies token validity, matches user, updates `users.email_verified = true`.<br>Step 6: Backend deletes consumed verification token.<br>Step 7: Backend returns HTTP 200 OK with `TokenValidationResponse`.<br>Step 8: Frontend renders success celebration screen with button to proceed to login. |
| **Alternative Flow** | - Alt Flow 11a: Resend Verification Email:<br>1. User calls HTTP POST `/api/v1/auth/resend-verification`.<br>2. Backend enforces rate limiting (`RATE_LIMIT_EXCEEDED`), generates fresh token, and sends new email. |
| **Exceptions** | - Exc Flow 12a: Invalid or Expired Token:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "TOKEN_EXPIRED", "Liên kết xác thực email đã hết hạn.")`.<br>2. Frontend displays error message with option to request a fresh verification link. |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-09: Unverified accounts cannot book clinical appointments or access medical records (`EmailVerificationGuard`). |
| **Data Entities Involved** | - `users` (email_verified), `email_verification_tokens` (id, user_id, token, expires_at). |
| **User Interface Controls** | - Activation banner, button `Kích Hoạt Tài Khoản`, `Gửi Lại Email`. |

"""

if __name__ == "__main__":
    print("Part 1 module loaded successfully. Character count:", len(get_content()))
