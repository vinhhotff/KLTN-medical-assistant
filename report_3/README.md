# THƯ MỤC BÁO CÁO REPORT 3 – SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Đồ Án Tốt Nghiệp: MediAssist-AI (FPTU-KLTN-2026-MEDIASSIST)

---

### 📂 DANH MỤC TỆP TRONG THƯ MỤC `report_3/`

| Tên Tệp Tin | Định Dạng | Mô Tả Vai Trò & Hướng Dẫn Sử Dụng |
| :--- | :---: | :--- |
| **`REPORT_3_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md`** | Markdown | **Văn bản Báo cáo Khóa luận Chính thức (Report 3):** Chuẩn kép IEEE 830-1998 & ISO/IEC/IEEE 29148:2018 (2.394 dòng), bao gồm đặc tả kiến trúc vĩ mô 5 tầng, 5 biểu đồ ca sử dụng modular (100% tiếng Anh học thuật), 49 Use Cases chi tiết dạng bảng 2 cột với đầy đủ 17 trường thông tin chuẩn mực, đặc tả giao diện ngoại vi VNPay HMAC-SHA512 IPN idempotency, và 4 tầng rào chắn an ninh bảo mật y tế. |
| **`REPORT_3_EXECUTIVE_SUMMARY.md`** | Markdown | **Bản Tóm Tắt Quản Trị Dành Cho Hội Đồng (2 trang):** Trọng tâm quy mô 49 Use Cases, 5 biểu đồ ca sử dụng modular, đặc tả an toàn tài chính VNPay, phòng thủ BOLA/IDOR và kịch bản trả lời 5 câu hỏi phản biện then chốt của Thầy Cô về SRS. |
| **`index.html`** | HTML5 / JS | **Trình Xem Tương Tác & Xuất PDF Trực Quan (Interactive Viewer):** Tự động render biểu đồ Mermaid sắc nét, hỗ trợ responsive, thanh điều hướng sidebar mục lục và nút **Print / Save PDF** chuẩn in ấn A4. |
| **`README.md`** | Markdown | Tệp hướng dẫn tổng quan danh mục tài liệu (tệp này). |

---

### 🖥️ HƯỚNG DẪN MỞ & XUẤT REPORT 3 SANG FILE PDF

#### Cách 1: Xem trực quan và In ra PDF bằng Trình duyệt Web (Khuyên dùng)
1. Mở terminal và khởi chạy một web server cục bộ đơn giản:
   ```bash
   cd /Users/thanvinh/Desktop/KLTN/report_3
   python3 -m http.server 8080
   ```
2. Mở trình duyệt web truy cập: **`http://localhost:8080`**
3. Bấm vào nút **"Print / Save PDF"** ở góc trên bên phải (hoặc nhấn tổ hợp phím **`Cmd + P`** trên Mac / **`Ctrl + P`** trên Windows):
   - Đích đến (Destination): **Lưu dưới dạng PDF (Save as PDF)**.
   - Bố cục (Layout): **Dọc (Portrait)**.
   - Tỷ lệ (Scale): **Vừa vặn với trang (Fit to printable area)** hoặc 90-100%.
   - Đồ họa nền (Background graphics): **Bật (Check)** để giữ màu nền bảng và thẻ badge.

#### Cách 2: Đọc trực tiếp trên GitHub hoặc VS Code / Cursor
* Mở tệp `REPORT_3_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md` trực tiếp trong VS Code hoặc đẩy lên GitHub. GitHub và Cursor sẽ tự động render các biểu đồ Mermaid và bảng biểu chuẩn mực.

---

### 🔗 DANH MỤC TRUY VẾT LIÊN KẾT BỘ 5 BÁO CÁO CAPSTONE
* **Report 1:** `report_1/REPORT_1_PROJECT_CHARTER_AND_PLAN.md` (Project Charter & PMBOK Plan)
* **Report 2:** `report_2/REPORT_2_REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md` (ISO 29148 & DDD)
* **Report 3:** `report_3/REPORT_3_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md` (Tệp này - IEEE 830 - 49 Use Cases)
* **Report 4:** `docs/SDD_MediAssist_AI.md` (IEEE 1016 - 88 Mermaid Diagrams)
* **Report 5:** `docs/TEST_REPORT_MediAssist_AI.md` (IEEE 829 - 306/306 Passing Tests)
* **Slide Bảo Vệ:** `docs/CAPSTONE_PRESENTATION_SLIDES.md` (24 Slides)
* **Hỏi Đáp Hội Đồng:** `docs/CAPSTONE_DEFENSE.md` (Top 25 Q&A)
