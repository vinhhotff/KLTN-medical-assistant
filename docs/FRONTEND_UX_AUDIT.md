# Rà Soát & Làm Cứng Frontend MediAssist-AI (FRONTEND_UX_AUDIT.md)

> **Nhánh:** `feature/frontend-ux-hardening` (tách từ `origin/develop`, đã merge `origin/feature/fuction`)
> **Đợt 2 (sửa theo phiếu review, 12/10/2026):** nhánh `feature/frontend-ux-review-fixes` tách từ `origin/develop` @ `e78eeb1` — mục `R-02`, `R-05`, B-07, B-08g, B-23, B-26, BE-1, BE-4, BE-6, BE-13, BE-14, BE-15, BE-16.
> **Phạm vi:** chỉ `frontend/` + tài liệu. Không sửa backend, migration, docker, CI.
> **Người thực hiện:** Phạm Bảo + AI · **Ngày:** 11/10/2026

## 1. Phương pháp

- Không có Docker trên máy nên **không chạy backend thật**. `backend/.env` trỏ tới DB dùng chung, nên tôi cũng không chạy trên DB đó để tránh ghi dữ liệu thử. Thay vào đó dùng Playwright `page.route()` với bộ mock bám đúng DTO backend: `frontend/e2e/fixtures/mockApi.ts`.
- Đi qua mọi trang của 3 vai trò ở 2 kích thước **1440×900** và **390×844**. Ảnh lưu ở `frontend/ux-audit/before|after/` (đã thêm vào `.gitignore`). Chụp lại bằng lệnh `UX_CAPTURE=after npx playwright test ux-capture --project=chromium`.
- Với mỗi nút/form, thử 4 tình huống: chưa nhập, bấm 2 lần, bấm khi đang loading, API lỗi/rỗng. Các tình huống này được giữ lại thành spec E2E (43 test, pass trên `chromium` và `mobile-chrome`).
- Mức độ: **P0** = dữ liệu y tế giả/sai hoặc rủi ro an toàn · **P1** = nút/form thiếu điều kiện, giá trị cứng · **P2** = UI/UX, hiệu năng, khả năng truy cập.

## 2. Bảng phát hiện

Trạng thái: ✅ đã sửa · ⚠️ sửa một phần · ⏳ chưa sửa (xem cột Cách sửa).
ID `B-xx` là mục trong brief; `N-xx` là lỗi mới tự phát hiện.

### P0 — Dữ liệu y tế giả hoặc sai

| ID | Trang/File | Vấn đề | Mức | Cách sửa | Trạng thái |
|:--|:--|:--|:--:|:--|:--:|
| B-01 | `doctor/DoctorDashboard.tsx` › `handleSubmitEncounter` | Trường trống bị thay bằng `75`, `36.8`, `18`, `170`, `65`, `98`, BMI `22.0`, HA `"/"` rồi **lưu vào bệnh án** | P0 | `utils/vitals.ts` › `buildVitalSignsPayload`: bỏ trường trống, BMI chỉ khi có đủ cao + nặng, HA chỉ khi đủ 2 số; `vitalSignsJson=null` nếu không đo gì | ✅ |
| N-01 | `DoctorDashboard.tsx` › `openEncounterModal` | Form khám **tự điền sẵn** `120/80, 75, 36.8, 18, 165, 60, 98` khi chưa có sinh hiệu | P0 | Nạp bằng `vitalsFromJson`, thiếu thì để trống | ✅ |
| B-01b | `DoctorDashboard.tsx` | Không validate khoảng sinh hiệu | P0 | `VITAL_RANGES` (HA 50–250/30–150, mạch 30–220, 34–43 °C, thở 5–60, SpO2 50–100, cao 40–250, nặng 2–300); lỗi hiện ngay dưới ô; tâm trương < tâm thu | ✅ |
| B-01c | `DoctorDashboard.tsx` | Nút "Ký Duyệt" không có điều kiện | P0 | Bật chỉ khi: có lý do khám + ICD (mã hoặc tên) + dòng thuốc hợp lệ + trạng thái `CHECKED_IN/IN_PROGRESS` + sinh hiệu hợp lệ + ngày tái khám ≥ hôm nay. Khung `sign-blockers` liệt kê lý do | ✅ |
| N-02 | `DoctorDashboard.tsx` › `handleStartExam` | Sau khi PATCH `IN_PROGRESS`, modal vẫn mở với object cũ (`SCHEDULED`) nên guard sai; lỗi chuyển trạng thái bị nuốt | P0 | Mở với status mới; lỗi → toast; chặn bấm 2 lần | ✅ |
| B-01d | `DoctorDashboard.tsx` | `followUpDate` không có `min` | P0 | `min = todayLocal()` | ✅ |
| B-02 | `DoctorDashboard`, `DoctorPatientRecordsPage`, `PatientDashboard` | Hiển thị `vs.x \|\| 72/36.6/99/21.0/'120/80'` | P0 | Component `VitalValue` hiện "— Chưa đo"; nhãn "Bình thường/Sốt" chỉ hiện khi có nhiệt độ | ✅ |
| N-03 | `DoctorDashboard`, `DoctorPatientRecordsPage` | Nhóm máu mặc định `'O+'` (nguy hiểm khi truyền máu) | P0 | "— Chưa xác định" | ✅ |
| N-04 | `DoctorDashboard` (tab AI) | Mức khẩn mặc định `ROUTINE` khi chưa có phân luồng | P0 | Banner trung tính "Chưa có đánh giá mức độ nguy cơ" | ✅ |
| N-05 | `DoctorDashboard` (xem EMR) | ICD thiếu → "Chẩn đoán xác định"; giới tính null → "Khác" | P0 | `Missing` | ✅ |
| B-03 | `patient/PatientDashboard.tsx` | Người liên hệ khẩn cấp, `I20.9`, `BN-2026-08492`, BHYT `DN479…`, phòng "Nội 102 - Tòa A", "BV Đa khoa Trung ương", phí `350000` | P0 | Empty state "Chưa cập nhật" + nút "Cập nhật hồ sơ"; nút thanh toán ẩn khi không có phí | ✅ |
| N-06 | `PatientDashboard.tsx` | Còn bịa thêm **dị ứng** ("Beta-lactam, tôm cua"), **tiền sử** (THA 3 năm…), **địa chỉ**, hậu tố "(Rh Dương)" cho mọi nhóm máu, tên chẩn đoán "Angina pectoris" | P0 | Bỏ hết, hiện trạng thái trống | ✅ |
| N-07 | `PatientDashboard.tsx` | `CHECKED_IN`, `IN_PROGRESS`, `NO_SHOW` hiển thị thành "✕ Đã Hủy" | P0 | Bảng `STATUS_LABEL` đủ 6 trạng thái | ✅ |
| B-04 | `DoctorDashboard.tsx` | Tự điền phòng `'Phòng Khám P.102'` (lưu vào DB khi bắt đầu khám/tái khám), hiển thị `P.102`, `BN-2026-N/A` | P0 | Ô "Phòng khám" do bác sĩ nhập, hiện "Chưa xếp phòng"; tạo tái khám cần có phòng | ✅ |
| N-08 | `doctor/DoctorPatientRecordsPage.tsx` | Tái khám lưu cứng `'Phòng Khám Chuyên Khoa P.102'` | P0 | Ô phòng bắt buộc | ✅ |
| B-05 | `patient/AdmissionTicketModal.tsx` | `STT-01`, `Phòng 205`, `Tầng 2`, `Tòa A`, địa chỉ `Lô E2a-7` trên phiếu, trong QR và link Calendar/Maps | P0 | "Đang chờ cấp số/xếp phòng"; nút chỉ đường chỉ hiện khi có địa chỉ; hotline lấy từ `config/app.ts` | ✅ |
| N-09 | `AdmissionTicketModal.tsx` | **In phiếu ra trang trắng**: lớp nền có `.no-print` (`display:none`) bọc luôn phiếu | P0 | Bỏ `no-print` khỏi lớp nền, chỉ giữ ở thanh nút | ✅ |
| B-06 | `pages/LoginPage.tsx` | Quên mật khẩu giả: không gọi API, OTP `882 941`, gợi ý `password123` | P0 | `POST /auth/forgot-password {email}`, hiện message trung tính từ backend, validate email, loading/disable, xử lý 429 | ✅ |
| B-07 | `patient/DoctorSearchPage.tsx` · `hooks/useDemoToolsHotkey.ts` | Bệnh nhân thấy nút đổi chế độ AI **toàn hệ thống**; (phiếu review P0-3) nhưng kịch bản bảo vệ cần bật/tắt AI ngay trên trang tìm bác sĩ | P0 | Mặc định chỉ ADMIN thấy, không gọi `/system/ai-mode` với bệnh nhân. Mở thêm cho demo khi: `VITE_ENABLE_DEV_TOOLS=true`, `VITE_ENABLE_DEMO_LOGIN=true` (so sánh chặt, **không** gộp `import.meta.env.DEV`), hoặc nhấn **Ctrl+Shift+D** (Cmd+Shift+D) — cờ lưu `sessionStorage` theo tab, có `preventDefault` (trình duyệt dùng tổ hợp này để bookmark), hoạt động cả khi đang gõ ô tìm kiếm. Người không phải ADMIN thấy tiêu đề "Công cụ demo · Chế độ AI toàn hệ thống" + dòng "Ảnh hưởng tới mọi người dùng". Backend trả 401/403 → toast giải thích cần tài khoản ADMIN | ✅ (FE) · BE-1 |
| R-02 | `DoctorSearchPage.tsx` + `components/search/ClinicalDefenseBar.tsx` | (Phiếu review P0-2) Backend gắn metadata phòng thủ (`emergencyRedFlag`, `outOfDomain`, `affirmed/negatedSymptoms`, `normalizedClinicalQuery`) vào từng `DoctorMatchDto` nhưng UI bỏ qua: bệnh nhân gõ "đau ngực dữ dội" không thấy cảnh báo cấp cứu | P0 | "Smart Defense Bar": metadata lấy từ phần tử đầu của danh sách **gốc** (không phải danh sách đã lọc chuyên khoa); triệu chứng khẳng định = badge xanh, phủ định = badge xám gạch ngang (title NegEx); banner đỏ `role="alert"` + nút `tel:` từ `EMERGENCY_NUMBER` đặt trên danh sách; banner ngoài ngành hiện `outOfDomainGuidance` (ẩn badge vì không phải triệu chứng); `<details>` hiện `normalizedClinicalQuery`. Hiển thị nguyên chuỗi backend, không tự làm NegEx ở client. Khi danh sách rỗng backend không gửi metadata → BE-13 | ✅ (FE) · BE-13 |
| R-05 | `SymptomTriagePage.tsx` › `handleOpenBooking` · `booking/BookingModal.tsx` | (Phiếu review P0-5) `notes` bị nhồi "Tóm tắt SBAR" rồi `.slice(0, 1000)` âm thầm → bác sĩ thấy thêm 1 bản SBAR cắt cụt, trùng với `triageSbarSummary` đã có qua `triageSessionId` | P0 | `notes` chỉ còn triệu chứng bệnh nhân nhập + chuyên khoa gợi ý, bỏ `.slice` (modal tự kiểm 1000 ký tự); `triageSessionId` chỉ gửi khi là UUID; modal hiện dòng "Phiếu phân luồng AI … sẽ được đính kèm tự động" hoặc cảnh báo vàng khi đặt từ triage mà thiếu phiên. `DoctorDashboard` giữ nguyên (đọc `triageSbarSummary` từ appointment, có test) | ✅ |
| N-10 | `DoctorProfilePage.tsx` | Khi tải hồ sơ lỗi, form hiện **hồ sơ giả** (TS.BS, BV ĐHYD, Tim mạch, 350.000đ, 10 năm, bio + CCHN giả), bấm Lưu sẽ **ghi đè hồ sơ thật** | P0 | Lỗi tải → `ErrorState` + Thử lại, không render form | ✅ |

### P1 — Nút/form thiếu điều kiện, giá trị viết cứng

| ID | Trang/File | Vấn đề | Mức | Cách sửa | Trạng thái |
|:--|:--|:--|:--:|:--|:--:|
| B-08a | `DocumentSummarizerPage.tsx` | Nút "Phân tích" không kiểm quota | P1 | Hết lượt (non-VIP, `scanQuota ≤ 0`) → thay nút bằng "Hết lượt quét" + "Xem bảng giá" | ✅ |
| B-08b | ″ | `quota?.scanQuota ?? 1` hiện số 1 giả | P1 | Skeleton khi tải, "—" khi lỗi | ✅ |
| B-08c | ″ | Preset, kéo-thả, chọn tệp, xoá tệp vẫn sửa được hàng đợi khi đang phân tích | P1 | Khoá toàn bộ khi `analyzing`; guard bấm 2 lần (test: dblclick → đúng 1 request) | ✅ |
| B-08d | ″ | Banner lỗi luôn hiện "Gói Quét/VIP" và "Thử Lại" | P1 | `errorKind`: retry chỉ khi mạng/5xx; gói chỉ khi 402/`QUOTA_EXCEEDED`; lỗi validate không có nút | ✅ |
| B-08e | ″ | Chỉ kiểm đuôi tệp | P1 | Kiểm đuôi + MIME, từ chối < 100 byte | ✅ |
| B-08f | ″ › `handleConfirmPayment` | Verify thất bại thì im lặng | P1 | Hiện lỗi; thiếu `transactionCode` cũng báo | ✅ |
| B-08g | ″ · `services/pricingService.ts` · `hooks/useScanPackages.ts` | Giá gói viết cứng; (phiếu review P0-4) client tự giữ bảng giá làm nguồn chính | P1 | Danh sách gói lấy từ `GET /payments/packages` (validate `code` thuộc union, `priceVnd` là số > 0; cache module khi thành công). Lỗi mạng/404/rỗng/sai shape → `FALLBACK_SCAN_PACKAGES` (giữ nguyên 29.000 / 99.000 / 149.000) + chú thích "Giá tham khảo, số tiền chính xác hiển thị ở bước thanh toán". `amount`/`currency` của `POST /payments/checkout` là số tiền chính thức: nếu khác giá đang hiện, UI cập nhật "Tổng tiền", hiện cảnh báo và **chờ bấm "Xác nhận thanh toán …" lần 2** mới gọi verify; Stripe (redirect) chỉ log dev. Sửa kèm: modal thanh toán cuộn được trên điện thoại (nút bị đẩy khỏi màn hình) | ✅ · BE-14 |
| N-11 | ″ (bảng giá) | **Mô tả gói sai so với `PaymentService`**: BASIC_5 ghi "1 lượt" (thật +5), VIP_MONTHLY ghi "5 lượt/12 tháng" (thật: không giới hạn 30 ngày), VIP_ENTERPRISE ghi "/tháng" (thật 90 ngày) | P1 | Sinh thẻ gói từ config, nội dung khớp backend | ✅ |
| N-12 | ″ (VietQR) | Hiện số TK ngân hàng bịa "MB Bank 9999 8888 6666" như thật | P1 | Gắn nhãn "Môi trường thử nghiệm — KHÔNG chuyển tiền thật" | ✅ |
| N-13 | ″ | Rating `'5.0'` khi 0 đánh giá; `consultationFee.toLocaleString()` **crash** khi phí null | P1 | `formatRating` / `formatVnd` | ✅ |
| B-09 | `pages/LandingPage.tsx` | Input file không disable khi quét; số liệu giả (20,500 · 4.98/4.95 · 3420+ · 1500 · 22 năm · Cardiology · BV ĐHYD · 350000 · 99.4%); chuỗi "Spring Boot & pgvector 5433", "Real Backend" | P1 | Disable + kiểm MIME; số thật từ API hoặc "—"; câu chữ thân thiện | ✅ |
| N-14 | `LandingPage.tsx` | Tự nhận "HIPAA Certified / ISO 27001 / GDPR Compliant"; lời chứng thực gắn tên "TS.BS Đỗ Hữu Nghị – BV ĐH Y Hà Nội" | P1 | "Nguyên tắc thiết kế (định hướng, chưa phải chứng nhận)"; lời chứng thực ghi rõ nhân vật minh hoạ | ✅ |
| B-10 | DoctorSearch, SymptomTriage, DoctorVetting, DoctorManagement, Landing | `consultationFee \|\| 300000/350000`, `rating \|\| 4.9`, lượt khám `120/1250/1500` | P1 | "Liên hệ" / "Chưa có đánh giá"; số lượt khám thật hoặc 0 | ✅ |
| N-15 | `DoctorSearchPage.tsx` | Kết quả tìm theo triệu chứng (`DoctorMatchDto.doctorId`) → đặt lịch gửi `doctorId: undefined` | P1 | `normalizeDoctor` | ✅ |
| N-16 | `DoctorSearchPage.tsx` | `?specialty=` từ trợ lý triage bị bỏ qua | P1 | Map slug/tên → chọn sẵn bộ lọc | ✅ |
| B-11 | `doctor/DoctorProfilePage.tsx` | `'Nguyễn Văn An'`, `'doctor@mediassist.local'`, `350000`, `10` | P1 | Chỉ dữ liệu thật, placeholder khi trống | ✅ |
| N-17 | `DoctorProfilePage.tsx` | Chỉ gửi 1 chuyên khoa → bác sĩ nhiều chuyên khoa **bị xoá bớt** khi lưu | P1 | Chọn nhiều chuyên khoa, bắt buộc ≥ 1 | ✅ |
| B-12 | `admin/DoctorManagementPage.tsx` | Mặc định BV ĐHYD, Khoa Nội Tổng Hợp, 350000, 8 năm; tạo được bác sĩ không chuyên khoa | P1 | Form trống; bắt buộc ≥ 1 chuyên khoa, email hợp lệ, mật khẩu ≥ 8 (chữ + số), phí > 0; lỗi theo trường. Form sửa bỏ fallback 350000/5 năm/Bộ Y Tế | ✅ |
| B-13 | `admin/AppointmentSupervisionPage.tsx` | Lý do trống bị thay câu cứng | P1 | `ConfirmDialog` lý do ≥ 10 ký tự, gửi nguyên văn | ✅ |
| B-14 | `admin/UserManagementPage.tsx` | Khoá tài khoản không cần lý do | P1 | Bắt buộc ≥ 10 ký tự khi `SUSPENDED` | ✅ |
| B-15 | `SymptomTriagePage.tsx` | Không gửi `triageSessionId`; ghi chú "Triage AI Session: xxxx" | P1 | Gửi `triageSessionId`; ghi chú tóm tắt triệu chứng + chuyên khoa + SBAR, người dùng sửa được; khoá đặt lịch khi đang cảnh báo cấp cứu | ✅ |
| B-16 | `PatientDashboard.tsx` | Dời lịch nhập giờ tự do; thanh toán thiếu `checkoutUrl` thì im lặng | P1 | `SlotPicker` dùng `GET /doctors/{id}/slots?date=`; toast lỗi | ✅ |
| B-17 | PatientDashboard, DoctorPatientRecords, DoctorDashboard | `toISOString()` (UTC) cho `min`/"hôm nay" → sai từ 0–7h giờ VN; `formatLocalDate` bị copy 3 nơi | P1 | `src/utils/date.ts`; ngày sinh `max` = hôm nay (đăng ký + hồ sơ) | ✅ |
| B-18 | `LoginPage.tsx` | Điền sẵn tài khoản bác sĩ; preset luôn hiện; submit chỉ kiểm độ dài | P1 | Form trống; preset/dữ liệu mẫu chỉ khi DEV hoặc `VITE_ENABLE_DEMO_LOGIN`; submit kiểm đủ tiêu chí đang hiển thị | ✅ |
| N-18 | `LoginPage.tsx` | Đồng ý điều khoản tick sẵn; gửi cứng `address: 'Việt Nam'`; ô BHYT/CCCD không bao giờ gửi đi; `/login?expired=true` mở tab Đăng ký, không báo | P1 | Bỏ tick sẵn; bỏ address cứng; thay ô chết bằng gợi ý cập nhật trong hồ sơ; mở tab đăng nhập + thông báo phiên hết hạn | ✅ |
| B-19 | DoctorDashboard, DoctorPatientRecords, PatientDashboard, AppointmentSupervision | 14 `alert/confirm/prompt` | P1 | `Toast` + `ConfirmDialog`; huỷ ca / vắng mặt có ô lý do được validate | ✅ (0 còn lại) |
| N-19 | `DoctorDashboard.tsx` | Nút "Vắng mặt" hiện cho ca `IN_PROGRESS` (backend không cho `IN_PROGRESS→NO_SHOW`) | P1 | Chỉ hiện khi `SCHEDULED/CHECKED_IN` | ✅ |
| N-20 | `DoctorDashboard.tsx` | Dòng thuốc mới tự điền "Uống 1 viên sau ăn", SL 10, 10 ngày; không xoá được dòng cuối | P1 | Dòng mới trống; luôn xoá được | ✅ |
| B-20 | `admin/AdminDashboard.tsx` | Tỷ giá cứng | P1 | Giữ `dynamicExchangeRate` (nhánh Khương), fallback `FALLBACK_USD_VND_RATE` trong config | ✅ |
| B-21 | `frontend/.env.example` | `VITE_BACKEND_URL` cổng 5000 (backend 5001) | P1 | Sửa 5001; thêm `VITE_ENABLE_DEMO_LOGIN`, `VITE_ENABLE_DEV_TOOLS` (có type) | ✅ |

### P2 — UI/UX, hiệu năng, khả năng truy cập

| ID | Trang/File | Vấn đề | Mức | Cách sửa | Trạng thái |
|:--|:--|:--|:--:|:--|:--:|
| B-22 | `layouts/*` | Không có menu mobile; Admin sidebar cố định `w-64` | P2 | Bệnh nhân: bottom nav; Bác sĩ: hamburger; Admin: drawer; `NavLink` active | ✅ |
| N-21 | `MedicalDisclaimerBanner.tsx` | `truncate` cắt mất "gọi 115" trên điện thoại | P2 | Câu ngắn trên mobile, 115 là link `tel:` | ✅ |
| N-22 | `DoctorDashboard.tsx` | Tràn ngang 2px ở 390px (hàng nút thẻ hàng đợi) | P2 | `flex-wrap` | ✅ |
| B-23 | toàn app · `tailwind.config.js` | Hai ngôn ngữ thiết kế (M3 tokens ở Landing/Login vs slate/teal); PatientLayout indigo; nạp font Material Symbols 2 lần; (phiếu review P1-6) cần **một** bảng màu | P2 | Bỏ font trùng. **Một bảng màu duy nhất** trong `tailwind.config.js`: thang gốc `brand`(teal) · `neutral`(slate) · `success/warning/danger/info`; 25 tên M3 còn dùng (374 class, chỉ ở `LandingPage.tsx` + `index.html`) trỏ về thang gốc; xoá 22 token M3 không ai dùng + bộ `medical-*` (0 lần dùng). Tương phản mọi cặp `on-*`/nền ≥ 4.5:1 (bảng 4.1). Ảnh trước/sau Landing/Login (desktop + 390px) không vỡ layout, chỉ đổi sắc xanh-lam nhạt sang slate. **Chưa chuyển:** màu indigo/blue/violet trong nội dung trang (xem 4.1) | ⚠️ |
| N-23 | `tailwind.config.js` | Dùng class Tailwind 4 không tồn tại ở v3: `bg-linear-to-*` (**header modal chữ trắng trên nền trắng**), `z-60` (**modal thanh toán bị che dưới bảng giá**), `shadow-2xs`, `backdrop-blur-xs`, `animate-fadeIn/scaleUp/scaleIn`, `outline-hidden` | P2 | Định nghĩa token trong config, đổi `bg-linear`→`bg-gradient`, `z-60`→`z-[60]` | ✅ |
| B-24 | `src/components/ui/` | Thiếu bộ component dùng chung; modal đặt lịch copy 3 nơi | P2 | `Button, Field/Input/Textarea, Modal (Esc + focus trap), Toast, ConfirmDialog, EmptyState, ErrorState, Skeleton, Badge, Missing`; `booking/SlotPicker` + `booking/BookingModal` thay 3 bản copy | ✅ |
| B-25 | trang bệnh nhân | Thuật ngữ pgvector/HNSW/cosine/Spring Boot/OpenRouter/SHA-256/cổng | P2 | Câu chữ thường; chi tiết kỹ thuật (cho buổi bảo vệ) để trong `<details>` "Chi tiết kỹ thuật" | ✅ |
| B-26 | các danh sách · `components/ui/States.tsx` (`SkeletonTable`) | Thiếu skeleton/empty/error + retry; nút chỉ có icon thiếu `aria-label`; (phiếu review P1-7) các trang admin còn chữ "Đang tải…", lỗi chỉ `console` rồi hiện như danh sách rỗng | P2 | Đã làm cho: tìm bác sĩ, slot, danh bạ bệnh nhân, hồ sơ bác sĩ, dashboard bệnh nhân, quota. **Admin:** `Specialty`, `TriageSupervision`, `AuditLog`, `DoctorVetting`, `UserManagement`, `DoctorManagement`, `AppointmentSupervision` tách 4 trạng thái *đang tải (skeleton) / lỗi (`ErrorState` + "Thử lại", `getApiErrorMessage`) / rỗng (`EmptyState`) / có dữ liệu*; hàm fetch bọc `useCallback` để nút Thử lại dùng lại; lần làm mới ngầm (polling) lỗi **không** xoá bảng đang hiện. `DoctorManagement` trước đây dùng `allSettled` nên lỗi tải = "không có bác sĩ". `AdminDashboard`: thẻ KPI skeleton thay `'...'`, lỗi `/admin/stats` → "—" + `ErrorState` thay vì số 0 giả. E2E: 500 → Thử lại → dữ liệu (Specialty/Triage/Audit) + skeleton khi chậm | ✅ |
| B-27 | `App.tsx` | Bundle chính 1.063 kB | P2 | `React.lazy` + `Suspense` theo route → **62 kB** (gzip 19 kB); không còn cảnh báo > 500 kB | ✅ |
| B-28 | toàn app | 31 lệnh `console.*` | P2 | Xoá hoặc dùng `utils/logger` (chỉ log khi DEV) | ✅ |
| B-29 | `frontend/e2e/*` | Spec cũ hỏng (route `/triage`, nút preset không còn, cần backend thật) | P2 | Viết lại trên mock: 11 spec, **43 test pass** (chromium + mobile-chrome) | ✅ |
| N-24 | `DoctorManagementPage` (sau sửa) | `min=1 step=10000` làm trình duyệt chặn 300000 | P2 | `min=0 step=1000` (lỗi do chính lần sửa này gây ra, test E2E đã phát hiện) | ✅ |

## 3. Việc chưa làm và lý do

1. **B-23 (một phần):** chưa thống nhất token M3 ↔ slate/teal trên toàn bộ nội dung trang. Việc này đụng gần như mọi dòng JSX của các file 1.400–3.700 dòng, rủi ro hồi quy cao. Đề xuất làm PR riêng, chuyển dần theo từng trang.
2. ~~B-26 (một phần)~~ — đã xong ở đợt sửa theo phiếu review (P1-7).
3. ~~Không chạy được backend thật~~ — đã chạy ngày 12/10/2026 trên DB riêng `mediassist_review` (Docker Postgres 5433, Redis DB 1, không sửa `.env`): phát hiện BE-15, BE-16 (backend không lên nếu không vá tạm) và xác nhận lại BE-14 trên dữ liệu thật. Kết quả chi tiết ở WORK_LOG #102.

## 4. Yêu cầu gửi backend (Khương & Vinh)

| # | Vấn đề | Đề xuất |
|:--|:--|:--|
| BE-1 | `/api/v1/system/**` đang `permitAll` trong `SecurityConfig`: ai cũng gọi được `ai-mode/toggle`, `sync-vectors` (frontend chỉ ẩn nút) | Giới hạn `hasRole('ADMIN')`, chỉ để `GET /system/ai-mode` public nếu cần. **Đã làm ở `954071f`** (`/system/**` → ADMIN, `GET /system/ai-mode` public). **Còn thiếu:** nếu khoá `/system/**` chỉ cho ADMIN thì cần ngoại lệ cho profile demo, nếu không kịch bản demo bằng tài khoản PATIENT sẽ bị 403 (vd. cho phép `POST /system/ai-mode/toggle` khi `spring.profiles.active` có `demo`). Trong lúc chờ, kịch bản bảo vệ dùng tài khoản ADMIN cho bước bật/tắt AI |
| BE-2 | `/api/v1/pii/**` cũng `permitAll` | Xác nhận có chủ đích; nếu không, yêu cầu xác thực |
| BE-3 | `ClinicalEncounterRequest` không có validation | `@NotBlank chiefComplaint`, bắt buộc `icd10Code` hoặc `icd10Name`, validate khoảng sinh hiệu trong `vitalSignsJson`, `followUpDate` ≥ hôm nay, kiểm từng dòng `prescriptionJson` (tên + số lượng > 0) |
| BE-4 | Guard "chỉ hoàn tất khi `CHECKED_IN/IN_PROGRESS`" mới có ở `feature/fuction` | **Đã có trên `develop`**: `feature/fuction` và `feature/frontend-ux-hardening` đều đã vào `develop` (xác nhận 12/10/2026: `git merge-base --is-ancestor origin/feature/fuction origin/develop` → MERGED). Phiếu review yêu cầu gỡ merge khỏi nhánh frontend, nhưng khi sửa thì nhánh đã nằm trọn trong `develop` nên không còn gỡ được; đợt sửa làm trên nhánh mới, không đụng backend. Frontend không phụ thuộc thay đổi backend này (không đổi contract) |
| BE-5 | `forgot-password` trên `develop` chỉ lưu token, không gửi email; luồng thật ở `feature/email-notifications` | Merge `feature/email-notifications`; trang reset/verify cũng ở nhánh đó |
| BE-6 | Chưa có API danh sách gói/giá | `GET /payments/packages` trả `{code, name, priceVnd, scans, durationDays}`. **Đã có ở `954071f`** (thêm `description`, `unlimitedScans`). Frontend đã tiêu thụ API này; `config/pricing.ts` chỉ còn là fallback khi API lỗi |
| BE-14 | **Backend tự mâu thuẫn về giá:** `GET /payments/packages` trả VIP_MONTHLY = 149.000, VIP_ENTERPRISE = 399.000, nhưng `PaymentService.createCheckoutSession` vẫn thu 99.000 / 149.000 (BASIC_5 = 29.000 khớp). Bệnh nhân thấy 149.000 rồi bị yêu cầu xác nhận 99.000 | Một nguồn duy nhất cho giá (vd. enum/bảng `payment_packages` dùng chung cho cả `/packages` và `checkout`). Frontend đã chặn việc thu khác số đang hiện (bắt xác nhận lại) nhưng không tự chọn số nào đúng |
| BE-7 | `DoctorMatchDto.rating` mặc định `4.9` | Trả `null` khi chưa có đánh giá (frontend đã ẩn khi `reviewCount = 0`) |
| BE-8 | `AdminCreateDoctorRequest` mặc định `consultationFee = 300000`, `yearsOfExperience = 5`, `specialtySlugs` không bắt buộc | Bỏ mặc định, `@NotEmpty specialtySlugs`, `@Positive consultationFee` |
| BE-9 | Admin cancel / suspend nhận lý do rỗng | `@Size(min = 10)` cho `reason` khi huỷ hoặc `SUSPENDED` |
| BE-10 | `CreateAppointmentRequest.notes` không giới hạn độ dài | `@Size(max = 1000)` (frontend đang giới hạn 1000) |
| BE-11 | Dữ liệu phòng/STT/địa chỉ (`clinicRoom/Floor/Building/Address`, `sttNumber`) thường null nên phiếu khám hiện "Đang chờ xếp phòng" | Cấp STT/phòng khi check-in hoặc cấu hình phòng mặc định theo bác sĩ |
| BE-12 | `DoctorDetailDto.yearsOfExperience` là `int` nguyên thuỷ nên "chưa khai báo" thành 0 | Đổi sang `Integer`, trả `null` khi chưa khai báo |
| BE-13 | Metadata phòng thủ của `GET /triage/search/semantic` chỉ gắn vào từng phần tử: khi không có bác sĩ nào khớp, danh sách rỗng nên **mất luôn cảnh báo cấp cứu** | Trả metadata phòng thủ ở cấp response (hoặc endpoint `GET /triage/search/defense?query=`) để cảnh báo cấp cứu vẫn hiện khi không có bác sĩ nào khớp. Ghi chú thêm: `hết` là trigger NegEx nên "khám hết bao nhiêu tiền" bị xếp vào `negatedSymptoms` (frontend đã ẩn badge khi `outOfDomain`) |
| BE-15 | **Backend `develop` không khởi động được (trên mọi DB):** từ commit `7955606` (11/10/2026), `DoctorSemanticSearchService` có 2 constructor public (3 và 4 tham số) nhưng không có `@Autowired`, nên Spring tìm constructor mặc định và dừng với `No default constructor found` khi tạo `dataInitializer`. `mvn test` vẫn pass (185/185) vì unit test tự `new` service, không nạp Spring context | Thêm `@Autowired` vào constructor 4 tham số (`ClinicalQueryDefenseEngine` là `@Component` nên inject được). Nên thêm 1 test `@SpringBootTest` khởi động context để CI bắt lỗi kiểu này |
| BE-16 | **Flyway V8 lỗi trên DB trắng:** `V8__allow_null_password_hash_for_oauth.sql` (merge Google OAuth2) tạo `idx_users_google_id` trên `users.google_id`, nhưng không migration nào tạo cột này → `ERROR: column "google_id" does not exist`. DB đang dùng chạy được chỉ vì Hibernate `ddl-auto=update` đã tạo cột trước. Máy cài mới (vd. máy demo hôm bảo vệ) sẽ không lên | Thêm `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);` vào đầu V8. Sửa V8 làm đổi checksum (`validate-on-migrate=true`) nên DB cũ cần chạy `flyway repair`. Lưu ý: `mediassist_db` hiện đã ở V20 trong khi repo chỉ có tới V19 (có migration từ nhánh khác), nên nếu chọn tạo migration mới thay vì sửa V8 thì cần chốt số phiên bản |

### 4.1. Bảng token màu dùng chung (B-23)

Nguồn duy nhất: `frontend/tailwind.config.js`. Code mới dùng **thang gốc** (`brand-600`, `neutral-200`, `danger-700`…) hoặc trực tiếp `teal-*`/`slate-*` (cùng giá trị); không thêm hex mới trong trang.

| Tên | Giá trị | Dùng cho |
|:--|:--|:--|
| `brand-50…950` | thang `teal` Tailwind (600 = `#0d9488`) | Nút chính, link, nhấn mạnh thương hiệu |
| `neutral-50…950` | thang `slate` (900 = `#0f172a`) | Chữ, nền, viền |
| `success` / `warning` / `danger` / `info` | `emerald` / `amber` / `rose` / `sky` | Trạng thái (khớp `Badge` tone) |
| `primary` · `on-primary` | `slate-900` · trắng | Nút đậm, tiêu đề Landing (17.85:1) |
| `primary-container` | `slate-800` | Khối nền tối (chữ trắng 14.63:1) |
| `primary-fixed` · `on-primary-fixed` | `teal-100` · `slate-900` | Nhãn nền sáng (15.84:1) |
| `secondary` · `on-secondary` | `teal-700` · trắng | Nhấn mạnh teal, nút phụ (5.47:1) |
| `secondary-container` · `on-secondary-container` | `teal-200` · `teal-800` | Chip/huy hiệu (6.02:1) |
| `secondary-fixed` / `-dim` · `on-secondary-fixed` | `teal-200` / `teal-300` · `teal-950` | Nút sáng trên nền tối (≥ 9.78:1) |
| `surface` | `slate-50` | Nền trang (`<body>`) |
| `surface-container-lowest / low / (default) / high`, `surface-variant` | trắng / `slate-100` / `slate-100` / `slate-200` / `slate-200` | Thẻ, khối nền theo cấp |
| `on-surface` · `on-surface-variant` | `slate-900` · `slate-600` | Chữ chính (≥ 14.48:1) · chữ phụ (≥ 6.15:1) |
| `outline` · `outline-variant` | `slate-500` · `slate-300` | Chữ mờ / viền (outline trên `surface` 4.55:1) |
| `error` · `error-container` · `on-error-container` | `rose-700` · `rose-100` · `rose-900` | Lỗi (6.29:1 · 7.97:1) |

**Việc tiếp theo (chưa chuyển):** màu `indigo/blue/violet` còn trong nội dung trang — `PatientDashboard` (63), `DoctorDashboard` (50), `AdminDashboard` (22), `DocumentSummarizerPage` (21), `SymptomTriagePage` (18, header/bubble indigo), `DoctorPatientRecordsPage` (18), các trang admin (6–14). Chuyển dần sang `brand`/`info` theo từng trang, có ảnh trước/sau.

## 5. Tệp mới đáng chú ý

- `src/components/ui/*` · `src/components/booking/{SlotPicker,BookingModal}.tsx` · `src/components/clinical/VitalValue.tsx`
- `src/utils/{date,vitals,apiError,display,logger}.ts` · `src/config/{app,pricing}.ts`
- `e2e/fixtures/mockApi.ts` + 9 spec mới/viết lại · `e2e/ux-capture.spec.ts` (chụp ảnh audit, chỉ chạy khi có `UX_CAPTURE`)
