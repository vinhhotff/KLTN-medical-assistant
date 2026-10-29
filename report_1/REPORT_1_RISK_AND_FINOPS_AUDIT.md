# BÁO CÁO CHUYÊN SÂU: QUẢN TRỊ RỦI RO & KIỂM TOÁN TÀI CHÍNH AI FINOPS
## Bổ Trợ Báo Cáo Khởi Động & Kế Hoạch Dự Án (Report 1 - MediAssist-AI)

---

### 🌟 1. TỔNG QUAN QUẢN TRỊ TÀI CHÍNH ĐIỆN TOÁN ĐÁM MÂY (FINOPS)

Trong các hệ thống y tế hiện đại tích hợp AI, việc gọi các mô hình đa phương thức (Multimodal LLM / Vision / Embedding) có thể gây bùng nổ chi phí không kiểm soát nếu không có kiến trúc giám sát tài chính (Cloud Financial Operations - FinOps) ngay từ ngày đầu tiên phát triển dự án.

**MediAssist-AI** thiết lập kiến trúc **FinOps-by-Design** với mục tiêu:
1. Kiểm toán chi phí đến từng micro-USD cho mỗi request thông qua bảng CSDL `ai_token_usage` (Flyway V18).
2. Tiết kiệm tới **85% chi phí token** nhờ cơ chế băm nhị phân SHA-256 và bộ nhớ đệm hai tầng.
3. Vận hành toàn bộ hệ thống R&D và bảo vệ khóa luận trong hạn mức ngân sách an toàn **$120.00 / tháng**.

---

### 💰 2. DỰ TOÁN CHI PHÍ HẠ TẦNG & MÔ HÌNH TOÁN HỌC TIÊU THỤ TOKEN

#### 2.1 Bảng Dự Toán Hạ Tầng Cloud Hàng Tháng

| Hạng Mục Hạ Tầng | Nhà Cung Cấp & Cấu Hình Kỹ Thuật | Vai Trò Vận Hành | Chi Phí (USD/tháng) |
| :--- | :--- | :--- | :---: |
| **Backend & Web Server** | DigitalOcean Droplet (4 vCPU, 8GB RAM, 160GB SSD) | Chạy Spring Boot 3.4 (Project Loom), Nginx Reverse Proxy, Redis 7 | $48.00 |
| **Database Server** | PostgreSQL 16 LTS Dedicated Node (2 vCPU, 4GB RAM) | Lưu trữ quan hệ 3NF và chỉ mục đồ thị vector `pgvector` HNSW | $30.00 |
| **Object Storage** | Supabase Storage (S3-compatible, Private Bucket) | Lưu trữ đơn thuốc, ảnh xét nghiệm, cấp URL ký số 15 phút | $12.00 |
| **OpenAI Embeddings API** | Model `text-embedding-3-small` (1536-d) | Sinh vector triệu chứng và vector tiểu sử bác sĩ | $10.00 |
| **Gemini Vision API** | Google Gemini 1.5 Flash Multimodal OCR | Bóc tách chỉ số sinh hóa phiếu xét nghiệm cận lâm sàng | $15.00 |
| **Transactional Email** | Brevo SMTP Gateway | Gửi mã xác thực tài khoản, liên kết reset mật khẩu bảo mật | $5.00 |
| **Cổng Thanh Toán** | VNPay Merchant Sandbox Testing | Môi trường thử nghiệm giao dịch viện phí và hoàn tiền tự động | $0.00 |
| **TỔNG KINH PHÍ** | **Hạ Tầng Hoàn Chỉnh Chuẩn Doanh Nghiệp** | **Đảm bảo vận hành xuyên suốt vòng đời đồ án tốt nghiệp** | **$120.00 / tháng** |

---

#### 2.2 Mô Hình Toán Học Tính Toán Chi Phí Token (Token Economics Math)

##### 1. Tác vụ Sinh Vector Triệu Chứng & Ghép Nối Bác Sĩ (`text-embedding-3-small`):
* Đơn giá: **$0.020 / 1.000.000 tokens** ($0.00000002$ USD / token).
* Kích thước trung bình một truy vấn triệu chứng: $\approx 150\text{ tokens}$.
* Chi phí cho 1.000 lượt phân luồng:
  $$\text{Cost}_{\text{embed}} = 1.000 \times 150 \times \frac{\$0.02}{1.000.000} = \mathbf{\$0.003\text{ USD}} \approx 75\text{ VNĐ}.$$
* **Kết luận:** Chi phí ghép nối vector qua pgvector là siêu rẻ, gần như bằng 0.

##### 2. Tác vụ Bóc Tách OCR & Giải Thích Phiếu Xét Nghiệm (Gemini 1.5 Flash Vision):
* Đơn giá đầu vào (Prompt): **$0.075 / 1.000.000 tokens** (Văn bản) và $\approx 258\text{ tokens}$/ảnh chụp.
* Đơn giá đầu ra (Completion): **$0.300 / 1.000.000 tokens**.
* Trung bình 1 phiếu xét nghiệm: $300\text{ text tokens} + 258\text{ image tokens} = 558\text{ input tokens}$, sinh ra $\approx 400\text{ output tokens}$.
* Chi phí cho 1 lần phân tích xét nghiệm mới:
  $$\text{Cost}_{\text{ocr}} = \left(558 \times \frac{\$0.075}{1.000.000}\right) + \left(400 \times \frac{\$0.300}{1.000.000}\right) = \$0.00004185 + \$0.00012000 = \mathbf{\$0.00016185\text{ USD}} \approx 4\text{ VNĐ}.$$
* Chi phí cho 1.000 lượt quét: $\approx \$0.16\text{ USD} \approx 4.000\text{ VNĐ}$.

##### 3. Cơ Chế Băm Nhị Phân SHA-256 Tiết Kiệm Chi Phí Tối Đa (Deduplication):
* Khi bệnh nhân tải lên lại phiếu xét nghiệm cũ: Hệ thống tính toán mã băm `SHA-256(file_bytes)`.
* Nếu hash đã tồn tại trong bảng `medical_documents`: Hệ thống trả về kết quả đã phân tích trong `document_analyses` ngay lập tức.
* **Hiệu quả:**
  - Độ trễ trả về: **$0\text{ms}$** (Không cần gọi API Vision).
  - Chi phí token tiêu thụ: **$0\text{ USD}$**.
  - Không sinh thêm file trùng lặp trên Supabase S3 (Zero Storage Waste).

---

### 🛡️ 3. MA TRẬN QUẢN TRỊ RỦI RO & KẾ HOẠCH ĐỐI PHÓ KHẨN CẤP

##### Table 3: Master Risk Register, Mitigation & Disaster Recovery Plan

| Mã Rủi Ro | Phân Loại Rủi Ro | Tình Huống Kỹ Thuật Phát Sinh | Mức Độ | Giải Pháp Phòng Vệ Kỹ Thuật (Mitigation) | Kế Hoạch Ứng Phó Khẩn Cấp (Recovery) |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **RSK-01** | **Y Tế Lâm Sàng** | Bệnh nhân đột quỵ, nhồi máu cơ tim, sốc phản vệ nhắn tin hỏi AI. | **CRITICAL** | **Stage 1 Acute Red-Flag Regex:** Bắt từ khóa sinh tử trước khi chạm vào AI trong $< 2\text{ms}$; khóa luồng và hiển thị Hotline 115. | Nếu Regex bỏ sót, Stage 4 Safety Guardrail của LLM kích hoạt cờ `is_emergency = true`. |
| **RSK-02** | **Pháp Lý & Y Đức** | AI đưa ra chẩn đoán cảm tính, ảo giác bệnh, vi phạm **Luật Khám bệnh, chữa bệnh 2023**. | **CRITICAL** | **Định vị CDSS & Evidence Grounding:** Chỉ suy luận Chẩn đoán Phân biệt (DDx), neo giữ ngưỡng sinh hóa **LOINC (QĐ 3280/BYT)**, bắt buộc Bác sĩ duyệt EMR cuối cùng. | Khóa phát ngôn chẩn đoán độc nhất; từ chối suy luận khi tài liệu xét nghiệm chưa có số liệu đo lường. |
| **RSK-03** | **Ngữ Nghĩa Y Tế** | Bệnh nhân ghi "đau bụng nhưng không sốt" bị gợi ý nhầm sang khoa Nhiễm. | **HIGH** | **Vietnamese NegEx Algorithm:** Tách mệnh đề khẳng định $C_{aff}$ và phủ định $C_{neg}$; loại bỏ từ ngữ phủ định khỏi vector. | Tự động hạ điểm thưởng phân kỳ khoa đối nghịch (Specialty Divergence Penalty $-0.10$). |
| **RSK-04** | **Bảo Mật BOLA** | Bác sĩ cố tình thay đổi URL để xem bệnh án của bệnh nhân người khác. | **HIGH** | **`PatientAccessGuard` Interceptor:** Thẩm định quyền sở hữu và quan hệ điều trị thực tế (`SCHEDULED`/`IN_PROGRESS`). | Trả về HTTP 403 `FORBIDDEN_CARE_RELATIONSHIP`, tự động ghi vết an ninh vào `audit_logs`. |
| **RSK-05** | **Pháp Lý PII** | Thông tin CCCD, SĐT, Tên bệnh nhân bị gửi trần sang máy chủ Cloud AI. | **HIGH** | **`MedicalPiiService` Masking:** Tự động che mờ 6 thực thể định danh theo Nghị định 13/2023/NĐ-CP trước khi gửi API. | Giới hạn dung lượng chuỗi đầu vào `@Size(max = 20000)` chống tấn công tràn bộ đệm PII. |
| **RSK-06** | **Đứt Mạng Quốc Tế** | Đứt cáp quang biển làm gián đoạn kết nối tới máy chủ OpenAI/Gemini. | **MEDIUM** | **Hedged Requests & Speculative Failover:** Đua song song Gemini và OpenRouter tại mốc $P95 = 1.2\text{s}$; fallback sang **Offline Feature Hashing (FNV-1a)**. | Hệ thống tiếp tục hoạt động ngoại tuyến bình thường, chuyển sang trạng thái Graceful Degradation. |
| **RSK-07** | **Tranh Chấp Lịch** | Hai người dùng cùng lúc bấm đặt chung một khung giờ khám 30 phút. | **MEDIUM** | **Redis Distributed Semaphore Lock:** Khóa phân tán thời gian thực kết hợp Partial Unique Index trên bảng `appointments`. | Người thứ hai nhận thông báo xung đột `SLOT_CONFLICT`, hệ thống tự động gợi ý khung giờ kế tiếp. |

---

### 📈 4. KẾT LUẬN QUẢN TRỊ
Bằng việc kết hợp chặt chẽ giữa **kiểm soát chi phí FinOps** và **ma trận quản trị rủi ro đa tầng**, dự án MediAssist-AI vừa bảo vệ an toàn tính mạng người bệnh và bảo mật dữ liệu, vừa bảo đảm khả năng vận hành kinh tế, sẵn sàng chuyển giao sang môi trường sản xuất thực tế.
