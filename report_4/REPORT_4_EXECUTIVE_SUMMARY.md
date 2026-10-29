# BẢN TÓM TẮT QUẢN TRỊ REPORT 4 (EXECUTIVE SUMMARY)
## Đồ Án Tốt Nghiệp: MediAssist-AI (FPTU-KLTN-2026-MEDIASSIST)
### Thiết Kế Phần Mềm & Cơ Sở Dữ Liệu Chi Tiết (Software Design Document - IEEE 1016)

---

### 🌟 1. TỔNG QUAN QUY MÔ HỒ SƠ THIẾT KẾ SDD (REPORT 4)

Báo cáo **Report 4 (SDD – Software Design Document)** là tài liệu thiết kế kỹ thuật kiến trúc phần mềm và cơ sở dữ liệu chuyên sâu nhất của đề tài MediAssist-AI, được xây dựng theo tiêu chuẩn quốc tế **IEEE 1016-2009** và phương pháp phân rã hướng đối tượng Clean Architecture:
* **Quy mô đồ sộ chuẩn đồ án tốt nghiệp:** **4.322 dòng** (314.737 ký tự), ánh xạ chính xác 1-1 với mã nguồn Java 21 LTS (Spring Boot 3.4) và React 18 SPA.
* **Tổng số 88 Biểu Đồ Mermaid hoàn chỉnh (100% Valid Syntax):**
  - **01** Biểu đồ Kiến trúc tổng thể hệ thống 5 tầng (5-Tier Compact Architecture Diagram).
  - **02** Biểu đồ Cấu trúc gói phần mềm (Package Diagrams cho Front-end và Back-end).
  - **01** Biểu đồ Cơ sở dữ liệu vật lý toàn diện 17 bảng (Physical ERD Diagram 3NF).
  - **04** Biểu đồ Sub-ERD phân hệ chi tiết (Identity, Provider, Appointment/EMR, Diagnostics/Financial).
  - **80** Biểu đồ thiết kế chi tiết cho **28 luồng nghiệp vụ cốt lõi** (gồm **28 Class Diagrams** và **52 Sequence Diagrams** bao phủ luồng thành công và luồng xử lý ngoại lệ AppException).

---

### 📐 2. TIÊU CHUẨN ĐẶC TẢ 4 PHẦN CHO 28 WORKFLOWS CỐT LÕI

Mỗi một trong **28 luồng nghiệp vụ** (từ Đăng ký, Đăng nhập, Triage 5 tầng, Tìm kiếm bác sĩ pgvector, Đặt lịch hẹn, Khám bệnh EMR, Bóc tách OCR, đến Thanh toán VNPay) đều được đặc tả theo cấu trúc 4 phần nghiêm ngặt:
1. **Phần 1 – Phạm vi & Ranh giới trách nhiệm (Scope & Boundaries):** Xác định rõ Actor khởi tạo, điều kiện tiên quyết (Preconditions), DTO đầu vào, DTO đầu ra và điều kiện kết thúc (Postconditions).
2. **Phần 2 – Biểu đồ Lớp & Bảng đặc tả thuộc tính (Class Diagram & Specification Table):** Biểu đồ Class Diagram thể hiện rõ các Controller, Service, Repository, Entity, DTO, Enums và Bảng mô tả chi tiết từng phương thức cùng kiểu dữ liệu trả về.
3. **Phần 3 – Biểu đồ Tuần tự Luồng Chính & Bảng từng bước (Main Flow Sequence & Step-by-Step Table):** Biểu đồ Sequence Diagram mô tả tương tác giữa Client $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ DB $\rightarrow$ External API kèm bảng phân tích logic kỹ thuật của từng bước thực thi.
4. **Phần 4 – Biểu đồ Tuần tự Luồng Lỗi & Ma trận Ngoại lệ (Error Flow Sequence & AppException Matrix):** Biểu đồ Sequence xử lý khi gặp sự cố mạng, xung đột dữ liệu hoặc vi phạm bảo mật, kèm ma trận ánh xạ `ErrorCode`, HTTP Status code và thông báo lỗi hiển thị cho người dùng.

---

### 🗄️ 3. KIẾN TRÚC CƠ SỞ DỮ LIỆU & BẢN CHẤT ERD (17 TABLES)

```
[USERS (Định danh trung tâm)]
  │
  ├── 1:1 ──► [PATIENT_PROFILES (Hộ chiếu EMR, CCCD, Nhóm máu, Dị ứng)]
  ├── 1:1 ──► [DOCTOR_PROFILES (Số CCHN, Học vị, Biểu phí, bio_embedding 1536-d)]
  │                 │
  │                 ├── N:M ──► [SPECIALTIES (Danh mục chuyên khoa)]
  │                 └── 1:N ──► [DOCTOR_SCHEDULE_SLOTS (Khung giờ trực tuần)]
  │
  ├── 1:N ──► [APPOINTMENTS (Lịch hẹn, STT xx, WHO ICD-10, Vitals, Đơn thuốc)]
  │                 │
  │                 ├── 1:1 ──► [DOCTOR_REVIEWS (Đánh giá sao & Credibility Damper)]
  │                 └── 1:1 ──► [PAYMENT_TRANSACTIONS (Giao dịch VNPay HMAC-SHA512)]
  │
  ├── 1:N ──► [MEDICAL_DOCUMENTS (Tệp xét nghiệm, Private S3 storage_path)]
  │                 │
  │                 └── 1:1 ──► [DOCUMENT_ANALYSES (LOINC indicators, Tóm tắt bình dân)]
  │
  └── 1:N ──► [AUDIT_LOGS (Nhật ký kiểm toán an ninh bất biến HIPAA)]
```

* **Mẫu thiết kế Table-per-Type (Profile Pattern):** Bảng `users` quản lý danh tính bảo mật đăng nhập; `doctor_profiles` và `patient_profiles` kế thừa quan hệ **1:1** qua khóa ngoại `user_id FK UNIQUE`. Thiết kế này đảm bảo chuẩn hóa **3NF**, loại bỏ hoàn toàn các trường dữ liệu bị `NULL` và tối ưu hóa kích thước trang đĩa.
* **Chuẩn hóa dữ liệu y tế (Standardized Medical Codes):** Bảng `appointments` chỉ lưu mã chuẩn **`icd10_code VARCHAR(10)`**; bảng `document_analyses` chỉ lưu mã chuẩn **`loinc_indicators JSONB`**, giúp tiết kiệm 80% dung lượng đĩa CSDL giao dịch.

---

### 💬 4. KỊCH BẢN PHẢN BIỆN NHANH 5 CÂU HỎI HỘI ĐỒNG (REPORT 4 - SDD)

#### ❓ Câu 1: Tại sao nhóm chọn kiến trúc Modular Monolith thay vì Microservices?
> **Trả lời:** *"Dạ thưa Thầy Cô, đối với một hệ thống y tế đòi hỏi tính toàn vẹn giao dịch cao và độ trễ thấp:  
> 1. **Triệt tiêu độ trễ mạng (Network Hop):** Modular Monolith chạy trong cùng một bộ nhớ JVM, loại bỏ hoàn toàn chi phí serialize/deserialize qua mạng giữa các service, giúp truy vấn dữ liệu lâm sàng chỉ mất dưới 10ms.  
> 2. **Toàn vẹn giao dịch ACID:** Cho phép sử dụng `@Transactional(isolation = REPEATABLE_READ)` cục bộ, bảo đảm tuyệt đối không xảy ra hiện tượng đọc bóng ma (Phantom Read) khi đặt lịch khám hoặc thanh toán viện phí.  
> 3. **Tách biệt logic qua Domain-Driven Design (DDD):** Hệ thống được cấu trúc thành 7 Bounded Contexts độc lập trong các package riêng biệt. Khi quy mô người dùng tăng cao trong tương lai, nhóm có thể dễ dàng tách thành các Microservices độc lập mà không cần phải viết lại mã nguồn."*

#### ❓ Câu 2: Chỉ mục đồ thị pgvector HNSW được tối ưu hóa thế nào trong cơ sở dữ liệu?
> **Trả lời:** *"Nhóm áp dụng kỹ thuật **Session-Level Tuning** ngay trong giao dịch truy vấn vector:  
> - Thiết lập chỉ mục HNSW với tham số xây dựng đồ thị tối ưu: $m = 24$, $ef\_construction = 128$.  
> - Trong phiên tìm kiếm: Kích hoạt `SET LOCAL hnsw.ef_search = 120` để tăng độ sâu duyệt đồ thị (Recall đạt $99.95\%$).  
> - Bật lệnh `SET LOCAL enable_seqscan = off` để **ép PostgreSQL luôn sử dụng Index Scan**, loại trừ triệt để nguy cơ Query Planner chuyển nhầm sang quét tuần tự toàn bảng khi dữ liệu lớn.  
> - Nâng `SET LOCAL work_mem = '64MB'` để toàn bộ phép tính khoảng cách Cosine 1536 chiều diễn ra trực tiếp trong RAM với độ trễ chỉ **0.72 mili-giây**."*

#### ❓ Câu 3: Làm thế nào giải quyết bài toán chống đặt trùng lịch (Anti-Double Booking) ở mức thiết kế SDD?
> **Trả lời:** *"Nhóm thiết kế cơ chế bảo vệ 3 tầng tương tranh:  
> - **Tầng 1 (Phân tán):** Sử dụng Redis Semaphore Lock thời gian thực giữ chỗ slot trong 5 phút.  
> - **Tầng 2 (Giao dịch):** Khóa mức cô lập `@Transactional(isolation = Isolation.REPEATABLE_READ)` chống đọc dữ liệu bẩn.  
> - **Tầng 3 (Cơ sở dữ liệu):** Thiết lập chỉ mục duy nhất có điều kiện: `CREATE UNIQUE INDEX unique_doctor_active_slot ON appointments(doctor_id, scheduled_start) WHERE status != 'CANCELLED'`. Tầng này đảm bảo rằng dù có 100 request đồng thời vượt qua tầng ứng dụng thì CSDL cũng chặn đứng các request trùng và trả về lỗi `SLOT_CONFLICT`."*

#### ❓ Câu 4: Rào chắn bảo mật BOLA/IDOR được thiết kế tại tầng nào và hoạt động ra sao?
> **Trả lời:** *"Rào chắn BOLA/IDOR được hiện thực hóa tại tầng Service thông qua lớp **`PatientAccessGuard`**:  
> Mỗi khi có yêu cầu truy cập tài liệu xét nghiệm (`medical_documents`) hoặc bệnh án (`appointments`), `PatientAccessGuard` sẽ thẩm định quan hệ điều trị thực tế (`CARE_RELATIONSHIP`): Bác sĩ đó bắt buộc phải có lịch khám đang ở trạng thái `SCHEDULED`, `IN_PROGRESS` hoặc `COMPLETED` với bệnh nhân. Nếu không có quan hệ hợp lệ, hệ thống lập tức ném ngoại lệ `AppException(FORBIDDEN_CARE_RELATIONSHIP)`, trả về mã HTTP 403 Forbidden và tự động ghi nhật ký an ninh bất biến vào `audit_logs`."*

#### ❓ Câu 5: Thiết kế lưu trữ Private Cloud S3 bảo vệ dữ liệu hình ảnh của bệnh nhân như thế nào?
> **Trả lời:** *"Theo thiết kế tại Flyway V20:  
> - Bảng `medical_documents` **chỉ lưu đường dẫn khóa nội bộ `storage_path`**, tuyệt đối không lưu URL công khai.  
> - Bucket Supabase Storage được cấu hình ở chế độ riêng tư (Private Bucket).  
> - Khi bệnh nhân hoặc bác sĩ hợp lệ yêu cầu xem ảnh, hệ thống thông qua `MedicalDocumentFileAccessService` mới sinh ra một **URL ký số HMAC-SHA256 thời hạn 15 phút (Presigned URL)**. Sau 15 phút, URL tự động vô hiệu hóa, ngăn chặn hoàn toàn việc sao chép liên kết chia sẻ trái phép ra bên ngoài."*
