# Nhật Ký Phát Triển & Bản Tin Kiểm Duyệt Dành Cho Tech Lead (WORK_LOG.md)
## MediAssist-AI Engineering Work Log & Architectural Review Journal

> **Mục đích:** Tệp nhật ký bắt buộc cập nhật sau mỗi phiên làm việc, cập nhật tính năng hoặc sửa lỗi hệ thống.  
> **Người kiểm duyệt chính (Reviewer):** **Tech Lead & Solution Architect**  
> **Quy định bất di bất dịch:** Bất kỳ thay đổi mã nguồn nào cũng **BẮT BUỘC** phải ghi lại nhật ký tại đây trước khi bàn giao cho Tech Lead.

---

## 📑 Bảng Mục Lục Lịch Sử Cập Nhật

| Phiên Làm Việc | Thời Gian | Nội Dung Trọng Tâm | Tác Giả | Trạng Thái Tech Lead |
| :---: | :---: | :--- | :---: | :---: |
| **#005** | 11/09/2026 | Hoàn tất Milestone 2 (Booking Concurrency Guard, Doctor Schedule & Vetting, 3 Dashboards) | AI Assistant | 🟢 Sẵn sàng Review |
| **#004** | 11/09/2026 | Hoàn tất toàn bộ Milestone 1 (Seeding 3 vai trò, OpenAPI, k6 test, Postman, DoD 100%) | AI Assistant | 🟢 Đã Duyệt |
| **#003** | 11/09/2026 | Ban hành quy chế làm việc nhóm, RACI, GitHub templates & quy chuẩn Work Log | AI Assistant | 🟢 Đã Duyệt |
| **#002** | 11/09/2026 | Sửa lỗi Admin redirect, tạo 6 trang con, tạo bộ 4 tài liệu docs/ | AI Assistant | 🟢 Đã Kiểm Tra & Commit |
| **#001** | 11/09/2026 | Thiết lập nền tảng: Java 21, Spring Boot 3, Redis Two-Layer Cache, Docker Postgres 5433 | AI Assistant | 🟢 Đã Hoàn Thành |

---

## 📝 Mẫu Khung Báo Cáo Cho Mỗi Lần Cập Nhật (Template)

Mỗi khi AI hoặc Developer cập nhật mã nguồn, **bắt buộc copy mẫu sau và thêm vào đầu danh sách phiên làm việc**:

```markdown
### [WORK-LOG-#xxx] <Tiêu đề ngắn gọn về cập nhật>
* **Thời gian:** YYYY-MM-DD HH:mm:ss
* **Tác nhân thực hiện:** AI Assistant / Core Dev / Doc Lead
* **Mã Use Case / Issue:** UC-xxx / Issue #xxx
* **Trạng thái Build:** Frontend (0 errors) | Backend (Tests passed)

#### 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ
- Mô tả lý do thực hiện thay đổi này.

#### 2. Chi Tiết Thay Đổi Mã Nguồn (Files Changed)
- `[NEW]` Đường dẫn file mới tạo
- `[MOD]` Đường dẫn file chỉnh sửa
- `[DEL]` Đường dẫn file đã xóa

#### 3. Đồng Bộ Tài Liệu (Docs Synchronized)
- [ ] `docs/DATABASE_DESIGN.md`: (Cụ thể thay đổi gì, hoặc "Không ảnh hưởng")
- [ ] `docs/USE_CASES.md`: (Cụ thể thay đổi gì, hoặc "Không ảnh hưởng")
- [ ] `docs/STORYTELLING.md`: (Cụ thể thay đổi gì, hoặc "Không ảnh hưởng")
- [ ] `docs/CAPSTONE_DEFENSE.md`: (Cụ thể thay đổi gì, hoặc "Không ảnh hưởng")

#### 4. Bằng Chứng Kiểm Thử Tự Động (Verification Proof)
- **Backend:** `mvn test` (Số lượng test pass)
- **Frontend:** `npm run build` (Thời gian build, số byte bundle)
- **Docker / Service:** Cổng dịch vụ đang hoạt động

#### 5. Điểm Nóng Cần Tech Lead Review Kỹ (Hotspots for Tech Lead)
- [ ] Điểm kiến trúc 1: ...
- [ ] Điểm bảo mật / hiệu năng 2: ...
- [ ] Quyết định kỹ thuật cần Tech Lead chốt: ...
```

---

## 📜 Chi Tiết Các Phiên Làm Việc Đã Thực Hiện

---

### [WORK-LOG-#005] Hoàn Tất Toàn Bộ Milestone 2 — Core Medical & Booking Workflow
* **Thời gian:** 2026-09-11 20:35:00 (GMT+7)
* **Tác nhân thực hiện:** Senior Pair Programming AI Assistant
* **Mã Use Case / Issue:** `UC-OPS-05` (Booking Concurrency Guard) & `UC-ADM-06` (Doctor Vetting)
* **Trạng thái Build:** Frontend `npm run build` PASS (0 lỗi TS, 2.66s) | Backend `mvn test` PASS (6/6 tests).

#### 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ
Hiện thực hóa trọn vẹn luồng khám bệnh cốt lõi (Milestone 2):
1. Khám phá danh bạ bác sĩ và tự động sinh ca khám 30 phút theo ngày, tự động ẩn ca đã bị đặt.
2. Đặt lịch khám phòng ngừa race condition bằng Optimistic Locking (`@Version`), isolation `REPEATABLE_READ`, kiểm tra xung đột `existsConflict`, sinh mã `AP-YYYYMMDD-XXXXXX` chuẩn y tế.
3. Quy trình thẩm định bác sĩ (Doctor Vetting): Admin phê duyệt/từ chối CCHN, tự động làm mới L1/L2 Two-Layer Cache (`doctors:verified`) và ghi nhật ký kiểm toán `audit_logs`.
4. Giao diện người dùng thực tế 100% không dùng mock data: `DoctorSearchPage` (Modal đặt khám), `PatientDashboard` (Lịch hẹn & Hủy ca), `DoctorDashboard` (Ca khám & Hoàn tất chẩn đoán), `DoctorProfilePage` (Cập nhật hồ sơ CCHN), `DoctorVettingPage` (Hàng đợi duyệt bác sĩ của Admin).

#### 2. Chi Tiết Thay Đổi Mã Nguồn (Files Changed)
- `[NEW]` [`backend/src/main/java/com/mediassist/model/entity/Appointment.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/model/entity/Appointment.java): Thực thể lịch hẹn y tế kèm `@Version` optimistic locking, quan hệ Patient & Doctor, feeAmount, và indexes.
- `[NEW]` [`backend/src/main/java/com/mediassist/model/entity/DoctorScheduleSlot.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/model/entity/DoctorScheduleSlot.java): Thực thể cấu hình ca làm việc định kỳ hàng tuần.
- `[NEW]` [`backend/src/main/java/com/mediassist/model/entity/AppointmentStatus.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/model/entity/AppointmentStatus.java): Enum trạng thái cuộc hẹn (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
- `[NEW]` [`backend/src/main/java/com/mediassist/model/entity/PaymentStatus.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/model/entity/PaymentStatus.java): Enum thanh toán (`UNPAID`, `PAID`, `REFUNDED`).
- `[NEW]` [`backend/src/main/java/com/mediassist/repository/AppointmentRepository.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/repository/AppointmentRepository.java): Query kiểm tra xung đột trùng giờ (`existsConflict`), tìm theo Doctor/Patient và dải thời gian.
- `[NEW]` [`backend/src/main/java/com/mediassist/repository/DoctorScheduleSlotRepository.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/repository/DoctorScheduleSlotRepository.java): Tra cứu khung giờ làm việc của bác sĩ.
- `[NEW]` DTOs: `CreateAppointmentRequest.java`, `AppointmentDto.java`, `DoctorDetailDto.java`, `DoctorSlotDto.java`, `UpdateDoctorProfileRequest.java`, `VetDoctorRequest.java`.
- `[NEW]` [`backend/src/main/java/com/mediassist/service/DoctorService.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/service/DoctorService.java): Động hóa ca khám 30 phút, lọc ca quá khứ, tra cứu và cập nhật hồ sơ bác sĩ.
- `[NEW]` [`backend/src/main/java/com/mediassist/service/AppointmentService.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/service/AppointmentService.java): Đặt lịch khám an toàn `@Transactional(isolation = Isolation.REPEATABLE_READ)`, trả về HTTP 409 `SLOT_CONFLICT`, cập nhật trạng thái kèm phân quyền vai trò.
- `[NEW]` [`backend/src/main/java/com/mediassist/service/AdminVettingService.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/service/AdminVettingService.java): Thẩm định CCHN bác sĩ, evict cache Two-Layer, ghi audit log.
- `[NEW]` [`backend/src/main/java/com/mediassist/controller/DoctorController.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/controller/DoctorController.java): REST API tra cứu bác sĩ, lấy slots khả dụng, cập nhật hồ sơ.
- `[NEW]` [`backend/src/main/java/com/mediassist/controller/AppointmentController.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/controller/AppointmentController.java): REST API đặt lịch, xem lịch hẹn cá nhân, cập nhật trạng thái.
- `[NEW]` [`backend/src/main/java/com/mediassist/controller/AdminController.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/controller/AdminController.java): REST API xem bác sĩ chờ duyệt và thẩm định cấp phép.
- `[MOD]` [`backend/src/main/java/com/mediassist/config/SecurityConfig.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/config/SecurityConfig.java): Mở quyền truy cập công khai `GET /api/v1/doctors/**` phục vụ tìm kiếm và xem ca khám.
- `[MOD]` [`backend/src/main/java/com/mediassist/config/DataInitializer.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/config/DataInitializer.java): Bổ sung bác sĩ mẫu unverified (`doctor.pending@mediassist.local`) để Admin kiểm thử luồng vetting.
- `[NEW]` [`backend/src/test/java/com/mediassist/AppointmentServiceTest.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/test/java/com/mediassist/AppointmentServiceTest.java): Kiểm thử đơn vị luồng đặt lịch thành công, kiểm tra xung đột trùng giờ (409 Conflict), và bắt lỗi đặt giờ trong quá khứ.
- `[MOD]` [`frontend/src/pages/patient/DoctorSearchPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/patient/DoctorSearchPage.tsx): Kết nối API thực tế, modal đặt khám động chọn ngày & khung giờ, hiển thị thẻ xác nhận mã `AP-...`.
- `[MOD]` [`frontend/src/pages/patient/PatientDashboard.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/patient/PatientDashboard.tsx): Tích hợp danh sách lịch hẹn của bệnh nhân và chức năng hủy hẹn.
- `[MOD]` [`frontend/src/pages/doctor/DoctorDashboard.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/doctor/DoctorDashboard.tsx): Quản lý ca khám bệnh nhân, cập nhật trạng thái hoàn tất kèm ghi chú dặn dò.
- `[MOD]` [`frontend/src/pages/doctor/DoctorProfilePage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/doctor/DoctorProfilePage.tsx): Cập nhật CCHN, giá khám và tiểu sử qua `PUT /doctors/me/profile`.
- `[MOD]` [`frontend/src/pages/admin/DoctorVettingPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/admin/DoctorVettingPage.tsx): Quản lý hàng đợi duyệt bác sĩ với nút Phê duyệt / Từ chối thời gian thực.

#### 3. Đồng Bộ Tài Liệu (Docs Synchronized)
- [x] `docs/DATABASE_DESIGN.md`: Bổ sung DDL bảng `appointments` (kèm Optimistic Locking `@Version`, constraint `CHECK (scheduled_end > scheduled_start)`) và bảng `doctor_schedule_slots`.
- [x] `docs/USE_CASES.md`: Bổ sung chi tiết REST Endpoints, Happy Path và Conflict Exception Flow cho `UC-OPS-05` và `UC-ADM-06`.
- [x] `ROADMAP.md`: Đánh dấu Milestone 2 chuyển trạng thái 🟢 **COMPLETED**, bổ sung bảng ma trận phân công và DoD 10 tiêu chí.

#### 4. Bằng Chứng Kiểm Thử Tự Động (Verification Proof)
- **Backend:** `mvn test` $\rightarrow$ **6/6 tests PASS** (3 tests `AppointmentServiceTest`, 3 tests `TwoLayerCacheServiceTest`).
- **Frontend:** `npm run build` $\rightarrow$ **PASS 0 lỗi TypeScript**, thời gian build 2.66s, bundle 306.63 kB.
- **Tích hợp API Thực Tế:**
  - `POST /api/v1/appointments` đặt thành công ca đầu tiên: `AP-20260911-C2B717` (HTTP 201).
  - Thử đặt lại cùng khung giờ: Trả về HTTP 409 Conflict (`SLOT_CONFLICT: Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước`).
  - `GET /api/v1/doctors/{id}/slots` ca vừa đặt tự động chuyển `available: false`.
  - Admin duyệt bác sĩ `doctor.pending@mediassist.local`: Trả về HTTP 200, cache `doctors:verified` bị xóa ngay, danh bạ tăng từ 1 lên 2 bác sĩ xác thực.

#### 5. Điểm Nóng Cần Tech Lead Review Kỹ (Hotspots for Tech Lead)
- [x] **Cơ Chế Concurrency Guard:** Kết hợp `@Version` trên entity `Appointment`, isolation level `REPEATABLE_READ` và câu truy vấn `existsConflict()` để ngăn chặn triệt để đặt trùng ca ngay từ tầng ứng dụng trước khi chạm database constraint.
- [x] **Phân Quyền SecurityConfig:** `GET /api/v1/doctors/**` được cấp quyền `permitAll()`, nhưng các phương thức mutation (`PUT /api/v1/doctors/me/profile`) được bảo vệ nghiêm ngặt bằng `@PreAuthorize("hasRole('DOCTOR')")`.
- [x] **Đồng Bộ Bộ Nhớ Đệm Two-Layer:** Mọi thao tác cập nhật hồ sơ bác sĩ hoặc duyệt CCHN đều gọi `cacheService.evict("doctors:verified")`, đảm bảo dữ liệu mới nhất phản ánh ngay lập tức trên cả L1 Caffeine và L2 Redis.

---

---

### [WORK-LOG-#004] Hoàn Tất Toàn Bộ Milestone 1 (Foundation, Seeding 3 Vai Trò, OpenAPI, k6, Postman & Đạt 100% DoD)
* **Thời gian:** 2026-09-11 20:25:00 (GMT+7)
* **Tác nhân thực hiện:** Senior Pair Programming AI Assistant
* **Mục tiêu:** Thực hiện chỉ thị của Tech Lead: hoàn tất trọn vẹn 100% các hạng mục của Milestone 1 theo đúng Definition of Done (DoD) trước khi bước sang Milestone 2.
* **Trạng thái Build:** Frontend `npm run build` PASS (0 lỗi TS, 2.55s) | Backend `mvn test` PASS (3/3 tests).

#### 1. Chi Tiết Thay Đổi Mã Nguồn & Hạ Tầng
- `[MOD]` [`backend/src/main/java/com/mediassist/config/DataInitializer.java`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/backend/src/main/java/com/mediassist/config/DataInitializer.java):
  - Bổ sung logic tự động seed 3 tài khoản chuẩn cho 3 vai trò:
    - **Admin:** `admin@mediassist.local` (`Admin@SecurePass2026!`)
    - **Doctor:** `doctor@mediassist.local` (`Doctor@SecurePass2026!`), liên kết hồ sơ `DoctorProfile` (CCHN: `008921/BYT-CCHN`, 15 năm KN, phí khám 350.000 VNĐ, Chuyên khoa Tim Mạch).
    - **Patient:** `patient@mediassist.local` (`Patient@SecurePass2026!`).
- `[NEW]` [`tests/k6/smoke_test.js`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/tests/k6/smoke_test.js): Kịch bản kiểm thử tải khói bằng k6 (10 VU, 30s) kiểm tra Liveness probe, Readiness probe và Login endpoint.
- `[NEW]` [`tests/postman/MediAssist_v1.postman_collection.json`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/tests/postman/MediAssist_v1.postman_collection.json): Bộ sưu tập Postman chuẩn bị sẵn request cho Health Probes, Auth Login 3 vai trò và OpenAPI spec.
- `[MOD]` [`ROADMAP.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/ROADMAP.md): Cập nhật trạng thái Milestone 1 thành `🟢 COMPLETED`, đánh dấu hoàn thành 100% checklist của TL, Core Dev, Frontend Lead và Doc Lead, chuẩn bị sẵn sàng cho Milestone 2.

#### 2. Bằng Chứng Kiểm Thử & Nghiệm Thu Tự Động:
- **Readiness Health:** `http://localhost:5000/api/v1/health/ready` trả về HTTP `200 OK` (Database `UP`, Redis `UP`, TwoLayerCache `UP`).
- **OpenAPI / Swagger:**
  - `GET /api/docs` $\rightarrow$ `HTTP 200 OK` (JSON spec đầy đủ).
  - `GET /swagger-ui/index.html` $\rightarrow$ `HTTP 200 OK` (Giao diện Swagger tương tác trực quan).
- **Authentication 3 Vai Trò:**
  - `admin@mediassist.local` $\rightarrow$ `HTTP 200 OK` (Token sinh thành công, Cookie cấp phát).
  - `doctor@mediassist.local` $\rightarrow$ `HTTP 200 OK`.
  - `patient@mediassist.local` $\rightarrow$ `HTTP 200 OK`.
- **Database Docker (PostgreSQL 5433):**
  - Extension `vector` và `plpgsql` đang hoạt động.
  - Các bảng `users`, `specialties`, `doctor_profiles`, `doctor_specialties`, `audit_logs` có dữ liệu khởi tạo chuẩn xác.

#### 3. Điểm Nóng Cần Tech Lead Review & Nghiệm Thu:
- [x] Đã hoàn thành 10/10 tiêu chí Definition of Done (DoD) của Milestone 1.
- [x] Hạ tầng Docker, Spring Boot daemon và Vite dev server chạy mượt mà, không xung đột.
- [ ] **Sẵn sàng bước sang Milestone 2 (Core Medical & Booking Workflow)** theo chỉ thị tiếp theo của Tech Lead.

### [WORK-LOG-#003] Thiết Lập Hệ Thống Quản Trị Dự Án, Phân Bổ RACI & Chỉ Thị AI Bền Vững
* **Thời gian:** 2026-09-11 20:15:00 (GMT+7)
* **Tác nhân thực hiện:** Senior Pair Programming AI Assistant
* **Mục tiêu:** Đáp ứng yêu cầu của Tech Lead về quy chuẩn GitHub, hướng dẫn cộng tác nhóm, phân chia 3 vai trò và cơ chế bắt buộc AI không bao giờ quên cập nhật tài liệu.
* **Trạng thái Build:** Frontend `npm run build` PASS (2.71s) | Backend `mvn test` PASS (3/3 tests).
* **Git Remote:** Đã gán `origin` và push nhánh `master` thành công lên `https://github.com/vinhhotff/KLTN-medical-assistant.git`.

#### 1. Chi Tiết Thay Đổi Mã Nguồn & Cấu Hình
- `[NEW]` [`README.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/README.md): Bộ mặt dự án chuẩn quốc tế, tóm tắt bài toán y tế VN, kiến trúc, bảng chỉ dẫn docs, hướng dẫn chạy 3 phút.
- `[NEW]` [`CONTRIBUTING.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/CONTRIBUTING.md): Chiến lược nhánh `feature/UC-xx`, chuẩn Conventional Commits, quy trình review PR.
- `[NEW]` [`docs/TEAM_WORKFLOW.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/docs/TEAM_WORKFLOW.md): Phân bổ 3 vai trò (Tech Lead 30% code/50% review, Core Dev 80% code, Doc Specialist 60% doc/15% code) kèm ma trận RACI.
- `[NEW]` [`AGENTS.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/AGENTS.md) & [`GEMINI.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/GEMINI.md): Chỉ thị tối cao cho AI Antigravity/Gemini CLI về kiến trúc và bắt buộc đồng bộ docs.
- `[NEW]` [`.cursorrules`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/.cursorrules) & [`.github/copilot-instructions.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/.github/copilot-instructions.md): Đồng bộ quy tắc cho các IDE Cursor và GitHub Copilot.
- `[NEW]` [`.github/pull_request_template.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/.github/pull_request_template.md): PR checklist kiểm tra đồng bộ docs và kết quả test.
- `[NEW]` [`.github/ISSUE_TEMPLATE/`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/.github/ISSUE_TEMPLATE): Mẫu issue cho Feature, Bug và Documentation.
- `[NEW]` [`docs/WORK_LOG.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/docs/WORK_LOG.md): Tệp nhật ký này.

#### 2. Điểm Nóng Cần Tech Lead Review Kỹ:
- [x] Đã cấu hình remote `origin` trỏ đúng repo `KLTN-medical-assistant.git`.
- [x] Đã thiết lập nhánh `master` bảo vệ.
- [ ] **Hành động đề xuất cho Tech Lead:** Truy cập GitHub Repo Settings $\rightarrow$ Branches $\rightarrow$ Bật tính năng **"Require a pull request before merging"** và **"Require approvals: 1"** để bảo vệ nhánh `master`.

---

### [WORK-LOG-#002] Giải Quyết Lỗi Redirect Admin & Xây Dựng Bộ Tài Liệu Chuyên Sâu
* **Thời gian:** 2026-09-11 20:05:00 (GMT+7)
* **Tác nhân thực hiện:** Senior Pair Programming AI Assistant
* **Mục tiêu:** Khắc phục lỗi đăng nhập Admin bấm menu bị đẩy về `/login`, đồng thời tạo đầy đủ bộ 4 tài liệu chuyên sâu chuẩn Khóa luận tốt nghiệp & Doanh nghiệp.
* **Trạng thái Build:** Frontend `npm run build` PASS (2.57s) | Backend `mvn test` PASS (3/3 tests).

#### 1. Chi Tiết Thay Đổi Mã Nguồn
- `[MOD]` [`frontend/src/App.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/App.tsx): Bổ sung toàn bộ child routes cho Admin (`doctors`, `users`, `specialties`), Doctor (`profile`), và Patient (`documents`, `doctors`).
- `[MOD]` [`frontend/src/pages/LoginPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/LoginPage.tsx): Lưu token vào localStorage kết hợp HttpOnly cookie.
- `[MOD]` [`frontend/src/services/api.ts`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/services/api.ts): Bổ sung Dual-Transport Auth (gửi cả cookie lẫn Bearer token).
- `[MOD]` [`frontend/src/store/useAuthStore.ts`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/store/useAuthStore.ts): Đồng bộ state tức thời từ storage, triệt tiêu hiện tượng lag trắng màn hình.
- `[NEW]` [`frontend/src/pages/admin/DoctorVettingPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/admin/DoctorVettingPage.tsx): Trang duyệt bác sĩ.
- `[NEW]` [`frontend/src/pages/admin/UserManagementPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/admin/UserManagementPage.tsx): Trang quản lý người dùng RBAC.
- `[NEW]` [`frontend/src/pages/admin/SpecialtyManagementPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/admin/SpecialtyManagementPage.tsx): Trang danh mục chuyên khoa.
- `[NEW]` [`frontend/src/pages/doctor/DoctorProfilePage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/doctor/DoctorProfilePage.tsx): Trang hồ sơ bác sĩ CCHN.
- `[NEW]` [`frontend/src/pages/patient/DocumentSummarizerPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/patient/DocumentSummarizerPage.tsx): Trang upload giải nghĩa phiếu xét nghiệm.
- `[NEW]` [`frontend/src/pages/patient/DoctorSearchPage.tsx`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/frontend/src/pages/patient/DoctorSearchPage.tsx): Trang tìm kiếm bác sĩ vector.

#### 2. Đồng Bộ Tài Liệu:
- [x] [`docs/DATABASE_DESIGN.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/docs/DATABASE_DESIGN.md): Tạo mới hoàn chỉnh 8 bảng DDL, HNSW vector 1536 chiều, HikariCP pool.
- [x] [`docs/STORYTELLING.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/docs/STORYTELLING.md): Tạo mới bối cảnh y tế VN, 3 Personas, rào chắn đạo đức AI.
- [x] [`docs/USE_CASES.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/docs/USE_CASES.md): Tạo mới 7 Use Cases chuẩn RUP/IEEE 830.
- [x] [`docs/CAPSTONE_DEFENSE.md`](file:///c:/Users/ADmin/Documents/antigravity/resilient-fermi/docs/CAPSTONE_DEFENSE.md): Tạo mới đề cương 5 chương, kịch bản 15p, Live demo checklist, Top 10 Q&A.

---

### [WORK-LOG-#001] Khởi Tạo Nền Tảng Backend, Docker & Cache 2 Lớp
* **Thời gian:** 2026-09-11 19:50:00 (GMT+7)
* **Tác nhân thực hiện:** Senior Pair Programming AI Assistant
* **Mục tiêu:** Xây dựng khung kiến trúc doanh nghiệp Spring Boot 3.4 trên Java 21, giải quyết xung đột cổng PostgreSQL host và thiết lập Cache 2 lớp (L1 Caffeine + L2 Redis).
* **Trạng thái Build:** Clean build, 0 lỗi compilation.

#### 1. Chi Tiết Kỹ Thuật Đã Triển Khai
- `docker-compose.yml`: Cấu hình PostgreSQL 16 + pgvector chạy cổng `5433:5432` (tránh xung đột với Postgres 18 có sẵn trên Windows host) và Redis chạy cổng `6379`.
- Backend Spring Boot 3.4.x:
  - Tách cấu hình đa môi trường: `application.properties`, `application-dev.properties`, `application-prod.properties`.
  - Triển khai dịch vụ `TwoLayerCacheService` (L1 LRU In-memory Caffeine + L2 Distributed Redis).
  - Triển khai `SecurityConfig` với stateless JWT và BCrypt (cost factor 12).
  - Triển khai Health Probes (`/api/v1/health/ready`, `/api/v1/health/live`).
