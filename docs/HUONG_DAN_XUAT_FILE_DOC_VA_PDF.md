# CẨM NANG HƯỚNG DẪN XUẤT TÀI LIỆU MARKDOWN SANG WORD (.DOCX) VÀ PDF CHÍNH THỨC
## Dành Cho Đồ Án Tốt Nghiệp MediAssist-AI (FPT University Capstone)

Tài liệu này hướng dẫn chi tiết các phương pháp nhanh nhất, chuẩn xác nhất và giữ nguyên 100% định dạng bảng biểu, công thức toán LaTeX và biểu đồ Mermaid từ mã nguồn Markdown sang tài liệu chính thức: **Microsoft Word (`.docx`)** và **Adobe PDF (`.pdf`)**.

---

### 🌟 PHƯƠNG PHÁP 1: SỬ DỤNG BỘ CÔNG CỤ EXPORT TỰ ĐỘNG CỦA DỰ ÁN (KHUYÊN DÙNG SỐ 1 - 100% GIỮ ĐỊNH DẠNG & VẼ MERMAID)

Nhóm phát triển đã tích hợp sẵn công cụ tự động hóa tại `scripts/export_to_academic_doc.py`. Công cụ này đã biên dịch sẵn toàn bộ các báo cáo thành các tệp HTML học thuật độc lập tại thư mục:
👉 **`docs/export/`**

Danh sách các tệp tài liệu đã được xuất sẵn:
1. `docs/export/Report1_Project_Charter_and_Plan.html` (Báo cáo Khởi động & Kế hoạch Dự án)
2. `docs/export/Report2_Requirements_Analysis_and_Domain_Model.html` (Báo cáo Phân tích Nghiệp vụ)
3. `docs/export/Report3_Software_Requirement_Specification.html` (Hồ sơ SRS Chuẩn IEEE 830)
4. `docs/export/Report4_Software_Design_Document.html` (Hồ sơ Thiết kế SDD Chuẩn IEEE 1016)
5. `docs/export/Report5_Software_Test_Report.html` (Báo cáo Kiểm thử STR Chuẩn IEEE 829)
6. `docs/export/Capstone_Presentation_Slides.html` (Bộ Slide Thuyết trình 24 Trang)
7. `docs/export/Capstone_Defense_QnA_Top25.html` (Top 25 Câu hỏi Phản biện Chuyên sâu)

#### Cách 1.1: Xuất sang PDF Chuẩn Luận Văn (Chỉ mất 5 giây)
1. Dùng trình duyệt web (Google Chrome, Microsoft Edge hoặc Safari), nhấp đúp chuột để mở tệp `.html` tương ứng (Ví dụ: `docs/export/Report3_Software_Requirement_Specification.html`).
2. Trên màn hình sẽ hiển thị trang tài liệu học thuật với font Times New Roman, bảng biểu căn lề đẹp mắt, các công thức toán LaTeX và toàn bộ biểu đồ Mermaid được tự động vẽ thành hình ảnh vector sắc nét.
3. Nhấn vào nút xanh **"🖨️ In ra PDF / Lưu PDF (Cmd+P)"** ở góc trên bên phải (hoặc phím tắt `Cmd + P` trên Mac / `Ctrl + P` trên Windows).
4. Tại hộp thoại In:
   - Mục **Máy in đích (Destination):** Chọn **"Lưu dưới dạng PDF" (Save as PDF)**.
   - Mục **Bố cục (Layout):** Chọn **Dọc (Portrait)**.
   - Mục **Khổ giấy (Paper size):** Chọn **A4**.
   - Bật tích chọn **"Đồ họa nền" (Background graphics)** để giữ màu nền bảng biểu.
5. Nhấn **Lưu (Save)**. Bạn sẽ có ngay một cuốn tài liệu PDF bìa chuẩn luận văn cực kỳ sang trọng để nộp bài!

#### Cách 1.2: Chuyển đổi sang Microsoft Word (.docx)
1. Mở phần mềm **Microsoft Word** trên máy tính của bạn.
2. Chọn menu **Tệp (File) $\rightarrow$ Mở (Open)**.
3. Chọn duyệt tệp và trỏ tới tệp `.html` trong thư mục `docs/export/` (Ví dụ: `Report3_Software_Requirement_Specification.html`).
4. Microsoft Word sẽ tự động nạp cấu trúc tài liệu, nhận diện bảng biểu 2 cột, tiêu đề và định dạng căn lề hoàn hảo.
5. Chọn menu **Tệp (File) $\rightarrow$ Lưu thành (Save As)** $\rightarrow$ Tại mục định dạng tệp, chọn **Word Document (.docx)** $\rightarrow$ Nhấn **Lưu (Save)**.

---

### 🌐 PHƯƠNG PHÁP 2: ĐƯA LÊN GOOGLE DOCS (THEO YÊU CẦU NỘP BÀI CỦA FPT)

Nếu giảng viên hoặc hội đồng yêu cầu nộp link Google Docs:
1. Mở Google Drive cá nhân (`drive.google.com`).
2. Nhấn nút **Mới (+ New) $\rightarrow$ Tải tệp lên (File upload)**.
3. Tải tệp `.html` (trong `docs/export/`) hoặc tệp `.docx` (đã xuất từ Word) lên Google Drive.
4. Nhấp chuột phải vào tệp vừa tải lên $\rightarrow$ Chọn **Mở bằng (Open with) $\rightarrow$ Google Tài liệu (Google Docs)**.
5. Google Docs sẽ tự động chuyển đổi thành một tài liệu Google Doc trực tuyến chính thức, giữ nguyên bảng biểu và đề mục mục lục. Bạn chỉ cần bấm nút **Chia sẻ (Share)** và gửi link cho giảng viên!

---

### 💻 PHƯƠNG PHÁP 3: XUẤT TRỰC TIẾP TỪ VS CODE (NẾU DÙNG VISUAL STUDIO CODE)

Nếu bạn đang mở thư mục dự án bằng VS Code:
1. Vào tab **Extensions (Ctrl+Shift+X / Cmd+Shift+X)**, tìm và cài đặt extension:
   👉 **Markdown PDF** (tác giả *yzane*) hoặc **Markdown Preview Enhanced** (tác giả *Yiyi Wang*).
2. Mở bất kỳ tệp `.md` nào trong thư mục `docs/` (ví dụ: `docs/SRS_MediAssist_AI.md`).
3. Nhấp chuột phải vào vùng soạn thảo văn bản:
   - Chọn **Markdown PDF: Export (pdf)** $\rightarrow$ Tự động sinh tệp `.pdf` cùng thư mục.
   - Chọn **Markdown PDF: Export (docx)** $\rightarrow$ Tự động sinh tệp `.docx` cùng thư mục.
   - Chọn **Markdown PDF: Export (html)** $\rightarrow$ Tự động sinh tệp `.html`.

---

### ⚡ PHƯƠNG PHÁP 4: SỬ DỤNG CÔNG CỤ DÒNG LỆNH PANDOC (NẾU CÓ CÀI HOMEBREW)

Nếu máy tính của bạn đã cài đặt công cụ Pandoc:
```bash
# Cài đặt qua Homebrew (nếu chưa có)
brew install pandoc

# Lệnh chuyển đổi trực tiếp sang Word (.docx):
pandoc docs/SRS_MediAssist_AI.md -o docs/SRS_MediAssist_AI.docx
pandoc docs/SDD_MediAssist_AI.md -o docs/SDD_MediAssist_AI.docx
pandoc docs/TEST_REPORT_MediAssist_AI.md -o docs/TEST_REPORT_MediAssist_AI.docx

# Lệnh chuyển đổi trực tiếp sang PDF:
pandoc docs/SRS_MediAssist_AI.md -o docs/SRS_MediAssist_AI.pdf --pdf-engine=xelatex
```

---

### 📋 TỔNG KẾT KHUYÊN DÙNG

| Mục Đích Đầu Ra | Cách Làm Tối Ưu Nhất | Thời Gian Thực Hiện |
| :--- | :--- | :---: |
| **Cần file PDF đẹp để in ấn hoặc nộp file cứng** | **Mở file HTML trong `docs/export/` $\rightarrow$ Nhấn In (Cmd+P) $\rightarrow$ Lưu PDF** | **30 giây** |
| **Cần file Word (.docx) để chỉnh sửa tiếp** | **Mở Microsoft Word $\rightarrow$ File Open file HTML $\rightarrow$ Save As .docx** | **1 phút** |
| **Cần link Google Docs để nộp bài FPT** | **Tải file HTML/DOCX lên Google Drive $\rightarrow$ Open with Google Docs** | **1 phút** |
