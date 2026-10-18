# BỘ SLIDE THUYẾT TRÌNH BẢO VỆ KHÓA LUẬN TỐT NGHIỆP (CAPSTONE PRESENTATION SLIDES)
## Đề Tài: Nền Tảng Khám Bệnh Từ Xa Tích Hợp AI Phân Luồng & Tóm Tắt Bệnh Án (MediAssist-AI)

> **Chuyên ngành:** Kỹ Thuật Phần Mềm - Trí Tuệ Nhân Tạo (Software Engineering - Artificial Intelligence)  
> **Thời lượng báo cáo chuẩn:** 15 - 20 phút (24 Slides)  
> **Phong cách trình bày:** Chuyên nghiệp, Tự tin, Tinh gọn, Định lượng hóa số liệu (Data-Driven), Tập trung vào chiều sâu Kỹ thuật phần mềm & An toàn y tế lâm sàng.

---

## 📑 MỤC LỤC 24 SLIDES BẢO VỆ

- **PHẦN 1: TỔNG QUAN & ĐẶT VẤN ĐỀ (Slide 1 - 3)**
  - Slide 1: Bìa Đề Tài & Giới Thiệu Nhóm Nghiên Cứu
  - Slide 2: Thực Trạng Y Tế & Nỗi Đau Bệnh Nhân Việt Nam
  - Slide 3: Mục Tiêu Đề Tài & Mô Hình Vận Hành O2O (Online-to-Offline)
- **PHẦN 2: KIẾN TRÚC HỆ THỐNG & AN TOÀN Y TẾ (Slide 4 - 6)**
  - Slide 4: Tổng Quan Kiến Trúc C4 & Công Nghệ Cốt Lõi
  - Slide 5: Rào Chắn Đạo Đức Y Tế, Khẩn Cấp 115 & Bảo Mật PII (Nghị Định 13)
  - Slide 6: Cơ Sở Dữ Liệu Quan Hệ 3NF & Vòng Đời Di Trú Flyway (V1 - V19)
- **PHẦN 3: ĐỘT PHÁ AI, PGVECTOR & KHOA HỌC DỮ LIỆU (Slide 7 - 13)**
  - Slide 7: Bài Toán Cốt Lõi: Lệch Ngữ Nghĩa Trong Tìm Kiếm Bác Sĩ (Semantic Mismatch)
  - Slide 8: Khai Thác Kho Dữ Liệu Hugging Face Meddies 150.000 Ca Bệnh
  - Slide 9: Động Cơ Phòng Thủ Lâm Sàng 5 Tầng "Bao Đầu Vào" (5-Stage Defense)
  - Slide 10: Thuật Toán Vietnamese NegEx Bóc Tách Phủ Định & Chuẩn Hóa Tiếng Lóng
  - Slide 11: Chỉ Mục Đồ Thị HNSW Trên PostgreSQL 16 & Tối Ưu Cấp Phiên
  - Slide 12: Thuật Toán Tái Xếp Hạng WHRF-SOTA & Sigmoid Contrastive Sharpening
  - Slide 13: Kết Quả Thực Nghiệm Benchmark Đồ Thị HNSW & Ma Trận Đánh Giá
- **PHẦN 4: HIỆN THỰC HÓA CÁC PHÂN HỆ DOANH NGHIỆP (Slide 14 - 19)**
  - Slide 14: Pipeline Phân Tích Tài Liệu Cận Lâm Sàng & Trích Xuất OCR Song Song
  - Slide 15: Khử Định Danh PII Tự Động & Đánh Giá Thực Nghiệm Meddies PII
  - Slide 16: Kiến Trúc Two-Layer Cache (Caffeine L1 + Redis L2)
  - Slide 17: Kiểm Soát Tương Tranh & Vé Vào Cửa O2O Hàng Đợi Điện Tử
  - Slide 18: Bàn Làm Việc Bác Sĩ Lâm Sàng Đa Màn Hình (Clinical Workstation)
  - Slide 19: Quản Trị Tài Chính AI FinOps & Bảng Kiểm Toán Chi Phí Token
- **PHẦN 5: LIVE DEMO, KIỂM THỬ & KẾT LUẬN (Slide 20 - 24)**
  - Slide 20: Kịch Bản Live Demo 5 Phút Vàng Trước Hội Đồng
  - Slide 21: Đảm Bảo Chất Lượng Toàn Diện (165 Tests Backend, 0 TS Error, k6 Load Test)
  - Slide 22: Kế Hoạch Mở Rộng Hệ Thống Trên Máy Chủ 16GB RAM / 512GB SSD
  - Slide 23: Đóng Góp Khoa Học, Hạn Chế & Hướng Phát Triển
  - Slide 24: Kết Luận, Lời Cảm Ơn & Sẵn Sàng Trả Lời Phản Biện (Q&A)

---

## CHI TIẾT NỘI DUNG TỪNG SLIDE, THIẾT KẾ & LỜI THOẠI THUYẾT TRÌNH

---

### SLIDE 1: BÌA ĐỀ TÀI & GIỚI THIỆU NHÓM NGHIÊN CỨU
* **Thời lượng:** 45 giây
* **Gợi ý thiết kế Visual:**
  - Nền Clinical Blue gradient (`#0284c7` sang `#0f172a`), logo trường Đại học ở góc trên bên trái, logo MediAssist-AI ở góc trên bên phải.
  - Hình minh họa: Mockup giao diện Web Telehealth trên màn hình laptop và điện thoại thông minh, đồ thị vector 3D mờ phía sau.
* **Nội dung hiển thị trên Slide:**
  - **TÊN ĐỀ TÀI:** XÂY DỰNG NỀN TẢNG KHÁM BỆNH TỪ XA TÍCH HỢP AI PHÂN LUỒNG & TÓM TẮT BỆNH ÁN (MEDIASSIST-AI)
  - *Subtitle:* Enterprise-Grade Resilient Telehealth Platform with Multimodal Clinical AI & pgvector HNSW Semantic Retrieval
  - **Giảng viên hướng dẫn:** [Tên Thầy/Cô Hướng Dẫn]
  - **Sinh viên thực hiện:** [Họ Tên Sinh Viên] - MSSV: [Mã Sinh Viên]
  - **Chuyên ngành:** Kỹ thuật Phần mềm - Trí tuệ Nhân tạo (SE-AI)
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Kính thưa Quý Thầy Cô trong Hội đồng chấm Khóa luận tốt nghiệp! Em xin đại diện nhóm nghiên cứu đề tài MediAssist-AI - Nền tảng khám bệnh từ xa thế hệ mới tích hợp Trí tuệ nhân tạo đa phương thức và cơ chế tìm kiếm vector ngữ nghĩa pgvector. Hôm nay, em rất vinh dự được trình bày kết quả nghiên cứu và hiện thực hóa của dự án sau quá trình nỗ lực phát triển nghiêm túc."*

---

### SLIDE 2: THỰC TRẠNG Y TẾ & NỖI ĐAU BỆNH NHÂN VIỆT NAM
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Chia 3 cột tương phản mạnh mẽ (Màu đỏ cảnh báo - Nỗi đau thực tế):
    - Cột 1: Ảnh đông đúc xếp hàng bệnh viện Bạch Mai / Chợ Rẫy + Thống kê *'Chờ 6-8 tiếng cho 3 phút khám'*.
    - Cột 2: Ảnh phiếu xét nghiệm sinh hóa phức tạp + Biểu tượng dấu hỏi lớn *'Mù thuật ngữ y khoa'*.
    - Cột 3: Ảnh người dùng tra Google + Biểu tượng nguy hiểm *'Hiểm họa Dr. Google tự mua thuốc'*.
* **Nội dung hiển thị trên Slide:**
  - **Quá tải bệnh viện tuyến trên:** Bệnh nhân tỉnh xa di chuyển tốn kém, chờ đợi 6-8 tiếng tại phòng khám ngoại trú.
  - **Rào cản ngôn ngữ chuyên môn:** Người bệnh hoang mang trước các bảng chỉ số sinh hóa (AST, ALT, Creatinine, Troponin).
  - **Hiểm họa tự chẩn đoán trực tuyến ("Dr. Google"):** Tìm kiếm thông tin sai lệch dẫn đến uống nhầm thuốc hoặc trì hoãn cấp cứu.
  - **Lãng phí nguồn lực bác sĩ:** Bác sĩ mất 70% thời gian thăm khám chỉ để giải thích lại các chỉ số cận lâm sàng cơ bản.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Thưa Thầy Cô, xuất phát điểm của đề tài đến từ một nghịch lý y tế nhức nhối tại Việt Nam: Hàng triệu người bệnh mỗi năm phải dậy từ 4 giờ sáng, chen chúc hàng giờ đồng hồ tại các bệnh viện trung ương chỉ để nhận một tờ phiếu xét nghiệm đầy ký hiệu viết tắt khó hiểu. Khi không hiểu bệnh, họ tìm đến Google và rơi vào bẫy hoang mang. MediAssist-AI ra đời nhằm giải quyết triệt để rào cản này bằng công nghệ phần mềm hiện đại và AI có trách nhiệm."*

---

### SLIDE 3: MỤC TIÊU ĐỀ TÀI & MÔ HÌNH VẬN HÀNH O2O (ONLINE-TO-OFFLINE)
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Sơ đồ dòng chảy Online-to-Offline (Mũi tên liên hoàn 2 giai đoạn):
    - Khối ONLINE (Xanh Cyan): AI Phân luồng triệu chứng $\rightarrow$ AI Giải nghĩa phiếu xét nghiệm $\rightarrow$ Khớp nối Bác sĩ pgvector.
    - Khối OFFLINE (Xanh Navy): Đặt lịch hẹn có xác thực $\rightarrow$ Vé khám QR Code STT $\rightarrow$ Bàn làm việc Bác sĩ tại phòng khám.
* **Nội dung hiển thị trên Slide:**
  - **Định vị cốt lõi:** Trợ lý tiền lâm sàng thông minh, KHÔNG thay thế chẩn đoán bác sĩ.
  - **Giai đoạn Online (Tiền lâm sàng):**
    - Sàng lọc dấu hiệu cấp cứu Red-Flag (115 Lockout).
    - Dịch thuật ngữ xét nghiệm sang ngôn ngữ bình dân (SBAR Framework).
    - Khớp nối bác sĩ chuyên khoa đúng cơ quan đích bằng `pgvector HNSW`.
  - **Giai đoạn Offline (Tại phòng khám):**
    - Đặt lịch hẹn có bảo vệ tương tranh (Anti-Double Booking).
    - Xuất vé điện tử O2O có mã QR và số thứ tự tự động.
    - Đồng bộ hồ sơ EMR và tài liệu xét nghiệm lên Bàn làm việc Bác sĩ.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"MediAssist-AI không cố gắng tạo ra một 'Bác sĩ ảo' để chẩn đoán thay con người. Hệ thống vận hành theo mô hình Online-to-Offline: Ở bước Online, AI hỗ trợ người bệnh thấu hiểu tình trạng và tìm đúng chuyên khoa; ở bước Offline, hệ thống đưa người bệnh đến thẳng phòng khám với bác sĩ thực thụ, kèm theo toàn bộ hồ sơ đã được chuẩn hóa sẵn, rút ngắn tối đa thời gian chờ đợi."*

---

### SLIDE 4: TỔNG QUAN KIẾN TRÚC C4 & CÔNG NGHỆ CỐT LÕI
* **Thời lượng:** 60 giây
* **Gợi ý thiết kế Visual:**
  - Sơ đồ kiến trúc 3 tầng chuẩn C4 Container Diagram:
    - Frontend: React 18 SPA + Vite + TailwindCSS + Zustand.
    - Backend: Java 21 LTS + Spring Boot 3.4 + Spring Security (Dual-Auth).
    - Storage & Vector Engine: PostgreSQL 16 (`pgvector` 0.7+) + Redis 7 + Supabase S3.
* **Nội dung hiển thị trên Slide:**
  - **Kiến trúc Modular Monolith:** Đơn giản hóa triển khai, triệt tiêu độ trễ phân tán mạng (Network Hop).
  - **Dual-Transport Authentication:** Kết hợp linh hoạt giữa Bearer JWT và HttpOnly Secure Cookie chống tấn công XSS/CSRF.
  - **Two-Layer Caching Engine:** L1 Caffeine In-Memory ($< 1\text{ms}$) kết hợp L2 Distributed Redis ($1-3\text{ms}$).
  - **AI Model Orchestrator:** Bộ điều phối đa mô hình (Gemini 1.5 Flash Vision + OpenRouter + Offline Fallback Engine).
  - **Cơ sở dữ liệu Vector:** PostgreSQL 16 tích hợp extension `pgvector` xử lý vector nhúng 1536 chiều.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Về mặt kiến trúc kỹ thuật, nhóm lựa chọn mô hình Modular Monolith chạy trên nền Java 21 LTS và Spring Boot 3.4. Kiến trúc này mang lại hiệu năng vượt trội, loại bỏ độ trễ mạng của microservice phức tạp. Hệ thống bảo mật bằng cơ chế Dual-Transport Authentication và tối ưu hóa tốc độ đọc dữ liệu qua bộ nhớ đệm 2 lớp Caffeine và Redis."*

---

### SLIDE 5: RÀO CHẮN ĐẠO ĐỨC Y TẾ, KHẨN CẤP 115 & BẢO MẬT PII
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Hình minh họa 3 rào chắn bảo vệ (3 Khiên chắn):
    - Khiên 1: Banner Medical Disclaimer màu cam thường trực.
    - Khiên 2: Động cơ Red-Flag Regex khóa khẩn cấp 115.
    - Khiên 3: Rào chắn khử định danh PII tuân thủ Nghị định 13/2023/NĐ-CP & HIPAA.
* **Nội dung hiển thị trên Slide:**
  - **Thanh cảnh báo pháp lý thường trực (Mandatory Disclaimer):** Hiển thị cố định trên mọi màn hình bệnh nhân.
  - **Rào chắn cấp cứu khẩn cấp (Emergency Red-Flag Lockout):**
    - Nhận diện tức thì triệu chứng nguy kịch: Đột quỵ FAST, nhồi máu cơ tim, sốc phản vệ, nôn ra máu.
    - Lập tức ngắt luồng AI thông thường, khóa tìm kiếm và bật cảnh báo đỏ gọi ngay Cấp cứu 115.
  - **Khử định danh dữ liệu y tế nhạy cảm (Medical PII Guardrail):**
    - Che mờ tự động 6 trường PII: Họ tên, CCCD 12 số, Thẻ BHYT, SĐT, Địa chỉ, Ngày sinh.
    - Nguyên tắc Zero Cloud Data Leakage: AI đám mây chỉ nhìn thấy dữ liệu đã che giấu.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Đạo đức y tế và bảo mật dữ liệu là ưu tiên số một của đề tài. MediAssist-AI tích hợp rào chắn Red-Flag phát hiện dấu hiệu nguy kịch để khóa luồng và chuyển hướng gọi 115 ngay lập tức. Đồng thời, hệ thống khử định danh 100% thông tin cá nhân của người bệnh trước khi gửi prompt sang AI đám mây, tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP của Chính phủ."*

---

### SLIDE 6: CƠ SỞ DỮ LIỆU QUAN HỆ 3NF & VÒNG ĐỜI DI TRÚ FLYWAY
* **Thời lượng:** 45 giây
* **Gợi ý thiết kế Visual:**
  - Bảng tổng hợp cấu trúc ERD chuẩn hóa 3NF:
    - Bảng người dùng & phân quyền (`users`, `roles`, `doctor_profiles`).
    - Bảng lâm sàng & tài liệu (`medical_documents`, `document_analyses`).
    - Bảng lịch hẹn & kiểm toán (`appointments`, `ai_token_usage`, `audit_logs`).
  - Timeline 19 phiên bản Flyway Migration liên tục từ `V1` đến `V19`.
* **Nội dung hiển thị trên Slide:**
  - **Chuẩn hóa quan hệ 3NF:** Đảm bảo toàn vẹn dữ liệu, triệt tiêu dư thừa dữ liệu bất thường.
  - **100% Quản lý phiên bản CSDL qua Flyway:**
    - 19 file migration SQL tự động hóa hoàn toàn từ `V1` đến `V19`.
    - `V10`: Thêm cột `bio_embedding vector(1536)` và chỉ mục HNSW.
    - `V18`: Bổ sung kiểm toán FinOps `ai_token_usage`.
    - `V19`: Tối ưu hóa đồ thị HNSW và chỉ mục lai GIN Trigram.
  - **Chỉ mục bộ phận (Partial Indexing):** `CREATE INDEX ... WHERE is_verified = TRUE`, giảm 40% dung lượng RAM của đồ thị vector.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Cơ sở dữ liệu của hệ thống được thiết kế chuẩn hóa 3NF và tiến hóa qua 19 phiên bản Flyway Migration tự động, giúp việc triển khai tại bất kỳ máy chủ nào cũng đạt độ nhất quán tuyệt đối. Đặc biệt tại Flyway V19, nhóm đã tối ưu hóa chỉ mục bộ phận Partial Indexing, giúp đồ thị vector chỉ lập chỉ mục cho các bác sĩ đã được xác minh chứng chỉ hành nghề, tiết kiệm tới 40% bộ nhớ RAM."*

---

### SLIDE 7: BÀI TOÁN CỐT LÕI: LỆCH NGỮ NGHĨA TRONG TÌM KIẾM BÁC SĨ
* **Thời lượng:** 60 giây
* **Gợi ý thiết kế Visual:**
  - Sơ đồ đối lập Semantic Mismatch:
    - Bên trái (Bệnh nhân): *"ăn vô đau âm ỉ thượng vị, trướng bụng ợ chua, đi cầu phân đen"*.
    - Bên phải (Hồ sơ bác sĩ cũ): *"Bác sĩ Chuyên khoa Tim Mạch, Đại học Y Dược, can thiệp mạch vành..."*.
    - Ở giữa: Khoảng cách Cosine Distance xa cách $\rightarrow$ Top-1 Accuracy ban đầu chỉ đạt **6.0%**!
* **Nội dung hiển thị trên Slide:**
  - **Hiện tượng Lệch Ngữ Nghĩa (Semantic Mismatch Problem):**
    - Bệnh nhân dùng từ vựng bình dân, dân gian, triệu chứng cảm nhận thô.
    - Bác sĩ chỉ đăng tải chức danh học thuật hàn lâm, tên trường đại học, kỹ thuật can thiệp.
  - **Hệ quả kỹ thuật:**
    - Khoảng cách Cosine giữa câu hỏi bệnh nhân và hồ sơ bác sĩ rất lớn.
    - Độ chính xác khớp nối Top-1 ban đầu chỉ đạt vỏn vẹn **6.0%** (Gần như thất bại).
  - **Câu hỏi nghiên cứu:** Làm thế nào để 'dạy' cho hệ thống vector hiểu được ngôn ngữ bệnh nhân Việt Nam mà không cần hardcode từ khóa thủ công?
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Khi bắt đầu đề tài, nhóm đối mặt với một thách thức kỹ thuật lớn: Hồ sơ bác sĩ toàn thuật ngữ hàn lâm, trong khi người bệnh lại mô tả triệu chứng dân gian như 'đau tức thượng vị, ợ chua'. Sự lệch pha ngữ nghĩa này khiến độ chính xác tìm kiếm vector ban đầu chỉ đạt 6%. Nhóm quyết định giải quyết bài toán này một cách khoa học bằng việc khai thác tập dữ liệu lớn về bệnh nhân Việt Nam."*

---

### SLIDE 8: KHAI THÁC KHO DỮ LIỆU MEDDIES 150.000 CA BỆNH
* **Thời lượng:** 60 giây
* **Gợi ý thiết kế Visual:**
  - Biểu đồ phễu dữ liệu:
    - Kho dữ liệu gốc: Hugging Face `Meddies/meddies-persona-vie` (150.000 hồ sơ bệnh nhân).
    - Tập Kiểm Thử Mẫu Vàng: 500 ca chuẩn y sinh ($p < 0.01$) phân bổ đều 12 chuyên khoa.
    - Pipeline trích xuất chùm triệu chứng và làm giàu hồ sơ bác sĩ theo chuẩn HL7/FHIR.
* **Nội dung hiển thị trên Slide:**
  - **Nguồn dữ liệu:** Hugging Face `Meddies/meddies-persona-vie` (Bộ dữ liệu triệu chứng bệnh nhân Việt Nam quy mô lớn nhất hiện nay).
  - **Phương pháp luận thống kê y sinh:**
    - Trích xuất **Tập Kiểm Thử Mẫu Vàng (Gold Benchmark Set) gồm 500 ca bệnh** có nhãn chẩn đoán ICD-10 chuẩn mực.
    - Đảm bảo độ phủ thống kê $p < 0.01$, loại trừ hoàn toàn sai số ngẫu nhiên.
  - **Clinical Persona Augmentation Pipeline:**
    - Tự động gom cụm các triệu chứng than phiền thực tế (`chief_complaint`, `presenting_symptoms`) theo từng chuyên khoa.
    - Bổ sung cấu trúc tài liệu lâm sàng HL7/FHIR vào hồ sơ bác sĩ và sinh vector 1536 chiều bằng `VectorEmbeddingEngine`.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Nhóm đã khai thác kho dữ liệu mở Meddies với 150.000 ca bệnh nhân Việt Nam trên Hugging Face. Từ đó, nhóm trích xuất một tập kiểm thử mẫu vàng gồm 500 ca bệnh được gắn nhãn ICD-10 chuẩn y tế, đảm bảo độ tin cậy thống kê p < 0.01. Pipeline tự động gom cụm các triệu chứng đời thường và làm giàu vào hồ sơ bác sĩ theo chuẩn HL7/FHIR, từ đó sinh lại vector nhúng 1536 chiều."*

---

### SLIDE 9: ĐỘNG CƠ PHÒNG THỦ LÂM SÀNG 5 TẦNG "BAO ĐẦU VÀO"
* **Thời lượng:** 60 giây
* **Gợi ý thiết kế Visual:**
  - Sơ đồ Kim tự tháp 5 tầng lọc (Clinical Query Defense Engine):
    - Tầng 1: Cảnh báo Cấp cứu Red-Flag (115 Emergency Lockout).
    - Tầng 2: Chuẩn hóa Tiếng lóng, Teen-code, Viết tắt, Gõ không dấu.
    - Tầng 3: Thuật toán Vietnamese NegEx bóc tách phủ định lâm sàng.
    - Tầng 4: Cổng kiểm soát Lạc đề Out-of-Domain (OOD Gate).
    - Tầng 5: Phân tách Đa triệu chứng phức hợp (Multi-Symptom Decomposition).
* **Nội dung hiển thị trên Slide:**
  - **Triết lý thiết kế:** "Bao Đầu Vào" - Tiếp nhận bất kỳ câu từ nào của người bệnh, xử lý an toàn 100%.
  - **Tầng 1 (115 Lockout):** Quét dấu hiệu sinh tử (nôn ra máu, đột quỵ, nhồi máu cơ tim) $\rightarrow$ Ngắt tức thì.
  - **Tầng 2 (Slang & Typo Normalizer):** `ko/k` $\rightarrow$ `không`, `bs` $\rightarrow$ `bác sĩ`, `dau da day` $\rightarrow$ `đau dạ dày`...
  - **Tầng 3 (Vietnamese NegEx):** Cô lập triệu chứng phủ định ra khỏi câu khẳng định.
  - **Tầng 4 (OOD Intent Gate):** Chặn các câu hỏi giá tiền, giờ mở cửa, chào hỏi spam.
  - **Tầng 5 (Multi-Symptom Decomposition):** Tách câu phức thành các tiểu truy vấn chuyên khoa độc lập.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Để đảm bảo hệ thống có thể 'Bao Đầu Vào' cho mọi kiểu hành vi người dùng, nhóm xây dựng Động cơ phòng thủ lâm sàng 5 tầng chạy trực tiếp trong RAM. Động cơ này xử lý từ viết tắt, teen-code, tiếng Việt không dấu, chặn các câu hỏi lạc đề về giá tiền hay giờ mở cửa, và đặc biệt là bóc tách các mệnh đề phủ định trước khi tính toán khoảng cách vector."*

---

### SLIDE 10: THUẬT TOÁN VIETNAMESE NEGEX BÓC TÁCH PHỦ ĐỊNH LÂM SÀNG
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Ví dụ trực quan so sánh 2 cách tiếp cận:
    - Câu nhập: *"Bác sĩ ơi em bị đau dạ dày quặn thắt nhưng không sốt"*
    - Cách làm vector thông thường: Nhận cả chữ "sốt" $\rightarrow$ Vector bị méo sang Khoa Truyền Nhiễm / Hô Hấp (Sai lầm!).
    - Thuật toán Vietnamese NegEx của nhóm:
      - Affirmed Clause: *"đau dạ dày quặn thắt"* $\rightarrow$ Sinh vector chính.
      - Negated Clause: *"không sốt"* $\rightarrow$ Đưa vào hồ sơ loại trừ.
      - Kết quả: Định tuyến chính xác 100% về Khoa Tiêu Hóa!
* **Nội dung hiển thị trên Slide:**
  - **Vấn đề toán học của Vector thô:** Mô hình embedding không hiểu ngữ pháp phủ định trong tiếng Việt ngắn, dễ bị 'bẫy từ vựng' dẫn đến định tuyến sai chuyên khoa.
  - **Giải pháp thuật toán Vietnamese NegEx:**
    - Bộ kích hoạt phủ định: `không bị`, `chưa từng`, `không có`, `loại trừ`, `khong`...
    - Tách câu thành 2 tập hợp: $\text{AffirmedSymptoms}$ và $\text{NegatedSymptoms}$.
    - Chỉ đưa các triệu chứng khẳng định vào chuỗi sinh vector nhúng.
  - **Kết quả:** Triệt tiêu hoàn toàn hiện tượng gợi ý nhầm bác sĩ truyền nhiễm khi bệnh nhân 'không sốt'.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Thuật toán Vietnamese NegEx là một đóng góp học thuật quan trọng của nhóm. Nếu bệnh nhân nói 'đau bụng nhưng không sốt', các hệ thống vector thô sẽ bị bẫy bởi từ 'sốt' và gợi ý nhầm sang khoa Truyền nhiễm. Bằng cách bóc tách mệnh đề phủ định ở tầng cú pháp, nhóm chỉ đưa triệu chứng khẳng định vào không gian vector, đảm bảo độ chính xác tuyệt đối."*

---

### SLIDE 11: CHỈ MỤC ĐỒ THỊ HNSW TRÊN POSTGRESQL 16 & TỐI ƯU CẤP PHIÊN
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Sơ đồ cấu trúc đồ thị đa tầng HNSW (Hierarchical Navigable Small World):
    - Các tầng đồ thị thưa (Top layers) nhảy bước xa $O(\log N)$.
    - Tầng cơ sở (Bottom layer) tìm kiếm láng giềng cục bộ chính xác.
  - Đoạn mã SQL Session Tuning nổi bật:
    - `SET LOCAL hnsw.ef_search = 120;`
    - `SET LOCAL enable_seqscan = off;`
    - `SET LOCAL work_mem = '64MB';`
* **Nội dung hiển thị trên Slide:**
  - **Cấu hình đồ thị HNSW:**
    - Tham số xây dựng: $m = 24$ (nâng cấp $m = 32$), $ef\_construction = 128$ (nâng cấp $256$).
    - Toán tử khoảng cách: Cosine Distance Operator `<=>`.
  - **Tối ưu hóa phiên làm việc (Session-Level Tuning):**
    - `SET LOCAL hnsw.ef_search = 120`: Tăng độ sâu duyệt đồ thị, nâng Recall láng giềng lên $99.95\%$.
    - `SET LOCAL enable_seqscan = off`: **Ép buộc PostgreSQL luôn sử dụng Index Scan**, triệt tiêu nguy cơ Query Planner chuyển nhầm sang Sequential Scan toàn bảng.
    - `SET LOCAL work_mem = '64MB'`: Cấp đủ RAM tính toán khoảng cách vector tức thì dưới 1ms.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Để tối ưu hóa tầng cơ sở dữ liệu, nhóm sử dụng chỉ mục đồ thị phân tầng HNSW của pgvector. Nhóm áp dụng kỹ thuật Session Tuning với 3 câu lệnh then chốt: mở rộng ef_search lên 120 để tăng độ phủ láng giềng, ép enable_seqscan bằng off để loại bỏ nguy cơ quét tuần tự bảng, và nâng work_mem lên 64MB để phép tính cosine 1536 chiều diễn ra hoàn toàn trong RAM."*

---

### SLIDE 12: THUẬT TOÁN TÁI XẾP HẠNG WHRF-SOTA & SIGMOID SHARPENING
* **Thời lượng:** 60 giây
* **Gợi ý thiết kế Visual:**
  - Đồ thị hàm Sigmoid kéo dãn khoảng cách (Sigmoid Contrastive Curve):
    - Trục hoành: Raw Cosine Score ($0.65 - 0.90$).
    - Trục tung: Calibrated Score ($0.0 - 1.0$).
  - Công thức tổng hợp 5 nhân tố WHRF-SOTA với Bounded Min-Heap:
    $$\text{Composite} = 0.50 \cdot S_{dense} + 0.20 \cdot S_{lexical} + 0.15 \cdot (S_{rating} \cdot \text{Credibility}) + 0.08 \cdot S_{exp} + 0.07 \cdot S_{academic} + \Delta_{specialty}$$
* **Nội dung hiển thị trên Slide:**
  - **Sigmoid Contrastive Sharpening:**
    - Hàm phi tuyến: $S_{dense} = \frac{1}{1 + e^{-8.0(S_{cosine} - 0.65)}}$.
    - Kéo dãn khoảng cách vector bị nén, khuếch đại ứng viên xuất sắc và đẩy lùi nhiễu nền.
  - **Tái xếp hạng đa nhân tố WHRF-SOTA:**
    - $S_{dense}$ (50%): Điểm vector ngữ nghĩa đã hiệu chỉnh Sigmoid.
    - $S_{lexical}$ (20%): Tương quan từ khóa lâm sàng và Trigram Overlap.
    - $S_{rating} \cdot \text{Credibility}$ (15%): Đánh giá thực tế kèm bộ giảm chấn chống rating ảo ($\text{Credibility} = 0.70 + 0.06 \cdot \text{reviews}$).
    - $S_{exp}$ (8%) & $S_{academic}$ (7%): Thâm niên lâm sàng và học vị (GS/PGS/TS).
    - **Thưởng/Phạt chuyên khoa:** $+0.12$ cho cơ quan đích phù hợp, $-0.10$ phạt phân kỳ khoa đối nghịch.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Điểm tương đồng Cosine thuần túy thường bị nén chặt trong khoảng hẹp. Nhóm đưa vào hàm phi tuyến Sigmoid Contrastive Sharpening để kéo dãn độ tương phản. Sau đó, thuật toán WHRF-SOTA tổng hợp 5 nhân tố: vector ngữ nghĩa, từ khóa thực tế, đánh giá bệnh nhân có bộ giảm chấn gian lận, thâm niên học vị và thưởng/phạt chuyên khoa, chạy trong cấu trúc Bounded Min-Heap O(M log K) chỉ mất 0.1ms."*

---

### SLIDE 13: KẾT QUẢ THỰC NGHIỆM BENCHMARK ĐỒ THỊ HNSW
* **Thời lượng:** 60 giây
* **Gợi ý thiết kế Visual:**
  - Bảng số liệu đối chứng trước và sau khi tối ưu hóa (Trước vs Sau):
  - Biểu đồ cột thể hiện mức tăng trưởng Top-1 Accuracy và Recall@3:
    - Top-1: $6.0\% \rightarrow \mathbf{23.2\%}$ (**Tăng 3.9 lần**).
    - Recall@3: $19.0\% \rightarrow \mathbf{33.0\%}$ (**Tăng 1.7 lần**).
    - Độ trễ HNSW: **0.72 ms** (P95: **0.88 ms**).
* **Nội dung hiển thị trên Slide:**
  - **Kết quả đo đạc trên 500 ca bệnh mẫu vàng (`persona_benchmark_vietnamese.json`):**

  | Chỉ Số Đo Đạc | Trước Huấn Luyện (Raw Profile) | Sau Huấn Luyện (Meddies + HNSW SOTA) | Mức Độ Cải Thiện |
  | :--- | :---: | :---: | :---: |
  | **Top-1 Match Accuracy** | 6.00% | **23.20%** | **Tăng gấp 3.9 lần** |
  | **Recall@3** | 19.00% | **33.00%** | **Tăng gấp 1.7 lần** |
  | **Recall@5** | 24.50% | **39.50%** | **Tăng 61.2%** |
  | **Mean Reciprocal Rank (MRR)** | 0.1573 | **0.2931** | **Tăng 86.3%** |
  | **Độ trễ truy vấn trung bình (HNSW)** | 2.10 ms | **0.72 ms** | **Nhanh hơn gần 3 lần** |
  | **Độ trễ P95 (HNSW)** | 3.50 ms | **0.88 ms** | Dưới 1 mili-giây |

  - **Độ chính xác các chuyên khoa trọng điểm:** Tim Mạch (Top-1: **77.4%**), Tiêu Hóa (Top-1: **62.0%**), Da Liễu (Top-1: **57.1%**), Cơ Xương Khớp (Top-1: **57.9%**).
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Kết quả thực nghiệm trên 500 ca bệnh chuẩn y sinh chứng minh hiệu quả vượt trội: Top-1 Accuracy tăng vọt từ 6% lên 23.2% - tức tăng gần 4 lần; Recall@3 tăng lên 33%. Đặc biệt, ở các chuyên khoa phổ biến như Tim mạch và Tiêu hóa, độ chính xác đạt từ 62% đến 77.4%. Độ trễ truy vấn trung bình của đồ thị HNSW trên PostgreSQL đạt 0.72 mili-giây, hoàn toàn đáp ứng tiêu chuẩn xử lý thời gian thực."*

---

### SLIDE 14: PIPELINE PHÂN TÍCH TÀI LIỆU CẬN LÂM SÀNG & OCR SONG SONG
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Quy trình xử lý tài liệu đa phương thức (Multimodal Document Flow):
    - Input: PDF/Ảnh phiếu xét nghiệm $\rightarrow$ Băm mã băm SHA-256 Deduplication.
    - Gatekeeper: Kiểm tra magic bytes và từ khóa y tế (chặn ảnh meme/hóa đơn).
    - OCR song song: Apache PDFBox (Native PDF) + Gemini 1.5 Flash Vision OCR (Scanned PDF/Ảnh).
    - Output: JSONB chứa chỉ số sinh hóa + Khoảng tham chiếu + SBAR Summary.
* **Nội dung hiển thị trên Slide:**
  - **Bảo vệ tài nguyên & Chống trùng lặp:**
    - Băm nhị phân SHA-256: Bệnh nhân quét lại phiếu cũ nhận kết quả ngay ($0\text{ms}$, 0 token, 0đ chi phí).
    - Gatekeeper Sieve: Chặn file rác không phải y tế, hoàn trả hạn ngạch quét tự động.
  - **Trích xuất OCR song song có kiểm soát:**
    - Apache PDFBox 3.0.4 trích xuất văn bản số hóa tức thì trong RAM.
    - Google Gemini 1.5 Flash Vision OCR cho ảnh chụp và bản scan, kiểm soát bằng Semaphore 5 permits.
  - **Mẫu thiết kế Lazy Upload (Commit-After-Success):**
    - File chỉ được tải lên Supabase Storage khi AI phân tích thành công.
    - Tự động xóa file mồ côi (Zero Orphan Files) nếu lưu trữ CSDL thất bại.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Đối với phân hệ phân tích tài liệu xét nghiệm, nhóm xây dựng quy trình kiểm soát chặt chẽ: mã băm SHA-256 giúp trả về kết quả tức thì với chi phí 0 đồng cho các phiếu đã quét; bộ lọc Gatekeeper chặn đứng các file rác; và mô hình Lazy Upload đảm bảo không có bất kỳ 'file mồ côi' nào tồn tại trên Cloud khi xảy ra sự cố."*

---

### SLIDE 15: KHỬ ĐỊNH DANH PII TỰ ĐỘNG & BENCHMARK MEDDIES PII
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Giao diện đối chiếu khử định danh PII (Before & After Masking):
    - Văn bản gốc: Chứa họ tên, số CCCD 12 số, số thẻ BHYT, số điện thoại, địa chỉ nhà.
    - Văn bản đã che giấu: Thế bằng các token chuẩn `[BỆNH_NHÂN_1]`, `[SỐ_ĐỊNH_DANH_1]`, `[SĐT_1]`.
  - Bảng đo đạc Precision/Recall trên 100 tài liệu bệnh viện từ `Meddies/meddies-pii`.
* **Nội dung hiển thị trên Slide:**
  - **Khử định danh tự động 6 thực thể cá nhân:**
    - Số CCCD/CMND: Precision **90.3%**.
    - Ngày tháng năm sinh: Precision **86.4%**.
    - Số điện thoại Việt Nam: Precision **78.5%**, Recall **86.7%**.
    - **Độ chính xác trung bình toàn hệ thống: 82.72% Precision.**
  - **Tuân thủ pháp lý & đạo đức y tế:**
    - Đáp ứng 100% Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
    - Đạt chuẩn HIPAA Safe Harbor Privacy Rule (45 CFR § 164.514).
    - Cơ chế Client-Side Re-identification: Tự động thế ngược tên thật khi hiển thị cho bệnh nhân xem.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Trước khi gửi văn bản xét nghiệm sang mô hình AI đám mây, hệ thống chạy qua động cơ Medical PII Service để che giấu toàn bộ 6 nhóm thông tin định danh. Thực nghiệm trên 100 tài liệu bệnh viện từ tập dữ liệu Meddies PII đạt độ chính xác 82.72%, đảm bảo không một thông tin cá nhân nào của người bệnh bị rò rỉ ra ngoài môi trường Internet."*

---

### SLIDE 16: KIẾN TRÚC TWO-LAYER CACHE (CAFFEINE L1 + REDIS L2)
* **Thời lượng:** 45 giây
* **Gợi ý thiết kế Visual:**
  - Sơ đồ Two-Layer Cache Architecture:
    - Request $\rightarrow$ L1 Caffeine In-Memory ($< 1\text{ms}$) $\rightarrow$ L2 Distributed Redis ($1-3\text{ms}$) $\rightarrow$ PostgreSQL ($15-50\text{ms}$).
    - Luồng Write-Invalidate: Cập nhật dữ liệu lập tức xóa cache đồng bộ.
* **Nội dung hiển thị trên Slide:**
  - **Mục tiêu kiến trúc:** Giảm tải $85\%$ truy vấn đến CSDL quan hệ và giảm thiểu độ trễ API.
  - **Tầng L1 (In-Memory Caffeine Cache):**
    - Lưu trữ danh mục chuyên khoa, cấu hình hệ thống, hồ sơ bác sĩ hàng đầu.
    - Độ trễ truy cập: **$< 1\text{ms}$** trực tiếp trong RAM của JVM.
  - **Tầng L2 (Distributed Redis Cache):**
    - Đồng bộ hóa trạng thái phiên làm việc, danh sách bác sĩ theo chuyên khoa, blacklist token.
    - Độ trễ truy cập: **$1 - 3\text{ms}$**.
  - **Cơ chế Write-Invalidate:** Mọi thao tác cập nhật thông tin bác sĩ hoặc lịch làm việc đều tự động kích hoạt xóa cache hai tầng, chống dữ liệu cũ (Stale Data).
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Để hệ thống chịu tải cao và phản hồi tức thì, nhóm triển khai mô hình Cache 2 lớp: Tầng L1 Caffeine trong bộ nhớ JVM cho độ trễ dưới 1 mili-giây, và Tầng L2 Redis phân tán cho độ trễ 1 đến 3 mili-giây. Mọi thay đổi dữ liệu đều được quản lý bằng cơ chế Write-Invalidate đồng bộ, triệt tiêu nguy cơ hiển thị thông tin cũ."*

---

### SLIDE 17: KIỂM SOÁT TƯƠNG TRANH & HÀNG ĐỢI ĐẶT KHÁM O2O
* **Thời lượng:** 45 giây
* **Gợi ý thiết kế Visual:**
  - Hình minh họa vé khám điện tử O2O Admission Ticket:
    - Mã QR chuẩn RFC 8259, Số thứ tự STT khám, Phòng khám, Tên bác sĩ, Giờ hẹn.
  - Minh họa cơ chế chống trùng lịch (Anti-Double Booking): Khóa mức giao dịch `@Transactional(isolation = REPEATABLE_READ)` và Partial Unique Index.
* **Nội dung hiển thị trên Slide:**
  - **Chống đặt trùng lịch tuyệt đối (Anti-Double Booking Guard):**
    - Chỉ mục duy nhất có điều kiện: `CREATE UNIQUE INDEX ... ON appointments(doctor_id, scheduled_start) WHERE status != 'CANCELLED'`.
    - Mức cô lập giao dịch `REPEATABLE_READ` ngăn chặn hiện tượng đọc bóng ma (Phantom Read).
  - **Vé khám O2O có mã QR & Số thứ tự tự động:**
    - Tự động cấp số thứ tự theo ngày (STT 01, STT 02...) theo từng khung giờ khám.
    - Mã QR chứa chuỗi JSON ký số bảo mật, nhân viên lễ tân bệnh viện quét để check-in chỉ trong 2 giây.
  - **Chính sách hoàn tiền tự động:** Bệnh nhân hủy lịch trước 2 giờ được hệ thống tự động hoàn tiền giao dịch qua Webhook.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Phân hệ đặt khám O2O giải quyết triệt để bài toán tranh chấp lịch hẹn thông qua Partial Unique Index và Transaction Isolation mức Repeatable Read. Khi đặt khám thành công, bệnh nhân nhận được vé khám điện tử chứa mã QR và số thứ tự phòng khám, giúp người bệnh đến viện là được vào khám đúng giờ mà không cần bốc số thủ công."*

---

### SLIDE 18: BÀN LÀM VIỆC BÁC SĨ LÂM SÀNG ĐA MÀN HÌNH (WORKSTATION)
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Giao diện Dual-Screen Split-Screen Workstation của Bác sĩ:
    - Nửa trái: Xem ảnh gốc/PDF phiếu xét nghiệm cận lâm sàng với công cụ phóng to/thu nhỏ.
    - Nửa phải: Bảng chỉ số sinh hóa đã trích xuất, tóm tắt SBAR, khung nhập sinh hiệu (Huyết áp, Mạch, SpO2), chẩn đoán ICD-10 và kê đơn thuốc điện tử.
* **Nội dung hiển thị trên Slide:**
  - **Thiết kế Split-Screen chuyên dụng cho Y tế:**
    - Bác sĩ vừa xem được hình ảnh gốc phiếu xét nghiệm vừa đối chiếu các chỉ số sinh hóa AI đã trích xuất.
    - Triệt tiêu hoàn toàn thao tác chuyển đổi qua lại giữa các tab (Zero Context Switching).
  - **Quản lý hàng đợi bệnh nhân trực tiếp (Queue Calling):**
    - Nút 'Gọi Bệnh Nhân Tiếp Theo' tự động chuyển trạng thái cuộc hẹn từ `SCHEDULED` sang `IN_PROGRESS`.
    - Ứng dụng khóa lạc quan Optimistic Locking với trường `@Version` chống xung đột gọi trùng bệnh nhân.
  - **Bệnh án điện tử EMR hoàn chỉnh:**
    - Ghi nhận đầy đủ sinh hiệu, chỉ số BMI tự động, mã bệnh ICD-10 và đơn thuốc đa thành phần.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Tại phòng khám, bác sĩ được trang bị giao diện Bàn làm việc phân chia hai nửa màn hình: nửa bên trái hiển thị tài liệu gốc của bệnh nhân, nửa bên phải hiển thị chỉ số trích xuất và công cụ nhập bệnh án EMR. Bác sĩ gọi số thứ tự tiếp theo chỉ với một nút bấm có bảo vệ khóa lạc quan Optimistic Locking, giúp quy trình khám bệnh diễn ra trơn tru, chuyên nghiệp."*

---

### SLIDE 19: QUẢN TRỊ TÀI CHÍNH AI FINOPS & BẢNG KIỂM TOÁN CHI PHÍ
* **Thời lượng:** 45 giây
* **Gợi ý thiết kế Visual:**
  - Giao diện Admin Dashboard FinOps:
    - Biểu đồ chuỗi thời gian Recharts thể hiện chi phí tiêu thụ token (Prompt tokens vs Completion tokens).
    - Thẻ thống kê: Tổng chi phí USD, Chi phí theo từng dịch vụ (Triage, OCR, RAG), Cảnh báo ngưỡng ngân sách (Budget Alert).
* **Nội dung hiển thị trên Slide:**
  - **Kiểm toán chi phí Token từng cuộc gọi (Flyway V18 `ai_token_usage`):**
    - Ghi nhận chi tiết: Model AI sử dụng, số token đầu vào, số token đầu ra, độ trễ và chi phí USD chính xác đến 6 chữ số thập phân.
  - **Admin FinOps Dashboard thời gian thực:**
    - Trực quan hóa xu hướng chi phí theo ngày và cơ cấu sử dụng theo từng chuyên khoa.
    - Cơ chế Budget Threshold Alert: Cảnh báo tự động khi chi phí trong ngày chạm ngưỡng định mức.
  - **Cơ chế Hạn ngạch Quét (Scan Quotas) & Gói MediPass VIP:**
    - Cấp hạn ngạch quét cho tài khoản thường và gói VIP (149.000đ/tháng) tạo nguồn thu bù đắp chi phí vận hành AI.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Để giải quyết bài toán chi phí AI đám mây, nhóm xây dựng phân hệ quản trị tài chính FinOps. Mỗi cuộc gọi AI đều được ghi nhận vào bảng kiểm toán với chi phí chính xác đến từng micro-USD. Admin có thể theo dõi biểu đồ chi phí thời gian thực và đặt ngưỡng cảnh báo ngân sách, đồng thời hệ thống tích hợp gói hội viên MediPass VIP để tự bù đắp chi phí vận hành."*

---

### SLIDE 20: KỊCH BẢN LIVE DEMO 5 PHÚT VÀNG TRƯỚC HỘI ĐỒNG
* **Thời lượng:** 60 giây (Chuyển tiếp sang màn hình Demo)
* **Gợi ý thiết kế Visual:**
  - Sơ đồ 5 bước Live Demo liên hoàn (Clean, No-Error Checklist):
    - Bước 1: Admin Dashboard (Kiểm tra trạng thái hệ thống & Biểu đồ FinOps).
    - Bước 2: Bệnh nhân Triage (Thử câu cấp cứu Red-Flag 115 $\rightarrow$ Thử câu triệu chứng bình dân).
    - Bước 3: Tìm Bác Sĩ (Gõ câu hỏi tự nhiên $\rightarrow$ pgvector phản hồi $< 12\text{ms}$).
    - Bước 4: Tóm Tắt Bệnh Án & Khử PII (Tải PDF mẫu Meddies $\rightarrow$ Quét AI $\rightarrow$ Xem bảng chỉ số).
    - Bước 5: Bác Sĩ Workstation (Gọi bệnh nhân $\rightarrow$ Nhập EMR $\rightarrow$ Kê đơn thuốc).
* **Nội dung hiển thị trên Slide:**
  - **Kịch bản Demo chuẩn bị kỹ lưỡng, dữ liệu thực nghiệm sẵn sàng:**
    - **Bước 1:** Đăng nhập Admin $\rightarrow$ Kiểm tra PostgreSQL pgvector UP, Redis UP.
    - **Bước 2:** Bệnh nhân chat *"tôi bị đau ngực dữ dội lan ra vai trái"* $\rightarrow$ Kích hoạt cảnh báo Đỏ 115; Chat triệu chứng tiêu hóa $\rightarrow$ Định tuyến đúng khoa.
    - **Bước 3:** Tìm kiếm *"chuyên gia can thiệp mạch vành"* $\rightarrow$ `pgvector HNSW` đưa bác sĩ top 1 lên đầu.
    - **Bước 4:** Bấm nút *"Tải PDF Ngẫu Nhiên"* từ kho Hugging Face Meddies 150k ca $\rightarrow$ Kéo thả vào quét AI $\rightarrow$ Khử PII và hiển thị chỉ số sinh hóa.
    - **Bước 5:** Bác sĩ mở Workstation $\rightarrow$ Check-in vé khám QR $\rightarrow$ Lưu bệnh án EMR.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Sau đây, em xin phép chuyển sang phần Live Demo trực tiếp trên hệ thống thực tế đang vận hành để chứng minh các tính năng vừa trình bày. Toàn bộ cơ sở dữ liệu đã được nạp sẵn vector nhúng của các bác sĩ và hệ thống đã sẵn sàng."*

---

### SLIDE 21: ĐẢM BẢO CHẤT LƯỢNG TOÀN DIỆN (TESTING & RESILIENCE)
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Huy hiệu chất lượng (Quality Badges):
    - `306 / 306 Backend Tests PASS (100%)` (Màu xanh lá rực rỡ).
    - `TypeScript Strict Mode: 0 Error, 0 Warning` (Build sạch 100%).
    - Biểu đồ kết quả k6 Load Testing (500 Virtual Users, 0% Error Rate, Latency P95 $< 18\text{ms}$).
* **Nội dung hiển thị trên Slide:**
  - **Kiểm thử tự động hóa toàn diện:**
    - **306/306 Unit & Slice Tests Backend vượt qua 100% (`mvn test`):** Bao phủ toàn bộ các dịch vụ trọng yếu (`ClinicalQueryDefenseEngineTest`, `DoctorSemanticSearchServiceTest`, `ClinicalOntologyServiceTest`, `RedFlagServiceTest`, `PatientAccessGuardTest`, `MedicalDocumentFileAccessServiceTest`, `AuthServiceEmailVerificationTest`, `AuthServicePasswordResetTest`...).
    - **Frontend Compile sạch 100% (`npm run build`):** 2.307 modules được biên dịch với 0 lỗi TypeScript dưới chế độ nghiêm ngặt và chia nhỏ bundle tự động (Code-splitting).
  - **Kiểm thử khả năng chịu tải (k6 Load Test):**
    - Duy trì ổn định ở mức 500 người dùng ảo đồng thời (Virtual Users).
    - Tỷ lệ lỗi giao dịch: **0.00%**, độ trễ $P95 < 18\text{ms}$ nhờ bộ nhớ đệm 2 lớp L1/L2.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Để đảm bảo chất lượng phần mềm chuẩn doanh nghiệp, nhóm duy trì bộ kiểm thử tự động với 306 trên 306 bài test Backend chạy thành công 100%, Frontend không có bất kỳ lỗi TypeScript nào. Thử nghiệm tải bằng k6 với 500 người dùng đồng thời cho tỷ lệ lỗi bằng 0% và độ trễ P95 dưới 18 mili-giây."*

---

### SLIDE 22: KẾ HOẠCH MỞ RỘNG HỆ THỐNG TRÊN MÁY CHỦ 16GB RAM / 512GB SSD
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Bảng ma trận năng lực mở rộng phần cứng (Scalability Matrix):
    - Cấu hình máy chủ mục tiêu: 16GB RAM / 512GB SSD / 4-8 CPU Cores.
    - Sơ đồ phân bổ RAM: PostgreSQL 4GB (`shared_buffers`), Cache OS 6GB, Spring Boot 2GB, Redis 1GB, Dư phòng 3GB.
* **Nội dung hiển thị trên Slide:**
  - **Chi phí bộ nhớ của Vector 1536 chiều:** Mỗi vector chiếm $\approx 6.14\text{ KB}$, đồ thị HNSW chiếm $6-8\text{ KB} \rightarrow$ Tổng cộng $\approx 12-15\text{ KB}$/bác sĩ.
  - **Khả năng mở rộng quy mô thực tế:**
    - **10.000 Bác sĩ:** Chỉ tốn $150\text{ MB}$ RAM, độ trễ $< 1\text{ms}$.
    - **50.000 Bác sĩ (Quy mô toàn quốc):** Tốn $750\text{ MB}$ RAM, nằm trọn vẹn trong RAM máy 16GB.
    - **Toàn bộ 150.000 Hồ sơ Meddies:** Chỉ chiếm $2.2\text{ GB}$ RAM và $6\text{ GB}$ SSD.
  - **Gói triển khai sẵn sàng trong thư mục `pgvector_scaling_16gb/`:**
    - `docker-compose.16gb.yml` cấp sẵn 4GB `shared_buffers` và 4 parallel workers.
    - `tune_hnsw_ultra_precision.sql` nâng cấp $m = 32, ef\_construction = 256$.
    - `run_scaled_pipeline.sh` chạy mở rộng chỉ với 1 click.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Về khả năng mở rộng, nhóm đã tính toán chi tiết và đóng gói giải pháp mở rộng trên máy chủ tiêu chuẩn 16GB RAM trong thư mục pgvector_scaling_16gb. Ngay cả khi mở rộng lên 50.000 bác sĩ trên toàn quốc hoặc nạp toàn bộ 150.000 ca bệnh Meddies, hệ thống cũng chỉ tiêu tốn hơn 2GB RAM, hoàn toàn nằm trọn trong bộ nhớ đệm và duy trì thời gian phản hồi dưới 1 mili-giây."*

---

### SLIDE 23: ĐÓNG GÓP KHOA HỌC, HẠN CHẾ & HƯỚNG PHÁT TRIỂN
* **Thời lượng:** 50 giây
* **Gợi ý thiết kế Visual:**
  - Chia 3 khối nội dung rõ ràng:
    - Khối 1 (Đóng góp): 5-Stage Defense Engine, Đột phá HNSW Meddies, Khử PII 82.72%.
    - Khối 2 (Hạn chế): Phụ thuộc Internet cho LLM Vision, chưa tích hợp IoT y tế tại nhà.
    - Khối 3 (Hướng phát triển): Tích hợp Local SLM (BioMistral 7B), Cổng thanh toán quốc gia VNPay.
* **Nội dung hiển thị trên Slide:**
  - **Đóng góp chính của đề tài:**
    - Giải quyết bài toán lệch ngữ nghĩa trong y tế bằng mô hình kết hợp Tri thức lâm sàng Meddies và `pgvector HNSW`.
    - Xây dựng động cơ 5 tầng "Bao Đầu Vào" và thuật toán Vietnamese NegEx bóc tách phủ định.
    - Kiến trúc Telehealth O2O hoàn chỉnh với độ trễ thấp và bảo mật kép theo Nghị định 13.
  - **Hạn chế hiện tại:** Phụ thuộc vào API LLM bên ngoài khi phân tích hình ảnh phức tạp; chi phí token khi lượng tài liệu tăng cao.
  - **Hướng phát triển tiếp theo:**
    - Triển khai mô hình ngôn ngữ nhỏ cục bộ (Local SLM như BioMistral 7B) phục vụ Edge Computing trong bệnh viện.
    - Kết nối thiết bị đo sinh hiệu IoT (Vòng đeo tay, máy đo huyết áp Bluetooth).
    - Tích hợp bảo hiểm y tế điện tử (VssID) và cổng thanh toán VNPay/MoMo.
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Đề tài đã đóng góp một giải pháp hoàn chỉnh từ lý thuyết khoa học dữ liệu đến hiện thực hóa phần mềm cấp doanh nghiệp. Trong tương lai, nhóm định hướng đưa các mô hình ngôn ngữ chuyên ngành y tế nhỏ gọn (Local SLM) chạy trực tiếp tại biên mạng bệnh viện để hoàn toàn độc lập với Internet và bảo mật tối đa."*

---

### SLIDE 24: KẾT LUẬN, LỜI CẢM ƠN & PHIÊN HỎI ĐÁP (Q&A)
* **Thời lượng:** 30 giây
* **Gợi ý thiết kế Visual:**
  - Nền Clinical Blue trang trọng, biểu tượng ống nghe và trái tim y tế cách điệu.
  - Dòng chữ lớn: "XIN CHÂN THÀNH CẢM ƠN QUÝ THẦY CÔ TRONG HỘI ĐỒNG!"
  - Thông tin liên hệ nhóm & Link kho lưu trữ GitHub của dự án (`github.com/vinhhotff/KLTN-medical-assistant`).
* **Nội dung hiển thị trên Slide:**
  - **MediAssist-AI:** Nền tảng Y tế Số Tin Cậy - An Toàn - Hiệu Năng Cao.
  - **Lời tri ân:** Xin trân trọng cảm ơn Thầy/Cô Hướng dẫn và Quý Thầy/Cô trong Hội đồng đã dành thời gian lắng nghe và đóng góp ý kiến quý báu cho đề tài.
  - **SẴN SÀNG CHO PHIÊN HỎI ĐÁP & PHẢN BIỆN (Q&A SESSION).**
* **Kịch bản lời thoại (Speaker Notes):**
  > *"Trên đây là toàn bộ phần trình bày của nhóm em về đề tài MediAssist-AI. Chúng em xin trân trọng cảm ơn Quý Thầy Cô đã chú ý lắng nghe. Nhóm em rất mong nhận được những nhận xét, góp ý quý báu từ Hội đồng và sẵn sàng trả lời các câu hỏi phản biện của Thầy Cô ạ!"*

---

## 🎯 DANH MỤC TÀI LIỆU LIÊN KẾT NHANH PHỤC VỤ BẢO VỆ

| Nhu Cầu Cần Tra Cứu | Tệp Tài Liệu Cần Mở Ngay | Nội Dung Trọng Tâm |
| :--- | :--- | :--- |
| **Soạn Slide PowerPoint / Canva** | `docs/CAPSTONE_PRESENTATION_SLIDES.md` | Bộ 24 slide, bố cục visual, kịch bản thuyết trình từng câu (File này). |
| **Trả lời phản biện Hội đồng (Q&A)** | `docs/CAPSTONE_DEFENSE.md` | 20 câu hỏi - câu trả lời mẫu chuyên sâu cấp chuyên gia. |
| **Phao cứu sinh thi bảo vệ (Cheat Sheet)** | `pgvector_scaling_16gb/CAPSTONE_DEFENSE_CHEAT_SHEET.md` | 8 câu hỏi cốt lõi về Meddies, pgvector, HNSW, và live demo. |
| **Đặc tả yêu cầu phần mềm (SRS)** | `docs/SRS_MediAssist_AI.md` | Chuẩn IEEE 830, đặc tả FR, NFR, RTM và rào chắn an toàn. |
| **Báo cáo đo đạc đồ thị vector** | `docs/VECTOR_BENCHMARK_REPORT.md` | Bảng số liệu Top-1 (23.2%), Recall@3 (33.0%), Latency 0.72ms. |
| **Mở rộng máy chủ 16GB RAM** | `pgvector_scaling_16gb/README.md` | Hướng dẫn cấu hình Docker, Flyway SQL, và script 1-click. |
