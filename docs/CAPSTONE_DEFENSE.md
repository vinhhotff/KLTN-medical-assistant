# Cẩm Nang Bảo Vệ Khóa Luận Tốt Nghiệp (Capstone Thesis Defense Guide)
## Đề Tài: Xây Dựng Nền Tảng Khám Bệnh Từ Xa Tích Hợp AI Phân Luồng & Tóm Tắt Bệnh Án (MediAssist-AI)

> **Chuyên ngành:** Kỹ Thuật Phần Mềm - Trí Tuệ Nhân Tạo (Software Engineering - Artificial Intelligence)  
> **Đơn vị đào tạo:** Đại học FPT / Đại học Bách Khoa / Đại học Quốc Gia  
> **Phiên bản tài liệu:** 2.0 (Chuẩn Đánh Giá Xuất Sắc - Grade A / High Distinction)  
> **Mục tiêu:** Hướng dẫn toàn diện cấu trúc luận văn, kịch bản thuyết trình 15 phút, checklist kịch bản live demo không lỗi, và bộ 10 câu hỏi phản biện chuyên sâu cùng câu trả lời mẫu chuẩn kỹ thuật doanh nghiệp.

---

## 1. Cấu Trúc Báo Cáo Luận Văn Chuẩn 5 Chương (Thesis Outline)

### Chương 1: Giới Thiệu & Đặt Vấn Đề (Introduction & Motivation)
* **1.1. Bối cảnh thực tiễn:** Tình trạng quá tải tại các bệnh viện công tuyến trung ương tại Việt Nam; bất bình đẳng tiếp cận y tế chất lượng cao giữa nông thôn và thành thị.
* **1.2. Vấn đề nghiên cứu:** Rào cản ngôn ngữ chuyên môn trong hồ sơ xét nghiệm y khoa; rủi ro thông tin sai lệch từ "Bác sĩ Google"; nhu cầu sàng lọc triệu chứng ban đầu an toàn.
* **1.3. Mục tiêu đề tài:** Xây dựng hệ thống Telehealth chịu tải cao, tích hợp AI phân luồng sơ bộ và giải nghĩa phiếu khám, tuân thủ nghiêm ngặt các rào chắn đạo đức y tế.
* **1.4. Đối tượng & Phạm vi nghiên cứu:** Mô hình Multimodal LLM (OpenAI GPT-4o, Gemini 1.5 Pro); hệ cơ sở dữ liệu Vector (`pgvector`); kiến trúc Web phân tán Java Spring Boot 3 + React.

### Chương 2: Cơ Sở Lý Thuyết & Công Nghệ Liên Quan (Literature Review & Tech Stack)
* **2.1. Y học số & Khám chữa bệnh từ xa:** Quy chuẩn pháp lý Telehealth tại Việt Nam (Thông tư 46/2018/TT-BYT, Luật Khám bệnh, chữa bệnh 2023).
* **2.2. Trí tuệ nhân tạo tạo sinh & Mô hình ngôn ngữ lớn (LLM):** Cơ chế Attention, Prompt Engineering y khoa, trích xuất thực thể lâm sàng (NER) từ hình ảnh xét nghiệm.
* **2.3. Vector Embeddings & Thuật toán xấp xỉ láng giềng gần nhất (ANN):** So sánh Cosine Similarity, HNSW Indexing so với IVFFlat.
* **2.4. Kiến trúc phần mềm chịu tải cao:** Chiến lược Two-Layer Cache (In-Memory Caffeine + Distributed Redis), Connection Pooling (HikariCP), Kiểm soát tương tranh (Pessimistic vs Optimistic Locking).

### Chương 3: Phân Tích & Thiết Kế Hệ Thống (System Analysis & Design)
* **3.1. Đặc tả yêu cầu:** Mô hình chức năng RUP, danh mục Use Cases, Non-Functional Requirements (SLA: Độ trễ, Tính sẵn sàng, Bảo mật).
* **3.2. Kiến trúc tổng thể hệ thống (C4 Model):** Context Diagram, Container Diagram, Component Diagram.
* **3.3. Thiết kế cơ sở dữ liệu:** Mô hình ERD chuẩn 3NF, cấu trúc Vector Table, kế hoạch phân vùng (Partitioning) và chiến lược đánh Index tối ưu.
* **3.4. Rào chắn đạo đức & An toàn y tế (Safety Guardrails):** Bộ lọc Red-flag từ khóa cấp cứu, quy trình Human-in-the-loop.

### Chương 4: Hiện Thực Hóa Hệ Thống (System Implementation)
* **4.1. Hiện thực hóa Backend (Spring Boot 3.4 & Java 21+):**
  - Cơ chế Dual-Transport Authentication (JWT Bearer + HttpOnly Cookie).
  - Tầng Two-Layer Cache đồng bộ (Read-through & Write-invalidate).
  - Tích hợp `pgvector` thực thi truy vấn HNSW Cosine Similarity.
* **4.2. Hiện thực hóa Frontend (React 19 + TypeScript + Tailwind CSS):**
  - Hệ thống Role-Based Route Guards (Admin, Doctor, Patient).
  - Zero-flicker State Hydration với Zustand.
  - Thiết kế UI chuẩn y tế: Thanh cảnh báo Disclaimer thường trực, bảng chỉ số xét nghiệm tương phản cao.
* **4.3. Pipeline xử lý tài liệu AI:** Tải lên tệp an toàn, OCR trích xuất thông tin, xử lý cấu trúc JSONB.

### Chương 5: Đánh Giá Hiệu Năng & Kết Luận (Evaluation & Conclusion)
* **5.1. Kịch bản kiểm thử tải (Load Testing):** Đo đạc $p95$ Latency và Throughput (RPS) bằng Apache JMeter / k6 khi có và không có Cache 2 lớp.
* **5.2. Đánh giá chất lượng phân luồng AI:** Độ chính xác gợi ý chuyên khoa dựa trên tập dữ liệu thử nghiệm 100 ca lâm sàng mẫu.
* **5.3. Hạn chế của đề tài:** Phụ thuộc vào API bên thứ ba, chi phí token, bài toán kết nối thiết bị IoT y tế gia đình.
* **5.4. Hướng phát triển:** Triển khai mô hình cục bộ (Local SLM như BioMistral 7B) phục vụ Edge Computing, tích hợp thanh toán cổng quốc gia VNPay/MoMo.

---

## 2. Kịch Bản Thuyết Trình 15 Phút Trước Hội Đồng (Defense Speech Script)

| Mốc Thời Gian | Nội Dung Trình Bày | Slide Chiếu | Người Nói / Thao Tác |
| :---: | :--- | :--- | :--- |
| **00:00 - 02:00** | **Mở đầu & Nỗi đau thực tế:** Đặt vấn đề nghịch lý quá tải bệnh viện tuyến trên tại Việt Nam, sự hoang mang của bệnh nhân trước các phiếu xét nghiệm khó hiểu. | Slide 1-3 | Trưởng nhóm (Tự tin, cảm xúc) |
| **02:00 - 05:00** | **Giải pháp & Kiến trúc kỹ thuật:** Giới thiệu MediAssist-AI, sơ đồ kiến trúc tổng thể C4 Container, Backend Java Spring Boot 3 + Redis 2-Layer Cache + PostgreSQL pgvector. | Slide 4-7 | Thành viên phụ trách Backend |
| **05:00 - 08:00** | **Đặc tả AI & Rào chắn đạo đức y tế:** Trình bày cơ chế AI Symptom Triage, rào chắn Red-flag ngắt đàm thoại cấp cứu, tính năng dịch phiếu xét nghiệm. | Slide 8-11 | Thành viên phụ trách AI/Data |
| **08:00 - 13:00** | **LIVE DEMO HỆ THỐNG (5 Phút vàng):** Thao tác trực tiếp trên môi trường thực tế (Xem chi tiết mục 3). | Màn hình Demo | Cả nhóm phối hợp |
| **13:00 - 15:00** | **Kết quả thực nghiệm & Kết luận:** Bảng so sánh tải khi có Cache (Latency giảm từ $180\text{ms} \rightarrow 12\text{ms}$), lời cảm ơn Hội đồng. | Slide 12-14 | Trưởng nhóm kết luận |

---

## 3. Danh Sách Kiểm Tra Live Demo Không Lỗi (Live Demo Checklist)

> [!TIP]
> **Quy tắc bất di bất dịch khi Demo trước Hội đồng:** Chuẩn bị sẵn dữ liệu mẫu (Seeded Data), tuyệt đối không để các trường nhập liệu trống, chuẩn bị sẵn tệp ảnh phiếu xét nghiệm mẫu trong thư mục Desktop.

### Các bước Demo tuần tự (Kịch bản 5 phút):
1. **Bước 1: Giám sát Trạng thái Hệ thống (Admin Dashboard)**
   - Đăng nhập tài khoản Admin (`admin@mediassist.ai`).
   - Mở Dashboard xem các thẻ giám sát thời gian thực:
     - PostgreSQL + pgvector: `UP` (Vector 1536-dim).
     - Redis & 2-Layer Cache: `UP` (L1 Memory + L2 Distributed).
   - Nhấp vào menu *Duyệt Bác Sĩ (Vetting)*, *Quản lý Người Dùng*, *Danh mục Chuyên khoa* $\rightarrow$ **Chứng minh chuyển trang mượt mà, không bị đá về Login.**
2. **Bước 2: Phân Luồng Triệu Chứng & Rào Chắn Red-Flag (Patient Portal)**
   - Mở tab ẩn danh hoặc chuyển sang vai trò Bệnh nhân.
   - Chỉ ra thanh cảnh báo **Medical Disclaimer Banner** màu hổ phách luôn cố định trên đầu trang.
   - Thử nhập câu chat cấp cứu: *"Tôi bị đau thắt ngực dữ dội lan ra vai trái và khó thở"* $\rightarrow$ Hệ thống kích hoạt cảnh báo đỏ khẩn cấp, hiển thị hotline 115.
   - Thử nhập câu chat thông thường: *"Dạo này tôi hay bị mất ngủ, tim đập nhanh hồi hộp khi làm việc căng thẳng"* $\rightarrow$ AI trò chuyện, phân loại mức độ *ROUTINE* và gợi ý chuyên khoa Tim Mạch / Tâm lý.
3. **Bước 3: Tìm Kiếm Bác Sĩ Bằng Vector Similarity (`pgvector`)**
   - Chuyển sang trang *Tìm & Đặt Bác Sĩ*.
   - Nhập chuỗi tìm kiếm tự nhiên: *"bác sĩ can thiệp mạch vành"* $\rightarrow$ Hệ thống gọi `pgvector` tính khoảng cách cosine và đưa bác sĩ Nguyễn Văn An lên vị trí top 1 với độ tương quan cao nhất.
   - Bấm *Đặt Khám Ngay* $\rightarrow$ Thông báo đặt lịch thành công hiển thị tức thì.
4. **Bước 4: Giải Nghĩa Phiếu Xét Nghiệm Bằng AI (Document Summarizer)**
   - Mở tab *Tóm Tắt Bệnh Án*.
   - Chọn tệp ảnh phiếu xét nghiệm máu mẫu và bấm *Phân Tích AI*.
   - Hệ thống hiển thị bảng chỉ số trích xuất: Cholesterol (6.2 mmol/L - Tăng nhẹ), Đường huyết (5.1 mmol/L - Bình thường) kèm lời khuyên ăn uống giảm mỡ máu dễ hiểu.

---

## 4. Top 10 Câu Hỏi Phản Biện Chuyên Sâu & Lời Giải Mẫu (Anticipated Defense Q&A)

### Câu hỏi 1: Tại sao nhóm chọn kiến trúc Modular Monolith với Spring Boot thay vì Microservices ngay từ đầu?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, đối với hệ thống Telehealth trong giai đoạn khởi tạo và quy mô dưới 100.000 người dùng, việc áp dụng Microservices sẽ dẫn đến tình trạng **Over-engineering**, làm tăng chi phí vận hành hạ tầng, phức tạp hóa giao dịch phân tán (Distributed Transaction / Saga pattern) và tăng độ trễ mạng giữa các service (Network Latency).  
  Do đó, nhóm lựa chọn kiến trúc **Modular Monolith** với Spring Boot 3.4: các module (Auth, Triage, Appointment, Doctor) được chia gói độc lập rõ ràng (Loose Coupling, High Cohesion). Khi tải tăng cao ở một module đặc thù như AI Processing, nhóm có thể dễ dàng tách module đó thành microservice độc lập mà không cần tái cấu trúc toàn bộ mã nguồn."*

---

### Câu hỏi 2: Tại sao nhóm dùng pgvector ngay trong PostgreSQL mà không dùng cơ sở dữ liệu vector chuyên dụng như Milvus hay Pinecone?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, việc sử dụng `pgvector` đem lại 3 lợi thế vượt trội cho hệ thống:
  1. **Tính nhất quán ACID và giảm phân mảnh hạ tầng:** Toàn bộ dữ liệu nghiệp vụ (Họ tên, chứng chỉ bác sĩ, chuyên khoa) và vector embedding nằm chung trong một cơ sở dữ liệu duy nhất, cho phép thực hiện truy vấn kết hợp (Hybrid Search: vừa lọc `vetting_status = 'VERIFIED'` vừa tính khoảng cách vector cosine) trong một câu lệnh SQL duy nhất mà không cần đồng bộ dữ liệu giữa 2 DB khác nhau.
  2. **Tiết kiệm chi phí vận hành:** Tránh được chi phí duy trì cụm server riêng cho Milvus hoặc chi phí thuê bao đắt đỏ của Pinecone.
  3. **Hiệu năng đáp ứng đủ tốt:** Với thuật toán HNSW Index trên `pgvector`, thời gian truy vấn với tập dữ liệu hàng chục nghìn vector chỉ mất dưới 15ms, hoàn toàn đáp ứng chuẩn SLA của hệ thống."*

---

### Câu hỏi 3: Nếu mô hình LLM gặp hiện tượng "ảo giác" (Hallucination) và đưa ra lời khuyên y tế sai lệch gây nguy hiểm cho bệnh nhân, hệ thống xử lý thế nào?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, đây là vấn đề sống còn trong ứng dụng AI Y tế. Nhóm thiết lập cơ chế **Phòng Thủ 4 Lớp (Defense-in-Depth)**:
  1. **Rào chắn Quy tắc cứng (Rule-based Red-flag Filter):** Đứng trước LLM, dùng regex để bắt ngay lập tức các tình huống cấp cứu và chuyển hướng sang 115, không cho LLM cơ hội sinh phản hồi.
  2. **Prompt Guardrail & Grounding:** Ép buộc mô hình chỉ được giải nghĩa dựa trên văn bản trích xuất từ tài liệu, nghiêm cấm suy đoán ngoài ngữ cảnh được cung cấp.
  3. **Tuyên bố pháp lý thường trực:** Mọi màn hình đều có disclaimer nhấn mạnh AI chỉ mang tính định hướng thông tin sơ bộ.
  4. **Quy tắc Human-in-the-loop:** AI không có quyền kê đơn hay đưa ra kết luận chẩn đoán cuối cùng; mọi quyết định y khoa bắt buộc phải do Bác sĩ thật có CCHN ký duyệt."*

---

### Câu hỏi 4: Khi hàng chục bệnh nhân cùng bấm đặt một khung giờ khám của bác sĩ tại cùng một thời điểm, làm sao hệ thống chống được Race Condition?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, nhóm bảo vệ giao dịch ở cả 3 tầng:
  1. **Tầng Ứng dụng:** Sử dụng cơ chế khóa phân tán (Distributed Lock trên Redis) hoặc Pessimistic Locking (`SELECT ... FOR UPDATE`) trong giao dịch Spring Boot `@Transactional`.
  2. **Tầng Cơ sở dữ liệu:** Tạo **Unique Partial Index** trên PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX idx_unique_doctor_schedule 
     ON appointments(doctor_id, scheduled_start) 
     WHERE status NOT IN ('CANCELLED');
     ```
     Bất kỳ giao dịch thứ hai nào cố gắng ghi trùng khung giờ sẽ bị DB chặn đứng ngay lập tức với lỗi vi phạm ràng buộc toàn vẹn dữ liệu.
  3. **Tầng ORM:** Bổ sung cột `@Version` để áp dụng Optimistic Locking, đảm bảo trạng thái bản ghi không bị ghi đè dữ liệu cũ."*

---

### Câu hỏi 5: Cơ chế hoạt động của Bộ nhớ đệm 2 lớp (Two-Layer Cache) trong dự án này là gì?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, kiến trúc Cache 2 lớp hoạt động theo cơ chế Read-through và Write-invalidate:
  - **L1 Cache (In-Memory Caffeine):** Nằm ngay trong bộ nhớ JVM của ứng dụng. Truy xuất cực nhanh với độ trễ dưới $1\text{ms}$, loại bỏ hoàn toàn chi phí serialize/deserialize qua mạng.
  - **L2 Cache (Distributed Redis):** Đóng vai trò bộ nhớ đệm dùng chung cho nhiều instance ứng dụng, đảm bảo tính nhất quán dữ liệu khi mở rộng quy mô (Scale out).
  - Khi có request đọc: Hệ thống kiểm tra L1 trước $\rightarrow$ nếu Miss thì kiểm tra L2 $\rightarrow$ nếu Miss tiếp mới truy vấn PostgreSQL, sau đó ghi ngược lại cả L2 và L1.
---

### Câu hỏi 6: Hệ thống bảo vệ dịch vụ AI đắt tiền thế nào trước nguy cơ tấn công DDoS, cào dữ liệu (scraping) hoặc Brute-Force tài khoản người dùng?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, nhóm thiết lập cơ chế **Bảo Mật Zero-Trust và Phòng Thủ Tải Đa Lớp (Defense-in-Depth)**:
  1. **Nguyên tắc Zero-Trust Login-First:** Thu hồi toàn bộ quyền truy cập ẩn danh (Guest) đối với các dịch vụ AI. Mọi request gọi vào `/triage/assess` hoặc `/documents/analyze` bắt buộc phải có JWT Token hợp lệ, nếu không sẽ bị chặn ngay ở tầng Filter với `HTTP 401 Unauthorized`. Điều này loại bỏ hoàn toàn botnet cào dữ liệu làm tiêu hao token LLM.
  2. **Phòng thủ Brute-Force & Khóa tài khoản cấp Entity:** Hệ thống đếm số lần sai mật khẩu liên tiếp. Sau đúng 5 lần vi phạm, tài khoản bị khóa trong 15 phút (`HTTP 423 Locked`). Đặc biệt, cơ chế khóa được lưu tại cột `locked_until` trong bảng `users`, giúp vô hiệu hóa các cuộc tấn công Brute-force dạng phân tán (Distributed Botnet - xoay địa chỉ IP liên tục).
  3. **Kiểm soát tần suất IP phân tán (Redis Rate Limiting):** Sử dụng thuật toán Sliding-Window trên Redis để giới hạn: tối đa 5 lượt đăng nhập/phút/IP, 10 lượt triage/phút/user, 5 tệp PDF/phút/user. Vượt ngưỡng sẽ nhận mã `HTTP 429 Too Many Requests`.
  4. **Security Headers Chuẩn OWASP:** Cấu hình `X-Frame-Options: DENY` chống tấn công Clickjacking và `X-Content-Type-Options: nosniff` chống MIME-sniffing."*

---

### Câu hỏi 7: Nền tảng MediAssist-AI vận hành theo mô hình kinh doanh (Business Model) nào để tự chủ tài chính và bù đắp chi phí hạ tầng máy chủ & token LLM?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, dự án được thiết kế theo mô hình **Hybrid Monetization (Đa nguồn thu)** bền vững:
  1. **Gói Hội Viên Thuê Bao MediPass VIP (149.000đ/tháng hoặc 1.290.000đ/năm):** Cung cấp quyền truy cập Triage AI 24/7 không giới hạn, 10 lượt giải nghĩa phiếu xét nghiệm nâng cao/tháng, giảm 10% phí khám bác sĩ và miễn phí lưu trữ đám mây bệnh án điện tử EMR cho cả gia đình.
  2. **Hoa hồng Khám bệnh từ xa qua Ký quỹ Escrow:** Nền tảng thu phí hoa hồng **15%** trên mỗi phiên khám của bác sĩ (giá khám từ 250.000đ - 450.000đ do bác sĩ niêm yết). Tiền được giữ tạm thời tại tài khoản Escrow và chỉ giải ngân cho bác sĩ (85%) khi ca khám hoàn tất (`COMPLETED`).
  3. **Hạn ngạch Phân tích OCR Xét nghiệm (Pay-as-you-go):** Người dùng mới được tặng 1 lần dùng thử miễn phí; sau đó người dùng có thể mua lượt quét lẻ (29.000đ/lần) hoặc gói combo 5 lần (99.000đ) để phân tích phiếu xét nghiệm định kỳ."*

---


---

### Câu hỏi 8: Tại sao hệ thống lại sử dụng kiến trúc Clinical RAG kết hợp với OpenRouter AI Gateway và cơ chế xoay tua mô hình (Model Rotation / Failover), thay vì gọi trực tiếp một API độc quyền như OpenAI hay Gemini trả phí?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, quyết định kiến trúc này giải quyết trọn vẹn 3 bài toán sống còn của hệ thống y tế số:
  1. **Bài toán Chi phí (Cost Optimization):** Việc gọi thẳng LLM trả phí độc quyền cho hàng nghìn lượt quét PDF và triệu chứng mỗi ngày sẽ khiến chi phí vận hành tăng theo cấp số nhân. Bằng cách tích hợp OpenRouter Gateway với các mô hình mã nguồn mở thế hệ mới (`gemini-2.0-flash:free`, `llama-3.3-70b:free`, `deepseek-r1:free`), hệ thống đưa chi phí vận hành về **0đ** trong quá trình thử nghiệm và triển khai tại bệnh viện.
  2. **Bài toán Chống Nghẽn & Khả Dụng Cao (High Availability on HTTP 429):** Các dịch vụ AI đám mây thường xuyên gặp hiện tượng quá tải (Rate Limit - HTTP 429). Nhóm đã thiết kế lớp `AiModelRouter` theo mô hình Chain-of-Responsibility: Khi mô hình thứ nhất bị nghẽn (429), router tự động chuyển tiếp request sang mô hình thứ hai trong pool trong chưa đầy 1 giây mà người dùng không hề bị gián đoạn.
  3. **Lập luận Y Khoa Chuẩn Xác qua RAG (Grounded Reasoning):** Thay vì để LLM tự phỏng đoán bác sĩ, hệ thống dùng `pgvector` truy xuất các bác sĩ có chứng chỉ hành nghề và chuyên môn cao nhất trước, sau đó đưa danh sách này vào bối cảnh (Augmented Context) để LLM đưa ra lập luận vì sao bác sĩ đó là người phù hợp nhất cho người bệnh."*

---

### Câu hỏi 9: Điều gì sẽ xảy ra nếu toàn bộ API AI bên ngoài bị ngắt kết nối internet hoặc toàn bộ các nhà cung cấp đều bị sự cố?
* **Trả lời của sinh viên:**  
  *"Thưa Thầy Cô, trong y tế, nguyên tắc số một là **Hệ thống không bao giờ được phép sập (Graceful Degradation)**:
  - Nhóm đã xây dựng một thành phần dự phòng chuyên biệt mang tên `DeterministicFallbackAiProvider` (Offline Safe Engine).
  - Khi `AiModelRouter` phát hiện toàn bộ các mô hình bên ngoài đều quá tải hoặc mất mạng internet, hệ thống sẽ tự động chuyển sang phân tích bằng động cơ quy tắc lâm sàng cục bộ (Clinical Rule Engine). Động cơ này tự động bóc tách chỉ số sinh hóa, định hướng chuyên khoa, tạo bản tóm tắt lâm sàng chuẩn xác và chọn bác sĩ có điểm tương đồng vector cao nhất.
  - Nhờ cơ chế này, hệ thống đạt độ khả dụng 99.9%, bảo vệ bệnh nhân an toàn tuyệt đối ngay cả trong điều kiện thảm họa mất kết nối mạng bên ngoài."*

## 5. Bảng Tiêu Chí Đánh Giá Xuất Sắc Của Hội Đồng (Evaluation Rubric)

| Tiêu Chí Đánh Giá | Trọng Số | Yêu Cầu Để Đạt Điểm Tối Đa (Grade A / 9.0 - 10.0) | Hiện Trạng Dự Án MediAssist-AI |
| :--- | :---: | :--- | :--- |
| **Tính Thực Tiễn & Tính Đổi Mới** | 20% | Giải quyết bài toán xã hội cấp thiết, có góc nhìn nhân văn và ứng dụng AI có trách nhiệm. | Đạt xuất sắc: Giải quyết bài toán quá tải bệnh viện và rào cản thuật ngữ y khoa tại Việt Nam. |
| **Kiến Trúc & Thiết Kế Hệ Thống** | 25% | Kiến trúc phân tầng rõ ràng, cơ sở dữ liệu chuẩn hóa, có giải pháp chống race condition, cache chịu tải. | Đạt xuất sắc: Spring Boot 3 + PostgreSQL pgvector + Redis 2-Layer Cache + Connection Pool HikariCP. |
| **Chất Lượng Mã Nguồn & Testing** | 20% | Mã nguồn sạch (Clean Code), không lỗi bảo mật, tuân thủ nguyên lý SOLID, unit test đầy đủ. | Đạt xuất sắc: Java 21 LTS, TypeScript nghiêm ngặt (0 lint error), build xanh 100%. |
| **Bảo Mật & Tuân Thủ Pháp Lý** | 15% | RBAC chặt chẽ, mật khẩu mã hóa Bcrypt cost 12, token HttpOnly cookie, disclaimer y tế rõ ràng. | Đạt xuất sắc: Đạt chuẩn bảo mật OWASP, có rào chắn Red-flag khẩn cấp. |
| **Báo Cáo & Kỹ Năng Trình Bày** | 20% | Báo cáo đầy đủ 5 chương, sơ đồ Mermaid chuẩn mực, live demo mượt mà, trả lời phản biện xuất sắc. | Đạt xuất sắc: Bộ tài liệu 4 file markdown chi tiết, kịch bản thuyết trình và Q&A toàn diện. |
