"""
Part 1 of SDD Generator: Cover, Record of Changes, Section 1 System Design (Architecture & Package Diagrams).
"""

def get_part1_content():
    return '''# CAPSTONE PROJECT REPORT
# Report 4 – Software Design Document (SDD)

---

### **HỆ THỐNG TRỢ LÝ Y TẾ ẢO HỖ TRỢ ĐẶT LỊCH & PHÂN LUỒNG KHÁM BỆNH THÔNG MINH (MEDIASSIST-AI)**

* **Tên dự án:** MediAssist-AI: Intelligent Healthcare Assistant & Clinical Telehealth Platform
* **Mã dự án (Capstone Project ID):** FPTU-KLTN-2026-MEDIASSIST
* **Khóa luận:** Khóa luận Tốt nghiệp Đại học FPT – Chuyên ngành Kỹ thuật Phần mềm (Software Engineering)
* **Thời gian thực hiện:** Tháng 05/2026 – Tháng 10/2026
* **Địa điểm:** Quy Nhon / Da Nang – October 2026

---

## Table of Contents

* [I. Record of Changes](#i-record-of-changes)
* [II. Software Design Document](#ii-software-design-document)
  * [1. System Design](#1-system-design)
    * [1.1 System Architecture](#11-system-architecture)
    * [1.2 Package Diagram](#12-package-diagram)
      * [1.2.1 Front-end Design](#121-front-end-design)
      * [1.2.2 Back-end Design](#122-back-end-design)
  * [2. Database Design](#2-database-design)
    * [2.1 Users Table](#21-users-table)
    * [2.2 Specialties Table](#22-specialties-table)
    * [2.3 Doctor Profiles Table](#23-doctor_profiles-table)
    * [2.4 Doctor Specialties Table](#24-doctor_specialties-table)
    * [2.5 Doctor Schedule Slots Table](#25-doctor_schedule_slots-table)
    * [2.6 Patient Profiles Table](#26-patient_profiles-table)
    * [2.7 Appointments Table](#27-appointments-table)
    * [2.8 Triage Sessions Table](#28-triage_sessions-table)
    * [2.9 Medical Documents Table](#29-medical_documents-table)
    * [2.10 Document Analyses Table](#210-document_analyses-table)
    * [2.11 Payment Transactions Table](#211-payment_transactions-table)
    * [2.12 Password Reset Tokens Table](#212-password_reset_tokens-table)
    * [2.13 Email Verification Tokens Table](#213-email_verification_tokens-table)
    * [2.14 Notifications Table](#214-notifications-table)
    * [2.15 Doctor Reviews Table](#215-doctor_reviews-table)
    * [2.16 Audit Logs Table](#216-audit_logs-table)
    * [2.17 AI Token Usage Table](#217-ai_token_usage-table)
  * [3. Detailed Design](#3-detailed-design)
    * [3.1 Authentication with Stateless Dual-Transport JWT (Login)](#31-authentication-with-stateless-dual-transport-jwt-login)
    * [3.2 Patient Registration with Email Verification Gate](#32-patient-registration-with-email-verification-gate)
    * [3.3 Google OAuth2 Single Sign-On (SSO) Flow](#33-google-oauth2-single-sign-on-sso-flow)
    * [3.4 Forgot Password with SHA-256 Token Hash](#34-forgot-password-with-sha-256-token-hash)
    * [3.5 Reset Password with Cryptographic Token Verification](#35-reset-password-with-cryptographic-token-verification)
    * [3.6 Token Refresh & Sliding Session Rotation](#36-token-refresh--sliding-session-rotation)
    * [3.7 Secure Logout & Refresh Cookie Invalidation](#37-secure-logout--refresh-cookie-invalidation)
    * [3.8 Update User Profile & Notification Preferences](#38-update-user-profile--notification-preferences)
    * [3.9 AI Symptom Triage Analysis & 5-Stage Clinical Defense](#39-ai-symptom-triage-analysis--5-stage-clinical-defense)
    * [3.10 Doctor Semantic Vector Search & Hybrid Re-ranking (pgvector + WHRF)](#310-doctor-semantic-vector-search--hybrid-re-ranking-pgvector--whrf)
    * [3.11 Telehealth Appointment Booking & Slot Concurrency Locking](#311-telehealth-appointment-booking--slot-concurrency-locking)
    * [3.12 Appointment Rescheduling & Operating Hours Validation](#312-appointment-rescheduling--operating-hours-validation)
    * [3.13 Appointment Cancellation & Tiered Automated Refund Calculation](#313-appointment-cancellation--tiered-automated-refund-calculation)
    * [3.14 Patient Clinic Check-In & Queue Management](#314-patient-clinic-check-in--queue-management)
    * [3.15 Doctor Clinical Encounter & EMR Documentation](#315-doctor-clinical-encounter--emr-documentation)
    * [3.16 Doctor Workstation Queue Supervision](#316-doctor-workstation-queue-supervision)
    * [3.17 Patient Review & Doctor Rating Submission](#317-patient-review--doctor-rating-submission)
    * [3.18 Medical Document Upload & Private Supabase S3 Storage](#318-medical-document-upload--private-supabase-s3-storage)
    * [3.19 Document AI OCR & Clinical Summarization](#319-document-ai-ocr--clinical-summarization)
    * [3.20 Broken Object Level Authorization (BOLA/IDOR) Defense](#320-broken-object-level-authorization-boidor-defense)
    * [3.21 VNPay Payment Gateway Initialization & Cryptographic Checksum](#321-vnpay-payment-gateway-initialization--cryptographic-checksum)
    * [3.22 VNPay IPN Webhook Processing & Idempotency Locking](#322-vnpay-ipn-webhook-processing--idempotency-locking)
    * [3.23 Automated Refund Processing & Payment Reconciliation](#323-automated-refund-processing--payment-reconciliation)
    * [3.24 Doctor License Verification & Credential Approval (Admin)](#324-doctor-license-verification--credential-approval-admin)
    * [3.25 Specialty Taxonomy & Clinical Catalog Management (Admin)](#325-specialty-taxonomy--clinical-catalog-management-admin)
    * [3.26 User Account State Management & Security Lockout (Admin)](#326-user-account-state-management--security-lockout-admin)
    * [3.27 Clinical Audit Trail & Access Supervision (Admin)](#327-clinical-audit-trail--access-supervision-admin)
    * [3.28 Transactional Email Dispatch & Retry Engine (Async Outbox)](#328-transactional-email-dispatch--retry-engine-async-outbox)

---

## I. Record of Changes

| Date | A / M / D (*) | In Charge | Change Description |
| :--- | :---: | :--- | :--- |
| **14/09/2026** | A | VinhHT | Khởi tạo cấu trúc System Architecture, Package Diagram và Database Design ban đầu (Flyway V1–V3). |
| **18/09/2026** | A | VinhHT | Đặc tả module thanh toán VNPay IPN (Flyway V13) và liên kết tài liệu y tế vào lịch hẹn (V14). |
| **06/10/2026** | A | VinhHT | Bổ sung module Phân luồng triệu chứng (V15), Quên mật khẩu & Thông báo (V16), Đánh giá bác sĩ (V17). |
| **10/10/2026** | M | VinhHT | Tối ưu hóa Vector Search với pgvector HNSW Index (`m=24`, `ef_construction=128`) và Hybrid GIN Index (V19). |
| **17/10/2026** | M | VinhHT | Tái cấu trúc cơ chế bảo mật Private Cloud Storage S3 với HMAC Signed URLs 15 phút (V20). |
| **17/10/2026** | M | VinhHT | Nâng cấp bảo mật mã hóa SHA-256 cho Password Reset Token (V21) và cổng kích hoạt Email Verification (V22). |
| **18/10/2026** | M | VinhHT | Hoàn thiện tài liệu SDD Report 4 theo chuẩn FPT University Capstone, tích hợp 84 biểu đồ Class/Sequence diagrams ánh xạ 1-1 với codebase. |

*(*) Ghi chú: **A** - Added (Thêm mới), **M** - Modified (Chỉnh sửa/Cập nhật), **D** - Deleted (Xóa).*

---

## II. Software Design Document

### 1. System Design

#### 1.1 System Architecture

Hệ thống **MediAssist-AI** được kiến trúc theo mô hình **Tiered Micro-Modular Monolith** hiện đại, kết hợp điện toán biên (Edge Gateway Nginx), tầng ứng dụng lõi tối ưu hóa đa luồng ảo (**Java 21 LTS Project Loom Virtual Threads**), cơ sở dữ liệu quan hệ kết hợp lưu trữ vector đa chiều (**PostgreSQL 16 + pgvector**), bộ nhớ đệm lai 2 lớp (**L1 Caffeine + L2 Redis**) và các dịch vụ AI/Điện toán đám mây chuyên dụng.

```mermaid
graph TB
    subgraph Client_Tier["Client Presentation Tier (Browser / Mobile Web)"]
        SPA["React 18 SPA (TypeScript + Vite + Tailwind CSS)"]
        Landing["Landing Page (Three.js 3D Visualizer)"]
        DoctorDesk["Doctor Workstation (Live ICD-10 & LOINC Auto-complete)"]
        PatientPortal["Patient Portal (Triage, Search, Telehealth EMR)"]
        AdminDesk["Admin Management Console (Supervision & Auditing)"]
    end

    subgraph Edge_Gateway["Edge Gateway & Security Ingress Tier"]
        Nginx["Nginx Reverse Proxy (SSL/TLS 1.3, HTTP/2, Gzip, Rate Limiting)"]
    end

    subgraph App_Tier["Application Core Tier (Spring Boot 3.4 - Project Loom)"]
        WebMVC["Spring WebMVC REST Controllers"]
        SecFilter["Spring Security Filter Chain (Stateless JWT + HttpOnly Cookie)"]
        AccessGuard["PatientAccessGuard (BOLA / IDOR Care-Relationship Verification)"]

        subgraph Business_Services["Clinical & Business Service Engines"]
            AuthSvc["AuthService & EmailVerificationService"]
            TriageSvc["SymptomTriageService (5-Stage Clinical Pipeline + NegEx)"]
            DocSearchSvc["DoctorSemanticSearchService (WHRF SOTA Engine)"]
            ApptSvc["AppointmentService & AppointmentRefundService"]
            DocEncounterSvc["DoctorEncounterService (EMR, ICD-10, LOINC)"]
            DocOcrSvc["DocumentAnalysisService (OCR & Clinical Summarizer)"]
            PaymentSvc["PaymentService & VNPayGatewayAdapter"]
            EmailEngine["EmailService (@Async mailExecutor + Email Outbox)"]
            AuditSvc["AuditLogService & SystemConfigService"]
        end
    end

    subgraph Cache_Tier["Hybrid 2-Layer Cache Tier"]
        L1["L1: Caffeine In-Memory Cache (Specialties, ICD-10, LOINC)"]
        L2["L2: Redis Distributed Cache (User Sessions, Slot Semaphores)"]
    end

    subgraph Persistence_Tier["Persistence & Vector Retrieval Tier"]
        PG[("PostgreSQL 16 LTS (Relational Tables 3NF)")]
        PGV["pgvector Extension (HNSW Index: m=24, ef_construction=128)"]
        Flyway["Flyway Migration Engine (V1 - V22 Versioned)"]
    end

    subgraph Storage_Tier["Object Storage & Cloud Infrastructure Tier"]
        S3["Supabase Private S3 Storage (Encrypted at Rest, 15-Min HMAC Signed URLs)"]
    end

    subgraph External_Cloud["External AI & Banking Services"]
        OpenAI["OpenAI API (text-embedding-3-small, 1536-dim)"]
        Gemini["Google Gemini 1.5 Flash (Clinical OCR & Summarization)"]
        VNPay["VNPay Payment Gateway (HMAC-SHA512 Checksum)"]
        SMTP["SMTP Mail Server (Brevo / Transactional Delivery)"]
    end

    SPA -->|HTTPS / WSS| Nginx
    Nginx -->|Proxy Pass 8080| WebMVC
    WebMVC --> SecFilter
    SecFilter --> AccessGuard
    AccessGuard --> Business_Services

    Business_Services --> L1
    Business_Services --> L2
    Business_Services --> PG
    PG --- PGV
    Business_Services --> S3

    DocSearchSvc -->|Embeddings| OpenAI
    DocOcrSvc -->|Vision / LLM| Gemini
    PaymentSvc -->|IPN / Redirect| VNPay
    EmailEngine -->|TLS SMTP| SMTP
```

##### Table 1.1. System Architecture Component Descriptions

| No | Package / Component | Technology Stack | Detailed Responsibility & Architectural Role |
| :---: | :--- | :--- | :--- |
| **1** | **React 18 SPA Client** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons | Ứng dụng web đĩa đơn (Single-Page Application) phục vụ toàn bộ 4 vai trò: Guest, Patient, Doctor, Admin. Khai thác kiến trúc Code-Splitting động qua `React.lazy()` và `Suspense`, tối ưu hóa FCP < 0.8s. |
| **2** | **Nginx Edge Ingress** | Nginx 1.25+ Alpine, TLS 1.3, HTTP/2 | Cổng tiếp nhận lưu lượng mạng biên, chịu trách nhiệm kết thúc mã hóa SSL/TLS, nén tệp tin tĩnh (Gzip), điều phối tải và thực thi chính sách giới hạn tốc độ truy cập (Rate Limiting 100 req/min per IP) chống DoS. |
| **3** | **Spring Boot 3.4 Core** | Java 21 LTS, Spring Boot 3.4.x, Project Loom | Tầng máy chủ xử lý tác vụ doanh nghiệp. Tích hợp công nghệ Virtual Threads (`spring.threads.virtual.enabled=true`), cho phép xử lý hàng ngàn I/O song song đồng thời với lượng tài nguyên bộ nhớ cực thấp. |
| **4** | **Dual-Transport Security** | Spring Security 6.x, JJWT 0.12.x | Cơ chế xác thực phi trạng thái (Stateless). Phát hành đồng thời JWT Access Token qua HTTP Header `Authorization: Bearer` và Refresh Token qua `HttpOnly, Secure, SameSite=Lax` Cookie, triệt tiêu nguy cơ XSS đánh cắp phiên. |
| **5** | **PatientAccessGuard** | Aspect-Oriented Security Component | Tầng kiểm soát phân quyền đối tượng BOLA/IDOR chuyên biệt cho y tế. Ngăn chặn bác sĩ hoặc người dùng truy cập trái phép bệnh án, xét nghiệm hoặc lịch sử phân luồng nếu không có quan hệ điều trị hợp lệ (`CARE_RELATIONSHIP`). |
| **6** | **WHRF SOTA Search Engine** | Vector Retrieval + Priority Queue | Động cơ tìm kiếm bác sĩ ngữ nghĩa đa tiêu chí: Kết hợp khoảng cách Cosine trên đồ thị HNSW với hàm làm sắc nét Sigmoid, điểm thưởng chuyên khoa, độ tin cậy đánh giá logarithm và phụ phí khám bệnh. |
| **7** | **5-Stage Triage Pipeline** | Regex + NegEx NLP Engine | Động cơ phân luồng triệu chứng 5 tầng: Phát hiện cấp cứu 115 (Stage 1), chuẩn hóa teen-code (Stage 2), bóc tách mệnh đề phủ định NegEx (Stage 3), chặn câu hỏi hành chính OOD (Stage 4), phân rã triệu chứng phức (Stage 5). |
| **8** | **Clinical EMR Service** | JSONB + WHO ICD-10 & LOINC | Dịch vụ hồ sơ bệnh án điện tử hỗ trợ gợi ý chẩn đoán tự động theo danh mục ICD-10 quốc tế (QĐ 7603/BYT) và chỉ số xét nghiệm LOINC (QĐ 3280/BYT), lưu trữ cấu trúc JSON trên bảng `appointments`. |
| **9** | **Document OCR & Vision** | Google Gemini 1.5 Flash + Apache Tika | Trích xuất ký tự quang học (OCR) từ ảnh chụp đơn thuốc, phiếu xét nghiệm, giải nghĩa các chỉ số bất thường và tự động loại bỏ thông tin định danh cá nhân (PII De-identification). |
| **10** | **Hybrid Caching Tier** | Caffeine Cache (L1) + Redis (L2) | Kiến trúc Cache 2 tầng: Tầng L1 cục bộ trong JVM lưu trữ danh mục tra cứu tĩnh (ICD-10, chuyên khoa), tầng L2 Redis phân tán lưu trữ token đen và phân bổ slot lịch khám thời gian thực. |
| **11** | **PostgreSQL 16 + pgvector** | PostgreSQL 16.x, pgvector 0.7.x | Hệ quản trị cơ sở dữ liệu quan hệ chuẩn 3NF. Tích hợp chỉ mục HNSW vector 1536 chiều, kết hợp Full-Text Search tiếng Việt (`pg_trgm`) và hỗ trợ tính toán giao dịch ACID. |
| **12** | **Private Supabase S3** | AWS S3 SDK v2, Supabase Storage | Kho lưu trữ tài liệu y tế bảo mật cấp ngân hàng. Tệp tin được mã hóa tĩnh (AES-256), khóa truy cập công khai và chỉ cho phép tải về thông qua URL ký số HMAC-SHA256 có hạn sử dụng 15 phút. |
| **13** | **VNPay Gateway Adapter** | VNPay Sandbox/Production API | Tích hợp cổng thanh toán trực tuyến quốc gia qua giao thức HMAC-SHA512. Tự động xử lý thông báo biến động số dư tức thời (IPN Webhook) với khóa chống trùng lặp giao dịch (Idempotency Lock). |
| **14** | **Async Email Engine** | Spring Mail, Project Loom TaskExecutor | Động cơ phát tán thư điện tử giao dịch (Kích hoạt tài khoản, mã OTP, xác nhận lịch khám, hoàn tiền) chạy nền không chặn, tự động ghi nhận vào hộp thư chờ (Email Outbox) nếu mạng gặp sự cố. |
| **15** | **Audit Trail Logging** | Spring AOP, Event Listeners | Hệ thống ghi vết kiểm toán tuân thủ Nghị định 13/2023/NĐ-CP và HIPAA, tự động lưu lại định danh người thực hiện, hành động, tài nguyên tác động, địa chỉ IP và dấu thời gian cho mọi thao tác y tế. |

---

#### 1.2 Package Diagram

##### 1.2.1 Front-end Design

Kiến trúc mã nguồn Front-end được tổ chức theo tiêu chuẩn module hóa phân lớp rõ ràng (Feature-driven & Layered Modular Architecture) trong thư mục `frontend/src/`:

```mermaid
graph TD
    subgraph UI_Presentation["Presentation & Routing"]
        App["App.tsx (Root Contexts, ToastProvider, ErrorBoundary)"]
        Routes["Routes Configuration (React Router DOM v6)"]
        Layouts["Layouts/ (AdminLayout, DoctorLayout, PatientLayout)"]
        Pages["Pages/ (18 Màn hình SCR-01 đến SCR-18)"]
    end

    subgraph Feature_Modules["Domain Feature Modules"]
        AuthFeature["Auth (Login, Register, ResetPwd, VerifyEmail)"]
        TriageFeature["Triage (SymptomInput, ChatView, SeverityBadge)"]
        DoctorSearchFeature["DoctorSearch (FilterSidebar, VectorCard, MapView)"]
        EncounterFeature["DoctorWorkstation (ICD10Select, LOINCModal, EMRForm)"]
        DocManagerFeature["Documents (PrivateDropzone, OCRSummary, Viewer)"]
        AdminSupervision["Admin (DoctorApproval, Supervision, AuditLogs)"]
    end

    subgraph Cross_Cutting["Cross-Cutting & Infrastructure"]
        Components["Components/ (UI Primitives, Modals, Badges, Tables)"]
        Hooks["Hooks/ (useAuth, useTriage, useDebounce, useAutoScroll)"]
        Services["Services/ (apiClient, authApi, apptApi, triageApi, doctorApi)"]
        Types["Types/ (auth.ts, appointment.ts, triage.ts, doctor.ts)"]
        Utils["Utils/ (formatters.ts, dateUtils.ts, tokenStorage.ts)"]
    end

    App --> Routes
    Routes --> Layouts
    Layouts --> Pages
    Pages --> Feature_Modules
    Feature_Modules --> Components
    Feature_Modules --> Hooks
    Hooks --> Services
    Services --> Types
    Services --> Utils
```

##### Table 1.2.1. Front-end Package Descriptions

| No | Package / Directory | Detailed Architectural Responsibility |
| :---: | :--- | :--- |
| **1** | `src/App.tsx` | Điểm khởi nhập chính của Single-Page Application; cấu hình `ToastProvider`, `ErrorBoundary`, và cơ chế tải lười `React.lazy()` chia nhỏ bundle. |
| **2** | `src/components/common/` | Các thành phần giao diện dùng chung toàn hệ thống: `ProtectedRoute` (kiểm tra JWT & Role), `ErrorBoundary` (bắt lỗi sập UI), `Header`, `Footer`. |
| **3** | `src/components/ui/` | Thư viện giao diện nguyên tử (Atomic UI components): Nút bấm (Button), Hộp nhập liệu (Input), Hộp thoại (Modal), Huy hiệu trạng thái (Badge), Thanh cuộn (Spinner). |
| **4** | `src/layouts/` | Khung điều hướng cấu trúc giao diện: `PatientLayout` (Thanh điều hướng người bệnh), `DoctorLayout` (Bàn làm việc bác sĩ), `AdminLayout` (Bảng điều khiển quản trị). |
| **5** | `src/pages/` | Tập hợp 18 màn hình chức năng cấp cao (SCR-01 đến SCR-18) đại diện cho các URL định tuyến trong hệ thống. |
| **6** | `src/pages/auth/` | Các trang xác thực: Đăng nhập mật khẩu, Đăng ký bệnh nhân, Quên mật khẩu, Đặt lại mật khẩu, Xác minh email, Xử lý phản hồi Google OAuth2. |
| **7** | `src/pages/patient/` | Màn hình dành cho bệnh nhân: Bảng điều khiển, Đặt lịch khám, Tìm kiếm bác sĩ thông minh, Phân luồng triệu chứng, Trợ lý giải nghĩa hồ sơ xét nghiệm. |
| **8** | `src/pages/doctor/` | Màn hình dành cho bác sĩ: Bàn làm việc bác sĩ (Doctor Workstation), Quản lý hồ sơ bệnh nhân, Hồ sơ năng lực & Lịch khám. |
| **9** | `src/pages/admin/` | Màn hình dành cho quản trị viên: Phê duyệt bác sĩ, Giám sát lịch khám, Giám sát phân luồng AI, Quản lý tài khoản, Nhật ký kiểm toán an ninh. |
| **10** | `src/services/` | Lớp giao tiếp mạng Axios: Cấu hình `apiClient` tự động đính kèm Bearer Token, làm mới token trong suốt khi hết hạn và chuẩn hóa định dạng lỗi từ Backend. |
| **11** | `src/hooks/` | Các Custom React Hooks quản lý trạng thái tái sử dụng: `useAuth`, `useDebounce` (chống quá tải tìm kiếm), `useDoctorSearch`, `useToast`. |
| **12** | `src/types/` | Định nghĩa toàn bộ kiểu dữ liệu TypeScript (Interfaces/Types), đồng bộ 1-1 với các DTO và Entity của Backend. |
| **13** | `src/utils/` | Các hàm tiện ích hỗ trợ: Định dạng tiền tệ VND, định dạng ngày giờ khám bệnh, giải mã payload JWT, xử lý chuỗi ký tự y tế. |

---

##### 1.2.2 Back-end Design

Kiến trúc mã nguồn Back-end tuân thủ nghiêm ngặt mô hình phân tầng **Layered Clean Architecture** trong thư mục `backend/src/main/java/com/mediassist/`:

```mermaid
graph TD
    subgraph Presentation_Layer["Presentation Layer (Controller & Ingress)"]
        Controllers["REST Controllers (AuthController, AppointmentController, TriageController...)"]
        SecurityConfig["SecurityFilterChain & JwtAuthenticationFilter"]
        GlobalExceptionHandler["GlobalExceptionHandler (@RestControllerAdvice)"]
    end

    subgraph Application_Layer["Application Service Layer (Business Workflows)"]
        AuthModule["AuthService, EmailVerificationService, PasswordResetService"]
        TriageModule["SymptomTriageService (NegEx, SlangNormalizer, EmergencyFilter)"]
        DoctorSearchModule["DoctorSemanticSearchService (WHRF SOTA Engine)"]
        ApptModule["AppointmentService, AppointmentRefundService"]
        ClinicalEncounterModule["DoctorEncounterService, ClinicalOntologyService"]
        DocumentModule["MedicalDocumentService, DocumentAnalysisService"]
        PaymentModule["PaymentService, VNPayGatewayAdapter"]
        SecurityModule["PatientAccessGuard (BOLA / IDOR Verification)"]
    end

    subgraph Domain_Layer["Domain Model & Data Transfer Layer"]
        Entities["JPA Entities (User, Appointment, DoctorProfile, Specialty...)"]
        DTOs["Request / Response DTOs (@Valid, @NotNull, @Size constraints)"]
        Enums["Business Enums (Role, AppointmentStatus, PaymentStatus, TriageUrgency)"]
    end

    subgraph Infrastructure_Layer["Infrastructure & Persistence Layer"]
        Repositories["Spring Data JPA Repositories (with Native Queries & pgvector)"]
        CacheServices["CaffeineCacheManager, RedisTemplate"]
        CloudStorage["SupabaseStorageClient (S3 Private Bucket Client)"]
        AiClients["OpenAIClient, GeminiVisionClient"]
        MailGateway["JavaMailSender, MailOutboxScheduler"]
        AuditEngine["AuditLogRepository, AsyncAuditLogger"]
    end

    Presentation_Layer --> Application_Layer
    Application_Layer --> Domain_Layer
    Application_Layer --> Infrastructure_Layer
    Infrastructure_Layer --> Domain_Layer
```

##### Table 1.2.2. Back-end Package Descriptions

| No | Package Name | Architectural Responsibilities & Technology Components |
| :---: | :--- | :--- |
| **1** | `com.mediassist.controller` | Tầng tiếp nhận HTTP Request. Chứa các Spring REST Controllers: Tiếp nhận payload JSON, kích hoạt xác thực `@Valid`, điều phối tầng Service và trả về `ResponseEntity<?>` chuẩn hóa. |
| **2** | `com.mediassist.config` | Cấu hình hạ tầng Spring Boot: `SecurityConfig` (Bộ lọc JWT & CSRF), `CorsConfig`, `VirtualThreadConfig` (Loom), `JacksonConfig`, `OpenAPIConfig` (Swagger UI). |
| **3** | `com.mediassist.security` | Thành phần bảo mật lõi: `JwtAuthenticationFilter`, `JwtTokenProvider`, `UserPrincipal`, `OAuth2AuthenticationSuccessHandler`, và bộ lọc cookie `SameSite`. |
| **4** | `com.mediassist.service` | Tầng nghiệp vụ cốt lõi: Triển khai các Use Case kinh doanh, quản lý giao dịch `@Transactional`, điều phối logic phân luồng, thanh toán, tìm kiếm và bảo mật dữ liệu y tế. |
| **5** | `com.mediassist.service.ai` | Động cơ AI chuyên sâu: Xử lý vector embeddings (`OpenAIClient`), phân tích ảnh hồ sơ bệnh án qua thị giác máy tính (`GeminiClient`), thuật toán làm mịn đồ thị Sigmoid contrastive sharpening. |
| **6** | `com.mediassist.service.guard` | Rào chắn bảo mật phân quyền: `PatientAccessGuard` chịu trách nhiệm kiểm tra quan hệ chăm sóc y tế, chặn hoàn toàn các cuộc tấn công leo quyền Broken Object Level Authorization (BOLA/IDOR). |
| **7** | `com.mediassist.repository` | Tầng tương tác cơ sở dữ liệu: Spring Data JPA Repositories kết hợp truy vấn native SQL chuyên dụng trên chỉ mục HNSW của `pgvector` và `pg_trgm`. |
| **8** | `com.mediassist.model.entity` | Mô hình thực thể cơ sở dữ liệu: 17 thực thể JPA ánh xạ 1-1 với 17 bảng trong PostgreSQL, tích hợp khóa ngoại, ràng buộc kiểm tra và các cột dữ liệu y tế JSONB. |
| **9** | `com.mediassist.model.dto` | Đối tượng vận chuyển dữ liệu (Data Transfer Objects): Tách biệt mô hình hiển thị khỏi thực thể CSDL, tích hợp ràng buộc Jakarta Validation (`@NotBlank`, `@Email`, `@Size(max=20000)`). |
| **10** | `com.mediassist.model.enums` | Hệ thống kiểu liệt kê nghiệp vụ: `Role` (ADMIN, DOCTOR, PATIENT), `AppointmentStatus`, `PaymentStatus`, `TriageUrgency`, `SpecialtyCode`, v.v. |
| **11** | `com.mediassist.exception` | Xử lý ngoại lệ tập trung: `GlobalExceptionHandler` (`@RestControllerAdvice`), `AppException`, và bảng mã lỗi chuẩn y tế `ErrorCode` (`SLOT_CONFLICT`, `FORBIDDEN_CARE_RELATIONSHIP`). |
| **12** | `com.mediassist.storage` | Tầng giao tiếp lưu trữ đám mây: Quản lý kết nối S3 với Supabase, thực thi ký số URL HMAC-SHA256 (hạn 15 phút), quản lý thư mục người bệnh bảo mật. |
| **13** | `com.mediassist.mail` | Dịch vụ gửi thư điện tử giao dịch: Khai thác luồng ảo Loom (`@Async("mailExecutor")`), tạo nội dung HTML và cơ chế lưu trữ thư chờ phát lại khi mạng gặp lỗi. |
| **14** | `com.mediassist.audit` | Hệ thống kiểm toán và an ninh: Ghi lại toàn bộ hành vi đọc/sửa dữ liệu hồ sơ bệnh án, các sự kiện phân luồng triệu chứng và giao dịch tài chính. |
| **15** | `com.mediassist.ontology` | Dịch vụ thuật ngữ y tế chuẩn hóa: `ClinicalOntologyService` nạp và tìm kiếm cực nhanh trên bộ mã chẩn đoán quốc tế WHO ICD-10 và danh mục xét nghiệm LOINC của Bộ Y Tế Việt Nam. |
'''
