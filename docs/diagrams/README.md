# THƯ VIỆN BIỂU ĐỒ & TRÌNH XEM VECTOR TƯƠNG TÁC (INTERACTIVE DIAGRAM VIEWER)
## MediAssist-AI Telehealth & Clinical Decision Support System

Thư mục này chứa các tệp mã nguồn biểu đồ và trình xem vector tương tác độc lập phục vụ giải quyết bài toán: **Biểu đồ lớn (như Kiến trúc 7 tầng, CSDL 17 bảng) khi chèn vào văn bản Word / PDF A4 bị thu nhỏ và khó nhìn chi tiết.**

---

### 🌟 1. Trình Xem Biểu Đồ Vector Tương Tác: `interactive_viewer.html`

Tệp **`docs/diagrams/interactive_viewer.html`** là một ứng dụng web độc lập, tải lười các biểu đồ Mermaid trực tiếp và tích hợp bộ công cụ **`svg-pan-zoom`** mạnh mẽ:
* **Khả năng Phóng to (Zoom In):** Lên tới **1500% (15x)** mà **hoàn toàn không vỡ hạt** (nhờ định dạng đồ họa vector SVG).
* **Khả năng Kéo rê (Pan):** Nhấn giữ chuột trái hoặc vuốt 2 ngón tay trên trackpad để di chuyển tự do khắp canvas.
* **Tải ảnh Vector gốc:** Nút **"📥 Tải SVG Gốc"** cho phép tải trực tiếp tệp `.svg` để chèn vào slide PowerPoint hoặc báo cáo in ấn với độ nét vô hạn.

#### Danh Mục 17 Biểu Đồ Tích Hợp Sẵn Trong Trình Xem:
1. **Kiến Trúc Hệ Thống (`?diagram=architecture`):** Mô hình Tiered Micro-Modular Monolith 7 phân tầng.
2. **Cơ Sở Dữ Liệu Vật Lý (`?diagram=erd_full`):** Toàn bộ 17 bảng PostgreSQL quan hệ chuẩn 3NF.
3. **ERD Phân Hệ 1 (`?diagram=erd_sub_identity`):** Định danh, Phân quyền RBAC, Token SHA-256 & Audit Logs.
4. **ERD Phân Hệ 2 (`?diagram=erd_sub_doctor`):** Năng lực Bác sĩ, Chuyên khoa, Lịch tuần & Đánh giá.
5. **ERD Phân Hệ 3 (`?diagram=erd_sub_appointment`):** Lịch khám, Điểm danh STT, Sinh hiệu & Bệnh án EMR (ICD-10/LOINC).
6. **ERD Phân Hệ 4 (`?diagram=erd_sub_diagnostics`):** Hồ sơ xét nghiệm S3, Bóc tách OCR, Sổ cái VNPay & FinOps.
7. **Sơ Đồ Ca Sử Dụng Tổng Thể (`?diagram=usecase_macro`):** Global High-Level Macro Use Case Model.
8. **Cấu Trúc Gói Front-end (`?diagram=frontend_pkg`):** 14 thư mục gói trong `frontend/src/`.
9. **Cấu Trúc Gói Back-end (`?diagram=backend_pkg`):** 24 gói package Clean Architecture trong `com.mediassist`.
10. **Các Luồng Nghiệp Vụ Trọng Điểm:** Đăng nhập Brute-Force (`seq_login`), Phân luồng 115 NegEx (`seq_triage`), Tìm kiếm WHRF (`seq_search`), Đặt lịch Slot Lock (`seq_booking`), Bệnh án EMR ICD-10 (`seq_encounter`), Bóc tách OCR LOINC (`seq_ocr`), Rào chắn BOLA (`seq_bola`), Webhook VNPay (`seq_vnpay`).

---

### 💡 2. Cách Sử Dụng Trong Tài Liệu Báo Cáo

Khi soạn thảo báo cáo Word / Markdown / PDF, bạn chỉ cần đặt đường link trực tiếp tới trình xem:
```markdown
> 🔍 **[Xem Bản Phóng To Tương Tác 1500% & Kéo Rê Chuột](./diagrams/interactive_viewer.html?diagram=erd_full)**
```
Khi người chấm bài hoặc giảng viên bấm vào link, trình duyệt sẽ mở ngay toàn màn hình biểu đồ tương ứng với tỷ lệ zoom sắc nét nhất!
