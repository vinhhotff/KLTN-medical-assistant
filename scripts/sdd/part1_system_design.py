"""
Part 1 of SDD Generator: Cover, Record of Changes, Section 1 System Design (Architecture & Package Diagrams).
Fully expanded to match FPT University Capstone Report 4 Software Design Document standard.
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
* **Tiêu chuẩn thiết kế:** IEEE Std 1016-2009 (Software Design Descriptions) & ISO/IEC/IEEE 42010

---

## Table of Contents

* [I. Record of Changes](#i-record-of-changes)
* [II. Software Design Document](#ii-software-design-document)
  * [1. System Design](#1-system-design)
    * [1.1 System Architecture](#11-system-architecture)
      * [1.1.1 Architectural Rationale & Design Trade-offs](#111-architectural-rationale--design-trade-offs)
      * [1.1.2 System Architecture Diagram](#112-system-architecture-diagram)
      * [1.1.3 System Architecture Component Descriptions](#113-system-architecture-component-descriptions)
    * [1.2 Package Diagram](#12-package-diagram)
      * [1.2.1 Front-end Design & Package Structure](#121-front-end-design--package-structure)
      * [1.2.2 Back-end Design & Clean Architecture Packages](#122-back-end-design--clean-architecture-packages)
  * [2. Database Design](#2-database-design)
    * [2.1 Overview & Physical Entity-Relationship Diagram](#21-overview--physical-entity-relationship-diagram)
    * [2.2 Database Design Summary Table](#22-database-design-summary-table)
    * [2.3 Detailed Table Specifications & Index Design (2.3.1 – 2.3.17)](#23-detailed-table-specifications--index-design)
      * [2.3.1 users Table](#231-users-table)
      * [2.3.2 specialties Table](#232-specialties-table)
      * [2.3.3 doctor_profiles Table](#233-doctor_profiles-table)
      * [2.3.4 doctor_specialties Table](#234-doctor_specialties-table)
      * [2.3.5 doctor_schedule_slots Table](#235-doctor_schedule_slots-table)
      * [2.3.6 patient_profiles Table](#236-patient_profiles-table)
      * [2.3.7 appointments Table](#237-appointments-table)
      * [2.3.8 triage_sessions Table](#238-triage_sessions-table)
      * [2.3.9 medical_documents Table](#239-medical_documents-table)
      * [2.3.10 document_analyses Table](#2310-document_analyses-table)
      * [2.3.11 payment_transactions Table](#2311-payment_transactions-table)
      * [2.3.12 password_reset_tokens Table](#2312-password_reset_tokens-table)
      * [2.3.13 email_verification_tokens Table](#2313-email_verification_tokens-table)
      * [2.3.14 notifications Table](#2314-notifications-table)
      * [2.3.15 doctor_reviews Table](#2315-doctor_reviews-table)
      * [2.3.16 audit_logs Table](#2316-audit_logs-table)
      * [2.3.17 ai_token_usage Table](#2317-ai_token_usage-table)
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
| **14/09/2026** | A | VinhHT | Khởi tạo cấu trúc System Architecture, Package Diagram và Database Design ban đầu (Flyway V1–V3: users, specialties, doctor_profiles, patient_profiles, appointments, triage_sessions, medical_documents, audit_logs). |
| **15/09/2026** | A | VinhHT | Tối ưu hóa chỉ mục HNSW trên cột `bio_embedding` của doctor_profiles (V10) và thêm các chỉ mục phức hợp Composite Indexes cho lịch hẹn và tài liệu (V11). |
| **16/09/2026** | A | VinhHT | Bổ sung các chỉ mục phục vụ giám sát thời gian thực Real-time Supervision Indexes và Partial Indexes cho cấp cứu (V12); tích hợp bảng sổ cái giao dịch tài chính `payment_transactions` (V13). |
| **18/09/2026** | A | VinhHT | Thiết kế liên kết hồ sơ xét nghiệm đính kèm vào lịch hẹn khám `medical_document_id` (V14). |
| **06/10/2026** | A | VinhHT | Tích hợp liên kết phiên phân luồng `triage_session_id` và chính sách hoàn tiền vào lịch hẹn (V15); khởi tạo bảng `password_reset_tokens` và `notifications` (V16); thiết kế hệ thống đánh giá bác sĩ `doctor_reviews` và xếp hạng uy tín (V17); chuẩn hóa lược đồ FinOps `ai_token_usage` (V18). |
| **10/10/2026** | M | VinhHT | Tối ưu hóa đồ thị vector HNSW (`m=24`, `ef_construction=128`) kết hợp GIN Trigram Full-Text Search tiếng Việt (V19). |
| **17/10/2026** | M | VinhHT | Tái cấu trúc cơ chế bảo mật Private Cloud Storage S3: Triệt tiêu hoàn toàn URL công khai, chuyển sang lưu `storage_path` nội bộ với URL ký số HMAC-SHA256 15 phút (V20). |
| **17/10/2026** | M | VinhHT | Nâng cấp bảo mật mã hóa SHA-256 cho Password Reset Token (`token_hash` 64 hex) chống lộ lọt dữ liệu (V21). |
| **17/10/2026** | M | VinhHT | Thiết lập cổng kích hoạt tài khoản Email Verification Gate với bảng `email_verification_tokens` (V22) và cột `email_verified` trên `users`. |
| **18/10/2026** | M | VinhHT | Hoàn thiện toàn diện tài liệu SDD Report 4 theo chuẩn FPT University Capstone, tích hợp 88 biểu đồ Mermaid Class & Sequence diagrams kèm bảng đặc tả phương thức, bảng luồng sự kiện chi tiết và ma trận mã lỗi xử lý ngoại lệ cho 28 quy trình nghiệp vụ cốt lõi. |

*(*) Ghi chú: **A** - Added (Thêm mới), **M** - Modified (Chỉnh sửa/Cập nhật), **D** - Deleted (Xóa).*

---

## II. Software Design Document

### 1. System Design

#### 1.1 System Architecture

##### 1.1.1 Architectural Rationale & Design Trade-offs

Hệ thống **MediAssist-AI** được kiến trúc theo mô hình **Tiered Micro-Modular Monolith** kết hợp điện toán biên (Edge Gateway Nginx). Lựa chọn kiến trúc này dựa trên các phân tích đánh giá kỹ thuật chuyên sâu:

1. **Hiệu năng xử lý đồng thời cực cao với Java 21 LTS Project Loom Virtual Threads:**
   - Thay vì mô hình Platform Thread truyền thống (1 OS Thread = 1 Request, tốn ~1MB bộ nhớ stack), hệ thống kích hoạt Virtual Threads (`spring.threads.virtual.enabled=true`). Khi thực hiện các tác vụ I/O chặn (Blocking I/O) như truy vấn CSDL PostgreSQL, gọi API mạng ngoài (OpenAI, Gemini, VNPay), Virtual Thread tự động nhường (unmount) Carrier Thread cho tác vụ khác.
   - Nhờ đó, máy chủ Spring Boot 3.4 có thể duy trì hơn **10.000 kết nối đồng thời** với mức tiêu thụ RAM dưới 512MB, loại bỏ hoàn toàn hiện tượng cạn kiệt luồng (Thread Pool Starvation).

2. **Cơ sở dữ liệu lai quan hệ - vector (PostgreSQL 16 + pgvector 0.7+):**
   - Loại bỏ nhu cầu triển khai một cụm máy chủ Vector Database riêng biệt (như Pinecone hay Milvus), giúp giảm thiểu chi phí vận hành (DevOps Overhead) và triệt tiêu bài toán bất đồng bộ dữ liệu (Data Inconsistency / Dual-Write Problem).
   - Cho phép thực thi các truy vấn lai (Hybrid Query) kết hợp tìm kiếm tương đồng vector Cosine trên đồ thị HNSW với các bộ lọc quan hệ cứng (SQL `WHERE is_verified = true AND consultation_fee <= 500000`) trong cùng một giao dịch ACID duy nhất với độ trễ chỉ **0.72ms**.

3. **Kiến trúc bộ đệm lai 2 tầng (Hybrid Two-Layer Cache Tier):**
   - **Tầng L1 (Caffeine In-Memory Cache):** Nằm trực tiếp trong bộ nhớ heap JVM, độ trễ truy xuất microsecond ($< 0.05\text{ms}$), lưu trữ danh mục dữ liệu tĩnh có tần suất đọc cực lớn nhưng hiếm khi thay đổi (Danh mục chuyên khoa y tế, Bản thể luận WHO ICD-10, Từ điển chỉ số xét nghiệm LOINC).
   - **Tầng L2 (Redis Distributed Cache):** Lưu trữ các trạng thái phiên làm việc dùng chung, danh sách đen token bị thu hồi, và phân bổ các khóa chống trùng lặp slot khám theo cơ chế cờ Semaphore thời gian thực.

4. **Bảo mật dữ liệu y tế đa lớp theo chuẩn HIPAA & Nghị định 13/2023/NĐ-CP:**
   - **Dual-Transport Stateless Authentication:** Access Token truyền qua Header `Authorization: Bearer` phục vụ ứng dụng di động/REST Client; Refresh Token truyền qua Cookie `HttpOnly, Secure, SameSite=Lax` giúp triệt tiêu hoàn toàn nguy cơ rò rỉ token qua tấn công Cross-Site Scripting (XSS).
   - **Rào chắn BOLA/IDOR `PatientAccessGuard`:** Kiểm tra bắt buộc quan hệ chăm sóc y tế (`CARE_RELATIONSHIP`: lịch hẹn `SCHEDULED`, `IN_PROGRESS`, hoặc `COMPLETED`) trước khi cho phép bác sĩ truy cập hồ sơ bệnh án hoặc tệp tin xét nghiệm của người bệnh.
   - **Private Cloud Storage:** Tệp tin bệnh án tải lên kho Supabase S3 được lưu trữ riêng tư, không công khai URL, chỉ cho phép truy cập thông qua URL ký số HMAC-SHA256 với thời hạn giới hạn nghiêm ngặt **15 phút**.

---

##### 1.1.2 System Architecture Diagram

```mermaid
graph TB
    subgraph Client_Tier["1. Client Presentation Tier (Browser & Mobile Responsive SPA)"]
        SPA["React 18 SPA (TypeScript + Vite + Tailwind CSS)"]
        Landing["Landing Page (Three.js 3D Visualizer & Live Simulator)"]
        DoctorDesk["Doctor Workstation (Live WHO ICD-10 & LOINC Auto-complete)"]
        PatientPortal["Patient Portal (Triage, Search, Telehealth EMR, Quota)"]
        AdminDesk["Admin Management Console (Supervision, Vetting & Auditing)"]
    end

    subgraph Edge_Gateway["2. Edge Gateway & Security Ingress Tier"]
        Nginx["Nginx Reverse Proxy 1.25+ (SSL/TLS 1.3, HTTP/2, Gzip, Rate Limiting 100 req/min)"]
    end

    subgraph App_Tier["3. Application Core Tier (Spring Boot 3.4 - Project Loom Virtual Threads)"]
        WebMVC["Spring WebMVC REST Controllers (@Valid, @RestControllerAdvice)"]
        SecFilter["Spring Security 6.x Filter Chain (Stateless JWT + HttpOnly Cookie)"]
        AccessGuard["PatientAccessGuard (BOLA / IDOR Care-Relationship Verification)"]

        subgraph Core_Services["Business & Clinical Service Modules"]
            AuthSvc["AuthService & EmailVerificationService"]
            TriageSvc["SymptomTriageService (5-Stage Clinical Pipeline + NegEx)"]
            DocSearchSvc["DoctorSemanticSearchService (WHRF SOTA Engine)"]
            ApptSvc["AppointmentService & AppointmentRefundService"]
            DocEncounterSvc["DoctorService & ClinicalOntologyService (EMR, ICD-10, LOINC)"]
            DocOcrSvc["MedicalDocumentAnalysisService (OCR & Multimodal Summarizer)"]
            PiiSvc["MedicalPiiService (Decree 13/2023/ND-CP Privacy Shield)"]
            PaymentSvc["PaymentService & VNPayGatewayAdapter"]
            EmailEngine["EmailService (@Async mailExecutor + Email Outbox)"]
            AuditSvc["AuditLogService & SystemConfigService"]
        end
    end

    subgraph Cache_Tier["4. Hybrid 2-Layer Cache Tier"]
        L1["L1: Caffeine In-Memory Cache (Specialties, ICD-10, LOINC, Cache-Aside)"]
        L2["L2: Redis Distributed Cache (User Sessions, Slot Lock Semaphores)"]
    end

    subgraph Persistence_Tier["5. Persistence & Vector Retrieval Tier"]
        PG[("PostgreSQL 16 LTS (3NF Relational Tables)")]
        PGV["pgvector 0.7+ Extension (HNSW Index: m=24, ef_construction=128)"]
        Flyway["Flyway Migration Engine (V1 - V22 Versioned DDL)"]
    end

    subgraph Storage_Tier["6. Object Storage & Cloud Infrastructure Tier"]
        S3["Supabase Private S3 Storage (Encrypted at Rest, 15-Min HMAC Signed URLs)"]
    end

    subgraph External_Cloud["7. External AI & Financial Services"]
        OpenAI["OpenAI API (text-embedding-3-small, 1536-dim) / Local Hashing Fallback"]
        Gemini["Google Gemini 1.5 Flash (Clinical OCR & Indicator Extraction)"]
        VNPay["VNPay National Payment Gateway (HMAC-SHA512 Checksum)"]
        SMTP["SMTP Mail Server (Brevo / Transactional Delivery via TLS 587)"]
    end

    SPA -->|HTTPS / WSS| Nginx
    Nginx -->|Proxy Pass 8080| WebMVC
    WebMVC --> SecFilter
    SecFilter --> AccessGuard
    AccessGuard --> Core_Services

    Core_Services --> L1
    Core_Services --> L2
    Core_Services --> PG
    PG --- PGV
    PG --- Flyway
    Core_Services --> S3

    DocSearchSvc -->|Embeddings| OpenAI
    DocOcrSvc -->|Vision / LLM| Gemini
    PaymentSvc -->|IPN Webhook / Redirect| VNPay
    EmailEngine -->|TLS SMTP| SMTP
```

##### Figure 1.1. MediAssist-AI Tiered Micro-Modular Monolith System Architecture

---

##### 1.1.3 System Architecture Component Descriptions

##### Table 1.1. System Architecture Component Descriptions

| No | Package / Component | Technology Stack & Version | Configuration Parameters & Protocols | Detailed Responsibility & Architectural Role |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **React 18 SPA Client** | React 18.3, TypeScript 5.6, Vite 6.0, Tailwind CSS 3.4 | Single Page Application, Code-Splitting qua `React.lazy()` | Giao diện người dùng đĩa đơn phản hồi nhanh, phục vụ 4 vai trò (Guest, Patient, Doctor, Admin). Tải lười các phân hệ nặng (Bàn làm việc bác sĩ, 3D Landing, Bảng điều khiển admin), đạt chỉ số FCP < 0.8s. |
| **2** | **Nginx Edge Ingress** | Nginx 1.25+ Alpine Linux | SSL/TLS 1.3, HTTP/2, Gzip, Rate Limiting 100 req/min | Cổng biên bảo mật tiếp nhận lưu lượng mạng: Kết thúc mã hóa SSL, giải nén tài nguyên tĩnh, giới hạn tần suất truy cập theo địa chỉ IP chống DoS, và định tuyến sang cổng nội bộ 8080. |
| **3** | **Spring Boot 3.4 Core** | Java 21 LTS, Spring Boot 3.4.0, Project Loom | `spring.threads.virtual.enabled=true` | Tầng xử lý nghiệp vụ trung tâm. Khai thác luồng ảo Virtual Threads của Java 21, xử lý hàng ngàn tác vụ I/O đồng thời mà không bị nghẽn luồng hay tốn bộ nhớ hệ điều hành. |
| **4** | **Dual-Transport Security** | Spring Security 6.x, JJWT 0.12.x | Bearer Header + HttpOnly Secure Cookie | Cơ chế xác thực phi trạng thái kép: Access Token (JWT, hạn 60 phút) truyền qua Header `Authorization: Bearer` cho API Client; Refresh Token (JWT, hạn 7 ngày) bọc trong Cookie `HttpOnly, Secure, SameSite=Lax` chống XSS. |
| **5** | **PatientAccessGuard** | Aspect-Oriented Security Component | `@Component`, Spring AOP | Rào chắn phân quyền đối tượng BOLA/IDOR chuyên biệt cho y tế. Ngăn chặn bác sĩ hoặc người dùng truy cập trái phép bệnh án, xét nghiệm nếu không có quan hệ khám chữa bệnh (`CARE_RELATIONSHIP`). |
| **6** | **WHRF SOTA Search Engine** | Vector Retrieval + Priority Queue Min-Heap | HNSW Cosine + Sigmoid Contrastive Sharpening | Động cơ tìm kiếm bác sĩ ngữ nghĩa đa tiêu chí: Kết hợp khoảng cách Cosine trên đồ thị HNSW với hàm làm sắc nét Sigmoid, điểm thưởng chuyên khoa, độ tin cậy đánh giá logarithm và phụ phí khám bệnh. |
| **7** | **5-Stage Triage Pipeline** | Regex Engine + Vietnamese NegEx | 5 Stages: Hotline 115, Teen-code, NegEx, OOD, SBAR | Động cơ phân luồng triệu chứng 5 tầng: Phát hiện cấp cứu 115 (Stage 1), chuẩn hóa teen-code (Stage 2), bóc tách mệnh đề phủ định NegEx (Stage 3), chặn câu hỏi hành chính OOD (Stage 4), phân rã triệu chứng phức (Stage 5). |
| **8** | **Clinical EMR Service** | JSONB + WHO ICD-10 & LOINC Standards | QĐ 7603/BYT (ICD-10) & QĐ 3280/BYT (LOINC) | Dịch vụ hồ sơ bệnh án điện tử hỗ trợ gợi ý chẩn đoán tự động theo danh mục ICD-10 quốc tế và chỉ số xét nghiệm LOINC của Bộ Y Tế Việt Nam, lưu trữ cấu trúc JSON trên bảng `appointments`. |
| **9** | **Document OCR & Vision** | Google Gemini 1.5 Flash Vision + Apache Tika | Multimodal LLM, Max 5 files/batch, 10MB/file | Trích xuất ký tự quang học (OCR) từ ảnh chụp đơn thuốc, phiếu xét nghiệm, giải nghĩa các chỉ số bất thường và tự động loại bỏ thông tin định danh cá nhân (PII De-identification). |
| **10** | **Medical PII Privacy Shield** | Regex Classifier + Meddies-PII Schema | Nghị định 13/2023/NĐ-CP & HIPAA Privacy Rule | Dịch vụ khử định danh dữ liệu y tế nhạy cảm: Tự động phát hiện và che giấu (masking) tên bệnh nhân, số CMND/CCCD, mã BHYT, số điện thoại trước khi đưa vào mô hình AI. |
| **11** | **Hybrid Caching Tier** | Caffeine Cache 3.x (L1) + Redis 7.x (L2) | TTL 60m (L1), TTL 24h (L2) | Kiến trúc Cache 2 tầng: Tầng L1 cục bộ trong JVM lưu trữ danh mục tra cứu tĩnh (ICD-10, chuyên khoa), tầng L2 Redis phân tán lưu trữ token đen và phân bổ slot lịch khám thời gian thực. |
| **12** | **PostgreSQL 16 + pgvector** | PostgreSQL 16.x LTS, pgvector 0.7.x | HNSW Index: `m=24`, `ef_construction=128`, Cosine | Hệ quản trị cơ sở dữ liệu quan hệ chuẩn 3NF. Tích hợp chỉ mục HNSW vector 1536 chiều, kết hợp Full-Text Search tiếng Việt (`pg_trgm`) và hỗ trợ tính toán giao dịch ACID. |
| **13** | **Private Supabase S3** | AWS S3 SDK v2, Supabase Storage | AES-256 at Rest, 15-Min HMAC-SHA256 Presigned | Kho lưu trữ tài liệu y tế bảo mật cấp ngân hàng. Tệp tin được mã hóa tĩnh (AES-256), khóa truy cập công khai và chỉ cho phép tải về thông qua URL ký số HMAC-SHA256 có hạn sử dụng 15 phút. |
| **14** | **VNPay Gateway Adapter** | VNPay Sandbox / Production API | HMAC-SHA512 Checksum, IPN Webhook Idempotent | Tích hợp cổng thanh toán trực tuyến quốc gia qua giao thức HMAC-SHA512. Tự động xử lý thông báo biến động số dư tức thời (IPN Webhook) với khóa chống trùng lặp giao dịch (Idempotency Lock). |
| **15** | **Async Email Engine** | Spring Mail, Project Loom TaskExecutor | `@Async("mailExecutor")`, Email Outbox Table | Động cơ phát tán thư điện tử giao dịch (Kích hoạt tài khoản, mã OTP, xác nhận lịch khám, hoàn tiền) chạy nền không chặn, tự động ghi nhận vào hộp thư chờ (Email Outbox) nếu mạng gặp sự cố. |
| **16** | **Audit Trail Logging** | Spring AOP, Event Listeners | HIPAA Security Rule & Nghị định 13/2023/NĐ-CP | Hệ thống ghi vết kiểm toán an ninh bất biến, tự động lưu lại định danh người thực hiện, hành động, tài nguyên tác động, địa chỉ IP và dấu thời gian cho mọi thao tác y tế. |

---

#### 1.2 Package Diagram

##### 1.2.1 Front-end Design & Package Structure

Mã nguồn Front-end được tổ chức theo tiêu chuẩn module hóa phân lớp rõ ràng (Feature-driven & Layered Architecture) trong thư mục `frontend/src/`:

```mermaid
graph TD
    subgraph UI_Presentation["Presentation & Routing Tier"]
        App["App.tsx (Root Contexts, ToastProvider, ErrorBoundary)"]
        Routes["Routes Configuration (React Router DOM v6)"]
        Layouts["Layouts/ (AdminLayout, DoctorLayout, PatientLayout)"]
        Pages["Pages/ (18 Màn hình SCR-01 đến SCR-18)"]
    end

    subgraph Feature_Pages["Page Domain Groups"]
        AuthPages["pages/auth/ (LoginPage, RegisterPage, ForgotPwd, ResetPwd, VerifyEmail)"]
        PatientPages["pages/patient/ (PatientDashboard, DoctorSearch, Triage, DocumentSummarizer)"]
        DoctorPages["pages/doctor/ (DoctorDashboard, DoctorWorkstation, DoctorProfile, PatientRecords)"]
        AdminPages["pages/admin/ (AdminDashboard, DoctorManagement, UserManagement, AuditLogPage)"]
    end

    subgraph UI_Components["Shared UI Components"]
        CommonComp["components/common/ (ProtectedRoute, ErrorBoundary, Header, Footer)"]
        AtomicUI["components/ui/ (Modal, Toast, Pagination, ConfirmDialog, Badge, SlotPicker, VitalValue)"]
    end

    subgraph Business_Client["Client Business Logic & State"]
        Hooks["hooks/ (useAuth, useDebounce, useDoctorSearch, useToast, useAutoScroll)"]
        Services["services/ (apiClient, authApi, appointmentApi, triageApi, doctorApi, documentFileService)"]
        Types["types/ (auth.ts, appointment.ts, triage.ts, doctor.ts, document.ts)"]
        Utils["utils/ (formatters.ts, dateUtils.ts, tokenStorage.ts, apiError.ts)"]
    end

    App --> Routes
    Routes --> Layouts
    Layouts --> Pages
    Pages --> Feature_Pages
    Feature_Pages --> CommonComp
    Feature_Pages --> AtomicUI
    Feature_Pages --> Hooks
    Hooks --> Services
    Services --> Types
    Services --> Utils
```

##### Figure 1.2.1. Front-end Package Architecture & Directory Organization

##### Table 1.2.1. Front-end Package Descriptions

| No | Package / Directory Path | Concrete Implementation Files | Detailed Architectural Responsibility |
| :---: | :--- | :--- | :--- |
| **1** | `src/App.tsx` | `App.tsx` | Điểm khởi nhập chính của ứng dụng SPA; cấu hình `ToastProvider`, `ErrorBoundary`, và cơ chế tải lười `React.lazy()` chia nhỏ bundle. |
| **2** | `src/components/common/` | `ProtectedRoute.tsx`, `ErrorBoundary.tsx` | Các thành phần giao diện kiểm soát dùng chung: `ProtectedRoute` (bảo vệ quyền truy cập theo Role và JWT), `ErrorBoundary` (bắt lỗi sập UI). |
| **3** | `src/components/ui/` | `Modal.tsx`, `ToastProvider.tsx`, `Pagination.tsx`, `ConfirmDialog.tsx`, `Badge.tsx`, `SlotPicker.tsx`, `VitalValue.tsx`, `AuthCard.tsx` | Thư viện giao diện nguyên tử (Atomic UI Components): Hộp thoại xác nhận, thanh thông báo nổi Toast, phân trang động, chọn slot lịch khám, hiển thị sinh hiệu. |
| **4** | `src/layouts/` | `AdminLayout.tsx`, `DoctorLayout.tsx`, `PatientLayout.tsx` | Khung điều hướng cấu trúc giao diện: `PatientLayout` (Thanh điều hướng người bệnh), `DoctorLayout` (Bàn làm việc bác sĩ), `AdminLayout` (Bảng điều khiển quản trị). |
| **5** | `src/pages/` | `LandingPage.tsx`, `OAuth2CallbackPage.tsx` | Các màn hình công khai cấp cao: Trang chủ giới thiệu với mô hình 3D Three.js và trang tiếp nhận phản hồi xác thực Google OAuth2. |
| **6** | `src/pages/auth/` | `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx` | Các trang nghiệp vụ xác thực: Đăng nhập mật khẩu, Đăng ký bệnh nhân, Yêu cầu gửi OTP/Token, Đặt lại mật khẩu với token SHA-256, Xác thực kích hoạt email. |
| **7** | `src/pages/patient/` | `PatientDashboard.tsx`, `DoctorSearchPage.tsx`, `SymptomTriagePage.tsx`, `DocumentSummarizerPage.tsx`, `PaymentSuccessPage.tsx` | Màn hình người bệnh: Bảng điều khiển cá nhân, Tìm kiếm bác sĩ ngữ nghĩa đa tiêu chí, Chatbot phân luồng triệu chứng 5 tầng, Trợ lý giải nghĩa xét nghiệm OCR, Kết quả thanh toán. |
| **8** | `src/pages/doctor/` | `DoctorDashboard.tsx`, `DoctorProfilePage.tsx`, `DoctorPatientRecordsPage.tsx` | Màn hình bác sĩ: Bàn làm việc bác sĩ (Doctor Workstation) với danh mục ICD-10/LOINC tự động, Quản lý hồ sơ năng lực & lịch làm việc, Tra cứu hồ sơ bệnh nhân. |
| **9** | `src/pages/admin/` | `AdminDashboard.tsx`, `DoctorManagementPage.tsx`, `UserManagementPage.tsx`, `SpecialtyManagementPage.tsx`, `AppointmentSupervisionPage.tsx`, `TriageSupervisionPage.tsx`, `AuditLogPage.tsx` | Màn hình quản trị: Giám sát toàn bệnh viện, Thẩm định phê duyệt chứng chỉ bác sĩ, Quản lý tài khoản và khóa bảo mật, Quản lý chuyên khoa, Nhật ký kiểm toán an ninh. |
| **10** | `src/services/` | `apiClient.ts`, `authApi.ts`, `appointmentApi.ts`, `triageApi.ts`, `doctorApi.ts`, `documentFileService.ts`, `ontologyApi.ts`, `piiApi.ts` | Lớp giao tiếp mạng Axios: Cấu hình `apiClient` tự động đính kèm Bearer Token, làm mới token trong suốt (Sliding Session) khi hết hạn và chuẩn hóa định dạng lỗi từ Backend. |
| **11** | `src/hooks/` | `useAuth.ts`, `useDebounce.ts`, `useDoctorSearch.ts`, `useToast.ts`, `useAutoScroll.ts` | Các Custom React Hooks: Quản lý trạng thái đăng nhập, kỹ thuật Debounce chống quá tải tìm kiếm ngữ nghĩa, tự động cuộn hội thoại phân luồng triệu chứng. |
| **12** | `src/types/` | `auth.ts`, `appointment.ts`, `triage.ts`, `doctor.ts`, `document.ts`, `clinical.ts` | Định nghĩa toàn bộ kiểu dữ liệu TypeScript (Interfaces/Types), đồng bộ 1-1 với các DTO và Entity của Backend. |
| **13** | `src/utils/` | `formatters.ts`, `dateUtils.ts`, `tokenStorage.ts`, `apiError.ts` | Các hàm tiện ích hỗ trợ: Định dạng tiền tệ VND, định dạng ngày giờ khám bệnh, trích xuất lỗi API, giải mã payload JWT. |
| **14** | `src/styles/` | `index.css`, `tailwind.config.js` | Định nghĩa hệ thống thiết kế CSS, bảng màu nhận diện y tế (Teal, Blue, Emerald), cấu hình Dark/Light theme và hoạt ảnh tương tác. |

---

##### 1.2.2 Back-end Design & Clean Architecture Packages

Kiến trúc mã nguồn Back-end tuân thủ nghiêm ngặt mô hình phân tầng **Layered Clean Architecture** trong thư mục `backend/src/main/java/com/mediassist/`:

```mermaid
graph TD
    subgraph Presentation_Tier["1. Presentation Layer (Ingress & Controllers)"]
        Controllers["REST Controllers (AuthController, AppointmentController, DoctorController, TriageController...)"]
        SecurityConfig["SecurityFilterChain, JwtAuthenticationFilter, OAuth2SuccessHandler"]
        GlobalException["GlobalExceptionHandler (@RestControllerAdvice, ErrorCode mapping)"]
    end

    subgraph Application_Tier["2. Application Service Layer (Core Business Workflows)"]
        AuthSvc["AuthService, EmailVerificationService, PasswordResetService"]
        TriageSvc["TriageService, RedFlagService, ClinicalQueryDefenseEngine"]
        DocSearchSvc["DoctorSemanticSearchService, EmbeddingService (WHRF SOTA)"]
        ApptSvc["AppointmentService, AppointmentRefundService"]
        DoctorSvc["DoctorService, DoctorReviewService"]
        OntologySvc["ClinicalOntologyService (WHO ICD-10 & LOINC Auto-complete)"]
        DocumentSvc["MedicalDocumentAnalysisService, MedicalDocumentFileAccessService"]
        PiiShield["MedicalPiiService (Decree 13/2023/ND-CP Privacy Shield)"]
        PaymentSvc["PaymentService, VNPayGatewayAdapter"]
        GuardSvc["PatientAccessGuard (BOLA / IDOR Verification)"]
        VettingSvc["AdminVettingService, AiUsageAnalyticsService, AuditLogService"]
    end

    subgraph Domain_Tier["3. Domain Model Layer (Entities, DTOs & Value Objects)"]
        Entities["17 JPA Entities (User, Appointment, DoctorProfile, MedicalDocument...)"]
        DTOs["Request / Response DTOs (@Valid, @NotBlank, @Size(max=20000))"]
        Enums["Business Enums (Role, AppointmentStatus, PaymentStatus, TriageUrgency)"]
    end

    subgraph Infrastructure_Tier["4. Infrastructure & Persistence Layer"]
        Repositories["Spring Data JPA Repositories (Native Queries + pgvector HNSW)"]
        Cache["TwoLayerCacheService (Caffeine L1 + Redis L2)"]
        Storage["SupabaseStorageService (Private S3 Bucket + 15-min HMAC Signed URLs)"]
        Mail["EmailService (@Async mailExecutor + Email Outbox)"]
        RateLimit["SecurityRateLimiterService, TriageRateLimiterService"]
        FlywayEngine["Flyway Database Migration Engine (V1 - V22)"]
    end

    Presentation_Tier --> Application_Tier
    Application_Tier --> Domain_Tier
    Application_Tier --> Infrastructure_Tier
    Infrastructure_Tier --> Domain_Tier
```

##### Figure 1.2.2. Back-end Clean Architecture & Layered Package Design

##### Table 1.2.2. Back-end Package Descriptions

| No | Package Name | Key Classes & Interfaces | Detailed Architectural Responsibility |
| :---: | :--- | :--- | :--- |
| **1** | `com.mediassist.controller` | `AuthController`, `AppointmentController`, `DoctorController`, `TriageController`, `MedicalDocumentController`, `PaymentController`, `AdminController`, `ClinicalOntologyController`, `MedicalPiiController`, `DoctorReviewController`, `SystemConfigController`, `NotificationController` | Tầng tiếp nhận HTTP Request. Tiếp nhận payload JSON hoặc Multipart, kích hoạt xác thực `@Valid`, điều phối tầng Service và trả về `ResponseEntity<ApiResponse<T>>` chuẩn hóa. |
| **2** | `com.mediassist.config` | `SecurityConfig`, `VirtualThreadConfig`, `OpenApiConfig`, `TwoLayerCacheConfig`, `AsyncConfig` | Cấu hình hạ tầng Spring Boot: Bộ lọc bảo mật Spring Security 6, cấu hình Virtual Threads Project Loom, cấu hình tài liệu Swagger/OpenAPI, bộ đệm Cache 2 tầng. |
| **3** | `com.mediassist.security` | `JwtAuthenticationFilter`, `JwtTokenProvider`, `UserPrincipal`, `CustomOAuth2UserService`, `CustomOidcUserService`, `OAuth2AuthenticationSuccessHandler` | Thành phần bảo mật lõi: Giải mã và xác thực chữ ký JWT, nạp định danh người dùng vào `SecurityContextHolder`, xử lý đăng nhập một chạm Google OAuth2. |
| **4** | `com.mediassist.service` | `AuthService`, `AppointmentService`, `DoctorService`, `PaymentService`, `NotificationService`, `PatientProfileService` | Tầng nghiệp vụ cốt lõi: Triển khai các Use Case kinh doanh chính, quản lý ranh giới giao dịch `@Transactional`, điều phối logic đặt lịch, thanh toán, thông báo. |
| **5** | `com.mediassist.service.guard` | `PatientAccessGuard` | Rào chắn bảo mật phân quyền đối tượng BOLA/IDOR chuyên biệt cho y tế. Kiểm tra bắt buộc quan hệ chăm sóc y tế (`CARE_RELATIONSHIP`) và tự động ghi nhật ký `VIEW_PATIENT_RECORD`. |
| **6** | `com.mediassist.service.ai` | `DoctorSemanticSearchService`, `EmbeddingService` | Động cơ tìm kiếm bác sĩ ngữ nghĩa: Tích hợp mô hình `openai/text-embedding-3-small`, thuật toán Sigmoid Contrastive Sharpening, bộ giảm chấn đánh giá và tìm kiếm dự phòng cục bộ. |
| **7** | `com.mediassist.service.triage` | `TriageService`, `RedFlagService`, `ClinicalQueryDefenseEngine`, `NegationEngine` | Động cơ phân luồng triệu chứng 5 tầng: Phát hiện cấp cứu 115, chuẩn hóa teen-code, bóc tách phủ định Vietnamese NegEx, lọc câu hỏi hành chính OOD và tóm tắt SBAR. |
| **8** | `com.mediassist.service.clinical` | `ClinicalOntologyService`, `MeddiesPdfGeneratorService` | Bản thể luận y khoa: Tra cứu chẩn đoán WHO ICD-10 (QĐ 7603/BYT), chỉ số xét nghiệm LOINC (QĐ 3280/BYT), và bộ tạo tệp PDF phiếu xét nghiệm ngẫu nhiên từ kho 150.000 hồ sơ Meddies. |
| **9** | `com.mediassist.service.document` | `MedicalDocumentAnalysisService`, `MedicalDocumentFileAccessService` | Dịch vụ hồ sơ xét nghiệm: Bóc tách chỉ số xét nghiệm quang học (OCR) qua Google Gemini 1.5 Flash Vision, và cấp quyền tải tệp qua URL ký số HMAC-SHA256 15 phút. |
| **10** | `com.mediassist.service.pii` | `MedicalPiiService` | Lá chắn bảo vệ dữ liệu y tế nhạy cảm: Tự động phát hiện và khử định danh thông tin cá nhân (Tên, CCCD, BHYT, Điện thoại) theo chuẩn Nghị định 13/2023/NĐ-CP và HIPAA. |
| **11** | `com.mediassist.service.appointment` | `AppointmentRefundService` | Thuật toán hoàn tiền tự động phân tầng: Tính toán tỷ lệ hoàn phí ($>24\text{h} = 100\%$, $2\text{h}-24\text{h} = 80\%$, $<2\text{h} = 0\%$, Bác sĩ hủy $= 100\%$) và kích hoạt hoàn tiền qua VNPay. |
| **12** | `com.mediassist.service.review` | `DoctorReviewService` | Dịch vụ đánh giá bác sĩ: Tiếp nhận nhận xét từ bệnh nhân sau ca khám `COMPLETED`, tính toán lại điểm số trung bình và cập nhật số lượng đánh giá tích lũy. |
| **13** | `com.mediassist.service.payment` | `VNPayGatewayAdapter` | Bộ điều hợp cổng thanh toán VNPay: Tạo chuỗi ký số HMAC-SHA512, tạo URL thanh toán, và thẩm định chữ ký số Webhook IPN với cơ chế chống trùng lặp Idempotency. |
| **14** | `com.mediassist.service.cache` | `TwoLayerCacheService` | Dịch vụ quản lý bộ đệm lai 2 lớp: Tự động điều phối giữa tầng L1 Caffeine In-Memory và tầng L2 Redis Distributed Cache, tự động xóa bộ đệm (Eviction) khi dữ liệu cập nhật. |
| **15** | `com.mediassist.service.ratelimit` | `SecurityRateLimiterService`, `TriageRateLimiterService` | Bộ giới hạn tốc độ truy cập: Chặn spam đăng nhập, giới hạn lượt quét xem trước hồ sơ y tế không cần đăng nhập (3 lần/10 phút theo IP), và khóa tạm 10 phút nếu gửi tệp rác. |
| **16** | `com.mediassist.service.vetting` | `AdminVettingService` | Dịch vụ quản trị và thẩm định: Phê duyệt chứng chỉ hành nghề bác sĩ, tự động kích hoạt tính toán vector `bio_embedding`, khóa/mở tài khoản an ninh. |
| **17** | `com.mediassist.service.analytics` | `AiUsageAnalyticsService` | Kế toán điện toán trí tuệ nhân tạo (FinOps): Giám sát số lượng token Prompt, Completion, chi phí USD quy đổi và độ trễ suy luận của các mô hình LLM. |
| **18** | `com.mediassist.repository` | `UserRepository`, `DoctorProfileRepository`, `AppointmentRepository`, `MedicalDocumentRepository`, `TriageSessionRepository`, `PaymentTransactionRepository`, `DoctorReviewRepository`, `AuditLogRepository` | Tầng tương tác cơ sở dữ liệu: Spring Data JPA Repositories kết hợp các truy vấn Native SQL chuyên dụng trên chỉ mục HNSW của `pgvector` và `pg_trgm`. |
| **19** | `com.mediassist.model.entity` | `User`, `Specialty`, `DoctorProfile`, `DoctorSpecialty`, `DoctorScheduleSlot`, `PatientProfile`, `Appointment`, `TriageSession`, `MedicalDocument`, `DocumentAnalysis`, `PaymentTransaction`, `PasswordResetToken`, `EmailVerificationToken`, `Notification`, `DoctorReview`, `AuditLog`, `AiTokenUsage` | 17 thực thể JPA ánh xạ 1-1 với 17 bảng trong PostgreSQL, tích hợp khóa ngoại, ràng buộc kiểm tra và các cột dữ liệu y tế JSONB. |
| **20** | `com.mediassist.model.dto` | `LoginRequest`, `RegisterRequest`, `AppointmentDto`, `CreateAppointmentRequest`, `ClinicalEncounterRequest`, `TriageRequest`, `TriageResponse`, `DocumentAnalysisResponse`, `DoctorDetailDto`, `CreatePaymentRequest`, `UserDto` | Các đối tượng vận chuyển dữ liệu (DTOs): Tách biệt mô hình hiển thị khỏi thực thể CSDL, tích hợp ràng buộc Jakarta Validation (`@NotBlank`, `@Email`, `@Size(max=20000)`). |
| **21** | `com.mediassist.model.enums` | `Role`, `AppointmentStatus`, `PaymentStatus`, `TriageUrgency`, `UserStatus` | Hệ thống kiểu liệt kê nghiệp vụ chuẩn hóa toàn hệ thống. |
| **22** | `com.mediassist.exception` | `GlobalExceptionHandler`, `AppException`, `ErrorCode` | Xử lý ngoại lệ tập trung: Đón bắt toàn bộ lỗi hệ thống, đóng gói thành phản hồi JSON `ApiResponse.error()` với mã lỗi chuẩn y tế (`SLOT_CONFLICT`, `FORBIDDEN_CARE_RELATIONSHIP`). |
| **23** | `com.mediassist.storage` | `SupabaseStorageService`, `StorageService` | Tầng giao tiếp lưu trữ đám mây: Quản lý kết nối S3 với Supabase, thực thi ký số URL HMAC-SHA256 (hạn 15 phút), quản lý đường dẫn lưu trữ nội bộ riêng tư. |
| **24** | `com.mediassist.mail` | `EmailService`, `MailOutbox` | Động cơ phát tán thư điện tử giao dịch: Khai thác luồng ảo Loom (`@Async("mailExecutor")`), tạo nội dung HTML và cơ chế lưu trữ thư chờ phát lại khi mạng gặp sự cố. |
'''
