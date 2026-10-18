# -*- coding: utf-8 -*-
"""
Part 4: 3. Functional Requirements
3.1 System Functional Overview (3.1.1 Screens Flow, 3.1.2 Screen Descriptions for 18 screens,
3.1.3 Screen Authorization Matrix, 3.1.4 Non-Screen Functions, 3.1.5 Physical ERD)
3.2 Applications for Patients, Doctors, and Admins (3.2.1 to 3.2.7 detailed functional requirements).
"""

def get_content():
    return """
---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 System Functional Overview

#### 3.1.1 Screens Flow

The user interface transitions within MediAssist-AI are governed by a deterministic finite state machine operating across the three user roles (`PATIENT`, `DOCTOR`, `ADMIN`):

```mermaid
stateDiagram-v2
    [*] --> SCR01_LandingPage: Public Navigation

    state "Authentication & Onboarding Flow" as AuthFlow {
        SCR01_LandingPage --> SCR02_SignIn: Click "Đăng Nhập"
        SCR01_LandingPage --> SCR03_SignUp: Click "Đăng Ký"
        SCR02_SignIn --> SCR04_ForgotPassword: Click "Quên Mật Khẩu"
        SCR04_ForgotPassword --> SCR02_SignIn: Reset Complete
        SCR03_SignUp --> SCR05_EmailVerifyGate: Registration Success
        SCR05_EmailVerifyGate --> SCR02_SignIn: Token Verified
    }

    state "Patient Operational Flow" as PatientFlow {
        SCR02_SignIn --> SCR06_PatientDashboard: Role = PATIENT
        SCR06_PatientDashboard --> SCR07_AITriage: Start AI Triage
        SCR07_AITriage --> SCR08_DoctorSearch: Triage Complete / Specialty Matched
        SCR08_DoctorSearch --> SCR09_DoctorProfile: Select Doctor Card
        SCR06_PatientDashboard --> SCR10_DocSummarizer: Upload Lab Report
        SCR10_DocSummarizer --> SCR11_DocInspection: View AI Biomarkers
        SCR09_DoctorProfile --> SCR12_BookingCheckout: Select Slot (08:00-17:00)
        SCR12_BookingCheckout --> SCR13_AdmissionTicket: Payment Successful (STT Issued)
        SCR06_PatientDashboard --> SCR14_MedicalPassport: View Longitudinal Health
        SCR13_AdmissionTicket --> SCR06_PatientDashboard: Return to Hub
    }

    state "Doctor Operational Flow" as DoctorFlow {
        SCR02_SignIn --> SCR15_DoctorWorkstation: Role = DOCTOR
        SCR15_DoctorWorkstation --> SCR16_EncounterWorkspace: Select Patient (STT Queue)
        SCR16_EncounterWorkspace --> SCR15_DoctorWorkstation: Finalize Encounter (ICD-10 / Prescription)
    }

    state "Admin Governance Flow" as AdminFlow {
        SCR02_SignIn --> SCR17_AdminDashboard: Role = ADMIN
        SCR17_AdminDashboard --> SCR18_SupervisionFinOps: Navigate Supervision / AI FinOps
        SCR18_SupervisionFinOps --> SCR17_AdminDashboard: Return to Dashboard
    }
```

---

#### 3.1.2 Screen Descriptions

```
================================================================================
SCREEN SPECIFICATION: SCR-01 SPLASH & LANDING PAGE
================================================================================
1.  Screen ID:           SCR-01
2.  Screen Name:         Splash & Landing Page
3.  Route URL:           `/`
4.  Primary Actors:      Guest, Patient, Doctor, Admin (Unauthenticated)
5.  Visual Layout:       
    - Top sticky navigation bar: Logo, Menu links (Dịch Vụ, Bác Sĩ, Về Chúng Tôi), Language picker, Login/Register buttons.
    - Hero Section: High-impact headline ("Chăm Sóc Sức Khỏe Thông Minh Cùng AI"), CTA button "Khám Phá Triệu Chứng Ngay", quick symptom search bar.
    - Live Clinical Triage Simulator Widget: Mini interactive chat allowing visitors to experience 5-stage triage before signing up.
    - Value Proposition Grid: 4 cards (AI Triage 24/7, Multimodal OCR, pgvector Doctor Matching, O2O In-Clinic Appointments).
    - Clinical Quality Badges: WHO ICD-10, LOINC MOH 3280, HIPAA Safe Harbor, Decree 13/2023/NĐ-CP.
    - Footer: Hospital directory, hotline 115 emergency warning, legal disclaimers.
6.  UI Controls & Inputs:
    - Search Input: `symptom_query` (Text, max 255 chars).
    - Buttons: `Bắt Đầu Sàng Lọc`, `Tìm Bác Sĩ`, `Đăng Nhập`, `Đăng Ký`.
7.  Validation Rules:    Non-empty query string.
8.  Target Transitions:  `/triage`, `/doctors`, `/login`, `/register`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-02 SIGN-IN PAGE
================================================================================
1.  Screen ID:           SCR-02
2.  Screen Name:         Sign-In Page (Email/Password & Google OAuth2)
3.  Route URL:           `/login`
4.  Primary Actors:      Unauthenticated Users (All Roles)
5.  Visual Layout:       
    - Split-screen layout: Left pane showcases clinical AI graphic and patient testimonials; Right pane renders modern clean auth form.
    - Form card: Email input, Password input with eye toggle icon, Remember Me checkbox, Forgot Password link.
    - "Đăng Nhập" primary button with spinner state.
    - Social login divider: "Hoặc tiếp tục với" -> Google OAuth2 button with official Google SVG icon.
    - Demo Quick Login Drawer (Enabled in dev/demo builds for Capstone defense): 1-click login chips for Demo Patient, Demo Doctor, Demo Admin.
6.  UI Controls & Inputs:
    - Text Input: `email` (Type: email, required, email format regex).
    - Password Input: `password` (Type: password, required, min 8 chars).
    - Checkbox: `remember_me` (Boolean).
    - Button: `Đăng Nhập`, `Đăng Nhập Bằng Google`.
7.  Validation Rules:    Valid RFC 5322 email regex, non-empty password.
8.  Target Transitions:  Role-based routing (`/patient/dashboard`, `/doctor/dashboard`, `/admin/supervision`), `/forgot-password`, `/register`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-03 SIGN-UP & REGISTRATION PAGE
================================================================================
1.  Screen ID:           SCR-03
2.  Screen Name:         Sign-Up & Account Registration
3.  Route URL:           `/register`
4.  Primary Actors:      New Users (Patients, Doctors)
5.  Visual Layout:       
    - Card container: Role selector toggle tab ("Tôi là Bệnh Nhân" vs "Tôi là Bác Sĩ").
    - Common Fields: Full Name, Email, Password, Confirm Password, Phone Number.
    - Doctor Specific Fields (shown if Doctor selected): Practice Certificate Number (CCHN), Specialty dropdown, Hospital Name.
    - Terms & Conditions checkbox with link to Privacy Policy (Decree 13/2023/NĐ-CP compliance).
    - Submit button: "Tạo Tài Khoản".
6.  UI Controls & Inputs:
    - Text Inputs: `full_name`, `email`, `phone_number`, `license_number` (Doctor only).
    - Password Inputs: `password`, `confirm_password` with interactive strength meter.
    - Checkbox: `agree_terms` (Required true).
7.  Validation Rules:    Bcrypt password rules (BR-01), Vietnamese phone regex (BR-06).
8.  Target Transitions:  `/verify-email`, `/login`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-04 FORGOT PASSWORD & RESET PAGE
================================================================================
1.  Screen ID:           SCR-04
2.  Screen Name:         Forgot Password & Secure Token Reset
3.  Route URL:           `/forgot-password`, `/reset-password`
4.  Primary Actors:      Unauthenticated Users
5.  Visual Layout:       
    - Step 1 (`/forgot-password`): Clean card with padlock illustration, email input, "Gửi Link Đặt Lại Mật Khẩu" button.
    - Step 2 (`/reset-password?token=...`): Token validation spinner; upon valid token, renders New Password and Confirm Password inputs.
6.  UI Controls & Inputs:
    - Text Input: `email`.
    - Password Inputs: `new_password`, `confirm_password`.
7.  Validation Rules:    SHA-256 token hash validation (BE-5 / Flyway V21), password complexity.
8.  Target Transitions:  `/login`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-05 EMAIL VERIFICATION GATE PAGE
================================================================================
1.  Screen ID:           SCR-05
2.  Screen Name:         Email Verification Gate
3.  Route URL:           `/verify-email`
4.  Primary Actors:      Unverified Registered Users
5.  Visual Layout:       
    - Centered card: Mail envelope illustration, notice to check inbox for activation link.
    - "Gửi lại email kích hoạt" secondary button with 60-second cooldown timer.
    - Interactive success celebration banner once token link is clicked.
6.  UI Controls & Inputs: Button `Gửi Lại Email Kích Hoạt`, Button `Đến Trang Đăng Nhập`.
7.  Validation Rules:    Token expiration check (Flyway V22).
8.  Target Transitions:  `/login`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-06 PATIENT HOME DASHBOARD
================================================================================
1.  Screen ID:           SCR-06
2.  Screen Name:         Patient Home Dashboard
3.  Route URL:           `/patient/dashboard`
4.  Primary Actors:      Patient
5.  Visual Layout:       
    - Top banner: Personalized greeting ("Xin chào, {FullName}"), quick date, active health summary.
    - Quick Action Cards:
      1. "Trò chuyện Sàng Lọc AI" -> Routes to `/triage`.
      2. "Tải Lên Kết Quả Xét Nghiệm" -> Routes to `/documents`.
      3. "Tìm Kiếm Bác Sĩ Chuyên Khoa" -> Routes to `/doctors`.
      4. "Hồ Sơ Sức Khỏe Điện Tử" -> Routes to `/patient/medical-passport`.
    - Next Upcoming Appointment Widget: Shows next confirmed in-clinic consultation (Doctor name, time window, clinic room, sequential STT number, "Xem Phiếu Khám" button).
    - Recent AI Medical Summaries: Mini list of recently processed lab documents.
6.  UI Controls:         Action cards, widget buttons, notification bell.
7.  Target Transitions:  `/triage`, `/documents`, `/doctors`, `/appointments/{id}/ticket`, `/patient/medical-passport`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-07 CONVERSATIONAL AI TRIAGE SCREEN
================================================================================
1.  Screen ID:           SCR-07
2.  Screen Name:         Conversational AI Symptom Triage Screen
3.  Route URL:           `/triage`
4.  Primary Actors:      Patient
5.  Visual Layout:       
    - Left/Center: Conversational chat stream with alternating message bubbles (User query on right, MediAssist AI Scribe on left).
    - Floating Emergency 115 Alert Banner: Appears instantly if Red-Flag symptoms detected.
    - Quick Symptom Tags: Pills for rapid selection (Đau đầu, Đau thắt ngực, Sốt cao, Ho kéo dài...).
    - Bottom Chat Bar: Text input, Send button, mic icon for voice dictation.
    - Right Side Panel: Real-time SBAR Assessment Card:
      * Situation badge.
      * Urgency Indicator: `ROUTINE` (Green), `URGENT` (Amber), `EMERGENCY` (Flashing Red).
      * Recommended Medical Specialty: e.g., "Khoa Tim Mạch Can Thiệp".
      * Matched Specialist Doctors: Mini cards linking directly to booking.
6.  UI Controls:         Chat textarea, send button, symptom tags, matched doctor cards.
7.  Target Transitions:  `/doctors`, `/appointments/checkout`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-08 SEMANTIC DOCTOR SEARCH & DISCOVERY
================================================================================
1.  Screen ID:           SCR-08
2.  Screen Name:         Semantic Doctor Search & Discovery Screen
3.  Route URL:           `/doctors`
4.  Primary Actors:      Patient, Guest
5.  Visual Layout:       
    - Search Bar: Natural language clinical symptom query input ("Tôi bị đau nửa đầu kèm buồn nôn").
    - Filter Bar: Specialty dropdown, Consultation fee slider, Star rating filter, Hospital campus filter.
    - AI Mode Indicator: Displays active provider (Gemini 1.5 Flash Direct vs OpenRouter vs Local Hashing).
    - Doctor Card Grid: Displays ranked specialists:
      * Doctor avatar, Full name, Academic Title (PGS.TS, BS.CKII).
      * Specialty badge, Hospital affiliation.
      * Semantic Match Percentage badge (e.g., "96% Phù Hợp").
      * Star rating (e.g., "4.9 ★ (128 đánh giá)").
      * Consultation fee (VNĐ), Next available slot badge.
      * Action buttons: "Xem Hồ Sơ", "Đặt Lịch Khám".
6.  UI Controls:         Search bar, filter dropdowns, slider, card CTA buttons.
7.  Target Transitions:  `/doctors/{id}`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-09 DOCTOR PUBLIC PROFILE & BOOKING MODAL
================================================================================
1.  Screen ID:           SCR-09
2.  Screen Name:         Doctor Public Profile & In-Clinic Slot Picker
3.  Route URL:           `/doctors/{id}`
4.  Primary Actors:      Patient, Guest
5.  Visual Layout:       
    - Header: Large avatar, verified checkmark, CCHN license number, academic title, hospital department.
    - Bio Section: Clinical experience, research publications, treatment philosophies.
    - Consultation Fee Box: Transparent pricing per 30-minute in-clinic encounter.
    - Interactive Calendar & Slot Picker:
      * Date row: Monday through Saturday tabs (Sundays disabled).
      * Morning Slots (08:00 - 12:00) & Afternoon Slots (13:30 - 17:00).
      * Available slots (Teal), Booked slots (Disabled Grey), Selected slot (Solid Dark Teal).
    - Patient Reviews Section: Verified patient feedback cards.
    - Booking Drawer / Modal: Pre-populates selected slot, prompts patient to enter chief complaint and attach lab results.
6.  UI Controls:         Date picker pills, slot buttons, document dropdown, "Tiếp Tục Đặt Lịch" button.
7.  Target Transitions:  `/appointments/checkout`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-10 MEDICAL DOCUMENT INGESTION SCREEN
================================================================================
1.  Screen ID:           SCR-10
2.  Screen Name:         Medical Document Ingestion & Summarizer Screen
3.  Route URL:           `/documents`
4.  Primary Actors:      Patient
5.  Visual Layout:       
    - Header: "Trợ Lý Bóc Tách & Tóm Tắt Hồ Sơ Cận Lâm Sàng".
    - Drag-and-Drop Ingestion Zone: Border-dashed upload area supporting PDF, PNG, JPEG (< 10MB, max 10 pages).
    - File Preview Strip: Shows selected file name, file size, thumbnail.
    - "Phân Tích Bằng AI" primary button.
    - Document History Table: List of uploaded documents with columns: Tên Tệp, Ngày Tải, Loại Xét Nghiệm, Trạng Thái (`Đang Xử Lý`, `Hoàn Thành`, `Lỗi`), Nút Hành Động ("Xem Chi Tiết", "Tải Tệp Gốc").
6.  UI Controls:         Drag-and-drop file input, upload button, document data table.
7.  Target Transitions:  `/documents/{id}/analysis`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-11 MULTIMODAL DOCUMENT INSPECTION SPLIT-VIEW
================================================================================
1.  Screen ID:           SCR-11
2.  Screen Name:         Multimodal Document Inspection Split-View Screen
3.  Route URL:           `/documents/{id}/analysis`
4.  Primary Actors:      Patient, Authorized Doctor
5.  Visual Layout:       
    - Split-View Layout (50/50 responsive):
      * Left Pane (Original Scan): In-browser secure viewer rendering source PDF/Image via 15-minute temporary signed URL. Tools: Zoom In/Out, Rotate, Page Navigation.
      * Right Pane (AI Clinical Interpretation):
        - Document Classification pill (e.g., "Phiếu Xét Nghiệm Huyết Học & Sinh Hóa").
        - Extracted Biomarker Table: Tên chỉ số, Giá trị đo được, Đơn vị, Khoảng tham chiếu, Mã LOINC, Cảnh báo (`Bình Thường`, `Tăng Cao`, `Giảm`).
        - Layperson Medical Summary: Plain Vietnamese explanation of clinical significance.
        - Red-Flag Alerts (if acute abnormalities detected).
        - Recommended Specialist Card with "Đặt Lịch Khám Ngay" CTA.
6.  UI Controls:         PDF viewer controls, biomarker table, accordion sections, booking CTA button.
7.  Target Transitions:  `/doctors`, `/appointments/checkout`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-12 IN-CLINIC BOOKING CHECKOUT & PAYMENT
================================================================================
1.  Screen ID:           SCR-12
2.  Screen Name:         In-Clinic Appointment Checkout & Payment Screen
3.  Route URL:           `/appointments/checkout`
4.  Primary Actors:      Patient
5.  Visual Layout:       
    - Booking Summary Card: Doctor Name, Specialty, Clinic Room, Date & Time Slot, Sequential STT preview.
    - Consultation Fee Breakdown: Base Fee, VAT (0%), Total Payable.
    - Countdown Timer: 10:00 minutes temporary slot reservation lock.
    - Payment Method Selector:
      * Option 1: Thẻ Quốc Tế (Stripe Credit / Debit Card iframe).
      * Option 2: MediAssist Pay (Mock Sandbox - Dev/Demo mode).
    - "Xác Nhận & Thanh Toán" action button.
6.  UI Controls:         Payment radio buttons, Stripe Elements input, submit button, countdown clock.
7.  Target Transitions:  `/appointments/{id}/ticket`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-13 ELECTRONIC PATIENT ADMISSION SLIP
================================================================================
1.  Screen ID:           SCR-13
2.  Screen Name:         Electronic Patient Encounter Slip & Directions
3.  Route URL:           `/appointments/{id}/ticket`
4.  Primary Actors:      Patient, Reception Staff
5.  Visual Layout:       
    - Admission Ticket Card:
      * Prominent Sequential Queue Number: `STT 05` (Large font).
      * Patient Full Name, Appointment Date & Time Window.
      * Attending Doctor Name, Academic Title, Specialty.
      * Clinic Room Navigation: "Phòng Khám 302, Tầng 3, Tòa Nhà A, Bệnh Viện Đa Khoa MediAssist".
      * Dynamic Verification QR Code.
    - In-Clinic Preparation Guidelines Box:
      * "Nhịn ăn sáng ít nhất 8 tiếng nếu có xét nghiệm máu."
      * "Mang theo bản gốc Căn cước công dân (CCCD) và Thẻ BHYT."
      * "Có mặt trước giờ hẹn 15 phút."
    - Action Toolbar: "Google Maps Dẫn Đường", "In Phiếu Khám", "Thêm Vào Google Calendar", "Tải Tệp .ICS".
6.  UI Controls:         Action buttons, printable ticket frame.
7.  Target Transitions:  `/patient/dashboard`, Google Maps external link.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-14 PATIENT MEDICAL PASSPORT & EMR
================================================================================
1.  Screen ID:           SCR-14
2.  Screen Name:         Patient Medical Passport & Historical EMR Screen
3.  Route URL:           `/patient/medical-passport`
4.  Primary Actors:      Patient
5.  Visual Layout:       
    - Profile Header: Patient avatar, blood type, drug allergies pill tags, emergency contact.
    - Longitudinal Health Timeline: Chronological feed of past clinical encounters.
    - Encounter Card: Date, Doctor, Facility, Vital signs summary, ICD-10 Diagnosis code & title, Prescribed medications list, "Xem Đơn Thuốc PDF" button.
    - Biomarker Trend Charts: Visual line graphs tracking key indicators over time (Huyết áp, Glucose, Cholesterol, SGPT/SGOT).
6.  UI Controls:         Timeline cards, trend charts, PDF export buttons.
7.  Target Transitions:  `/patient/dashboard`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-15 DOCTOR CLINICAL WORKSTATION
================================================================================
1.  Screen ID:           SCR-15
2.  Screen Name:         Doctor Clinical Workstation & Daily Patient Queue
3.  Route URL:           `/doctor/dashboard`
4.  Primary Actors:      Doctor
5.  Visual Layout:       
    - Header: Doctor greeting, clinic room indicator ("Phòng Khám 302"), current date.
    - Daily Queue Sidebar (Left): List of patients scheduled today sorted by STT:
      * STT Number (`STT 01`, `STT 02`...).
      * Patient Name, Age, Gender, Scheduled Time Window.
      * Triage Urgency Badge (`ROUTINE`, `URGENT`).
      * Status Badge (`CONFIRMED`, `IN_PROGRESS`, `COMPLETED`).
    - Main Panel: Active Encounter Overview:
      * Patient demographics, chief complaint, attached lab document badge.
      * Action Buttons: "Bắt Đầu Ca Khám", "Đánh Dấu Vắng Mặt (No-Show)".
    - Quick Stats Bar: Total patients today, completed count, remaining queue length.
6.  UI Controls:         Queue list, action buttons, filter tabs.
7.  Target Transitions:  `/doctor/encounters/{id}`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-16 DOCTOR CLINICAL ENCOUNTER WORKSPACE
================================================================================
1.  Screen ID:           SCR-16
2.  Screen Name:         Doctor Clinical Encounter Split-Screen & EMR Entry
3.  Route URL:           `/doctor/encounters/{id}`
4.  Primary Actors:      Doctor
5.  Visual Layout:       
    - Split-Screen Workspace:
      * Left Pane: Pre-Encounter Clinical Inspection:
        - Toggle 1: Raw Lab Scan Viewer (PDF/Image via 15-min signed URL).
        - Toggle 2: AI SBAR Synthesis & Biomarker Reference Range Table.
      * Right Pane: Comprehensive EMR Consultation Form:
        - Section 1: Vital Signs (Blood pressure, Heart rate, Temp, SpO2, Weight, Height, BMI).
        - Section 2: Clinical Examination Notes (Rich text objective findings).
        - Section 3: ICD-10 Medical Diagnosis Autocomplete (WHO ICD-10 & MOH 7603).
        - Section 4: LOINC Lab & Diagnostic Test Ordering (LOINC & MOH 3280).
        - Section 5: Electronic Outpatient Prescription (Drug name, quantity, dosage, route).
        - Section 6: Follow-up Appointment Date Picker.
    - Bottom Action Bar: "Lưu Bản Nháp" (Draft auto-saved), "Hoàn Tất Ca Khám" (Locks record as immutable).
6.  UI Controls:         Split pane resizer, autocomplete inputs, vital signs fields, prescription table, finalize CTA.
7.  Target Transitions:  `/doctor/dashboard`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-17 ADMIN EXECUTIVE DASHBOARD
================================================================================
1.  Screen ID:           SCR-17
2.  Screen Name:         Admin Executive Dashboard & System Telemetry
3.  Route URL:           `/admin/dashboard`
4.  Primary Actors:      Admin
5.  Visual Layout:       
    - Telemetry KPI Cards: Active Users Online, Total Consultations, Revenue, AI Tokens Today.
    - System Health Status Grid: Spring Boot Backend, PostgreSQL 16 (pgvector), Redis Cache, Gemini Gateway, Stripe Gateway.
    - Doctor Vetting Alert Card: Number of pending doctor license applications awaiting audit.
    - Real-Time Activity Feed: Live ticker of bookings, completed encounters, and security events.
6.  UI Controls:         KPI cards, time range filter, refresh button.
7.  Target Transitions:  `/admin/supervision`, `/admin/ai-finops`, `/admin/doctors/vetting`.
================================================================================
```

```
================================================================================
SCREEN SPECIFICATION: SCR-18 ADMIN SUPERVISION & AI FINOPS CONSOLE
================================================================================
1.  Screen ID:           SCR-18
2.  Screen Name:         Admin Supervision & AI FinOps Console
3.  Route URL:           `/admin/supervision`, `/admin/ai-finops`
4.  Primary Actors:      Admin
5.  Visual Layout:       
    - Tab 1 (Supervision): Master appointment table with filters (Doctor, Patient, Date, Status), "Buộc Hủy & Hoàn Tiền" button with audit justification dialog.
    - Tab 2 (AI FinOps Analytics): Token usage charts (Prompt vs Completion), Cost in USD and VNĐ (`AI_COST_VND_PER_USD = 25450`), Cost per feature breakdown, Model failover switch (Gemini -> OpenRouter -> Local Hashing).
    - Tab 3 (Security Audit Logs): Searchable log table with action filter (`VIEW_PATIENT_RECORD`, `USER_LOGIN`, `ADMIN_OVERRIDE`).
6.  UI Controls:         Data tables, pagination, AI mode toggle switch, refund override button, log filters.
7.  Target Transitions:  `/admin/dashboard`.
================================================================================
```

---

#### 3.1.3 Role-Based Screen Authorization Matrix

| Screen ID | Screen Name & Route | Guest | Patient | Doctor | Admin | Authorization Mechanism |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **SCR-01** | Splash & Landing Page (`/`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public route; no auth guard. |
| **SCR-02** | Sign-In Page (`/login`) | **ALLOW** | **REDIRECT** | **REDIRECT** | **REDIRECT** | Authenticated users auto-redirected to role dashboard. |
| **SCR-03** | Sign-Up Page (`/register`) | **ALLOW** | **REDIRECT** | **REDIRECT** | **REDIRECT** | Public route; auto-redirect if session active. |
| **SCR-04** | Forgot Password (`/forgot-password`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public route; token hash validated server-side. |
| **SCR-05** | Email Verification Gate (`/verify-email`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public token redemption endpoint. |
| **SCR-06** | Patient Dashboard (`/patient/dashboard`) | DENY | **ALLOW** | DENY | DENY | Frontend `ProtectedRoute(role='PATIENT')`. |
| **SCR-07** | Conversational AI Triage (`/triage`) | **ALLOW** | **ALLOW** | DENY | DENY | Public guest screening or authenticated patient. |
| **SCR-08** | Semantic Doctor Search (`/doctors`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public directory; verified doctors displayed. |
| **SCR-09** | Doctor Public Profile (`/doctors/{id}`) | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | Public profile view; slot booking requires auth. |
| **SCR-10** | Document Ingestion (`/documents`) | DENY | **ALLOW** | DENY | DENY | Requires verified `PATIENT` account. |
| **SCR-11** | Document Split-View (`/documents/{id}/analysis`) | DENY | **ALLOW\*** | **ALLOW\*** | **ALLOW\*** | **`PatientAccessGuard`**: Patient self, Doctor with active appointment, or Admin (logged). |
| **SCR-12** | Booking Checkout (`/appointments/checkout`) | DENY | **ALLOW** | DENY | DENY | Patient authenticated with verified email. |
| **SCR-13** | Admission Slip (`/appointments/{id}/ticket`) | DENY | **ALLOW\*** | **ALLOW\*** | **ALLOW** | Patient self or attending Doctor. |
| **SCR-14** | Medical Passport (`/patient/medical-passport`) | DENY | **ALLOW** | DENY | DENY | Patient self-access only. |
| **SCR-15** | Doctor Workstation (`/doctor/dashboard`) | DENY | DENY | **ALLOW** | DENY | Role `DOCTOR` with `is_verified = true`. |
| **SCR-16** | Encounter Workspace (`/doctor/encounters/{id}`) | DENY | DENY | **ALLOW\*** | DENY | Attending Doctor assigned to appointment. |
| **SCR-17** | Admin Dashboard (`/admin/dashboard`) | DENY | DENY | DENY | **ALLOW** | Role `ADMIN` strictly enforced. |
| **SCR-18** | Supervision & FinOps (`/admin/supervision`) | DENY | DENY | DENY | **ALLOW** | Role `ADMIN` strictly enforced. |

*\*Access strictly guarded by `PatientAccessGuard` Broken Object Level Authorization defense.*

---

#### 3.1.4 Non-Screen & Asynchronous Background Functions

MediAssist-AI executes critical asynchronous background workflows that operate outside of direct HTTP request-response screen rendering:

```mermaid
graph TD
    subgraph "Background Thread Pools & Schedulers (Java 21 Project Loom)"
        LoomPool[Virtual Threads Loom Executor: Task-per-thread]
        MailPool[Async MailExecutor: 4 Core, 10 Max, 500 Queue]
        Scheduler[Spring @Scheduled Cron Tasks]
    end

    subgraph "Asynchronous Background Jobs"
        Job1[NSF-01: Asynchronous Transactional Email Dispatch]
        Job2[NSF-02: Slot Hold Expiration & Lock Release Engine]
        Job3[NSF-03: Vector Index Refresh & Session Parameter Tuning]
        Job4[NSF-04: Flyway Schema Migration Auto-Execution]
        Job5[NSF-05: Multimodal OCR Document Pipeline Worker]
        Job6[NSF-06: Cache Invalidation & Telemetry Aggregator]
    end

    MailPool --> Job1
    Scheduler --> Job2 & Job6
    LoomPool --> Job3 & Job5
    SpringContext[Spring Boot Startup Context] --> Job4
```

1. **NSF-01: Asynchronous Transactional Email Dispatch (`@Async("mailExecutor")`):**
   - Handles account verification tokens, password reset hashes, and appointment admission slips asynchronously to prevent blocking web request threads.
   - Built on Spring `ThreadPoolTaskExecutor` (Core: 4, Max: 10, Queue: 500) backed by Java 21 Project Loom.
2. **NSF-02: Slot Hold Expiration & Lock Release Engine (`@Scheduled(fixedRate = 60000)`):**
   - Runs every 60 seconds. Identifies appointments in `PENDING` status exceeding the 10-minute payment timeout.
   - Automatically transitions status to `CANCELLED` and releases the slot lock in Redis.
3. **NSF-03: Vector Index Refresh & Session Parameter Tuning:**
   - Injects session-level tuning (`SET LOCAL hnsw.ef_search = 120`, `SET LOCAL enable_seqscan = off`) before executing vector search queries.
   - Executes periodic index maintenance (`REINDEX INDEX CONCURRENTLY idx_doctor_bio_hnsw_verified`) during off-peak hours.
4. **NSF-04: Flyway Schema Migration Auto-Execution:**
   - Automatically runs on Spring Boot application startup before bean initialization.
   - Evaluates migration scripts `V1` through `V22`, applying pending DDL/DML scripts in strict sequential order.
5. **NSF-05: Multimodal OCR Document Pipeline Worker:**
   - Asynchronously processes uploaded lab reports using Google Gemini Vision API.
   - Converts raw OCR text into structured biomarker tables and LOINC terms without blocking client file upload response.
6. **NSF-06: Cache Invalidation & Telemetry Aggregator:**
   - Aggregates daily AI token usage from `ai_token_logs` into executive summary tables.
   - Refreshes doctor rating averages and invalidates stale Redis query caches.

---

#### 3.1.5 Physical Entity Relationship Diagram (ERD)

The MediAssist-AI relational schema is implemented on PostgreSQL 16 LTS with the `pgvector` extension and Flyway database migrations (V1 through V22):

```mermaid
erDiagram
    users ||--o| doctor_profiles : "has"
    users ||--o{ medical_documents : "owns"
    users ||--o{ appointments : "books as patient"
    users ||--o{ appointments : "attends as doctor"
    users ||--o{ reviews : "writes"
    users ||--o{ password_reset_tokens : "requests"
    users ||--o{ email_verification_tokens : "verifies"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ triage_sessions : "engages"

    doctor_profiles }|--|| specialties : "belongs to"
    doctor_profiles ||--o{ doctor_schedules : "configures"
    doctor_profiles ||--o{ reviews : "receives"

    appointments ||--o| medical_records : "generates"
    appointments ||--o| payments : "settles"
    appointments }o--o| medical_documents : "attaches"

    medical_records ||--o{ prescriptions : "contains"
    prescriptions ||--o{ prescription_items : "includes"
    prescription_items }|--|| medications : "references"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone_number UK
        varchar role
        boolean is_active
        boolean email_verified
        varchar google_id UK
        timestamp created_at
        timestamp updated_at
    }

    doctor_profiles {
        uuid id PK
        uuid user_id FK
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
    }

    specialties {
        uuid id PK
        varchar name UK
        varchar code UK
        text description
        varchar icon_name
    }

    appointments {
        uuid id PK
        uuid patient_id FK
        uuid doctor_id FK
        date appointment_date
        time start_time
        time end_time
        integer queue_number "Sequential STT"
        varchar status
        decimal fee
        uuid medical_document_id FK
        text chief_complaint
        text cancellation_reason
        timestamp created_at
    }

    medical_documents {
        uuid id PK
        uuid patient_id FK
        varchar file_name
        varchar file_type
        bigint file_size
        varchar file_hash "SHA-256"
        varchar storage_path "S3 Object Key"
        varchar status
        jsonb analysis_result "LOINC & Biomarkers"
        timestamp created_at
    }

    medical_records {
        uuid id PK
        uuid appointment_id FK
        uuid patient_id FK
        uuid doctor_id FK
        text examination_notes
        jsonb vital_signs "BP, HR, SpO2, BMI"
        varchar primary_icd10_code FK
        varchar primary_icd10_desc
        jsonb secondary_icd10_codes
        jsonb lab_orders "LOINC codes"
        text follow_up_instructions
        date follow_up_date
        timestamp finalized_at
    }

    payments {
        uuid id PK
        uuid appointment_id FK
        uuid user_id FK
        decimal amount
        varchar currency
        varchar status
        varchar payment_method
        varchar transaction_id UK
        timestamp created_at
    }

    reviews {
        uuid id PK
        uuid appointment_id FK,UK
        uuid patient_id FK
        uuid doctor_id FK
        integer rating "1 to 5"
        text comment
        timestamp created_at
    }

    password_reset_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash "SHA-256 (64 hex)"
        timestamp expires_at
        boolean consumed
        timestamp consumed_at
    }

    email_verification_tokens {
        uuid id PK
        uuid user_id FK
        varchar token UK
        timestamp expires_at
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity_type
        uuid entity_id
        varchar ip_address
        jsonb details
        timestamp timestamp
    }

    ai_token_logs {
        uuid id PK
        varchar provider "GEMINI, OPENAI"
        varchar model_name
        integer prompt_tokens
        integer completion_tokens
        decimal estimated_cost_usd
        timestamp timestamp
    }
```

---

### 3.2 Applications for Patients, Doctors, and Admins

#### 3.2.1 Welcome & Authentication Flow (FR-AUTH)
- **FR-AUTH-01:** System shall authenticate users via Email/Password utilizing Bcrypt hashing (cost factor 12) with zero plaintext credential persistence.
- **FR-AUTH-02:** System shall support single sign-on (SSO) via Google OAuth2 Authorization Code Grant flow, auto-provisioning new accounts with `google_id` linkage (Flyway V8).
- **FR-AUTH-03:** System shall issue stateless JSON Web Tokens (JWT) adhering to RFC 7519 using a dual-transport mechanism: HttpOnly Secure Cookie (primary web defense against XSS) and JSON Response Body (mobile/client Bearer header support).
- **FR-AUTH-04:** System shall enforce an Email Verification Gate (Flyway V22) blocking unverified accounts (`email_verified = false`) from reserving in-clinic appointments or accessing medical records.
- **FR-AUTH-05:** System shall provide a secure password reset workflow utilizing single-use SHA-256 token hashing (Flyway V21) with a strict 15-minute expiration time-to-live (TTL).
- **FR-AUTH-06:** System shall execute an automated account rate-limiting lockout following 5 consecutive failed login attempts within a 15-minute sliding window.

#### 3.2.2 Conversational Triage & Clinical Defense Engine (FR-TRG)
- **FR-TRG-01:** System shall conduct multi-turn conversational symptom evaluations, prompting targeted clarifying questions regarding onset, duration, and aggravating factors before rendering clinical recommendations.
- **FR-TRG-02:** System shall intercept acute medical emergencies (Red-Flags) including Stroke FAST signs, Myocardial Infarction symptoms, and Severe Anaphylaxis, halting triage and locking the interface with an immediate 115 Emergency Hotline directive.
- **FR-TRG-03:** System shall normalize Vietnamese medical colloquialisms, regional slang, teen-code, and unaccented text (`ko` $\rightarrow$ `không`, `bs` $\rightarrow$ `bác sĩ`, `dau da day` $\rightarrow$ `đau dạ dày`) prior to downstream semantic processing.
- **FR-TRG-04:** System shall implement the Vietnamese NegEx algorithm to split clinical queries into affirmative and negated clauses, quarantining negated findings (e.g., "không sốt") to prevent false specialty routing.
- **FR-TRG-05:** System shall generate a structured SBAR (Situation, Background, Assessment, Recommendation) clinical handoff report containing an assigned urgency rating (`ROUTINE`, `URGENT`, `EMERGENCY`) and recommended medical specialty code.

#### 3.2.3 Semantic Vector Search & Doctor Matching Engine (FR-VEC)
- **FR-VEC-01:** System shall transform affirmative symptom queries into 1536-dimensional continuous dense vector embeddings using `openai/text-embedding-3-small` with local FNV-1a feature hash fallback.
- **FR-VEC-02:** System shall index verified physician biographies in PostgreSQL 16 using Hierarchical Navigable Small World (HNSW) graph indexing with parameters $m=24$ and $ef\_construction=128$.
- **FR-VEC-03:** System shall tune database session parameters prior to vector execution via `SET LOCAL hnsw.ef_search = 120`, `SET LOCAL enable_seqscan = off`, and `SET LOCAL work_mem = '64MB'` to enforce index scan execution and guarantee $> 99.95\%$ recall.
- **FR-VEC-04:** System shall execute a Weighted Hybrid Re-Ranking Formula (WHRF) within a bounded min-heap combining Sigmoid Contrastive Sharpening ($S_{dense} = \frac{1}{1 + e^{-8.0(S - 0.65)}}$), sparse lexical BM25 overlap, specialty bonuses ($+0.12$), divergence penalties ($-0.10$), and review credibility dampers.
- **FR-VEC-05:** System shall restrict public doctor search visibility strictly to verified licensed practitioners (`is_verified = true`).
- **FR-VEC-06:** System shall integrate WHO ICD-10 and MOH Decision 7603/QĐ-BYT clinical ontologies, providing prefix autocomplete for medical diagnoses in $< 30\text{ms}$.
- **FR-VEC-07:** System shall integrate LOINC and MOH Decision 3280/QĐ-BYT laboratory ontologies, providing autocomplete for laboratory and diagnostic test requisitions in $< 30\text{ms}$.
- **FR-VEC-08:** System shall return the top $K=5$ optimal physician matches with normalized match compatibility percentages and real-time appointment slot availability.

#### 3.2.4 Multimodal Medical Document OCR & LOINC Summarizer (FR-DOC)
- **FR-DOC-01:** System shall ingest patient medical lab reports, blood panels, and imaging scans in PDF, PNG, and JPEG formats up to 10MB in size and 10 pages in length.
- **FR-DOC-02:** System shall compute client-side SHA-256 cryptographic checksums to detect and deduplicate identical document re-uploads.
- **FR-DOC-03:** System shall store all medical document files strictly in private Supabase S3 cloud buckets (`medical-documents`) under internal object keys (`storage_path`), completely prohibiting public web access URLs (Security Fix V20).
- **FR-DOC-04:** System shall issue time-limited HMAC signed URLs with a strict 15-minute expiration (900 seconds) for authorized file previews and downloads.
- **FR-DOC-05:** System shall extract numerical biomarkers, physiological units, demographic reference ranges, and abnormal indicator flags (`NORMAL`, `ELEVATED`, `LOW`) using Google Gemini 1.5 Flash Multimodal Vision AI.
- **FR-DOC-06:** System shall translate complex clinical laboratory findings into plain-language Vietnamese explanations accompanied by mandatory medical safety disclaimers.

#### 3.2.5 O2O Clinical Scheduling & Multi-Channel Payment (FR-BOK)
- **FR-BOK-01:** System shall manage in-clinic consultation bookings strictly within hospital operating hours: Monday through Saturday, 08:00–12:00 and 13:30–17:00 (Sundays closed).
- **FR-BOK-02:** System shall enforce serializable concurrency controls preventing double-booking of identical 30-minute doctor time slots.
- **FR-BOK-03:** System shall issue a sequential daily admission queue number (`STT 01`, `STT 02`...) for each doctor schedule starting at STT 01 at 08:00 AM.
- **FR-BOK-04:** System shall generate an Electronic Patient Admission Slip detailing clinic room, hospital floor/building, Google Maps navigation coordinates, and pre-encounter preparation instructions.
- **FR-BOK-05:** System shall support appointment calendar export via direct Google Calendar URL generation and RFC 5545 `.ics` file downloads.
- **FR-BOK-06:** System shall permit patient-initiated rescheduling up to 2 hours prior to scheduled appointment time without fee penalties.
- **FR-BOK-07:** System shall execute automated financial refunds via `AppointmentRefundService` according to hospital cancellation timeline policies (>24h: 100%, 2-24h: 80%, <2h: 0%, Doctor Cancel: 100%).

#### 3.2.6 Doctor Clinical Workstation & Longitudinal EMR (FR-CLIN)
- **FR-CLIN-01:** System shall provide attending physicians with an interactive daily queue sorted sequentially by patient admission STT numbers.
- **FR-CLIN-02:** System shall provide a split-screen pre-encounter clinical inspection workspace displaying the original raw lab document alongside the AI SBAR clinical summary.
- **FR-CLIN-03:** System shall enforce Broken Object Level Authorization defenses via `PatientAccessGuard`, requiring an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment) before permitting doctor access to patient records, with mandatory `VIEW_PATIENT_RECORD` audit logging.
- **FR-CLIN-04:** System shall record objective physical examination notes and vital signs (Blood Pressure, Heart Rate, Respiratory Rate, Body Temperature, SpO2, Weight, Height, and auto-computed BMI).
- **FR-CLIN-05:** System shall require at least one standardized WHO ICD-10 diagnosis code prior to encounter finalization.
- **FR-CLIN-06:** System shall generate electronic outpatient prescriptions with dosage regimens, administration routes, and treatment durations.
- **FR-CLIN-07:** System shall lock finalized clinical encounters as legally immutable medical records, recording physician digital sign-off and timestamps.
- **FR-CLIN-08:** System shall export official formatted consultation summaries and prescriptions as print-ready PDF documents.

#### 3.2.7 Admin Governance & AI FinOps Analytics (FR-ADM)
- **FR-ADM-01:** System shall provide an executive telemetry dashboard tracking active platform users, consultation volumes, and infrastructure service health.
- **FR-ADM-02:** System shall audit and vet doctor medical practice certificates (CCHN) against the National Healthcare Practitioner Registry before granting public visibility.
- **FR-ADM-03:** System shall monitor AI token consumption (prompt and completion tokens) across Gemini and OpenAI APIs, projecting costs in USD and VNĐ (`AI_COST_VND_PER_USD = 25450`).
- **FR-ADM-04:** System shall enforce role-based access control permitting only `ADMIN` users to toggle system-wide AI provider and failover modes (`POST /api/v1/system/ai-mode/toggle` - Security Fix BE-1).
- **FR-ADM-05:** System shall maintain an append-only, immutable audit trail in `audit_logs` capturing authentication events, doctor patient record inspections, and administrative overrides.
- **FR-ADM-06:** System shall track Flyway database migration history (V1 through V22) and pgvector HNSW index health.
"""

if __name__ == "__main__":
    print("Part 4 module loaded successfully. Character count:", len(get_content()))
