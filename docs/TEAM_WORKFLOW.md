# Quy Chế Hoạt Động Nhóm & Phân Bổ Trách Nhiệm (TEAM_WORKFLOW.md)
## MediAssist-AI Capstone & Enterprise Engineering Team Workflow

> **Mục tiêu:** Định hình cơ chế phối hợp nhịp nhàng, phân bổ rõ ràng tỷ trọng công việc để thành viên nào cũng có phần đóng góp code thực tế trên GitHub, nhưng đồng thời đảm bảo chất lượng tài liệu luận văn và kiến trúc hệ thống đạt điểm tối đa trước Hội đồng đánh giá.

---

## 1. Cơ Cấu Ba Trụ Cột Nhân Sự & Tỷ Trọng Đóng Góp

```
                    ┌──────────────────────────────────────────────┐
                    │      VAI TRÒ 1: TECH LEAD & ARCHITECT        │
                    │  (30% Code  |  50% Review & Arch  | 20% QL) │
                    └──────────────────────┬───────────────────────┘
                                           │
                   ┌───────────────────────┴───────────────────────┐
                   ▼                                               ▼
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│     VAI TRÒ 2: CORE DEVELOPER        │       │     VAI TRÒ 3: DOC LEAD & QA         │
│   (80% Code  |  15% Test  |  5% Doc) │       │   (15% Code  |  25% QA  |  60% Doc)  │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

---

### Vai Trò 1: Tech Lead & Solution Architect (Trưởng Nhóm / Kiến Trúc Sư)
* **Tỷ trọng công việc:** **30% Code — 50% Review & Kiến Trúc — 20% Điều phối tiến độ**.
* **Trách nhiệm chính:**
  1. **Thiết kế & Bảo vệ Kiến trúc:** Chịu trách nhiệm về tính ổn định của toàn hệ thống (Zero downtime, Modular Monolith, PostgreSQL `pgvector`, Two-Layer Cache). Ngăn chặn tình trạng các thành viên tự ý cài thư viện rác hoặc over-engineering.
  2. **Code phần lõi (Core Framework & Foundation):** Trực tiếp code các module hạ tầng phức tạp nhất: Security Filter, JWT Dual-Transport, Cache Manager đồng bộ L1/L2, Docker Compose baseline, Global Exception Handler.
  3. **Kiểm duyệt mã nguồn (Strict Code Review):** Là "người gác cổng" duy nhất có quyền duyệt merge PR vào nhánh `develop` và `master`. Kiểm tra từng dòng diff của Core Dev và Doc Specialist.
  4. **Giải quyết xung đột kỹ thuật (Technical Blocker):** Sửa các lỗi khó về port collision, concurrency race condition, build compilation.

---

### Vai Trò 2: Core Developer (Lập Trình Viên Nòng Cốt)
* **Tỷ trọng công việc:** **80% Code — 15% Unit Tests — 5% Viết chú thích mã**.
* **Trách nhiệm chính:**
  1. **Hiện thực hóa Nghiệp vụ (Business Features):** Đảm nhận khối lượng code lớn nhất của đồ án:
     - Xây dựng các REST Controller và Domain Service (`MedicalService`, `AppointmentService`, `TriageService`).
     - Tích hợp gọi API OpenAI GPT-4o / Gemini 1.5 Pro và pipeline xử lý Vision OCR phiếu xét nghiệm.
     - Viết câu truy vấn `pgvector` HNSW Cosine Similarity để tìm kiếm bác sĩ theo triệu chứng.
     - Xây dựng giao diện người dùng React (Patient Chat UI, Tóm tắt bệnh án, Danh sách bác sĩ, Bảng điều khiển).
  2. **Viết Unit & Integration Tests:** Đạt độ bao phủ kiểm thử (Code Coverage) tối thiểu 70% cho các tầng Service then chốt.
  3. **Tuân thủ quy chuẩn Doc Sync:** Khi thêm một API hoặc cột DB mới, Core Dev có trách nhiệm thông báo cho Doc Specialist hoặc tự giác cập nhật tóm tắt vào PR Checklist.

---

### Vai Trò 3: Technical Documentation Specialist & QA Engineer (Chuyên Viên Tài Liệu & Kiểm Thử)
* **Tỷ trọng công việc:** **60% Báo Cáo Luận Văn & Đặc Tả — 25% Kiểm Thử & QA — 15% Code Thực Tế**.
* **Trách nhiệm chính:**
  1. **Chủ trì Báo cáo Khóa luận 5 chương:** Chịu trách nhiệm chính về chất lượng bản in luận văn, slide bảo vệ, sơ đồ Mermaid chuẩn mực trong `docs/` (`DATABASE_DESIGN.md`, `STORYTELLING.md`, `USE_CASES.md`, `CAPSTONE_DEFENSE.md`).
  2. **Kiểm thử chất lượng & Đo đạc tải (QA / Stress Testing):**
     - Viết kịch bản kiểm thử tải bằng **k6** hoặc **Apache JMeter** (chứng minh độ trễ giảm từ $180\text{ms} \rightarrow 12\text{ms}$ khi có cache).
     - Soạn bộ Test Cases kiểm thử chức năng (Functional Testing) và ghi nhận lỗi vào GitHub Issue.
  3. **Đóng góp Code thực tế (15% Code - Đảm bảo commit xanh GitHub):**
     - Viết các file **Seeded Data** (Tạo danh sách 50 bác sĩ mẫu với thông tin chuyên khoa, học vị thực tế).
     - Viết các **Mock Endpoints** và dữ liệu giả lập phản hồi AI khi không có kết nối internet.
     - Chỉnh sửa và trau chuốt các đoạn văn bản hiển thị trên UI (UI Text Copywriting, Banner Disclaimer, hướng dẫn người dùng).
     - Viết các bài kiểm thử tự động End-to-End (E2E) hoặc API Tests trên Postman/Newman.

---

## 2. Ma Trận Phân Quyền RACI (RACI Matrix Theo Hạng Mục)

* **R (Responsible):** Người trực tiếp thực hiện công việc.
* **A (Accountable):** Người chịu trách nhiệm cuối cùng và phê duyệt.
* **C (Consulted):** Người được tham vấn ý kiến kỹ thuật.
* **I (Informed):** Người được thông báo kết quả.

| Hạng Mục Bàn Giao | Tech Lead | Core Dev | Doc Lead / QA |
| :--- | :---: | :---: | :---: |
| **Thiết kế Kiến trúc C4 & Hạ tầng Docker** | **A / R** | C | I |
| **Bảo mật Spring Security, JWT, CORS** | **A / R** | C | I |
| **Backend API (Triage, Appointment, Doctor)** | A | **R** | C |
| **Tích hợp Multimodal AI & pgvector Search** | A | **R** | I |
| **Giao diện người dùng React (UI/UX)** | A | **R** | C |
| **Bộ tài liệu Đặc tả `docs/*.md`** | A | C | **R** |
| **Báo cáo Luận văn Tốt nghiệp 5 Chương** | A | C | **R** |
| **Kịch bản Kiểm thử Tải & Seed Data** | A | C | **R** |
| **Slide Thuyết Trình & Live Demo Hội Đồng** | **A** | R | **R** |

---

## 3. Tiêu Chuẩn Hoàn Thành Của Một Tính Năng (Definition of Done - DoD)

Một tính năng chỉ được xem là "HOÀN TẤT" khi và chỉ khi thỏa mãn đồng thời 5 điều kiện sau:
1. Mã nguồn được viết theo chuẩn Clean Code, không có code thừa hoặc `console.log`.
2. Unit tests chạy thành công, frontend build 0 lỗi TypeScript (`npm run build`).
3. Các tệp tài liệu tương ứng trong thư mục `docs/` đã được đồng bộ nội dung.
4. Tạo Pull Request trên GitHub với đầy đủ mô tả theo mẫu PR Template.
5. Tech Lead đã review và nhấn nút **Approve & Merge**.
