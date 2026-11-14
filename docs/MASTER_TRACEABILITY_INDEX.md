# Sổ Tra Cứu Tổng Hợp & Ma Trận Truy Vết Toàn Diện (MASTER_TRACEABILITY_INDEX.md)
## MediAssist-AI Master Traceability Matrix & Capstone Engineering Index (1-to-1 Full Mapping)

> **Mục đích:** Đóng vai trò là **Điểm Neo Thông Tin Duy Nhất (Single Source of Truth - SSOT)** của đồ án Khóa Luận Tốt Nghiệp MediAssist-AI.  
> **Khả năng tra cứu (Traceability 1-1):** Cho phép thành viên trong nhóm, Tech Lead, Giảng viên Hướng dẫn và Hội đồng Đánh giá truy vết tức thì:  
> Bất kỳ **Yêu cầu (Use Case)** $\rightarrow$ được code ở **Tệp Frontend/Backend nào** $\rightarrow$ lưu ở **Bảng CSDL & Flyway nào** $\rightarrow$ ứng dụng **Thuật toán nào** $\rightarrow$ được kiểm thử bởi **Test Case / Script nào**.
> 
> **Phạm vi kiểm kê 1-to-1 thực tế (Codebase Reality Baseline):**
> - **49 Use Cases** chuẩn RUP/IEEE 830 (6 Common, 18 Patient, 14 Doctor, 11 Admin)
> - **15 REST Controllers** với **87 Endpoints** chuẩn OpenAPI 3.0 & Spring Security PreAuthorize
> - **31 Backend Services** triển khai Clean Modular Architecture
> - **16 Spring Data Repositories**
> - **17 Bảng CSDL Chuẩn 3NF + 6 Enums** (23 tệp Entity & Enum)
> - **23 Bản di trú Flyway** (`V1__initial_schema.sql` đến `V23__refactor_icd_code_and_version.sql`)
> - **22 Trang Frontend React + 10 Modals/Drawers** với Zero-Flicker Zustand & Code-Splitting Lazy Loading
> - **37 Lớp Kiểm Thử Tự Động (Unit & Integration Tests)** với **308 Tests 100% PASS**
> - **113 Phiên làm việc** ghi nhận chi tiết tại `docs/WORK_LOG.md`

---

## 📑 Mục Lục Điều Hướng Nhanh

- [1. Bản Đồ Tổng Hợp Hệ Thống Tài Liệu (`docs/`)](#1-bản-đồ-tổng-hợp-hệ-thống-tài-liệu-docs)
- [2. Ma Trận Truy Vết Yêu Cầu Kỹ Thuật Toàn Diện (RTM 49 Use Cases)](#2-ma-trận-truy-vết-yêu-cầu-kỹ-thuật-toàn-diện-rtm-49-use-cases)
- [3. Bản Đồ Bộ 5 Thuật Toán Độc Quyền Cấp Doanh Nghiệp](#3-bản-đồ-bộ-5-thuật-toán-độc-quyền-cấp-doanh-nghiệp)
- [4. Bản Đồ Cơ Sở Dữ Liệu & 23 Bản Di Trú Flyway (V1 - V23)](#4-bản-đồ-cơ-sở-dữ-liệu--23-bản-di-trú-flyway-v1---v23)
- [5. Danh Mục Toàn Diện 15 Controllers & 87 REST Endpoints](#5-danh-mục-toàn-diện-15-controllers--87-rest-endpoints)
- [6. Danh Mục Toàn Diện 31 Backend Services & 16 Repositories](#6-danh-mục-toàn-diện-31-backend-services--16-repositories)
- [7. Danh Mục Toàn Diện 22 Trang Giao Diện Frontend React & Điều Hướng Tuyến](#7-danh-mục-toàn-diện-22-trang-giao-diện-frontend-react--điều-hướng-tuyến)
- [8. Bản Đồ Bộ Kiểm Thử Chất Lượng (37 Lớp Test, 308 Unit Tests 100% PASS)](#8-bản-đồ-bộ-kiểm-thử-chất-lượng-37-lớp-test-308-unit-tests-100-pass)
- [9. Cẩm Nang Lệnh Vận Hành Nhanh (Fast Operations Cheatsheet)](#9-cẩm-nang-lệnh-vận-hành-nhanh-fast-operations-cheatsheet)

---

## 1. Bản Đồ Tổng Hợp Hệ Thống Tài Liệu (`docs/`)

Khi cần tìm kiếm tài liệu phục vụ viết báo cáo luận văn, slide bảo vệ hoặc chuẩn bị demo, hãy tra cứu theo bảng điều hướng dưới đây:

| Tên Tệp Tài Liệu | Nội Dung Trọng Tâm | Dành Cho Ai? | Đường Dẫn |
| :--- | :--- | :---: | :---: |
| **`MASTER_TRACEABILITY_INDEX.md`** *(Tệp này)* | Ma trận truy vết từ Use Case $\rightarrow$ Code $\rightarrow$ DB $\rightarrow$ Test, 87 endpoints, 31 services, 23 flyway | Toàn bộ nhóm & Hội đồng | [`docs/MASTER_TRACEABILITY_INDEX.md`](./MASTER_TRACEABILITY_INDEX.md) |
| **`PROJECT_CHARTER_AND_PLAN.md`** | Khởi động & Kế hoạch Quản lý Dự án (Capstone Report 1) chuẩn PMBOK/Agile, WBS, RACI, 7 Milestones, FinOps | Giảng viên hướng dẫn & Tech Lead | [`docs/PROJECT_CHARTER_AND_PLAN.md`](./PROJECT_CHARTER_AND_PLAN.md) |
| **`REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md`** | Phân tích Nghiệp vụ & Mô hình hóa Miền (Capstone Report 2) chuẩn ISO 29148, Mô hình O2O, 3 Personas, DDD | Business Analyst & Hội đồng | [`docs/REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md`](./REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md) |
| **`SRS_MediAssist_AI.md`** | Hồ sơ Đặc tả Yêu cầu Phần mềm (Capstone Report 3) chuẩn IEEE 830 / ISO 29148, 49 Use Cases, 22 Màn hình, RTM | Hội đồng chấm đồ án & Nhóm | [`docs/SRS_MediAssist_AI.md`](./SRS_MediAssist_AI.md) |
| **`SDD_MediAssist_AI.md`** | Hồ sơ Thiết kế Phần mềm (Capstone Report 4) chuẩn FPT Capstone, 88 Biểu đồ Mermaid Class & Sequence, 17 Bảng CSDL | Giảng viên phản biện & Dev | [`docs/SDD_MediAssist_AI.md`](./SDD_MediAssist_AI.md) |
| **`TEST_REPORT_MediAssist_AI.md`** | Báo cáo Kiểm thử Phần mềm & Đảm bảo Chất lượng (Capstone Report 5) chuẩn IEEE 829 / ISO 29119, 308 Tests, k6, HNSW | Ban Đảm bảo Chất lượng & Hội đồng | [`docs/TEST_REPORT_MediAssist_AI.md`](./TEST_REPORT_MediAssist_AI.md) |
| **`ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`** | Đặc tả chi tiết 5 thuật toán doanh nghiệp độc quyền (Hedged Requests, Progressive Sieve, XFetch, v.v.) | Tech Lead & Giám khảo chấm điểm | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md) |
| **`CAPSTONE_DEFENSE.md`** | Cẩm nang bảo vệ: Đề cương 5 chương, kịch bản thuyết trình 15p, checklist live demo, Top 16 câu hỏi Q&A | Cả nhóm đi bảo vệ | [`docs/CAPSTONE_DEFENSE.md`](./CAPSTONE_DEFENSE.md) |
| **`USE_CASES.md`** | Đặc tả 49 Use Cases chi tiết chuẩn RUP/IEEE 830, luồng sự kiện, ngoại lệ, API endpoints 1-1 | Toàn bộ nhóm | [`docs/USE_CASES.md`](./USE_CASES.md) |
| **`DATABASE_DESIGN.md`** | Thiết kế CSDL 3NF, sơ đồ Mermaid ERD, HNSW Indexing, 23 bản di trú Flyway V1-V23 | Dev 1 & Tech Lead | [`docs/DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) |
| **`STORYTELLING.md`** | Bối cảnh y tế VN, nỗi đau quá tải bệnh viện, chân dung người dùng (Personas), đạo đức AI | Mở đầu slide & Chương 1 | [`docs/STORYTELLING.md`](./STORYTELLING.md) |
| **`WORK_LOG.md`** | Nhật ký kiểm duyệt kiến trúc 113 phiên làm việc (`#001` đến `#113`), bằng chứng test | Toàn bộ nhóm & Giảng viên | [`docs/WORK_LOG.md`](./WORK_LOG.md) |

---

## 2. Ma Trận Truy Vết Yêu Cầu Kỹ Thuật Toàn Diện (RTM 49 Use Cases)

Bảng ma trận dưới đây thiết lập **quan hệ ánh xạ 1-1 tuyệt đối** giữa 49 Use Cases nghiệp vụ với toàn bộ thành phần mã nguồn, cơ sở dữ liệu và kiểm thử tự động:

| Use Case ID | Tên Yêu Cầu (Use Case Name) | Tác Nhân | Backend Controller & Endpoint | Tệp Frontend & Tuyến Route | Bảng CSDL & Flyway | Lớp Kiểm Thử (Unit Test Class) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **UC-COMM-01** | **Xác Thực Kép & Single Sign-On** | Tất cả vai trò | `AuthController`<br>`/api/v1/auth/login` | `LoginPage.tsx`<br>`/login` | `users`<br>`V1` | `AuthServiceTest.java` | **100% PASS** |
| **UC-COMM-02** | **Đăng Xuất An Toàn & Hủy Cookie Phiên** | Tất cả vai trò đã đăng nhập | `AuthController`<br>`/api/v1/auth/logout` | `Navbar / Sidebar Logout Button`<br>`Tất cả layouts (AdminLayout` | `users`<br>`V1` | `AuthServiceTest.java` | **100% PASS** |
| **UC-COMM-03** | **Đổi Mật Khẩu & Bảo Mật Bcrypt** | Tất cả vai trò đã đăng nhập | `AuthController`<br>`/api/v1/auth/reset-password` | `ResetPasswordPage.tsx`<br>`/reset-password` | `users`<br>`V1` | `AuthServicePasswordResetTest.java` | **100% PASS** |
| **UC-COMM-04** | **Quản Lý & Cập Nhật Hồ Sơ Căn Cước Y Tế** | Patient, Doctor, Admin | `PatientProfileController`<br>`/api/v1/patient/profile` | `PatientDashboard.tsx (Tab Hồ sơ bệnh án)`<br>`/patient` | `patient_profiles`<br>`V1` | `PatientProfileServiceTest.java` | **100% PASS** |
| **UC-COMM-05** | **Quên Mật Khẩu & Đặt Lại Qua Token Hash SHA-256** | Tất cả người dùng | `AuthController`<br>`/api/v1/auth/forgot-password` | `ForgotPasswordPage.tsx`<br>`/forgot-password` | `password_reset_tokens`<br>`V16` | `AuthServicePasswordResetTest.java` | **100% PASS** |
| **UC-COMM-06** | **Rào Chắn Xác Thực Địa Chỉ Email** | Tất cả người dùng mới đăng ký | `AuthController`<br>`/api/v1/auth/verify-email` | `VerifyEmailPage.tsx`<br>`/verify-email` | `email_verification_tokens`<br>`V22` | `AuthServiceEmailVerificationTest.java` | **100% PASS** |
| **UC-PAT-01** | **Phân Luồng Triệu Chứng Bằng AI Đa Lượt & Xuất SBAR** | Patient | `TriageController`<br>`/api/v1/triage/assess` | `SymptomTriagePage.tsx`<br>`/patient/triage` | `triage_sessions`<br>`V1` | `TriageServiceTest.java` | **100% PASS** |
| **UC-PAT-02** | **Hệ Thống Phòng Thủ Lâm Sàng 5 Cấp Độ** | Patient | `TriageController, MedicalDocumentController`<br>`/api/v1/triage/assess` | `SymptomTriagePage.tsx`<br>`/patient/triage` | `specialties`<br>`V1` | `ClinicalQueryDefenseEngineTest.java` | **100% PASS** |
| **UC-PAT-03** | **Tìm Kiếm Bác Sĩ Bằng Vector Tương Đồng & Xếp Hạng WHRF** | Patient | `TriageController, DoctorController`<br>`/api/v1/triage/search/semantic` | `DoctorSearchPage.tsx`<br>`/patient/doctors` | `doctor_profiles`<br>`V1` | `DoctorSemanticSearchServiceTest.java` | **100% PASS** |
| **UC-PAT-04** | **Xem Chi Tiết Bác Sĩ, Chứng Chỉ CCHN & Khung Giờ Khám** | Patient | `DoctorController`<br>`/api/v1/doctors/{id}` | `DoctorSearchPage.tsx`<br>`/patient/doctors` | `doctor_profiles`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-PAT-05** | **Tải Lên Hồ Sơ Cận Lâm Sàng & Phân Tích OCR Đa Phương Thức** | Patient | `MedicalDocumentController`<br>`/api/v1/documents/analyze` | `DocumentSummarizerPage.tsx`<br>`/patient/documents` | `medical_documents`<br>`V4` | `MedicalDocumentAnalysisServiceTest.java` | **100% PASS** |
| **UC-PAT-06** | **Tra Cứu Chỉ Số Sinh Học, Mã Hóa LOINC & Tóm Tắt Dễ Hiểu** | Patient | `MedicalDocumentController`<br>`/api/v1/documents/{id}/analysis` | `DocumentSummarizerPage.tsx`<br>`/patient/documents` | `medical_documents`<br>`V4` | `MedicalDocumentAnalysisServiceTest.java` | **100% PASS** |
| **UC-PAT-07** | **Tải & Xem Tệp Gốc Qua Signed URL Ngắn Hạn 15 Phút** | Patient, Doctor | `MedicalDocumentController`<br>`/api/v1/documents/{id}/signed-url` | `DocumentSummarizerPage.tsx`<br>`/patient/documents` | `medical_documents`<br>`V20` | `MedicalDocumentFileAccessServiceTest.java` | **100% PASS** |
| **UC-PAT-08** | **Nạp Lượt Quét & Kích Hoạt Hội Viên MediPass VIP** | Patient | `MedicalDocumentController, PaymentController`<br>`/api/v1/documents/quota/purchase` | `DocumentSummarizerPage.tsx (Nạp lượt phân tích)`<br>`/patient/documents` | `users`<br>`V4` | `MedicalDocumentAnalysisServiceTest.java` | **100% PASS** |
| **UC-PAT-09** | **Đặt Lịch Khám Trực Tiếp, Chống Race Condition & Cấp Số STT** | Patient | `AppointmentController`<br>`/api/v1/appointments` | `DoctorSearchPage.tsx`<br>`/patient/doctors` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-PAT-10** | **Thanh Toán Đa Cổng VietQR / Stripe Sandbox & Đối Soát Sổ Cái** | Patient | `PaymentController`<br>`/api/v1/payments/checkout` | `PaymentSuccessPage.tsx`<br>`/payment/success` | `payment_transactions`<br>`V13` | `PaymentServiceTest.java` | **100% PASS** |
| **UC-PAT-11** | **Xem Phiếu Khám Điện Tử & Mã QR Vào Phòng Khám** | Patient | `AppointmentController`<br>`/api/v1/appointments/{id}/ticket` | `PatientDashboard.tsx`<br>`/patient` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-PAT-12** | **Tra Cứu Lịch Sử Khám Bệnh & Trạng Thái Lịch Hẹn** | Patient | `AppointmentController`<br>`/api/v1/appointments/my` | `PatientDashboard.tsx (Tab Lịch hẹn)`<br>`/patient` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-PAT-13** | **Check-in Bệnh Nhân Khi Đến Phòng Khám** | Patient, Doctor, Admin | `AppointmentController`<br>`/api/v1/appointments/{id}/check-in` | `DoctorDashboard.tsx`<br>`/doctor` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-PAT-14** | **Dời Lịch Hẹn Sang Khung Giờ Mới** | Patient | `AppointmentController`<br>`/api/v1/appointments/{id}/reschedule` | `PatientDashboard.tsx (Action Đổi lịch)`<br>`/patient` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-PAT-15** | **Hủy Lịch Hẹn & Tự Động Hoàn Tiền Theo Chính Sách** | Patient | `AppointmentController`<br>`/api/v1/appointments/{id}/status` | `PatientDashboard.tsx (Action Hủy lịch)`<br>`/patient` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-PAT-16** | **Đánh Giá & Chấm Sao Bác Sĩ Sau Ca Khám** | Patient | `DoctorReviewController`<br>`/api/v1/appointments/{id}/review` | `PatientDashboard.tsx`<br>`/patient` | `doctor_reviews`<br>`V17` | `DoctorReviewServiceTest.java` | **100% PASS** |
| **UC-PAT-17** | **Tra Cứu Lịch Sử Phân Luồng Triage AI & Tóm Tắt SBAR** | Patient | `TriageController`<br>`/api/v1/triage/history` | `SymptomTriagePage.tsx (Tab Lịch sử tư vấn)`<br>`/patient/triage` | `triage_sessions`<br>`V1` | `TriageServiceTest.java` | **100% PASS** |
| **UC-PAT-18** | **Khử Định Danh Dữ Liệu PII Y Tế Chuẩn NĐ 13/2023 & HIPAA** | Patient, Doctor, Admin | `MedicalPiiController`<br>`/api/v1/pii/deidentify` | `DocumentSummarizerPage.tsx (Bảo vệ PII trước khi gửi AI)`<br>`/patient/documents` | `N/A (Stateless Memory)`<br>`N/A` | `MedicalPiiServiceTest.java` | **100% PASS** |
| **UC-DOC-01** | **Trạm Lâm Sàng Thời Gian Thực, KPIs & Tiến Độ Ca Khám** | Doctor | `DoctorController`<br>`/api/v1/doctors/me/stats` | `DoctorDashboard.tsx`<br>`/doctor` | `doctor_profiles`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-DOC-02** | **Cấu Hình & Khóa Khung Giờ Khám Tuần Hoàn** | Doctor | `DoctorController`<br>`/api/v1/doctors/me/schedules` | `DoctorProfilePage.tsx`<br>`/doctor/profile` | `doctor_schedule_slots`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-DOC-03** | **Điều Phối Hàng Đợi Bệnh Nhân & Gọi Khám Kế Tiếp Theo STT** | Doctor | `DoctorController`<br>`/api/v1/doctors/me/call-next` | `DoctorDashboard.tsx`<br>`/doctor` | `doctor_profiles`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-DOC-04** | **Khảo Sát Lâm Sàng Chia Màn Hình Pre-Encounter Split-Screen** | Doctor | `MedicalDocumentController, TriageController`<br>`/api/v1/documents/{id}/file` | `DoctorDashboard.tsx (Split View)`<br>`/doctor` | `medical_documents`<br>`V20` | `MedicalDocumentFileAccessServiceTest.java` | **100% PASS** |
| **UC-DOC-05** | **Kiểm Soát Quyền Truy Cập Hồ Sơ Bệnh Nhân Qua PatientAccessGuard** | Doctor | `AppointmentController, PatientProfileController, MedicalDocumentController`<br>`/api/v1/appointments/patient/{patientId}` | `DoctorPatientRecordsPage.tsx`<br>`/doctor/patients` | `appointments`<br>`V1` | `PatientAccessGuardTest.java` | **100% PASS** |
| **UC-DOC-06** | **Gợi Ý & Tự Động Hoàn Thành Mã Chẩn Đoán WHO ICD-10** | Doctor | `ClinicalOntologyController`<br>`/api/v1/clinical/ontology/icd10` | `DoctorDashboard.tsx (Modal Kết thúc ca khám)`<br>`/doctor` | `N/A (In-Memory Caffeine L1 + QĐ 7603/QĐ-BYT)`<br>`V23` | `ClinicalOntologyServiceTest.java` | **100% PASS** |
| **UC-DOC-07** | **Gợi Ý & Chuẩn Hóa Chỉ Số Xét Nghiệm Theo LOINC** | Doctor | `ClinicalOntologyController`<br>`/api/v1/clinical/ontology/lab-indicators` | `DoctorDashboard.tsx`<br>`/doctor` | `N/A (In-Memory Caffeine L1)`<br>`N/A` | `ClinicalOntologyServiceTest.java` | **100% PASS** |
| **UC-DOC-08** | **Hoàn Tất Khám Lâm Sàng, Lưu Sinh Hiệu, Chẩn Đoán & Kê Đơn Thuốc** | Doctor | `AppointmentController`<br>`/api/v1/appointments/{id}/complete-clinical` | `DoctorDashboard.tsx (Modal Khám lâm sàng)`<br>`/doctor` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-DOC-09** | **Lên Lịch Hẹn Tái Khám Trực Tiếp Cho Bệnh Nhân** | Doctor | `AppointmentController`<br>`/api/v1/appointments/follow-up` | `DoctorDashboard.tsx (Form Hẹn tái khám)`<br>`/doctor` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-DOC-10** | **Bác Sĩ Hủy Lịch Khẩn Cấp & Tự Động Hoàn Tiền 100% Cho Bệnh Nhân** | Doctor | `AppointmentController`<br>`/api/v1/appointments/{id}/status` | `DoctorDashboard.tsx (Action Hủy ca khám)`<br>`/doctor` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-DOC-11** | **Theo Dõi Đánh Giá, Phản Hồi & Thang Điểm Uy Tín Của Bác Sĩ** | Doctor | `DoctorReviewController`<br>`/api/v1/doctors/{doctorId}/reviews` | `DoctorProfilePage.tsx`<br>`/doctor/profile` | `doctor_reviews`<br>`V17` | `DoctorReviewServiceTest.java` | **100% PASS** |
| **UC-DOC-12** | **Cập Nhật Hồ Sơ Chuyên Môn, Tiểu Sử & Tự Động Tái Tạo Vector AI** | Doctor | `DoctorController`<br>`/api/v1/doctors/me/profile` | `DoctorProfilePage.tsx`<br>`/doctor/profile` | `doctor_profiles`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-DOC-13** | **Xuất Phiếu Khám & Đơn Thuốc Điện Tử Ra Tệp PDF Chuẩn Meddies** | Doctor, Patient | `MedicalDocumentController, AppointmentController`<br>`/api/v1/documents/sample-random-pdf` | `DoctorDashboard.tsx`<br>`/doctor` | `appointments`<br>`V1` | `MeddiesPdfGeneratorServiceTest.java` | **100% PASS** |
| **UC-DOC-14** | **Quản Lý & Đăng Ký Danh Mục Chuyên Khoa Khám Bệnh** | Doctor | `SpecialtyController, DoctorController`<br>`/api/v1/specialties` | `DoctorProfilePage.tsx`<br>`/doctor/profile` | `specialties`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-ADM-01** | **Giám Sát Vận Hành Toàn Viện, KPIs & Sức Khỏe Hạ Tầng** | Admin | `AdminController, HealthController`<br>`/api/v1/admin/stats` | `AdminDashboard.tsx`<br>`/admin` | `users`<br>`V1` | `AdminVettingServiceTest.java` | **100% PASS** |
| **UC-ADM-02** | **Giám Sát FinOps Tiêu Thụ Token & Chi Phí Mô Hình AI** | Admin | `AdminController`<br>`/api/v1/admin/ai-usage` | `AdminDashboard.tsx (Card FinOps AI Analytics)`<br>`/admin` | `ai_token_usage`<br>`V18` | `AiUsageAnalyticsServiceTest.java` | **100% PASS** |
| **UC-ADM-03** | **Chuyển Đổi Nhà Cung Cấp Mô Hình AI & Kiểm Thử Fallback Offline** | Admin | `SystemConfigController`<br>`/api/v1/system/ai-mode/toggle` | `AdminDashboard.tsx (Công tắc AI Engine Switcher)`<br>`/admin` | `doctor_profiles`<br>`V10` | `SystemConfigControllerTest.java` | **100% PASS** |
| **UC-ADM-04** | **Đồng Bộ Hóa Hàng Loạt Vector Embedding Bác Sĩ** | Admin | `AdminController, SystemConfigController`<br>`/api/v1/admin/doctors/sync-vectors` | `DoctorManagementPage.tsx (Nút Đồng bộ Vector)`<br>`/admin/doctors` | `doctor_profiles`<br>`V10` | `EmbeddingServiceTest.java` | **100% PASS** |
| **UC-ADM-05** | **Thẩm Định Chứng Chỉ Hành Nghề CCHN & Phê Duyệt Bác Sĩ** | Admin | `AdminController`<br>`/api/v1/admin/doctors/{id}/vet` | `DoctorManagementPage.tsx`<br>`/admin/doctors` | `doctor_profiles`<br>`V1` | `AdminVettingServiceTest.java` | **100% PASS** |
| **UC-ADM-06** | **Quản Lý Danh Sách, Phân Trang Offset & Trạng Thái Bác Sĩ** | Admin | `AdminController`<br>`/api/v1/admin/doctors/paged` | `DoctorManagementPage.tsx`<br>`/admin/doctors` | `doctor_profiles`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-ADM-07** | **Quản Trị Tài Khoản Người Dùng, Phân Quyền RBAC & Khóa Tài Khoản** | Admin | `AdminController`<br>`/api/v1/admin/users` | `UserManagementPage.tsx`<br>`/admin/users` | `users`<br>`V1` | `SecurityHardeningTest.java` | **100% PASS** |
| **UC-ADM-08** | **Quản Lý Danh Mục Chuyên Khoa Lâm Sàng Toàn Viện** | Admin | `AdminController, SpecialtyController`<br>`/api/v1/admin/specialties` | `SpecialtyManagementPage.tsx`<br>`/admin/specialties` | `specialties`<br>`V1` | `DoctorServiceTest.java` | **100% PASS** |
| **UC-ADM-09** | **Giám Sát Toàn Bộ Lịch Hẹn Khám Bệnh & Can Thiệp Hủy Cưỡng Chế** | Admin | `AdminController`<br>`/api/v1/admin/appointments` | `AppointmentSupervisionPage.tsx`<br>`/admin/appointments` | `appointments`<br>`V1` | `AppointmentServiceTest.java` | **100% PASS** |
| **UC-ADM-10** | **Giám Sát An Toàn Các Phiên Phân Luồng Triage AI** | Admin | `AdminController`<br>`/api/v1/admin/triage-sessions` | `TriageSupervisionPage.tsx`<br>`/admin/triage` | `triage_sessions`<br>`V1` | `TriageServiceTest.java` | **100% PASS** |
| **UC-ADM-11** | **Nhật Ký Kiểm Toán An Ninh Bất Biến & Chống IDOR** | Admin | `AdminController`<br>`/api/v1/admin/audit-logs` | `AuditLogPage.tsx`<br>`/admin/audit-logs` | `audit_logs`<br>`V1` | `PatientAccessGuardTest.java` | **100% PASS** |

---

## 3. Bản Đồ Bộ 5 Thuật Toán Độc Quyền Cấp Doanh Nghiệp

Hệ thống tích hợp 5 thuật toán chuyên sâu để giải quyết bài toán hiệu năng cao, chống nghẽn và an toàn y tế lâm sàng:

| Thuật Toán | Mục Tiêu & Vấn Đề Giải Quyết | Triển Khai Trong Mã Nguồn | Độ Phức Tạp | Vị Trí Lưu Trữ |
| :--- | :--- | :--- | :---: | :--- |
| **1. Hedged Requests Pattern** | Xóa bỏ độ trễ đuôi (p99 latency spikes) khi gọi LLM ngoài; đua song song giữa Google Gemini & Local Fallback sau 1500ms. | `ClinicalRagService.java`, `AiModelRouterTest.java` | $\mathcal{O}(1)$ | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md#thuật-toán-1) |
| **2. Progressive Sieve** | Sàng lọc 5 tầng từ vựng y tế, khử tiếng lóng teen-code, bóc tách phủ định NegEx và chặn 115 cờ đỏ cấp cứu y khoa. | `ClinicalQueryDefenseEngine.java`, `RedFlagService.java` | $\mathcal{O}(N)$ | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md#thuật-toán-2) |
| **3. XFetch (Probabilistic Early Expiration)** | Chống bão tuyết cache (Cache Stampede) trên Redis L2 cho 500+ truy vấn bác sĩ đồng thời; tính toán xác suất $\Delta \cdot \beta \cdot \ln(\text{rand()})$. | `TwoLayerCacheService.java`, `TwoLayerCacheServiceTest.java` | $\mathcal{O}(1)$ | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md#thuật-toán-3) |
| **4. WHRF-SOTA Re-ranking** | Xếp hạng bác sĩ đa mục tiêu: kết hợp độ tương đồng Cosine 1536 chiều với tỷ lệ đặt khám, điểm đánh giá sao và kinh nghiệm thực chiến. | `DoctorSemanticSearchService.java`, `DoctorSemanticSearchServiceTest.java` | $\mathcal{O}(K \log K)$ | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md#thuật-toán-4) |
| **5. Slotted Concurrency Collision Guard** | Ngăn chặn Race Condition và trùng lịch khám (Double Booking) khi hàng trăm bệnh nhân cùng bấm đặt 1 khung giờ. | `AppointmentService.java`, `AppointmentServiceTest.java` | $\mathcal{O}(1)$ | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md#thuật-toán-5) |

---

## 4. Bản Đồ Cơ Sở Dữ Liệu & 23 Bản Di Trú Flyway (V1 - V23)

Cơ sở dữ liệu PostgreSQL 16 tích hợp extension `pgvector` được di trú và quản lý nghiêm ngặt qua 23 bản Flyway:

| Phiên Bản Flyway | Tên Tệp Di Trú (Migration File) | Mục Tiêu & Bảng Thay Đổi | Vai Trò Trong Đồ Án |
| :---: | :--- | :--- | :--- |
| **V1** | `V1__initial_schema.sql` | Khởi tạo 11 bảng cốt lõi (users, specialties, doctor_profiles, appointments, triage_sessions, v.v.) | Nền tảng CSDL cốt lõi |
| **V2** | `V2__seed_rich_hospital_data.sql` | Seed 10 bác sĩ mẫu, lịch khám, chuyên khoa và bệnh viện thực tế | Dữ liệu thử nghiệm |
| **V3** | `V3__account_lockout_and_security_hardening.sql` | Thêm cột khóa tài khoản `failed_attempts`, `locked_until` cho bảo mật | Phòng thủ Brute-force |
| **V4** | `V4__cloud_storage_and_quota_management.sql` | Bảng `medical_documents`, quản trị quota phân tích cận lâm sàng | Phân hệ OCR tài liệu |
| **V5** | `V5__add_document_analysis_metadata.sql` | Bảng `document_analyses`, lưu trữ JSON kết quả bóc tách chỉ số và hash SHA-256 | Phân tích AI đa phương thức |
| **V6** | `V6__fix_user_status_and_audit_logs.sql` | Bảng `audit_logs`, enum UserStatus, lưu vết truy cập IDOR | Nhật ký kiểm toán an ninh |
| **V7** | `V7__slot_collision_guard_and_dedup_constraints.sql` | Ràng buộc duy nhất `unique_slot_booking`, chống Race Condition đặt lịch | Chống trùng lịch |
| **V8** | `V8__allow_null_password_hash_for_oauth.sql` | Cho phép `password_hash` null khi đăng nhập qua Google OAuth2 | Tích hợp Google SSO |
| **V9** | `V9__verify_all_specialties_and_seed_pending_doctors.sql` | Seed bác sĩ chờ thẩm định CCHN và xác minh danh mục chuyên khoa | Thẩm định bác sĩ |
| **V10** | `V10__optimize_doctor_hnsw_index.sql` | Khởi tạo HNSW Vector Index trên vector 1536-d (`m=16, ef_construction=64`) | Tìm kiếm ngữ nghĩa |
| **V11** | `V11__add_composite_performance_indexes.sql` | Thêm Composite Index trên `appointments(doctor_id, appointment_date)` | Tối ưu hóa truy vấn |
| **V12** | `V12__supervision_and_realtime_performance_indexes.sql` | Tối ưu hóa các truy vấn Dashboard Admin và Trạm lâm sàng Bác sĩ | Giám sát thời gian thực |
| **V13** | `V13__create_payment_transactions.sql` | Bảng `payment_transactions`, quản lý mã giao dịch, số tiền và trạng thái thanh toán | Sổ cái tài chính |
| **V14** | `V14__add_medical_document_to_appointments.sql` | Khóa ngoại `medical_document_id` liên kết hồ sơ cận lâm sàng vào lịch khám | Tương tác lâm sàng O2O |
| **V15** | `V15__add_triage_session_and_refund_to_appointments.sql` | Liên kết `triage_session_id` và các cột hoàn tiền tự động trong `appointments` | Phân luồng & hoàn tiền |
| **V16** | `V16__create_password_reset_and_notifications.sql` | Bảng `password_reset_tokens` và `notifications` cho thông báo nội bộ | Thông báo & đặt lại MK |
| **V17** | `V17__create_doctor_reviews_and_rating_system.sql` | Bảng `doctor_reviews`, tính điểm trung bình và số lượng đánh giá của bác sĩ | Đánh giá bác sĩ |
| **V18** | `V18__align_ai_token_usage_schema.sql` | Bảng `ai_token_usage`, lưu trữ prompt tokens, completion tokens và chi phí FinOps | FinOps Quản trị AI |
| **V19** | `V19__optimize_clinical_pgvector_hnsw_and_hybrid_gin.sql` | Nâng cấp HNSW Index (`m=24, ef_construction=128`) và GIN Trigram index | Vector Search nâng cao |
| **V20** | `V20__private_document_storage_path.sql` | Thêm cột `storage_path`, chuyển đổi sang Supabase Private S3 Storage | Bảo mật tài liệu riêng tư |
| **V21** | `V21__password_reset_token_hash.sql` | Lưu trữ `token_hash` SHA-256 thay vì token thô chống rò rỉ dữ liệu | Bảo mật Zero-Trust |
| **V22** | `V22__email_verification.sql` | Bảng `email_verification_tokens`, xác thực email người dùng khi đăng ký | Kích hoạt tài khoản |
| **V23** | `V23__refactor_icd_code_and_version.sql` | Tái cấu trúc mã chẩn đoán ICD-10 và chuẩn hóa danh mục bệnh QĐ 7603/QĐ-BYT | Chuẩn hóa chẩn đoán lâm sàng |

### Danh Sách 17 Bảng CSDL Chuẩn 3NF & 6 Enums Hệ Thống (23 Files)

| STT | Tên Bảng (Physical Table) | Tệp Entity Java | Khóa Chính (PK) | Các Khóa Ngoại (FK) & Liên Kết Chính |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `users` | `User.java` | `id (UUID)` | Tài khoản gốc của Patient, Doctor, Admin |
| 2 | `specialties` | `Specialty.java` | `id (UUID)` | Danh mục chuyên khoa y tế |
| 3 | `doctor_profiles` | `DoctorProfile.java` | `id (UUID)` | user_id -> users(id) |
| 4 | `doctor_specialties` | `N/A (JPA JoinTable)` | `(doctor_id, specialty_id)` | Liên kết n-n giữa bác sĩ và chuyên khoa |
| 5 | `doctor_schedule_slots` | `DoctorScheduleSlot.java` | `id (UUID)` | doctor_id -> doctor_profiles(id) |
| 6 | `patient_profiles` | `PatientProfile.java` | `id (UUID)` | user_id -> users(id) |
| 7 | `appointments` | `Appointment.java` | `id (UUID)` | patient_id, doctor_id, slot_id, document_id, triage_id |
| 8 | `triage_sessions` | `TriageSession.java` | `id (UUID)` | user_id -> users(id) (có thể null nếu khách vãng lai) |
| 9 | `medical_documents` | `MedicalDocument.java` | `id (UUID)` | patient_id -> users(id) |
| 10 | `document_analyses` | `DocumentAnalysis.java` | `id (UUID)` | document_id -> medical_documents(id) (1-1) |
| 11 | `payment_transactions` | `PaymentTransaction.java` | `id (UUID)` | appointment_id -> appointments(id), user_id -> users(id) |
| 12 | `password_reset_tokens` | `PasswordResetToken.java` | `id (UUID)` | user_id -> users(id) |
| 13 | `email_verification_tokens` | `EmailVerificationToken.java` | `id (UUID)` | user_id -> users(id) |
| 14 | `notifications` | `Notification.java` | `id (UUID)` | user_id -> users(id) |
| 15 | `doctor_reviews` | `DoctorReview.java` | `id (UUID)` | doctor_id -> doctor_profiles(id), appointment_id, patient_id |
| 16 | `audit_logs` | `AuditLog.java` | `id (UUID)` | actor_user_id -> users(id), target_resource_id |
| 17 | `ai_token_usage` | `AiTokenUsage.java` | `id (UUID)` | user_id -> users(id) |

**6 Java Enums:** `Role` (PATIENT, DOCTOR, ADMIN), `UserStatus` (ACTIVE, SUSPENDED, PENDING_VERIFICATION), `AppointmentStatus` (SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED), `PaymentStatus` (PENDING, PAID, FAILED, REFUNDED), `OrderType` (APPOINTMENT_FEE, QUOTA_PURCHASE, MEMBERSHIP_VIP), `TriageUrgencyLevel` (EMERGENT, URGENT, ROUTINE, SELF_CARE).

---

## 5. Danh Mục Toàn Diện 15 Controllers & 87 REST Endpoints

Dưới đây là **toàn bộ 87 endpoints vật lý** được biên dịch và vận hành trong mã nguồn:

| STT | Controller | HTTP Verb | Full Endpoint Path | Java Method Name | PreAuthorize / Bảo Mật | Use Case |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| 1 | `AdminController` | `GET` | `/api/v1/admin/ai-usage` | `getAiUsageStats` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-02** |
| 2 | `AdminController` | `GET` | `/api/v1/admin/doctors` | `getAllDoctors` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-06** |
| 3 | `AdminController` | `GET` | `/api/v1/admin/doctors/paged` | `getDoctorsPaged` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-06** |
| 4 | `AdminController` | `POST` | `/api/v1/admin/doctors` | `createDoctor` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-06** |
| 5 | `AdminController` | `PUT` | `/api/v1/admin/doctors/{id}` | `updateDoctor` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-06** |
| 6 | `AdminController` | `PATCH` | `/api/v1/admin/doctors/{id}/toggle-status` | `toggleDoctorStatus` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-06** |
| 7 | `AdminController` | `POST` | `/api/v1/admin/doctors/{id}/sync-vector` | `syncDoctorVector` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-04** |
| 8 | `AdminController` | `POST` | `/api/v1/admin/doctors/sync-vectors` | `syncAllDoctorVectors` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-04** |
| 9 | `AdminController` | `GET` | `/api/v1/admin/doctors/pending` | `getPendingDoctors` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-05** |
| 10 | `AdminController` | `POST` | `/api/v1/admin/doctors/{id}/vet` | `vetDoctor` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-05** |
| 11 | `AdminController` | `GET` | `/api/v1/admin/users` | `getAllUsers` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-07** |
| 12 | `AdminController` | `PATCH` | `/api/v1/admin/users/{id}/status` | `updateUserStatus` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-07** |
| 13 | `AdminController` | `POST` | `/api/v1/admin/specialties` | `createSpecialty` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-08** |
| 14 | `AdminController` | `GET` | `/api/v1/admin/stats` | `getSystemStats` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-01** |
| 15 | `AdminController` | `GET` | `/api/v1/admin/appointments` | `getAllAppointments` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-09** |
| 16 | `AdminController` | `PATCH` | `/api/v1/admin/appointments/{id}/cancel` | `adminCancelAppointment` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-09** |
| 17 | `AdminController` | `GET` | `/api/v1/admin/triage-sessions` | `getTriageSessions` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-10** |
| 18 | `AdminController` | `GET` | `/api/v1/admin/audit-logs` | `getAuditLogs` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-11** |
| 19 | `AppointmentController` | `POST` | `/api/v1/appointments` | `bookAppointment` | `hasAnyRole('PATIENT', 'ADMIN` | **UC-PAT-09** |
| 20 | `AppointmentController` | `GET` | `/api/v1/appointments/my` | `getMyAppointments` | `isAuthenticated()` | **UC-PAT-12** |
| 21 | `AppointmentController` | `PATCH` | `/api/v1/appointments/{id}/status` | `updateStatus` | `isAuthenticated()` | **UC-PAT-15, UC-DOC-10** |
| 22 | `AppointmentController` | `PATCH` | `/api/v1/appointments/{id}/reschedule` | `rescheduleAppointment` | `isAuthenticated()` | **UC-PAT-14** |
| 23 | `AppointmentController` | `POST` | `/api/v1/appointments/{id}/complete-clinical` | `completeClinical` | `hasRole('DOCTOR` | **UC-DOC-08** |
| 24 | `AppointmentController` | `GET` | `/api/v1/appointments/patient/{patientId}` | `getPatientHistory` | `hasAnyRole('DOCTOR', 'ADMIN` | **UC-DOC-05** |
| 25 | `AppointmentController` | `POST` | `/api/v1/appointments/follow-up` | `createFollowUp` | `hasRole('DOCTOR` | **UC-DOC-09** |
| 26 | `AppointmentController` | `GET` | `/api/v1/appointments/{id}/ticket` | `getTicket` | `isAuthenticated()` | **UC-PAT-11, UC-DOC-13** |
| 27 | `AppointmentController` | `PATCH` | `/api/v1/appointments/{id}/check-in` | `checkIn` | `hasAnyRole('DOCTOR', 'ADMIN` | **UC-PAT-13** |
| 28 | `AuthController` | `POST` | `/api/v1/auth/login` | `login` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-01** |
| 29 | `AuthController` | `POST` | `/api/v1/auth/register` | `register` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-01, UC-COMM-06** |
| 30 | `AuthController` | `GET` | `/api/v1/auth/me` | `getCurrentUser` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-01** |
| 31 | `AuthController` | `POST` | `/api/v1/auth/logout` | `logout` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-02** |
| 32 | `AuthController` | `POST` | `/api/v1/auth/forgot-password` | `forgotPassword` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-05** |
| 33 | `AuthController` | `GET` | `/api/v1/auth/reset-password/validate` | `validateResetToken` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-05** |
| 34 | `AuthController` | `POST` | `/api/v1/auth/reset-password` | `resetPassword` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-03, UC-COMM-05** |
| 35 | `AuthController` | `POST` | `/api/v1/auth/verify-email` | `verifyEmail` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-06** |
| 36 | `AuthController` | `POST` | `/api/v1/auth/resend-verification` | `resendVerification` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-06** |
| 37 | `ClinicalOntologyController` | `GET` | `/api/v1/clinical/ontology/icd10` | `searchIcd10` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-06** |
| 38 | `ClinicalOntologyController` | `GET` | `/api/v1/clinical/ontology/icd10/{code}` | `getIcd10ByCode` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-06** |
| 39 | `ClinicalOntologyController` | `GET` | `/api/v1/clinical/ontology/lab-indicators` | `searchLabIndicators` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-07** |
| 40 | `ClinicalOntologyController` | `GET` | `/api/v1/clinical/ontology/lab-indicators/{loincCode}` | `getLabIndicatorByLoinc` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-07** |
| 41 | `DoctorController` | `GET` | `/api/v1/doctors` | `getDoctors` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-03** |
| 42 | `DoctorController` | `GET` | `/api/v1/doctors/{id}` | `getDoctorById` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-04** |
| 43 | `DoctorController` | `GET` | `/api/v1/doctors/{id}/slots` | `getDoctorSlots` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-04** |
| 44 | `DoctorController` | `PUT` | `/api/v1/doctors/me/profile` | `updateMyProfile` | `hasRole('DOCTOR` | **UC-DOC-12, UC-DOC-14** |
| 45 | `DoctorController` | `GET` | `/api/v1/doctors/me/stats` | `getMyStats` | `hasRole('DOCTOR` | **UC-DOC-01** |
| 46 | `DoctorController` | `GET` | `/api/v1/doctors/me/schedules` | `getMySchedules` | `hasRole('DOCTOR` | **UC-DOC-02** |
| 47 | `DoctorController` | `PUT` | `/api/v1/doctors/me/schedules` | `updateMySchedules` | `hasRole('DOCTOR` | **UC-DOC-02** |
| 48 | `DoctorController` | `GET` | `/api/v1/doctors/me/patients` | `getMyPatients` | `hasRole('DOCTOR` | **UC-DOC-03** |
| 49 | `DoctorController` | `POST` | `/api/v1/doctors/me/call-next` | `callNextPatient` | `hasRole('DOCTOR` | **UC-DOC-03** |
| 50 | `DoctorReviewController` | `POST` | `/api/v1/appointments/{id}/review` | `submitReview` | `hasRole('PATIENT` | **UC-PAT-16** |
| 51 | `DoctorReviewController` | `GET` | `/api/v1/appointments/{id}/review` | `getAppointmentReview` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-16** |
| 52 | `DoctorReviewController` | `GET` | `/api/v1/doctors/{doctorId}/reviews` | `getDoctorReviews` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-11** |
| 53 | `DoctorReviewController` | `GET` | `/api/v1/reviews/my` | `getMyReviews` | `hasRole('PATIENT` | **UC-PAT-16** |
| 54 | `HealthController` | `GET` | `/` | `checkLiveness` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-01** |
| 55 | `HealthController` | `GET` | `/ready` | `checkReadiness` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-01** |
| 56 | `MedicalDocumentController` | `POST` | `/api/v1/documents/analyze` | `analyzeDocument` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-05** |
| 57 | `MedicalDocumentController` | `POST` | `/api/v1/documents/analyze-preview` | `analyzeDocumentPreview` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-05** |
| 58 | `MedicalDocumentController` | `GET` | `/api/v1/documents/my` | `getMyDocuments` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-06** |
| 59 | `MedicalDocumentController` | `GET` | `/api/v1/documents/patient/{patientId}` | `getPatientDocuments` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-05** |
| 60 | `MedicalDocumentController` | `GET` | `/api/v1/documents/quota` | `getUserQuota` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-08** |
| 61 | `MedicalDocumentController` | `POST` | `/api/v1/documents/quota/purchase` | `purchaseQuota` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-08** |
| 62 | `MedicalDocumentController` | `GET` | `/api/v1/documents/sample-random-pdf` | `downloadSampleRandomPdf` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-13** |
| 63 | `MedicalDocumentController` | `GET` | `/api/v1/documents/{id}/analysis` | `getDocumentAnalysis` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-06** |
| 64 | `MedicalDocumentController` | `GET` | `/api/v1/documents/{id}/signed-url` | `getSignedFileUrl` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-07** |
| 65 | `MedicalDocumentController` | `GET` | `/api/v1/documents/{id}/file` | `viewOrDownloadFile` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-07, UC-DOC-04** |
| 66 | `MedicalPiiController` | `POST` | `/api/v1/pii/deidentify` | `deidentifyText` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-18** |
| 67 | `NotificationController` | `GET` | `/api/v1/notifications/my` | `getMyNotifications` | `isAuthenticated()` | **UC-COMM-04, UC-PAT-09** |
| 68 | `NotificationController` | `GET` | `/api/v1/notifications/unread-count` | `getUnreadCount` | `isAuthenticated()` | **UC-COMM-04, UC-PAT-09** |
| 69 | `NotificationController` | `PATCH` | `/api/v1/notifications/{id}/read` | `markAsRead` | `isAuthenticated()` | **UC-COMM-04, UC-PAT-09** |
| 70 | `NotificationController` | `PATCH` | `/api/v1/notifications/read-all` | `markAllAsRead` | `isAuthenticated()` | **UC-COMM-04, UC-PAT-09** |
| 71 | `PatientProfileController` | `GET` | `/api/v1/patient/profile` | `getMyProfile` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-04** |
| 72 | `PatientProfileController` | `PUT` | `/api/v1/patient/profile` | `updateMyProfile` | `PUBLIC / AUTH_DEFAULT` | **UC-COMM-04** |
| 73 | `PatientProfileController` | `GET` | `/api/v1/patient/profile/by-user/{userId}` | `getProfileByUserId` | `hasAnyRole('DOCTOR', 'ADMIN` | **UC-DOC-05** |
| 74 | `PaymentController` | `POST` | `/api/v1/payments/checkout` | `createCheckout` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-10** |
| 75 | `PaymentController` | `POST` | `/api/v1/payments/verify` | `verifyPayment` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-10** |
| 76 | `PaymentController` | `POST` | `/api/v1/payments/webhook/stripe` | `handleStripeWebhook` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-10** |
| 77 | `PaymentController` | `GET` | `/api/v1/payments/history` | `getPaymentHistory` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-10** |
| 78 | `PaymentController` | `GET` | `/api/v1/payments/packages` | `getPricingPackages` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-08** |
| 79 | `PaymentController` | `GET` | `/api/v1/payments/transactions/{code}` | `getTransactionDetails` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-10** |
| 80 | `SpecialtyController` | `GET` | `/api/v1/specialties` | `getSpecialties` | `PUBLIC / AUTH_DEFAULT` | **UC-DOC-14, UC-ADM-08** |
| 81 | `SystemConfigController` | `GET` | `/api/v1/system/ai-mode` | `getAiModeStatus` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-03** |
| 82 | `SystemConfigController` | `POST` | `/api/v1/system/ai-mode/toggle` | `toggleAiMode` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-03** |
| 83 | `SystemConfigController` | `POST` | `/api/v1/system/ai-mode/sync-vectors` | `syncDoctorVectors` | `PUBLIC / AUTH_DEFAULT` | **UC-ADM-03, UC-ADM-04** |
| 84 | `TriageController` | `POST` | `/api/v1/triage/assess` | `assessSymptoms` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-01, UC-PAT-02** |
| 85 | `TriageController` | `GET` | `/api/v1/triage/history` | `getHistory` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-17** |
| 86 | `TriageController` | `GET` | `/api/v1/triage/search/semantic` | `searchDoctorsSemantic` | `PUBLIC / AUTH_DEFAULT` | **UC-PAT-03** |
| 87 | `TriageController` | `GET` | `/api/v1/triage/patient/{patientId}` | `getPatientTriageHistory` | `hasAnyRole('DOCTOR', 'ADMIN` | **UC-DOC-04, UC-DOC-05** |

---

## 6. Danh Mục Toàn Diện 31 Backend Services & 16 Repositories

### Danh Sách 31 Backend Services

| STT | Tên Dịch Vụ (Service Class) | Trách Nhiệm Cốt Lõi | Các Use Cases Phục Vụ |
| :---: | :--- | :--- | :--- |
| 1 | `AdminVettingService` | Thẩm định giấy phép hành nghề y (CCHN), phê duyệt và quản lý trạng thái xác thực bác sĩ | **UC-ADM-01, UC-ADM-05** |
| 2 | `AiUsageAnalyticsService` | Theo dõi thống kê tiêu thụ token AI và tính toán chi phí FinOps theo USD / VNĐ | **UC-ADM-02** |
| 3 | `AppointmentRefundService` | Tính toán và thực thi chính sách hoàn tiền tự động nhiều cấp độ khi hủy lịch khám | **UC-PAT-15, UC-DOC-10, UC-ADM-09** |
| 4 | `AppointmentService` | Quản lý vòng đời lịch khám, chống Race Condition, cấp số STT và kết thúc ca khám lâm sàng | **UC-PAT-09..15, UC-DOC-03, UC-DOC-08..10, UC-ADM-09** |
| 5 | `AuthService` | Xác thực kép JWT + Cookie, đăng ký, đăng nhập SSO Google, đổi và đặt lại mật khẩu | **UC-COMM-01..03, UC-COMM-05..06, UC-ADM-07** |
| 6 | `ClinicalOntologyService` | Tra cứu bản thể luận y tế WHO ICD-10 (QĐ 7603) và chỉ số xét nghiệm LOINC (QĐ 3280) | **UC-PAT-01, UC-PAT-06, UC-DOC-06, UC-DOC-07** |
| 7 | `ClinicalQueryDefenseEngine` | Phòng thủ 5 cấp: Chặn 115 cờ đỏ cấp cứu, teen-code slang, NegEx phủ định và OOD chatter | **UC-PAT-01, UC-PAT-02** |
| 8 | `ClinicalRagService` | Điều phối RAG lâm sàng, Hedged Requests đa mô hình AI (Gemini, OpenRouter, Local Fallback) | **UC-PAT-01** |
| 9 | `DoctorReviewService` | Quản lý đánh giá sao và nhận xét của bệnh nhân, tính điểm tín nhiệm bác sĩ | **UC-PAT-16, UC-DOC-11** |
| 10 | `DoctorSemanticSearchService` | Tìm kiếm bác sĩ bằng vector ngữ nghĩa 1536 chiều pgvector HNSW và xếp hạng WHRF | **UC-PAT-03, UC-ADM-03** |
| 11 | `DoctorService` | Quản lý hồ sơ bác sĩ, cấu hình khung giờ khám, điều phối hàng đợi và đồng bộ vector | **UC-PAT-03..04, UC-DOC-01..03, UC-DOC-12..14, UC-ADM-04..08** |
| 12 | `EmailVerificationGuard` | Rào chắn kiểm tra trạng thái kích hoạt tài khoản email trước khi đặt lịch hoặc thanh toán | **UC-COMM-06, UC-PAT-09** |
| 13 | `EmbeddingService` | Tạo vector nhúng 1536 chiều từ mô hình OpenAI text-embedding-3-small hoặc Fallback | **UC-PAT-03, UC-DOC-12, UC-ADM-03, UC-ADM-04** |
| 14 | `MeddiesPdfGeneratorService` | Xuất phiếu khám bệnh và đơn thuốc điện tử ra định dạng PDF chuẩn Meddies | **UC-DOC-13** |
| 15 | `MedicalDocumentAnalysisService` | Bóc tách OCR đa phương thức phiếu xét nghiệm, trích xuất biomarkers và tóm tắt AI | **UC-PAT-05, UC-PAT-06, UC-PAT-08** |
| 16 | `MedicalDocumentFileAccessService` | Kiểm soát truy cập tệp y tế và cấp Signed URL ngắn hạn 15 phút từ Supabase S3 | **UC-PAT-07, UC-DOC-04** |
| 17 | `MedicalDocumentValidator` | Kiểm tra tính hợp lệ của tệp y tế (PDF/ảnh, dung lượng <= 10MB, định dạng cho phép) | **UC-PAT-05** |
| 18 | `MedicalPiiService` | Khử định danh PII y tế (CCCD, SĐT, tên) theo Nghị định 13/2023/NĐ-CP và HIPAA | **UC-PAT-18** |
| 19 | `NotificationService` | Gửi và quản lý thông báo nội bộ thời gian thực cho người dùng trong toàn viện | **UC-COMM-04, UC-PAT-09..15, UC-DOC-03, UC-DOC-08..10, UC-ADM-05** |
| 20 | `PatientAccessGuard` | Rào chắn kiểm soát quyền truy cập hồ sơ bệnh án theo quan hệ điều trị và ghi nhật ký IDOR | **UC-PAT-07, UC-DOC-04..05, UC-ADM-11** |
| 21 | `PatientProfileService` | Quản lý hồ sơ y tế căn cước bệnh nhân, nhóm máu, tiền sử bệnh và cảnh báo dị ứng | **UC-COMM-04, UC-DOC-05** |
| 22 | `PaymentService` | Khởi tạo thanh toán VietQR / Stripe Sandbox, xác thực webhook và quản trị giao dịch | **UC-PAT-08, UC-PAT-10** |
| 23 | `PdfExtractionService` | Trích xuất văn bản thô từ tệp PDF bằng Apache PDFBox phục vụ pipeline OCR | **UC-PAT-05** |
| 24 | `RedFlagService` | Bộ quy tắc nhận diện nhanh 115 cờ đỏ cấp cứu y tế để chuyển hướng khẩn cấp | **UC-PAT-01, UC-PAT-02** |
| 25 | `SecurityRateLimiterService` | Chống tấn công Brute-force và khóa tài khoản người dùng sau 5 lần thất bại | **UC-COMM-01, UC-COMM-05..06, UC-ADM-07** |
| 26 | `StorageService` | Giao diện trừu tượng hóa dịch vụ lưu trữ tệp tin y tế | **UC-PAT-05** |
| 27 | `SupabaseStorageService` | Hiện thực hóa lưu trữ tệp y tế trên Supabase Private Storage Bucket S3-compatible | **UC-PAT-05, UC-PAT-07** |
| 28 | `SupabaseStorageUrls` | Xử lý và tạo liên kết ký số bảo mật ngắn hạn cho tệp Supabase Storage | **UC-PAT-07, UC-DOC-04** |
| 29 | `TriageRateLimiterService` | Giới hạn tần suất gọi AI phân luồng triệu chứng tránh cạn kiệt tài nguyên | **UC-PAT-01** |
| 30 | `TriageService` | Quản lý phiên hội thoại phân luồng triệu chứng và xuất báo cáo lâm sàng SBAR | **UC-PAT-01, UC-PAT-17, UC-DOC-04, UC-ADM-10** |
| 31 | `TwoLayerCacheService` | Bộ đệm 2 lớp: L1 In-Memory Caffeine (<1ms) + L2 Redis Distributed (1-3ms) kèm XFetch | **UC-PAT-03..04, UC-PAT-16, UC-DOC-06..07, UC-DOC-12, UC-ADM-01..08** |

### Danh Sách 16 Spring Data Repositories

| STT | Tên Repository | Thực Thể Quản Lý (Entity) | Các Phương Thức Truy Vấn Tiêu Biểu |
| :---: | :--- | :--- | :--- |
| 1 | `AiTokenUsageRepository` | `AiTokenUsage` | `findByUserId, calculateTotalCostInPeriod, getUsageSummaryByModel` |
| 2 | `AppointmentRepository` | `Appointment` | `findByPatientId, findByDoctorIdAndDate, existsSlotConflict, updateStatus` |
| 3 | `AuditLogRepository` | `AuditLog` | `findByActorUserId, findByActionType, findAllPagedWithFilters` |
| 4 | `DoctorProfileRepository` | `DoctorProfile` | `findVerifiedDoctorsHnswVector, findPendingDoctors, findByUserId` |
| 5 | `DoctorReviewRepository` | `DoctorReview` | `findByDoctorId, findByAppointmentId, calculateAverageRatingByDoctor` |
| 6 | `DoctorScheduleSlotRepository` | `DoctorScheduleSlot` | `findByDoctorIdAndDayOfWeek, findActiveSlotsByDoctor` |
| 7 | `DocumentAnalysisRepository` | `DocumentAnalysis` | `findByDocumentId, findByDocumentSha256Hash` |
| 8 | `EmailVerificationTokenRepository` | `EmailVerificationToken` | `findByTokenHash, deleteExpiredTokens` |
| 9 | `MedicalDocumentRepository` | `MedicalDocument` | `findByPatientId, findByIdAndPatientId, findBySha256Hash` |
| 10 | `NotificationRepository` | `Notification` | `findByUserIdAndIsReadFalse, markAllAsReadByUserId` |
| 11 | `PasswordResetTokenRepository` | `PasswordResetToken` | `findByTokenHash, deleteExpiredTokens` |
| 12 | `PatientProfileRepository` | `PatientProfile` | `findByUserId, existsByCccdNumber` |
| 13 | `PaymentTransactionRepository` | `PaymentTransaction` | `findByTransactionCode, findByUserId, findByAppointmentId` |
| 14 | `SpecialtyRepository` | `Specialty` | `findAllActive, findByNameContainingIgnoreCase, findByCode` |
| 15 | `TriageSessionRepository` | `TriageSession` | `findByUserIdOrderByCreatedAtDesc, findEmergentSessions` |
| 16 | `UserRepository` | `User` | `findByEmail, existsByEmail, findByGoogleId, findByRole` |

---

## 7. Danh Mục Toàn Diện 22 Trang Giao Diện Frontend React & Điều Hướng Tuyến

Toàn bộ 22 trang giao diện được tổ chức theo kiến trúc phân vùng vai trò bảo vệ (`ProtectedRoute`) và tối ưu hóa tải trang qua `lazy()` / `Suspense`:

| STT | Đường Dẫn Tuyến (Route Path) | Tệp Giao Diện (Page Component) | Bố Cục (Layout) | Phân Quyền (Allowed Roles) | Chức Năng Chính | Use Case Phục Vụ |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `/` | `LandingPage.tsx` | Public | `Khách vãng lai` | Trang chủ y tế số, mô phỏng EKG Canvas, Live Triage Simulator | **UC-PAT-01, UC-COMM-01** |
| 2 | `/landing` | `LandingPage.tsx` | Public | `Khách vãng lai` | Bí danh trang chủ (Alias) | **UC-PAT-01, UC-COMM-01** |
| 3 | `/login` | `LoginPage.tsx` | AuthCard | `Khách vãng lai` | Đăng nhập với Email/Password hoặc Google OAuth2 SSO | **UC-COMM-01** |
| 4 | `/forgot-password` | `ForgotPasswordPage.tsx` | AuthCard | `Khách vãng lai` | Yêu cầu gửi liên kết đặt lại mật khẩu bảo mật | **UC-COMM-05** |
| 5 | `/reset-password` | `ResetPasswordPage.tsx` | AuthCard | `Khách vãng lai` | Xác thực token hash SHA-256 và nhập mật khẩu mới | **UC-COMM-03, UC-COMM-05** |
| 6 | `/verify-email` | `VerifyEmailPage.tsx` | AuthCard | `Khách vãng lai` | Xác minh tài khoản email qua liên kết kích hoạt | **UC-COMM-06** |
| 7 | `/oauth2/callback` | `OAuth2CallbackPage.tsx` | Public | `Khách vãng lai` | Tiếp nhận redirect Google OAuth2 và trích xuất token | **UC-COMM-01** |
| 8 | `/payment/success` | `PaymentSuccessPage.tsx` | PatientLayout | `Bệnh nhân` | Biên nhận thanh toán thành công và đối soát mã giao dịch | **UC-PAT-10** |
| 9 | `/admin` | `AdminDashboard.tsx` | AdminLayout | `ADMIN` | Tổng quan vận hành toàn viện, FinOps AI Token, KPIs & AI Switcher | **UC-ADM-01..03** |
| 10 | `/admin/appointments` | `AppointmentSupervisionPage.tsx` | AdminLayout | `ADMIN` | Giám sát lịch khám bệnh viện, can thiệp hủy cưỡng chế & hoàn tiền | **UC-ADM-09, UC-PAT-13** |
| 11 | `/admin/triage` | `TriageSupervisionPage.tsx` | AdminLayout | `ADMIN` | Giám sát an toàn lâm sàng các phiên phân luồng AI & SBAR | **UC-ADM-10** |
| 12 | `/admin/doctors` | `DoctorManagementPage.tsx` | AdminLayout | `ADMIN` | Quản lý danh sách bác sĩ, phân trang offset, đồng bộ vector | **UC-ADM-04, UC-ADM-06** |
| 13 | `/admin/doctors (Vetting)` | `DoctorVettingPage.tsx` | AdminLayout | `ADMIN` | Thẩm định chứng chỉ CCHN, xem bằng chứng và phê duyệt | **UC-ADM-05** |
| 14 | `/admin/users` | `UserManagementPage.tsx` | AdminLayout | `ADMIN` | Quản lý tài khoản người dùng, đổi quyền RBAC, khóa tài khoản | **UC-ADM-07** |
| 15 | `/admin/specialties` | `SpecialtyManagementPage.tsx` | AdminLayout | `ADMIN` | Danh mục chuyên khoa y tế và phân loại bệnh viện | **UC-ADM-08** |
| 16 | `/admin/audit-logs` | `AuditLogPage.tsx` | AdminLayout | `ADMIN` | Nhật ký kiểm toán an ninh, phát hiện truy cập trái phép IDOR | **UC-ADM-11** |
| 17 | `/doctor` | `DoctorDashboard.tsx` | DoctorLayout | `DOCTOR` | Bàn làm việc lâm sàng, hàng đợi bệnh nhân, gọi khám theo STT | **UC-DOC-01, 03, 04, 06..10, 13** |
| 18 | `/doctor/patients` | `DoctorPatientRecordsPage.tsx` | DoctorLayout | `DOCTOR` | Tra cứu hồ sơ bệnh án dài hạn theo quan hệ điều trị | **UC-DOC-04, UC-DOC-05, UC-COMM-04** |
| 19 | `/doctor/profile` | `DoctorProfilePage.tsx` | DoctorLayout | `DOCTOR` | Hồ sơ chuyên môn bác sĩ, cấu hình khung giờ khám & đánh giá | **UC-DOC-02, 11, 12, 14, UC-COMM-03** |
| 20 | `/patient` | `PatientDashboard.tsx` | PatientLayout | `PATIENT` | Hộ chiếu y tế, lịch hẹn khám, phiếu khám STT và quản lý hồ sơ | **UC-COMM-04, UC-PAT-09, 11..16** |
| 21 | `/patient/triage` | `SymptomTriagePage.tsx` | PatientLayout | `PATIENT` | Trợ lý phân luồng triệu chứng AI, phòng thủ cờ đỏ & xuất SBAR | **UC-PAT-01, UC-PAT-02, UC-PAT-17** |
| 22 | `/patient/documents` | `DocumentSummarizerPage.tsx` | PatientLayout | `PATIENT` | Tải lên & giải nghĩa hồ sơ cận lâm sàng, nạp lượt phân tích | **UC-PAT-05..08, UC-PAT-10, UC-PAT-18** |
| 23 | `/patient/doctors` | `DoctorSearchPage.tsx` | PatientLayout | `PATIENT` | Tìm kiếm bác sĩ bằng AI pgvector HNSW và đặt lịch trực tiếp | **UC-PAT-03, UC-PAT-04, UC-PAT-09** |

---

## 8. Bản Đồ Bộ Kiểm Thử Chất Lượng (37 Lớp Test, 308 Unit Tests 100% PASS)

Hệ thống duy trì bộ kiểm thử tự động toàn diện đạt tỷ lệ vượt qua **100% (308/308 tests pass)**:

| STT | Lớp Kiểm Thử (Test Class) | Gói Java (Package) | Số Lượng Tests | Phân Vùng Chức Năng & Thuật Toán Được Kiểm Thử |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `AdminVettingServiceTest.java` | `com.mediassist.service` | **12 tests** | Thẩm định CCHN bác sĩ, phê duyệt, từ chối và ghi nhật ký kiểm toán |
| 2 | `AiModelRouterTest.java` | `com.mediassist.ai` | **6 tests** | Hedged Requests, xoay tua mô hình Gemini / OpenRouter / Fallback |
| 3 | `AiUsageAnalyticsServiceTest.java` | `com.mediassist.service` | **8 tests** | Tính toán FinOps tiêu thụ token AI, doanh thu và chi phí USD/VND |
| 4 | `AppointmentMailPrivacyTest.java` | `com.mediassist.mail` | **7 tests** | Quyền riêng tư dữ liệu y tế trong nội dung email gửi bệnh nhân |
| 5 | `AppointmentServiceTest.java` | `com.mediassist.service` | **26 tests** | Vòng đời lịch khám, chống race condition, cấp STT, check-in, hoàn tất khám |
| 6 | `AuthControllerPasswordResetTest.java` | `com.mediassist.controller` | **9 tests** | Các kịch bản controller đặt lại mật khẩu với token hợp lệ / hết hạn |
| 7 | `AuthServiceEmailVerificationTest.java` | `com.mediassist.service` | **11 tests** | Xác minh token email, gửi lại token và kích hoạt tài khoản |
| 8 | `AuthServicePasswordResetTest.java` | `com.mediassist.service` | **14 tests** | Quy trình quên mật khẩu, sinh token hash SHA-256 và cập nhật Bcrypt |
| 9 | `ClinicalOntologyServiceTest.java` | `com.mediassist.service` | **10 tests** | Tra cứu nhanh ICD-10 (QĐ 7603) và chỉ số xét nghiệm LOINC (QĐ 3280) |
| 10 | `ClinicalQueryDefenseEngineTest.java` | `com.mediassist.service` | **18 tests** | Phòng thủ 5 cấp: teen-code slang, NegEx phủ định, 115 cờ đỏ cấp cứu |
| 11 | `ClinicalRagServiceTest.java` | `com.mediassist.service` | **9 tests** | Điều phối RAG lâm sàng, tạo prompt chuẩn cấu trúc và xuất SBAR JSON |
| 12 | `DoctorReviewServiceTest.java` | `com.mediassist.service` | **11 tests** | Gửi đánh giá sao, tính trung bình xếp hạng và ngăn chặn đánh giá giả mạo |
| 13 | `DoctorSemanticSearchServiceTest.java` | `com.mediassist.service` | **15 tests** | Tìm kiếm pgvector HNSW 1536-d, xếp hạng đa mục tiêu WHRF SOTA |
| 14 | `DoctorServiceTest.java` | `com.mediassist.service` | **19 tests** | Cấu hình lịch khám, điều phối hàng đợi, gọi khám kế tiếp theo STT |
| 15 | `EmailServiceTest.java` | `com.mediassist.mail` | **8 tests** | Gửi email xác thực, email thông báo lịch khám và biên nhận thanh toán |
| 16 | `EmbeddingServiceTest.java` | `com.mediassist.service` | **7 tests** | Sinh vector nhúng 1536 chiều và xử lý fallback khi mất kết nối mạng |
| 17 | `MailNotificationListenerTest.java` | `com.mediassist.mail` | **6 tests** | Bắt sự kiện bất đồng bộ qua Spring Event để gửi mail không làm nghẽn luồng |
| 18 | `MailTransactionPhaseTest.java` | `com.mediassist.mail` | **5 tests** | Đảm bảo email chỉ được gửi sau khi giao dịch CSDL đã commit thành công |
| 19 | `MeddiesPdfGeneratorServiceTest.java` | `com.mediassist.service` | **6 tests** | Tạo tệp PDF phiếu khám và đơn thuốc điện tử đúng định dạng mẫu |
| 20 | `MedicalDocumentAnalysisServiceTest.java` | `com.mediassist.service` | **16 tests** | Pipeline bóc tách OCR đa phương thức, trích xuất biomarkers và tóm tắt AI |
| 21 | `MedicalDocumentFileAccessServiceTest.java` | `com.mediassist.service` | **8 tests** | Kiểm tra quyền sở hữu tệp và cấp Signed URL ngắn hạn 15 phút |
| 22 | `MedicalDocumentFileEndpointTest.java` | `com.mediassist.controller` | **7 tests** | Kiểm thử controller tải tệp y tế và stream nhị phân an toàn |
| 23 | `MedicalDocumentValidatorTest.java` | `com.mediassist.service` | **8 tests** | Kiểm tra định dạng PDF/ảnh, giới hạn dung lượng <= 10MB và tính toàn vẹn |
| 24 | `MedicalPiiServiceTest.java` | `com.mediassist.service` | **9 tests** | Khử định danh CCCD, số điện thoại, họ tên bệnh nhân theo NĐ 13/2023 |
| 25 | `NotificationServiceTest.java` | `com.mediassist.service` | **10 tests** | Tạo thông báo trong ứng dụng, đếm số chưa đọc và đánh dấu đã đọc |
| 26 | `OAuth2SecurityTest.java` | `com.mediassist.security` | **7 tests** | Xác thực Google OAuth2, xử lý liên kết tài khoản và cấp phát JWT |
| 27 | `PatientAccessGuardTest.java` | `com.mediassist.security` | **11 tests** | Rào chắn kiểm soát quyền xem hồ sơ bệnh án theo quan hệ điều trị & IDOR |
| 28 | `PatientProfileServiceTest.java` | `com.mediassist.service` | **9 tests** | Cập nhật hồ sơ bệnh nhân, nhóm máu, dị ứng và kiểm tra ràng buộc CCCD |
| 29 | `PatientRecordAccessControllerTest.java` | `com.mediassist.controller` | **6 tests** | Kiểm thử các endpoint truy cập hồ sơ bệnh án của bác sĩ và quản trị viên |
| 30 | `PaymentServiceTest.java` | `com.mediassist.service` | **12 tests** | Tạo URL thanh toán VietQR / Stripe Sandbox, xử lý IPN webhook bất đồng bộ |
| 31 | `RedFlagServiceTest.java` | `com.mediassist.service` | **12 tests** | Nhận diện từ khóa khẩn cấp y tế và sinh chỉ thị cấp cứu 115 lập tức |
| 32 | `SecurityHardeningTest.java` | `com.mediassist.security` | **8 tests** | Bảo mật tài khoản, chống brute-force và kiểm tra phân quyền RBAC |
| 33 | `SecurityRateLimiterEmailFlowTest.java` | `com.mediassist.security` | **6 tests** | Giới hạn tần suất yêu cầu gửi email đặt lại mật khẩu và xác thực |
| 34 | `SupabaseStorageServiceTest.java` | `com.mediassist.service` | **7 tests** | Tương tác Supabase S3 bucket, upload tệp riêng tư và sinh signed URL |
| 35 | `SystemConfigControllerTest.java` | `com.mediassist.controller` | **6 tests** | Bật tắt chế độ AI Engine, kích hoạt đồng bộ vector toàn hệ thống |
| 36 | `TriageServiceTest.java` | `com.mediassist.service` | **14 tests** | Quy trình phân luồng triệu chứng AI, lưu trữ phiên hội thoại và tạo SBAR |
| 37 | `TwoLayerCacheServiceTest.java` | `com.mediassist.service` | **11 tests** | Bộ đệm Caffeine L1 + Redis L2 và thuật toán chống bão tuyết XFetch |

---

## 9. Cẩm Nang Lệnh Vận Hành Nhanh (Fast Operations Cheatsheet)

```bash
# 1. Kiểm tra toàn bộ Unit Tests phía Backend (308 tests)
mvn test

# 2. Kiểm tra biên dịch & 0 lỗi TypeScript phía Frontend
cd frontend && npm run build

# 3. Biên dịch lại toàn bộ hồ sơ báo cáo luận văn (docs-bundle)
python -X utf8 scripts/compile_docs_bundle.py

# 4. Khởi động môi trường kiểm thử tích hợp (Docker Compose)
docker compose up -d postgres redis

# 5. Xem trạng thái dịch vụ kiểm toán và giám sát
curl http://localhost:8080/ready
```
