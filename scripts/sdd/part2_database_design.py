"""
Part 2 of SDD Generator: Section 2 Database Design (Mermaid ERD, Table Overview, Detailed Table Specifications 2.1 to 2.17).
"""

def get_part2_content():
    return '''### 2. Database Design

Hệ quản trị cơ sở dữ liệu của **MediAssist-AI** được xây dựng trên nền tảng **PostgreSQL 16.x LTS** kết hợp tiện ích mở rộng vector đa chiều **pgvector (0.7+)**. Cấu trúc dữ liệu được chuẩn hóa đạt mức **Chuẩn 3NF (Third Normal Form)** nhằm bảo vệ tính toàn vẹn của dữ liệu giao dịch y tế, tuân thủ nghiêm ngặt **Thông tư 46/2018/TT-BYT** về Bệnh án điện tử (EMR) và **Nghị định 13/2023/NĐ-CP** về Bảo vệ dữ liệu cá nhân.

```mermaid
erDiagram
    users ||--o| doctor_profiles : "owns"
    users ||--o| patient_profiles : "owns"
    users ||--o{ appointments : "books as patient"
    users ||--o{ appointments : "attends as doctor"
    users ||--o{ triage_sessions : "initiates"
    users ||--o{ medical_documents : "uploads"
    users ||--o{ payment_transactions : "pays"
    users ||--o{ password_reset_tokens : "requests"
    users ||--o{ email_verification_tokens : "activates"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ doctor_reviews : "writes"

    doctor_profiles ||--o{ doctor_specialties : "specializes in"
    specialties ||--o{ doctor_specialties : "associated with"
    doctor_profiles ||--o{ doctor_schedule_slots : "defines availability"
    doctor_profiles ||--o{ doctor_reviews : "receives rating"

    appointments ||--o| doctor_reviews : "evaluated by"
    appointments }o--o| medical_documents : "references attachment"
    appointments }o--o| triage_sessions : "routes from"
    appointments ||--o| payment_transactions : "settled via"

    medical_documents ||--o| document_analyses : "parsed into"
    users ||--o{ ai_token_usage : "consumes LLM quota"
```

##### Figure 2. Physical Database Design Entity-Relationship Diagram (PostgreSQL 16 + pgvector)

---

#### Table 2. Database Design Description

| No | Table Name | Primary Key | Foreign Keys | Business Purpose & Architectural Role |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `users` | `id` (UUID) | - | Lưu trữ định danh, thông tin đăng nhập bảo mật (BCrypt), vai trò (RBAC), trạng thái khóa tài khoản và cờ xác thực email. |
| **2** | `specialties` | `id` (UUID) | - | Danh mục chuyên khoa lâm sàng chuẩn y tế (Tim mạch, Thần kinh, Cơ xương khớp, v.v.), phục vụ điều phối và tìm kiếm. |
| **3** | `doctor_profiles` | `id` (UUID) | `user_id` (FK -> `users`) | Hồ sơ năng lực bác sĩ: Chứng chỉ hành nghề, học vị, kinh nghiệm, biểu phí, điểm uy tín và vector ngữ nghĩa `bio_embedding` (1536 chiều). |
| **4** | `doctor_specialties` | (`doctor_profile_id`, `specialty_id`) | `doctor_profile_id`, `specialty_id` | Bảng liên kết nhiều-nhiều (Many-to-Many) giữa hồ sơ bác sĩ và các chuyên khoa chuyên sâu phụ trách. |
| **5** | `doctor_schedule_slots` | `id` (UUID) | `doctor_profile_id` | Lịch làm việc định kỳ hàng tuần của bác sĩ (Thứ trong tuần, giờ bắt đầu, giờ kết thúc, thời lượng ca khám). |
| **6** | `patient_profiles` | `id` (UUID) | `user_id` (FK -> `users`) | Hồ sơ thông tin y tế bệnh nhân: Mã người bệnh, CCCD/CMND, mã BHYT, tiền sử bệnh, nhóm máu, dị ứng và liên hệ khẩn cấp. |
| **7** | `appointments` | `id` (UUID) | `patient_id`, `doctor_id` | Thực thể cốt lõi quản lý vòng đời lịch khám và lưu trữ bệnh án điện tử (EMR): Sinh hiệu, mã WHO ICD-10, LOINC, đơn thuốc và kế hoạch điều trị. |
| **8** | `triage_sessions` | `id` (UUID) | `user_id` (FK -> `users`) | Nhật ký các phiên phân luồng triệu chứng AI: Mức độ khẩn cấp (Routine, Urgent, Emergency 115), tóm tắt SBAR và khuyến nghị chuyên khoa. |
| **9** | `medical_documents` | `id` (UUID) | `user_id` (FK -> `users`) | Lưu trữ siêu dữ liệu tài liệu y tế (đơn thuốc, phiếu xét nghiệm), trỏ tới khóa lưu trữ nội bộ riêng tư `storage_path` trên Supabase S3. |
| **10** | `document_analyses` | `id` (UUID) | `document_id` (FK -> `medical_documents`) | Kết quả trích xuất OCR và giải nghĩa y khoa thông minh của Gemini: Tóm tắt lâm sàng, chỉ số xét nghiệm bất thường và câu hỏi gợi ý. |
| **11** | `payment_transactions` | `id` (UUID) | `user_id` (FK -> `users`) | Sổ cái giao dịch tài chính: Ghi nhận giao dịch nạp tiền, thanh toán viện phí VNPay/Mock, trạng thái hoàn tiền và mã giao diện ngân hàng. |
| **12** | `password_reset_tokens` | `id` (UUID) | `user_id` (FK -> `users`) | Quản lý token đặt lại mật khẩu an toàn, chỉ lưu trữ mã băm một chiều SHA-256 (`token_hash`), có hạn 15 phút chống lộ lọt dữ liệu. |
| **13** | `email_verification_tokens` | `id` (UUID) | `user_id` (FK -> `users`) | Quản lý token kích hoạt tài khoản đăng ký mới, bảo vệ qua mã băm SHA-256, thời hạn 24 giờ theo chính sách Email Verification Gate. |
| **14** | `notifications` | `id` (UUID) | `user_id` (FK -> `users`) | Hệ thống thông báo giao dịch và lâm sàng gửi tới người dùng trong ứng dụng (In-app notifications): Nhắc lịch, hủy lịch, kết quả khám. |
| **15** | `doctor_reviews` | `id` (UUID) | `doctor_id`, `patient_id`, `appointment_id` | Đánh giá và nhận xét từ bệnh nhân sau khi ca khám hoàn tất (`COMPLETED`), tích hợp vào bộ giảm chấn uy tín Credibility Damper. |
| **16** | `audit_logs` | `id` (UUID) | `user_id` (FK -> `users`) | Nhật ký kiểm toán an ninh bất biến (Immutable Audit Trail), ghi nhận mọi hành vi truy cập hồ sơ bệnh án, phân luồng và giao dịch. |
| **17** | `ai_token_usage` | `id` (UUID) | `user_id` (FK -> `users`) | Quản lý chi phí điện toán trí tuệ nhân tạo (FinOps): Ghi nhận số lượng token Prompt, Completion, mô hình AI sử dụng và chi phí USD quy đổi. |

---

#### 2.1. Users Table
Bảng quản lý tài khoản định danh người dùng trong toàn hệ sinh thái MediAssist-AI.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất toàn cục của người dùng (UUIDv4). |
| 2 | `email` | `VARCHAR(255)` | True | UNIQUE | - | Địa chỉ email đăng nhập duy nhất, định dạng chuẩn RFC 5322. |
| 3 | `password_hash` | `VARCHAR(255)` | False | - | - | Mật khẩu băm một chiều bằng BCrypt (cost factor 10). Cho phép NULL đối với tài khoản đăng nhập qua Google OAuth2. |
| 4 | `full_name` | `VARCHAR(150)` | True | - | - | Họ và tên đầy đủ của người dùng hiển thị trên hồ sơ và đơn thuốc. |
| 5 | `phone` | `VARCHAR(20)` | False | UNIQUE | - | Số điện thoại liên hệ cá nhân, định dạng chuẩn viễn thông E.164. |
| 6 | `avatar_url` | `TEXT` | False | - | - | Đường dẫn ảnh đại diện của người dùng (Cloud Storage hoặc Google Avatar). |
| 7 | `role` | `VARCHAR(30)` | True | - | `CHECK (role IN ('ADMIN', 'DOCTOR', 'PATIENT'))` | Vai trò trong hệ thống phục vụ phân quyền truy cập Role-Based Access Control. |
| 8 | `status` | `VARCHAR(30)` | True | - | `'ACTIVE'` | Trạng thái tài khoản: `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`. |
| 9 | `is_active` | `BOOLEAN` | True | - | `TRUE` | Cờ kích hoạt trạng thái hoạt động của tài khoản. |
| 10 | `email_verified` | `BOOLEAN` | True | - | `FALSE` | Cờ xác nhận người dùng đã chứng minh quyền sở hữu email qua link kích hoạt. |
| 11 | `email_verified_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian khi người dùng nhấn link kích hoạt email thành công. |
| 12 | `failed_login_attempts` | `INT` | True | - | `0` | Số lần đăng nhập sai mật khẩu liên tiếp, tự động khóa khi đạt ngưỡng 5 lần. |
| 13 | `locked_until` | `TIMESTAMPTZ` | False | - | - | Thời điểm tài khoản hết hạn bị khóa tạm thời do nhập sai quá số lần. |
| 14 | `last_login_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian ghi nhận lần đăng nhập thành công gần nhất. |
| 15 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo bản ghi người dùng trong cơ sở dữ liệu. |
| 16 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật thông tin người dùng gần nhất. |

---

#### 2.2. Specialties Table
Danh mục các chuyên khoa y tế phục vụ phân loại bác sĩ và phân luồng triệu chứng AI.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của chuyên khoa (UUIDv4). |
| 2 | `name` | `VARCHAR(150)` | True | - | - | Tên hiển thị tiếng Việt của chuyên khoa (ví dụ: Chuyên khoa Tim mạch). |
| 3 | `slug` | `VARCHAR(100)` | True | UNIQUE | - | Định danh dạng chuỗi URL-friendly (ví dụ: `chuyen-khoa-tim-mach`). |
| 4 | `description` | `TEXT` | False | - | - | Mô tả phạm vi khám chữa bệnh và các triệu chứng thuộc chuyên khoa. |
| 5 | `icon_url` | `TEXT` | False | - | - | Đường dẫn biểu tượng đại diện hiển thị trên giao diện người dùng. |
| 6 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo danh mục chuyên khoa. |
| 7 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật danh mục chuyên khoa gần nhất. |

---

#### 2.3. Doctor Profiles Table
Hồ sơ học thuật, chứng chỉ hành nghề và vector đặc trưng ngữ nghĩa của bác sĩ.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của hồ sơ bác sĩ (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | UNIQUE, REFERENCES `users(id)` | Khóa ngoại tham chiếu đến tài khoản người dùng tương ứng của bác sĩ. |
| 3 | `bio` | `TEXT` | False | - | - | Tiểu sử chuyên môn, đề tài nghiên cứu, thành tựu lâm sàng và thế mạnh điều trị. |
| 4 | `license_number` | `VARCHAR(255)` | False | UNIQUE | - | Số chứng chỉ hành nghề khám chữa bệnh do Bộ Y Tế hoặc Sở Y Tế cấp. |
| 5 | `license_document_url` | `VARCHAR(255)` | False | - | - | Đường dẫn tệp ảnh/PDF chứng chỉ hành nghề phục vụ xác minh phê duyệt. |
| 6 | `consultation_fee` | `NUMERIC(10, 2)` | False | - | `0.00` | Mức viện phí khám bệnh cơ sở (VND) cho một lượt khám 30 phút. |
| 7 | `years_of_experience` | `INT` | False | - | `0` | Số năm kinh nghiệm công tác lâm sàng thực tế trong ngành y tế. |
| 8 | `academic_title` | `VARCHAR(50)` | False | - | - | Học vị, học hàm y khoa: ThS.BS, BSCKI, BSCKII, TS.BS, PGS.TS.BS, GS.TS.BS. |
| 9 | `hospital_affiliation` | `VARCHAR(150)` | False | - | - | Bệnh viện hoặc cơ sở y tế nơi bác sĩ đang công tác chính thức. |
| 10 | `department` | `VARCHAR(150)` | False | - | - | Khoa phòng trực thuộc tại bệnh viện công tác (ví dụ: Khoa Cấp cứu, Khoa Nội tim mạch). |
| 11 | `license_issued_by` | `VARCHAR(150)` | False | - | - | Cơ quan có thẩm quyền cấp chứng chỉ hành nghề (Bộ Y Tế / Sở Y Tế tỉnh/thành). |
| 12 | `rating` | `DOUBLE PRECISION`| False | - | `4.9` | Điểm đánh giá trung bình tích lũy từ các bệnh nhân (thang điểm 1.0 đến 5.0). |
| 13 | `total_consultations` | `INT` | False | - | `1250` | Tổng số lượt ca khám lâm sàng bác sĩ đã thực hiện trong sự nghiệp. |
| 14 | `review_count` | `INT` | True | - | `0` | Tổng số lượt bệnh nhân thực tế đã để lại đánh giá nhận xét sau ca khám. |
| 15 | `is_verified` | `BOOLEAN` | True | - | `FALSE` | Cờ xác nhận hồ sơ và chứng chỉ đã được Admin phê duyệt hợp lệ. |
| 16 | `verified_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian khi Quản trị viên thực hiện phê duyệt hồ sơ bác sĩ. |
| 17 | `bio_embedding` | `vector(1536)` | False | - | HNSW Index (Cosine) | Vector đặc trưng ngữ nghĩa 1536 chiều của tiểu sử bác sĩ sinh bởi OpenAI. |
| 18 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm đăng ký hồ sơ bác sĩ vào hệ thống. |
| 19 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật hồ sơ bác sĩ gần nhất. |

---

#### 2.4. Doctor Specialties Table
Bảng liên kết nhiều-nhiều giữa bác sĩ và các chuyên khoa lâm sàng.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `doctor_profile_id` | `UUID` | True | PK, FK | REFERENCES `doctor_profiles(id)` | Khóa ngoại tham chiếu đến hồ sơ bác sĩ trong bảng `doctor_profiles`. |
| 2 | `specialty_id` | `UUID` | True | PK, FK | REFERENCES `specialties(id)` | Khóa ngoại tham chiếu đến chuyên khoa lâm sàng trong bảng `specialties`. |

---

#### 2.5. Doctor Schedule Slots Table
Lịch làm việc định kỳ hàng tuần được cấu hình bởi bác sĩ để bệnh nhân đặt lịch hẹn.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của khung giờ làm việc (UUIDv4). |
| 2 | `doctor_profile_id` | `UUID` | True | FK | REFERENCES `doctor_profiles(id)` | Khóa ngoại tham chiếu đến bác sĩ thiết lập lịch làm việc. |
| 3 | `day_of_week` | `VARCHAR(20)` | True | - | - | Ngày trong tuần phục vụ khám: `MONDAY`, `TUESDAY`, ..., `SATURDAY`. |
| 4 | `start_time` | `TIME` | True | - | - | Giờ bắt đầu nhận ca khám (ví dụ: `08:00:00`). |
| 5 | `end_time` | `TIME` | True | - | - | Giờ kết thúc nhận ca khám (ví dụ: `12:00:00`). |
| 6 | `slot_duration_minutes`| `INT` | True | - | `30` | Thời lượng phân bổ cho mỗi ca khám lâm sàng (mặc định 30 phút). |
| 7 | `is_active` | `BOOLEAN` | True | - | `TRUE` | Trạng thái sẵn sàng nhận lịch của khung thời gian này. |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cấu hình khung giờ làm việc. |

---

#### 2.6. Patient Profiles Table
Hồ sơ hành chính y tế và bệnh án điện tử cơ sở của bệnh nhân.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của hồ sơ bệnh nhân (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | UNIQUE, REFERENCES `users(id)` | Khóa ngoại tham chiếu đến tài khoản người dùng bệnh nhân. |
| 3 | `patient_code` | `VARCHAR(50)` | True | UNIQUE | - | Mã định danh y tế duy nhất của bệnh nhân (ví dụ: `BN-2026-08912`). |
| 4 | `citizen_id` | `VARCHAR(20)` | False | UNIQUE | - | Số Căn cước công dân (CCCD) 12 số của người bệnh theo định danh quốc gia. |
| 5 | `health_insurance_number`| `VARCHAR(30)` | False | - | - | Mã số thẻ Bảo hiểm Y tế (BHYT) phục vụ đồng bộ dữ liệu khám chữa bệnh. |
| 6 | `date_of_birth` | `DATE` | False | - | - | Ngày tháng năm sinh của bệnh nhân để tính toán tuổi lâm sàng. |
| 7 | `gender` | `VARCHAR(10)` | False | - | - | Giới tính sinh học của bệnh nhân (`MALE`, `FEMALE`, `OTHER`). |
| 8 | `blood_group` | `VARCHAR(10)` | False | - | - | Nhóm máu hệ ABO và yếu tố Rhesus (ví dụ: `O+`, `A+`, `B+`, `AB-`). |
| 9 | `address` | `TEXT` | False | - | - | Địa chỉ cư trú thường trú hiện tại của người bệnh. |
| 10 | `allergies` | `TEXT` | False | - | - | Tiền sử dị ứng thuốc, kháng sinh (Penicillin), thực phẩm, hóa chất. |
| 11 | `medical_history` | `TEXT` | False | - | - | Tiền sử bệnh lý mạn tính: Tăng huyết áp, Đái tháo đường, Hen phế quản. |
| 12 | `emergency_contact_name` | `VARCHAR(150)`| False | - | - | Họ và tên người thân cần liên hệ trong các trường hợp cấp cứu khẩn cấp. |
| 13 | `emergency_contact_phone`| `VARCHAR(20)` | False | - | - | Số điện thoại liên lạc của người thân khẩn cấp. |
| 14 | `emergency_contact_relationship` | `VARCHAR(50)` | False | - | - | Mối quan hệ với bệnh nhân (Bố/Mẹ, Vợ/Chồng, Con, Người bảo hộ). |
| 15 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo hồ sơ y tế bệnh nhân. |
| 16 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật hồ sơ y tế bệnh nhân gần nhất. |

---

#### 2.7. Appointments Table
Thực thể trung tâm lưu trữ toàn diện thông tin đặt lịch, viện phí và hồ sơ bệnh án điện tử (EMR).

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của lượt khám bệnh (UUIDv4). |
| 2 | `appointment_code` | `VARCHAR(30)` | True | UNIQUE | - | Mã số cuộc hẹn duy nhất (ví dụ: `APT-20261018-7712`). |
| 3 | `patient_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người bệnh tham gia lượt khám. |
| 4 | `doctor_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bác sĩ phụ trách ca khám. |
| 5 | `scheduled_start` | `TIMESTAMPTZ` | True | - | - | Thời gian dự kiến bắt đầu ca khám (theo múi giờ GMT+7). |
| 6 | `scheduled_end` | `TIMESTAMPTZ` | True | - | - | Thời gian dự kiến kết thúc ca khám (theo múi giờ GMT+7). |
| 7 | `status` | `VARCHAR(30)` | True | - | `'SCHEDULED'` | Trạng thái lịch khám: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`. |
| 8 | `payment_status` | `VARCHAR(30)` | True | - | `'UNPAID'` | Trạng thái viện phí: `UNPAID`, `PAID`, `REFUNDED`. |
| 9 | `fee_amount` | `NUMERIC(12, 2)`| True | - | - | Tổng viện phí phải thanh toán cho ca khám (VND). |
| 10 | `queue_number` | `VARCHAR(50)` | False | - | - | Số thứ tự xếp hàng tiếp đón tại phòng khám trong ngày (ví dụ: `STT 01`). |
| 11 | `clinic_room` | `VARCHAR(100)`| False | - | - | Tên phòng khám vật lý hoặc đường dẫn phòng khám trực tuyến (ví dụ: `Phòng 302 - Tòa A`). |
| 12 | `chief_complaint` | `TEXT` | False | - | - | Lý do đến khám chính và mô tả ngắn gọn về tình trạng của người bệnh. |
| 13 | `vital_signs_json` | `TEXT` | False | - | - | Dữ liệu dấu hiệu sinh tồn dạng JSON: Huyết áp (BP), Mạch (HR), Nhiệt độ, SpO2, BMI. |
| 14 | `icd10_code` | `VARCHAR(20)` | False | - | - | Mã chẩn đoán bệnh theo danh mục WHO ICD-10 (ví dụ: `I10`, `E11.9`, `J00`). |
| 15 | `icd10_name` | `VARCHAR(255)`| False | - | - | Tên bệnh lý chuẩn hóa tiếng Việt đi kèm với mã ICD-10 (ví dụ: `Tăng huyết áp vô căn`). |
| 16 | `prescription_json`| `TEXT` | False | - | - | Chi tiết đơn thuốc điện tử dạng JSON: Tên thuốc, hàm lượng, đường dùng, liều lượng. |
| 17 | `treatment_plan` | `TEXT` | False | - | - | Phác đồ điều trị, lời khuyên chăm sóc sức khỏe và chế độ dinh dưỡng dặn dò. |
| 18 | `follow_up_date` | `DATE` | False | - | - | Ngày hẹn tái khám định kỳ được chỉ định bởi bác sĩ khám. |
| 19 | `cancellation_reason` | `TEXT` | False | - | - | Lý do hủy lịch khám từ phía bệnh nhân, bác sĩ hoặc hệ thống. |
| 20 | `consultation_notes` | `TEXT` | False | - | - | Ghi chú bệnh sử chuyên sâu và nhận định lâm sàng nội bộ của bác sĩ. |
| 21 | `telehealth_room_id` | `VARCHAR(100)`| False | - | - | Định danh phòng họp truyền thông trực tuyến an toàn phục vụ Telehealth. |
| 22 | `checked_in_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian khi bệnh nhân thực hiện thủ tục điểm danh vào phòng chờ khám. |
| 23 | `version` | `BIGINT` | True | - | `0` | Số hiệu phiên bản phục vụ cơ chế khóa lạc quan (Optimistic Locking). |
| 24 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm tạo lịch khám trong cơ sở dữ liệu. |
| 25 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật trạng thái lịch khám gần nhất. |

---

#### 2.8. Triage Sessions Table
Nhật ký các phiên phân luồng triệu chứng AI và cảnh báo khẩn cấp y tế.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của phiên phân luồng triệu chứng (UUIDv4). |
| 2 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bệnh nhân thực hiện phân luồng (nếu đã đăng nhập). |
| 3 | `patient_name` | `VARCHAR(255)`| False | - | - | Tên bệnh nhân nhập liệu trong trường hợp thực hiện phân luồng nặc danh. |
| 4 | `symptoms_text` | `TEXT` | True | - | - | Nội dung mô tả triệu chứng gốc bằng tiếng Việt do người dùng nhập vào. |
| 5 | `is_emergency` | `BOOLEAN` | True | - | `FALSE` | Cờ phát hiện dấu hiệu đe dọa tính mạng (đau thắt ngực, khó thở cấp, đột quỵ). |
| 6 | `urgency_level` | `VARCHAR(20)` | True | - | - | Mức độ khẩn cấp y tế: `ROUTINE` (Thông thường), `URGENT` (Khẩn), `EMERGENCY` (Cấp cứu 115). |
| 7 | `primary_specialty` | `VARCHAR(100)`| False | - | - | Tên chuyên khoa lâm sàng được động cơ AI đề xuất phù hợp nhất. |
| 8 | `sbar_summary` | `TEXT` | False | - | - | Tóm tắt cấu trúc theo chuẩn giao tiếp y tế SBAR (Situation, Background, Assessment, Recommendation). |
| 9 | `ai_advice` | `TEXT` | False | - | - | Lời khuyên chăm sóc ban đầu và hướng dẫn theo dõi an toàn từ hệ thống AI. |
| 10 | `conversation_history` | `TEXT` | False | - | - | Toàn bộ chuỗi hội thoại tương tác hỏi đáp giữa bệnh nhân và trợ lý ảo. |
| 11 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo phiên phân luồng triệu chứng. |

---

#### 2.9. Medical Documents Table
Quản lý siêu dữ liệu các tệp tin hồ sơ bệnh án được lưu trữ riêng tư trên Supabase S3.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của tài liệu y tế (UUIDv4). |
| 2 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bệnh nhân sở hữu tệp tài liệu y tế này. |
| 3 | `file_name` | `VARCHAR(255)`| True | - | - | Tên gốc của tệp tin do người dùng tải lên (ví dụ: `ket_qua_xet_nghiem_mau.pdf`). |
| 4 | `file_size_bytes` | `BIGINT` | True | - | - | Dung lượng tệp tin tính theo đơn vị Bytes (giới hạn tối đa 10MB per file). |
| 5 | `content_type` | `VARCHAR(100)`| True | - | - | Kiểu định dạng MIME của tệp tin (`application/pdf`, `image/jpeg`, `image/png`). |
| 6 | `storage_path` | `VARCHAR(500)`| False | - | - | Khóa lưu trữ nội bộ riêng tư trên Supabase S3 Bucket (ví dụ: `patients/uuid/docs/uuid.pdf`). |
| 7 | `status` | `VARCHAR(50)` | True | - | `'PROCESSED'` | Trạng thái xử lý của tệp tin: `UPLOADED`, `PROCESSING`, `PROCESSED`, `ERROR`. |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm tài liệu được tải lên hệ thống. |

---

#### 2.10. Document Analyses Table
Kết quả giải nghĩa và trích xuất chỉ số lâm sàng chuyên sâu từ mô hình Vision LLM.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản phân tích tài liệu (UUIDv4). |
| 2 | `document_id` | `UUID` | True | FK | UNIQUE, REFERENCES `medical_documents(id)` | Khóa ngoại tham chiếu đến tệp tài liệu y tế gốc trong bảng `medical_documents`. |
| 3 | `clinical_summary` | `TEXT` | True | - | - | Bản tóm tắt chuyên môn lâm sàng dành cho bác sĩ tham khảo. |
| 4 | `plain_language_explanation` | `TEXT` | True | - | - | Bản giải thích bằng ngôn ngữ phổ thông, dễ hiểu dành riêng cho bệnh nhân. |
| 5 | `abnormal_indicators_json` | `TEXT` | True | - | - | Danh sách các chỉ số xét nghiệm lệch khỏi ngưỡng tham chiếu chuẩn dạng JSON. |
| 6 | `recommended_specialty_slug`| `VARCHAR(100)`| False | - | - | Đường dẫn định danh (slug) của chuyên khoa điều trị tiếp theo được đề xuất. |
| 7 | `recommended_specialty_name`| `VARCHAR(255)`| False | - | - | Tên chuyên khoa khám bệnh được khuyến nghị bệnh nhân nên đến khám. |
| 8 | `suggested_questions_json` | `TEXT` | False | - | - | Bộ câu hỏi gợi ý dạng JSON để bệnh nhân chủ động trao đổi với bác sĩ. |
| 9 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm hệ thống AI hoàn tất quá trình phân tích và trích xuất. |

---

#### 2.11. Payment Transactions Table
Sổ cái ghi nhận toàn bộ các giao dịch nạp tiền, thanh toán viện phí và hoàn tiền.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của giao dịch thanh toán (UUIDv4). |
| 2 | `transaction_code` | `VARCHAR(64)` | True | UNIQUE | - | Mã số giao dịch duy nhất trong hệ thống (ví dụ: `TX-20261018-9941`). |
| 3 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người dùng thực hiện giao dịch tài chính. |
| 4 | `order_type` | `VARCHAR(40)` | True | - | - | Phân loại đơn hàng giao dịch: `APPOINTMENT_FEE`, `TELEHEALTH_SERVICE`. |
| 5 | `reference_id` | `VARCHAR(100)`| False | - | - | Mã tham chiếu nghiệp vụ (ví dụ: mã cuộc hẹn `appointment_code` liên kết). |
| 6 | `amount` | `DECIMAL(12, 2)`| True | - | - | Số tiền giao dịch thực tế thanh toán tính theo đơn vị tiền tệ VND. |
| 7 | `currency` | `VARCHAR(10)` | True | - | `'VND'` | Đơn vị tiền tệ giao dịch (mặc định luôn là VND). |
| 8 | `payment_method` | `VARCHAR(40)` | True | - | - | Phương thức thanh toán: `VNPAY_QR`, `VNPAY_ATM`, `CREDIT_CARD`, `MOCK_SANDBOX`. |
| 9 | `payment_gateway` | `VARCHAR(40)` | True | - | - | Cổng thanh toán phụ trách giao dịch: `VNPAY`, `MOCK`. |
| 10 | `status` | `VARCHAR(30)` | True | - | `'PENDING'` | Trạng thái xử lý: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED`. |
| 11 | `gateway_reference` | `VARCHAR(255)`| False | - | - | Mã giao dịch đối soát do cổng thanh toán VNPay trả về (`vnp_TransactionNo`). |
| 12 | `metadata_json` | `TEXT` | False | - | - | Toàn bộ dữ liệu đối soát thô nhận từ Webhook/IPN của cổng thanh toán. |
| 13 | `version` | `BIGINT` | True | - | `0` | Phiên bản giao dịch phục vụ khóa lạc quan tránh xung đột đa luồng. |
| 14 | `created_at` | `TIMESTAMP` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người dùng bắt đầu khởi tạo giao dịch thanh toán. |
| 15 | `updated_at` | `TIMESTAMP` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật trạng thái kết quả thanh toán cuối cùng. |

---

#### 2.12. Password Reset Tokens Table
Quản lý các mã token đặt lại mật khẩu với cơ chế băm bảo mật SHA-256.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của token đặt lại mật khẩu (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến tài khoản người dùng yêu cầu khôi phục. |
| 3 | `token_hash` | `VARCHAR(64)` | True | UNIQUE | - | Chuỗi mã băm một chiều SHA-256 (64 ký tự hex) của token khôi phục gốc. |
| 4 | `expires_at` | `TIMESTAMPTZ` | True | - | - | Thời điểm token hết hiệu lực (mặc định 15 phút sau khi khởi tạo). |
| 5 | `used` | `BOOLEAN` | True | - | `FALSE` | Cờ ghi nhận token đã được sử dụng để đổi mật khẩu thành công hay chưa. |
| 6 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người dùng gửi yêu cầu quên mật khẩu. |

---

#### 2.13. Email Verification Tokens Table
Cổng bảo mật xác thực quyền sở hữu email đối với các tài khoản đăng ký mới.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản ghi kích hoạt email (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến tài khoản người dùng mới đăng ký. |
| 3 | `token_hash` | `VARCHAR(64)` | True | UNIQUE | - | Chuỗi mã băm SHA-256 (64 ký tự hex) bảo vệ token xác thực gửi trong email. |
| 4 | `expires_at` | `TIMESTAMPTZ` | True | - | - | Thời điểm token kích hoạt hết hạn (thời lượng tối đa 24 giờ). |
| 5 | `used_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian người dùng nhấp vào link và kích hoạt thành công tài khoản. |
| 6 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm hệ thống phát sinh token và gửi email kích hoạt. |

---

#### 2.14. Notifications Table
Hộp thư thông báo trong ứng dụng phục vụ cập nhật tiến trình lịch khám và tài chính.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản tin thông báo (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người dùng nhận thông báo này. |
| 3 | `type` | `VARCHAR(50)` | True | - | - | Loại thông báo: `APPOINTMENT_REMINDER`, `PAYMENT_SUCCESS`, `SYSTEM_ALERT`. |
| 4 | `title` | `VARCHAR(255)`| True | - | - | Tiêu đề tóm tắt của bản tin thông báo hiển thị cho người dùng. |
| 5 | `message` | `TEXT` | True | - | - | Nội dung chi tiết của bản tin thông báo. |
| 6 | `is_read` | `BOOLEAN` | True | - | `FALSE` | Cờ trạng thái đã đọc của người dùng (`TRUE` nếu đã mở xem). |
| 7 | `metadata_json` | `TEXT` | False | - | - | Dữ liệu phụ dạng JSON (mã lịch hẹn, đường dẫn chuyển hướng nhanh). |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm thông báo được phát sinh và gửi tới hộp thư người dùng. |

---

#### 2.15. Doctor Reviews Table
Đánh giá chất lượng và phản hồi từ bệnh nhân sau khi hoàn thành lượt khám bệnh.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản ghi đánh giá (UUIDv4). |
| 2 | `appointment_id` | `UUID` | True | FK | UNIQUE, REFERENCES `appointments(id)` | Khóa ngoại duy nhất trỏ tới lượt khám đã hoàn tất được đánh giá. |
| 3 | `doctor_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bác sĩ nhận đánh giá. |
| 4 | `patient_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bệnh nhân thực hiện đánh giá. |
| 5 | `rating` | `INT` | True | - | `CHECK (rating >= 1 AND rating <= 5)` | Điểm số đánh giá chất lượng ca khám (1 đến 5 sao). |
| 6 | `comment` | `TEXT` | False | - | - | Nhận xét chi tiết của người bệnh về thái độ, trình độ chuyên môn của bác sĩ. |
| 7 | `tags` | `VARCHAR(255)`| False | - | - | Các nhãn gắn nhanh (ví dụ: `Tận tâm`, `Đúng giờ`, `Giải thích rõ ràng`). |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người bệnh gửi bản đánh giá lên hệ thống. |
| 9 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người bệnh chỉnh sửa nội dung đánh giá gần nhất. |

---

#### 2.16. Audit Logs Table
Nhật ký kiểm toán an ninh bất biến tuân thủ tiêu chuẩn HIPAA và Bộ Y Tế Việt Nam.

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của dòng nhật ký kiểm toán (UUIDv4). |
| 2 | `action` | `VARCHAR(100)`| True | - | - | Tên hành động thực thi: `LOGIN`, `VIEW_PATIENT_RECORD`, `CREATE_APPOINTMENT`, `REFUND`. |
| 3 | `actor` | `VARCHAR(100)`| False | - | - | Vai trò hoặc tên đăng nhập của chủ thể thực hiện hành động. |
| 4 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người dùng thực hiện (NULL nếu là khách hoặc hệ thống). |
| 5 | `resource` | `VARCHAR(255)`| True | - | - | Tài nguyên mục tiêu bị tác động (ví dụ: `Appointment:APT-7712`, `MedicalDocument:DOC-01`). |
| 6 | `details` | `TEXT` | False | - | - | Mô tả ngữ cảnh chi tiết và kết quả thực hiện của hành động. |
| 7 | `metadata` | `TEXT` | False | - | - | Dữ liệu trạng thái thô dạng JSON phục vụ điều tra truy vết chuyên sâu. |
| 8 | `ip_address` | `VARCHAR(50)` | False | - | - | Địa chỉ IP của máy trạm phát sinh yêu cầu HTTP (hỗ trợ IPv4 & IPv6). |
| 9 | `user_agent` | `VARCHAR(255)`| False | - | - | Chuỗi định danh thiết bị và trình duyệt gửi yêu cầu lên hệ thống. |
| 10 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Dấu thời gian chính xác khi hành vi được ghi nhận vào sổ cái kiểm toán. |

---

#### 2.17. AI Token Usage Table
Sổ kế toán tiêu thụ điện toán trí tuệ nhân tạo (FinOps AI Auditing).

| No | Column Name | Data Type | Not Null | Key | Constraints / Default | Detailed Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của lượt ghi nhận token AI (UUIDv4). |
| 2 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người dùng phát sinh yêu cầu suy luận AI. |
| 3 | `model_name` | `VARCHAR(100)`| True | - | - | Tên mô hình AI được triệu gọi (`text-embedding-3-small`, `gemini-1.5-flash`). |
| 4 | `prompt_tokens` | `INT` | True | - | - | Số lượng Token đầu vào (Prompt Tokens) trong yêu cầu suy luận. |
| 5 | `completion_tokens` | `INT` | True | - | - | Số lượng Token đầu ra (Completion Tokens) do mô hình sinh ra. |
| 6 | `total_tokens` | `INT` | True | - | - | Tổng số lượng Token tiêu thụ trong phiên làm việc. |
| 7 | `estimated_cost_usd` | `NUMERIC(10, 6)`| False | - | `0.000000` | Chi phí điện toán ước tính quy đổi sang đồng Đô-la Mỹ (USD). |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm tác vụ suy luận AI được máy chủ thực thi hoàn tất. |
'''
