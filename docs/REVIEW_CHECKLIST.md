# Bảng Hướng Dẫn & Checklist Kiểm Duyệt Dành Cho Tech Lead (REVIEW_CHECKLIST.md)
## MediAssist-AI Architecture & Code Review Protocol

> **Dành cho:** **Tech Lead & Solution Architect**  
> **Tần suất sử dụng:** Mỗi khi nhận được thông báo Pull Request trên GitHub hoặc sau khi AI Assistant hoàn thành một phiên code.

---

## ⚡ Quy Trình Kiểm Duyệt 5 Bước Nhanh (5-Minute Review Protocol)

```
[ BƯỚC 1: ĐỌC NHẬT KÝ ] ──► Xem mục mới nhất tại docs/WORK_LOG.md
            │
[ BƯỚC 2: KIỂM TRA DOCS ] ──► Đối chiếu docs/DATABASE_DESIGN.md, USE_CASES.md
            │
[ BƯỚC 3: RÀ SOÁT CODE ] ──► Xem git diff (Không vi phạm kiến trúc Modular Monolith)
            │
[ BƯỚC 4: XÁC THỰC LỆNH ] ──► Chạy mvn test & npm run build (0 lỗi)
            │
[ BƯỚC 5: PHÊ DUYỆT PR ] ──► Bấm Approve & Merge trên GitHub
```

---

## 📋 Checklist Kiểm Tra Chi Tiết

### 1. Kiến Trúc & Thiết Kế (Architecture Integrity)
- [ ] Mã nguồn có giữ đúng mô hình **Modular Monolith** không? (Không tự ý tạo microservice riêng biệt khi chưa có quyết định kiến trúc).
- [ ] Các truy vấn đọc nhiều (Specialty, Config, User Profile) có đi qua **Two-Layer Cache** (`TwoLayerCacheService`: L1 Caffeine + L2 Redis) không?
- [ ] Truy vấn vector có sử dụng toán tử Cosine Distance `<=>` trên `pgvector` HNSW index không?
- [ ] Không sử dụng annotation Lombok nếu gây lỗi tương thích trên JDK 25; các DTO và Entity được viết rõ ràng.

### 2. Cơ Sở Dữ Liệu & Giao Dịch (Database & Transactions)
- [ ] Các bảng mới có khóa chính UUID hoặc BigInt, có chỉ mục (Index) trên các trường `email`, `role`, `status` không?
- [ ] Các thao tác đặt lịch hẹn (`appointments`) có cơ chế chống race condition (Unique Partial Index hoặc `@Version` Optimistic Lock) không?
- [ ] Nếu có thay đổi bảng/cột: **Đã cập nhật vào [`docs/DATABASE_DESIGN.md`](file:///docs/DATABASE_DESIGN.md) chưa?**

### 3. Bảo Mật & Rào Chắn Y Tế (Security & Clinical Safety)
- [ ] Các endpoint riêng tư có được bảo vệ qua `@PreAuthorize("hasRole('ADMIN')")` hoặc `hasRole('DOCTOR')` không?
- [ ] API công khai có nằm trong danh sách `permitAll()` tại `SecurityConfig.java` không?
- [ ] Trên giao diện bệnh nhân, thanh cảnh báo **Medical Disclaimer Banner** có luôn xuất hiện không?
- [ ] Tính năng AI Triage có bộ lọc **Red-Flag cấp cứu cứng** (regex) ngắt cuộc gọi LLM khi có dấu hiệu nguy kịch không?

### 4. Chất Lượng Mã Nguồn & Kiểm Thử (Code Quality & Tests)
- [ ] Frontend: `npm run build` trong `frontend/` đạt **0 lỗi TypeScript / lint**.
- [ ] Backend: `mvn test` trong `backend/` vượt qua **100% unit tests**.
- [ ] Không có `console.log` thừa, không có API Key / Secret hardcode trong mã nguồn.

### 5. Tính Đầy Đủ Của Hồ Sơ Khóa Luận (Capstone Documentation)
- [ ] Tệp [`docs/WORK_LOG.md`](file:///docs/WORK_LOG.md) đã được bổ sung bản ghi cho phiên làm việc này.
- [ ] Nếu tính năng mới phục vụ bảo vệ đồ án: Đã được bổ sung vào kịch bản Live Demo hoặc Q&A trong [`docs/CAPSTONE_DEFENSE.md`](file:///docs/CAPSTONE_DEFENSE.md).

---

## 🛠️ Lệnh Kiểm Tra Nhanh Một Chạm Dành Cho Tech Lead

Khi ngồi tại máy trạm, Tech Lead có thể mở PowerShell và chạy nhanh:

```powershell
# 1. Kiểm tra trạng thái Git và xem log 3 commit gần nhất
git status
git log -n 3 --oneline

# 2. Kiểm tra sức khỏe Backend thời gian thực
Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/health/ready'

# 3. Kiểm tra toàn bộ Unit Test Backend
cd backend; mvn test; cd ..

# 4. Kiểm tra biên dịch Frontend
cd frontend; npm run build; cd ..
```
