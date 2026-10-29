# 🏛️ HỒ SƠ KHÓA LUẬN TỐT NGHIỆP CHUẨN HỘI ĐỒNG TIẾN SĨ
## CAPSTONE THESIS MASTER ACADEMIC DOSSIER & DEFENSE DIRECTORY
### HỆ THỐNG TRỢ LÝ Y TẾ THÔNG MINH MEDIASSIST-AI

> **Đơn vị đào tạo:** Đại học FPT – Khoa Công nghệ Thông tin  
> **Chuyên ngành:** Kỹ thuật Phần mềm (Software Engineering) – Định hướng AI Lâm sàng  
> **Mã dự án (Capstone ID):** `FPTU-KLTN-2026-MEDIASSIST`  
> **Thời gian thực hiện:** 15/05/2026 – 24/10/2026  
> **Đối tượng sử dụng tài liệu:** Hội đồng Giảng viên & Chuyên gia Phản biện (Tiến sĩ CNTT & Y tế), Tech Lead, Developers và QA Engineers.  
> **Quy chuẩn quốc tế tuân thủ:** ISO/IEC/IEEE 29148:2018, IEEE 830, IEEE 1016, IEEE 829, PMBOK 7th Edition, HL7 FHIR v4.0.1, WHO LOINC (QĐ 3280/QĐ-BYT), WHO ICD-10 (QĐ 7603/QĐ-BYT), Luật Khám bệnh, chữa bệnh số 15/2023/QH15 và Nghị định 13/2023/NĐ-CP.

---

## 📑 MỤC LỤC TỔNG THỂ

1. [Cấu Trúc Hồ Sơ Khóa Luận 4 Phân Tầng Học Thuật](#1-cấu-trúc-hồ-sơ-khóa-luận-4-phân-tầng-học-thuật)
2. [Tầng 1: Bộ 5 Báo Cáo Khóa Luận Master Chuẩn Quốc Tế](#2-tầng-1-bộ-5-báo-cáo-khóa-luận-master-chuẩn-quốc-tế)
3. [Tầng 2: Hồ Sơ Luận Chứng Y Học & Kịch Bản Phản Biện Hội Đồng](#3-tầng-2-hồ-sơ-luận-chứng-y-học--kịch-bản-phản-biện-hội-đồng)
4. [Tầng 3: Đặc Tả Kiến Trúc Kỹ Thuật & Giải Thuật Doanh Nghiệp](#4-tầng-3-đặc-tả-kiến-trúc-kỹ-thuật--giải-thuật-doanh-nghiệp)
5. [Tầng 4: Tài Liệu Lưu Trữ Nội Bộ & Nhật Ký Phát Triển (`docs/internal/`)](#5-tầng-4-tài-liệu-lưu-trữ-nội-bộ--nhật-ký-phát-triển-docsinternal)
6. [Hướng Dẫn Duyệt Tài Liệu Offline Qua WordCraft Studio (0đ Token, Không Lỗi CORS)](#6-hướng-dẫn-duyệt-tài-liệu-offline-qua-wordcraft-studio)

---

## 1. CẤU TRÚC HỒ SƠ KHÓA LUẬN 4 PHÂN TẦNG HỌC THUẬT

Toàn bộ tài liệu của dự án MediAssist-AI được tổ chức theo cấu trúc phân tầng nghiêm ngặt, loại bỏ hoàn toàn các tệp rác hoặc tệp nháp để phục vụ bảo vệ đồ án trước Hội đồng Tiến sĩ:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: BỘ 5 BÁO CÁO KHÓA LUẬN MASTER CHUẨN QUỐC TẾ (OFFICIAL CAPSTONE REPORTS)          │
│ • Report 1: Project Charter & Management Plan (PMBOK 7th / IEEE 1058)                   │
│ • Report 2: Requirements Analysis & Domain Modeling (ISO 29148 / DDD 7 Bounded Contexts)│
│ • Report 3: Software Requirements Specification (IEEE 830 / 49 Use Cases)              │
│ • Report 4: Software Design Document (IEEE 1016 / 5-Tier Architecture / C4 Model)       │
│ • Report 5: Software Test Report & Verification (IEEE 829 / 306 Tests / k6 500 VUs)     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 2: HỒ SƠ LUẬN CHỨNG Y HỌC & KỊCH BẢN PHẢN BIỆN HỘI ĐỒNG (ACADEMIC DEFENSE DOSSIER)  │
│ • CLINICAL_GROUNDING_AND_EVIDENCE_DEFENSE.md (Biện Luận SOTA AMIE Nature 2024, Luật KCB)│
│ • CAPSTONE_DEFENSE.md (Top 25 Câu Hỏi & Kịch Bản Đối Đáp Hội Đồng Phản Biện)            │
│ • CAPSTONE_PRESENTATION_SLIDES.md (Giáo Án Slide Thuyết Trình Hội Đồng 24 Trang)         │
│ • DATA_PROVENANCE_AND_CLINICAL_STANDARDS.md (Meddies 150k, LOINC QĐ 3280, Nghị Định 13) │
│ • STORYTELLING.md (Bối Cảnh Y Tế Việt Nam, Nỗi Đau 4 Điểm Nghẽn & Chuyển Đổi Số O2O)    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 3: ĐẶC TẢ KIẾN TRÚC KỸ THUẬT & GIẢI THUẬT CHUYÊN SÂU (ENGINEERING DEEP DIVES)      │
│ • DATABASE_DESIGN.md (CSDL 17 Bảng Chuẩn 3NF, pgvector HNSW & 22 Flyway Migrations)     │
│ • ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md (5 Thuật Toán Độc Quyền: WHRF, XFetch, P99)  │
│ • DOCUMENT_SCAN_PIPELINE.md (Kiến Trúc OCR Đa Phương Thức & Clinical RAG Gateway)       │
│ • MASTER_TRACEABILITY_INDEX.md (Ma Trận Truy Vết 1-1: Use Cases ➔ Code ➔ DB ➔ Tests)    │
│ • USE_CASES.md (Đặc Tả Chi Tiết 49 Ca Sử Dụng Lâm Sàng & Quản Trị)                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ TẦNG 4: LƯU TRỮ NỘI BỘ & NHẬT KÝ PHÁT TRIỂN (INTERNAL ARCHIVE - `docs/internal/`)      │
│ • WORK_LOG.md (Nhật Ký Commit 680KB)           • TEAM_WORKFLOW.md (Quy Trình Gitflow)   │
│ • REVIEW_CHECKLIST.md (Checklist Sprint)       • CAPSTONE_SPECIFICATION.md (Đề Cương)   │
│ • FRONTEND_UX_AUDIT.md (Ghi Chép UI/UX)         • VECTOR_BENCHMARK_REPORT.md (Đo Đạc)   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. TẦNG 1: BỘ 5 BÁO CÁO KHÓA LUẬN MASTER CHUẨN QUỐC TẾ

Đây là bộ 5 báo cáo kỹ nghệ phần mềm đóng vai trò là sản phẩm nghiệm thu chính thức của đồ án:

| Báo Cáo | Tên Tài Liệu Chi Tiết | Tiêu Chuẩn Áp Dụng | Vị Trí Tệp Nguồn | Bản Tương Tác WordCraft Studio |
| :---: | :--- | :---: | :--- | :--- |
| **Report 1** | **Project Charter & Management Plan** | PMBOK 7th / IEEE 1058 | `docs/PROJECT_CHARTER_AND_PLAN.md` | [📖 Mở Báo Cáo Report 1](#report_1_main) |
| **Report 2** | **Requirements Analysis & Domain Modeling** | ISO/IEC/IEEE 29148:2018 | `docs/REQUIREMENTS_ANALYSIS_AND_DOMAIN_MODEL.md` | [📖 Mở Báo Cáo Report 2](#report_2_main) |
| **Report 3** | **Software Requirements Specification (SRS)** | IEEE 830 / ISO 29148 | `docs/SRS_MediAssist_AI.md` | [📖 Mở Báo Cáo Report 3](#report_3_main) |
| **Report 4** | **Software Design Document (SDD)** | IEEE 1016 / C4 Model | `docs/SDD_MediAssist_AI.md` | [📖 Mở Báo Cáo Report 4](#report_4_main) |
| **Report 5** | **Software Test & Verification Report** | IEEE 829 Software Test | `docs/TEST_REPORT_MediAssist_AI.md` | [📖 Mở Báo Cáo Report 5](#report_5_main) |

---

## 3. TẦNG 2: HỒ SƠ LUẬN CHỨNG Y HỌC & KỊCH BẢN PHẢN BIỆN HỘI ĐỒNG

Dành cho Hội đồng Tiến sĩ chấm điểm tính sáng tạo, độ tin cậy khoa học và tính an toàn y đức:

* [**`docs/CLINICAL_GROUNDING_AND_EVIDENCE_DEFENSE.md`**](#clinical_defense):  
  ⭐ **Vũ khí phản biện tối thượng:**
  - Tuyên bố định vị hệ thống là **Hỗ trợ Ra quyết định Tiền lâm sàng (CDSS)**, tuyệt đối không chẩn đoán độc nhất thay thế Bác sĩ (tuân thủ Điều 19 & 28 **Luật Khám bệnh, chữa bệnh số 15/2023/QH15**).
  - Nghiên cứu đối chuẩn với **Google AMIE (Nature 2024)**, **Ada Health (The Lancet Digital Health / BMJ)** và **ClinicalRAG (ACL 2024)**.
  - Kiến trúc phòng thủ 4 tầng triệt tiêu ảo giác (Anti-Hallucination) và Bộ 6 kịch bản đối đáp "bẫy" phản biện.
* [**`docs/CAPSTONE_DEFENSE.md`**](#capstone_defense):  
  Bộ **Top 25 Câu hỏi và Kịch bản Đối đáp Hội đồng** bao phủ toàn diện 4 góc độ: Nghiệp vụ Y tế, Kỹ thuật Kiến trúc, Khả năng chịu tải cao và Tính nguyên bản của mã nguồn.
* [**`docs/CAPSTONE_PRESENTATION_SLIDES.md`**](#presentation_slides):  
  Giáo án Slide thuyết trình 24 trang chuẩn mực gồm cấu trúc bối cảnh, kiến trúc hệ thống, demo tương tác và ma trận chứng minh kết quả thực nghiệm.
* [**`docs/DATA_PROVENANCE_AND_CLINICAL_STANDARDS.md`**](#data_provenance):  
  Bản tuyên bố nguồn gốc dữ liệu lâm sàng: Chính sách **Zero-Mock Policy**, tập dữ liệu đối chứng chuẩn **Meddies Persona** ($N = 500$ ca vàng trên kho 150.000 ca bệnh), danh mục chỉ số **WHO LOINC (QĐ 3280/QĐ-BYT)** và bản thể luận **WHO ICD-10 (QĐ 7603/BYT)**.
* [**`docs/STORYTELLING.md`**](#storytelling):  
  Câu chuyện thực tiễn tại các bệnh viện Việt Nam: Nỗi đau chờ 6-8 tiếng cho 3 phút khám, hiện tượng định tuyến sai chuyên khoa và rào cản thuật ngữ cận lâm sàng.

---

## 4. TẦNG 3: ĐẶC TẢ KIẾN TRÚC KỸ THUẬT & GIẢI THUẬT DOANH NGHIỆP

Dành cho các chuyên gia CNTT và Kỹ sư phần mềm thẩm định kiến trúc và mã nguồn:

* [**`docs/DATABASE_DESIGN.md`**](#database_design):  
  Đặc tả CSDL PostgreSQL 16 chuẩn 3NF gồm 17 bảng dữ liệu, cấu hình chỉ mục đồ thị vector `pgvector` HNSW 1536 chiều, 4 phân hệ ERD Crow's Foot chuẩn mực, và lộ trình 22 bản di trú Flyway (`V1` – `V22`).
* [**`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`**](#algorithms_resilience):  
  Chứng minh toán học và cài đặt 5 giải thuật độc quyền:
  1. *Hedged Requests & Speculative Failover:* Triệt tiêu 95% độ trễ đuôi, giảm P99 từ $25.4\text{s} \rightarrow 1.8\text{s}$.
  2. *Progressive AI Sieve:* Kim tự tháp lọc AI 4 tầng tiết kiệm $85\% - 92\%$ chi phí token điện toán đám mây.
  3. *Clinical Queue Dispatcher:* Cân bằng hàng đợi lâm sàng hai chiều, giảm thời gian chờ khám từ $45\text{p} \rightarrow 12\text{p}$.
  4. *XFetch Probabilistic Cache Renewal:* Chống sập Cache Stampede dưới áp lực $100.000\text{ CCU}$.
  5. *WHRF-SOTA Min-Heap Re-ranking:* Tái xếp hạng đa tiêu chí bác sĩ với Credibility Damper chống đánh giá ảo.
* [**`docs/DOCUMENT_SCAN_PIPELINE.md`**](#scan_pipeline):  
  Kiến trúc đa luồng bóc tách OCR phiếu xét nghiệm bằng Gemini 1.5 Flash Vision, che mờ PII theo Nghị định 13/2023/NĐ-CP và cấp URL ký số 15 phút.
* [**`docs/MASTER_TRACEABILITY_INDEX.md`**](#traceability_index):  
  Ma trận truy vết toàn diện liên kết 1-1 giữa: **49 Use Cases $\longleftrightarrow$ Lớp Controller / Service $\longleftrightarrow$ Bảng CSDL $\longleftrightarrow$ 306 Test Cases $\longleftrightarrow$ Báo Cáo Khóa Luận**.
* [**`docs/USE_CASES.md`**](./USE_CASES.md):  
  Đặc tả chi tiết 49 Ca sử dụng (Use Cases) phân bổ cho 4 nhóm tác nhân (Bệnh nhân, Bác sĩ, Lễ tân, Quản trị viên).

---

## 5. TẦNG 4: TÀI LIỆU LƯU TRỮ NỘI BỘ (`docs/internal/`)

Nhằm bảo đảm tính tinh gọn và sự trang nghiêm của bộ tài liệu bảo vệ trước Hội đồng, các bản nháp ghi chép nội bộ của nhóm trong suốt 6 tháng thực hiện đã được di dời vào thư mục riêng biệt:

* `docs/internal/WORK_LOG.md`: Nhật ký lập trình chi tiết (680 KB, ghi vết toàn bộ commit và quá trình phát triển).
* `docs/internal/TEAM_WORKFLOW.md`: Quy trình nội bộ về Gitflow, PR Review và Daily Standup.
* `docs/internal/REVIEW_CHECKLIST.md`: Bảng kiểm soát chất lượng qua từng cột mốc Sprint.
* `docs/internal/CAPSTONE_SPECIFICATION.md`: Bản đề cương và barem đánh giá ban đầu của nhà trường.
* `docs/internal/HUONG_DAN_LAM_SLIDE_VA_SRS.md`: Hướng dẫn kỹ thuật nội bộ dành cho các thành viên.
* `docs/internal/FRONTEND_UX_AUDIT.md`: Ghi chép rà soát giao diện người dùng.
* `docs/internal/VECTOR_BENCHMARK_REPORT.md`: Báo cáo đo đạc vector thô (đã được tích hợp vào `ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`).

---

## 6. HƯỚNG DẪN DUYỆT TÀI LIỆU OFFLINE QUA WORDCRAFT STUDIO

Toàn bộ 17 tài liệu chính thức đã được đóng gói thành dữ liệu ngoại tuyến `docs-bundle.js` và tích hợp trình xem **WordCraft Document Workbench**. 

### 🚀 Cách mở trực tiếp (Không cần chạy Local Web Server):
Bạn có thể mở tệp trực tiếp trong trình duyệt bằng phím tắt hoặc thanh địa chỉ:
* **Mở Portal Tổng Thể:**
  ```
  file:///Users/thanvinh/Desktop/KLTN/index.html
  ```
* **Mở WordCraft Studio Đọc 17 Tài Liệu Khóa Luận:**
  ```
  file:///Users/thanvinh/Desktop/KLTN/report_1/index.html
  ```
* **Mở Trình Xem Biểu Đồ Vector Phóng To 1500%:**
  ```
  file:///Users/thanvinh/Desktop/KLTN/docs/diagrams/interactive_viewer.html
  ```

### ⚡ Các phím tắt tiện ích khi thuyết trình bảo vệ:
* <kbd>Ctrl + B</kbd>: Ẩn/Hiện thanh danh sách tài liệu bên trái.
* <kbd>Ctrl + M</kbd>: Ẩn/Hiện thanh mục lục Outline bên phải.
* **Nút Xuất PDF:** Chuẩn hóa lề trang in sắc nét, không vỡ bảng hay đè chữ.
* **Chuyển Đổi Giao Diện:** Hỗ trợ 4 chế độ màu (WordCraft Light, Obsidian Dark, Warm Sepia, Nordic Slate) và hiển thị công thức toán học KaTeX phân giải cao.
