# THƯ MỤC BÁO CÁO REPORT 5 – SOFTWARE TEST DOCUMENTATION & VERIFICATION (STR)
## Đồ Án Tốt Nghiệp: MediAssist-AI (FPTU-KLTN-2026-MEDIASSIST)

---

### 📂 DANH MỤC TỆP TRONG THƯ MỤC `report_5/`

| Tên Tệp Tin | Định Dạng | Mô Tả Vai Trò & Hướng Dẫn Sử Dụng |
| :--- | :---: | :--- |
| **`REPORT_5_TEST_REPORT_AND_VERIFICATION.md`** | Markdown | **Văn bản Báo cáo Khóa luận Chính thức (Report 5):** Chuẩn kép IEEE Std 829-2008 & ISO/IEC/IEEE 29119, bao gồm chiến lược kim tự tháp kiểm thử 4 tầng, chi tiết 306 bài test tự động qua 37 Test Classes, kiểm thử tải cao k6 (500 VUs - 0% lỗi), thực nghiệm benchmark đồ thị HNSW trên 150.000 ca bệnh Meddies, ma trận kiểm thử thâm nhập bảo mật OWASP BOLA/IDOR và nhật ký khiếm khuyết Defect Log BE-1 – BE-16 đã giải quyết 100%. |
| **`REPORT_5_EXECUTIVE_SUMMARY.md`** | Markdown | **Bản Tóm Tắt Quản Trị Dành Cho Hội Đồng (2 trang):** Bảng số liệu đo đạc thực nghiệm đanh thép (306 tests, k6 500 VUs, Meddies 150k HNSW Top-1 23.2%), phân bổ 306 bài test trên 8 miền lâm sàng và kịch bản trả lời 5 câu hỏi phản biện then chốt của Thầy Cô về kiểm thử. |
| **`index.html`** | HTML5 / JS | **Trình Xem Tương Tác & Xuất PDF Trực Quan (Interactive Viewer):** Tự động render biểu đồ Mermaid sắc nét, hỗ trợ responsive, thanh điều hướng sidebar mục lục và nút **Print / Save PDF** chuẩn in ấn A4. |
| **`README.md`** | Markdown | Tệp hướng dẫn tổng quan danh mục tài liệu (tệp này). |

---

### 🖥️ HƯỚNG DẪN MỞ & XUẤT REPORT 5 SANG FILE PDF

#### Cách 1: Xem trực quan và In ra PDF bằng Trình duyệt Web (Khuyên dùng)
1. Mở terminal và khởi chạy một web server cục bộ đơn giản:
   ```bash
   cd /Users/thanvinh/Desktop/KLTN/report_5
   python3 -m http.server 8080
   ```
2. Mở trình duyệt web truy cập: **`http://localhost:8080`**
3. Bấm vào nút **"Print / Save PDF"** ở góc trên bên phải (hoặc nhấn tổ hợp phím **`Cmd + P`** trên Mac / **`Ctrl + P`** trên Windows):
   - Đích đến (Destination): **Lưu dưới dạng PDF (Save as PDF)**.
   - Bố cục (Layout): **Dọc (Portrait)**.
   - Tỷ lệ (Scale): **Vừa vặn với trang (Fit to printable area)** hoặc 90-100%.
   - Đồ họa nền (Background graphics): **Bật (Check)** để giữ màu nền bảng và thẻ badge.

#### Cách 2: Đọc trực tiếp trên GitHub hoặc VS Code / Cursor
* Mở tệp `REPORT_5_TEST_REPORT_AND_VERIFICATION.md` trực tiếp trong VS Code hoặc đẩy lên GitHub. GitHub và Cursor sẽ tự động render các biểu đồ Mermaid và bảng biểu chuẩn mực.

---

### 🔗 DANH MỤC TRUY VẾT LIÊN KẾT BỘ 5 BÁO CÁO CAPSTONE
* **Report 1:** `report_1/REPORT_1_PROJECT_CHARTER_AND_PLAN.md` (Project Charter & PMBOK Plan)
* **Report 2:** `report_2/REPORT_2_REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md` (ISO 29148 & DDD)
* **Report 3:** `report_3/REPORT_3_SRS_SOFTWARE_REQUIREMENTS_SPECIFICATION.md` (IEEE 830 - 49 Use Cases)
* **Report 4:** `report_4/REPORT_4_SDD_SOFTWARE_DESIGN_DOCUMENT.md` (IEEE 1016 - 88 Diagrams)
* **Report 5:** `report_5/REPORT_5_TEST_REPORT_AND_VERIFICATION.md` (Tệp này - IEEE 829 - 306 Tests)
* **Slide Bảo Vệ:** `docs/CAPSTONE_PRESENTATION_SLIDES.md` (24 Slides)
* **Hỏi Đáp Hội Đồng:** `docs/CAPSTONE_DEFENSE.md` (Top 25 Q&A)
