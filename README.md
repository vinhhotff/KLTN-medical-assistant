# MediAssist-AI: Nền Tảng Khám Bệnh Từ Xa Tích Hợp AI Phân Luồng & Tóm Tắt Bệnh Án
## Enterprise-Grade Resilient Telehealth Platform with Multimodal Clinical AI

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot 3.4](https://img.shields.io/badge/Spring_Boot-3.4.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-Two_Layer_Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![React 19](https://img.shields.io/badge/React-19%20%2B%20Vite%20%2B%20TS-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Zero_Config_Dev-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> **Kho lưu trữ chính thức:** [github.com/vinhhotff/KLTN-medical-assistant](https://github.com/vinhhotff/KLTN-medical-assistant.git)  
> **Đề tài Khóa Luận Tốt Nghiệp:** Kỹ Sư Kỹ Thuật Phần Mềm & Trí Tuệ Nhân Tạo (SE-AI)  
> **Định hướng kỹ thuật:** Chuẩn doanh nghiệp thực chiến, độ ổn định tuyệt đối (No downtime / Zero crash), cơ chế bộ nhớ đệm 2 lớp (Two-Layer Cache L1 Caffeine + L2 Redis), tìm kiếm bác sĩ theo ngữ nghĩa triệu chứng với `pgvector`, và hệ thống rào chắn an toàn y tế nghiêm ngặt (Hard Red-Flag Guardrail).

---

## 📑 Mục Lục Điều Hướng Nhanh

- [1. Bối Cảnh Thực Tế & Câu Chuyện Sản Phẩm](#1-bối-cảnh-thực-tế--câu-chuyện-sản-phẩm)
- [2. Kiến Trúc Kỹ Thuật & Luồng Dữ Liệu](#2-kiến-trúc-kỹ-thuật--luồng-dữ-liệu)
- [3. Trung Tâm Tài Liệu Chuyên Sâu (Documentation Suite)](#3-trung-tâm-tài-liệu-chuyên-sâu-documentation-suite)
- [4. Phân Bổ Nhân Sự & Trách Nhiệm Nhóm (Team Workflow)](#4-phân-bổ-nhân-sự--trách-nhiệm-nhóm-team-workflow)
- [5. Hướng Dẫn Cài Đặt & Chạy Hệ Thống Trong 3 Phút](#5-hướng-dẫn-cài-đặt--chạy-hệ-thống-trong-3-phút)
- [6. Quy Chuẩn Đóng Góp & Chỉ Thị Cho AI Assistant](#6-quy-chuẩn-đóng-góp--chỉ-thị-cho-ai-assistant)

---

## 1. Bối Cảnh Thực Tế & Câu Chuyện Sản Phẩm

Tại Việt Nam, các bệnh viện công tuyến cuối (Bạch Mai, Chợ Rẫy, ĐHYD) luôn trong tình trạng quá tải nghiêm trọng. Hàng ngàn bệnh nhân phải chen chúc xếp hàng từ 4 giờ sáng nhưng thời gian được bác sĩ tư vấn trực tiếp chỉ vỏn vẹn 3-5 phút. Khi cầm kết quả xét nghiệm với vô số thuật ngữ viết tắt khó hiểu, người bệnh rơi vào hoang mang hoặc tra cứu mạng dẫn đến tự ý dùng sai thuốc.

**MediAssist-AI ra đời giải quyết 3 bài toán lớn:**
1. **Phân Luồng Thông Minh (AI Triage):** Thu thập lời khai triệu chứng ban đầu, kích hoạt cảnh báo đỏ cấp cứu nếu có dấu hiệu nguy kịch, hoặc hướng dẫn bệnh nhân đến đúng chuyên khoa phù hợp.
2. **Bình Dân Hóa Ngôn Ngữ Bệnh Án (Multimodal Document Summarizer):** Dùng AI đa phương thức đọc ảnh chụp kết quả xét nghiệm và giải thích bằng ngôn ngữ đại chúng dễ hiểu kèm lời khuyên ăn uống, nghỉ ngơi.
3. **Tìm Kiếm Bác Sĩ Chuẩn Ngữ Nghĩa (`pgvector`):** Khớp nối triệu chứng của người bệnh với tiểu sử lâm sàng sâu của bác sĩ bằng khoảng cách vector cosine.

---

## 2. Kiến Trúc Kỹ Thuật & Luồng Dữ Liệu

Dự án áp dụng mô hình **Modular Monolith** kết hợp kiến trúc phân tầng chịu tải cao:

```
[ Bệnh Nhân / Bác Sĩ / Quản Trị Viên ]
                  │
                  ▼ (HTTPS / TLS 1.3 - Dual Auth: HttpOnly Cookie + Bearer)
[ React 19 Single Page App ] ─── Tailwind CSS + Lucide Icons + Zustand Store
                  │
                  ▼
[ Java 21 / Spring Boot 3.4.x Enterprise Core ]
    ├── Security Pipeline (Stateless JWT, Bcrypt cost 12, RBAC Guard)
    ├── Two-Layer Cache Manager
    │     ├── L1 Cache: In-Memory Caffeine (< 1ms)
    │     └── L2 Cache: Distributed Redis 6379 (1 - 3ms)
    ├── Clinical AI Orchestrator (Hard Red-Flag Regex + Multimodal LLM Gateway)
    └── Persistence Layer (HikariCP Pool)
                  │
                  ▼
[ PostgreSQL 16 + pgvector Extension ]
    ├── 3NF Relational Tables (Users, Doctors, Appointments, Audit Logs)
    └── HNSW Vector Index (1536-dim Cosine Similarity Search)
```

---

## 3. Trung Tâm Tài Liệu Chuyên Sâu (Documentation Suite)

Dự án được tài liệu hóa toàn diện chuẩn doanh nghiệp và đáp ứng thang điểm xuất sắc của Hội đồng Khóa luận:

| Tài Liệu | Nội Dung Trọng Tâm | Đường Dẫn |
| :--- | :--- | :---: |
| **Kiến Trúc Tổng Thể** | Đặc tả kiến trúc Modular Monolith, hạ tầng, SLA, cấu hình phân tán | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Thiết Kế Cơ Sở Dữ Liệu** | DDL đầy đủ 8 bảng, sơ đồ Mermaid ERD, HNSW vector search, HikariCP pool | [`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md) |
| **Bối Cảnh & Storytelling** | Nỗi đau thực tế y tế VN, chân dung người dùng (Personas), đạo đức AI | [`docs/STORYTELLING.md`](./docs/STORYTELLING.md) |
| **Đặc Tả Use Cases** | 7 Use Cases chuẩn RUP/IEEE 830, luồng sự kiện chính, luồng cấp cứu | [`docs/USE_CASES.md`](./docs/USE_CASES.md) |
| **Cẩm Nang Bảo Vệ Luận Văn** | Đề cương 5 chương, kịch bản thuyết trình 15p, live demo checklist, Top 10 Q&A | [`docs/CAPSTONE_DEFENSE.md`](./docs/CAPSTONE_DEFENSE.md) |
| **Quy Chế Làm Việc Nhóm** | Phân chia 3 vai trò, ma trận trách nhiệm RACI, tiêu chuẩn DoD | [`docs/TEAM_WORKFLOW.md`](./docs/TEAM_WORKFLOW.md) |
| **Chỉ Thị AI Coding** | Quy tắc bắt buộc AI phải bám sát kiến trúc và tự động cập nhật tài liệu | [`AGENTS.md`](./AGENTS.md) |

---

## 4. Phân Bổ Nhân Sự & Trách Nhiệm Nhóm (Team Workflow)

Để bảo đảm mọi thành viên đều có đóng góp mã nguồn trên GitHub nhưng vẫn hoàn thiện xuất sắc báo cáo luận văn:

* **👨‍💻 Vai trò 1: Tech Lead & Solution Architect (30% Code — 50% Review & Kiến Trúc — 20% Quản lý):**
  - Chịu trách nhiệm về độ ổn định hệ thống, duyệt PR, cấu hình Docker, Security và lõi Two-Layer Cache.
* **⚡ Vai trò 2: Core Developers (80% Code — 15% Unit Tests — 5% Báo cáo):**
  - Lập trình các tính năng chính: AI Triage, Vision OCR tóm tắt phiếu khám, Vector Search, Luồng đặt lịch, Giao diện React.
* **📝 Vai trò 3: Doc Lead & QA Specialist (15% Code — 25% QA/Test — 60% Tài Liệu & Luận Văn):**
  - Chủ trì viết báo cáo luận văn 5 chương, slide thuyết trình, kịch bản kiểm thử tải k6/JMeter, dữ liệu Seeded Data mẫu và các mock fixtures.

---

## 5. Hướng Dẫn Cài Đặt & Chạy Hệ Thống Trong 3 Phút

### Yêu Cầu Môi Trường:
- Docker Desktop (hỗ trợ Docker Compose)
- JDK 21+ (Đã cấu hình `JAVA_HOME`)
- Apache Maven 3.9+
- Node.js v20+ & npm

### Bước 1: Khởi động Hạ tầng Docker (PostgreSQL pgvector & Redis)
```bash
docker compose up -d
```
*Ghi chú:* PostgreSQL lắng nghe trên cổng nội bộ `5433` (tránh xung đột với Postgres gốc trên máy), Redis lắng nghe trên `6379`.

### Bước 2: Khởi động Backend Spring Boot
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
*Backend API chạy tại:* `http://localhost:5000`  
*Kiểm tra trạng thái sức khỏe:* `http://localhost:5000/api/v1/health/ready`

### Bước 3: Khởi động Frontend Vite SPA
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend chạy tại:* `http://localhost:5173`

---

## 6. Quy Chuẩn Đóng Góp & Chỉ Thị Cho AI Assistant

* **Quy chuẩn Git:** Tuân thủ [`CONTRIBUTING.md`](./CONTRIBUTING.md) với chuẩn nhánh `feature/UC-xx` và Conventional Commits.
* **Quy tắc Bắt Buộc Đồng Bộ Tài Liệu (Mandatory Doc Sync):** Bất kỳ PR hoặc phiên sinh code nào của AI Assistant thay đổi Schema DB, Endpoint API, hoặc UI thì **BẮT BUỘC** phải cập nhật các file tương ứng trong `docs/`.
* **Chỉ thị cho AI Assistant:** Vui lòng đọc kỹ [`AGENTS.md`](./AGENTS.md) và [`GEMINI.md`](./GEMINI.md).
