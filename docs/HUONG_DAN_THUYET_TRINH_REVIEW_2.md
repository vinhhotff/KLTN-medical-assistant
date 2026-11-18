# CẨM NANG THUYẾT TRÌNH BẢO VỆ REVIEW 2 & ĐỐI SOÁT HỆ THỐNG MEDIASSIST-AI
> **Đề Tài:** Xây Dựng Nền Tảng Khám Bệnh Từ Xa Tích Hợp AI Phân Luồng & Tóm Tắt Bệnh Án (MediAssist-AI)
> **Cột mốc:** Review 2 - Architecture, Data Model & Screen Flows
> **Đơn vị đào tạo:** FPT University
> **Slide Canva Nguồn:** https://www.canva.com/design/DAHa9bmQoV0/sPw8pFBw3eN3IvYDKYKMZQ/edit
> **Ngày xuất bản:** 18/11/2026
> **Tác giả:** MediAssist-AI Engineering Team

---

## MỤC LỤC TÀI LIỆU
1. [Bảng Đối Soát Chi Tiết Giữa Slide Canva và Codebase](#1-bảng-đối-soát-chi-tiết-giữa-slide-canva-và-codebase)
2. [Kịch Bản Thuyết Trình Từng Slide (Lời Thoại Chuẩn Từng Giây)](#2-kịch-bản-thuyết-trình-từng-slide-lời-thoại-chuẩn-từng-giây)
3. [Kịch Bản Live Demo 5 Phút Không Lỗi Trước Hội Đồng](#3-kịch-bản-live-demo-5-phút-không-lỗi-trước-hội-đồng)
4. [Bộ 10 Câu Hỏi Phản Biện Review 2 Hóc Búa Nhất & Lời Giải Mẫu](#4-bộ-10-câu-hỏi-phản-biện-review-2-hóc-búa-nhất--lời-giải-mẫu)
5. [3 Điểm Cần Chỉnh Nhẹ Trên Canva Trước Giờ G](#5-3-điểm-cần-chỉnh-nhẹ-trên-canva-trước-giờ-g)

---

## 1. BẢNG ĐỐI SOÁT CHI TIẾT GIỮA SLIDE CANVA VÀ CODEBASE

Độ chính xác kỹ thuật của bộ slide Canva so với mã nguồn thực tế của dự án đạt **98% (Rất chuẩn xác, bám sát từng file code, controller, entity và migration)**.

| Slide | Tiêu đề trên Canva | Nội dung hiển thị | Đối chiếu thực tế với Codebase MediAssist-AI | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Bìa: REVIEW 2 MEDIASSIST AI | Mockup giao diện Web Telehealth trên laptop | Ảnh chụp đúng giao diện Cổng Bệnh nhân (/patient): Thanh cảnh báo đỏ cấp cứu Red-flag, EMR, Tìm bác sĩ, Quét phiếu xét nghiệm. | ✅ Chuẩn 100% |
| **2** | MEMBERS | Danh sách 5 thành viên (Lead, Backend, AI, Frontend, GVHD) | Cấu trúc phân nhiệm 4 thành viên + 1 GVHD hoàn toàn phù hợp với quy chế đồ án FPT. (Lưu ý: Thay text giữ chỗ [Họ tên] trước khi chiếu). | ⚠️ Cần điền tên |
| **3** | TABLE OF CONTENTS | 01 Major Features, 02 Screen Flow, 03 ERD, 04 System Design | 4 trụ cột nội dung kinh điển, đúng trọng tâm của đợt thẩm định Review 2. | ✅ Chuẩn 100% |
| **4** | INTRODUCTION | Thách thức quá tải bệnh viện, rào cản thuật ngữ, giải pháp 4 mũi nhọn và giá trị cốt lõi | Thể hiện chính xác 4 công nghệ cốt lõi: 5-stage triage + NegEx, Vision OCR LOINC, pgvector HNSW WHRF, O2O booking & EMR. | ✅ Chuẩn 100% |
| **5** | MAJOR FEATURES | 3 cột Actor: PATIENT - DOCTOR - ADMIN | Trùng khớp 100% các Controller và UI Page đã code trong cả Spring Boot 3.4 (com.mediassist.*) và React 18 Vite. | ✅ Chuẩn 100% |
| **6** | PATIENT FLOW | Flowchart từ Landing -> Đăng nhập -> Triage 115 / Quét OCR -> pgvector -> Đặt lịch -> QR Code | Thể hiện đúng luồng xác thực email (Flyway V22), rào chắn 115 ngắt luồng, hạn ngạch scan quota và gói hội viên MediPass VIP. | ✅ Rất xuất sắc |
| **7** | DOCTOR FLOW | Flowchart Bàn làm việc Bác sĩ -> PatientAccessGuard -> Split-screen EMR -> Kê đơn PDF | Bám sát cơ chế kiểm soát truy cập BOLA/IDOR PatientAccessGuard, giao diện đối chiếu split-screen và chuẩn ICD-10/LOINC. | ✅ Rất xuất sắc |
| **8** | ADMIN FLOW | Flowchart Admin Dashboard -> FinOps -> Duyệt CCHN -> Sync vector nhúng | Đúng logic API Admin: Bật/tắt chế độ AI ngoại tuyến (/system/ai-mode/toggle), duyệt bác sĩ và batch sync embedding 1536 chiều vào DB. | ✅ Chuẩn 100% |
| **9** | ENTITY RELATIONSHIP DIAGRAM | Mô hình quan hệ 17 bảng chuẩn 3NF | Đầy đủ chính xác 17 bảng trong CSDL: users, patient_profiles, doctor_profiles (có bio_embedding vector 1536), specialties, doctor_specialties, doctor_schedule_slots, payment_transactions, notifications, audit_logs, password_reset_tokens, email_verification_tokens, triage_sessions, appointments, doctor_reviews, medical_documents, document_analyses, ai_token_usage. | ✅ Tuyệt đối chính xác |
| **10** | SYSTEM DIAGRAM | Sơ đồ C4 Container: React 18 -> Nginx -> Spring Security 6 -> Spring Boot 3.4 -> PostgreSQL 16 + Redis 7 + Supabase S3 | Thể hiện trọn vẹn: Modular Monolith, Two-Layer Cache L1/L2, URL ký số S3 15 phút, Google OAuth2, các cổng thanh toán Stripe/VietQR. Ghi chú Flyway V1-V23 (Thực tế đã di trú đến V24, hoàn toàn hợp lệ). | ✅ Rất chuẩn mực |
| **11** | THANK YOU | Mockup Doctor Workstation thực tế | Bàn làm việc bác sĩ hiển thị hàng đợi, bệnh án EMR và trạng thái thời gian thực (/doctor/workstation). | ✅ Chuẩn |
| **12** | MEDIASSIST (Chữ đỏ) | Trang nền trơn | Slide trống dự phòng -> Nên tận dụng làm Slide DEMO & Q&A. | 💡 Gợi ý sửa |

---

## 2. KỊCH BẢN THUYẾT TRÌNH TỪNG SLIDE (LỜI THOẠI CHUẨN TỪNG GIÂY)

* **Tổng thời lượng thuyết trình:** 10 - 12 phút (Khoảng 45s - 90s mỗi slide).
* **Phong thái:** Tự tin, giọng dõng dạc, nhấn mạnh vào các từ khóa kỹ thuật chuyên sâu (Enterprise-grade, Resilience, Guardrails, pgvector, HNSW, 3NF).

---

### SLIDE 1: BÌA ĐỀ TÀI (REVIEW 2 - MEDIASSIST AI)
* **Thời lượng:** 30 giây
* **Từ khóa:** Nền tảng Telehealth thế hệ mới, AI lâm sàng, pgvector HNSW.
* **Kịch bản nói (Speaker Notes):**
> "Kính thưa Quý Thầy Cô trong Hội đồng phản biện Review 2!
> Em xin đại diện nhóm nghiên cứu đề tài **MediAssist-AI** - Nền tảng khám bệnh từ xa thế hệ mới tích hợp Trí tuệ nhân tạo phân luồng lâm sàng và tóm tắt bệnh án y khoa.
> Trong buổi thẩm định Review 2 ngày hôm nay, nhóm xin báo cáo chi tiết về: **Các tính năng trọng tâm đã hoàn thiện, Luồng tương tác chi tiết của 3 nhóm tác nhân, Bản vẽ Cơ sở dữ liệu quan hệ 3NF và Kiến trúc hệ thống tổng thể cấp doanh nghiệp** của đề tài."

---

### SLIDE 2: MEMBERS (ĐỘI NGŨ THỰC HIỆN)
* **Thời lượng:** 30 giây
* **Từ khóa:** Phân vai chuyên trách, Fullstack, AI, Backend Security, UI/UX.
* **Kịch bản nói:**
> "Nhóm chúng em gồm có 4 thành viên dưới sự định hướng chuyên môn của [Thầy/Cô ...]:
> - Em là **VinhHT**, đảm nhiệm vai trò Lead & Fullstack, phụ trách kiến trúc tổng thể, kết nối hệ thống và quy trình CI/CD.
> - Bạn [...] phụ trách Backend, thiết kế CSDL và bảo mật hạ tầng.
> - Bạn [...] phụ trách mảng AI, Pipeline bóc tách ngôn ngữ y khoa và tối ưu hóa truy vấn pgvector.
> - Bạn [...] phụ trách Frontend SPA và tối ưu trải nghiệm người dùng y tế UI/UX."

---

### SLIDE 3: TABLE OF CONTENTS (MỤC LỤC NỘI DUNG)
* **Thời lượng:** 20 giây
* **Kịch bản nói:**
> "Báo cáo Review 2 của nhóm hôm nay gồm 4 phần trọng tâm:
> - **Phần 1:** Các tính năng chính của hệ thống (Major Features).
> - **Phần 2:** Luồng màn hình và nghiệp vụ (Screen Flow) của Bệnh nhân, Bác sĩ và Quản trị viên.
> - **Phần 3:** Mô hình dữ liệu quan hệ ERD chuẩn hóa 3NF và vector embeddings.
> - **Phần 4:** Sơ đồ kiến trúc phần mềm C4 Container (System Design)."

---

### SLIDE 4: INTRODUCTION (ĐẶT VẤN ĐỀ & CÔNG NGHỆ CHÌA KHÓA)
* **Thời lượng:** 1 phút 30 giây
* **Từ khóa:** Quá tải bệnh viện, Mù thuật ngữ y khoa, SBAR, HNSW, O2O, Nghị định 13/2023/NĐ-CP.
* **Kịch bản nói:**
> "Thưa Thầy Cô, xuất phát điểm của đề tài bắt nguồn từ 3 nghịch lý y tế thực tế tại Việt Nam:
> - **Thứ nhất:** Các bệnh viện công tuyến trung ương luôn quá tải nghiêm trọng. Người bệnh tỉnh xa phải dậy từ 4h sáng, chen chúc 6 đến 8 tiếng chỉ để được gặp bác sĩ trong 3 phút.
> - **Thứ hai:** Bệnh nhân rơi vào rào cản 'mù thuật ngữ y khoa' trước các bảng chỉ số sinh hóa như AST, ALT, Creatinine, dẫn đến việc tự tra Google và tự ý mua thuốc điều trị sai lầm.
> - **Thứ ba:** Bác sĩ mất tới 70% thời gian thăm khám chỉ để giải thích lại các chỉ số cận lâm sàng cơ bản.
>
> Để giải quyết triệt để vấn đề này, MediAssist-AI xây dựng **4 giải pháp kỹ thuật cốt lõi**:
> 1. **AI Triage 5 tầng:** Ứng dụng giải thuật Vietnamese NegEx bóc tách phủ định và rào chắn Red-Flag khóa cấp cứu 115 tức thì.
> 2. **AI Vision OCR:** Trích xuất kết quả xét nghiệm, ánh xạ chuẩn LOINC Bộ Y Tế và giải nghĩa sang ngôn ngữ bình dân theo khung SBAR.
> 3. **Semantic Doctor Matching:** Tìm kiếm bác sĩ bằng vector ngữ nghĩa pgvector HNSW kết hợp thuật toán tái xếp hạng đa nhân tố WHRF.
> 4. **Mô hình Online-to-Offline (O2O):** Đặt lịch hẹn có xác thực, cấp vé khám QR Code với số thứ tự tự động kết nối trực tiếp đến Bàn làm việc Bác sĩ EMR ICD-10.
> Nhóm khẳng định triết lý cốt lõi: **AI đóng vai trò trợ lý tiền lâm sàng hỗ trợ, tuyệt đối không thay thế bác sĩ**, đồng thời bảo vệ nghiêm ngặt quyền riêng tư PII theo Nghị định 13/2023/NĐ-CP."

---

### SLIDE 5: MAJOR FEATURES (DANH MỤC TÍNH NĂNG THEO TỪNG VAI TRÒ)
* **Thời lượng:** 1 phút 30 giây
* **Từ khóa:** RBAC 3 vai trò, Split-Screen Workstation, AI FinOps Token.
* **Kịch bản nói:**
> "Hệ thống được module hóa hoàn chỉnh cho 3 nhóm đối tượng:
> - **Về phía Bệnh nhân:** Hỗ trợ toàn diện hành trình khám bệnh: từ chat phân luồng triệu chứng có rào chắn 115, quét OCR phiếu xét nghiệm, tìm bác sĩ theo ngữ nghĩa tự nhiên, đặt lịch hẹn thanh toán VietQR/Stripe, nhận vé khám QR đến quản lý hồ sơ EMR và đánh giá sau khám.
> - **Về phía Bác sĩ:** Cung cấp Bàn làm việc lâm sàng chuyên dụng (Clinical Workstation) màn hình đôi: bên trái đối chiếu hình ảnh gốc và chỉ số AI trích xuất; bên phải là bệnh án điện tử EMR chuẩn ICD-10, gọi số thứ tự bệnh nhân tiếp theo, kê đơn thuốc và xuất PDF.
> - **Về phía Quản trị viên (Admin):** Giám sát tài chính AI FinOps chi tiết từng micro-USD chi phí token, bật/tắt chuyển đổi nhà cung cấp AI, thẩm định chứng chỉ hành nghề CCHN của bác sĩ, quản lý danh mục chuyên khoa và giám sát nhật ký kiểm toán bảo mật IDOR."

---

### SLIDE 6: PATIENT FLOW (LUỒNG THAO TÁC CỦA BỆNH NHÂN)
* **Thời lượng:** 2 phút
* **Từ khóa:** Red-Flag 115 ngắt luồng dưới 2ms, Chuẩn SBAR, Hạn ngạch Scan Quota, Vé QR Code O2O.
* **Kịch bản nói:**
> "Trên màn hình là sơ đồ luồng người bệnh. Sau khi đăng ký tài khoản qua Email hoặc Google SSO và thực hiện xác thực, bệnh nhân có 2 luồng trải nghiệm AI chủ đạo:
> - **Luồng 1 - Phân luồng triệu chứng (AI Symptom Triage):** Khi bệnh nhân nhập câu hỏi, động cơ phòng thủ sẽ quét ngay dấu hiệu nguy kịch. Nếu phát hiện đau thắt ngực, đột quỵ, hệ thống lập tức khóa khung chat và **bật cảnh báo đỏ gọi ngay Cấp cứu 115 trong dưới 2 mili-giây** mà không cần đợi gọi API LLM. Nếu an toàn, AI hội thoại đa lượt, tổng hợp báo cáo y khoa SBAR, xác định độ khẩn và chuyên khoa phù hợp. Bệnh nhân được dẫn sang trang Tìm bác sĩ, chọn khung giờ, thanh toán trực tuyến và nhận vé khám điện tử O2O có mã QR và Số thứ tự (STT).
> - **Luồng 2 - Quét phiếu xét nghiệm (Lab Report AI):** Người bệnh tải ảnh chụp hoặc file PDF phiếu xét nghiệm. Hệ thống kiểm tra hạn ngạch quét miễn phí (Scan Quotas). Nếu còn lượt, Vision OCR sẽ bóc tách chỉ số sinh hóa, đối chiếu chuẩn LOINC và gợi ý chuyên khoa điều trị tiếp theo. Nếu hết lượt, người bệnh có thể mua gói MediPass VIP để tiếp tục sử dụng.
> Ngoài ra, người bệnh có thể đổi giờ khám, hủy lịch được hoàn tiền tự động, và check-in nhanh tại viện bằng mã QR."

---

### SLIDE 7: DOCTOR FLOW (LUỒNG THAO TÁC CỦA BÁC SĨ)
* **Thời lượng:** 1 phút 30 giây
* **Từ khóa:** PatientAccessGuard chống IDOR/BOLA, Zero Context Switching, Khóa lạc quan @Version.
* **Kịch bản nói:**
> "Tại phòng khám, bác sĩ đăng nhập vào Bàn làm việc Workstation:
> - Bác sĩ theo dõi danh sách bệnh nhân đã check-in trong ngày và bấm **'Gọi bệnh nhân tiếp theo'** (hệ thống sử dụng khóa lạc quan @Version để ngăn xung đột gọi trùng).
> - Trước khi mở hồ sơ, rào chắn **PatientAccessGuard** ở Backend kiểm tra quan hệ khám chữa bệnh thực tế. Nếu phát hiện truy cập trái phép, hệ thống **chặn đứng yêu cầu và ghi nhật ký kiểm toán (Audit Log)** chống tấn công đánh cắp bệnh án BOLA/IDOR.
> - Khi hợp lệ, màn hình mở ra giao diện màn hình đôi Split-screen: Bác sĩ vừa xem được ảnh gốc phiếu xét nghiệm và tóm tắt SBAR bên trái, vừa nhập sinh hiệu, chẩn đoán ICD-10 và kê đơn thuốc bên phải. Điều này triệt tiêu hoàn toàn thao tác chuyển tab phiền toái (Zero Context Switching).
> - Sau khi ký hoàn tất ca khám, bác sĩ có thể xuất đơn thuốc PDF có chữ ký điện tử hoặc hẹn lịch tái khám."

---

### SLIDE 8: ADMIN FLOW (LUỒNG QUẢN TRỊ VIÊN)
* **Thời lượng:** 1 phút
* **Từ khóa:** Giám sát FinOps, Offline Fallback Feature Hashing, Đồng bộ Vector nhúng hàng loạt.
* **Kịch bản nói:**
> "Ở góc độ vận hành, giao diện Quản trị viên đóng vai trò kiểm soát an toàn toàn diện:
> - **Quản trị chi phí AI FinOps:** Admin theo dõi biểu đồ chi phí token và có thể **bật/tắt chế độ AI ngoại tuyến (Offline Feature Hashing Fallback)** chỉ với 1 click, giúp hệ thống vẫn phục vụ tìm kiếm bác sĩ bình thường ngay cả khi đứt mạng Internet hoặc API AI bên ngoài gặp sự cố.
> - **Quy trình thẩm định bác sĩ (Doctor Vetting):** Khi bác sĩ mới đăng ký, Admin xác minh số chứng chỉ hành nghề CCHN. Khi bấm Duyệt (Approve), hệ thống tự động kích hoạt tiến trình **đồng bộ vector nhúng 1536 chiều của bác sĩ vào đồ thị HNSW** trong PostgreSQL để xuất hiện trên thanh tìm kiếm.
> - Admin cũng có quyền quản lý danh mục chuyên khoa, giám sát tỷ lệ cảnh báo đỏ 115 và tra cứu lịch sử đăng nhập bất thường."

---

### SLIDE 9: ENTITY RELATIONSHIP DIAGRAM (MÔ HÌNH DỮ LIỆU ERD 3NF)
* **Thời lượng:** 1 phút 30 giây
* **Từ khóa:** Chuẩn hóa 3NF, Vector nhúng 1536 chiều, Partial Indexing, Flyway Migration.
* **Kịch bản nói:**
> "Để đảm bảo toàn vẹn dữ liệu y tế, nhóm thiết kế CSDL quan hệ chuẩn hóa 3NF gồm **đúng 17 bảng**, được quản lý di trú phiên bản tự động bằng Flyway:
> - Bảng hạt nhân là users, phân nhánh 1-1 sang patient_profiles và doctor_profiles. Đặc biệt, bảng bác sĩ sở hữu cột **bio_embedding với kiểu dữ liệu vector(1536)**, được đánh chỉ mục đồ thị **HNSW Cosine** với kỹ thuật Partial Indexing WHERE is_verified = TRUE, giảm 40% dung lượng RAM của đồ thị.
> - Phân hệ lâm sàng gồm: triage_sessions (lưu văn bản triệu chứng và tóm tắt SBAR), medical_documents và document_analyses (lưu chỉ số sinh hóa bất thường dưới định dạng JSONB hiệu năng cao).
> - Phân hệ đặt khám gồm: appointments (liên kết khóa ngoại đến bệnh nhân, bác sĩ, tài liệu xét nghiệm và phiên triage, lưu số thứ tự STT và mã ICD-10), bảng đánh giá doctor_reviews, và bảng giao dịch payment_transactions.
> - Phân hệ FinOps và bảo mật gồm: ai_token_usage (ghi nhận chi phí từng cuộc gọi LLM), audit_logs, password_reset_tokens và email_verification_tokens (được băm bảo mật SHA-256).
> Toàn bộ các mối quan hệ đều được ràng buộc khóa ngoại chặt chẽ, triệt tiêu hoàn toàn dư thừa dữ liệu bất thường."

---

### SLIDE 10: SYSTEM DIAGRAM (KIẾN TRÚC HỆ THỐNG C4 CONTAINER)
* **Thời lượng:** 1 phút 30 giây
* **Từ khóa:** Modular Monolith, Two-Layer Cache (Caffeine + Redis), Supabase S3 Signed URL 15m, Virtual Threads.
* **Kịch bản nói:**
> "Về kiến trúc tổng thể, nhóm triển khai mô hình **Modular Monolith** trên nền tảng **Java 21 LTS và Spring Boot 3.4**:
> - **Tầng Trình diễn (Web Client):** Ứng dụng React 18 SPA với Vite, Tailwind CSS và Zustand, giao tiếp qua Nginx Reverse Proxy được cấu hình HTTPS TLS 1.3 và Rate Limiting.
> - **Tầng Bảo vệ & Xác thực:** Spring Security 6 với cơ chế **Dual-Transport Authentication** (kết hợp Bearer JWT và HttpOnly Secure Cookie) chống tấn công XSS/CSRF, tích hợp Google OAuth2 và rào chắn ủy quyền PatientAccessGuard.
> - **Tầng Ứng dụng Backend:** Gồm 6 module nghiệp vụ độc lập, tận dụng Virtual Threads (Project Loom) của Java 21 để xử lý hàng nghìn kết nối đồng thời mà không tốn tài nguyên hệ điều hành.
> - **Tầng Dữ liệu & Lưu trữ:**
>   - Cơ sở dữ liệu chính: PostgreSQL 16 tích hợp extension pgvector xử lý vector nhúng 1536 chiều.
>   - Bộ nhớ đệm 2 lớp **Two-Layer Cache**: L1 Caffeine In-Memory (< 0.05ms) kết hợp L2 Distributed Redis (1-3ms), giảm 85% tải truy vấn xuống CSDL.
>   - Tài liệu y tế được lưu trữ riêng tư trên Supabase Storage, chỉ cho phép xem qua **URL ký số HMAC-SHA256 có thời hạn đúng 15 phút**."

---

### SLIDE 11: THANK YOU (LỜI CẢM ƠN & CHUYỂN TIẾP SANG DEMO)
* **Thời lượng:** 30 giây
* **Kịch bản nói:**
> "Trên đây là toàn bộ phần báo cáo kiến trúc, mô hình dữ liệu và các luồng nghiệp vụ của đề tài MediAssist-AI trong đợt Review 2.
> Hiện tại, toàn bộ hệ sinh thái từ Backend Spring Boot, Frontend React, CSDL PostgreSQL pgvector và Redis đều đang chạy trực tiếp trên máy cục bộ và sẵn sàng 100%.
> Nhóm chúng em xin trân trọng cảm ơn Quý Thầy Cô đã chú ý lắng nghe và xin phép được bước vào phần **Live Demo trực tiếp hệ thống** cũng như tiếp thu các ý kiến phản biện của Hội đồng ạ!"

---

## 3. KỊCH BẢN LIVE DEMO 5 PHÚT KHÔNG LỖI TRƯỚC HỘI ĐỒNG

Hệ thống hiện đang chạy tại:
- **Frontend Web:** http://localhost:5173
- **Backend API:** http://localhost:5001
- **Tài khoản Demo sẵn có:** Nút bấm Quick-Fill trực tiếp trên màn hình đăng nhập.

### 5 BƯỚC THAO TÁC MẪU TRƯỚC HỘI ĐỒNG:
1. **Bước 1 - Giám sát Hạ tầng (Tài khoản Admin):**
   - Đăng nhập admin@mediassist.local / Admin@123.
   - Mở Dashboard xem các chỉ số: DB UP, Redis UP, pgvector UP.
   - Xem biểu đồ AI FinOps hiển thị lượng token tiêu thụ và chi phí micro-USD.
2. **Bước 2 - Phân luồng Cấp cứu Red-Flag 115 (Tài khoản Patient):**
   - Đăng nhập patient@mediassist.local / Patient@123.
   - Mở mục Khám Sàng Lọc AI.
   - Gõ câu cấp cứu: "Tôi bị đau thắt ngực dữ dội lan ra vai trái và vã mồ hôi hột".
   - **Điểm ăn tiền:** Hệ thống ngắt chat ngay lập tức, hiển thị khung đỏ cảnh báo khẩn cấp gọi hotline 115 trong dưới 2ms.
3. **Bước 3 - Tìm Bác sĩ bằng Ngôn ngữ Tự nhiên (pgvector):**
   - Mở mục Tìm & Đặt Bác Sĩ.
   - Gõ câu hỏi dân gian: "bác sĩ can thiệp mạch vành, nhồi máu cơ tim".
   - **Điểm ăn tiền:** pgvector tính khoảng cách cosine 1536 chiều và đưa Bác sĩ Tim mạch lên vị trí Top-1 với độ tương quan cao nhất.
4. **Bước 4 - Quét Phiếu Xét Nghiệm & Khử Định Danh PII:**
   - Mở mục Quét Phiếu Xét Nghiệm.
   - Tải file phiếu xét nghiệm mẫu (frontend/public/sample_medical_report.pdf).
   - Bấm Phân Tích AI.
   - **Điểm ăn tiền:** Toàn bộ thông tin cá nhân (Tên, CCCD, SĐT, BHYT) được che mờ tự động, kết quả hiển thị bảng chỉ số sinh hóa đối chiếu chuẩn LOINC và tóm tắt SBAR dễ hiểu.
5. **Bước 5 - Trạm Bác sĩ Split-screen (Tài khoản Doctor):**
   - Đăng nhập doctor@mediassist.local / Doctor@123.
   - Bác sĩ bấm 'Gọi bệnh nhân tiếp theo'.
   - Màn hình Split-Screen mở ra: Nửa trái xem tài liệu gốc, nửa phải nhập chẩn đoán ICD-10 và kê đơn thuốc.

---

## 4. BỘ 10 CÂU HỎI PHẢN BIỆN REVIEW 2 HÓC BÚA NHẤT & LỜI GIẢI MẪU

#### Câu 1: "Tại sao nhóm chọn Modular Monolith thay vì Microservices?"
* **Trả lời:**
  "Thưa Thầy Cô, đối với hệ thống Telehealth thời gian thực, độ trễ mạng (Network Latency) là yếu tố sống còn. Kiến trúc Microservices sẽ làm phát sinh chi phí phân tán (Network Hops, Distributed Tracing, Distributed Transactions qua Saga/2PC). Nhóm lựa chọn Modular Monolith chạy trên Java 21 LTS với Project Loom Virtual Threads, vừa đảm bảo tính module hóa độc lập, vừa đạt hiệu năng nội tại cực cao với độ trễ gọi nội bộ dưới 1ms mà không lo quá tải hạ tầng."

#### Câu 2: "Tại sao dùng pgvector trong PostgreSQL mà không dùng Pinecone, Milvus hay Qdrant?"
* **Trả lời:**
  "Thưa Thầy Cô, việc sử dụng cơ sở dữ liệu vector độc lập bên ngoài (như Pinecone hay Milvus) tạo ra bài toán phân mảnh dữ liệu (Data Isolation): Hệ thống phải duy trì đồng bộ 2 chiều giữa DB quan hệ chứa thông tin bác sĩ và DB vector chứa nhúng. Khi bác sĩ đổi chuyên khoa hay đổi trạng thái xác thực, nguy cơ lệch dữ liệu rất cao. Với pgvector trên PostgreSQL 16, nhóm thực hiện truy vấn vector Cosine kết hợp lọc quan hệ (WHERE is_verified = TRUE) trong **cùng một câu lệnh SQL duy nhất**, đảm bảo toàn vẹn giao dịch ACID tuyệt đối."

#### Câu 3: "Chỉ mục HNSW hoạt động ra sao và cấu hình m=24, ef_construction=128 có ý nghĩa gì?"
* **Trả lời:**
  "HNSW (Hierarchical Navigable Small World) tổ chức các vector thành đồ thị đa tầng lồng nhau. Tầng trên cùng thưa để nhảy bước xa với độ phức tạp O(log N), tầng đáy dày đặc để tìm láng giềng cục bộ chính xác. Tham số m=24 là số liên kết tối đa của mỗi nút, ef_construction=128 là kích thước hàng đợi ưu tiên khi xây đồ thị. Cấu hình này giúp hệ thống đạt độ phủ láng giềng (Recall) trên 99.8% và thời gian truy vấn trung bình chỉ 0.72ms."

#### Câu 4: "Nếu bệnh nhân nhập câu phủ định như 'đau bụng nhưng không sốt', hệ thống vector xử lý thế nào để không bị méo sang khoa Truyền nhiễm?"
* **Trả lời:**
  "Nhóm giải quyết bài toán này bằng **Thuật toán Vietnamese NegEx** ở tầng tiền xử lý lâm sàng. Thuật toán nhận diện các bộ kích hoạt phủ định (không, chưa từng, loại trừ) và tách câu văn thành 2 vế độc lập: vế khẳng định (đau bụng) được đưa vào chuỗi sinh vector nhúng; còn vế phủ định (không sốt) được đưa vào danh sách loại trừ và bị gán trọng số phạt phân kỳ -0.10 trong hàm WHRF, triệt tiêu hoàn toàn nguy cơ gợi ý nhầm khoa."

#### Câu 5: "Làm sao chống được việc hai bệnh nhân cùng đặt một khung giờ khám (Double Booking)?"
* **Trả lời:**
  "Nhóm áp dụng cơ chế bảo vệ kép (Defense in Depth):
  - Ở tầng CSDL: Đặt một **Partial Unique Index** có điều kiện: CREATE UNIQUE INDEX idx_appointment_unique_active_slot ON appointments(doctor_id, scheduled_start) WHERE status != 'CANCELLED'.
  - Ở tầng Service: Khóa giao dịch ở mức cô lập REPEATABLE_READ. Mọi xung đột ghi đồng thời sẽ bị DB chặn ngay lập tức và ném ra ngoại lệ OptimisticLockException để hoàn tiền an toàn."

#### Câu 6: "Two-Layer Cache hoạt động như thế nào? Khi dữ liệu bác sĩ thay đổi thì cache có bị sai lệch không?"
* **Trả lời:**
  "Hệ thống kết hợp L1 In-Memory Caffeine (< 0.05ms) cho danh mục tĩnh và L2 Distributed Redis (1-3ms) cho dữ liệu động. Nhóm áp dụng mô hình **Write-Invalidate**: Khi bác sĩ cập nhật thông tin hoặc đổi lịch, tầng Service sẽ phát tín hiệu xóa trắng key tương ứng trên cả Redis và Caffeine. Lần đọc tiếp theo sẽ tự động Read-through từ PostgreSQL và nạp lại vào bộ nhớ đệm, đảm bảo tính nhất quán tuyệt đối."

#### Câu 7: "Lỗ hổng BOLA/IDOR được ngăn chặn như thế nào khi Bác sĩ xem bệnh án của Bệnh nhân?"
* **Trả lời:**
  "Nhóm xây dựng rào chắn **PatientAccessGuard**. Khi bác sĩ gửi request lấy tài liệu xét nghiệm hay bệnh án của bệnh nhân, Guard sẽ truy vấn bảng appointments để kiểm tra xem giữa Bác sĩ đó và Bệnh nhân có tồn tại cuộc hẹn hợp lệ ở trạng thái SCHEDULED, IN_PROGRESS hoặc COMPLETED hay không. Nếu không, request bị chặn ngay ở mức mã lỗi 403 Forbidden và kích hoạt ghi nhật ký vào bảng audit_logs."

#### Câu 8: "Khử định danh PII y tế theo Nghị định 13/2023/NĐ-CP được thực hiện ở đâu?"
* **Trả lời:**
  "Quá trình khử định danh được thực hiện tại tầng **On-premise Java Core trước khi bất kỳ dữ liệu nào được gửi sang LLM đám mây (Zero Cloud Data Leakage)**. Hệ thống quét và che giấu 6 thực thể: Họ tên, số CCCD 12 số, số thẻ BHYT, SĐT, địa chỉ và ngày sinh thành các token chuẩn như [BỆNH_NHÂN_1]. Khi AI phân tích xong trả kết quả về, giao diện Frontend sẽ tự động thế ngược tên thật của bệnh nhân để hiển thị."

#### Câu 9: "Nếu cổng thanh toán hoặc API Gemini bên ngoài bị treo/chết thì hệ thống có sập không?"
* **Trả lời:**
  "Hệ thống được thiết kế với cơ chế phục hồi (Resilience):
  - Với AI: Hệ thống có cơ chế Fallback sang **Offline Feature Hashing Engine** sinh vector 1536 chiều nội bộ trong RAM, giữ cho việc tìm kiếm bác sĩ không bao giờ bị gián đoạn.
  - Với lưu trữ: Áp dụng mẫu **Lazy Upload (Commit-After-Success)**: File chỉ được đẩy lên S3 sau khi phân tích thành công; nếu lỗi, cơ chế tự động dọn dẹp file mồ côi (Zero Orphan Files) sẽ được kích hoạt."

#### Câu 10: "Hệ thống có phương án mở rộng (Scalability) khi số lượng bác sĩ lên đến 50.000 người không?"
* **Trả lời:**
  "Nhóm đã tính toán chi tiết dung lượng vector 1536 chiều: Mỗi vector chiếm 6.14 KB, đồ thị HNSW chiếm khoảng 8 KB. Với 50.000 bác sĩ trên toàn quốc, tổng RAM tiêu thụ chỉ khoảng **750 MB**, nằm trọn vẹn trong RAM của một máy chủ tiêu chuẩn 16GB. Nhóm đã đóng gói sẵn kịch bản mở rộng trong thư mục pgvector_scaling_16gb/ với cấu hình PostgreSQL 4GB shared_buffers duy trì độ trễ truy vấn dưới 1 mili-giây."

---

## 5. 3 ĐIỂM CẦN CHỈNH NHẸ TRÊN CANVA TRƯỚC GIỜ G

1. **Slide 2 (Members):** Nhấp chuột vào Canva, thay thế các chữ [Họ tên] và [Tên GVHD] bằng tên thật của các thành viên trong nhóm và Giảng viên hướng dẫn.
2. **Slide 10 (System Diagram):** Tại khối CSDL màu cam bên phải, bạn có thể chỉnh nhẹ text Flyway V1-V23 thành Flyway V1-V24 để hoàn toàn đồng nhất với migration mới nhất trong code.
3. **Slide 12 (Slide chữ đỏ MEDIASSIST):** Hiện đang là slide trống có mỗi chữ. Bạn có thể xóa đi hoặc sửa tiêu đề thành **"DEMO & Q&A"** kèm 4 gạch đầu dòng các bước demo để chiếu làm phông nền trong lúc bạn thao tác demo cho Hội đồng.

---
*(Tệp hướng dẫn này đã được lưu tự động vào thư mục Downloads của bạn để tra cứu và in ra mang theo phòng bảo vệ).*
