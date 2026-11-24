# BẢN ĐẶC TẢ CHI TIẾT 4 TRANG ĐẦU REPORT 7 (CHUẨN 100% BENCHMARK DOC 2)
> **Mục tiêu:** Sao chép nguyên văn ("từng chữ"), hình ảnh Logo FPT và định dạng của 4 trang đầu từ [Doc 2: Report 7 Benchmark](https://docs.google.com/document/d/1adairvvajjyoyG7dzOewFjdKvs7D2WwR9J8BfD3fQvg/edit?usp=drivesdk) áp dụng chính xác cho dự án MediAssist-AI trên [Doc 1: Report 7 MediAssist-AI](https://docs.google.com/document/d/1sZxs1r7XFnhywWyzqbxglDNRL6ir-MVx4Ic3n225qRI/edit?usp=drivesdk).  
> **Tệp ảnh Logo FPT trích xuất:** `docs/images/fpt_university_logo.png`

---

## TRANG 1: TRANG BÌA CHUẨN ĐỒ ÁN TỐT NGHIỆP FPT UNIVERSITY (COVER PAGE)

*(Định dạng: Toàn trang căn giữa, phông chữ Times New Roman)*

```text
MINISTRY OF EDUCATION AND TRAINING
```

*(Chèn hình ảnh Logo FPT University: `docs/images/fpt_university_logo.png` — Căn giữa, kích thước chiều rộng khoảng 5.5 cm)*

```text
FPT UNIVERSITY



Capstone Project Document

[MediAssist-AI] - Intelligent Clinical Triage, Multimodal Lab Explanation &
Semantic Doctor Matching Telehealth Platform
```

*(Bảng thông tin 2 cột căn giữa trang, viền ẩn 0pt)*

| Cột 1 (Trái) | Cột 2 (Phải) |
| :--- | :--- |
| **SEP490.11** | **Group Members**<br>Nguyễn Thành Vinh - QE180174 (Leader & Solution Architect)<br>Phan Cao Hoàng Khương (Core Backend & Cloud Developer)<br>Phan Nhật Bảo (Frontend & Quality Assurance Specialist)<br><br>**Supervisor**<br>[Họ và tên Giảng viên Hướng dẫn 1]<br>[Họ và tên Giảng viên Hướng dẫn 2]<br><br>**Ext Supervisor**<br>Hội đồng Cố vấn Y khoa & Lâm sàng Telehealth<br><br>**Capstone Project code**<br>FPTU-KLTN-2026-MEDIASSIST |

```text
- Quy Nhon, November 2026 -
```

*(Ngắt trang: Cmd + Enter / Ctrl + Enter sang Trang 2)*

---

## TRANG 2: MỤC LỤC TOÀN DIỆN (TABLE OF CONTENTS)

```text
Table of Contents
Acknowledgement ................................................................................................................................ 3
Definition and Acronyms ..................................................................................................................... 4
Document Record of Changes ............................................................................................................. 6

I. Project Introduction ........................................................................................................................ 7
1. Overview ........................................................................................................................................ 7
   1.1 Project Information .................................................................................................................... 7
   1.2 Project Team .............................................................................................................................. 8
2. Product Background ....................................................................................................................... 9
3. Existing Systems ............................................................................................................................ 11
   3.1 Existing Vietnamese Telehealth & Booking Platforms (BookingCare, Medpro, eDoctor) ......... 11
       3.1.1 Main System Actors (Patient, Doctor, Admin) ................................................................. 11
       3.1.2 Existing Systems' Key Features ........................................................................................ 12
       3.1.3 Specific Benefits for Each User Group ............................................................................. 13
       3.1.4 Disadvantages & Gaps of Existing Systems ...................................................................... 14
4. Business Opportunity .................................................................................................................... 15
   4.1 Business Opportunity in Vietnamese Outpatient Landscape ................................................... 15
   4.2 Integrated Intelligent Healthcare System ................................................................................ 16
5. Software Product Vision ................................................................................................................. 17
6. Project Scope & Limitations ........................................................................................................... 18
   6.1 Major Features ......................................................................................................................... 18
       6.1.1 For Patient Role (18 Domain Features + Common Auth) ................................................. 18
       6.1.2 For Doctor Role (14 Clinical Workstation Features) ......................................................... 19
       6.1.3 For Admin Role (11 Governance & FinOps Features) ........................................................ 20
   6.2 Limitations & Exclusions ......................................................................................................... 21

II. Project Management Plan ............................................................................................................. 22
1. Overview ....................................................................................................................................... 22
   1.1 Scope & Estimation ................................................................................................................. 22
   1.2 Project Objectives ................................................................................................................... 24
   1.3 Project Risks & Mitigation Strategies ...................................................................................... 25
2. Management Approach ................................................................................................................. 28
   2.1 Project Process (Agile/Scrum with Two-Week Sprints) .......................................................... 28
   2.2 Quality Management & Clinical Safety Standards ................................................................. 29
   2.3 Training & Clinical Knowledge Transfer Plan ......................................................................... 30
3. Project Deliverables ....................................................................................................................... 31
4. Responsibility Assignments (RACI Matrix) ................................................................................... 32
5. Project Communications ................................................................................................................ 33
6. Configuration Management .......................................................................................................... 35
   6.1 Document Management .......................................................................................................... 35
   6.2 Source Code Management (Strict GitFlow Baseline) ............................................................... 35
   6.3 Tools & Infrastructures ............................................................................................................ 36

III. Software Requirement Specification .......................................................................................... 37
1. Product Overview .......................................................................................................................... 37
2. User Requirements ........................................................................................................................ 38
   2.1 Actors ...................................................................................................................................... 38
   2.2 Use Cases ................................................................................................................................ 39
       2.2.1 Diagram(s) ........................................................................................................................ 39
             A. Package Diagram & Common Authentication Subsystem ............................................... 39
             B. Patient Use Case Diagram (Triage, Lab OCR, Discovery, Appointments) ...................... 40
             C. Doctor Clinical Workstation Use Case Diagram ............................................................. 41
             D. Admin Enterprise Governance & FinOps Use Case Diagram ......................................... 42
       2.2.2 Descriptions (Summary of 49 Use Cases) ......................................................................... 43
   2.3 Use Case Specification(s) ........................................................................................................ 47
       2.3.1 Common Use Case Specifications (UC-COMM-01 to UC-COMM-06) ............................. 47
       2.3.2 Patient Use Case Specifications (UC-PAT-01 to UC-PAT-18) ........................................... 53
       2.3.3 Doctor Use Case Specifications (UC-DOC-01 to UC-DOC-14) .......................................... 72
       2.3.4 Admin Use Case Specifications (UC-ADM-01 to UC-ADM-11) ......................................... 86
3. Functional Requirements .............................................................................................................. 97
   3.1 System Functional Overview ................................................................................................... 97
       3.1.1 Screens Flow .................................................................................................................... 97
       3.1.2 Screen Descriptions (22 Screens: SCR-01 to SCR-22) ...................................................... 99
       3.1.3 Screen Authorization Matrix (RBAC & Guard Enforcement) ........................................... 108
       3.1.4 Non-Screen Functions (Batch & Background Tasks) ........................................................ 113
       3.1.5 Entity Relationship Diagram (ERD - 17 Tables 3NF & pgvector) ................................... 115
   3.2 Applications for Patients, Doctors, and Admins ...................................................................... 120
       3.2.1 Public & Authentication Flow (SCR-01 to SCR-06) ......................................................... 120
       3.2.2 Patient Portal Screens (SCR-07 to SCR-11) ...................................................................... 122
       3.2.3 Doctor Clinical Workstation Screens (SCR-12 to SCR-14) .............................................. 125
       3.2.4 Admin Enterprise Console Screens (SCR-15 to SCR-22) ................................................. 128
4. Non-Functional Requirements ..................................................................................................... 132
   4.1 External Interfaces (UI, Hardware, Software) ........................................................................ 132
   4.2 Quality Attributes (Usability, Reliability, Performance, Security BOLA/IDOR, Maintainability) 133
5. Requirement Appendix ................................................................................................................. 137
   5.1 Business Rules (BR-01 to BR-20) ............................................................................................ 137
   5.2 Acronyms and Abbreviations ................................................................................................. 142
   5.3 Common Requirements .......................................................................................................... 143
   5.4 Application Messages List (80+ Standardized Error & Success Codes) .................................. 144

IV. Software Design Description ..................................................................................................... 158
1. System Design ............................................................................................................................. 158
   1.1 System Architecture (Modular Monolith, PostgreSQL 16 pgvector, Two-Layer Cache) .......... 158
   1.2 Package Diagram (Front-end & Back-end 15 Controllers, 31 Services, 16 Repositories) ........ 160
2. Database Design (17 Tables Normalized 3NF & pgvector HNSW Index) ..................................... 167
   2.1 Users Table to 2.17 Notifications Table ......................................................................... 170 - 186
3. Detailed Design (Class & Sequence Diagrams for 28 Clinical Workflows) ................................. 187
   3.1 Dual-Transport JWT Authentication to 3.28 HIPAA & Decree 13 Audit Logging ........... 187 - 242

V. Software Testing Documentation ............................................................................................... 243
1. Scope of Testing ........................................................................................................................... 243
2. Test Strategy (Testing Types, Levels, Supporting Tools) ............................................................. 245
3. Test Plan (Human Resources, Environment, Milestones) ............................................................ 248
4. Test Cases & Verification Results ................................................................................................ 251
   4.1 Complete Backend Unit & Integration Execution Results (38 Test Classes / 338 Tests PASS) 251
   4.2 Frontend Strict TypeScript Build, Playwright E2E & k6 Performance Benchmarks .............. 258
   4.3 Complete 49-Use-Case Requirements Traceability Matrix (RTM 1-to-1) ................................ 262
   4.4 Empirical Test Execution Playbook & Captured Evidence (EV-01 to EV-12b) ........................ 275
   4.5 Live Testing & Tracking Repository (Google Drive Embedded Reference) ............................ 289

VI. Release Package & User Guides ............................................................................................... 291
1. Deliverable Package Structure .................................................................................................... 291
2. Installation Guides (Hardware/Software Requirements, Docker Compose, Deployment) ........ 292
3. User Manual (Workflows 1 to 4: Patient Triage, Lab OCR, Doctor Workstation, Admin FinOps) 298
```

*(Ngắt trang sang Trang 3)*

---

## TRANG 3: ACKNOWLEDGEMENT & DEFINITION AND ACRONYMS

### Acknowledgement
We would like to express our deepest gratitude to our faculty supervisors and clinical advisors at FPT University for their insightful advice, architectural rigor, and steadfast guidance throughout the engineering and verification of our capstone project, **MediAssist-AI (Intelligent Clinical Triage, Multimodal Lab Explanation & Semantic Doctor Matching Telehealth Platform)**. Their clear explanations, practical clinical feedback, and patient mentoring helped us navigate the immense complexities of building an enterprise medical assistant system with defensive Red-Flag triage, dense pgvector cosine matching, and isolated Supabase S3 clinical document vaults. Their continuous support encouraged us to think critically and optimize our application to meet real-world Vietnamese healthcare standards, Ministry of Health regulations, and empirical production requirements.

Finally, we extend our heartfelt appreciation to our core team members—**Nguyễn Thành Vinh, Phan Cao Hoàng Khương, and Phan Nhật Bảo**—for their collaborative spirit, engineering discipline, and countless late-night coding sessions across 113 documented development iterations. The successful completion of this project stands as a testament to the team's unwavering commitment to creating an innovative, patient-centered, and clinically resilient telehealth solution.

### Definition and Acronyms

| Acronym | Definition |
| :--- | :--- |
| **AI** | Artificial Intelligence — Large Language Models (Gemini, OpenRouter) and Dense Vector Embeddings (`text-embedding-3-small`). |
| **AST** | Abstract Syntax Tree — Syntax analysis tree used for automated static code and document verification. |
| **BHYT** | Bảo Hiểm Y Tế — Vietnamese National Health Insurance identifier stored in Patient EMR Passports. |
| **BOLA / IDOR** | Broken Object Level Authorization / Insecure Direct Object Reference (defended by `PatientAccessGuard`). |
| **CCCD** | Căn Cước Công Dân — 12-digit Vietnamese Citizen National Identification masked by `MedicalPiiService`. |
| **CCHN** | Chứng Chỉ Hành Nghề — Official Ministry of Health Medical Practice License verified by Admins. |
| **CI/CD** | Continuous Integration and Continuous Deployment (GitHub Actions pipeline running tests and builds). |
| **DTO** | Data Transfer Object — Strongly typed API payload contract between Spring Boot backend and React frontend. |
| **EMR** | Electronic Medical Record — Outpatient encounter record containing vital signs, ICD-10 diagnosis, and prescriptions. |
| **FINOPS** | Financial Operations for Cloud AI — Real-time tracking of token usage and inference costs (`ai_token_usage`). |
| **HNSW** | Hierarchical Navigable Small World — Sub-linear vector index ($m=24, ef=128$) powering semantic doctor search. |
| **ICD-10** | International Classification of Diseases, 10th Revision (WHO standard for clinical diagnosis). |
| **JWT** | JSON Web Token — Stateless cryptographic token delivered via Dual-Transport (Bearer Header + HttpOnly Cookie). |
| **LLM** | Large Language Model (Google Gemini 1.5/2.0 Flash, DeepSeek-V3 via OpenRouter). |
| **LOINC** | Logical Observation Identifiers Names and Codes — Global laboratory test and observation terminology. |
| **NEWS-2** | National Early Warning Score 2 — Standardized clinical physiological scoring system for acute illness severity. |
| **OCR** | Optical Character Recognition — Vision-based extraction of text and laboratory metrics from scanned medical reports. |
| **PII** | Personally Identifiable Information — Sensitive patient data automatically masked under Decree 13/2023/NĐ-CP. |
| **RBAC** | Role-Based Access Control — Multi-role authorization gate (`PATIENT`, `DOCTOR`, `ADMIN`). |
| **RTM** | Requirements Traceability Matrix — 1-to-1 mapping verifying 49 Use Cases across code, tests, and database. |
| **SSO** | Single Sign-On — Google OAuth2 / OIDC authentication flow. |

*(Ngắt trang sang Trang 4)*

---

## TRANG 4: DOCUMENT RECORD OF CHANGES

| Version | Date | Author | Description of Baseline Synchronization |
| :---: | :---: | :---: | :--- |
| **v1.0** | 2026-06-15 | Capstone Team | Initial Charter, Problem Statement, and Domain Modeling baseline (Reports 1 & 2). |
| **v2.0** | 2026-09-20 | Tech Lead (VinhHT) | Full SRS (49 Use Cases) and SDD (17 Tables 3NF, 28 Detailed Design Sequences) synchronization. |
| **v3.0** | 2026-10-24 | QA & Dev Team | Verified M1–M7 completion: 308/308 Unit Tests PASS, Playwright E2E, k6 500-VU stress test, Flyway V23 (ICD-10). |
| **v3.1** | 2026-11-19 | Coordinator & Tech Lead | Exhaustive 1-to-1 Final Project Report (Report 7) mirror mapped directly to verified source code (15 Controllers / 87 Endpoints, 31 Services, V1-V23). |
| **v3.2** | 2026-11-24 | Solution Architect | Standardize FPT Cover Page with University Logo, Full 1-to-1 Hierarchical Table of Contents, List of Figures/Tables, and 338 Unit Tests baseline. |
