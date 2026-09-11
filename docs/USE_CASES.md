# Đặc Tả Use Case Chuẩn Doanh Nghiệp (Enterprise Use Cases Specification)
## MediAssist-AI Telehealth & Clinical AI Platform

> **Tiêu chuẩn tài liệu:** RUP (Rational Unified Process) & IEEE 830 Standard  
> **Dự án:** MediAssist-AI Telehealth Platform  
> **Trạng thái:** Hoàn chỉnh & Đã phê duyệt (Capstone Baseline)  
> **Các tác nhân chính (Actors):**
> 1. **Patient (Bệnh nhân / Người dùng cuối):** Tìm kiếm bác sĩ, trò chuyện triage triệu chứng, tải lên hồ sơ xét nghiệm.
> 2. **Doctor (Bác sĩ chuyên khoa):** Quản lý hồ sơ CCHN, xem tóm tắt lâm sàng AI, tiếp nhận lịch hẹn.
> 3. **Admin (Quản trị viên hệ thống):** Thẩm định bác sĩ, kiểm soát người dùng, cấu hình danh mục chuyên khoa.
> 4. **AI Gateway (Tác nhân bên ngoài):** OpenAI GPT-4o / Gemini 1.5 Pro & Embedding API.

---

## 1. Sơ Đồ Tổng Quan Use Case (Use Case Diagram)

```mermaid
graph TD
    Patient((Bệnh nhân))
    Doctor((Bác sĩ))
    Admin((Quản trị viên))
    AIGateway[AI Gateway Service]

    subgraph "Hệ Thống MediAssist-AI"
        UC01[UC-01: Xác thực kép Bearer + HttpOnly Cookie]
        UC02[UC-02: Phân Luồng Triệu Chứng & Sàng Lọc Red-Flag]
        UC03[UC-03: Tóm Tắt & Giải Nghĩa Hồ Sơ Xét Nghiệm]
        UC04[UC-04: Tìm Kiếm Bác Sĩ Bằng Vector Similarity]
        UC05[UC-05: Đặt Lịch Khám & Chống Trùng Slot]
        UC06[UC-06: Thẩm Định Bác Sĩ & Ghi Nhật Ký Kiểm Toán]
        UC07[UC-07: Giám Sát Sức Khỏe Hệ Thống & Cache 2 Lớp]
    end

    Patient --> UC01
    Patient --> UC02
    Patient --> UC03
    Patient --> UC04
    Patient --> UC05

    Doctor --> UC01
    Doctor --> UC05

    Admin --> UC01
    Admin --> UC06
    Admin --> UC07

    UC02 -.->|Gọi API| AIGateway
    UC03 -.->|Gọi Multimodal API| AIGateway
    UC04 -.->|Cosine Search| UC02
```

---

## 2. Chi Tiết Các Use Case Lâm Sàng & Nghiệp Vụ

---

### UC-01: Xác Thực Kép Chuẩn Doanh Nghiệp (Dual-Transport Authentication)

* **Mã Use Case:** `UC-SEC-01`
* **Tác nhân chính:** Patient, Doctor, Admin.
* **Mục tiêu:** Cung cấp cơ chế đăng nhập bảo mật cao, kết hợp linh hoạt giữa Web Browser (`HttpOnly` Cookie chống XSS) và Mobile/Third-party Client (`Bearer` Authorization header).
* **Tiền điều kiện:** Người dùng đã có tài khoản trên hệ thống và trạng thái `is_active = true`.
* **Hậu điều kiện thành công:**
  - Token JWT được sinh ra với TTL 15 phút (Access Token) và 7 ngày (Refresh Token).
  - Trình duyệt lưu cookie an toàn `Set-Cookie: access_token=...; HttpOnly; SameSite=Strict; Secure`.
  - Frontend hydration từ localStorage giữ trạng thái đăng nhập tức thì không giật lag.

##### Luồng sự kiện chính (Happy Path):
1. **Trường hợp Người dùng mới (Bệnh nhân tự đăng ký):**
   - Bệnh nhân chọn tab *"Đăng Ký Bệnh Nhân Mới"* trên `/login`.
   - Điền: Họ tên, Email, Mật khẩu, Số điện thoại, Giới tính, Ngày sinh, Địa chỉ.
   - Trình duyệt gửi `POST /api/v1/auth/register`.
   - Backend `AuthService.register()` kiểm tra tính duy nhất của email, băm mật khẩu bằng BCrypt, tự động sinh mã hồ sơ bệnh án điện tử EMR `patient_code` dạng `BN-2026-XXXXX`, trả về `HTTP 201 Created` kèm token và set `HttpOnly` cookie.
2. **Trường hợp Đăng nhập:**
   - Người dùng nhập Email + Mật khẩu.
   - Rate Limiter phân tán trên Redis kiểm tra tần suất IP (`< 5 requests / phút`).
   - Trình duyệt gửi `POST /api/v1/auth/login`.
   - `AuthService` kiểm tra khóa tài khoản (`locked_until`). Nếu tài khoản đang bị khóa, trả về ngay `HTTP 423 Locked`.
   - `PasswordEncoder` kiểm tra mật khẩu. Nếu khớp, đặt lại `failed_login_attempts = 0`, cấp token JWT và `HttpOnly` cookie.
   - Frontend lưu trữ thông tin vào Zustand Auth Store và chuyển hướng người dùng theo role:
     - `ADMIN` $\rightarrow$ `/admin`
     - `DOCTOR` $\rightarrow$ `/doctor`
     - `PATIENT` $\rightarrow$ `/patient`

#### Luồng phụ & Ngoại lệ (Alternative / Exception Flows):
* **2a. Quá tải tần suất đăng nhập từ 1 IP (Anti-DDoS / Rate Limit):** Khi 1 IP gửi quá 5 request login trong 1 phút, hệ thống từ chối với `HTTP 429 Too Many Requests`.
* **2b. Sai mật khẩu liên tiếp (Anti-Brute Force Account Lockout):** Mỗi lần sai, `failed_login_attempts` tăng 1. Sau đúng 5 lần sai, tài khoản tự động bị khóa trong 15 phút, trả về `HTTP 423 Locked` kèm cảnh báo thời gian còn lại.
* **2c. Đăng ký email đã tồn tại:** Trả về `HTTP 409 Conflict` với thông báo thân thiện bằng tiếng Việt.

---

### UC-02: Phân Luồng Triệu Chứng Bằng AI & Rào Chắn Cấp Cứu (AI Symptom Triage)

* **Mã Use Case:** `UC-CLIN-02`
* **Tác nhân chính:** Patient, Trợ lý AI (OpenAI/Gemini/Deterministic Scribe).
* **Mục tiêu:** Thu thập lời khai triệu chứng của bệnh nhân, nhận diện dấu hiệu nguy hiểm (Red-flag), phân loại mức độ khẩn cấp (`ROUTINE`, `URGENT`, `EMERGENCY`), tạo bản tóm tắt SBAR và tự động kết nối đề xuất Bác sĩ chuyên khoa qua `pgvector`.
* **Tiền điều kiện:** Người dùng **ĐÃ ĐĂNG NHẬP** (Zero-Trust Login-First, mọi truy cập ẩn danh nhận ngay `HTTP 401 Unauthorized`), và xác nhận đồng ý với *Tuyên bố từ chối trách nhiệm y tế (Medical Disclaimer)*. Tuân thủ hạn mức Rate Limit (tối đa 10 lượt triage/phút).
* **REST Endpoints:**
  - `POST /api/v1/triage/assess`: Nhận diện triệu chứng, kiểm tra Red-Flag và trả về đánh giá SBAR kèm danh sách Bác sĩ đề xuất.
  - `GET /api/v1/triage/history`: Lấy danh sách lịch sử phân luồng của người dùng hiện tại.

#### Luồng sự kiện chính (Happy Path):
1. Bệnh nhân nhập mô tả triệu chứng: *"Tôi hay bị hồi hộp, đánh trống ngực và choáng váng khi vận động mạnh"*.
2. **Hard Rule Red-flag Check:** `RedFlagService` quét chuỗi triệu chứng bằng các mẫu regex tối cấp (Acute Coronary Syndrome, Stroke FAST, Anaphylaxis, Severe Hemorrhage).
3. Triệu chứng KHÔNG thuộc cấp cứu tức thời:
   - Hệ thống tiến hành phân loại mức độ khẩn cấp (`ROUTINE`).
   - Định hướng chuyên khoa mục tiêu (`Cardiology (Tim Mạch)`).
   - Tạo báo cáo lâm sàng chuẩn SBAR (Situation, Background, Assessment, Recommendation).
   - Tự động gọi `DoctorSemanticSearchService` sử dụng khoảng cách Cosine trên PostgreSQL `pgvector` để tìm top Bác sĩ chuyên khoa tim mạch đã qua thẩm định (`similarity_score > 0.90`).
4. Lưu thông tin phiên vào bảng `triage_sessions`.
5. Giao diện hiển thị thẻ kết quả Triage, lời khuyên của AI, câu hỏi gợi ý và danh thiếp Bác sĩ đề xuất kèm nút *"Đặt Khám Ngay"*.

#### Luồng cấp cứu (Red-Flag Emergency Flow):
* **2a. Phát hiện dấu hiệu đột quỵ / nhồi máu cơ tim / sốc phản vệ:**
  - Hệ thống ngắt quy trình gọi LLM ngay lập tức (0ms LLM latency, 0 token cost).
  - Trả về `isEmergency = true`, mức độ `EMERGENCY`.
  - Màn hình chuyển sang trạng thái cảnh báo đỏ nguy cấp với nút bấm gọi nhanh 115 và hướng dẫn xử trí tại chỗ.

---

### UC-03: Tóm Tắt & Giải Nghĩa Phiếu Xét Nghiệm Bằng AI Đa Phương Thức (Multimodal Document Summarization & Token Protection)

* **Mã Use Case:** `UC-CLIN-03`
* **Tác nhân chính:** Patient, Apache PDFBox Parser, MedicalDocumentValidator, Supabase Storage, pgvector Semantic Matching Engine.
* **Mục tiêu:** Chuyển đổi kết quả xét nghiệm máu/sinh hóa/nước tiểu từ tài liệu PDF phức tạp thành bảng chỉ số đối chiếu dễ hiểu cho người bệnh, cảnh báo bất thường, đề xuất bác sĩ chuyên khoa phù hợp tức thì; đồng thời bảo vệ 100% token AI và lưu trữ an toàn trên Cloud EMR.
* **Tiền điều kiện:** 
  - Người dùng **ĐÃ ĐĂNG NHẬP** (Zero-Trust Login-First, từ chối khách vãng lai với `HTTP 401 Unauthorized`).
  - Người dùng có hạn ngạch quét (`scanQuota > 0`) hoặc là hội viên `MediPass VIP` (nếu hết lượt, chuyển sang ngoại lệ `HTTP 402 Payment Required`).
  - Tuân thủ Rate Limiter (tối đa 5 lượt tải lên/phút) và giới hạn kích thước tệp tối đa 15MB.
* **REST Endpoints:**
  - `POST /api/v1/documents/analyze`: Tiếp nhận tệp PDF xét nghiệm qua `multipart/form-data` (tham số `file`), kiểm tra SHA-256 deduplication, sàng lọc gatekeeper, bóc tách chỉ số sinh hóa, upload Supabase Storage, trừ hạn ngạch và tìm kiếm bác sĩ qua pgvector.
  - `GET /api/v1/documents/quota`: Kiểm tra số lượt quét khả dụng, hạn hội viên VIP và trạng thái gói cước của người bệnh.
  - `GET /api/v1/documents/my`: Truy vấn lịch sử các tài liệu y tế đã phân tích của người bệnh đăng nhập (yêu cầu Bearer Token).

#### Luồng sự kiện chính (Happy Path):
1. Bệnh nhân tải lên tệp kết quả xét nghiệm (`.pdf` hoặc `.txt`, dung lượng $\le 15\text{MB}$) hoặc chọn dữ liệu mẫu sinh hóa (Mỡ máu / Men gan).
2. **Kiểm tra Deduplication (SHA-256 Checksum):** Hệ thống tính toán hash SHA-256 của tệp. Nếu tài liệu đã từng được phân tích trong hồ sơ EMR của bệnh nhân này:
   - Trả về ngay kết quả đã lưu trong DB (`cachedResult = true`).
   - Tiêu tốn **0 token AI**, độ trễ $< 5\text{ms}$ và **TUYỆT ĐỐI KHÔNG trừ lượt quét**.
3. **Kiểm tra Hạn Ngạch (Quota Guard):** Nếu tài liệu mới, kiểm tra `user.hasScanQuota()`. Nếu hết lượt và chưa là VIP, trả về `HTTP 402 Payment Required` kèm modal báo giá gói quét.
4. **Cơ chế Lọc Rác Tiền Thẩm Định (Gatekeeper Sieve Validation):**
   - Kiểm tra magic bytes nhị phân (chỉ nhận PDF, JPG, PNG).
   - Kiểm tra độ dài văn bản trích xuất (tối thiểu 15 ký tự; nếu ngắn hơn -> lỗi mờ ảnh `UNREADABLE_DOCUMENT`).
   - Sàng lọc từ điển chỉ số lâm sàng (40+ thuật ngữ xét nghiệm sinh hóa/huyết học).
   - *Nếu phát hiện ảnh rác (hóa đơn siêu thị, meme, chó mèo, ảnh mờ):* Ném lỗi `HTTP 400 NON_MEDICAL_DOCUMENT` hoặc `UNREADABLE_DOCUMENT` và **KHÔNG trừ hạn ngạch** của bệnh nhân.
5. **Lưu trữ Cloud EMR (Supabase Storage):** Tải nhị phân tệp lên bucket `medical-documents` của Supabase qua REST API. Nếu mất mạng hoặc thiếu API key, tự động chuyển vùng dự phòng sang Local EMR Disk không bao giờ sập backend.
6. **Bóc tách chỉ số & Khớp Bác sĩ:**
   - `MedicalDocumentAnalysisService` bóc tách chỉ số (Cholesterol, Triglyceride, Glucose, ALT, AST...) gắn nhãn `ELEVATED` / `LOW` / `NORMAL`.
   - Sinh tóm tắt lâm sàng `clinicalSummary`, bản dịch dễ hiểu `plainLanguageExplanation` và 3 câu hỏi gợi ý.
   - Gọi `DoctorSemanticSearchService` chạy truy vấn `pgvector` Cosine Similarity tìm top bác sĩ chuyên khoa sâu phù hợp.
7. **Khấu trừ Hạn Ngạch:** Trừ 1 lượt quét đối với tài khoản FREE (`scanQuota = scanQuota - 1`). Giữ nguyên không giới hạn đối với hội viên MediPass VIP.
8. Giao diện hiển thị:
   - Huy hiệu hạn ngạch quét & nút "+ Mua thêm".
   - Huy hiệu chứng thực lưu trữ `Supabase Cloud EMR` kèm liên kết xem tệp gốc.
   - Banner thông báo tiết kiệm 100% tài nguyên nếu là lượt hit SHA-256 Deduplication.
   - Bảng so sánh chỉ số cận lâm sàng và danh sách bác sĩ chuyên khoa.

---

### UC-11: Quản Lý Hạn Ngạch Quét & Mô Hình Doanh Thu Win-Win (Commercial Scan Quota & Token Protection)

* **Mã Use Case:** `UC-FIN-11`
* **Tác nhân chính:** Patient, Doctor, System Platform Owner.
* **Mục tiêu:** Bảo vệ tài nguyên AI chống spam tốn chi phí token, triển khai mô hình kinh tế Win-Win đôi bên cùng có lợi (Bệnh nhân tiết kiệm - Bác sĩ gia tăng thu nhập - Nền tảng bền vững).
* **REST Endpoints:**
  - `GET /api/v1/documents/quota`: Lấy thông tin hạn ngạch quét còn lại và trạng thái gói cước VIP.
* **Chính sách Thương Mại Doanh Nghiệp:**
  1. **Bệnh nhân:**
     - Tặng **1 lượt quét miễn phí** cho tài khoản mới trải nghiệm chất lượng.
     - **Gói lẻ:** 29.000đ / 1 lượt phân tích chuyên sâu.
     - **Gói Tiết kiệm:** 99.000đ / 5 lượt (giảm 32%, hạn dùng 12 tháng).
     - **MediPass VIP:** 149.000đ / tháng (Quét không giới hạn + Tư vấn ưu tiên).
     - **Chính sách Deduplication Vĩnh Viễn:** Tải lại tài liệu đã phân tích hoàn toàn miễn phí trọn đời (0đ, 0 token).
  2. **Bác sĩ Chuyên Khoa:**
     - Nhận **85% phí khám** (250.000đ - 450.000đ/ca) qua cơ chế ký quỹ Escrow minh bạch.
     - Tiếp nhận tóm tắt lâm sàng SBAR chuẩn bị sẵn, tiết kiệm 50% thời gian hội chẩn.
  3. **Platform Owner:**
     - Nhận 15% hoa hồng đặt khám và doanh thu gói quét.
     - Bảo vệ 100% token LLM trước nạn bot/spam ảnh rác nhờ Gatekeeper Sieve Validation.

### UC-04: Tìm Kiếm Bác Sĩ Bằng Vector Similarity Search (Semantic Doctor Discovery)

* **Mã Use Case:** `UC-CLIN-04`
* **Tác nhân chính:** Patient, PostgreSQL với extension `pgvector`.
* **Mục tiêu:** Khớp triệu chứng người bệnh với bác sĩ chuyên khoa sâu có kinh nghiệm điều trị thực tế cao nhất thông qua khoảng cách vector cosine trên chỉ mục HNSW (`vector_cosine_ops`).
* **REST Endpoints:**
  - `GET /api/v1/triage/search/semantic?query={text}&limit={n}`: Tra cứu danh sách bác sĩ tương thích ngữ nghĩa từ câu truy vấn tự nhiên.

#### Luồng sự kiện chính (Happy Path):
1. Người dùng nhập câu tìm kiếm: *"Bác sĩ chuyên tầm soát hẹp mạch vành và rối loạn nhịp tim"*.
2. Hệ thống tạo vector embedding 1536 chiều bằng `EmbeddingService`.
3. Thực thi truy vấn HNSW Vector Search trên bảng `doctor_profiles` với điều kiện `is_verified = true`:
   ```sql
   SELECT dp.*, 1 - (dp.bio_embedding <=> CAST(:vector AS vector)) AS similarity_score
   FROM doctor_profiles dp ...
   ORDER BY dp.bio_embedding <=> CAST(:vector AS vector) ASC
   LIMIT 5;
   ```
4. Trả về danh sách bác sĩ xếp hạng theo độ tương đồng giảm dần (`similarity_score`).
5. Giao diện hiển thị thẻ Bác sĩ gồm: Ảnh đại diện, Học vị, Nơi công tác, Điểm tương đồng (`%`), Giá khám và Nút *"Đặt Khám Ngay"*.

---

### UC-05: Đặt Lịch Khám Từ Xa & Ngăn Chặn Race Condition (Telehealth Appointment Booking)

* **Mã Use Case:** `UC-OPS-05`
* **Tác nhân chính:** Patient, Doctor, Hệ thống thanh toán/đặt chỗ.
* **Mục tiêu:** Đảm bảo một khung giờ (Slot) của bác sĩ chỉ có duy nhất 1 bệnh nhân đặt thành công, ngăn chặn race condition bằng Optimistic Locking (`@Version`), isolation level `REPEATABLE_READ`, và Partial Unique Index.
* **REST Endpoints:**
  - `GET /api/v1/doctors/{id}/slots?date=YYYY-MM-DD`: Tra cứu slot 30 phút khả dụng trong ngày.
  - `POST /api/v1/appointments`: Đặt lịch khám mới (`{ doctorId, scheduledStart, notes }`). Trả về HTTP 201 kèm `appointmentCode`.
  - `GET /api/v1/appointments/my`: Lấy danh sách lịch hẹn của người dùng hiện tại (lọc theo role Patient/Doctor).
  - `PATCH /api/v1/appointments/{id}/status`: Cập nhật trạng thái (`SCHEDULED` -> `COMPLETED` / `CANCELLED`).

#### Luồng sự kiện chính (Happy Path):
1. Bệnh nhân vào trang danh bạ, chọn Bác sĩ, chọn ngày khám và khung giờ còn trống (Ví dụ: `09:00 - 09:30 ngày 12/09/2026`).
2. Bệnh nhân nhập triệu chứng và bấm *"Xác nhận đặt khám"*.
3. Trình duyệt gửi `POST /api/v1/appointments` kèm Bearer token.
4. Backend mở giao dịch `@Transactional(isolation = Isolation.REPEATABLE_READ)`:
   - Kiểm tra xem slot đã có cuộc hẹn nào ở trạng thái không bị hủy chưa qua câu lệnh:
     ```sql
     SELECT COUNT(a) > 0 FROM Appointment a 
     WHERE a.doctor.id = :doctorId AND a.scheduledStart = :scheduledStart 
       AND a.status NOT IN (AppointmentStatus.CANCELLED)
     ```
   - Sinh mã định danh giao dịch chuẩn: `AP-YYYYMMDD-XXXXXX`.
   - Tạo bản ghi mới vào bảng `appointments` với `version = 0`.
   - Ghi nhật ký kiểm toán vào `audit_logs` với action `APPOINTMENT_BOOKED`.
5. Backend trả về HTTP 201 Created cùng `AppointmentDto`.
6. Cuộc hẹn xuất hiện trên bảng điều khiển của cả Bác sĩ (`DoctorDashboard`) và Bệnh nhân (`PatientDashboard`).

#### Luồng xung đột (Conflict Exception Flow):
* **3a. Người khác đã đặt slot trước đó:** `existsConflict` phát hiện trùng giờ $\rightarrow$ Ném ngoại lệ `AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", ...)`. Backend trả về HTTP 409: *"Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác."*

---

### UC-06: Thẩm Định Bác Sĩ & Ghi Nhật Ký Kiểm Toán (Doctor Vetting & Audit Trail)

* **Mã Use Case:** `UC-ADM-06`
* **Tác nhân chính:** Admin, Doctor.
* **Mục tiêu:** Xác minh tính chính danh, bằng cấp và số Chứng chỉ hành nghề (CCHN) của bác sĩ trước khi cho phép hồ sơ hiển thị công khai trên ứng dụng.
* **REST Endpoints:**
  - `GET /api/v1/admin/doctors/pending`: Lấy danh sách hồ sơ bác sĩ chưa xác thực (`isVerified = false`).
  - `POST /api/v1/admin/doctors/{id}/vet`: Phê duyệt hoặc từ chối hồ sơ (`{ approve: boolean, rejectionReason: string }`).
  - `PUT /api/v1/doctors/me/profile`: Bác sĩ tự cập nhật thông tin CCHN, tiểu sử, số năm kinh nghiệm, và giá khám.

#### Luồng sự kiện chính (Happy Path):
1. Admin truy cập đường dẫn `/admin/doctors` (Trang Duyệt Bác Sĩ).
2. Hệ thống gọi `GET /api/v1/admin/doctors/pending` tải danh sách các bác sĩ đang chờ xác minh.
3. Admin kiểm tra số hiệu CCHN, cơ quan cấp phép, số năm kinh nghiệm và chuyên khoa.
4. Admin bấm *"Phê duyệt (Approve)"*:
   - Backend gọi `adminVettingService.vetDoctor(id, true, null, adminId)`.
   - Cập nhật `isVerified = true`, `verifiedAt = NOW()`.
   - Đồng bộ xóa cache: `cacheService.evict("doctors:verified")` trên cả L1 Caffeine và L2 Redis để danh bạ bác sĩ công khai cập nhật ngay lập tức.
   - Ghi nhật ký kiểm toán vào bảng `audit_logs`:
     `action: VET_DOCTOR_APPROVED, actor: admin_id, resource: doctor_profiles/{id}`.
5. Hồ sơ bác sĩ lập tức hiển thị công khai trên `DoctorSearchPage` cho tất cả bệnh nhân tra cứu và đặt lịch.

---

### UC-07: Quản Lý Hộ Chiếu Y Tế & Bệnh Án Điện Tử (Patient EMR Medical Passport)

* **Mã Use Case:** `UC-PAT-07`
* **Tác nhân chính:** Patient, Doctor, Admin.
* **Mục tiêu:** Quản lý toàn bộ thông tin hành chính y tế chuẩn bệnh viện (Mã BN bệnh viện `BN-YYYY-XXXXX`, 12 số CCCD, thẻ BHYT 15 ký tự, nhóm máu, tiền sử dị ứng thuốc và người liên hệ khẩn cấp). Cảnh báo đỏ dị ứng tức thời cho bác sĩ điều trị.
* **REST Endpoints:**
  - `GET /api/v1/patient/profile`: Bệnh nhân tra cứu hồ sơ y tế cá nhân.
  - `PUT /api/v1/patient/profile`: Cập nhật thông tin CCCD, BHYT, nhóm máu, dị ứng, bệnh sử nền.
  - `GET /api/v1/patient/profile/by-user/{userId}`: Bác sĩ điều trị tra cứu hồ sơ bệnh nhân trước ca khám.

#### Luồng sự kiện chính (Happy Path):
1. Bệnh nhân đăng nhập vào hệ thống và truy cập thẻ `Hồ Sơ Y Tế Bệnh Nhân (EMR Medical Passport)` trên Bảng điều khiển.
2. Hệ thống hiển thị Thẻ Y Tế Chuẩn Bệnh Viện:
   - Mã định danh bệnh viện: `BN-2026-08492`.
   - Thẻ CCCD 12 số, Thẻ BHYT 15 số có hạn mức thanh toán bảo hiểm y tế.
   - Nhóm máu (O+, A+, B+, AB+...).
   - Banner Cảnh Báo Đỏ Dị Ứng (Ví dụ: `DỊ ỨNG PENICILLIN (Kháng sinh Beta-lactam) - NGUY CƠ SỐC PHẢN VỆ`).
3. Người bệnh có thể bấm *"Chỉnh Sửa Hồ Sơ Y Tế"* để cập nhật số CCCD, địa chỉ, người liên hệ khẩn cấp.
4. Bác sĩ khi khám bệnh cho bệnh nhân này có thể xem toàn bộ lịch sử bệnh án và các cảnh báo dị ứng thuốc.

---

### UC-08: Thực Hiện Khám Lâm Sàng, Ghi Nhận Sinh Hiệu, Chẩn Đoán ICD-10 & Kê Toa Thuốc Điện Tử (Clinical Encounter & e-Prescription)

* **Mã Use Case:** `UC-DOC-08`
* **Tác nhân chính:** Doctor, Patient.
* **Mục tiêu:** Bác sĩ điều trị tiếp nhận ca khám, nhập bảng chỉ số sinh hiệu (Huyết áp, Mạch, Thân nhiệt, Nhịp thở, SpO2, BMI), chẩn đoán theo mã bệnh danh quốc tế ICD-10 của WHO, kê đơn thuốc điện tử nhiều loại kèm liều dùng / hướng dẫn sử dụng, và dặn dò tái khám.
* **REST Endpoints:**
  - `POST /api/v1/appointments/{id}/complete-clinical`: Bác sĩ hoàn tất ca khám lâm sàng với payload `ClinicalEncounterRequest`.

#### Luồng sự kiện chính (Happy Path):
1. Bác sĩ truy cập Bảng điều khiển lâm sàng `DoctorDashboard`.
2. Tại danh sách lịch hẹn hôm nay, bác sĩ thấy số thứ tự khám `STT 08`, phòng khám `Phòng Khám 204`, và lý do vào viện của bệnh nhân.
3. Bác sĩ bấm *"Khám Lâm Sàng & Kê Đơn (EMR)"* để mở Bàn Làm Việc Bác Sĩ (Clinical Workstation):
   - Nhập bảng sinh hiệu: Huyết áp (135/85 mmHg), Nhịp tim (78 bpm), Thân nhiệt (36.8°C), Nhịp thở (18 bpm), SpO2 (98%), Chiều cao (170cm), Cân nặng (68kg) $\rightarrow$ Hệ thống tự động tính BMI: $23.53\text{ kg/m}^2$ (Thể trạng bình thường).
   - Chọn hoặc nhập mã bệnh danh quốc tế ICD-10 (Ví dụ: `I20.9 - Bệnh tim thiếu máu cục bộ nghẽn mạch vành`).
   - Lập Toa thuốc điện tử đa dòng: Tên thuốc, dạng bào chế, hàm lượng, số lượng, cách dùng (sáng/trưa/chiều/tối, trước/sau ăn), và lưu ý y lệnh.
   - Nhập Kế hoạch điều trị & Chọn ngày hẹn tái khám.
4. Bác sĩ bấm *"Ký Số & Hoàn Tất Khám Lâm Sàng"*.
5. Backend lưu trữ trạng thái `status = 'COMPLETED'`, cập nhật toàn bộ `vitalSignsJson`, `icd10Code`, `prescriptionJson`, và gửi kết quả về bệnh án điện tử của người bệnh.
6. Cả bác sĩ và bệnh nhân đều có thể mở xem bản in Bệnh Án Điện Tử & Toa Thuốc Chuẩn Bệnh Viện (với nút *"In Bệnh Án & Toa Thuốc"* theo mẫu quy chuẩn Bộ Y Tế).

---

### UC-09: Khởi Tạo & Di Trú Dữ Liệu Bệnh Viện Mẫu Bằng Flyway (Automated Database Migration & Hospital Seeding)

* **Mã Use Case:** `UC-SYS-09`
* **Tác nhân chính:** System (Flyway Database Migration Engine), Admin, Tech Lead.
* **Mục tiêu:** Tự động hóa quá trình khởi tạo cấu trúc và nạp dữ liệu chuẩn bệnh viện (12 chuyên khoa, 12 bác sĩ tuyến trung ương, 630 ca khám, 5 hồ sơ bệnh nhân EMR, 8 ca khám lâm sàng thực thụ) ngay khi ứng dụng khởi động, loại bỏ hoàn toàn mã nguồn giả lập (mock data) và thao tác thủ công.
* **Các bước di trú (Migration Execution):**
  1. Khi Spring Boot khởi động, `FlywayAutoConfiguration` kích hoạt kết nối tới PostgreSQL `mediassist_db`.
  2. Flyway kiểm tra bảng `flyway_schema_history`:
     - Áp dụng `V1__initial_schema.sql`: Khởi tạo 12 bảng thực thể cốt lõi, extensions vector và các ràng buộc toàn vẹn.
     - Áp dụng `V2__seed_rich_hospital_data.sql`: Nạp tập dữ liệu thực tế chuẩn bệnh viện tuyến trung ương (12 chuyên khoa, 12 chuyên gia y tế, 630 slots định kỳ, 5 hồ sơ EMR, 8 ca khám lâm sàng).
  3. `DoctorSemanticSearchService` tự động sinh và nạp vector nhúng 1536 chiều vào cột `bio_embedding` cho toàn bộ bác sĩ.
  4. Trạng thái di trú được ghi nhận thành công (`success = true`) trong bảng lịch sử kiểm soát phiên bản.

---

### UC-10: Bảo Mật Zero-Trust, Phòng Thủ Brute-Force & Kiểm Soát Tải Tần Suất Cao (Zero-Trust Security & Rate Limiting Hardening)

* **Mã Use Case:** `UC-SEC-10`
* **Tác nhân chính:** Attacker/Botnet, Valid User, SecurityRateLimiterService, AuthService, PostgreSQL.
* **Mục tiêu:** Bảo vệ nền tảng y tế khỏi các cuộc tấn công Brute-force vét cạn mật khẩu, xâm nhập trái phép, DoS/DDoS làm sập hệ thống hoặc làm cạn kiệt chi phí API LLM.
* **Quy tắc bảo mật bắt buộc:**
  1. **Zero-Trust Login-First:** Toàn bộ API nghiệp vụ lâm sàng (`/api/v1/triage/**`, `/api/v1/documents/**`, `/api/v1/appointments/**`) bắt buộc phải có JWT Token hợp lệ. Mọi truy cập ẩn danh (Guest) bị từ chối ngay lập tức với `HTTP 401 Unauthorized`.
  2. **Phòng thủ Brute-force & Khóa tài khoản:** Khi một tài khoản bị nhập sai mật khẩu 5 lần liên tiếp, hệ thống tự động khóa tài khoản trong 15 phút (`HTTP 423 Locked`), ghi cảnh báo bảo mật và ngăn chặn mọi nỗ lực đăng nhập tiếp theo kể cả khi kẻ tấn công xoay địa chỉ IP (Distributed Botnet Defense).
  3. **Kiểm soát tần suất IP phân tán (Redis Rate Limiting):**
     - Đăng nhập: Tối đa 5 lượt/phút trên mỗi địa chỉ IP (`HTTP 429 Too Many Requests`).
     - Phân luồng triệu chứng: Tối đa 10 lượt/phút trên mỗi người dùng.
     - Tải tệp xét nghiệm: Tối đa 5 tệp/phút trên mỗi người dùng (kích thước $\le 15\text{MB}$).
  4. **Security Headers Chuẩn OWASP:** `X-Frame-Options: DENY` (chống Clickjacking), `X-Content-Type-Options: nosniff` (chống MIME-sniffing), `X-XSS-Protection`.

---

### UC-11: Kế Hoạch & Kiến Trúc Thu Phí Dịch Vụ Y Tế (Commercial Monetization & Quota Enforcement Architecture)

* **Mã Use Case:** `UC-BIZ-11`
* **Tác nhân chính:** Patient, Doctor, Platform Admin, Payment Gateway (VietQR / VNPay Sandbox).
* **Mục tiêu:** Định hình mô hình doanh thu bền vững cho nền tảng MediAssist-AI, quản lý hạn ngạch dịch vụ AI và điều phối giao dịch thanh toán khám chữa bệnh trực tuyến chuẩn Doanh Nghiệp.
* **Mô hình kinh doanh & Cơ cấu phí (Milestone 6 Baseline):**
  1. **Gói Hội Viên MediPass VIP Family (149.000đ/tháng hoặc 1.290.000đ/năm):**
     - Phân luồng Triage AI 24/7 không giới hạn số lượt.
     - 10 lượt phân tích OCR chuyên sâu hồ sơ xét nghiệm mỗi tháng.
     - Giảm 10% phí khám trực tuyến với tất cả Bác sĩ chuyên khoa đầu ngành.
     - Lưu trữ hồ sơ bệnh án điện tử EMR mã hóa đám mây trọn đời cho cả gia đình (tối đa 4 thành viên).
  2. **Phí Khám Trực Tuyến Chuyên Khoa (Telehealth Consultation Fee):**
     - Mức phí: 250.000đ - 450.000đ / phiên khám 30 phút (tùy học hàm/học vị GS, PGS, CKII).
     - Mô hình chia sẻ doanh thu: Bác sĩ nhận **85%**, Nền tảng MediAssist-AI giữ **15%** (phí vận hành hạ tầng, bảo mật và trợ lý AI).
     - Cơ chế Ký quỹ An toàn (Escrow Mechanism): Tiền được giữ tạm thời tại tài khoản Escrow khi bệnh nhân đặt lịch và chỉ giải ngân cho bác sĩ khi ca khám hoàn tất (`COMPLETED`). Hoàn tiền 100% nếu phiên khám bị bác sĩ hủy vì lý do đột xuất.
  3. **Hạn Ngạch Phân Tích OCR Báo Cáo Xét Nghiệm (Pay-as-you-go Quota):**
     - Lần đầu tiên: Miễn phí 1 lần dùng thử cho mọi tài khoản mới đăng ký.
     - Lần scan lẻ: 29.000đ / lượt phân tích tệp PDF.
     - Gói tiết kiệm: 99.000đ / 5 lượt phân tích (tiết kiệm 32%).


