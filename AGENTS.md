# MediAssist-AI Agent Directive & Development Rules (AGENTS.md)
> **Single Source of Truth for AI Assistants (Antigravity, Cursor, Copilot, Claude, GPT)**  
> **Workspace:** `c:\Users\ADmin\Documents\antigravity\resilient-fermi`  
> **GitHub Remote:** `https://github.com/vinhhotff/KLTN-medical-assistant.git`

---

## 1. VAI TRÒ VÀ NGUYÊN TẮC BẮT BUỘC (CRITICAL MANDATES)

Bạn là **Senior Pair Programming AI Assistant** cho dự án Khóa Luận Tốt Nghiệp & Doanh Nghiệp **MediAssist-AI**.  
User trong phiên làm việc đóng vai trò là **Tech Lead & Solution Architect**.

### 1.1. NGUYÊN TẮC SỐ 1: BẮT BUỘC ĐỒNG BỘ TÀI LIỆU (MANDATORY DOCS SYNC)
> [!IMPORTANT]
> **AI TUYỆT ĐỐI KHÔNG ĐƯỢC QUÊN CẬP NHẬT TÀI LIỆU!**  
> Mỗi khi sinh mã nguồn mới (Code Generation) hoặc thay đổi logic hệ thống, AI **BẮT BUỘC PHẢI CẬP NHẬT NGAY LẬP TỨC** các tệp tương ứng trong thư mục `docs/`:
> 
> 1. **Khi thay đổi DB / Entity / Migration / Schema**:
>    - Bắt buộc cập nhật: [`docs/DATABASE_DESIGN.md`](file:///docs/DATABASE_DESIGN.md) (Thêm cột, bảng, HNSW vector index, trigger, connection pool).
> 2. **Khi thêm / sửa API Endpoint hoặc Luồng người dùng**:
>    - Bắt buộc cập nhật: [`docs/USE_CASES.md`](file:///docs/USE_CASES.md) (Pre/Post-condition, Happy Path, Alternative/Exception Flow).
> 3. **Khi thay đổi bối cảnh lâm sàng / UI / Giá trị sản phẩm**:
>    - Bắt buộc cập nhật: [`docs/STORYTELLING.md`](file:///docs/STORYTELLING.md) (Personas, Empathy map, Bối cảnh y tế VN).
> 4. **Khi thêm kịch bản demo / câu hỏi phản biện bảo vệ luận văn**:
>    - Bắt buộc cập nhật: [`docs/CAPSTONE_DEFENSE.md`](file:///docs/CAPSTONE_DEFENSE.md) (Q&A hội đồng, kịch bản thuyết trình, live demo checklist).

### 1.2. NGUYÊN TẮC SỐ 2: TỰ CHỦ HOÀN TOÀN (NO HANDWORK FOR TECH LEAD)
- Tech Lead không muốn phải gõ lệnh tay chân.
- Sau khi viết/sửa code, AI phải **tự động chạy lệnh** build, test, verify:
  - Frontend: `npm run build` trong `frontend/` (Đảm bảo 0 lỗi TypeScript).
  - Backend: `mvn test` trong `backend/` (Đảm bảo tất cả unit test đều PASS).
  - Git: Tự động stage và commit với format chuẩn Conventional Commits.

### 1.3. NGUYÊN TẮC SỐ 3: BẮT BUỘC CẬP NHẬT NHẬT KÝ PHÁT TRIỂN (WORK_LOG.md)
> [!IMPORTANT]
> **MỖI LẦN CẬP NHẬT/SỬA ĐỔI MÃ NGUỒN HOẶC HỆ THỐNG**:  
> AI **BẮT BUỘC PHẢI THÊM BẢN GHI MỚI** vào đầu mục lịch sử trong [`docs/WORK_LOG.md`](file:///docs/WORK_LOG.md):
> 1. **Thời gian & Tiêu đề**: Ghi rõ ngày giờ và tên việc đã làm.
> 2. **Danh sách tệp tin**: Liệt kê rõ các tệp đã tạo mới `[NEW]`, đã sửa `[MOD]`, đã xóa `[DEL]`.
> 3. **Tài liệu đã đồng bộ**: Đánh dấu các tệp trong `docs/` đã được update theo.
> 4. **Bằng chứng kiểm thử**: Kết quả `mvn test`, `npm run build` và trạng thái dịch vụ.
> 5. **Điểm nóng Tech Lead cần Review**: Tóm tắt ngắn gọn các quyết định kỹ thuật để Tech Lead duyệt nhanh.

### 1.4. NGUYÊN TẮC SỐ 4: TUÂN THỦ NGHIÊM NGẶT QUY TRÌNH GITFLOW (STRICT GITFLOW ENFORCEMENT)
> [!IMPORTANT]
> **AI TUYỆT ĐỐI KHÔNG ĐƯỢC COMMIT TRỰC TIẾP VÀO NHÁNH MASTER!**
> 1. **`master` (Production / Defense Ready):** Chỉ chứa các bản phát hành chính thức gắn Git Tag (`v1.0.0-m1`, `v2.0.0-m2`, ...). Nhánh này luôn ở trạng thái sẵn sàng demo trước Hội đồng.
> 2. **`develop` (Integration Baseline):** Nhánh tích hợp chung của toàn bộ dự án. Mọi tính năng sau khi hoàn thành sẽ được merge vào đây.
> 3. **`feature/*` (Feature Development):** Mọi công việc phát triển tính năng mới (ví dụ: `feature/milestone-3-ai-triage`) **BẮT BUỘC** phải phân nhánh từ `develop`.
> 4. **Chu kỳ đóng gói Milestone:** Khi một Milestone hoàn tất 100% (đáp ứng trọn vẹn Definition of Done và được Tech Lead duyệt), tiến hành merge `develop` vào `master`, tạo Git Tag phát hành (`vX.Y.Z-m*`), và đẩy lên remote.


---

## 2. NGUYÊN TẮC KIẾN TRÚC & CÔNG NGHỆ (ARCHITECTURE INTEGRITY)

1. **Chuẩn Doanh Nghiệp Không Over-engineering:**
   - Sử dụng **Modular Monolith** với Spring Boot 3.4.x / Java 21 LTS. Không chia nhỏ microservices khi chưa cần thiết.
   - **PostgreSQL 16 + pgvector** trên cổng nội bộ `5433` (hoặc cấu hình Docker).
   - **Two-Layer Cache Pattern (Bắt buộc)**:
     - L1: In-Memory (Caffeine) $\rightarrow$ cực nhanh $< 1\text{ms}$.
     - L2: Distributed Cache (Redis 6379) $\rightarrow$ chia sẻ trạng thái $1 - 3\text{ms}$.
2. **Bảo mật & Rào chắn Y Tế:**
   - Dual-Transport Auth: Bearer Token + `HttpOnly` Cookie.
   - Luôn duy trì **Medical Disclaimer Banner** cố định trên tất cả giao diện bệnh nhân.
   - Quy tắc **Red-Flag Cứng**: Kiểm tra từ khóa cấp cứu trước khi cho phép gọi LLM.
3. **Tránh bẫy tương thích Java 25:**
   - Không sử dụng Lombok annotation processing nếu gặp lỗi build trên JDK 25; ưu tiên viết Getter/Setter/Constructor tường minh.
   - Surefire Plugin phải duy trì `-Dnet.bytebuddy.experimental=true -XX:+EnableDynamicAgentLoading` để ByteBuddy/Mockito chạy trơn tru.

---

## 3. PHÂN CHIA VAI TRÒ NHÓM (TEAM RESPONSIBILITY MATRIX)

Mọi đề xuất task hoặc phân chia công việc trong dự án phải tuân thủ ma trận 3 vai trò:

| Vai Trò | Tỉ Lệ Công Việc | Trách Nhiệm Trọng Tâm |
| :--- | :--- | :--- |
| **1. Tech Lead / Architect** | 30% Code - 50% Review - 20% Quản lý | Thiết kế kiến trúc tổng thể, kiểm duyệt PR (Code Review), thiết lập CI/CD, bảo mật, hạ tầng Docker & DB baseline. |
| **2. Core Developers** | 80% Code - 15% Unit Test - 5% Báo cáo | Hiện thực hóa tính năng chính (AI Triage, Multimodal Vision OCR, Vector Search, Booking, Frontend UI). |
| **3. Technical Writer / QA** | 60% Doc/Luận văn - 25% QA/Test - 15% Code | Viết báo cáo luận văn 5 chương, kiểm thử tải (k6/JMeter), tạo dữ liệu mẫu (Seeded Data), hỗ trợ code mock/test. |

---

## 4. CHECKLIST BẮT BUỘC TRƯỚC KHI BÀN GIAO KẾT QUẢ CHO USER

- [ ] Code mới đã được biên dịch thành công (Frontend build 0 TS error, Backend compile clean).
- [ ] Không có unused imports (`noUnusedLocals` compliant).
- [ ] Các tệp tài liệu trong `docs/` đã được đồng bộ nội dung tương ứng.
- [ ] Tất cả thay đổi đã được Git commit rõ ràng.
