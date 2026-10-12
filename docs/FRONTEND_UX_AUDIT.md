# Rà Soát & Làm Cứng Frontend MediAssist-AI (FRONTEND_UX_AUDIT.md)

> **Nhánh:** `feature/frontend-ux-hardening` (tách từ `origin/develop`, đã merge `origin/feature/fuction`)
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
| B-07 | `patient/DoctorSearchPage.tsx` | Bệnh nhân thấy nút đổi chế độ AI **toàn hệ thống** | P0 | Chỉ render khi `role === 'ADMIN'` hoặc `VITE_ENABLE_DEV_TOOLS=true`; không gọi `/system/ai-mode` với bệnh nhân | ✅ (FE) · cần backend (mục 4) |
| R-02 | `DoctorSearchPage.tsx` + `components/search/ClinicalDefenseBar.tsx` | (Phiếu review P0-2) Backend gắn metadata phòng thủ (`emergencyRedFlag`, `outOfDomain`, `affirmed/negatedSymptoms`, `normalizedClinicalQuery`) vào từng `DoctorMatchDto` nhưng UI bỏ qua: bệnh nhân gõ "đau ngực dữ dội" không thấy cảnh báo cấp cứu | P0 | "Smart Defense Bar": metadata lấy từ phần tử đầu của danh sách **gốc** (không phải danh sách đã lọc chuyên khoa); triệu chứng khẳng định = badge xanh, phủ định = badge xám gạch ngang (title NegEx); banner đỏ `role="alert"` + nút `tel:` từ `EMERGENCY_NUMBER` đặt trên danh sách; banner ngoài ngành hiện `outOfDomainGuidance` (ẩn badge vì không phải triệu chứng); `<details>` hiện `normalizedClinicalQuery`. Hiển thị nguyên chuỗi backend, không tự làm NegEx ở client. Khi danh sách rỗng backend không gửi metadata → BE-13 | ✅ (FE) · BE-13 |
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
| B-08g | ″ | Giá gói viết cứng | P1 | `src/config/pricing.ts` là nguồn duy nhất, có comment "phải khớp backend" | ✅ |
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
| B-23 | toàn app | Hai ngôn ngữ thiết kế (M3 tokens ở Landing/Login vs slate/teal); PatientLayout indigo; nạp font Material Symbols 2 lần | P2 | Layout + component mới dùng teal; bỏ font trùng. **Chưa** chuyển nội dung các trang lớn (PatientDashboard hero, Landing) sang một hệ token duy nhất | ⚠️ |
| N-23 | `tailwind.config.js` | Dùng class Tailwind 4 không tồn tại ở v3: `bg-linear-to-*` (**header modal chữ trắng trên nền trắng**), `z-60` (**modal thanh toán bị che dưới bảng giá**), `shadow-2xs`, `backdrop-blur-xs`, `animate-fadeIn/scaleUp/scaleIn`, `outline-hidden` | P2 | Định nghĩa token trong config, đổi `bg-linear`→`bg-gradient`, `z-60`→`z-[60]` | ✅ |
| B-24 | `src/components/ui/` | Thiếu bộ component dùng chung; modal đặt lịch copy 3 nơi | P2 | `Button, Field/Input/Textarea, Modal (Esc + focus trap), Toast, ConfirmDialog, EmptyState, ErrorState, Skeleton, Badge, Missing`; `booking/SlotPicker` + `booking/BookingModal` thay 3 bản copy | ✅ |
| B-25 | trang bệnh nhân | Thuật ngữ pgvector/HNSW/cosine/Spring Boot/OpenRouter/SHA-256/cổng | P2 | Câu chữ thường; chi tiết kỹ thuật (cho buổi bảo vệ) để trong `<details>` "Chi tiết kỹ thuật" | ✅ |
| B-26 | các danh sách | Thiếu skeleton/empty/error + retry; nút chỉ có icon thiếu `aria-label` | P2 | Đã làm cho: tìm bác sĩ, slot, danh bạ bệnh nhân, hồ sơ bác sĩ, lịch hẹn admin, dashboard bệnh nhân, quota; `aria-label` cho nút icon đã đụng tới. **Chưa** rà hết các bảng admin còn lại (Triage, Audit, Specialty) | ⚠️ |
| B-27 | `App.tsx` | Bundle chính 1.063 kB | P2 | `React.lazy` + `Suspense` theo route → **62 kB** (gzip 19 kB); không còn cảnh báo > 500 kB | ✅ |
| B-28 | toàn app | 31 lệnh `console.*` | P2 | Xoá hoặc dùng `utils/logger` (chỉ log khi DEV) | ✅ |
| B-29 | `frontend/e2e/*` | Spec cũ hỏng (route `/triage`, nút preset không còn, cần backend thật) | P2 | Viết lại trên mock: 11 spec, **43 test pass** (chromium + mobile-chrome) | ✅ |
| N-24 | `DoctorManagementPage` (sau sửa) | `min=1 step=10000` làm trình duyệt chặn 300000 | P2 | `min=0 step=1000` (lỗi do chính lần sửa này gây ra, test E2E đã phát hiện) | ✅ |

## 3. Việc chưa làm và lý do

1. **B-23 (một phần):** chưa thống nhất token M3 ↔ slate/teal trên toàn bộ nội dung trang. Việc này đụng gần như mọi dòng JSX của các file 1.400–3.700 dòng, rủi ro hồi quy cao. Đề xuất làm PR riêng, chuyển dần theo từng trang.
2. **B-26 (một phần):** các trang admin Triage / Audit / Specialty vẫn dùng chữ "Đang tải…" và chưa có nút thử lại.
3. **Không chạy được backend thật.** Mọi kiểm thử dựa trên mock bám DTO. Cần chạy lại checklist test tay (mục 5 của báo cáo) trên môi trường có Docker.

## 4. Yêu cầu gửi backend (Khương & Vinh)

| # | Vấn đề | Đề xuất |
|:--|:--|:--|
| BE-1 | `/api/v1/system/**` đang `permitAll` trong `SecurityConfig`: ai cũng gọi được `ai-mode/toggle`, `sync-vectors` (frontend chỉ ẩn nút) | Giới hạn `hasRole('ADMIN')`, chỉ để `GET /system/ai-mode` public nếu cần |
| BE-2 | `/api/v1/pii/**` cũng `permitAll` | Xác nhận có chủ đích; nếu không, yêu cầu xác thực |
| BE-3 | `ClinicalEncounterRequest` không có validation | `@NotBlank chiefComplaint`, bắt buộc `icd10Code` hoặc `icd10Name`, validate khoảng sinh hiệu trong `vitalSignsJson`, `followUpDate` ≥ hôm nay, kiểm từng dòng `prescriptionJson` (tên + số lượng > 0) |
| BE-4 | Guard "chỉ hoàn tất khi `CHECKED_IN/IN_PROGRESS`" mới có ở `feature/fuction` | Merge vào `develop` (nhánh này đã merge để frontend khớp) |
| BE-5 | `forgot-password` trên `develop` chỉ lưu token, không gửi email; luồng thật ở `feature/email-notifications` | Merge `feature/email-notifications`; trang reset/verify cũng ở nhánh đó |
| BE-6 | Chưa có API danh sách gói/giá | `GET /payments/packages` trả `{code, name, priceVnd, scans, durationDays}`; frontend sẽ bỏ `config/pricing.ts` |
| BE-7 | `DoctorMatchDto.rating` mặc định `4.9` | Trả `null` khi chưa có đánh giá (frontend đã ẩn khi `reviewCount = 0`) |
| BE-8 | `AdminCreateDoctorRequest` mặc định `consultationFee = 300000`, `yearsOfExperience = 5`, `specialtySlugs` không bắt buộc | Bỏ mặc định, `@NotEmpty specialtySlugs`, `@Positive consultationFee` |
| BE-9 | Admin cancel / suspend nhận lý do rỗng | `@Size(min = 10)` cho `reason` khi huỷ hoặc `SUSPENDED` |
| BE-10 | `CreateAppointmentRequest.notes` không giới hạn độ dài | `@Size(max = 1000)` (frontend đang giới hạn 1000) |
| BE-11 | Dữ liệu phòng/STT/địa chỉ (`clinicRoom/Floor/Building/Address`, `sttNumber`) thường null nên phiếu khám hiện "Đang chờ xếp phòng" | Cấp STT/phòng khi check-in hoặc cấu hình phòng mặc định theo bác sĩ |
| BE-12 | `DoctorDetailDto.yearsOfExperience` là `int` nguyên thuỷ nên "chưa khai báo" thành 0 | Đổi sang `Integer`, trả `null` khi chưa khai báo |
| BE-13 | Metadata phòng thủ của `GET /triage/search/semantic` chỉ gắn vào từng phần tử: khi không có bác sĩ nào khớp, danh sách rỗng nên **mất luôn cảnh báo cấp cứu** | Trả metadata phòng thủ ở cấp response (hoặc endpoint `GET /triage/search/defense?query=`) để cảnh báo cấp cứu vẫn hiện khi không có bác sĩ nào khớp. Ghi chú thêm: `hết` là trigger NegEx nên "khám hết bao nhiêu tiền" bị xếp vào `negatedSymptoms` (frontend đã ẩn badge khi `outOfDomain`) |

## 5. Tệp mới đáng chú ý

- `src/components/ui/*` · `src/components/booking/{SlotPicker,BookingModal}.tsx` · `src/components/clinical/VitalValue.tsx`
- `src/utils/{date,vitals,apiError,display,logger}.ts` · `src/config/{app,pricing}.ts`
- `e2e/fixtures/mockApi.ts` + 9 spec mới/viết lại · `e2e/ux-capture.spec.ts` (chụp ảnh audit, chỉ chạy khi có `UX_CAPTURE`)
