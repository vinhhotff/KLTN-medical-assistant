# CẨM NANG THIẾT KẾ TRANG BÌA CHUẨN FPT & MỤC LỤC CHI TIẾT (REPORT 7 - MEDIASSIST-AI)
> **Tài liệu tham chiếu chuẩn:** [Doc 2: Report 7 AITA Benchmark](https://docs.google.com/document/d/1adairvvajjyoyG7dzOewFjdKvs7D2WwR9J8BfD3fQvg/edit?usp=drivesdk)  
> **Tài liệu mục tiêu cập nhật:** [Doc 1: Report 7 MediAssist-AI](https://docs.google.com/document/d/1sZxs1r7XFnhywWyzqbxglDNRL6ir-MVx4Ic3n225qRI/edit?usp=drivesdk)  
> **Dự án:** `MediAssist-AI: Intelligent Clinical Triage, Multimodal Lab Explanation & Semantic Doctor Matching Telehealth Platform`

---

## PHẦN 1: MẪU TRANG BÌA CHUẨN ĐỒ ÁN TỐT NGHIỆP FPT UNIVERSITY (COVER PAGE - PAGE 1)

> [!TIP]
> **Hướng dẫn thao tác trên Google Docs (Doc 1):**
> 1. Xóa bỏ bảng Metadata 2 cột ("Field / Details") hiện tại ở đầu trang 1.
> 2. Sao chép nội dung văn bản bên dưới và dán vào đầu trang 1.
> 3. Căn giữa toàn bộ trang bìa (`Ctrl + Shift + E` hoặc `Cmd + Shift + E`).
> 4. Bảng thông tin thành viên (Members & Supervisors) định dạng bảng 2 cột không viền (Border width = 0 pt), căn giữa trang.
> 5. Chèn ngắt trang (`Insert` -> `Break` -> `Page break` hoặc phím tắt `Ctrl + Enter` / `Cmd + Enter`) sau dòng ngày tháng để chuyển sang Trang 2.

```text
MINISTRY OF EDUCATION AND TRAINING

FPT UNIVERSITY



Capstone Project Document

[MediAssist-AI]
Intelligent Clinical Triage, Multimodal Lab Explanation &
Semantic Doctor Matching Telehealth Platform



Course Code: SEP490.11

Group Members:
Nguyễn Thành Vinh - QE180174 (Leader & Solution Architect)
Phan Cao Hoàng Khương (Core Backend & Cloud Developer)
Phan Nhật Bảo (Frontend & Quality Assurance Specialist)

Supervisors:
[Họ và tên Giảng viên Hướng dẫn 1]
[Họ và tên Giảng viên Hướng dẫn 2]
(Hội đồng Cố vấn Lâm sàng & Giảng viên Bộ môn Kỹ thuật Phần mềm — FPT University)

Ext Supervisor:
Hội đồng Chuyên gia Cố vấn Y khoa & Lâm sàng Telehealth

Capstone Project Code:
FPTU-KLTN-2026-MEDIASSIST


- Quy Nhon, November 2026 -
```

---

## PHẦN 2: MỤC LỤC TOÀN DIỆN & PHÂN CẤP 1-TO-1 (TABLE OF CONTENTS)

> [!NOTE]
> Khi sử dụng tính năng **Insert -> Table of Contents** trên Google Docs, toàn bộ các đề mục dưới đây sẽ tự động hiển thị số trang và tạo link liên kết có thể nhấp trực tiếp đến từng phần của tài liệu.

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
       3.1.1 Main System Actors ......................................................................................................... 11
             A. Patient (Care Seeker) ...................................................................................................... 11
             B. Doctor (Healthcare Provider) .......................................................................................... 12
             C. Admin (Hospital System Administrator) ......................................................................... 12
       3.1.2 Existing Systems' Key Features ........................................................................................ 12
             A. Basic Specialty-Based Booking ...................................................................................... 12
             B. Manual Medical Records Archival .................................................................................. 13
             C. Synchronous Video Call Consultations .......................................................................... 13
       3.1.3 Specific Benefits for Each User Group ............................................................................. 13
             A. For Patient ...................................................................................................................... 13
             B. For Doctor ....................................................................................................................... 13
             C. For Admin ....................................................................................................................... 14
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
       2.2.2 Descriptions ..................................................................................................................... 43
   2.3 Use Case Specification(s) ........................................................................................................ 47
       2.3.1 Common Use Case Specifications (UC-COMM-01 to UC-COMM-06) ............................. 47
             2.3.1.1 Sign In (UC-COMM-01) ........................................................................................... 47
             2.3.1.2 Sign Out (UC-COMM-02) ......................................................................................... 48
             2.3.1.3 Change Password (UC-COMM-03) ........................................................................... 49
             2.3.1.4 View & Update Patient Profile (UC-COMM-04) ....................................................... 50
             2.3.1.5 Forgot Password & Token Hash Reset (UC-COMM-05) ........................................... 51
             2.3.1.6 Email Verification Gate (UC-COMM-06) ................................................................. 52
       2.3.2 Patient (UC-PAT-01 to UC-PAT-18) ................................................................................. 53
             2.3.2.1 Conversational AI Symptom Triage (UC-PAT-01) .................................................... 53
             2.3.2.2 Red-Flag Emergency Interception & Immediate Hotline Prompt (UC-PAT-02) ....... 55
             2.3.2.3 Semantic Doctor Search via pgvector HNSW (UC-PAT-03) ..................................... 56
             2.3.2.4 View Doctor Details & Available Slots (UC-PAT-04) ................................................ 57
             2.3.2.5 Upload Medical Document & Vision OCR (UC-PAT-05) .......................................... 58
             2.3.2.6 Inspect Extracted Biomarkers & LOINC Codes (UC-PAT-06) ................................... 59
             2.3.2.7 Download Document File via 15-Minute Signed URL (UC-PAT-07) ........................ 60
             2.3.2.8 Purchase AI Analysis Quota (UC-PAT-08) ............................................................... 61
             2.3.2.9 Book In-Clinic Appointment & Slot Reservation (UC-PAT-09) ................................ 62
             2.3.2.10 Process Payment via Stripe Sandbox / Mock VietQR (UC-PAT-10) ....................... 63
             2.3.2.11 View Electronic Encounter Slip & Admission STT (UC-PAT-11) ........................... 64
             2.3.2.12 View Patient Appointment History (UC-PAT-12) .................................................... 65
             2.3.2.13 Patient Check-In for In-Clinic Appointment (UC-PAT-13) ..................................... 66
             2.3.2.14 Reschedule Active Appointment (UC-PAT-14) ....................................................... 67
             2.3.2.15 Cancel Appointment with Automated Policy Refund (UC-PAT-15) ....................... 68
             2.3.2.16 Submit Doctor Review and Rating (UC-PAT-16) ................................................... 69
             2.3.2.17 View Patient Triage History (UC-PAT-17) .............................................................. 70
             2.3.2.18 De-identify Medical PII in Text (UC-PAT-18) ........................................................ 71
       2.3.3 Doctor (UC-DOC-01 to UC-DOC-14) ................................................................................ 72
             2.3.3.1 View Doctor Workstation Dashboard & Stats (UC-DOC-01) .................................... 72
             2.3.3.2 Configure Doctor Schedule Slots (UC-DOC-02) ....................................................... 73
             2.3.3.3 View Daily Patient Queue & Call Next Patient (UC-DOC-03) .................................. 74
             2.3.3.4 Pre-Encounter Split-Screen Clinical Inspection (UC-DOC-04) ................................. 75
             2.3.3.5 Access Patient Records via PatientAccessGuard (UC-DOC-05) ................................. 76
             2.3.3.6 Autocomplete Diagnosis with WHO ICD-10 (UC-DOC-06) ...................................... 77
             2.3.3.7 Autocomplete Lab Indicators with LOINC (UC-DOC-07) .......................................... 78
             2.3.3.8 Complete Clinical Encounter & Record EMR (UC-DOC-08) ..................................... 79
             2.3.3.9 Schedule In-Clinic Follow-up Visit (UC-DOC-09) .................................................... 80
             2.3.3.10 Doctor Cancel Appointment with 100% Refund (UC-DOC-10) ............................... 81
             2.3.3.11 View Patient Reviews & Ratings (UC-DOC-11) ...................................................... 82
             2.3.3.12 Update Doctor Profile & Biography (UC-DOC-12) ................................................. 83
             2.3.3.13 Export Medical Record & Prescription PDF (UC-DOC-13) .................................... 84
             2.3.3.14 Manage Assigned Clinical Specialties (UC-DOC-14) .............................................. 85
       2.3.4 Admin (UC-ADM-01 to UC-ADM-11) ............................................................................... 86
             2.3.4.1 View Executive Statistics & Overview (UC-ADM-01) ............................................... 86
             2.3.4.2 Monitor AI Token Usage & FinOps (UC-ADM-02) .................................................... 87
             2.3.4.3 Toggle System-wide AI Provider & Fallback Mode (UC-ADM-03) ............................ 88
             2.3.4.4 Sync Doctor Vector Embeddings (UC-ADM-04) ....................................................... 89
             2.3.4.5 Vet & Approve Doctor CCHN License (UC-ADM-05) ............................................... 90
             2.3.4.6 Manage Doctor Directory (UC-ADM-06) ................................................................. 91
             2.3.4.7 User Access Control & Account Locking (UC-ADM-07) ........................................... 92
             2.3.4.8 Manage Clinical Specialties & Taxonomy (UC-ADM-08) .......................................... 93
             2.3.4.9 Supervise Appointments & Force Cancel (UC-ADM-09) .......................................... 94
             2.3.4.10 Supervise AI Triage Sessions (UC-ADM-10) .......................................................... 95
             2.3.4.11 View Security Audit Logs & IDOR Records (UC-ADM-11) .................................... 96
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
   4.1 External Interfaces ................................................................................................................. 132
       4.1.1 User Interfaces ................................................................................................................ 132
       4.1.2 Hardware Interfaces ........................................................................................................ 132
       4.1.3 Software Interfaces .......................................................................................................... 133
   4.2 Quality Attributes ................................................................................................................... 133
       4.2.1 Usability .......................................................................................................................... 133
       4.2.2 Reliability ........................................................................................................................ 134
       4.2.3 Performance .................................................................................................................... 134
       4.2.4 Security (BOLA/IDOR Defense, HIPAA, Decree 13/2023/ND-CP) .................................... 135
       4.2.5 Maintainability ................................................................................................................ 136
5. Requirement Appendix ................................................................................................................. 137
   5.1 Business Rules (BR-01 to BR-20) ............................................................................................ 137
   5.2 Acronyms and Abbreviations ................................................................................................. 142
   5.3 Common Requirements .......................................................................................................... 143
   5.4 Application Messages List (80+ Standardized Error & Success Codes) .................................. 144

IV. Software Design Description ..................................................................................................... 158
1. System Design ............................................................................................................................. 158
   1.1 System Architecture (Spring Boot Modular Monolith, PostgreSQL 16, Two-Layer Cache) ..... 158
   1.2 Package Diagram .................................................................................................................... 160
       1.2.1 Front-end (React 19, Vite, Tailwind CSS, Zustand, Lucide) ........................................... 160
       1.2.2 Back-end (15 Controllers, 31 Services, 16 Repositories, 17 Tables) ................................. 162
2. Database Design (17 Tables Normalized 3NF & pgvector HNSW Index) ..................................... 167
   2.1 Users Table (users) ................................................................................................................. 170
   2.2 Roles Table (roles & user_roles) ............................................................................................. 171
   2.3 Patient Profiles Table (patient_profiles) ................................................................................. 172
   2.4 Doctor Profiles Table (doctor_profiles) ................................................................................... 173
   2.5 Specialties Table (specialties) ................................................................................................. 174
   2.6 Doctor Specialties Table (doctor_specialties) ......................................................................... 175
   2.7 Doctor Schedule Slots Table (doctor_schedule_slots) ............................................................ 176
   2.8 Appointments Table (appointments) ....................................................................................... 177
   2.9 Triage Sessions Table (triage_sessions) ................................................................................. 178
   2.10 Triage Messages Table (triage_messages) ............................................................................ 179
   2.11 Medical Documents Table (medical_documents) ................................................................. 180
   2.12 Document Analyses Table (document_analyses) ................................................................. 181
   2.13 Payment Transactions Table (payment_transactions) ........................................................... 182
   2.14 Doctor Reviews Table (doctor_reviews) ................................................................................ 183
   2.15 AI Token Usage Table (ai_token_usage) ............................................................................... 184
   2.16 Audit Logs Table (audit_logs) ................................................................................................ 185
   2.17 Notifications Table (notifications) ......................................................................................... 186
3. Detailed Design (Class & Sequence Diagrams for 28 Clinical Workflows) ................................. 187
   3.1 Dual-Transport JWT Authentication & Login (Sign In) .......................................................... 187
   3.2 Patient Registration & Identity Validation ............................................................................. 189
   3.3 Google OAuth2 / OIDC Social Sign-In .................................................................................... 191
   3.4 Password Reset via SHA-256 Token Hash .............................................................................. 193
   3.5 Change Password & Session Invalidation .............................................................................. 195
   3.6 Refresh Token Rotation & Session Revocation ....................................................................... 197
   3.7 Safe Logout & Cookie Purge .................................................................................................. 199
   3.8 Update Patient Medical Passport ............................................................................................ 201
   3.9 Conversational AI Symptom Triage Flow ............................................................................... 203
   3.10 Red-Flag Emergency Keyword Interception ......................................................................... 205
   3.11 Semantic Doctor Matching via pgvector Cosine Similarity ................................................... 207
   3.12 Doctor Schedule Slot Reservation & Redis Lock ................................................................. 209
   3.13 Medical Document Upload & Supabase S3 Storage ............................................................. 211
   3.14 Vision OCR & Biomarker Parsing Pipeline ........................................................................... 213
   3.15 15-Minute Signed URL Secure Document Access ................................................................ 215
   3.16 AI Analysis Quota Top-Up & Payment ................................................................................. 217
   3.17 In-Clinic Appointment Booking & Confirmation ................................................................. 219
   3.18 Stripe Sandbox & Mock VietQR Payment Processing .......................................................... 221
   3.19 Appointment Check-In & Queue STT Allocation .................................................................. 223
   3.20 Appointment Reschedule with Slot Re-allocation ................................................................ 225
   3.21 Automated Refund on Patient Cancellation .......................................................................... 227
   3.22 Doctor Daily Queue & Next-Patient Call ............................................................................. 229
   3.23 Pre-Encounter Clinical Split-Screen Inspection .................................................................... 231
   3.24 WHO ICD-10 & LOINC Autocomplete Engine ..................................................................... 233
   3.25 EMR Finalization & Electronic Prescription Signing ........................................................... 235
   3.26 Doctor CCHN License Vetting by Admin ............................................................................. 237
   3.27 System-Wide AI Model Switch & Circuit Breaker ................................................................ 239
   3.28 HIPAA & Decree 13 Immutable Audit Logging .................................................................... 241

V. Software Testing Documentation ............................................................................................... 243
1. Scope of Testing ........................................................................................................................... 243
2. Test Strategy ................................................................................................................................ 245
   2.1 Testing Types ......................................................................................................................... 245
   2.2 Test Levels ............................................................................................................................. 246
   2.3 Supporting Tools .................................................................................................................... 247
3. Test Plan ...................................................................................................................................... 248
   3.1 Human Resources .................................................................................................................. 248
   3.2 Test Environment .................................................................................................................. 249
   3.3 Test Milestones ...................................................................................................................... 250
4. Test Cases & Verification Results ................................................................................................ 251
   4.1 Complete Backend Unit & Slice Integration Execution Results (38 Test Classes / 338 Tests) . 251
   4.2 Frontend Strict TypeScript Build, Playwright E2E & k6 Performance Benchmarks .............. 258
   4.3 Complete 49-Use-Case Requirements Traceability Matrix (RTM 1-to-1) ................................ 262
   4.4 Empirical Test Execution Playbook & Captured Evidence Mapped to Test Case IDs ............. 275
   4.5 Live Testing & Tracking Repository (Google Drive Embedded Reference) ............................ 289

VI. Release Package & User Guides ............................................................................................... 291
1. Deliverable Package Structure .................................................................................................... 291
2. Installation Guides ....................................................................................................................... 292
   2.1 System Requirements ............................................................................................................. 292
       2.1.1 Hardware Requirements .................................................................................................. 292
       2.1.2 Software Requirements ................................................................................................... 293
   2.2 Installation Instructions ......................................................................................................... 294
       2.2.1 Infrastructure & Database (Docker Compose) ................................................................. 294
       2.2.2 Backend Application Deployment ................................................................................... 296
       2.2.3 Frontend Application Deployment ................................................................................. 297
3. User Manual ................................................................................................................................. 298
   3.1 Overview ................................................................................................................................ 298
   3.2 Workflow 1: Patient AI Symptom Triage, Red-Flag Defense & Semantic Doctor Discovery ... 299
   3.3 Workflow 2: Multimodal Medical Document OCR, LOINC Interpretation & Quota Top-Up ..... 305
   3.4 Workflow 3: Doctor Clinical Workstation, Split-Screen Inspection & EMR ICD-10 Prescription 311
   3.5 Workflow 4: Admin Enterprise Governance, CCHN Vetting, AI FinOps & Security Audit ........ 318
```

---

## PHẦN 3: DANH MỤC HÌNH VẼ & BẢNG BIỂU (LIST OF FIGURES & TABLES)

```text
List of Figures
Figure 1.1: High-Level Clinical Telehealth Workflow of MediAssist-AI ............................................ 10
Figure 2.1: Scrum Sprint Cadence & Two-Week Milestone Release Cycle .......................................... 28
Figure 3.1: Package Architecture of MediAssist-AI Subsystems ........................................................ 39
Figure 3.2: Common Authentication & Identity Security Use Case Diagram .................................... 40
Figure 3.3: Patient Telehealth & AI Clinical Services Use Case Diagram .......................................... 41
Figure 3.4: Doctor Clinical Workstation & EMR Encounter Use Case Diagram ................................. 42
Figure 3.5: Admin Enterprise Governance & FinOps Use Case Diagram ............................................ 43
Figure 3.6: End-to-End User Screens Flow Diagram (SCR-01 to SCR-22) .......................................... 98
Figure 3.7: Relational Database Schema ERD (17 Tables Normalized 3NF & pgvector) ................... 116
Figure 4.1: Spring Boot Modular Monolith & Client Architecture Diagram ..................................... 159
Figure 4.2: Frontend Package Architecture (React, Vite, Zustand) ................................................... 161
Figure 4.3: Backend Modular Package Architecture (Domain, Service, Repository, Web) ............... 163
Figure 4.4 to 4.31: Detailed Design Sequence Diagrams for 28 Core Workflows ..................... 188 - 242

List of Tables
Table 1.1: Project Identity & Engineering Team Matrix ..................................................................... 8
Table 1.2: Comparative Analysis: Existing Vietnamese Systems vs. MediAssist-AI ........................... 14
Table 2.1: Work Breakdown Structure (WBS) & Engineering Effort Estimation ................................ 23
Table 2.2: Risk Analysis, Clinical Impact & Mitigation Matrix ......................................................... 26
Table 2.3: RACI Responsibility Assignment Matrix ........................................................................... 32
Table 3.1: Actor Specification & Authorization Privileges ................................................................ 38
Table 3.2: High-Level Summary of 49 Functional Use Cases ............................................................. 44
Table 3.3: Complete Screen Authorization Matrix (RBAC & Guard Rules) ...................................... 109
Table 3.4: System Business Rules Catalog (BR-01 to BR-20) ............................................................ 138
Table 3.5: Standardized Application Messages & Error Code Catalog (80+ Messages) .................... 145
Table 4.1: Detailed Database Tables Schema & Constraints (17 Tables) ................................. 170 - 186
Table 5.1: Automated Backend Test Results Across 38 Test Classes (338 Tests PASS) .................. 252
Table 5.2: Requirements Traceability Matrix (RTM: 49 Use Cases to Code & Tests) ....................... 263
Table 5.3: Empirical Test Execution Playbook & Evidence Artifacts (EV-01 to EV-12b) .................. 276
Table 6.1: Deployment Artifacts & Container Port Allocation ......................................................... 294
```

---

## PHẦN 4: HƯỚNG DẪN 3 BƯỚC ĐỒNG BỘ TRỰC TIẾP LÊN GOOGLE DOC 1 (REPORT 7)

### Bước 1: Chuẩn Hóa Trang Bìa (Page 1)
1. Mở tài liệu [Doc 1: Report 7 MediAssist-AI](https://docs.google.com/document/d/1sZxs1r7XFnhywWyzqbxglDNRL6ir-MVx4Ic3n225qRI/edit?usp=drivesdk).
2. Xóa bảng dữ liệu tóm tắt kỹ thuật ("Field / Details") ở trang đầu tiên.
3. Dán nội dung **PHẦN 1: MẪU TRANG BÌA CHUẨN FPT UNIVERSITY** ở trên.
4. Đặt phông chữ **Times New Roman**:
   - `MINISTRY OF EDUCATION AND TRAINING` & `FPT UNIVERSITY`: Size **14**, **In hoa Đậm (Bold)**, Căn giữa.
   - `Capstone Project Document`: Size **16**, **In hoa Đậm (Bold)**, Căn giữa.
   - `[MediAssist-AI]...`: Size **18**, **In hoa Đậm (Bold)**, Màu xanh đậm y tế `#003366` hoặc `#1A365D`, Căn giữa.
   - Khung thông tin thành viên (Group Members / Supervisors / Capstone Code): Size **12**, Căn lề rõ ràng hoặc dùng bảng 2 cột viền ẩn.
   - Dòng cuối `- Quy Nhon, November 2026 -`: Size **12**, **Nghiêng (Italic)**, Căn giữa.
5. Nhấn tổ hợp phím **Ctrl + Enter** (Windows) hoặc **Cmd + Enter** (macOS) ngay sau dòng địa điểm ngày tháng để tạo trang mới cho Mục lục.

### Bước 2: Chèn Mục Lục Tự Động (Table of Contents) Ở Trang 2
1. Đặt con trỏ soạn thảo tại dòng đầu tiên của Trang 2.
2. Trên thanh menu Google Docs, chọn:
   **Chèn (Insert) $\rightarrow$ Mục lục (Table of Contents) $\rightarrow$ Chọn kiểu có số trang (With page numbers)**.
3. Google Docs sẽ tự động quét tất cả các tiêu đề Heading 1, 2, 3 đã được định dạng chuẩn trong tài liệu và sinh ra mục lục tương tác 100% chuyên nghiệp.
4. *(Tùy chọn)* Nếu muốn hiển thị mục lục tĩnh dạng text có sẵn định dạng chấm nối chuẩn đồ án, Tech Lead có thể copy trực tiếp nội dung **PHẦN 2** ở trên vào trang 2.

### Bước 3: Cập Nhật & Kiểm Tra Phân Cấp Heading
- Mọi tiêu đề Chương (I, II, III, IV, V, VI): Được gắn kiểu **Heading 1**.
- Mọi tiêu đề Mục lớn (1, 2, 3...): Được gắn kiểu **Heading 2**.
- Mọi tiêu đề Tiểu mục (1.1, 2.1, 2.3.1, 3.1.1...): Được gắn kiểu **Heading 3**.
- Khi có bất kỳ thay đổi nào về số trang, Tech Lead chỉ cần rê chuột vào Mục lục và nhấn nút **Cập nhật mục lục (Update table of contents)** hình mũi tên xoay tròn ở góc trái mục lục.
