# 🗺️ BẢN ĐỒ ĐIỀU HƯỚNG TÀI LIỆU KHOÁ LUẬN TỐT NGHIỆP (KLTN)
## HỆ THỐNG TRỢ LÝ Y TẾ THÔNG MINH MEDIASSIST-AI

> **Dành cho:** Tech Lead, Thành viên nhóm, QA, Người viết báo cáo luận văn, và Hội đồng phản biện.  
> **Mục tiêu:** Cung cấp luồng đọc hiểu (Reading Flow) khoa học, phân loại rõ ràng hệ thống tài liệu, và định vị **bộ file tối thiểu** giúp người mới nắm trọn vẹn 100% dự án trong thời gian ngắn nhất.

---

## 🧭 PHẦN 1: BỘ 6 TỆP TỐI THIỂU ĐỂ HIỂU TRỌN VẸN DỰ ÁN (MINIMUM ESSENTIAL SET)

Nếu bạn là thành viên mới vào nhóm hoặc không có nhiều thời gian, bạn **CHỈ CẦN ĐỌC ĐÚNG 6 FILE NÀY THEO THỨ TỰ TỪ 1 ĐẾN 6**:

```
[1. README.md] ──────> [2. STORYTELLING.md] ──────> [3. ARCHITECTURE.md]
  (Dự án là gì?)         (Tại sao làm đề tài này?)    (Khung kỹ thuật gồm gì?)
        │
        ▼
[4. DATABASE_DESIGN.md] ─> [5. ENTERPRISE_ALGORITHMS] ─> [6. USE_CASES.md]
  (Dữ liệu & pgvector)       (5 thuật toán & tối ưu)       (33 chức năng chi tiết)
```

| Thứ Tự | Tệp Tin | Thời Gian Đọc | Bạn Sẽ Hiểu Được Gì? |
| :---: | :--- | :---: | :--- |
| **#1** | [**`README.md`**](../README.md) | 10 phút | Tổng quan dự án, công nghệ sử dụng, cách khởi động nhanh hệ thống trong 3 phút. |
| **#2** | [**`docs/STORYTELLING.md`**](./STORYTELLING.md) | 15 phút | **Bối cảnh & Nỗi đau:** Tại sao bệnh viện Việt Nam bị quá tải? Bệnh nhân gặp khó khăn gì? Personas người bệnh & bác sĩ. |
| **#3** | [**`ARCHITECTURE.md`**](../ARCHITECTURE.md) | 25 phút | **Kiến trúc tổng thể:** Modular Monolith Spring Boot 3.4, Java 21 Loom, Two-Layer Cache (Caffeine + Redis), Dual-Transport Auth. |
| **#4** | [**`docs/DATABASE_DESIGN.md`**](./DATABASE_DESIGN.md) | 30 phút | **Thiết kế dữ liệu:** Toàn bộ 19 bản Flyway Migration, mô hình bảng, đồ thị `pgvector HNSW` 1536 chiều, rào chắn khóa lạc quan. |
| **#5** | [**`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`**](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md) | 35 phút | ⭐ **Lõi công nghệ & thuật toán:** 5 thuật toán độc quyền, công thức toán học, HNSW tuning, sub-word hashing, chấm sao WHRF. |
| **#6** | [**`docs/USE_CASES.md`**](./USE_CASES.md) | 30 phút | **Nghiệp vụ chi tiết:** Đặc tả 33 Use Cases thực tế từ đặt khám O2O, Triage AI, Bàn khám đôi Bác sĩ, đến FinOps quản trị viện phí. |

---

## 🏛️ PHẦN 2: CẤU TRÚC 4 TẦNG HỒ SƠ TÀI LIỆU KHOÁ LUẬN TỐT NGHIỆP

Toàn bộ 14 tài liệu trong thư mục `docs/` và gốc dự án được tổ chức chặt chẽ theo mô hình 4 tầng tiêu chuẩn:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TẦNG 0: ONBOARDING & KHỞI ĐỘNG NHANH                                  │
│  • README.md                   • CONTRIBUTING.md                       │
├────────────────────────────────────────────────────────────────────────┤
│  TẦNG 1: BỐI CẢNH ĐỀ TÀI & ĐẶC TẢ YÊU CẦU (REQUIREMENTS)              │
│  • docs/STORYTELLING.md        • docs/SRS_MediAssist_AI.md             │
│  • docs/USE_CASES.md           • docs/CAPSTONE_SPECIFICATION.md        │
├────────────────────────────────────────────────────────────────────────┤
│  TẦNG 2: THIẾT KẾ KỸ THUẬT & THUẬT TOÁN (ARCHITECTURE & ENGINEERING)  │
│  • ARCHITECTURE.md             • docs/DATABASE_DESIGN.md               │
│  • docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md                        │
│  • docs/DOCUMENT_SCAN_PIPELINE.md                                      │
├────────────────────────────────────────────────────────────────────────┤
│  TẦNG 3: KIỂM THỬ, VẬN HÀNH & BẢO VỆ LUẬN VĂN (OPS, QA & DEFENSE)      │
│  • docs/MASTER_TRACEABILITY_INDEX.md  • docs/CAPSTONE_DEFENSE.md       │
│  • docs/TEAM_WORKFLOW.md              • docs/WORK_LOG.md               │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Tầng 0: Khởi Động Nhanh (Onboarding)
* [`README.md`](../README.md): Bản đồ tổng quan, các lệnh cài đặt và chạy thử hệ thống.
* [`CONTRIBUTING.md`](../CONTRIBUTING.md): Quy chuẩn GitFlow, cách đặt tên nhánh (`feature/UC-xx`), chuẩn commit.

### 2. Tầng 1: Đề Tài & Đặc Tả Nghiệp Vụ (Requirements)
* [`docs/STORYTELLING.md`](./STORYTELLING.md): Bối cảnh lâm sàng, lý do chọn đề tài, tính nhân văn và bài toán thực tế tại các bệnh viện Việt Nam.
* [`docs/SRS_MediAssist_AI.md`](./SRS_MediAssist_AI.md): Bản đặc tả yêu cầu phần mềm đạt chuẩn quốc tế **IEEE 830** (Yêu cầu chức năng, phi chức năng, tuân thủ Nghị định 13/2023/NĐ-CP và HIPAA).
* [`docs/USE_CASES.md`](./USE_CASES.md): Danh mục chi tiết 33 Use Cases (Pre-condition, Happy Path, Alternative Flows, Exception Flows) phân bổ cho 4 tác nhân: Bệnh nhân, Bác sĩ, Lễ tân và Quản trị viên.
* [`docs/CAPSTONE_SPECIFICATION.md`](./CAPSTONE_SPECIFICATION.md): Bảng yêu cầu đề cương tốt nghiệp và barem chấm điểm của nhà trường.

### 3. Tầng 2: Thiết Kế Kỹ Thuật & Thuật Toán (Engineering)
* [`ARCHITECTURE.md`](../ARCHITECTURE.md): Kiến trúc hệ thống Modular Monolith, Dual-Transport Auth (Bearer + HttpOnly Cookie), kiến trúc bộ nhớ đệm 2 tầng (L1 Caffeine + L2 Redis).
* [`docs/DATABASE_DESIGN.md`](./DATABASE_DESIGN.md): Thiết kế CSDL PostgreSQL 16, toàn bộ 19 script Flyway, kiểu dữ liệu vector, trigger tính điểm đánh giá bác sĩ và chiến lược connection pool HikariCP.
* [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md): Đặc tả toán học 5 thuật toán độc quyền:
  1. *Hedged Requests & Speculative Failover* (Triệt tiêu độ trễ đuôi P99).
  2. *Progressive Sieve* (Kim tự tháp lọc AI 4 tầng tiết kiệm 90% token).
  3. *Cân bằng hàng đợi lâm sàng 2 chiều* (Giảm thời gian chờ khám từ 45p xuống 12p).
  4. *XFetch Probabilistic Cache Renewal* (Chống sập Cache Stampede dưới 100k CCU).
  5. *Rào chắn bản thể luận LOINC + ICD-10* (Triệt tiêu ảo giác y khoa).
* [`docs/DOCUMENT_SCAN_PIPELINE.md`](./DOCUMENT_SCAN_PIPELINE.md): Đường ống bóc tách hồ sơ y tế: Tesseract OCR đa luồng + Vision AI + Bộ khử nhiễu lâm sàng.

### 4. Tầng 3: Kiểm Thử, Vận Hành & Bảo Vệ (QA & Defense)
* [`docs/MASTER_TRACEABILITY_INDEX.md`](./MASTER_TRACEABILITY_INDEX.md): Ma trận truy vết yêu cầu 2 chiều ($33\text{ Use Cases} \leftrightarrow \text{API} \leftrightarrow \text{Database Tables} \leftrightarrow \text{Thuật Toán} \leftrightarrow \text{Câu hỏi Hội đồng}$).
* [`docs/VECTOR_BENCHMARK_REPORT.md`](./VECTOR_BENCHMARK_REPORT.md): ⭐ **Báo cáo thực nghiệm huấn luyện vector & pgvector HNSW**: Số liệu định lượng đo trên 500 ca bệnh từ tập dữ liệu Hugging Face `Meddies/meddies-persona-vie` và `Meddies/meddies-pii` (Top-1 Accuracy tăng 3.9 lần, độ trễ $0.72\text{ms}$).
* [`docs/CAPSTONE_DEFENSE.md`](./CAPSTONE_DEFENSE.md): Cẩm nang bảo vệ tốt nghiệp: Kịch bản thuyết trình 15 phút, checklist live demo, và bộ **35 câu hỏi phản biện gài bẫy kèm câu trả lời mẫu**.
* [`docs/TEAM_WORKFLOW.md`](./TEAM_WORKFLOW.md): Ma trận phân chia trách nhiệm 3 vai trò trong nhóm (Tech Lead 30/50/20, Core Dev 80/15/5, QA & Doc 15/25/60).
* [`docs/WORK_LOG.md`](./WORK_LOG.md): Nhật ký phát triển liên tục ghi nhận chi tiết từng file thay đổi, bằng chứng lệnh test và kết quả nghiệm thu.

---

## 👥 PHẦN 3: LUỒNG ĐỌC HIỂU THEO TỪNG VAI TRÒ (READING FLOW)

Tùy theo mục đích công việc, bạn hãy chọn đúng luồng đọc dưới đây để đạt hiệu quả cao nhất:

### 🚀 Luồng A: Dành Cho Developer Mới Vào Nhóm (Thời gian: 1 - 2 ngày)
1. **Bước 1:** Đọc [`README.md`](../README.md) $\rightarrow$ Cài đặt môi trường, chạy Docker và khởi động app.
2. **Bước 2:** Đọc [`ARCHITECTURE.md`](../ARCHITECTURE.md) $\rightarrow$ Nắm luồng request từ React Vite qua Spring Boot.
3. **Bước 3:** Đọc [`docs/DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) $\rightarrow$ Hiểu các bảng dữ liệu mình sẽ thao tác.
4. **Bước 4:** Đọc [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md) $\rightarrow$ Nắm thuật toán tìm kiếm vector và cơ chế cache trước khi code.
5. **Bước 5:** Đọc [`CONTRIBUTING.md`](../CONTRIBUTING.md) $\rightarrow$ Tạo branch và viết code theo đúng quy chuẩn.

---

### 📝 Luồng B: Dành Cho Người Viết Báo Cáo Luận Văn KLTN (5 Chương)
Nếu bạn được phân công viết báo cáo Khóa Luận Tốt Nghiệp, hãy lấy nội dung trực tiếp từ các file tài liệu tương ứng:

| Chương Luận Văn | Tên Chương | Tệp Markdown Nguồn Cần Lấy Dữ Liệu |
| :---: | :--- | :--- |
| **Chương 1** | **Tổng Quan & Đặt Vấn Đề** | [`docs/STORYTELLING.md`](./STORYTELLING.md) + [`docs/CAPSTONE_SPECIFICATION.md`](./CAPSTONE_SPECIFICATION.md) |
| **Chương 2** | **Cơ Sở Lý Thuyết & Công Nghệ** | [`ARCHITECTURE.md`](../ARCHITECTURE.md) + [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md) (§2 pgvector & Transformers) |
| **Chương 3** | **Phân Tích & Thiết Kế Hệ Thống** | [`docs/SRS_MediAssist_AI.md`](./SRS_MediAssist_AI.md) + [`docs/USE_CASES.md`](./USE_CASES.md) + [`docs/DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) |
| **Chương 4** | **Hiện Thực Hóa & Thuật Toán Lõi** | [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md) + [`docs/DOCUMENT_SCAN_PIPELINE.md`](./DOCUMENT_SCAN_PIPELINE.md) |
| **Chương 5** | **Thực Nghiệm, Đánh Giá & Kết Luận** | [`docs/CAPSTONE_DEFENSE.md`](./CAPSTONE_DEFENSE.md) (Kết quả k6, Playwright, Cache hit) + [`docs/MASTER_TRACEABILITY_INDEX.md`](./MASTER_TRACEABILITY_INDEX.md) |

---

### 🎓 Luồng C: Dành Cho Thầy/Cô Hướng Dẫn & Hội Đồng Chấm Điểm
Thầy/Cô chấm thi thường chỉ có 15 - 20 phút để thẩm định dự án. Hãy hướng dẫn Thầy/Cô xem theo trình tự:
1. **Xem tính thực tiễn:** [`docs/STORYTELLING.md`](./STORYTELLING.md) (Nỗi đau y tế được giải quyết).
2. **Xem độ khó học thuật & tính độc quyền:** [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md) (Bộ 5 thuật toán, đồ thị HNSW và công thức toán).
3. **Xem tính bao phủ nghiệp vụ:** [`docs/MASTER_TRACEABILITY_INDEX.md`](./MASTER_TRACEABILITY_INDEX.md) (33 Use Cases ánh xạ thẳng vào CSDL).
4. **Xem kết quả thực nghiệm:** [`docs/CAPSTONE_DEFENSE.md`](./CAPSTONE_DEFENSE.md) (§4 Benchmark k6 $P_{95}=42\text{ms}$ và câu hỏi vấn đáp).

---

### 🧪 Luồng D: Dành Cho QA & Kiểm Thử Hệ Thống (Testing)
1. **Kiểm thử chức năng:** Đọc [`docs/USE_CASES.md`](./USE_CASES.md) để đối soát từng Acceptance Criteria.
2. **Kiểm thử tải cao (k6):** Xem hướng dẫn trong [`tests/k6/`](../tests/k6/run_load_test.sh) và kết quả tại [`docs/CAPSTONE_DEFENSE.md`](./CAPSTONE_DEFENSE.md).
3. **Kiểm thử tự động E2E:** Xem các kịch bản tại [`frontend/e2e/`](../frontend/e2e/).

---

## 📌 PHẦN 4: NGUYÊN TẮC GIỮ TÀI LIỆU LUÔN "SỐNG" (LIVING DOCUMENTATION)

Để tài liệu không bao giờ bị lạc hậu hay lộn xộn trong quá trình phát triển tiếp theo:
1. **Khi sửa Schema Database (Flyway):** Bắt buộc cập nhật ngay [`docs/DATABASE_DESIGN.md`](./DATABASE_DESIGN.md).
2. **Khi thêm/sửa Endpoint hoặc Logic:** Bắt buộc cập nhật [`docs/USE_CASES.md`](./USE_CASES.md).
3. **Khi tối ưu thuật toán hoặc thêm công thức:** Bắt buộc ghi nhận vào [`docs/ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md`](./ENTERPRISE_ALGORITHMS_AND_RESILIENCE.md).
4. **Mỗi phiên làm việc:** Ghi nhật ký vào [`docs/WORK_LOG.md`](./WORK_LOG.md) để lưu vết tiến độ.
