# THƯ MỤC BÁO CÁO REPORT 1 – PROJECT CHARTER & MANAGEMENT PLAN
## Đồ Án Tốt Nghiệp: MediAssist-AI (FPTU-KLTN-2026-MEDIASSIST)

---

### 📂 DANH MỤC TỆP TRONG THƯ MỤC `report_1/`

| Tên Tệp Tin | Định Dạng | Mô Tả Vai Trò & Hướng Dẫn Sử Dụng |
| :--- | :---: | :--- |
| **`REPORT_1_PROJECT_CHARTER_AND_PLAN.md`** | Markdown | **Văn bản Báo cáo Khóa luận Chính thức (Report 1):** Bao gồm đầy đủ 5 chương chuẩn PMBOK 7th & IEEE 1058, 6 bảng ma trận và 6 biểu đồ Mermaid. |
| **`REPORT_1_EXECUTIVE_SUMMARY.md`** | Markdown | **Bản Tóm Tắt Quản Trị Dành Cho Hội Đồng (2 trang):** Trọng tâm bài toán, 3 điểm chạm cốt lõi, bảng số liệu thực nghiệm và kịch bản trả lời 5 câu hỏi phản biện then chốt. |
| **`REPORT_1_RISK_AND_FINOPS_AUDIT.md`** | Markdown | **Báo Cáo Quản Trị Rủi Ro & Kiểm Toán AI FinOps:** Bảng phân bổ ngân sách $120/tháng, công thức toán học tính chi phí token micro-USD và giải pháp phòng vệ khẩn cấp. |
| **`index.html`** | HTML5 / JS | **Trình Xem Tương Tác Trực Quan (Interactive Viewer):** Mở trực tiếp trên trình duyệt Chrome/Edge/Safari, tự động render biểu đồ Mermaid sắc nét, hỗ trợ in PDF chuẩn A4 qua phím tắt `Cmd + P` hoặc nút **Print / Save PDF**. |
| **`README.md`** | Markdown | Tệp hướng dẫn tổng quan danh mục tài liệu (tệp này). |

---

### 🚀 HƯỚNG DẪN MỞ & XUẤT TÀI LIỆU SANG PDF

#### Cách 1: Xem trực quan và In ra PDF bằng Trình duyệt Web (Đẹp nhất, Nhanh nhất)
1. Mở terminal và khởi chạy một web server cục bộ đơn giản:
   ```bash
   cd /Users/thanvinh/Desktop/KLTN/report_1
   python3 -m http.server 8080
   ```
2. Mở trình duyệt web truy cập: **`http://localhost:8080`**
3. Bấm vào nút **"Print / Save PDF"** ở góc trên bên phải (hoặc nhấn tổ hợp phím **`Cmd + P`** trên Mac / **`Ctrl + P`** trên Windows):
   - Đích đến (Destination): **Lưu dưới dạng PDF (Save as PDF)**.
   - Bố cục (Layout): **Dọc (Portrait)**.
   - Tỷ lệ (Scale): **Vừa vặn với trang (Fit to printable area)** hoặc 90-100%.
   - Đồ họa nền (Background graphics): **Bật (Check)** để giữ màu nền bảng và thẻ badge.

#### Cách 2: Đọc trực tiếp trên GitHub hoặc VS Code / Cursor
* Mở tệp `REPORT_1_PROJECT_CHARTER_AND_PLAN.md` trực tiếp trong VS Code hoặc đẩy lên GitHub. GitHub và Cursor sẽ tự động render các biểu đồ Mermaid và bảng biểu chuẩn mực.

---

### 🔗 DANH MỤC TRUY VẾT LIÊN KẾT BỘ 5 BÁO CÁO CAPSTONE
* **Report 1:** `report_1/REPORT_1_PROJECT_CHARTER_AND_PLAN.md` (Tệp này)
* **Report 2:** `docs/REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md` (ISO 29148 & DDD)
* **Report 3:** `docs/SRS_MediAssist_AI.md` (IEEE 830 - 49 Use Cases)
* **Report 4:** `docs/SDD_MediAssist_AI.md` (IEEE 1016 - 88 Mermaid Diagrams)
* **Report 5:** `docs/TEST_REPORT_MediAssist_AI.md` (IEEE 829 - 306/306 Passing Tests)
* **Slide Bảo Vệ:** `docs/CAPSTONE_PRESENTATION_SLIDES.md` (24 Slides)
* **Hỏi Đáp Hội Đồng:** `docs/CAPSTONE_DEFENSE.md` (Top 25 Q&A)
