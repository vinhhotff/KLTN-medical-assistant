## 📌 Mô Tả Thay Đổi (Pull Request Summary)
<!-- Tóm tắt ngắn gọn mục tiêu của PR và các thay đổi chính trong code -->

## 🔗 Liên Kết Issue / Use Case
- Liên kết Use Case: `UC-CLIN-0x` hoặc Issue: `#xxx`

---

## 👥 Vai Trò Thực Hiện (Team Role)
- [ ] **Tech Lead / Architect** (Core framework, Architecture, Security, Review)
- [ ] **Core Developer** (Business feature, UI, API implementation)
- [ ] **Doc Specialist / QA** (Documentation, Test fixtures, Mock data, UI copy)

---

## 📋 Bắt Buộc Đồng Bộ Tài Liệu (Mandatory Documentation Checklist)
> **Quy định bất di bất dịch của dự án:** Mọi PR thay đổi logic, cơ sở dữ liệu hoặc giao diện ĐỀU PHẢI đồng bộ tài liệu tương ứng trước khi được duyệt merge!

- [ ] **`docs/DATABASE_DESIGN.md`**: Đã cập nhật nếu có thay đổi bảng, trường, index, hoặc query vector.
- [ ] **`docs/USE_CASES.md`**: Đã cập nhật nếu có API mới, thay đổi luồng nghiệp vụ hoặc validation.
- [ ] **`docs/STORYTELLING.md`**: Đã cập nhật nếu có thay đổi về trải nghiệm lâm sàng, persona người dùng.
- [ ] **`docs/CAPSTONE_DEFENSE.md`**: Đã cập nhật nếu tính năng mới cần đưa vào kịch bản Live Demo hoặc Q&A Hội đồng.
- [ ] *Không có tài liệu nào bị ảnh hưởng bởi thay đổi này.*

---

## 🧪 Kết Quả Kiểm Thử (Verification)
- [ ] **Backend Tests**: Đã chạy `mvn test` $\rightarrow$ Tất cả các unit test đều PASS.
- [ ] **Frontend Build**: Đã chạy `npm run build` $\rightarrow$ Build thành công trong `frontend/` (0 TS error).
- [ ] **Container Health**: Đã kiểm tra Docker (`mediassist_postgres:5433` & `mediassist_redis:6379`) hoạt động bình thường.
- [ ] **Self-Review**: Đã tự rà soát code, không để lọt `console.log` thừa, token bí mật hoặc TODO chưa giải quyết.

---

## 🛡️ Phê Duyệt Của Tech Lead
- [ ] Tech Lead đã review và chấp thuận merge vào nhánh chính.
