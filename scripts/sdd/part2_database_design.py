"""
Part 2 of SDD Generator: Section 2 Database Design (Mermaid ERD, Table Overview, Detailed Table Specifications 2.3.1 to 2.3.17).
Deepened with Column Specifications, Physical Index Tables, and Foreign Key Constraint Tables for all 17 tables.
"""

def get_part2_content():
    return '''### 2. Database Design

Hệ quản trị cơ sở dữ liệu của **MediAssist-AI** được xây dựng trên nền tảng **PostgreSQL 16.x LTS** kết hợp tiện ích mở rộng vector đa chiều **pgvector (0.7+)**. Cấu trúc dữ liệu được chuẩn hóa đạt mức **Chuẩn 3NF (Third Normal Form)** nhằm bảo vệ tính toàn vẹn của dữ liệu giao dịch y tế, tuân thủ nghiêm ngặt **Thông tư 46/2018/TT-BYT** về Bệnh án điện tử (EMR) và **Nghị định 13/2023/NĐ-CP** về Bảo vệ dữ liệu cá nhân.

```mermaid
erDiagram
    users ||--o| doctor_profiles : "1:1 owns profile"
    users ||--o| patient_profiles : "1:1 owns EMR passport"
    users ||--o{ appointments : "1:N books as patient"
    users ||--o{ appointments : "1:N attends as doctor"
    users ||--o{ triage_sessions : "1:N initiates"
    users ||--o{ medical_documents : "1:N uploads"
    users ||--o{ payment_transactions : "1:N transacts"
    users ||--o{ password_reset_tokens : "1:N requests"
    users ||--o{ email_verification_tokens : "1:N receives"
    users ||--o{ notifications : "1:N receives"
    users ||--o{ audit_logs : "1:N triggers"
    users ||--o{ doctor_reviews : "1:N evaluates"

    doctor_profiles ||--o{ doctor_specialties : "1:N specialized"
    specialties ||--o{ doctor_specialties : "1:N categorized"
    doctor_profiles ||--o{ doctor_schedule_slots : "1:N schedules availability"
    doctor_profiles ||--o{ doctor_reviews : "1:N rated by patients"

    appointments ||--o| doctor_reviews : "1:1 reviewed after completed"
    appointments }o--o| medical_documents : "N:1 attaches lab report"
    appointments }o--o| triage_sessions : "N:1 originates from triage"
    appointments ||--o| payment_transactions : "1:1 settled via transaction"

    medical_documents ||--o| document_analyses : "1:1 OCR analyzed"
    users ||--o{ ai_token_usage : "1:N LLM token auditing"
```

##### Figure 2. MediAssist-AI Physical Database Design Entity-Relationship Diagram (PostgreSQL 16 + pgvector)

---

#### 2.2 Database Design Summary Table

##### Table 2. Database Design Description

| No | Table Name | Vietnamese Domain Name | Primary Key | Foreign Key Relations | Estimated Volume & Growth | Core Business Function & Architectural Role |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `users` | Tài khoản người dùng | `id` (UUID) | - | 50.000+ dòng | Lưu trữ tài khoản định danh, thông tin đăng nhập BCrypt, phân quyền vai trò (RBAC), trạng thái khóa bảo mật và cờ xác thực email. |
| **2** | `specialties` | Danh mục chuyên khoa | `id` (UUID) | - | 50 - 100 dòng | Danh mục chuyên khoa lâm sàng chuẩn Bộ Y Tế, phục vụ phân loại bác sĩ, tìm kiếm ngữ nghĩa và điều phối phân luồng AI. |
| **3** | `doctor_profiles` | Hồ sơ bác sĩ & Vector | `id` (UUID) | `user_id` -> `users(id)` | 5.000+ dòng | Hồ sơ học thuật, chứng chỉ hành nghề, học vị, kinh nghiệm, biểu phí, điểm uy tín và vector đặc trưng ngữ nghĩa `bio_embedding` (1536 chiều). |
| **4** | `doctor_specialties` | Bác sĩ - Chuyên khoa | (`doctor_profile_id`, `specialty_id`) | `doctor_profile_id`, `specialty_id` | 15.000+ dòng | Bảng liên kết nhiều-nhiều (Many-to-Many) giữa bác sĩ và các chuyên khoa chuyên sâu phụ trách khám chữa bệnh. |
| **5** | `doctor_schedule_slots`| Khung giờ khám định kỳ | `id` (UUID) | `doctor_profile_id` | 30.000+ dòng | Lịch làm việc định kỳ hàng tuần của bác sĩ (Thứ trong tuần, giờ bắt đầu, giờ kết thúc, thời lượng ca khám) để chia slot tự động. |
| **6** | `patient_profiles` | Hồ sơ hành chính y tế | `id` (UUID) | `user_id` -> `users(id)` | 50.000+ dòng | Hộ chiếu y tế EMR: Mã người bệnh, số CCCD/CMND, mã thẻ BHYT, nhóm máu, tiền sử bệnh mạn tính, dị ứng thuốc và liên hệ khẩn cấp. |
| **7** | `appointments` | Lịch hẹn & Bệnh án EMR | `id` (UUID) | `patient_id`, `doctor_id`, `medical_document_id`, `triage_session_id` | 200.000+ dòng | Thực thể cốt lõi quản lý vòng đời lịch khám và lưu trữ hồ sơ bệnh án điện tử: Sinh hiệu, mã WHO ICD-10, LOINC, đơn thuốc và kế hoạch điều trị. |
| **8** | `triage_sessions` | Phiên phân luồng triệu chứng | `id` (UUID) | `user_id` -> `users(id)` | 500.000+ dòng | Nhật ký các phiên phân luồng triệu chứng AI: Mô tả bệnh, phát hiện cấp cứu 115, mức độ khẩn cấp (Routine, Urgent, Emergency), và tóm tắt SBAR. |
| **9** | `medical_documents` | Tài liệu y tế lưu trữ | `id` (UUID) | `user_id` -> `users(id)` | 100.000+ dòng | Lưu trữ siêu dữ liệu tài liệu y tế (đơn thuốc, phiếu xét nghiệm), trỏ tới khóa lưu trữ nội bộ riêng tư `storage_path` trên Supabase S3 Private Bucket. |
| **10** | `document_analyses` | Kết quả giải nghĩa OCR | `id` (UUID) | `document_id` -> `medical_documents(id)` | 100.000+ dòng | Kết quả bóc tách chỉ số cận lâm sàng và giải nghĩa y khoa thông minh của Gemini: Tóm tắt lâm sàng, bảng chỉ số bất thường và khuyến nghị chuyên khoa. |
| **11** | `payment_transactions` | Sổ cái giao dịch tài chính | `id` (UUID) | `user_id` -> `users(id)` | 200.000+ dòng | Sổ cái giao dịch tài chính bất biến: Ghi nhận giao dịch nạp tiền, thanh toán viện phí VNPay/Mock, trạng thái hoàn tiền và mã giao dịch ngân hàng. |
| **12** | `password_reset_tokens`| Token đặt lại mật khẩu | `id` (UUID) | `user_id` -> `users(id)` | 50.000+ dòng | Quản lý token đặt lại mật khẩu an toàn, chỉ lưu trữ mã băm một chiều SHA-256 (`token_hash`), thời hạn 15 phút chống lộ lọt dữ liệu. |
| **13** | `email_verification_tokens`| Token xác thực email | `id` (UUID) | `user_id` -> `users(id)` | 50.000+ dòng | Quản lý token kích hoạt tài khoản đăng ký mới, bảo vệ qua mã băm SHA-256, thời hạn 24 giờ theo chính sách Email Verification Gate. |
| **14** | `notifications` | Hộp thư thông báo | `id` (UUID) | `user_id` -> `users(id)` | 1.000.000+ dòng | Hệ thống thông báo giao dịch và lâm sàng gửi tới người dùng trong ứng dụng (In-app notifications): Nhắc lịch, hủy lịch, kết quả khám. |
| **15** | `doctor_reviews` | Đánh giá & Phản hồi | `id` (UUID) | `doctor_id`, `patient_id`, `appointment_id` | 100.000+ dòng | Đánh giá và nhận xét từ bệnh nhân sau khi ca khám hoàn tất (`COMPLETED`), tích hợp vào bộ giảm chấn uy tín Credibility Damper trong thuật toán WHRF. |
| **16** | `audit_logs` | Nhật ký kiểm toán an ninh | `id` (UUID) | `user_id` -> `users(id)` | 2.000.000+ dòng | Nhật ký kiểm toán an ninh bất biến (Immutable Audit Trail), ghi nhận mọi hành vi truy cập hồ sơ bệnh án, phân luồng và giao dịch. |
| **17** | `ai_token_usage` | Kế toán tiêu thụ token AI | `id` (UUID) | `user_id` -> `users(id)` | 1.000.000+ dòng | Quản lý chi phí điện toán trí tuệ nhân tạo (FinOps): Ghi nhận số lượng token Prompt, Completion, mô hình AI sử dụng và chi phí USD quy đổi. |

---

#### 2.3 Detailed Table Specifications & Index Design

---

##### 2.3.1 users Table
Bảng quản lý tài khoản định danh người dùng trong toàn hệ sinh thái MediAssist-AI. Tích hợp cơ chế bảo vệ chống vét cạn (Lockout sau 5 lần sai mật khẩu) và cổng kích hoạt email bắt buộc theo bản di trú Flyway V1, V3, V6, V8, V22.

###### Table 2.3.1.A: users Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất toàn cục của người dùng (UUIDv4). |
| 2 | `email` | `VARCHAR(255)` | True | UNIQUE | - | Địa chỉ email đăng nhập duy nhất, định dạng chuẩn RFC 5322. |
| 3 | `password_hash` | `VARCHAR(255)` | False | - | - | Mật khẩu băm một chiều bằng BCrypt (cost factor 10). Cho phép NULL đối với tài khoản đăng nhập qua Google OAuth2 (Flyway V8). |
| 4 | `full_name` | `VARCHAR(150)` | True | - | - | Họ và tên đầy đủ của người dùng hiển thị trên hồ sơ và đơn thuốc. |
| 5 | `phone` | `VARCHAR(20)` | False | UNIQUE | - | Số điện thoại liên hệ cá nhân, định dạng chuẩn viễn thông E.164. |
| 6 | `avatar_url` | `TEXT` | False | - | - | Đường dẫn ảnh đại diện của người dùng (Cloud Storage hoặc Google Avatar). |
| 7 | `role` | `VARCHAR(30)` | True | - | `CHECK (role IN ('ADMIN', 'DOCTOR', 'PATIENT'))` | Vai trò trong hệ thống phục vụ phân quyền truy cập Role-Based Access Control. |
| 8 | `status` | `VARCHAR(30)` | True | - | `'ACTIVE'` | Trạng thái tài khoản: `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED` (Flyway V6). |
| 9 | `is_active` | `BOOLEAN` | True | - | `TRUE` | Cờ kích hoạt trạng thái hoạt động của tài khoản. |
| 10 | `email_verified` | `BOOLEAN` | True | - | `FALSE` | Cờ xác nhận người dùng đã chứng minh quyền sở hữu email qua link kích hoạt (Flyway V22). |
| 11 | `email_verified_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian khi người dùng nhấn link kích hoạt email thành công (Flyway V22). |
| 12 | `failed_login_attempts` | `INT` | True | - | `0` | Số lần đăng nhập sai mật khẩu liên tiếp, tự động khóa khi đạt ngưỡng 5 lần (Flyway V3). |
| 13 | `locked_until` | `TIMESTAMPTZ` | False | - | - | Thời điểm tài khoản hết hạn bị khóa tạm thời do nhập sai quá số lần (15 phút). |
| 14 | `last_login_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian ghi nhận lần đăng nhập thành công gần nhất. |
| 15 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo bản ghi người dùng trong cơ sở dữ liệu. |
| 16 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật thông tin người dùng gần nhất. |

###### Table 2.3.1.B: users Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `users_pkey` | B-Tree (PK) | `id` | Khóa chính định danh cụm bảng dữ liệu. |
| `idx_users_email` | B-Tree (Unique) | `email` | Tăng tốc tìm kiếm đăng nhập $O(\log N)$ và chống trùng lặp tài khoản. |
| `idx_users_phone` | B-Tree (Unique) | `phone` | Tra cứu người dùng qua số điện thoại liên lạc. |
| `idx_users_role` | B-Tree | `role` | Lọc danh sách người dùng theo vai trò trong trang quản trị Admin. |
| `idx_users_status` | B-Tree | `status` | Tăng tốc kiểm tra trạng thái khóa tài khoản khi nạp phiên làm việc. |

---

##### 2.3.2 specialties Table
Danh mục các chuyên khoa y tế phục vụ phân loại bác sĩ và phân luồng triệu chứng AI.

###### Table 2.3.2.A: specialties Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của chuyên khoa (UUIDv4). |
| 2 | `name` | `VARCHAR(150)` | True | - | - | Tên hiển thị tiếng Việt của chuyên khoa (ví dụ: Chuyên khoa Tim mạch). |
| 3 | `slug` | `VARCHAR(100)` | True | UNIQUE | - | Định danh dạng chuỗi URL-friendly (ví dụ: `chuyen-khoa-tim-mach`). |
| 4 | `description` | `TEXT` | False | - | - | Mô tả phạm vi khám chữa bệnh và các triệu chứng thuộc chuyên khoa. |
| 5 | `icon_url` | `TEXT` | False | - | - | Đường dẫn biểu tượng đại diện hiển thị trên giao diện người dùng. |
| 6 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo danh mục chuyên khoa. |
| 7 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật danh mục chuyên khoa gần nhất. |

###### Table 2.3.2.B: specialties Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `specialties_pkey` | B-Tree (PK) | `id` | Khóa chính định danh chuyên khoa. |
| `idx_specialties_slug` | B-Tree (Unique) | `slug` | Truy vấn chuyên khoa theo slug đường dẫn tĩnh $O(1)$. |
| `idx_specialties_name_trgm` | GIN | `name gin_trgm_ops` | Tìm kiếm mờ (Fuzzy Search) tên chuyên khoa tiếng Việt có dấu. |

---

##### 2.3.3 doctor_profiles Table
Hồ sơ học thuật, chứng chỉ hành nghề và vector đặc trưng ngữ nghĩa của bác sĩ (Flyway V1, V10, V17, V19).

###### Table 2.3.3.A: doctor_profiles Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
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
| 10 | `department` | `VARCHAR(150)` | False | - | - | Khoa phòng trực thuộc tại bệnh viện công tác (ví dụ: Khoa Tim mạch can thiệp). |
| 11 | `license_issued_by` | `VARCHAR(150)` | False | - | - | Cơ quan có thẩm quyền cấp chứng chỉ hành nghề (Bộ Y Tế / Sở Y Tế tỉnh/thành). |
| 12 | `rating` | `DOUBLE PRECISION`| False | - | `4.9` | Điểm đánh giá trung bình tích lũy từ các bệnh nhân (thang điểm 1.0 đến 5.0). |
| 13 | `total_consultations` | `INT` | False | - | `1250` | Tổng số lượt ca khám lâm sàng bác sĩ đã thực hiện trong sự nghiệp. |
| 14 | `review_count` | `INT` | True | - | `0` | Tổng số lượt bệnh nhân thực tế đã để lại đánh giá nhận xét sau ca khám (Flyway V17). |
| 15 | `is_verified` | `BOOLEAN` | True | - | `FALSE` | Cờ xác nhận hồ sơ và chứng chỉ đã được Admin phê duyệt hợp lệ. |
| 16 | `verified_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian khi Quản trị viên thực hiện phê duyệt hồ sơ bác sĩ. |
| 17 | `bio_embedding` | `vector(1536)` | False | - | HNSW (m=24, ef_construction=128) | Vector đặc trưng ngữ nghĩa 1536 chiều của tiểu sử bác sĩ sinh bởi OpenAI (Flyway V19). |
| 18 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm đăng ký hồ sơ bác sĩ vào hệ thống. |
| 19 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật hồ sơ bác sĩ gần nhất. |

###### Table 2.3.3.B: doctor_profiles Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `doctor_profiles_pkey` | B-Tree (PK) | `id` | Khóa chính định danh hồ sơ bác sĩ. |
| `doctor_profiles_user_id_key`| B-Tree (Unique) | `user_id` | Đảm bảo quan hệ 1:1 nghiêm ngặt giữa tài khoản người dùng và hồ sơ bác sĩ. |
| `idx_doctor_verified` | B-Tree | `is_verified` | Lọc nhanh các bác sĩ đã được phê duyệt khi hiển thị ra cổng tìm kiếm người bệnh. |
| `idx_doctor_license` | B-Tree (Unique) | `license_number` | Chống giả mạo và trùng lặp số chứng chỉ hành nghề y tế. |
| `idx_doctor_bio_hnsw` | **HNSW (vector_cosine_ops)** | `bio_embedding` | **Chỉ mục đồ thị vector HNSW (m=24, ef_construction=128)** phục vụ tìm kiếm ngữ nghĩa Cosine Similarity với độ trễ < 1ms (Flyway V10, V19). |

###### Table 2.3.3.C: doctor_profiles Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_doctor_profiles_user` | `user_id` | `users(id)` | CASCADE | CASCADE | Khi xóa tài khoản người dùng, toàn bộ hồ sơ bác sĩ bị xóa đồng bộ. |

---

##### 2.3.4 doctor_specialties Table
Bảng liên kết nhiều-nhiều giữa bác sĩ và các chuyên khoa lâm sàng.

###### Table 2.3.4.A: doctor_specialties Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `doctor_profile_id` | `UUID` | True | PK, FK | REFERENCES `doctor_profiles(id)` | Khóa ngoại tham chiếu đến hồ sơ bác sĩ trong bảng `doctor_profiles`. |
| 2 | `specialty_id` | `UUID` | True | PK, FK | REFERENCES `specialties(id)` | Khóa ngoại tham chiếu đến chuyên khoa lâm sàng trong bảng `specialties`. |

###### Table 2.3.4.B: doctor_specialties Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `doctor_specialties_pkey` | B-Tree (PK) | (`doctor_profile_id`, `specialty_id`) | Khóa chính phức hợp đảm bảo tính duy nhất của cặp bác sĩ - chuyên khoa. |
| `idx_doctor_specialties_specialty_id` | B-Tree | `specialty_id` | Tăng tốc độ truy vấn ngược tìm tất cả bác sĩ thuộc một chuyên khoa (Flyway V11). |

###### Table 2.3.4.C: doctor_specialties Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_doc_spec_profile` | `doctor_profile_id` | `doctor_profiles(id)` | CASCADE | CASCADE | Tự động xóa liên kết khi hồ sơ bác sĩ bị xóa. |
| `fk_doc_spec_specialty`| `specialty_id` | `specialties(id)` | RESTRICT | CASCADE | Chặn xóa chuyên khoa nếu đang có bác sĩ phụ trách. |

---

##### 2.3.5 doctor_schedule_slots Table
Lịch làm việc định kỳ hàng tuần được cấu hình bởi bác sĩ để bệnh nhân đặt lịch hẹn.

###### Table 2.3.5.A: doctor_schedule_slots Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của khung giờ làm việc (UUIDv4). |
| 2 | `doctor_profile_id` | `UUID` | True | FK | REFERENCES `doctor_profiles(id)` | Khóa ngoại tham chiếu đến bác sĩ thiết lập lịch làm việc. |
| 3 | `day_of_week` | `VARCHAR(20)` | True | - | - | Ngày trong tuần phục vụ khám: `MONDAY`, `TUESDAY`, ..., `SATURDAY`. |
| 4 | `start_time` | `TIME` | True | - | - | Giờ bắt đầu nhận ca khám (ví dụ: `08:00:00`). |
| 5 | `end_time` | `TIME` | True | - | - | Giờ kết thúc nhận ca khám (ví dụ: `12:00:00`). |
| 6 | `slot_duration_minutes`| `INT` | True | - | `30` | Thời lượng phân bổ cho mỗi ca khám lâm sàng (mặc định 30 phút). |
| 7 | `is_active` | `BOOLEAN` | True | - | `TRUE` | Trạng thái sẵn sàng nhận lịch của khung thời gian này. |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cấu hình khung giờ làm việc. |

###### Table 2.3.5.B: doctor_schedule_slots Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `doctor_schedule_slots_pkey` | B-Tree (PK) | `id` | Khóa chính định danh khung giờ. |
| `idx_doctor_schedule_lookup` | B-Tree | (`doctor_profile_id`, `day_of_week`, `is_active`) | Tăng tốc thuật toán sinh slot lịch khám tự động khi bệnh nhân chọn ngày. |

###### Table 2.3.5.C: doctor_schedule_slots Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_doc_schedule_profile` | `doctor_profile_id` | `doctor_profiles(id)` | CASCADE | CASCADE | Xóa các khung giờ làm việc khi hồ sơ bác sĩ bị xóa. |

---

##### 2.3.6 patient_profiles Table
Hồ sơ hành chính y tế và bệnh án điện tử cơ sở của bệnh nhân (EMR Passport).

###### Table 2.3.6.A: patient_profiles Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
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

###### Table 2.3.6.B: patient_profiles Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `patient_profiles_pkey` | B-Tree (PK) | `id` | Khóa chính định danh hồ sơ bệnh nhân. |
| `idx_patient_user_id` | B-Tree (Unique) | `user_id` | Đảm bảo quan hệ 1:1 giữa tài khoản người dùng và hồ sơ y tế. |
| `idx_patient_code` | B-Tree (Unique) | `patient_code` | Tra cứu nhanh thông tin người bệnh bằng mã số tiếp đón bệnh viện. |
| `idx_patient_citizen_id` | B-Tree (Unique) | `citizen_id` | Chống giả mạo và tìm kiếm người bệnh qua số Căn cước công dân. |

###### Table 2.3.6.C: patient_profiles Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_patient_profiles_user` | `user_id` | `users(id)` | CASCADE | CASCADE | Đồng bộ xóa thông tin y tế khi tài khoản người bệnh bị xóa. |

---

##### 2.3.7 appointments Table
Thực thể trung tâm lưu trữ toàn diện thông tin đặt lịch, viện phí và hồ sơ bệnh án điện tử (EMR) (Flyway V1, V7, V11, V12, V14, V15).

###### Table 2.3.7.A: appointments Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
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
| 11 | `clinic_room` | `VARCHAR(100)`| False | - | - | Tên phòng khám vật lý hoặc phòng khám trực tuyến (ví dụ: `Phòng 302 - Tòa A`). |
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
| 23 | `medical_document_id`| `UUID` | False | FK | REFERENCES `medical_documents(id)` | Khóa ngoại tham chiếu tệp xét nghiệm đính kèm vào ca hẹn khám (Flyway V14). |
| 24 | `triage_session_id` | `UUID` | False | FK | REFERENCES `triage_sessions(id)` | Khóa ngoại tham chiếu phiên phân luồng nguồn phát sinh lịch hẹn (Flyway V15). |
| 25 | `refund_amount` | `NUMERIC(12, 2)`| False | - | - | Số tiền viện phí đã hoàn trả tự động cho bệnh nhân khi hủy hẹn (Flyway V15). |
| 26 | `refunded_at` | `TIMESTAMPTZ` | False | - | - | Thời điểm lệnh hoàn tiền tự động được xác nhận thành công (Flyway V15). |
| 27 | `version` | `BIGINT` | True | - | `0` | Số hiệu phiên bản phục vụ cơ chế khóa lạc quan (Optimistic Locking). |
| 28 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm tạo lịch khám trong cơ sở dữ liệu. |
| 29 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm cập nhật trạng thái lịch khám gần nhất. |

###### Table 2.3.7.B: appointments Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `appointments_pkey` | B-Tree (PK) | `id` | Khóa chính định danh cuộc hẹn. |
| `idx_appointments_code` | B-Tree (Unique) | `appointment_code` | Tra cứu chi tiết phiếu khám qua mã code duy nhất. |
| `idx_appointments_patient` | B-Tree | `patient_id` | Tra cứu lịch sử khám bệnh của bệnh nhân. |
| `idx_appointments_doctor` | B-Tree | `doctor_id` | Tra cứu lịch làm việc của bác sĩ. |
| `idx_appointments_status` | B-Tree | `status` | Lọc các ca khám theo trạng thái (`SCHEDULED`, `COMPLETED`). |
| `idx_appointments_patient_schedule` | B-Tree | (`patient_id`, `scheduled_start DESC`) | Tối ưu hóa phân trang lịch sử khám của bệnh nhân (Flyway V11). |
| `idx_appointments_doctor_schedule` | B-Tree | (`doctor_id`, `scheduled_start DESC`) | Tối ưu hóa hiển thị hàng đợi khám trong ngày của bác sĩ (Flyway V11). |
| `idx_appointments_scheduled_start_desc`| B-Tree | `scheduled_start DESC` | Tăng tốc độ truy vấn giám sát toàn bệnh viện trên Admin Dashboard (Flyway V12). |

###### Table 2.3.7.C: appointments Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_appointments_patient` | `patient_id` | `users(id)` | RESTRICT | CASCADE | Chặn xóa người dùng nếu đang có lịch hẹn khám. |
| `fk_appointments_doctor` | `doctor_id` | `users(id)` | RESTRICT | CASCADE | Chặn xóa bác sĩ nếu đang có lịch khám lâm sàng. |
| `fk_appointments_med_doc` | `medical_document_id` | `medical_documents(id)` | SET NULL | CASCADE | Giữ nguyên lịch hẹn nếu hồ sơ xét nghiệm đính kèm bị xóa. |
| `fk_appointments_triage` | `triage_session_id` | `triage_sessions(id)` | SET NULL | CASCADE | Giữ nguyên lịch hẹn nếu phiên phân luồng bị xóa. |

---

##### 2.3.8 triage_sessions Table
Nhật ký các phiên phân luồng triệu chứng AI và cảnh báo khẩn cấp y tế (Flyway V1, V11, V12).

###### Table 2.3.8.A: triage_sessions Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của phiên phân luồng triệu chứng (UUIDv4). |
| 2 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bệnh nhân thực hiện phân luồng (nếu đã đăng nhập). |
| 3 | `patient_name` | `VARCHAR(255)`| False | - | - | Tên bệnh nhân nhập liệu trong trường hợp thực hiện phân luồng nặc danh. |
| 4 | `symptoms_text` | `TEXT` | True | - | - | Nội dung mô tả triệu chứng gốc bằng tiếng Việt do người dùng nhập vào. |
| 5 | `is_emergency` | `BOOLEAN` | True | - | `FALSE` | Cờ phát hiện dấu hiệu đe dọa tính mạng (đau thắt ngực, khó thở cấp, đột quỵ). |
| 6 | `urgency_level` | `VARCHAR(20)` | True | - | - | Mức độ khẩn cấp y tế: `ROUTINE`, `URGENT`, `EMERGENCY` (Cấp cứu 115). |
| 7 | `primary_specialty` | `VARCHAR(100)`| False | - | - | Tên chuyên khoa lâm sàng được động cơ AI đề xuất phù hợp nhất. |
| 8 | `sbar_summary` | `TEXT` | False | - | - | Tóm tắt cấu trúc theo chuẩn giao tiếp y tế SBAR (Situation, Background, Assessment, Recommendation). |
| 9 | `ai_advice` | `TEXT` | False | - | - | Lời khuyên chăm sóc ban đầu và hướng dẫn theo dõi an toàn từ hệ thống AI. |
| 10 | `conversation_history` | `TEXT` | False | - | - | Toàn bộ chuỗi hội thoại tương tác hỏi đáp giữa bệnh nhân và trợ lý ảo. |
| 11 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm khởi tạo phiên phân luồng triệu chứng. |

###### Table 2.3.8.B: triage_sessions Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `triage_sessions_pkey` | B-Tree (PK) | `id` | Khóa chính định danh phiên phân luồng. |
| `idx_triage_user` | B-Tree | `user_id` | Tra cứu lịch sử phân luồng theo tài khoản người bệnh. |
| `idx_triage_urgency` | B-Tree | `urgency_level` | Thống kê phân bổ mức độ khẩn cấp y tế trên dashboard. |
| `idx_triage_user_created` | B-Tree | (`user_id`, `created_at DESC`) | Tối ưu hóa phân trang lịch sử phân luồng của bệnh nhân (Flyway V11). |
| `idx_triage_sessions_created_desc`| B-Tree | `created_at DESC` | Tăng tốc độ truy vấn giám sát phân luồng thời gian thực của Quản trị viên (Flyway V12). |
| `idx_triage_emergency_partial` | **Partial B-Tree** | `is_emergency` WHERE `is_emergency = true` | **Chỉ mục bộ phận (Partial Index) đạt tốc độ $O(1)$** khi đếm số ca cấp cứu khẩn cấp (Flyway V12). |

###### Table 2.3.8.C: triage_sessions Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_triage_user` | `user_id` | `users(id)` | SET NULL | CASCADE | Giữ lại lịch sử phân luồng ẩn danh khi tài khoản người dùng bị xóa. |

---

##### 2.3.9 medical_documents Table
Quản lý siêu dữ liệu các tệp tin hồ sơ bệnh án được lưu trữ riêng tư trên Supabase S3 (Flyway V1, V11, V20).

###### Table 2.3.9.A: medical_documents Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của tài liệu y tế (UUIDv4). |
| 2 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bệnh nhân sở hữu tệp tài liệu y tế này. |
| 3 | `file_name` | `VARCHAR(255)`| True | - | - | Tên gốc của tệp tin do người dùng tải lên (ví dụ: `ket_qua_xet_nghiem_mau.pdf`). |
| 4 | `file_size_bytes` | `BIGINT` | True | - | - | Dung lượng tệp tin tính theo đơn vị Bytes (giới hạn tối đa 10MB per file). |
| 5 | `content_type` | `VARCHAR(100)`| True | - | - | Kiểu định dạng MIME của tệp tin (`application/pdf`, `image/jpeg`, `image/png`). |
| 6 | `storage_path` | `VARCHAR(500)`| False | - | - | Khóa lưu trữ nội bộ riêng tư trên Supabase S3 Bucket (Flyway V20). Loại bỏ hoàn toàn public URL. |
| 7 | `status` | `VARCHAR(50)` | True | - | `'PROCESSED'` | Trạng thái xử lý của tệp tin: `UPLOADED`, `PROCESSING`, `PROCESSED`, `ERROR`. |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm tài liệu được tải lên hệ thống. |

###### Table 2.3.9.B: medical_documents Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `medical_documents_pkey` | B-Tree (PK) | `id` | Khóa chính định danh tài liệu y tế. |
| `idx_med_doc_user` | B-Tree | `user_id` | Lọc toàn bộ hồ sơ cận lâm sàng thuộc quyền sở hữu của người bệnh. |
| `idx_med_doc_user_created` | B-Tree | (`user_id`, `created_at DESC`) | Tối ưu hóa phân trang danh sách tài liệu y tế của bệnh nhân (Flyway V11). |

###### Table 2.3.9.C: medical_documents Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_med_doc_user` | `user_id` | `users(id)` | SET NULL | CASCADE | Bảo tồn tệp tin hồ sơ y khoa phục vụ lưu trữ lưu chiểu khi xóa tài khoản. |

---

##### 2.3.10 document_analyses Table
Kết quả giải nghĩa và trích xuất chỉ số lâm sàng chuyên sâu từ mô hình Vision LLM (Flyway V1, V5, V12).

###### Table 2.3.10.A: document_analyses Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
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

###### Table 2.3.10.B: document_analyses Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `document_analyses_pkey` | B-Tree (PK) | `id` | Khóa chính định danh bản phân tích. |
| `idx_doc_analysis_doc` | B-Tree (Unique) | `document_id` | Đảm bảo quan hệ 1:1 giữa tài liệu y tế và bản phân tích OCR. |
| `idx_doc_analyses_created_desc`| B-Tree | `created_at DESC` | Tăng tốc độ truy vấn danh sách phân tích mới nhất (Flyway V12). |
| `idx_doc_analysis_abnormal_partial` | **Partial B-Tree** | `id` WHERE abnormal_indicators_json IS NOT NULL | **Chỉ mục bộ phận (Partial Index)** tăng tốc lọc tức thời các hồ sơ có kết quả bất thường (Flyway V12). |

###### Table 2.3.10.C: document_analyses Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_doc_analysis_doc` | `document_id` | `medical_documents(id)` | CASCADE | CASCADE | Tự động xóa kết quả phân tích khi tài liệu gốc bị xóa. |

---

##### 2.3.11 payment_transactions Table
Sổ cái ghi nhận toàn bộ các giao dịch nạp tiền, thanh toán viện phí và hoàn tiền (Flyway V13).

###### Table 2.3.11.A: payment_transactions Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
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

###### Table 2.3.11.B: payment_transactions Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `payment_transactions_pkey` | B-Tree (PK) | `id` | Khóa chính định danh giao dịch tài chính. |
| `idx_payment_tx_code` | B-Tree (Unique) | `transaction_code` | Tra cứu đơn hàng tức thời $O(1)$ khi tiếp nhận IPN Webhook từ cổng thanh toán. |
| `idx_payment_tx_user_id` | B-Tree | `user_id` | Lọc toàn bộ lịch sử thanh toán của một người dùng. |
| `idx_payment_tx_gateway_ref` | B-Tree | `gateway_reference` | Phục vụ đối soát với ngân hàng và cổng thanh toán VNPay. |
| `idx_payment_tx_status` | B-Tree | `status` | Quét nhanh các giao dịch đang `PENDING` để đối soát tự động. |
| `idx_payment_tx_created_at` | B-Tree | `created_at DESC` | Tối ưu hóa phân trang báo cáo tài chính trên Admin Dashboard. |

###### Table 2.3.11.C: payment_transactions Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_payment_tx_user` | `user_id` | `users(id)` | CASCADE | CASCADE | Đồng bộ quản lý giao dịch theo tài khoản người dùng. |

---

##### 2.3.12 password_reset_tokens Table
Quản lý các mã token đặt lại mật khẩu với cơ chế băm bảo mật SHA-256 (Flyway V16, V21).

###### Table 2.3.12.A: password_reset_tokens Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của token đặt lại mật khẩu (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến tài khoản người dùng yêu cầu khôi phục. |
| 3 | `token_hash` | `VARCHAR(64)` | True | UNIQUE | - | Chuỗi mã băm một chiều SHA-256 (64 ký tự hex) của token khôi phục gốc (Flyway V21). |
| 4 | `expires_at` | `TIMESTAMPTZ` | True | - | - | Thời điểm token hết hiệu lực (mặc định 15 phút sau khi khởi tạo). |
| 5 | `used` | `BOOLEAN` | True | - | `FALSE` | Cờ ghi nhận token đã được sử dụng để đổi mật khẩu thành công hay chưa. |
| 6 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người dùng gửi yêu cầu quên mật khẩu. |

###### Table 2.3.12.B: password_reset_tokens Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `password_reset_tokens_pkey`| B-Tree (PK) | `id` | Khóa chính định danh bản ghi token. |
| `idx_prt_token_hash` | B-Tree (Unique) | `token_hash` | Xác thực nhanh mã băm SHA-256 trong thời gian $O(1)$ khi người dùng nhấn link. |
| `idx_prt_user_id` | B-Tree | `user_id` | Quản lý và vô hiệu hóa các token cũ khi người dùng yêu cầu token mới. |

###### Table 2.3.12.C: password_reset_tokens Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_prt_user` | `user_id` | `users(id)` | CASCADE | CASCADE | Tự động hủy toàn bộ token liên quan khi tài khoản bị xóa. |

---

##### 2.3.13 email_verification_tokens Table
Cổng bảo mật xác thực quyền sở hữu email đối với các tài khoản đăng ký mới (Flyway V22).

###### Table 2.3.13.A: email_verification_tokens Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản ghi kích hoạt email (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến tài khoản người dùng mới đăng ký. |
| 3 | `token_hash` | `VARCHAR(64)` | True | UNIQUE | - | Chuỗi mã băm SHA-256 (64 ký tự hex) bảo vệ token xác thực gửi trong email. |
| 4 | `expires_at` | `TIMESTAMPTZ` | True | - | - | Thời điểm token kích hoạt hết hạn (thời lượng tối đa 24 giờ). |
| 5 | `used_at` | `TIMESTAMPTZ` | False | - | - | Dấu thời gian người dùng nhấp vào link và kích hoạt thành công tài khoản. |
| 6 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm hệ thống phát sinh token và gửi email kích hoạt. |

###### Table 2.3.13.B: email_verification_tokens Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `email_verification_tokens_pkey`| B-Tree (PK) | `id` | Khóa chính định danh token kích hoạt. |
| `idx_evt_token_hash` | B-Tree (Unique) | `token_hash` | Xác thực tức thời $O(1)$ token kích hoạt email. |
| `idx_evt_user_id` | B-Tree | `user_id` | Tra cứu token kích hoạt hiện hữu của người dùng. |

###### Table 2.3.13.C: email_verification_tokens Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_evt_user` | `user_id` | `users(id)` | CASCADE | CASCADE | Tự động xóa token kích hoạt khi tài khoản bị xóa. |

---

##### 2.3.14 notifications Table
Hộp thư thông báo trong ứng dụng phục vụ cập nhật tiến trình lịch khám và tài chính (Flyway V16).

###### Table 2.3.14.A: notifications Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản tin thông báo (UUIDv4). |
| 2 | `user_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người dùng nhận thông báo này. |
| 3 | `type` | `VARCHAR(50)` | True | - | - | Loại thông báo: `APPOINTMENT_REMINDER`, `PAYMENT_SUCCESS`, `SYSTEM_ALERT`. |
| 4 | `title` | `VARCHAR(255)`| True | - | - | Tiêu đề tóm tắt của bản tin thông báo hiển thị cho người dùng. |
| 5 | `message` | `TEXT` | True | - | - | Nội dung chi tiết của bản tin thông báo. |
| 6 | `is_read` | `BOOLEAN` | True | - | `FALSE` | Cờ trạng thái đã đọc của người dùng (`TRUE` nếu đã mở xem). |
| 7 | `metadata_json` | `TEXT` | False | - | - | Dữ liệu phụ dạng JSON (mã lịch hẹn, đường dẫn chuyển hướng nhanh). |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm thông báo được phát sinh và gửi tới hộp thư người dùng. |

###### Table 2.3.14.B: notifications Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `notifications_pkey` | B-Tree (PK) | `id` | Khóa chính bản tin thông báo. |
| `idx_notifications_user_read`| B-Tree | (`user_id`, `is_read`, `created_at DESC`) | Tối ưu hóa truy vấn lấy danh sách thông báo chưa đọc hiển thị trên chuông giao diện. |

###### Table 2.3.14.C: notifications Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_notifications_user` | `user_id` | `users(id)` | CASCADE | CASCADE | Tự động xóa thông báo khi tài khoản người dùng bị xóa. |

---

##### 2.3.15 doctor_reviews Table
Đánh giá chất lượng và phản hồi từ bệnh nhân sau khi hoàn thành lượt khám bệnh (Flyway V17).

###### Table 2.3.15.A: doctor_reviews Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của bản ghi đánh giá (UUIDv4). |
| 2 | `appointment_id` | `UUID` | True | FK | UNIQUE, REFERENCES `appointments(id)` | Khóa ngoại duy nhất trỏ tới lượt khám đã hoàn tất được đánh giá (1 ca khám = 1 đánh giá). |
| 3 | `doctor_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bác sĩ nhận đánh giá. |
| 4 | `patient_id` | `UUID` | True | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến bệnh nhân thực hiện đánh giá. |
| 5 | `rating` | `INT` | True | - | `CHECK (rating >= 1 AND rating <= 5)` | Điểm số đánh giá chất lượng ca khám (1 đến 5 sao). |
| 6 | `comment` | `TEXT` | False | - | - | Nhận xét chi tiết của người bệnh về thái độ, trình độ chuyên môn của bác sĩ. |
| 7 | `tags` | `VARCHAR(255)`| False | - | - | Các nhãn gắn nhanh (ví dụ: `Tận tâm`, `Đúng giờ`, `Giải thích rõ ràng`). |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người bệnh gửi bản đánh giá lên hệ thống. |
| 9 | `updated_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm người bệnh chỉnh sửa nội dung đánh giá gần nhất. |

###### Table 2.3.15.B: doctor_reviews Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `doctor_reviews_pkey` | B-Tree (PK) | `id` | Khóa chính bản ghi đánh giá. |
| `idx_doctor_reviews_appointment`| B-Tree (Unique) | `appointment_id` | Chống gửi đánh giá trùng lặp nhiều lần cho cùng một cuộc hẹn khám. |
| `idx_doctor_reviews_doctor` | B-Tree | `doctor_id` | Tăng tốc độ tính điểm trung bình và nạp danh sách nhận xét của bác sĩ. |
| `idx_doctor_reviews_patient` | B-Tree | `patient_id` | Tra cứu lịch sử đánh giá của người bệnh. |

###### Table 2.3.15.C: doctor_reviews Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_doc_reviews_appt` | `appointment_id` | `appointments(id)` | CASCADE | CASCADE | Xóa đánh giá nếu lượt khám bị xóa. |
| `fk_doc_reviews_doctor`| `doctor_id` | `users(id)` | CASCADE | CASCADE | Xóa các đánh giá khi tài khoản bác sĩ bị xóa. |
| `fk_doc_reviews_patient`| `patient_id` | `users(id)` | CASCADE | CASCADE | Xóa các đánh giá khi tài khoản người bệnh bị xóa. |

---

##### 2.3.16 audit_logs Table
Nhật ký kiểm toán an ninh bất biến tuân thủ tiêu chuẩn HIPAA và Bộ Y Tế Việt Nam (Flyway V1, V6).

###### Table 2.3.16.A: audit_logs Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
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

###### Table 2.3.16.B: audit_logs Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `audit_logs_pkey` | B-Tree (PK) | `id` | Khóa chính bản ghi kiểm toán. |
| `idx_audit_created` | B-Tree | `created_at DESC` | Tối ưu hóa phân trang truy xuất dòng thời gian sự kiện mới nhất. |
| `idx_audit_action` | B-Tree | `action` | Lọc sự kiện an ninh theo phân loại hành động. |
| `idx_audit_user_id` | B-Tree | `user_id` | Truy vết toàn bộ hành vi của một đối tượng người dùng cụ thể. |

###### Table 2.3.16.C: audit_logs Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_audit_logs_user` | `user_id` | `users(id)` | SET NULL | CASCADE | Giữ nguyên vết kiểm toán an ninh vĩnh viễn ngay cả khi tài khoản người dùng bị xóa. |

---

##### 2.3.17 ai_token_usage Table
Sổ kế toán tiêu thụ điện toán trí tuệ nhân tạo (FinOps AI Auditing) (Flyway V1, V18).

###### Table 2.3.17.A: ai_token_usage Column Specifications
| No | Column Name | Data Type | Not Null | Key | Constraints & Default | Detailed Functional Description |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- |
| 1 | `id` | `UUID` | True | PK | `gen_random_uuid()` | Định danh duy nhất của lượt ghi nhận token AI (UUIDv4). |
| 2 | `user_id` | `UUID` | False | FK | REFERENCES `users(id)` | Khóa ngoại tham chiếu đến người dùng phát sinh yêu cầu suy luận AI. |
| 3 | `model_name` | `VARCHAR(100)`| True | - | - | Tên mô hình AI được triệu gọi (`text-embedding-3-small`, `gemini-1.5-flash`). |
| 4 | `prompt_tokens` | `INT` | True | - | - | Số lượng Token đầu vào (Prompt Tokens) trong yêu cầu suy luận. |
| 5 | `completion_tokens` | `INT` | True | - | - | Số lượng Token đầu ra (Completion Tokens) do mô hình sinh ra. |
| 6 | `total_tokens` | `INT` | True | - | - | Tổng số lượng Token tiêu thụ trong phiên làm việc. |
| 7 | `estimated_cost_usd` | `NUMERIC(10, 6)`| False | - | `0.000000` | Chi phí điện toán ước tính quy đổi sang đồng Đô-la Mỹ (USD). |
| 8 | `created_at` | `TIMESTAMPTZ` | True | - | `CURRENT_TIMESTAMP` | Thời điểm tác vụ suy luận AI được máy chủ thực thi hoàn tất. |

###### Table 2.3.17.B: ai_token_usage Physical Indexes & Optimization
| Index Name | Index Type | Columns / Expressions | Performance & Architectural Purpose |
| :--- | :---: | :--- | :--- |
| `ai_token_usage_pkey` | B-Tree (PK) | `id` | Khóa chính bản ghi kế toán token. |
| `idx_ai_token_user_id` | B-Tree | `user_id` | Thống kê lượng tài nguyên token tiêu thụ của từng người dùng. |
| `idx_ai_token_created_at`| B-Tree | `created_at DESC` | Thống kê tổng chi phí điện toán AI theo ngày, tuần, tháng cho Admin. |

###### Table 2.3.17.C: ai_token_usage Foreign Key Constraints
| Constraint Name | Local Column | Referenced Table(Column) | On Delete | On Update | Architectural Impact |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `fk_ai_token_user` | `user_id` | `users(id)` | SET NULL | CASCADE | Bảo tồn số liệu kế toán chi phí AI ngay cả khi tài khoản bị xóa. |
'''
