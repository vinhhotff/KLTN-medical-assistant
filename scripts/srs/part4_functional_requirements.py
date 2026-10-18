# -*- coding: utf-8 -*-
"""
Part 4: 3. Functional Requirements
3.1 System Functional Overview (3.1.1 Screens Flow, 3.1.2 Screen Descriptions for 18 screens,
3.1.3 Screen Authorization Matrix, 3.1.4 Non-Screen Functions, 3.1.5 Physical ERD)
3.2 Applications for Patients, Doctors, and Admins (3.2.1 to 3.2.7 detailed functional requirements).
Derived 100% from actual MediAssist-AI codebase.
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

```
================================================================================
SCREEN SPECIFICATION: SCR-01 LANDING PAGE
================================================================================
1.  Screen ID:           SCR-01
2.  Screen Name:         Modern Telehealth Landing Page & Live Triage Simulator
3.  Route URL:           `/` or `/landing` (Component: `LandingPage.tsx`)
4.  Primary Actors:      Guest, Patient, Doctor, Admin (Unauthenticated)
5.  Visual Layout:
    - Sticky Navigation Header: MediAssist Logo, Navigation Links ("Trang Chủ", "Sàng Lọc AI", "Tìm Bác Sĩ", "Hồ Sơ Xét Nghiệm"), Role quick switch, Login/Register buttons.
    - Hero Section: Headline "Chăm Sóc Sức Khỏe Thông Minh Với AI Lâm Sàng", subheadline, primary CTA "Bắt Đầu Sàng Lọc Ngay", secondary CTA "Tìm Bác Sĩ Chuyên Khoa".
    - Live Clinical Triage Simulator: Interactive mini-chat on landing page demonstrating 5-stage symptom screening and red-flag interception before registration.
    - Core Capabilities Grid: 4 cards (AI Sàng Lọc Triệu Chứng SBAR, Bóc Tách Xét Nghiệm OCR, Khớp Nối Bác Sĩ pgvector HNSW, Đặt Lịch Khám Trực Tiếp O2O).
    - Clinical Quality Badges: WHO ICD-10, LOINC MOH Decision 3280, HIPAA Safe Harbor, Decree 13/2023/NĐ-CP.
    - Footer: Hospital address, 115 emergency hotline warning, legal disclaimers.
6.  UI Controls & Inputs:
    - Search Input: `symptomQuery` (Text).
    - Buttons: `Bắt Đầu Sàng Lọc Ngay`, `Tìm Bác Sĩ Chuyên Khoa`, `Đăng Nhập`, `Đăng Ký`.
7.  Validation Rules:    Non-empty search query string.
8.  Target Transitions:  `/login`, `/patient/triage`, `/patient/doctors`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-02 LOGIN & REGISTRATION PAGE
================================================================================
1.  Screen ID:           SCR-02
2.  Screen Name:         Sign-In & Account Registration Page
3.  Route URL:           `/login` (Component: `LoginPage.tsx`)
4.  Primary Actors:      Unauthenticated Users (Patient, Doctor, Admin)
5.  Visual Layout:
    - Two-Column Layout: Left column renders high-resolution clinical healthcare artwork; right column renders responsive authentication card.
    - Tab Switcher: "Đăng Nhập" vs "Đăng Ký Tài Khoản".
    - Sign-In Form: Email input, Password input with eye toggle visibility icon, Remember Me checkbox, "Quên mật khẩu?" link, "Đăng Nhập" primary button.
    - Social Auth Divider: "Hoặc tiếp tục với" -> "Đăng nhập bằng Google" (Google OAuth2).
    - Demo Quick Login Drawer: Collapsible drawer for rapid evaluation (Demo Bệnh Nhân, Demo Bác Sĩ, Demo Quản Trị Viên).
    - Sign-Up Form (when Register tab active): Full Name, Email, Password, Confirm Password, Phone Number, Role selector (Patient vs Doctor with CCHN input).
6.  UI Controls & Inputs:
    - Text Inputs: `email`, `password`, `fullName`, `phoneNumber`, `licenseNumber` (Doctor).
    - Action Buttons: `Đăng Nhập`, `Đăng Nhập Bằng Google`, `Đăng Ký Tài Khoản`.
7.  Validation Rules:    Valid RFC 5322 email regex, password min 8 characters (BR-01), Vietnamese phone regex (BR-06).
8.  Target Transitions:  `/oauth2/callback`, `/forgot-password`, `/verify-email`, role dashboards (`/patient`, `/doctor`, `/admin`).
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-03 FORGOT PASSWORD PAGE
================================================================================
1.  Screen ID:           SCR-03
2.  Screen Name:         Forgot Password Request Page
3.  Route URL:           `/forgot-password` (Component: `ForgotPasswordPage.tsx`)
4.  Primary Actors:      Unauthenticated Users
5.  Visual Layout:
    - Centered card: Lock illustration, explanation of token reset security, email input field.
    - "Gửi Link Đặt Lại Mật Khẩu" primary action button with loading spinner state.
    - Back to login link: "Quay lại trang Đăng nhập".
6.  UI Controls & Inputs:
    - Text Input: `email` (Type: email, required).
    - Action Button: `Gửi Link Đặt Lại Mật Khẩu`.
7.  Validation Rules:    Valid email format. Backend generates SHA-256 token hash (Flyway V21 - BE-5).
8.  Target Transitions:  `/login`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-04 RESET PASSWORD PAGE
================================================================================
1.  Screen ID:           SCR-04
2.  Screen Name:         Secure Password Reset Page
3.  Route URL:           `/reset-password` (Component: `ResetPasswordPage.tsx`)
4.  Primary Actors:      Unauthenticated Users possessing valid reset token
5.  Visual Layout:
    - Card container: URL token parameter extraction (`?token=...`).
    - Input Fields: New Password and Confirm New Password with real-time strength meter.
    - "Xác Nhận Đổi Mật Khẩu" button.
6.  UI Controls & Inputs:
    - Password Inputs: `newPassword`, `confirmPassword`.
7.  Validation Rules:    Bcrypt password complexity (BR-01), matching confirmation, valid 15-minute token TTL (BR-08).
8.  Target Transitions:  `/login`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-05 EMAIL VERIFICATION GATE PAGE
================================================================================
1.  Screen ID:           SCR-05
2.  Screen Name:         Email Verification Gate Page
3.  Route URL:           `/verify-email` (Component: `VerifyEmailPage.tsx`)
4.  Primary Actors:      Newly registered users
5.  Visual Layout:
    - Centered card: Envelope graphic, notification of verification link dispatched to inbox.
    - "Kích Hoạt Tài Khoản" button validating token URL parameter (`POST /api/v1/auth/verify-email`).
    - "Gửi Lại Email Kích Hoạt" button with 60-second cooldown timer (`POST /api/v1/auth/resend-verification`).
6.  UI Controls & Inputs: Action Buttons `Kích Hoạt Tài Khoản`, `Gửi Lại Email`.
7.  Validation Rules:    Token expiration validation (`email_verification_tokens` Flyway V22).
8.  Target Transitions:  `/login`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-06 OAUTH2 CALLBACK HANDLER PAGE
================================================================================
1.  Screen ID:           SCR-06
2.  Screen Name:         OAuth2 Authorization Callback Page
3.  Route URL:           `/oauth2/callback` (Component: `OAuth2CallbackPage.tsx`)
4.  Primary Actors:      Users authenticating via Google Single Sign-On
5.  Visual Layout:
    - Clean loading state: Animated clinical spinner, "Đang xác thực thông tin đăng nhập từ Google...".
    - Backend extracts Google OAuth2 code, generates dual-transport JWT, and sets cookie.
    - Client ingests token and role, routing immediately to designated role dashboard.
6.  UI Controls:         Loading spinner.
7.  Target Transitions:  `/patient`, `/doctor`, `/admin`, `/login?error=oauth2_failed`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-07 PATIENT DASHBOARD
================================================================================
1.  Screen ID:           SCR-07
2.  Screen Name:         Patient Home Dashboard
3.  Route URL:           `/patient` (Component: `PatientDashboard.tsx`)
4.  Primary Actors:      Patient
5.  Visual Layout:
    - Header Banner: Personalized patient greeting, blood type, remaining AI analysis quota badge.
    - Quick Action Cards:
      1. "Sàng Lọc Triệu Chứng AI" -> Routes to `/patient/triage`.
      2. "Tóm Tắt Hồ Sơ Xét Nghiệm" -> Routes to `/patient/documents`.
      3. "Tìm Kiếm Bác Sĩ Chuyên Khoa" -> Routes to `/patient/doctors`.
    - Upcoming In-Clinic Appointment Widget: Displays next appointment card (Doctor name, scheduled time, clinic room, sequential STT number, "Xem Phiếu Khám" ticket modal).
    - Recent Appointments Table: Status badges (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), "Hủy Lịch", "Dời Lịch", "Check-in" buttons.
6.  UI Controls:         Action cards, appointment list, check-in button, ticket button.
7.  Target Transitions:  `/patient/triage`, `/patient/documents`, `/patient/doctors`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-08 SYMPTOM TRIAGE PAGE
================================================================================
1.  Screen ID:           SCR-08
2.  Screen Name:         Conversational AI Symptom Triage Page
3.  Route URL:           `/patient/triage` (Component: `SymptomTriagePage.tsx`)
4.  Primary Actors:      Patient
5.  Visual Layout:
    - Conversational Chat Stream: Alternating message bubbles (User query vs MediAssist AI Scribe).
    - Floating Emergency 115 Banner: Appears instantly if Red-Flag symptoms detected (FAST stroke, AMI, anaphylaxis).
    - Quick Symptom Chips: Pre-configured clinical pills (Đau đầu, Đau ngực, Sốt cao, Ho có đờm, Khó thở...).
    - Bottom Chat Bar: Text input, Send button, clear history button.
    - Side SBAR Clinical Assessment Card:
      * Situation & Background summary.
      * Urgency Badge: `ROUTINE` (Green), `URGENT` (Amber), `EMERGENCY` (Flashing Red).
      * Recommended Specialty Tag (e.g., "Khoa Tim Mạch").
      * Matched Specialist Doctors: Mini cards linking directly to booking.
6.  UI Controls:         Chat textarea, send button, symptom chips, matched doctor cards.
7.  Target Transitions:  `/patient/doctors`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-09 DOCTOR SEARCH PAGE & BOOKING MODAL
================================================================================
1.  Screen ID:           SCR-09
2.  Screen Name:         Semantic Doctor Search Page & Booking Modal
3.  Route URL:           `/patient/doctors` (Component: `DoctorSearchPage.tsx`, `BookingModal.tsx`)
4.  Primary Actors:      Patient, Guest
5.  Visual Layout:
    - Natural Language Search Bar: Accepts symptom text ("tôi bị đau nửa đầu kèm buồn nôn").
    - Filter Controls: Specialty dropdown, consultation fee slider, star rating filter.
    - AI Mode Status Indicator: Shows active inference provider (Gemini 1.5 Flash vs OpenRouter vs Local Hashing).
    - Doctor Card Grid: Doctor avatar, Full Name, Academic Title (PGS.TS, BS.CKII), Specialty badge, Semantic match compatibility badge (e.g., "96% Phù Hợp"), Rating, Fee (VNĐ), "Đặt Lịch Khám" button.
    - BookingModal (Dialog):
      * Date Picker: Monday through Saturday tabs (Sundays disabled - BR-17).
      * 30-Minute Slot Chips: 08:00–12:00 and 13:30–17:00.
      * Chief complaint input, optional document attachment dropdown.
      * Sequential STT queue preview.
      * "Xác Nhận & Thanh Toán" action button.
6.  UI Controls:         Search bar, filters, slot chips, modal submit button.
7.  Target Transitions:  `/payment/success`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-10 DOCUMENT SUMMARIZER PAGE
================================================================================
1.  Screen ID:           SCR-10
2.  Screen Name:         Multimodal Document Ingestion & Summarizer Page
3.  Route URL:           `/patient/documents` (Component: `DocumentSummarizerPage.tsx`)
4.  Primary Actors:      Patient
5.  Visual Layout:
    - Header: Quota balance counter ("Còn lại: {quota} lượt phân tích"), "Mua Thêm Gói" button.
    - Drag-and-Drop Ingestion Zone: PDF, PNG, JPEG (< 10MB, max 10 pages).
    - Action Buttons: "Phân Tích Bằng AI", "Tạo Tệp PDF Mẫu (Random Sample)".
    - Uploaded Documents Table: File name, upload date, status (`ANALYZED`, `PROCESSING`, `FAILED`), actions: "Xem Phân Tích", "Tải Tệp Gốc" (via 15-min signed URL).
    - Split-View Analysis Modal:
      * Left Pane: Secure document viewer rendering source file.
      * Right Pane: Extracted Biomarker Table (Chỉ số, Giá trị, Đơn vị, Khoảng tham chiếu, Mã LOINC, Cảnh báo: Bình Thường/Tăng/Giảm), Layperson Vietnamese clinical interpretation, Recommended Specialty.
    - Quota Purchase Modal: Selection of 3 quota packages (Gói Tiêu Chuẩn 5 lượt, Gói Nâng Cao 15 lượt, Gói Không Giới Hạn 50 lượt).
6.  UI Controls:         Dropzone, sample PDF generator button, analysis modal, quota modal.
7.  Target Transitions:  `/payment/success`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-11 PAYMENT SUCCESS & RECEIPT PAGE
================================================================================
1.  Screen ID:           SCR-11
2.  Screen Name:         Payment Verification & Receipt Page
3.  Route URL:           `/payment/success` (Component: `PaymentSuccessPage.tsx`)
4.  Primary Actors:      Patient
5.  Visual Layout:
    - Centered Receipt Card: Success checkmark icon, Transaction Code, Order Type (`APPOINTMENT_FEE` or `QUOTA_PURCHASE`), Amount (VNĐ), Payment Method.
    - If Appointment: Shows Admission Ticket Summary with Queue Number (`STT 05`), Clinic Room ("Phòng Khám 204"), Scheduled Time, Doctor Name.
    - Action Buttons: "Xem Phiếu Khám", "Về Bảng Điều Khiển".
6.  UI Controls:         Action buttons, printable receipt frame.
7.  Target Transitions:  `/patient`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-12 DOCTOR WORKSTATION DASHBOARD
================================================================================
1.  Screen ID:           SCR-12
2.  Screen Name:         Doctor Clinical Workstation Dashboard
3.  Route URL:           `/doctor` (Component: `DoctorDashboard.tsx`)
4.  Primary Actors:      Doctor
5.  Visual Layout:
    - Clinic Room Header: Clinic room name ("Phòng Khám 204 - Khu Khám Yêu Cầu"), Doctor greeting, Date.
    - Daily Queue Sidebar (Left): Patients scheduled today sorted by sequential STT numbers:
      * STT badge (`STT 01`, `STT 02`...).
      * Patient Name, Age, Gender, Scheduled Slot.
      * Status Badge (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`).
      * "Gọi Khám Tiếp" primary queue progression button (`POST /api/v1/doctors/me/call-next`).
    - Clinical Encounter Modal (Split-Screen):
      * Left Pane: Pre-Encounter Inspection (Raw lab scan viewer vs AI SBAR summary).
      * Right Pane: EMR Consultation Entry Form:
        - Section 1: Vital Signs (Blood pressure mmHg, Heart rate bpm, Temp °C, SpO2 %, Height, Weight, BMI).
        - Section 2: Clinical Examination Notes & Observations.
        - Section 3: ICD-10 Diagnosis Autocomplete (WHO ICD-10 & MOH Decision 7603/QĐ-BYT).
        - Section 4: LOINC Lab Requisition Autocomplete (MOH Decision 3280/QĐ-BYT).
        - Section 5: Outpatient Prescription JSON (Drug name, quantity, dosage, directions).
        - Section 6: Treatment Plan & Follow-up Date.
      * "Hoàn Thành Ca Khám" primary CTA button (`POST /api/v1/appointments/{id}/complete-clinical`).
6.  UI Controls:         "Gọi Khám Tiếp" button, queue rows, ICD-10 autocomplete, encounter form inputs.
7.  Target Transitions:  `/doctor/patients`, `/doctor/profile`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-13 DOCTOR PATIENT RECORDS PAGE
================================================================================
1.  Screen ID:           SCR-13
2.  Screen Name:         Doctor Patient Medical Records Page
3.  Route URL:           `/doctor/patients` (Component: `DoctorPatientRecordsPage.tsx`)
4.  Primary Actors:      Doctor
5.  Visual Layout:
    - Patient Roster Table: List of patients who have active or past care relationships with this doctor.
    - Guarded Patient Detail Drawer: Enforces `PatientAccessGuard`:
      * Patient demographics, blood type, known allergies.
      * Encounter History: Past diagnoses (ICD-10), vital signs, prescriptions.
      * Attached Medical Documents: Lab scans viewable via 15-min signed URLs.
6.  UI Controls:         Patient search input, patient table rows, encounter detail cards.
7.  Target Transitions:  `/doctor`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-14 DOCTOR PROFILE & SCHEDULE PAGE
================================================================================
1.  Screen ID:           SCR-14
2.  Screen Name:         Doctor Profile & Schedule Management Page
3.  Route URL:           `/doctor/profile` (Component: `DoctorProfilePage.tsx`)
4.  Primary Actors:      Doctor
5.  Visual Layout:
    - Tab 1 (Hồ Sơ Chuyên Môn): Doctor Full Name, Academic Title (PGS.TS, BS.CKII), Practice Certificate (CCHN) number, Biography textarea, Consultation Fee (VNĐ), Clinic Room.
    - Tab 2 (Lịch Khám Tuần): Weekly recurring schedule slot matrix (`doctor_schedule_slots`):
      * Shift toggles for Monday through Saturday.
      * Morning (08:00–12:00) and Afternoon (13:30–17:00) slot controls.
      * "Lưu Lịch Khám" button.
    - Tab 3 (Đánh Giá Bệnh Nhân): List of verified patient reviews and ratings.
6.  UI Controls:         Bio input, fee input, schedule matrix grid, save buttons.
7.  Target Transitions:  `/doctor`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-15 ADMIN DASHBOARD
================================================================================
1.  Screen ID:           SCR-15
2.  Screen Name:         Admin Executive Dashboard & System Telemetry
3.  Route URL:           `/admin` (Component: `AdminDashboard.tsx`)
4.  Primary Actors:      Admin
5.  Visual Layout:
    - Executive KPI Cards: Total Registered Users, Active Doctors, Total Consultations, Total Gross Revenue.
    - System Health & Infrastructure Grid: Spring Boot Backend, PostgreSQL 16 (pgvector), Redis Cache, Gemini Gateway, Stripe Gateway.
    - AI Usage & FinOps Telemetry Card: Prompt vs Completion tokens across Gemini, OpenAI, OpenRouter; Cost projection in USD and VNĐ (`AI_COST_VND_PER_USD = 25450`).
    - AI Mode Switcher: System-wide AI provider toggle (BE-1).
    - Recent System Activity Feed: Live feed of bookings, completed encounters, and security events.
6.  UI Controls:         KPI cards, AI mode toggle buttons, date filters.
7.  Target Transitions:  `/admin/doctors`, `/admin/users`, `/admin/appointments`, `/admin/specialties`, `/admin/audit-logs`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-16 DOCTOR MANAGEMENT & VETTING PAGE
================================================================================
1.  Screen ID:           SCR-16
2.  Screen Name:         Doctor Directory & Credential Vetting Page
3.  Route URL:           `/admin/doctors` (Component: `DoctorManagementPage.tsx`)
4.  Primary Actors:      Admin
5.  Visual Layout:
    - Tab Switcher: "Danh Sách Bác Sĩ" vs "Chờ Thẩm Định Chứng Chỉ (Pending Vetting)".
    - Pending Vetting Table: Doctors awaiting license audit, showing CCHN number, Specialty, Hospital, "Phê Duyệt" / "Từ Chối" buttons.
    - Action Bar: "Tạo Bác Sĩ Mới", "Đồng Bộ Toàn Bộ Vector Bác Sĩ (Sync Vectors)".
    - Doctor Directory Table: Full Name, Specialty, CCHN Number, Rating, Status (`ACTIVE`, `INACTIVE`), Action menu (Edit, Toggle Status, Sync Single Vector).
6.  UI Controls:         Search bar, vetting action buttons, create doctor modal, sync vector button.
7.  Target Transitions:  `/admin`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-17 USER MANAGEMENT & ACCESS CONTROL PAGE
================================================================================
1.  Screen ID:           SCR-17
2.  Screen Name:         User Management & Access Control Page
3.  Route URL:           `/admin/users` (Component: `UserManagementPage.tsx`)
4.  Primary Actors:      Admin
5.  Visual Layout:
    - Search & Filter Bar: Search by email/name, filter by role (`PATIENT`, `DOCTOR`, `ADMIN`).
    - User Accounts Table: Avatar, Full Name, Email, Phone, Role badge, Status badge (`ACTIVE`, `LOCKED`, `UNVERIFIED`).
    - Action Menu: "Khóa Tài Khoản" / "Mở Khóa" modal with mandatory 10-character reason textarea.
6.  UI Controls:         Search input, role filter, lock/unlock toggle, reason modal.
7.  Target Transitions:  `/admin`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-18 OPERATIONS SUPERVISION CONSOLE
================================================================================
1.  Screen ID:           SCR-18
2.  Screen Name:         Operations Supervision Console (Appointments, Triage, Specialties, Audit Logs)
3.  Route URL:           `/admin/appointments`, `/admin/triage`, `/admin/specialties`, `/admin/audit-logs`
4.  Primary Actors:      Admin
5.  Visual Layout:
    - Sub-Page 18a (`/admin/appointments` - `AppointmentSupervisionPage.tsx`): Master appointment list, filter by status and date, "Hủy Bắt Buộc & Hoàn Tiền" button with reason dialog.
    - Sub-Page 18b (`/admin/triage` - `TriageSupervisionPage.tsx`): List of AI triage sessions, urgency level pills, SBAR clinical inspector modal.
    - Sub-Page 18c (`/admin/specialties` - `SpecialtyManagementPage.tsx`): Clinical specialty directory, Add/Edit specialty modal (Name, Code, Description, Icon).
    - Sub-Page 18d (`/admin/audit-logs` - `AuditLogPage.tsx`): Immutable security audit log table, action filter (`VIEW_PATIENT_RECORD`, `USER_LOGIN`, `ADMIN_OVERRIDE`), expandable JSON detail inspector.
6.  UI Controls:         Data tables, filter dropdowns, force-cancel button, audit JSON inspector.
7.  Target Transitions:  `/admin`.
================================================================================
```

---

#### 3.1.3 Role-Based Screen Authorization Matrix

The screen access permissions are enforced via React Router `ProtectedRoute` in `frontend/src/App.tsx` and Spring Security `@PreAuthorize` on backend endpoints:

| Screen ID | Screen Name & Route Path | Guest | Patient | Doctor | Admin | Authorization Enforcement Mechanism |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **SCR-01** | Landing Page (`/`, `/landing`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public route; unauthenticated access permitted. |
| **SCR-02** | Login & Registration (`/login`) | **ALLOW** | **REDIRECT** | **REDIRECT** | **REDIRECT** | Public route; active sessions redirected to role dashboard. |
| **SCR-03** | Forgot Password (`/forgot-password`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public route; token generated and emailed. |
| **SCR-04** | Reset Password (`/reset-password`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Token hash validated server-side. |
| **SCR-05** | Verify Email Gate (`/verify-email`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public token redemption endpoint. |
| **SCR-06** | OAuth2 Callback (`/oauth2/callback`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Ingests JWT from Google OAuth2 redirect. |
| **SCR-07** | Patient Dashboard (`/patient`) | DENY | **ALLOW** | DENY | **ALLOW** | `ProtectedRoute(allowedRoles=['PATIENT', 'ADMIN'])`. |
| **SCR-08** | Symptom Triage (`/patient/triage`) | DENY | **ALLOW** | DENY | **ALLOW** | Protected patient route. |
| **SCR-09** | Doctor Search & Booking (`/patient/doctors`) | DENY | **ALLOW** | DENY | **ALLOW** | Protected patient route. |
| **SCR-10** | Document Summarizer (`/patient/documents`) | DENY | **ALLOW** | DENY | **ALLOW** | Protected patient route. |
| **SCR-11** | Payment Success (`/payment/success`) | DENY | **ALLOW** | DENY | **ALLOW** | Public receipt / callback route. |
| **SCR-12** | Doctor Workstation (`/doctor`) | DENY | DENY | **ALLOW** | DENY | `ProtectedRoute(allowedRoles=['DOCTOR'])`. |
| **SCR-13** | Doctor Patient Records (`/doctor/patients`) | DENY | DENY | **ALLOW\*** | DENY | Protected doctor route + `PatientAccessGuard`. |
| **SCR-14** | Doctor Profile & Schedule (`/doctor/profile`) | DENY | DENY | **ALLOW** | DENY | Protected doctor route. |
| **SCR-15** | Admin Dashboard (`/admin`) | DENY | DENY | DENY | **ALLOW** | `ProtectedRoute(allowedRoles=['ADMIN'])`. |
| **SCR-16** | Doctor Management (`/admin/doctors`) | DENY | DENY | DENY | **ALLOW** | Protected admin route. |
| **SCR-17** | User Management (`/admin/users`) | DENY | DENY | DENY | **ALLOW** | Protected admin route. |
| **SCR-18** | Operations Supervision (`/admin/*`) | DENY | DENY | DENY | **ALLOW** | Protected admin route. |

*\*Access strictly guarded by `PatientAccessGuard` verifying an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment).*

---

#### 3.1.4 Non-Screen & Asynchronous Background Functions

```mermaid
graph TD
    subgraph "Thread Pools & Schedulers (Java 21 Project Loom)"
        LoomPool[Virtual Threads Loom Executor]
        MailPool[Async MailExecutor: 4 Core, 10 Max, 500 Queue]
        Scheduler[Spring @Scheduled Tasks]
    end

    subgraph "Asynchronous Background Jobs"
        Job1[NSF-01: Transactional Email Dispatch @Async mailExecutor]
        Job2[NSF-02: Slot Hold Expiration & Lock Release Engine]
        Job3[NSF-03: Vector Index Tuning SET LOCAL hnsw.ef_search = 120]
        Job4[NSF-04: Flyway Schema Migration Auto-Execution V1-V22]
        Job5[NSF-05: Multimodal OCR Vision Pipeline Worker]
        Job6[NSF-06: Cache Invalidation & Telemetry Aggregator]
    end

    MailPool --> Job1
    Scheduler --> Job2 & Job6
    LoomPool --> Job3 & Job5
    SpringContext[Spring Boot Startup Context] --> Job4
```

1. **NSF-01: Transactional Email Dispatch (`@Async("mailExecutor")`):**
   - Dispatches password reset emails, account verification links, and appointment admission slips asynchronously via `AsyncConfig` (`mailExecutor`).
2. **NSF-02: Slot Hold Expiration & Lock Release Engine:**
   - Periodically identifies appointments in `UNPAID` status exceeding reservation timeout and frees slots.
3. **NSF-03: Vector Index Session Tuning:**
   - Dynamically injects session-level tuning (`SET LOCAL hnsw.ef_search = 120`, `SET LOCAL enable_seqscan = off`, `SET LOCAL work_mem = '64MB'`) prior to executing vector search.
4. **NSF-04: Flyway Schema Migration Auto-Execution:**
   - Automatically executes Flyway migrations `V1` through `V22` on Spring Boot startup before bean creation.
5. **NSF-05: Multimodal OCR Vision Pipeline Worker:**
   - Asynchronously streams PDF/Image documents to Google Gemini 1.5 Flash Vision API and extracts biomarker JSON.
6. **NSF-06: Cache Invalidation & Telemetry Aggregator:**
   - Aggregates daily AI token usage from `ai_token_usage` and invalidates stale Redis caches.

---

#### 3.1.5 Physical Entity Relationship Diagram (ERD)

The MediAssist-AI relational schema is implemented on PostgreSQL 16 LTS with the `pgvector` extension across 17 real database tables managed by Flyway migrations V1 through V22:

```mermaid
erDiagram
    users ||--o| doctor_profiles : "has profile"
    users ||--o| patient_profiles : "has profile"
    users ||--o{ medical_documents : "owns"
    users ||--o{ appointments : "as patient"
    users ||--o{ appointments : "as doctor"
    users ||--o{ triage_sessions : "creates"
    users ||--o{ payment_transactions : "initiates"
    users ||--o{ password_reset_tokens : "requests"
    users ||--o{ email_verification_tokens : "receives"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"

    doctor_profiles }|--|| specialties : "primary specialty"
    doctor_profiles ||--o{ doctor_specialties : "sub-specialties"
    doctor_specialties }|--|| specialties : "references"
    doctor_profiles ||--o{ doctor_schedule_slots : "schedules"
    doctor_profiles ||--o{ doctor_reviews : "receives"

    appointments ||--o| payment_transactions : "settled by"
    appointments }o--o| medical_documents : "attaches"
    appointments }o--o| triage_sessions : "originates from"
    appointments ||--o| doctor_reviews : "rated by"

    medical_documents ||--o| document_analyses : "analyzed into"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone_number UK
        varchar role "PATIENT, DOCTOR, ADMIN"
        boolean is_active
        boolean email_verified
        varchar google_id UK
        timestamp created_at
        timestamp updated_at
    }

    patient_profiles {
        uuid id PK
        uuid user_id FK,UK
        date date_of_birth
        varchar gender
        varchar blood_type
        text allergies
        varchar emergency_contact
        text medical_history_summary
        integer remaining_ai_quota
        timestamp created_at
        timestamp updated_at
    }

    doctor_profiles {
        uuid id PK
        uuid user_id FK,UK
        uuid specialty_id FK
        varchar license_number UK
        varchar academic_title
        text bio
        vector bio_embedding "1536 dims"
        decimal consultation_fee
        decimal rating_avg
        integer review_count
        boolean is_verified
        varchar clinic_room
        varchar hospital_name
        text hospital_address
        timestamp created_at
        timestamp updated_at
    }

    specialties {
        uuid id PK
        varchar name UK
        varchar code UK
        text description
        varchar icon_name
        timestamp created_at
        timestamp updated_at
    }

    doctor_specialties {
        uuid id PK
        uuid doctor_id FK
        uuid specialty_id FK
    }

    doctor_schedule_slots {
        uuid id PK
        uuid doctor_id FK
        varchar day_of_week
        time start_time
        time end_time
        boolean is_available
        integer max_patients
        timestamp created_at
    }

    appointments {
        uuid id PK
        varchar appointment_code UK
        uuid patient_id FK
        uuid doctor_id FK
        timestamp scheduled_start
        timestamp scheduled_end
        varchar status "SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED"
        varchar cancellation_reason
        text consultation_notes
        varchar queue_number "STT 01, STT 02..."
        varchar clinic_room
        text chief_complaint
        text vital_signs_json "BP, HR, SpO2, BMI"
        varchar icd10_code
        varchar icd10_name
        text prescription_json
        text treatment_plan
        date follow_up_date
        decimal fee_amount
        varchar payment_status "UNPAID, PAID, REFUNDED"
        uuid medical_document_id FK
        uuid triage_session_id FK
        timestamp checked_in_at
        bigint version
        timestamp created_at
        timestamp updated_at
    }

    triage_sessions {
        uuid id PK
        uuid user_id FK
        text chief_complaint
        text raw_symptoms
        text sbar_summary
        varchar urgency_level "ROUTINE, URGENT, EMERGENCY"
        uuid recommended_specialty_id FK
        boolean red_flags_detected
        text clarifying_turns_json
        timestamp created_at
    }

    medical_documents {
        uuid id PK
        uuid patient_id FK
        varchar file_name
        varchar file_type
        bigint file_size
        varchar file_hash "SHA-256"
        varchar storage_path "Private S3 Key"
        varchar status "ANALYZED, PROCESSING, FAILED"
        timestamp created_at
        timestamp updated_at
    }

    document_analyses {
        uuid id PK
        uuid document_id FK,UK
        text biomarkers_json
        text abnormal_indicators_json
        text layperson_summary
        text loinc_codes_json
        uuid recommended_specialty_id FK
        timestamp created_at
    }

    payment_transactions {
        uuid id PK
        varchar transaction_code UK
        uuid user_id FK
        uuid appointment_id FK
        varchar order_type "APPOINTMENT_FEE, QUOTA_PURCHASE"
        decimal amount
        varchar currency "VND"
        varchar status "PENDING, SUCCESS, FAILED, REFUNDED"
        varchar payment_method "STRIPE, MOCK"
        varchar gateway_transaction_id
        text metadata_json
        timestamp created_at
        timestamp updated_at
    }

    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash "SHA-256 (64 hex)"
        timestamp expires_at
        boolean consumed
        timestamp consumed_at
        timestamp created_at
    }

    email_verification_tokens {
        uuid id PK
        uuid user_id FK
        varchar token UK
        timestamp expires_at
        timestamp created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        varchar title
        text message
        varchar type
        boolean is_read
        text metadata_json
        timestamp created_at
    }

    doctor_reviews {
        uuid id PK
        uuid appointment_id FK,UK
        uuid patient_id FK
        uuid doctor_id FK
        integer rating "1 to 5"
        text comment
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action "VIEW_PATIENT_RECORD, LOGIN..."
        varchar entity_type
        uuid entity_id
        varchar ip_address
        text details_json
        timestamp created_at
    }

    ai_token_usage {
        uuid id PK
        varchar provider "GEMINI, OPENAI, OPENROUTER"
        varchar model_name
        integer prompt_tokens
        integer completion_tokens
        decimal estimated_cost_usd
        timestamp created_at
    }
```

---

### 3.2 Applications for Patients, Doctors, and Admins

#### 3.2.1 Welcome & Authentication Flow (FR-AUTH)
- **FR-AUTH-01:** System shall authenticate users via Email/Password utilizing Bcrypt hashing (cost factor 12) with zero plaintext credential persistence (`AuthController.login`).
- **FR-AUTH-02:** System shall support single sign-on (SSO) via Google OAuth2 Authorization Code Grant flow, auto-provisioning new accounts with `google_id` linkage (Flyway V8).
- **FR-AUTH-03:** System shall issue stateless JSON Web Tokens (JWT) adhering to RFC 7519 using a dual-transport mechanism: HttpOnly Secure Cookie (primary web defense against XSS) and JSON Response Body (`AuthResponse`).
- **FR-AUTH-04:** System shall enforce an Email Verification Gate (Flyway V22) blocking unverified accounts (`email_verified = false`) from reserving in-clinic appointments or accessing medical records (`EmailVerificationGuard`).
- **FR-AUTH-05:** System shall provide a secure password reset workflow utilizing single-use SHA-256 token hashing (Flyway V21) with a strict 15-minute expiration time-to-live (TTL).
- **FR-AUTH-06:** System shall execute an automated account rate-limiting lockout following 5 consecutive failed login attempts within a 15-minute sliding window (`SecurityRateLimiterService`).

#### 3.2.2 Conversational Triage & Clinical Defense Engine (FR-TRG)
- **FR-TRG-01:** System shall conduct multi-turn conversational symptom evaluations, prompting targeted clarifying questions regarding onset, duration, and aggravating factors before rendering clinical recommendations (`TriageController.assess`).
- **FR-TRG-02:** System shall intercept acute medical emergencies (Red-Flags) including Stroke FAST signs, Myocardial Infarction symptoms, and Severe Anaphylaxis, halting triage and locking the interface with an immediate 115 Emergency Hotline directive (`ClinicalQueryDefenseEngine`).
- **FR-TRG-03:** System shall normalize Vietnamese medical colloquialisms, regional slang, teen-code, and unaccented text (`ko` $\rightarrow$ `không`, `bs` $\rightarrow$ `bác sĩ`, `dau da day` $\rightarrow$ `đau dạ dày`) prior to downstream semantic processing.
- **FR-TRG-04:** System shall implement the Vietnamese NegEx algorithm to split clinical queries into affirmative and negated clauses, quarantining negated findings (e.g., "không sốt") to prevent false specialty routing.
- **FR-TRG-05:** System shall generate a structured SBAR (Situation, Background, Assessment, Recommendation) clinical handoff report containing an assigned urgency rating (`ROUTINE`, `URGENT`, `EMERGENCY`) and recommended medical specialty code (`triage_sessions`).

#### 3.2.3 Semantic Vector Search & Doctor Matching Engine (FR-VEC)
- **FR-VEC-01:** System shall transform affirmative symptom queries into 1536-dimensional continuous dense vector embeddings using `openai/text-embedding-3-small` with local FNV-1a feature hash fallback (`EmbeddingService`).
- **FR-VEC-02:** System shall index verified physician biographies in PostgreSQL 16 using Hierarchical Navigable Small World (HNSW) graph indexing with parameters $m=24$ and $ef\_construction=128$ (`idx_doctor_bio_hnsw_verified` - Flyway V11).
- **FR-VEC-03:** System shall tune database session parameters prior to vector execution via `SET LOCAL hnsw.ef_search = 120`, `SET LOCAL enable_seqscan = off`, and `SET LOCAL work_mem = '64MB'` to enforce index scan execution and guarantee $> 99.95\%$ recall.
- **FR-VEC-04:** System shall execute a Weighted Hybrid Re-Ranking Formula (WHRF) within a bounded min-heap combining Sigmoid Contrastive Sharpening ($S_{dense} = \frac{1}{1 + e^{-8.0(S - 0.65)}}$), sparse lexical BM25 overlap, specialty bonuses ($+0.12$), divergence penalties ($-0.10$), and review credibility dampers.
- **FR-VEC-05:** System shall restrict public doctor search visibility strictly to verified licensed practitioners (`is_verified = true`).
- **FR-VEC-06:** System shall integrate WHO ICD-10 and MOH Decision 7603/QĐ-BYT clinical ontologies, providing prefix autocomplete for medical diagnoses in $< 30\text{ms}$ (`ClinicalOntologyController.searchIcd10`).
- **FR-VEC-07:** System shall integrate LOINC and MOH Decision 3280/QĐ-BYT laboratory ontologies, providing autocomplete for laboratory and diagnostic test requisitions in $< 30\text{ms}$ (`ClinicalOntologyController.searchLoinc`).
- **FR-VEC-08:** System shall return the top $K=5$ optimal physician matches with normalized match compatibility percentages and real-time appointment slot availability (`DoctorSemanticSearchService`).

#### 3.2.4 Multimodal Medical Document OCR & LOINC Summarizer (FR-DOC)
- **FR-DOC-01:** System shall ingest patient medical lab reports, blood panels, and imaging scans in PDF, PNG, and JPEG formats up to 10MB in size and 10 pages in length (`MedicalDocumentValidator`).
- **FR-DOC-02:** System shall compute client-side SHA-256 cryptographic checksums to detect and deduplicate identical document re-uploads (`file_hash` - Flyway V5).
- **FR-DOC-03:** System shall store all medical document files strictly in private Supabase S3 cloud buckets (`medical-documents`) under internal object keys (`storage_path`), completely prohibiting public web access URLs (Security Fix V20).
- **FR-DOC-04:** System shall issue time-limited HMAC signed URLs with a strict 15-minute expiration (900 seconds) for authorized file previews and downloads (`SupabaseStorageService`).
- **FR-DOC-05:** System shall extract numerical biomarkers, physiological units, demographic reference ranges, and abnormal indicator flags (`NORMAL`, `ELEVATED`, `LOW`) using Google Gemini 1.5 Flash Multimodal Vision AI (`DocumentAnalysis`).
- **FR-DOC-06:** System shall translate complex clinical laboratory findings into plain-language Vietnamese explanations accompanied by mandatory medical safety disclaimers.

#### 3.2.5 O2O Clinical Scheduling & Multi-Channel Payment (FR-BOK)
- **FR-BOK-01:** System shall manage in-clinic consultation bookings strictly within hospital operating hours: Monday through Saturday, 08:00–12:00 and 13:30–17:00 (Sundays closed - `INVALID_SLOT_DAY`, `INVALID_SLOT_TIME`).
- **FR-BOK-02:** System shall enforce serializable concurrency controls preventing double-booking of identical 30-minute doctor time slots (`SLOT_CONFLICT`).
- **FR-BOK-03:** System shall issue a sequential daily admission queue number (`STT 01`, `STT 02`...) for each doctor schedule starting at STT 01 at 08:00 AM (`queue_number` - Flyway V19).
- **FR-BOK-04:** System shall generate an Electronic Patient Admission Slip detailing clinic room, hospital floor/building, Google Maps navigation coordinates, and pre-encounter preparation instructions (`AppointmentController.getTicket`).
- **FR-BOK-05:** System shall support appointment check-in upon arrival at the hospital clinic (`AppointmentController.checkIn`).
- **FR-BOK-06:** System shall permit patient-initiated rescheduling up to 2 hours prior to scheduled appointment time without fee penalties (`AppointmentController.rescheduleAppointment`).
- **FR-BOK-07:** System shall execute automated financial refunds via `AppointmentRefundService` according to hospital cancellation timeline policies (>24h: 100%, 2-24h: 80%, <2h: 0%, Doctor Cancel: 100%).

#### 3.2.6 Doctor Clinical Workstation & Longitudinal EMR (FR-CLIN)
- **FR-CLIN-01:** System shall provide attending physicians with an interactive daily queue sorted sequentially by patient admission STT numbers (`DoctorController.callNextPatient`).
- **FR-CLIN-02:** System shall provide a split-screen pre-encounter clinical inspection workspace displaying the original raw lab document alongside the AI SBAR clinical summary (`DoctorDashboard.tsx`).
- **FR-CLIN-03:** System shall enforce Broken Object Level Authorization defenses via `PatientAccessGuard`, requiring an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment) before permitting doctor access to patient records, with mandatory `VIEW_PATIENT_RECORD` audit logging.
- **FR-CLIN-04:** System shall record objective physical examination notes and vital signs (Blood Pressure, Heart Rate, Respiratory Rate, Body Temperature, SpO2, Weight, Height, and auto-computed BMI) directly on `appointments.vital_signs_json` (Flyway V18).
- **FR-CLIN-05:** System shall require at least one standardized WHO ICD-10 diagnosis code prior to encounter finalization (`icd10_code`, `icd10_name`).
- **FR-CLIN-06:** System shall generate electronic outpatient prescriptions with dosage regimens, administration routes, and treatment durations stored in `appointments.prescription_json` (Flyway V9).
- **FR-CLIN-07:** System shall lock finalized clinical encounters as legally immutable medical records (`AppointmentStatus.COMPLETED`).
- **FR-CLIN-08:** System shall export official formatted consultation summaries and prescriptions as print-ready PDF documents (`MeddiesPdfGeneratorService`).

#### 3.2.7 Admin Governance & AI FinOps Analytics (FR-ADM)
- **FR-ADM-01:** System shall provide an executive telemetry dashboard tracking active platform users, consultation volumes, and infrastructure service health (`AdminController.getStats`).
- **FR-ADM-02:** System shall audit and vet doctor medical practice certificates (CCHN) against the National Healthcare Practitioner Registry before granting public visibility (`AdminController.vetDoctor`).
- **FR-ADM-03:** System shall monitor AI token consumption (prompt and completion tokens) across Gemini, OpenAI, and OpenRouter APIs, projecting costs in USD and VNĐ (`AI_COST_VND_PER_USD = 25450` - `AdminController.getAiUsage`).
- **FR-ADM-04:** System shall enforce role-based access control permitting only `ADMIN` users to toggle system-wide AI provider and failover modes (`POST /api/v1/system/ai-mode/toggle` - Security Fix BE-1).
- **FR-ADM-05:** System shall maintain an append-only, immutable audit trail in `audit_logs` capturing authentication events, doctor patient record inspections, and administrative overrides (`AdminController.getAuditLogs`).
- **FR-ADM-06:** System shall track Flyway database migration history (V1 through V22) and pgvector HNSW index health.
"""

if __name__ == "__main__":
    print("Part 4 module loaded successfully. Character count:", len(get_content()))
