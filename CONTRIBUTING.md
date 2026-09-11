# Quy Chuẩn Đóng Góp & Quy Trình Làm Việc Nhóm (CONTRIBUTING.md)
## MediAssist-AI Engineering & Collaboration Guidelines

> **Áp dụng cho:** Toàn bộ thành viên trong nhóm làm đồ án Khóa Luận Tốt Nghiệp / Dự Án Doanh Nghiệp MediAssist-AI.  
> **Kho lưu trữ:** `https://github.com/vinhhotff/KLTN-medical-assistant.git`

---

## 1. Chiến Lược Phân Nhánh Git (Git Branching Strategy)

Hệ thống áp dụng mô hình biến thể tinh gọn của **Git Flow** nhằm đảm bảo mã nguồn nhánh chính luôn ở trạng thái "Deployable / Demo-Ready" bất kỳ lúc nào Hội đồng gọi tên.

```
master (bảo vệ luận văn / production)
  │
  ├── develop (nhánh tích hợp chung)
        │
        ├── feature/UC-02-symptom-triage       (Core Dev)
        ├── feature/UC-03-document-summarizer   (Core Dev)
        ├── bugfix/issue-08-auth-redirect       (Tech Lead / Dev)
        └── docs/chapter-3-system-design        (Doc Specialist)
```

### Quy tắc đặt tên nhánh:
* **Tính năng mới:** `feature/<Mã-Use-Case>-<tên-ngắn>`  
  *(Ví dụ: `feature/UC-02-symptom-triage`, `feature/UC-04-pgvector-search`)*
* **Sửa lỗi:** `bugfix/<Mã-Issue>-<tên-lỗi>`  
  *(Ví dụ: `bugfix/issue-14-cors-header`, `bugfix/admin-session-redirect`)*
* **Tài liệu & Báo cáo:** `docs/<tên-nội-dung>`  
  *(Ví dụ: `docs/database-spec-v2`, `docs/capstone-thesis-chapter-4`)*
* **Tái cấu trúc & Nâng cấp hạ tầng:** `chore/<tên-nhiệm-vụ>` hoặc `refactor/<tên-nhiệm-vụ>`

> [!WARNING]
> **TUYỆT ĐỐI KHÔNG** commit trực tiếp vào nhánh `master` hoặc `develop`. Mọi thay đổi bắt buộc phải đi qua **Pull Request (PR)** có ít nhất sự đồng thuận và phê duyệt của **Tech Lead**.

---

## 2. Quy Chuẩn Commit (Conventional Commits Standard)

Mọi commit message phải tuân thủ nghiêm ngặt định dạng chuẩn công nghiệp:

```
<type>(<scope>): <mô tả ngắn gọn bằng tiếng Anh hoặc tiếng Việt không dấu>
```

### Các tiền tố (Types) bắt buộc:
* `feat`: Thêm tính năng mới (Ví dụ: `feat(triage): integrate LLM red-flag safety filter`)
* `fix`: Sửa lỗi hệ thống (Ví dụ: `fix(auth): prevent admin redirect loop on sub-routes`)
* `docs`: Cập nhật tài liệu (Ví dụ: `docs(db): add pgvector HNSW index specification`)
* `refactor`: Tái cấu trúc mã nguồn không làm đổi logic (Ví dụ: `refactor(cache): optimize TwoLayerCache fallback`)
* `test`: Thêm hoặc sửa unit test (Ví dụ: `test(auth): add Mockito unit test for JwtFilter`)
* `chore`: Cập nhật cấu hình, Docker, Maven, NPM (Ví dụ: `chore(docker): map postgres port to 5433`)

---

## 3. Quy Định Bất Di Bất Dịch: Bắt Buộc Đồng Bộ Tài Liệu (Doc Sync Rule)

Khi một lập trình viên tạo PR hoặc AI sinh code, nếu có thay đổi liên quan đến các thành phần sau, **BẮT BUỘC** phải cập nhật các file markdown tương ứng trong cùng PR đó:

1. **Cơ sở dữ liệu (Database / Entities / Migrations):**
   - Phải cập nhật [`docs/DATABASE_DESIGN.md`](file:///docs/DATABASE_DESIGN.md).
2. **Nghiệp vụ / API Endpoints (Controllers / Use Cases):**
   - Phải cập nhật [`docs/USE_CASES.md`](file:///docs/USE_CASES.md).
3. **Bối cảnh sản phẩm, đối tượng người dùng, tuyên bố y tế:**
   - Phải cập nhật [`docs/STORYTELLING.md`](file:///docs/STORYTELLING.md).
4. **Kịch bản Demo, câu hỏi phản biện bảo vệ đồ án:**
   - Phải cập nhật [`docs/CAPSTONE_DEFENSE.md`](file:///docs/CAPSTONE_DEFENSE.md).

---

## 4. Quy Trình Kiểm Thử Cục Bộ Trước Khi Đẩy Mã (Local Pre-push Verification)

Trước khi thực hiện `git push`, mỗi thành viên bắt buộc phải tự chạy các lệnh kiểm thử sau trên máy mình:

```bash
# 1. Kiểm tra Backend (Tất cả Unit Tests phải màu xanh)
cd backend
mvn test

# 2. Kiểm tra Frontend (Đảm bảo 0 lỗi TypeScript và build thành công)
cd ../frontend
npm run build
```

Nếu một trong hai bước trên báo lỗi đỏ, **KHÔNG ĐƯỢC PHÉP TẠO PR** cho đến khi giải quyết triệt để lỗi biên dịch.

---

## 5. Quy Trình Review PR Của Tech Lead

1. Tech Lead nhận được thông báo PR trên GitHub.
2. Kiểm tra Checklist trong PR Description:
   - Code có tuân thủ kiến trúc Modular Monolith không?
   - Có tự ý thêm thư viện lạ / microservices thừa thãi không?
   - Đã cập nhật file trong thư mục `docs/` chưa?
3. Nếu đạt chuẩn: Tech Lead duyệt **Approve** và thực hiện **Squash and Merge** để giữ lịch sử git gọn gàng.
4. Nếu chưa đạt: Để lại comment cụ thể chỉ ra dòng code cần sửa.
