# BẢN TÓM TẮT QUẢN TRỊ REPORT 2 (EXECUTIVE SUMMARY)
## Đồ Án Tốt Nghiệp: MediAssist-AI (FPTU-KLTN-2026-MEDIASSIST)
### Báo Cáo Phân Tích Nghiệp Vụ & Mô Hình Hóa Miền (ISO/IEC/IEEE 29148:2018)

---

### 🌟 1. ĐỊNH VỊ CHUYỂN ĐỔI NGHIỆP VỤ (AS-IS VS TO-BE O2O TRANSFORMATION)

MediAssist-AI tái cấu trúc toàn diện hành trình người bệnh từ mô hình truyền thống đầy rào cản sang hệ sinh thái y tế số khép kín Online-to-Offline (O2O):

| Tiêu Chí So Sánh | Mô Hình Cũ (As-Is Traditional) | Mô Hình Mới Của MediAssist-AI (To-Be O2O) | Hiệu Quả Đột Phá |
| :--- | :--- | :--- | :--- |
| **Thời gian có mặt tại viện** | Chờ đợi 6 – 8 tiếng (Xếp hàng 4 lần) | **Có mặt trước giờ hẹn 10 phút**, vào khám thẳng | **Cắt giảm 75% thời gian chờ đợi** |
| **Định tuyến chuyên khoa** | Tự đoán bệnh, đăng ký nhầm khoa Tim/Tiêu hóa | **AI phân luồng 5 tầng + Bóc tách phủ định NegEx** | **Chính xác 100% chuyên khoa cơ quan đích** |
| **Bảo vệ rủi ro sinh tử** | Không ai cảnh báo khi chờ đợi ở sảnh | **Stage 1 Regex ngắt luồng gọi ngay Cấp cứu 115** | **Bảo vệ tính mạng người bệnh tức thời** |
| **Hồ sơ cận lâm sàng** | Cầm phiếu xét nghiệm giấy mù mờ chỉ số | **AI Vision OCR giải nghĩa LOINC bằng tiếng Việt** | **Bệnh nhân thấu hiểu bệnh trạng & an tâm** |
| **Hồ sơ bệnh án EMR** | Giấy tờ phân mảnh, dễ rách/thất lạc | **Lưu trữ trọn đời, bảo mật BOLA & Signed URL 15p** | **Bác sĩ xem toàn vẹn lịch sử điều trị** |

---

### 👥 2. BA CHÂN DUNG NGƯỜI DÙNG ĐIỂN HÌNH (CLINICAL PERSONAS)

```
[NGUYỄN VĂN NAM (45T)]           [BS. CKII LÊ HOÀNG MAI (52T)]          [TRẦN THỊ HƯƠNG (34T)]
Bệnh nhân tỉnh xa                 Trưởng khoa Lâm sàng                  Trưởng phòng CNTT Bệnh viện
Nhu cầu:                          Nhu cầu:                              Nhu cầu:
- Biết rõ triệu chứng nguy hiểm?  - Xem tóm tắt SBAR trước khi vào ca  - Giám sát ca khám & ca 115 real-time
- Đặt lịch đúng Bác sĩ Tim mạch   - Gõ tự động ICD-10 & LOINC trong 30s - Kiểm toán an ninh bất biến HIPAA
- Không phải xếp hàng 4h sáng     - Khóa lạc quan @Version gọi bệnh nhân- Chống rò rỉ dữ liệu theo Nghị định 13
```

---

### 🏛️ 3. KIẾN TRÚC 7 BOUNDED CONTEXTS THEO DOMAIN-DRIVEN DESIGN (DDD)

1. **Identity & Access Context:** Đăng nhập kép Dual-JWT (HttpOnly Cookie + Bearer), Google OAuth2 SSO, khóa Brute-Force 15 phút, kích hoạt email.
2. **Clinical Triage Context:** Tiếp nhận ngôn ngữ tự nhiên tiếng Việt, bóc tách phủ định Vietnamese NegEx, cảnh báo cấp cứu 115, chuẩn hóa SBAR.
3. **Semantic Doctor Matching Context:** Không gian vector nhúng 1536 chiều, đồ thị `pgvector HNSW`, thuật toán tái xếp hạng WHRF-SOTA.
4. **Telehealth Scheduling Context:** Đặt lịch slot 30 phút, khóa phân tán Redis Semaphore chống trùng lịch (`SLOT_CONFLICT`), cấp số thứ tự `queue_number` ("STT xx").
5. **Clinical EMR & Ontology Context:** Bệnh án điện tử EMR, lưu trữ sinh hiệu, nạp bản thể luận WHO ICD-10 (QĐ 7603) và LOINC (QĐ 3280).
6. **Multimodal Document OCR Context:** Gemini 1.5 Flash Vision trích xuất chỉ số sinh hóa, khử PII tự động theo Nghị định 13, cấp URL ký số S3 15 phút.
7. **Financial Settlement Context:** Sổ cái giao dịch VNPay (HMAC-SHA512), xử lý IPN Webhook chống lặp Idempotency, hoàn tiền tự động phân tầng.

---

### 🛡️ 4. BẢNG PHẢN BIỆN NHANH 5 CÂU HỎI THƯỜNG GẶP CỦA HỘI ĐỒNG (REPORT 2)

#### ❓ Câu 1: Tại sao phải áp dụng Domain-Driven Design (DDD) và chia thành 7 Bounded Contexts?
> **Trả lời:** *"Dạ thưa Thầy Cô, y tế là một miền nghiệp vụ cực kỳ phức tạp với các thuật ngữ mang ý nghĩa khác nhau ở từng ngữ cảnh. Ví dụ: 'Patient' ở Identity Context chỉ là một tài khoản đăng nhập (email, password); nhưng ở Scheduling Context là chủ thể của một lịch hẹn; và ở EMR Context lại là một hồ sơ tiền sử bệnh án. Chia thành 7 Bounded Contexts giúp các module độc lập cao (High Cohesion, Loose Coupling), dễ bảo trì và loại bỏ hoàn toàn sự phụ thuộc vòng."*

#### ❓ Câu 2: Mô hình To-Be O2O có khả thi tại Việt Nam khi người già ít dùng công nghệ không?
> **Trả lời:** *"Dạ thưa Thầy Cô, hệ thống thiết kế theo nguyên tắc tối giản (Accessibility-First):  
> - Người bệnh không cần gõ thuật ngữ y tế khó hiểu mà chỉ cần chat bằng từ ngữ đời thường (như 'tức ngực', 'ợ chua'), AI sẽ tự động chuẩn hóa.  
> - Quy trình đặt lịch chỉ mất 3 bước trên Web Responsive không cần cài app phức tạp.  
> - Vé khám điện tử xuất ra mã QR kèm số thứ tự (STT 01, STT 02) rõ ràng, người lớn tuổi chỉ cần đưa mã QR cho nhân viên tiếp đón tại bệnh viện quét trong 2 giây là vào khám."*

#### ❓ Câu 3: Làm thế nào giải quyết bài toán Bác sĩ quá tải không kịp nhập liệu EMR?
> **Trả lời:** *"Tại phòng khám, Bác sĩ được trang bị **Bàn làm việc Split-Screen**: Nửa màn hình hiển thị tóm tắt SBAR và phiếu xét nghiệm AI đã trích xuất sẵn; nửa còn lại là công cụ nhập liệu EMR hỗ trợ **Autocomplete danh mục WHO ICD-10 và LOINC**. Bác sĩ chỉ cần gõ 1-2 ký tự đầu là hệ thống tự điền mã bệnh và chỉ số chuẩn, giúp hoàn tất một bệnh án điện tử chỉ trong vòng 30 đến 45 giây."*

#### ❓ Câu 4: Ranh giới trách nhiệm pháp lý giữa AI và Bác sĩ được phân định ra sao trong mô hình miền?
> **Trả lời:** *"Trong mô hình miền của MediAssist-AI, thực thể `TriageSession` của AI chỉ có thuộc tính `sbarSummary` và `urgencyLevel` đóng vai trò **Trợ lý tiền lâm sàng**. Bác sĩ tại phòng khám là Actor duy nhất sở hữu quyền tạo lập `Appointment.prescriptionJson` và `Appointment.icd10Code`. Bác sĩ có chứng chỉ hành nghề độc lập ký số và chịu trách nhiệm pháp lý cao nhất đối với kết quả khám bệnh."*

#### ❓ Câu 5: Hệ thống kiểm soát tính toàn vẹn và chống trùng lặp lịch khám như thế nào?
> **Trả lời:** *"Hệ thống thiết lập cơ chế kiểm soát tương tranh hai tầng:  
> - **Tầng Ứng Dụng:** Sử dụng Redis Semaphore Lock thời gian thực khi bệnh nhân chọn slot 30 phút.  
> - **Tầng Cơ Sở Dữ Liệu:** Đặt chỉ mục duy nhất có điều kiện `CREATE UNIQUE INDEX ... ON appointments(doctor_id, scheduled_start) WHERE status != 'CANCELLED'` kết hợp Transaction Isolation mức `REPEATABLE_READ`, ngăn chặn 100% tình trạng hai bệnh nhân đặt trùng một khung giờ."*
