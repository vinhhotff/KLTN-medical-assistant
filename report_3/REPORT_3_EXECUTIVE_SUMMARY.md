# BẢN TÓM TẮT QUẢN TRỊ REPORT 3 (EXECUTIVE SUMMARY)
## Đồ Án Tốt Nghiệp: MediAssist-AI (FPTU-KLTN-2026-MEDIASSIST)
### Đặc Tả Yêu Cầu Phần Mềm (Software Requirements Specification - IEEE 830 / ISO 29148)

---

### 🌟 1. TỔNG QUAN QUY MÔ BỘ ĐẶC TẢ SRS (REPORT 3)

Báo cáo **Report 3 (SRS – Software Requirements Specification)** là văn bản đặc tả kỹ thuật đồ sộ bậc nhất của dự án MediAssist-AI, được xây dựng theo chuẩn mực kép **IEEE 830-1998** và **ISO/IEC/IEEE 29148:2018**:
* **Quy mô tài liệu:** **2.394 dòng** (215.884 ký tự), phủ kín 100% các yêu cầu chức năng (FR) và phi chức năng (NFR).
* **Số lượng Ca Sử Dụng (Use Cases):** **49 Use Cases độc lập**, mỗi Use Case được trình bày trong bảng 2 cột với đầy đủ **17 trường thông tin chuẩn IEEE 830** (Mã UC, Tên, Tác nhân, Mô tả, Điều kiện tiên quyết, Kích hoạt, Luồng sự kiện chính, Luồng rẽ nhánh, Luồng ngoại lệ, Điều kiện sau khi hoàn tất, Quy tắc nghiệp vụ, Yêu cầu phi chức năng, Rào chắn bảo mật, Rủi ro pháp lý, Giao diện ánh xạ, Dịch vụ Backend và Mã kiểm thử).
* **Phân rã biểu đồ ca sử dụng modular (100% Academic English):** Thay vì sử dụng 1 biểu đồ khổng lồ 40 node gây co nhỏ chữ, SRS phân rã thành **5 biểu đồ ca sử dụng phân hệ** sắc nét:
  - `Figure 2.2.1.A`: Common & Authentication Sub-system (8 Use Cases).
  - `Figure 2.2.1.B`: Patient Healthcare Journey & Triage Sub-system (16 Use Cases).
  - `Figure 2.2.1.C`: Doctor Clinical Workstation Sub-system (10 Use Cases).
  - `Figure 2.2.1.D`: Hospital Administration & Governance Sub-system (10 Use Cases).
  - `Figure 2.2.1.E`: External AI & Financial Integration Sub-system (5 Use Cases).

---

### 🏛️ 2. MA TRẬN 49 CA SỬ DỤNG THEO 4 NHÓM TÁC NHÂN (ACTOR USE CASES)

```
                       [MEDIASSIST-AI PLATFORM - 49 USE CASES]
                                          │
    ┌────────────────────┬────────────────┴───────────────────┬────────────────────┐
    ▼                    ▼                                    ▼                    ▼
[COMMON (8 UC)]     [PATIENT (16 UC)]                    [DOCTOR (10 UC)]     [ADMIN (15 UC)]
- Đăng nhập Dual-JWT - Triage 5 tầng (SBAR)              - Bàn làm việc EMR   - Duyệt CCHN Bác sĩ
- Google OAuth2 SSO  - Ghép nối Bác sĩ (WHRF)            - Gọi số STT (@Ver)  - Giám sát toàn viện
- Reset pass SHA-256 - Đặt lịch O2O (Redis Lock)         - ICD-10 & LOINC     - Khóa BOLA vi phạm
- Kích hoạt email    - Quét OCR xét nghiệm LOINC         - Cấu hình ca trực   - Báo cáo FinOps token
- Quản lý hồ sơ      - Thanh toán VNPay & Hoàn tiền      - Kê đơn điện tử     - Audit log bất biến
```

---

### 🛡️ 3. CÁC ĐẶC TẢ AN TOÀN Y TẾ & BẢO MẬT GIAO DỊCH THEN CHỐT

1. **Giao thức Bảo mật Tài chính VNPay:**
   - Sử dụng mã băm bảo mật **HMAC-SHA512** đối soát chữ ký số trên từng URL redirect và bản tin IPN Webhook.
   - Cơ chế xử lý Webhook IPN an toàn tuyệt đối với **Idempotency Locking (`SELECT ... FOR UPDATE`)**, loại trừ hoàn toàn nguy cơ cộng tiền hoặc kích hoạt lịch hẹn 2 lần do mạng chập chờn.
   - Thuật toán hoàn tiền tự động phân tầng theo chính sách bệnh viện: Hoàn $100\%$ trước 24h, hoàn $80\%$ trước 2h, và $0\%$ nếu hủy sát giờ khám.
2. **Rào chắn Bảo vệ Hồ sơ Bệnh nhân (BOLA/IDOR Defense):**
   - Interceptor **`PatientAccessGuard`** ở tầng Application Service kiểm tra bắt buộc phải tồn tại quan hệ điều trị thực tế (`CARE_RELATIONSHIP`) ở trạng thái hợp lệ (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`).
   - Ngăn chặn triệt để lỗ hổng Bác sĩ tò mò xem trộm bệnh án hoặc Bệnh nhân đổi URL ID để xem đơn thuốc của người khác (HTTP 403 `FORBIDDEN_CARE_RELATIONSHIP`).
3. **Tuân thủ Pháp lý Dữ liệu Cá nhân & Nghị định 13/2023/NĐ-CP:**
   - Dịch vụ **`MedicalPiiService`** tự động nhận diện và che mờ 6 nhóm thông tin nhạy cảm (Họ tên, CCCD 12 số, Mã BHYT, SĐT, Địa chỉ, Ngày sinh) trước khi gửi ra Cloud AI.
   - Giới hạn payload chuỗi `@Size(max = 20000)` chống tấn công làm tràn bộ đệm PII.
   - Toàn bộ ảnh xét nghiệm và đơn thuốc lưu trữ tại Private Supabase S3 Bucket, chỉ cấp phát qua **URL ký số HMAC-SHA256 thời hạn 15 phút**.

---

### 💬 4. KỊCH BẢN PHẢN BIỆN NHANH 5 CÂU HỎI HỘI ĐỒNG (REPORT 3)

#### ❓ Câu 1: Tại sao SRS phải phân rã biểu đồ Use Case thành 5 sơ đồ con thay vì 1 sơ đồ lớn?
> **Trả lời:** *"Dạ thưa Thầy Cô, một sơ đồ chứa toàn bộ 49 Use Cases sẽ có tới hơn 60 thực thể và hàng trăm đường nối chéo nhau ( hiện tượng 'Spaghetti Diagram'). Khi đưa vào tài liệu in ấn A4 hoặc chiếu slide, các node sẽ bị co nhỏ đến mức không thể đọc được chữ. Nhóm áp dụng **nguyên tắc phân rã mô-đun (Modular Decomposition)** thành 5 biểu đồ theo từng Bounded Context: Common, Patient, Doctor, Admin và External Integration. Thiết kế này giúp người đọc nắm bắt trực quan ranh giới trách nhiệm của từng tác nhân mà không bị rối mắt."*

#### ❓ Câu 2: Trong 49 Use Cases, Use Case nào là phức tạp nhất về mặt kỹ thuật thuật toán?
> **Trả lời:** *"Dạ thưa Thầy Cô, ca sử dụng phức tạp nhất là **`UC-PAT-02: Tìm kiếm Bác sĩ ngữ nghĩa đa tiêu chí (Semantic Doctor Matching)`**:  
> Nó kết hợp một chuỗi xử lý liên hoàn trong RAM và CSDL:  
> 1. Chuẩn hóa tiếng lóng và bóc tách phủ định bằng **Vietnamese NegEx**.  
> 2. Sinh vector đặc trưng 1536 chiều bằng `text-embedding-3-small`.  
> 3. Quét đồ thị phân tầng **PostgreSQL pgvector HNSW** với Session Tuning `ef_search = 120`.  
> 4. Tái xếp hạng bằng thuật toán **WHRF-SOTA** (Sigmoid Sharpening, Credibility Damper, Thưởng/Phạt chuyên khoa) trong cấu trúc Bounded Min-Heap chỉ mất $0.72\text{ms}$."*

#### ❓ Câu 3: Làm sao xử lý trường hợp Bệnh nhân và Bác sĩ cùng thao tác lên một ca khám (Data Race)?
> **Trả lời:** *"Hệ thống sử dụng **Khóa lạc quan (Optimistic Locking)** với trường `@Version` trên bảng `appointments`. Khi Bác sĩ bấm nút 'Gọi bệnh nhân tiếp theo' hoặc 'Hoàn tất khám', JPA sẽ kiểm tra số version của bản ghi. Nếu có bất kỳ thao tác hủy lịch đồng thời từ phía bệnh nhân làm thay đổi version, giao dịch thứ hai sẽ bị chặn lại với ngoại lệ `OptimisticLockException` và hiển thị thông báo lỗi thân thiện, bảo đảm dữ liệu không bao giờ bị ghi đè bất thường."*

#### ❓ Câu 4: Vì sao nhóm chọn tích hợp VNPay thay vì Stripe hay ví điện tử thông thường?
> **Trả lời:** *"Dạ thưa Thầy Cô, MediAssist-AI là nền tảng phục vụ người bệnh tại Việt Nam:  
> 1. **Thói quen người dùng:** VNPay hỗ trợ trực tiếp quét mã VNPAY-QR qua ứng dụng của hơn 30 ngân hàng lớn tại Việt Nam (Vietcombank, BIDV, Techcombank...), giúp người lớn tuổi không cần phải có thẻ tín dụng quốc tế Visa/Mastercard như Stripe.  
> 2. **Tiêu chuẩn pháp lý:** VNPay đạt chuẩn an ninh dữ liệu thẻ quốc tế **PCI-DSS** và được Ngân hàng Nhà nước Việt Nam cấp phép, đảm bảo tính hợp pháp 100% cho các giao dịch viện phí."*

#### ❓ Câu 5: Tính năng bóc tách OCR xét nghiệm xử lý thế nào khi người dùng tải ảnh rác hoặc file quá nặng?
> **Trả lời:** *"Nhóm xây dựng quy trình phòng thủ 3 bước:  
> - **Bước 1 (Client-Side Check):** Kiểm tra định dạng file (PNG, JPG, PDF) và dung lượng tối đa 10MB trước khi upload.  
> - **Bước 2 (Gatekeeper Sieve):** Kiểm tra Magic Bytes nhị phân và quét sơ bộ từ khóa y tế. Nếu người dùng tải lên ảnh meme hoặc hóa đơn siêu thị, bộ lọc lập tức từ chối và hoàn trả lại hạn ngạch quét cho tài khoản.  
> - **Bước 3 (Lazy Upload):** Tệp chỉ được ghi lên Supabase Storage khi AI phân tích thành công. Nếu xảy ra sự cố, file tạm bị hủy ngay lập tức, đảm bảo **Zero Orphan Files** trên Cloud."*
