# -*- coding: utf-8 -*-
"""
Part 1: Record of Changes, 1. Product Overview, 2.1 Actors, 2.2 Use Cases (Diagrams & Descriptions),
2.3.1 Common Use Case Specifications (UC-COMM-01 to UC-COMM-06).
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
      - [2.3.1.4 Edit Profile & Avatar (UC-COMM-04)](#2314-edit-profile--avatar-uc-comm-04)
      - [2.3.1.5 Forgot Password & Token Hash Reset (UC-COMM-05)](#2315-forgot-password--token-hash-reset-uc-comm-05)
      - [2.3.1.6 Email Verification Gate (UC-COMM-06)](#2316-email-verification-gate-uc-comm-06)
    - [2.3.2 Patient (Portal & Triage)](#232-patient-portal--triage)
      - [2.3.2.1 Interactive Conversational AI Symptom Triage (UC-PAT-01)](#2321-interactive-conversational-ai-symptom-triage-uc-pat-01)
      - [2.3.2.2 Clinical Query Defense Screening (UC-PAT-02)](#2322-clinical-query-defense-screening-uc-pat-02)
      - [2.3.2.3 Semantic Doctor Search via pgvector HNSW (UC-PAT-03)](#2323-semantic-doctor-search-via-pgvector-hnsw-uc-pat-03)
      - [2.3.2.4 View Doctor Profile & Academic Credentials (UC-PAT-04)](#2324-view-doctor-profile--academic-credentials-uc-pat-04)
      - [2.3.2.5 Upload Medical Document & Lab Test Image/PDF (UC-PAT-05)](#2325-upload-medical-document--lab-test-imagepdf-uc-pat-05)
      - [2.3.2.6 View Medical Document AI Summary & Biomarker Table (UC-PAT-06)](#2326-view-medical-document-ai-summary--biomarker-table-uc-pat-06)
      - [2.3.2.7 Book In-Clinic Appointment & Slot Reservation (UC-PAT-07)](#2327-book-in-clinic-appointment--slot-reservation-uc-pat-07)
      - [2.3.2.8 Process Appointment Payment (Stripe / Mock Sandbox) (UC-PAT-08)](#2328-process-appointment-payment-stripe--mock-sandbox-uc-pat-08)
      - [2.3.2.9 View Electronic Patient Encounter Slip & Admission STT (UC-PAT-09)](#2329-view-electronic-patient-encounter-slip--admission-stt-uc-pat-09)
      - [2.3.2.10 Export Appointment to Google Calendar / .ics File (UC-PAT-10)](#23210-export-appointment-to-google-calendar--ics-file-uc-pat-10)
      - [2.3.2.11 View Patient Upcoming & Historical Appointments (UC-PAT-11)](#23211-view-patient-upcoming--historical-appointments-uc-pat-11)
      - [2.3.2.12 Reschedule Active Appointment (UC-PAT-12)](#23212-reschedule-active-appointment-uc-pat-12)
      - [2.3.2.13 Cancel Appointment with Automated Policy Refund (UC-PAT-13)](#23213-cancel-appointment-with-automated-policy-refund-uc-pat-13)
      - [2.3.2.14 View Personal Medical Passport / Longitudinal EMR (UC-PAT-14)](#23214-view-personal-medical-passport--longitudinal-emr-uc-pat-14)
      - [2.3.2.15 Download Medical Document Source File via Signed URL (UC-PAT-15)](#23215-download-medical-document-source-file-via-signed-url-uc-pat-15)
      - [2.3.2.16 Submit Doctor Review and Rating (UC-PAT-16)](#23216-submit-doctor-review-and-rating-uc-pat-16)
      - [2.3.2.17 View System Notifications & Email Dispatch Alerts (UC-PAT-17)](#23217-view-system-notifications--email-dispatch-alerts-uc-pat-17)
      - [2.3.2.18 De-identify PII in Clinical Text (UC-PAT-18)](#23218-de-identify-pii-in-clinical-text-uc-pat-18)
    - [2.3.3 Doctor (Clinical Workstation)](#233-doctor-clinical-workstation)
      - [2.3.3.1 Configure Working Schedule & Slot Availability (UC-DOC-01)](#2331-configure-working-schedule--slot-availability-uc-doc-01)
      - [2.3.3.2 View Doctor Daily Patient Queue (UC-DOC-02)](#2332-view-doctor-daily-patient-queue-uc-doc-02)
      - [2.3.3.3 Pre-Encounter Clinical Inspection (Split-Screen) (UC-DOC-03)](#2333-pre-encounter-clinical-inspection-split-screen-uc-doc-03)
      - [2.3.3.4 Access Patient Historical Medical Records via Guard (UC-DOC-04)](#2334-access-patient-historical-medical-records-via-guard-uc-doc-04)
      - [2.3.3.5 Conduct Clinical Consultation & Record Physical Examination (UC-DOC-05)](#2335-conduct-clinical-consultation--record-physical-examination-uc-doc-05)
      - [2.3.3.6 Autocomplete Medical Diagnosis with WHO ICD-10 (UC-DOC-06)](#2336-autocomplete-medical-diagnosis-with-who-icd-10-uc-doc-06)
      - [2.3.3.7 Autocomplete Laboratory & Diagnostic Tests with LOINC (UC-DOC-07)](#2337-autocomplete-laboratory--diagnostic-tests-with-loinc-uc-doc-07)
      - [2.3.3.8 Prescribe Outpatient Medication (UC-DOC-08)](#2338-prescribe-outpatient-medication-uc-doc-08)
      - [2.3.3.9 Schedule In-Clinic Follow-up Appointment (UC-DOC-09)](#2339-schedule-in-clinic-follow-up-appointment-uc-doc-09)
      - [2.3.3.10 Finalize Clinical Encounter & Complete Appointment (UC-DOC-10)](#23310-finalize-clinical-encounter--complete-appointment-uc-doc-10)
      - [2.3.3.11 Doctor Cancel / Reschedule Appointment with Refund (UC-DOC-11)](#23311-doctor-cancel--reschedule-appointment-with-refund-uc-doc-11)
      - [2.3.3.12 Export Patient Encounter Summary / Prescription PDF (UC-DOC-12)](#23312-export-patient-encounter-summary--prescription-pdf-uc-doc-12)
      - [2.3.3.13 View Doctor Revenue & Performance Analytics (UC-DOC-13)](#23313-view-doctor-revenue--performance-analytics-uc-doc-13)
      - [2.3.3.14 Manage Doctor Professional Profile & Credentials (UC-DOC-14)](#23314-manage-doctor-professional-profile--credentials-uc-doc-14)
    - [2.3.4 Admin (Governance & AI FinOps)](#234-admin-governance--ai-finops)
      - [2.3.4.1 View System Governance Dashboard & Executive Telemetry (UC-ADM-01)](#2341-view-system-governance-dashboard--executive-telemetry-uc-adm-01)
      - [2.3.4.2 Manage User Accounts & Access Control (UC-ADM-02)](#2342-manage-user-accounts--access-control-uc-adm-02)
      - [2.3.4.3 Vet and Approve Doctor Professional Credentials (UC-ADM-03)](#2343-vet-and-approve-doctor-professional-credentials-uc-adm-03)
      - [2.3.4.4 Manage Clinical Specialties & Hospital Departments (UC-ADM-04)](#2344-manage-clinical-specialties--hospital-departments-uc-adm-04)
      - [2.3.4.5 Supervise System-Wide Appointments & Intervene (UC-ADM-05)](#2345-supervise-system-wide-appointments--intervene-uc-adm-05)
      - [2.3.4.6 Monitor AI Token Usage & FinOps Telemetry (UC-ADM-06)](#2346-monitor-ai-token-usage--finops-telemetry-uc-adm-06)
      - [2.3.4.7 Toggle System-wide AI Provider & Fallback Mode (UC-ADM-07)](#2347-toggle-system-wide-ai-provider--fallback-mode-uc-adm-07)
      - [2.3.4.8 View System Audit Logs & IDOR Access Logs (UC-ADM-08)](#2348-view-system-audit-logs--idor-access-logs-uc-adm-08)
      - [2.3.4.9 Manage Database Migrations & Vector Index Status (UC-ADM-09)](#2349-manage-database-migrations--vector-index-status-uc-adm-09)
      - [2.3.4.10 Send System-Wide Broadcast Announcements (UC-ADM-10)](#23410-send-system-wide-broadcast-announcements-uc-adm-10)
- [3. Functional Requirements](#3-functional-requirements)
  - [3.1 System Functional Overview](#31-system-functional-overview)
    - [3.1.1 Screens Flow](#311-screens-flow)
    - [3.1.2 Screen Descriptions](#312-screen-descriptions)
    - [3.1.3 Screen Authorization Matrix](#313-screen-authorization-matrix)
    - [3.1.4 Non-Screen Functions](#314-non-screen-functions)
    - [3.1.5 Entity Relationship Diagram](#315-entity-relationship-diagram)
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
| **2.2.0** | 2026-10-18 | SE-AI Capstone Team | Final Capstone Defense Baseline: 1-to-1 IEEE 830 alignment with 108-page FPT Capstone structure. 48 full Use Cases, 18 Screen specs, WHO ICD-10 & LOINC MOH ontologies, Flyway V1–V22, and 306/306 test baseline. | Approved (Final Capstone) |

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
    subgraph "Client Layer (Presentation)"
        PatientApp[Patient Portal: Web SPA / Mobile Responsive]
        DoctorApp[Doctor Workstation: Split-Screen EMR]
        AdminApp[Admin Governance Console: FinOps & Supervision]
    end

    subgraph "API Gateway & Security Layer (Spring Boot 3.4 / Java 21)"
        Gateway[REST Controllers & Spring Security 6]
        AuthGuard[Stateless Dual-Transport JWT Filter]
        IDORGuard[PatientAccessGuard BOLA Enforcer]
        RateLimiter[Bucket4j Distributed Rate Limiter]
    end

    subgraph "Core Business Logic Services"
        TriageEngine[ClinicalQueryDefenseEngine: 5-Stage Defense]
        VectorSearch[DoctorSemanticSearchService: pgvector HNSW]
        DocInterpreter[DocumentAnalysisService: Vision OCR & LOINC]
        BookingMgr[AppointmentService: Slot & STT Allocator]
        RefundService[AppointmentRefundService: Automated Refund]
        OntologyService[ClinicalOntologyService: WHO ICD-10 & LOINC]
        MailAsync[Async MailExecutor: Verification & Password Reset]
    end

    subgraph "Data & Storage Layer"
        Postgres[(PostgreSQL 16 LTS + pgvector HNSW)]
        RedisCache[(Redis Cache L2 & Distributed Sessions)]
        SupabaseS3[(Supabase S3 Private Storage: 15-min Signed URLs)]
    end

    subgraph "External AI & Cloud Integrations"
        Gemini[Google Gemini 1.5 Flash Vision API]
        OpenAI[OpenAI text-embedding-3-small API]
        StripeGateway[Stripe Payment Sandbox Gateway]
        SMTPGateway[Mailpit / Production SMTP Server]
    end

    PatientApp & DoctorApp & AdminApp --> Gateway
    Gateway --> AuthGuard --> IDORGuard --> RateLimiter
    RateLimiter --> TriageEngine & VectorSearch & DocInterpreter & BookingMgr & RefundService & OntologyService
    BookingMgr & RefundService --> MailAsync
    VectorSearch & BookingMgr & OntologyService --> Postgres
    TriageEngine & VectorSearch --> RedisCache
    DocInterpreter --> SupabaseS3
    DocInterpreter --> Gemini
    VectorSearch --> OpenAI
    BookingMgr --> StripeGateway
    MailAsync --> SMTPGateway
```

---

## 2. USER REQUIREMENTS

### 2.1 Actors & System Classes

| Actor Name | Type | Description & System Responsibilities |
| :--- | :--- | :--- |
| **Patient (`PATIENT`)** | Human (Primary) | Registered individual or authenticated guest. Seeks clinical guidance, chats with AI triage, uploads medical documents, searches doctors via semantic vector matching, books in-clinic appointments, processes payments, views electronic admission slips, and tracks personal health records. |
| **Doctor (`DOCTOR`)** | Human (Primary) | Licensed medical practitioner verified by administrators. Manages consultation schedules, views patient appointment queues, reviews pre-encounter AI SBAR summaries and raw lab scans, performs physical consultations, inputs ICD-10 diagnoses, prescribes medication, and sets follow-up visits. |
| **Admin (`ADMIN`)** | Human (Secondary) | System administrator and medical director. Audits and approves doctor medical practice licenses, supervises system-wide appointments, monitors AI token consumption and financial expenditure, manages clinical specialties, inspects security audit logs, and broadcasts system advisories. |
| **AI Inference Gateway** | External System | External Large Language Model and Vision APIs (Google Gemini 1.5 Flash, OpenAI `text-embedding-3-small`, OpenRouter pool). Ingests clinical prompts and document images, returning structured triage classifications, OCR extractions, and dense vector embeddings. |
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

    subgraph "Common Use Cases"
        UC_COMM01(UC-COMM-01: Sign In)
        UC_COMM02(UC-COMM-02: Sign Out)
        UC_COMM03(UC-COMM-03: Change Password)
        UC_COMM04(UC-COMM-04: Edit Profile)
        UC_COMM05(UC-COMM-05: Reset Password)
        UC_COMM06(UC-COMM-06: Verify Email)
    end

    subgraph "Patient Domain"
        UC_PAT01(UC-PAT-01: AI Symptom Triage)
        UC_PAT02(UC-PAT-02: 5-Stage Query Defense)
        UC_PAT03(UC-PAT-03: Semantic Doctor Search)
        UC_PAT05(UC-PAT-05: Upload Lab Document)
        UC_PAT07(UC-PAT-07: Book In-Clinic Slot)
        UC_PAT08(UC-PAT-08: Process Payment)
        UC_PAT09(UC-PAT-09: View Admission Slip)
        UC_PAT12(UC-PAT-12: Reschedule Appointment)
        UC_PAT13(UC-PAT-13: Cancel & Refund)
        UC_PAT14(UC-PAT-14: Medical Passport)
    end

    subgraph "Doctor Domain"
        UC_DOC01(UC-DOC-01: Configure Schedule)
        UC_DOC02(UC-DOC-02: View Daily Queue)
        UC_DOC03(UC-DOC-03: Split-Screen Pre-check)
        UC_DOC04(UC-DOC-04: Guarded Record Access)
        UC_DOC06(UC-DOC-06: ICD-10 Autocomplete)
        UC_DOC07(UC-DOC-07: LOINC Autocomplete)
        UC_DOC08(UC-DOC-08: Prescribe Medication)
        UC_DOC10(UC-DOC-10: Finalize Encounter)
    end

    subgraph "Admin Domain"
        UC_ADM01(UC-ADM-01: Executive Dashboard)
        UC_ADM02(UC-ADM-02: User Access Control)
        UC_ADM03(UC-ADM-03: Vet Doctor License)
        UC_ADM05(UC-ADM-05: Supervise Appointments)
        UC_ADM06(UC-ADM-06: AI FinOps Monitor)
        UC_ADM08(UC-ADM-08: Inspect Audit Logs)
    end

    P --> UC_COMM01 & UC_COMM02 & UC_COMM03 & UC_COMM04 & UC_COMM05 & UC_COMM06
    P --> UC_PAT01 & UC_PAT02 & UC_PAT03 & UC_PAT05 & UC_PAT07 & UC_PAT08 & UC_PAT09 & UC_PAT12 & UC_PAT13 & UC_PAT14

    D --> UC_COMM01 & UC_COMM02 & UC_COMM03 & UC_COMM04
    D --> UC_DOC01 & UC_DOC02 & UC_DOC03 & UC_DOC04 & UC_DOC06 & UC_DOC07 & UC_DOC08 & UC_DOC10

    A --> UC_COMM01 & UC_COMM02 & UC_COMM03 & UC_COMM04
    A --> UC_ADM01 & UC_ADM02 & UC_ADM03 & UC_ADM05 & UC_ADM06 & UC_ADM08
```

#### 2.2.2 Descriptions

| Use Case ID | Use Case Name | Primary Actor | Brief Purpose & Functional Description |
| :--- | :--- | :--- | :--- |
| **UC-COMM-01** | Sign In | All Roles | Authenticate user via Email/Password or Google OAuth2; issue dual-transport JWT tokens. |
| **UC-COMM-02** | Sign Out | All Roles | Terminate session, invalidate client tokens, and clear HttpOnly authentication cookies. |
| **UC-COMM-03** | Change Password | All Roles | Validate current credentials and update password with Bcrypt hash (cost factor 12). |
| **UC-COMM-04** | Edit Profile & Avatar | All Roles | Update personal details and upload profile photos to Supabase S3 storage. |
| **UC-COMM-05** | Reset Password | All Roles | Request password reset email and redeem single-use SHA-256 hashed reset token. |
| **UC-COMM-06** | Email Verification Gate | All Roles | Enforce account activation by validating email verification token link. |
| **UC-PAT-01** | Conversational AI Triage | Patient | Interactive chat evaluating symptoms, prompting clarifying questions, and generating SBAR reports. |
| **UC-PAT-02** | Clinical Query Defense | Patient | 5-stage screening: Red-Flag 115, Teen-code normalization, NegEx clause splitting, OOD, and multi-symptom decomposition. |
| **UC-PAT-03** | Semantic Doctor Search | Patient | Match clinical descriptions against 1536-d doctor embeddings via HNSW index and WHRF re-ranking. |
| **UC-PAT-04** | View Doctor Profile | Patient | Review doctor specialty, academic title, hospital affiliations, consultation fee, and patient ratings. |
| **UC-PAT-05** | Upload Medical Document | Patient | Securely upload PDF/Image lab reports with client-side SHA-256 deduplication and private S3 storage. |
| **UC-PAT-06** | View AI Document Summary | Patient | Review extracted lab biomarkers, abnormal flags, LOINC codes, and plain-language medical interpretations. |
| **UC-PAT-07** | Book In-Clinic Appointment | Patient | Reserve in-clinic time slot (08:00–17:00), assign sequential STT queue number, and lock schedule. |
| **UC-PAT-08** | Process Payment | Patient | Complete consultation fee payment via Stripe or Mock Sandbox with ledger recording. |
| **UC-PAT-09** | View Admission Slip | Patient | Access digital encounter ticket containing clinic room, hospital map, STT, and preparation instructions. |
| **UC-PAT-10** | Export to Calendar | Patient | Export appointment schedule as Google Calendar web link or standard `.ics` file. |
| **UC-PAT-11** | View Appointment History | Patient | Review all upcoming, completed, and canceled clinical appointments with live status badges. |
| **UC-PAT-12** | Reschedule Appointment | Patient | Move active appointment to a new available slot without financial penalty if >2 hours in advance. |
| **UC-PAT-13** | Cancel & Auto-Refund | Patient | Cancel appointment and receive automated refund according to hospital cancellation timeline policies. |
| **UC-PAT-14** | View Medical Passport | Patient | Access unified longitudinal health record consolidating past diagnoses, prescriptions, and lab trends. |
| **UC-PAT-15** | Download Document Source | Patient | Retrieve original medical PDF or image via temporary 15-minute HMAC signed Supabase S3 URLs. |
| **UC-PAT-16** | Submit Doctor Review | Patient | Rate consultation (1–5 stars) and submit qualitative feedback following a completed visit. |
| **UC-PAT-17** | View Notifications | Patient | Receive in-app toasts and transactional email alerts regarding appointment status changes. |
| **UC-PAT-18** | De-identify PII Text | Patient | Redact Vietnamese names, phone numbers, and citizen IDs before clinical AI prompt dispatch. |
| **UC-DOC-01** | Configure Work Schedule | Doctor | Set weekly recurring in-clinic consultation hours, slot durations (30 min), and absence blocks. |
| **UC-DOC-02** | View Daily Patient Queue | Doctor | Inspect sequential queue of booked patients for the current date sorted by admission STT numbers. |
| **UC-DOC-03** | Split-Screen Pre-check | Doctor | Review patient case before consultation with split-screen view: raw lab scan vs. AI SBAR summary. |
| **UC-DOC-04** | Guarded Record Access | Doctor | Access patient historical files strictly protected by care-relationship `PatientAccessGuard`. |
| **UC-DOC-05** | Conduct Consultation | Doctor | Record objective clinical findings, physical examination notes, and vital signs. |
| **UC-DOC-06** | ICD-10 Autocomplete | Doctor | Search and select standardized diagnoses from WHO ICD-10 and MOH Decision 7603/QĐ-BYT. |
| **UC-DOC-07** | LOINC Autocomplete | Doctor | Order diagnostic tests using standardized LOINC codes and MOH Decision 3280/QĐ-BYT. |
| **UC-DOC-08** | Prescribe Medication | Doctor | Generate outpatient digital prescriptions with dosage, frequency, route, and contraindication checks. |
| **UC-DOC-09** | Schedule Follow-up Visit | Doctor | Book subsequent in-clinic checkup slot for patient directly from the clinical workstation. |
| **UC-DOC-10** | Finalize Encounter | Doctor | Lock medical encounter record as immutable, finalize EMR, and trigger completion notifications. |
| **UC-DOC-11** | Doctor Cancel / Reschedule | Doctor | Cancel or move clinic schedule due to medical emergencies with automated 100% patient refunds. |
| **UC-DOC-12** | Export Encounter PDF | Doctor | Generate print-ready official medical consultation summary and prescription document. |
| **UC-DOC-13** | View Practice Analytics | Doctor | Track consultation volume, patient satisfaction rating averages, and earned revenue. |
| **UC-DOC-14** | Manage Doctor Profile | Doctor | Update bio, academic credentials, medical license number, and clinical focus areas. |
| **UC-ADM-01** | Executive Dashboard | Admin | Monitor real-time platform metrics: active users, total consultations, system health, and error rates. |
| **UC-ADM-02** | User Access Control | Admin | Search user directory, view role assignments, lock fraudulent accounts, and reset credentials. |
| **UC-ADM-03** | Vet Doctor License | Admin | Inspect doctor medical practice certificate (CCHN), verify authenticity, and activate listing. |
| **UC-ADM-04** | Manage Specialties | Admin | Create, edit, and organize medical specialties, clinical descriptions, and hospital departments. |
| **UC-ADM-05** | Supervise Appointments | Admin | Audit system-wide appointments, monitor SLA compliance, and intervene in disputed bookings. |
| **UC-ADM-06** | AI FinOps Telemetry | Admin | Monitor token consumption across Gemini and OpenAI, track costs in USD and VNĐ, and detect anomalies. |
| **UC-ADM-07** | Toggle AI Provider | Admin | Switch between primary Gemini gateway, OpenRouter fallback, or emergency local hashing engine. |
| **UC-ADM-08** | Inspect Audit Logs | Admin | Search security and compliance audit trails, including `VIEW_PATIENT_RECORD` IDOR monitoring. |
| **UC-ADM-09** | Manage Database Migrations | Admin | Review Flyway migration execution status (V1–V22) and pgvector HNSW index integrity. |
| **UC-ADM-10** | Broadcast Announcements | Admin | Dispatch system-wide maintenance banners, clinical health warnings, or operational alerts. |

---

### 2.3 Use Case Specification(s)

#### 2.3.1 Common Use Case Specifications

```
================================================================================
USE CASE SPECIFICATION: 2.3.1.1 SIGN IN (UC-COMM-01)
================================================================================
1.  Use Case ID:         UC-COMM-01
2.  Use Case Name:       Sign In
3.  Target System:       MediAssist-AI Identity & Access Management (IAM)
4.  Primary Actor:       Patient, Doctor, Admin, Guest
5.  Stakeholders:        All users, Security Compliance Officer, Hospital IT
6.  Trigger:             User clicks "Sign In" or submits authentication form.
7.  Pre-conditions:      
    - User has an active network connection to MediAssist-AI.
    - If signing in with email/password, account must be registered in the `users` table.
8.  Post-conditions:     
    - User session is established.
    - Server issues dual-transport JWT: HttpOnly Secure Cookie + Response JSON Body.
    - Client application state updates with user profile and assigned Role (`PATIENT`, `DOCTOR`, `ADMIN`).
    - User is redirected to their designated role-based dashboard.
9.  Priority:            High (P0 - Architectural Blocker)
10. Normal Flow (Main Scenario):
    Step 1: User navigates to `/login` and selects authentication mode (Password or Google OAuth2).
    Step 2: User provides email and password or clicks "Sign in with Google".
    Step 3: Frontend validates non-empty inputs and valid email format regex.
    Step 4: Frontend sends HTTP POST request to `/api/v1/auth/login` with credentials.
    Step 5: Backend `AuthenticationManager` verifies credentials against Bcrypt hash (cost 12) in `users`.
    Step 6: Backend checks account status (`is_active == true` and `email_verified == true`).
    Step 7: Backend generates signed JWT access token (24-hour expiration) and refresh token.
    Step 8: Backend attaches `Set-Cookie: jwt_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api`.
    Step 9: Backend returns HTTP 200 OK with `AuthResponse` DTO containing token and user profile metadata.
    Step 10: Client stores token in memory/Zustand store and redirects user to target dashboard:
             - `PATIENT` -> `/patient/dashboard`
             - `DOCTOR`  -> `/doctor/dashboard`
             - `ADMIN`   -> `/admin/supervision`
11. Alternative Flows:
    - Alt Flow 11a: Google OAuth2 Sign-In:
      1. User clicks "Sign in with Google".
      2. Browser navigates to `/login/oauth2/code/google` authorization endpoint.
      3. Google returns authorization code; backend exchanges for Google ID and user email.
      4. If user does not exist, backend auto-provisions account with role `PATIENT` (Flyway V8 `google_id`).
      5. Backend redirects to frontend `/oauth2/callback` with JWT token.
    - Alt Flow 11b: Unverified Email Login:
      1. Backend detects `email_verified == false` (Flyway V22 gate).
      2. Backend returns HTTP 403 Forbidden with code `EMAIL_NOT_VERIFIED`.
      3. Frontend displays verification notification with "Resend Verification Link" button.
12. Exception Flows:
    - Exc Flow 12a: Invalid Credentials (Wrong email or password):
      1. Backend throws `BadCredentialsException`.
      2. Backend returns HTTP 401 Unauthorized with message "Invalid email or password".
      3. Frontend displays inline alert: "Email hoặc mật khẩu không chính xác."
    - Exc Flow 12b: Account Locked:
      1. Backend detects `is_active == false`.
      2. Backend returns HTTP 403 Forbidden with message "Account has been suspended".
      3. Frontend displays modal directing user to contact administrative support.
13. Business Rules:
    - BR-01: Password complexity must be enforced (Min 8 chars, 1 uppercase, 1 digit, 1 special char).
    - BR-02: Maximum 5 consecutive failed login attempts before 15-minute IP/account rate lock.
    - BR-03: JWT secret key must have at least 256 bits entropy (`APP_JWT_SECRET`).
14. Non-Functional Requirements:
    - NFR-PERF: Authentication response latency < 350ms (including Bcrypt evaluation).
    - NFR-SEC: Stateless tokens with dual-transport mechanism preventing XSS token harvesting.
15. Data Entities Involved:
    - `users` (id, email, password_hash, role, is_active, email_verified, google_id).
    - `audit_logs` (id, user_id, action, ip_address, timestamp).
16. User Interface Controls:
    - Text inputs: `Email`, `Password`.
    - Checkbox: `Remember Me`.
    - Action buttons: `Đăng Nhập`, `Đăng Nhập Với Google`, `Quên Mật Khẩu`.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.1.2 SIGN OUT (UC-COMM-02)
================================================================================
1.  Use Case ID:         UC-COMM-02
2.  Use Case Name:       Sign Out
3.  Target System:       MediAssist-AI Identity & Access Management (IAM)
4.  Primary Actor:       All authenticated users (Patient, Doctor, Admin)
5.  Stakeholders:        All users, Security Compliance Officer
6.  Trigger:             User clicks "Sign Out" / "Đăng Xuất" in top navbar or mobile drawer.
7.  Pre-conditions:      User is actively authenticated with a valid JWT token.
8.  Post-conditions:     
    - Client in-memory auth state, user profile, and cached tokens are wiped.
    - Server clears the HttpOnly `jwt_token` cookie via zero-max-age expiration header.
    - User is redirected to `/login` with an informational sign-out toast.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: User clicks "Đăng Xuất" from the user menu avatar dropdown.
    Step 2: Frontend dispatches HTTP POST to `/api/v1/auth/logout`.
    Step 3: Backend invalidates session cookies: `Set-Cookie: jwt_token=; Max-Age=0; Path=/; HttpOnly`.
    Step 4: Backend logs audit entry: `USER_LOGOUT` for telemetry compliance.
    Step 5: Backend returns HTTP 200 OK with `{"message": "Logged out successfully"}`.
    Step 6: Frontend clears Zustand stores (`useAuthStore.getState().logout()`).
    Step 7: Frontend purges all cached sensitive clinical records from browser memory.
    Step 8: Frontend redirects browser to `/login`.
11. Alternative Flows:
    - Alt Flow 11a: Offline Sign Out:
      1. If backend is unreachable, frontend executes client-side cache flush and cookie expiry purge.
      2. User is returned to login screen immediately without blocking on network timeout.
12. Exception Flows: None.
13. Business Rules:
    - BR-04: Terminating the session must invalidate client access immediately.
14. Non-Functional Requirements:
    - NFR-SEC: Zero leftover credentials in `localStorage` or `sessionStorage`.
15. Data Entities Involved:
    - `audit_logs` (action = 'LOGOUT').
16. User Interface Controls:
    - Menu Item: `Đăng Xuất` with icon `LogOut`.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.1.3 CHANGE PASSWORD (UC-COMM-03)
================================================================================
1.  Use Case ID:         UC-COMM-03
2.  Use Case Name:       Change Password
3.  Target System:       MediAssist-AI Identity & Access Management (IAM)
4.  Primary Actor:       Patient, Doctor, Admin
5.  Stakeholders:        Account Owners, Security Auditor
6.  Trigger:             User accesses security settings and submits password change form.
7.  Pre-conditions:      User is authenticated and knows their current password.
8.  Post-conditions:     
    - Old password hash in database is replaced with new Bcrypt hash.
    - All other active sessions for this user are invalidated.
    - Confirmation notification is dispatched to user's registered email.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: User navigates to Settings -> Security tab (`/settings/security`).
    Step 2: User inputs Current Password, New Password, and Confirm New Password.
    Step 3: Client validates matching passwords and complexity regex in real time.
    Step 4: User clicks "Cập Nhật Mật Khẩu".
    Step 5: Frontend sends HTTP POST to `/api/v1/users/change-password` with JSON payload.
    Step 6: Backend fetches user record and calls `passwordEncoder.matches(currentPassword, hash)`.
    Step 7: Backend ensures new password does not match current password.
    Step 8: Backend encodes new password with `BCryptPasswordEncoder(12)`.
    Step 9: Backend commits update to `users.password_hash` within `@Transactional`.
    Step 10: Backend publishes `PasswordChangedEvent` -> triggers async security notice email.
    Step 11: Backend returns HTTP 200 OK.
    Step 12: Frontend displays success toast: "Mật khẩu đã được cập nhật thành công."
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Incorrect Current Password:
      1. Backend throws `AppException(ErrorCode.INVALID_CURRENT_PASSWORD)`.
      2. Backend returns HTTP 400 Bad Request.
      3. Frontend displays inline error: "Mật khẩu hiện tại không chính xác."
    - Exc Flow 12b: Weak New Password:
      1. Password fails server-side validation annotations `@Pattern`.
      2. Backend returns HTTP 422 Unprocessable Entity.
13. Business Rules:
    - BR-01: Minimum 8 characters, at least 1 uppercase letter, 1 number, and 1 special symbol.
    - BR-05: New password cannot be identical to the previous password.
14. Non-Functional Requirements:
    - NFR-SEC: Bcrypt cost factor 12 (approx. 250ms hashing calculation).
15. Data Entities Involved:
    - `users` (password_hash, updated_at).
16. User Interface Controls:
    - Password inputs: `Mật khẩu hiện tại`, `Mật khẩu mới`, `Xác nhận mật khẩu mới`.
    - Strength meter: Interactive visual password strength progress bar (Weak/Medium/Strong).
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.1.4 EDIT PROFILE & AVATAR (UC-COMM-04)
================================================================================
1.  Use Case ID:         UC-COMM-04
2.  Use Case Name:       Edit Profile & Avatar
3.  Target System:       MediAssist-AI User Profile Subsystem
4.  Primary Actor:       Patient, Doctor, Admin
5.  Stakeholders:        All Users
6.  Trigger:             User edits personal fields and clicks "Save Profile".
7.  Pre-conditions:      User is authenticated.
8.  Post-conditions:     
    - User entity in `users` (and `doctor_profiles` if Doctor) is updated.
    - If avatar image is uploaded, file is stored in Supabase S3 bucket and URL persisted.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: User navigates to My Profile (`/profile`).
    Step 2: User updates Full Name, Phone Number, Date of Birth, Gender, or Address.
    Step 3: (Optional) User clicks on avatar image to select a local JPEG/PNG photo (< 5MB).
    Step 4: Frontend previews selected image and validates MIME type and file size.
    Step 5: User clicks "Lưu Thay Đổi".
    Step 6: If avatar changed, frontend uploads multipart image to `/api/v1/storage/upload-avatar`.
            Backend generates unique UUID filename and uploads to Supabase S3 `avatars/` path.
    Step 7: Frontend sends HTTP PUT to `/api/v1/users/profile` with updated profile DTO.
    Step 8: Backend updates `users.full_name`, `phone_number`, `avatar_url`, and commits transaction.
    Step 9: Backend returns HTTP 200 OK with refreshed `UserProfileDTO`.
    Step 10: Frontend updates global state and displays toast: "Thông tin đã được cập nhật thành công."
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: File size exceeds 5MB or invalid format:
      1. Client validation blocks submission and displays: "Vui lòng chọn ảnh định dạng JPG/PNG dưới 5MB."
    - Exc Flow 12b: Duplicate phone number:
      1. Backend returns HTTP 409 Conflict if phone number is already registered to another account.
13. Business Rules:
    - BR-06: Vietnamese phone numbers must match regex `^(0|\+84)(3|5|7|8|9)[0-9]{8}$`.
14. Non-Functional Requirements:
    - NFR-PERF: Profile update round-trip latency < 500ms.
15. Data Entities Involved:
    - `users`, `doctor_profiles`.
16. User Interface Controls:
    - Avatar picker, text inputs (`Họ và tên`, `Số điện thoại`, `Địa chỉ`), date picker (`Ngày sinh`), select (`Giới tính`).
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.1.5 FORGOT PASSWORD & TOKEN HASH RESET (UC-COMM-05)
================================================================================
1.  Use Case ID:         UC-COMM-05
2.  Use Case Name:       Forgot Password & Token Hash Reset
3.  Target System:       MediAssist-AI Identity & Access Management (IAM)
4.  Primary Actor:       Unauthenticated User (Patient, Doctor, Admin)
5.  Stakeholders:        Registered Users, Security Architect
6.  Trigger:             User clicks "Quên mật khẩu?" on login page.
7.  Pre-conditions:      User account exists with a verified email address.
8.  Post-conditions:     
    - Single-use SHA-256 hashed password reset token is generated with 15-minute TTL.
    - Password reset email containing secure redemption link is dispatched asynchronously.
    - Upon token redemption, user's password is reset and token marked as consumed.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: User navigates to `/forgot-password`, inputs registered email, and clicks "Gửi Yêu Cầu".
    Step 2: Frontend sends HTTP POST to `/api/v1/auth/forgot-password` with email string.
    Step 3: Backend searches `userRepository.findByEmail(email)`.
            (Security note: If email not found, backend still returns 200 OK to prevent account enumeration).
    Step 4: Backend generates 32-byte cryptographically secure random token (`SecureRandom`).
    Step 5: Backend computes SHA-256 hash of raw token (`DigestUtils.sha256Hex(rawToken)`).
    Step 6: Backend stores hash, user ID, expiration timestamp (`now() + 15 minutes`), and `consumed = false`
            in `password_reset_tokens` table (Flyway V21 migration).
    Step 7: Backend asynchronously invokes `MailService.sendPasswordResetMail(email, rawToken)`.
    Step 8: User opens email, clicks reset link: `https://mediassist.local/reset-password?token={rawToken}`.
    Step 9: User enters new password and confirms password on the reset page.
    Step 10: Frontend sends HTTP POST to `/api/v1/auth/reset-password` with `rawToken` and `newPassword`.
    Step 11: Backend hashes `rawToken` with SHA-256 and searches `password_reset_tokens.token_hash`.
    Step 12: Backend verifies token is not expired (`expires_at > now()`) and not consumed (`consumed == false`).
    Step 13: Backend updates user's `password_hash` with Bcrypt(cost 12) and marks `consumed = true`.
    Step 14: Backend returns HTTP 200 OK. Frontend redirects to `/login` with success banner.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Expired or Already Consumed Token:
      1. Backend throws `AppException(ErrorCode.RESET_TOKEN_EXPIRED)`.
      2. Backend returns HTTP 400 Bad Request.
      3. Frontend displays: "Đường dẫn đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Vui lòng thử lại."
13. Business Rules:
    - BR-07: Plaintext reset tokens must NEVER be stored in the database. Only SHA-256 hashes are persisted (Flyway V21).
    - BR-08: Token lifespan is strictly limited to 15 minutes.
14. Non-Functional Requirements:
    - NFR-SEC: Zero account enumeration via constant-time responses.
15. Data Entities Involved:
    - `users`, `password_reset_tokens` (id, user_id, token_hash, expires_at, consumed_at).
16. User Interface Controls:
    - Input: `Email`, `Mật khẩu mới`, `Nhập lại mật khẩu`.
    - Button: `Gửi Link Đặt Lại`, `Xác Nhận Mật Khẩu Mới`.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.1.6 EMAIL VERIFICATION GATE (UC-COMM-06)
================================================================================
1.  Use Case ID:         UC-COMM-06
2.  Use Case Name:       Email Verification Gate
3.  Target System:       MediAssist-AI Identity & Access Management (IAM)
4.  Primary Actor:       Newly registered user
5.  Stakeholders:        All Users, System Compliance Officer
6.  Trigger:             User clicks the activation link received upon account registration.
7.  Pre-conditions:      Account created with `email_verified = false` (Flyway V22).
8.  Post-conditions:     
    - User account marked `email_verified = true`.
    - User is permitted to access full clinical features (booking, triage, consultation).
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Upon registration, backend generates verification token stored in `email_verification_tokens`.
    Step 2: Backend dispatches HTML email containing activation link: `/verify-email?token={token}`.
    Step 3: User clicks activation link in email client.
    Step 4: Frontend calls HTTP GET `/api/v1/auth/verify-email?token={token}`.
    Step 5: Backend verifies token validity, matches user, updates `users.email_verified = true`.
    Step 6: Backend returns HTTP 200 OK.
    Step 7: Frontend renders success celebration screen with button to proceed to login.
11. Alternative Flows:
    - Alt Flow 11a: Resend Verification Email:
      1. User clicks "Gửi lại email kích hoạt" from the warning banner.
      2. Backend invalidates previous token, generates fresh token, and sends new email.
12. Exception Flows:
    - Exc Flow 12a: Invalid or Expired Token:
      1. Backend returns HTTP 400 Bad Request.
      2. Frontend displays error message with option to request a fresh verification link.
13. Business Rules:
    - BR-09: Unverified accounts cannot book clinical appointments or access medical records.
14. Non-Functional Requirements:
    - NFR-SEC: Verification token must be cryptographically unpredictable.
15. Data Entities Involved:
    - `users` (email_verified), `email_verification_tokens`.
16. User Interface Controls:
    - Activation banner, button `Kích Hoạt Tài Khoản`, `Gửi Lại Email`.
17. Open Issues: None.
================================================================================
"""

if __name__ == "__main__":
    print("Part 1 module loaded successfully. Character count:", len(get_content()))
