# -*- coding: utf-8 -*-
"""
Part 2: 2.3.2 Patient Use Case Specifications (UC-PAT-01 to UC-PAT-18).
Exhaustive 17-field tabular specifications for each patient use case.
Derived 100% from actual MediAssist-AI codebase.
"""

def get_content():
    return """
#### 2.3.2 Patient (Portal & Triage)

##### 2.3.2.1 Conversational AI Symptom Triage (UC-PAT-01)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-01` |
| **Use Case Name** | Conversational AI Symptom Triage |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | Google Gemini 1.5 Flash Vision, OpenAI text-embedding-3-small |
| **Description** | MediAssist-AI Clinical Triage Subsystem — - Symptom input processed by 5-Stage Defense Engine.<br>- AI generates structured SBAR clinical report (Situation, Background, Assessment, Recommendation).<br>- Clinical urgency level (`ROUTINE`, `URGENT`, `EMERGENCY`) and recommended specialty determined.<br>- Triage record persisted in `triage_sessions` table (Flyway V1, V15).<br>- Matching specialist doctors retrieved via pgvector semantic search. |
| **Trigger** | Patient sends symptom description on `/patient/triage`. |
| **Pre-conditions** | - Patient is authenticated (or accessing guest preview).<br>- AI Inference Gateway (Gemini 1.5 Flash / OpenRouter) is operational. |
| **Post-conditions** | - Symptom input processed by 5-Stage Defense Engine.<br>- AI generates structured SBAR clinical report (Situation, Background, Assessment, Recommendation).<br>- Clinical urgency level (`ROUTINE`, `URGENT`, `EMERGENCY`) and recommended specialty determined.<br>- Triage record persisted in `triage_sessions` table (Flyway V1, V15).<br>- Matching specialist doctors retrieved via pgvector semantic search. |
| **Normal Flow** | Step 1: Patient enters symptom query into chat box on `/patient/triage` (e.g., "Tôi bị sốt cao 39 độ, ho có đờm xanh và tức ngực 3 ngày nay").<br>Step 2: Frontend sends HTTP POST to `/api/v1/triage/assess` with `TriageRequest(symptoms, conversationHistory, age, gender)`.<br>Step 3: Backend passes input through `ClinicalQueryDefenseEngine` (UC-PAT-02).<br>Step 4: System verifies non-emergency clinical symptom description.<br>Step 5: Backend constructs clinical prompt with SBAR format directives and clinical safety boundaries:<br>- Prohibit definitive diagnosis and medication prescriptions.<br>- Instruct model to suggest clarifying questions if clinical details are ambiguous.<br>Step 6: Backend dispatches prompt to Google Gemini 1.5 Flash API (Priority 1) or OpenRouter (Priority 2).<br>Step 7: AI inference returns structured `ClinicalAiResult` containing:<br>- `sbarSummary`: Situation, Background, Assessment, Recommendation.<br>- `urgencyLevel`: `ROUTINE` or `URGENT`.<br>- `recommendedSpecialtyId`: UUID of matched medical specialty.<br>- `clarifyingQuestions`: 1-2 follow-up questions to refine presentation.<br>Step 8: Backend calls `DoctorSemanticSearchService` to match top 3 specialist doctors for the recommended specialty.<br>Step 9: Backend saves session record into `triage_sessions` table (`sbar_summary`, `urgency_level`, `recommended_specialty_id`).<br>Step 10: Backend returns HTTP 200 OK with `TriageResponse` DTO.<br>Step 11: Frontend renders conversational response bubble, SBAR assessment card, and matched specialist doctor cards. |
| **Alternative Flow** | - Alt Flow 11a: Acute Red-Flag Emergency Detected:<br>1. Defense Engine flags acute emergency condition (FAST stroke, acute myocardial infarction, severe anaphylaxis).<br>2. Normal flow interrupted immediately (Divert to UC-PAT-02 Alt Flow 10a).<br>- Alt Flow 11b: AI Gateway Overloaded / Rate Limited:<br>1. Gemini API throws `AiProviderOverloadedException` (HTTP 429).<br>2. Router falls back to OpenRouter pool or `DeterministicFallbackAiProvider` (local keyword heuristics). |
| **Exceptions** | - Exc Flow 12a: Empty or Too Short Input:<br>1. Symptoms text is under 3 characters.<br>2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INPUT_TOO_SHORT", "Vui lòng mô tả triệu chứng cụ thể hơn (tối thiểu 3 ký tự).")`.<br>- Exc Flow 12b: Input Exceeds Maximum Length:<br>1. Symptoms text exceeds 2,000 characters.<br>2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INPUT_TOO_LONG", "Mô tả triệu chứng không được vượt quá 2000 ký tự.")`. |
| **Priority** | High (P0 - Core Differentiator) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-10: Medical disclaimer mandatory: "Kết quả sàng lọc mang tính chất tham khảo, không thay thế chẩn đoán y khoa chính thức từ bác sĩ."<br>- BR-11: Triage rate limited to prevent API abuse (`TriageRateLimiterService`). |
| **Data Entities Involved** | - `triage_sessions` (id, user_id, chief_complaint, raw_symptoms, sbar_summary, urgency_level, recommended_specialty_id, created_at). |
| **User Interface Controls** | - Chat message stream, symptom text input, quick symptom chips, SBAR summary card, matched doctor cards. |


##### 2.3.2.2 5-Stage Clinical Query Defense Screening (UC-PAT-02)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-02` |
| **Use Case Name** | 5-Stage Clinical Query Defense Screening |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient (System Interceptor) |
| **Secondary Actor** | Google Gemini 1.5 Flash Vision, OpenAI text-embedding-3-small |
| **Description** | MediAssist-AI Clinical Query Defense Engine — - Query sanitized, normalized, and categorized, OR intercepted with emergency lockout / administrative redirect. |
| **Trigger** | Invoked automatically on every natural language symptom query. |
| **Pre-conditions** | Raw text received by `TriageController` or `DoctorSemanticSearchService`. |
| **Post-conditions** | - Query sanitized, normalized, and categorized, OR intercepted with emergency lockout / administrative redirect. |
| **Normal Flow** | Step 1: Input text passes to `ClinicalQueryDefenseEngine.process(rawInput)`.<br>Step 2: Stage 1 — Acute Red-Flag Emergency Interception:<br>Engine checks input against regex patterns for acute emergencies:<br>- Đột quỵ não (FAST): "méo miệng", "liệt nửa người", "nói ngọng", "mờ mắt đột ngột".<br>- Nhồi máu cơ tim: "đau thắt ngực lan ra cánh tay trái", "vã mồ hôi lạnh", "khó thở dữ dội".<br>- Sốc phản vệ / Cấp cứu: "khó thở sau dùng thuốc", "sưng phù môi họng", "nôn ra máu tươi".<br>If match found -> Divert to Alternative Flow 10a.<br>Step 3: Stage 2 — Vietnamese Slang & Teen-Code Normalization:<br>Engine converts informal phrasing into medical terminology:<br>- `ko`, `k`, `khg` -> `không`<br>- `bs`, `bsi` -> `bác sĩ`<br>- `dau da day` -> `đau dạ dày`<br>- `met` -> `mệt mỏi`<br>- `sot cao` -> `sốt cao`<br>Step 4: Stage 3 — Vietnamese NegEx Clause-Level Negation Splitting:<br>Engine identifies negation trigger terms: `không bị`, `chưa từng`, `không có`, `không sốt`.<br>Input is split into Affirmative Clause and Negated Clause.<br>Negated symptoms (e.g., "không sốt") are quarantined to prevent false routing to infectious disease doctors.<br>Step 5: Stage 4 — Out-of-Domain (OOD) Intent Gating:<br>Engine checks if query is administrative or greeting chatter (viện phí, giờ khám, bảo hiểm).<br>If OOD found -> Divert to Alternative Flow 10b.<br>Step 6: Stage 5 — Compound Multi-Symptom Decomposition:<br>Engine splits multi-symptom conjunctions (`đồng thời`, `kèm theo`, `và`) into sub-queries.<br>Step 7: Engine outputs sanitized string and affirmative clause for downstream embedding generation. |
| **Alternative Flow** | - Alt Flow 10a: Emergency Red-Flag Interception:<br>1. Engine sets `isEmergency = true`, `urgency = EMERGENCY`.<br>2. Engine attaches emergency response banner:<br>"CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn có dấu hiệu cấp cứu y khoa đe dọa tính mạng! Vui lòng gọi ngay Cấp cứu 115 hoặc đến khoa Cấp cứu bệnh viện gần nhất!"<br>3. Booking controls locked; 115 call hotline button highlighted in red.<br>- Alt Flow 10b: Out-of-Domain Administrative Gating:<br>1. Engine identifies administrative query.<br>2. Returns guidance text directing user to hospital customer service hotline (1900-xxxx). |
| **Exceptions** | None. |
| **Priority** | High (P0 - Patient Safety Critical) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-12: Red-flag check must run in-memory synchronously with zero external network dependencies. |
| **Data Entities Involved** | None (pure computational in-memory defense engine). |
| **User Interface Controls** | Red Emergency Alert Banner, 115 Call Button. |


##### 2.3.2.3 Semantic Doctor Search via pgvector HNSW (UC-PAT-03)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-03` |
| **Use Case Name** | Semantic Doctor Search via pgvector HNSW |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | Google Gemini 1.5 Flash Vision, OpenAI text-embedding-3-small |
| **Description** | MediAssist-AI Vector Search Subsystem — - System executes session-tuned vector similarity query.<br>- Candidates re-ranked using Weighted Hybrid Re-Ranking Formula (WHRF) in a bounded min-heap.<br>- Ranked list of qualified specialist doctors returned with match compatibility scores. |
| **Trigger** | Patient enters symptoms into search bar on `/patient/doctors`. |
| **Pre-conditions** | - Verified doctor profiles have pre-computed 1536-d embeddings in `doctor_profiles.bio_embedding`.<br>- PostgreSQL 16 HNSW index `idx_doctor_bio_hnsw_verified` is active (Flyway V11). |
| **Post-conditions** | - System executes session-tuned vector similarity query.<br>- Candidates re-ranked using Weighted Hybrid Re-Ranking Formula (WHRF) in a bounded min-heap.<br>- Ranked list of qualified specialist doctors returned with match compatibility scores. |
| **Normal Flow** | Step 1: Patient types symptoms on `/patient/doctors` (e.g., "đau dạ dày ợ chua trào ngược").<br>Step 2: Frontend dispatches HTTP GET to `/api/v1/triage/search/semantic?query=...&limit=5`.<br>Step 3: Backend passes query through `ClinicalQueryDefenseEngine`.<br>Step 4: Backend calls `EmbeddingService` to compute 1536-d dense vector using `openai/text-embedding-3-small`.<br>Step 5: Backend applies PostgreSQL session tuning:<br>- `SET LOCAL hnsw.ef_search = 120;`<br>- `SET LOCAL enable_seqscan = off;`<br>- `SET LOCAL work_mem = '64MB';`<br>Step 6: Backend executes vector similarity query against `doctor_profiles`:<br>`SELECT d.*, 1 - (d.bio_embedding <=> :queryEmbedding) AS cosine_sim FROM doctor_profiles d WHERE d.is_verified = true ...`<br>Step 7: Candidates processed through Bounded Min-Heap executing WHRF Re-ranking:<br>- Sigmoid Contrastive Sharpening: $S_{dense} = \frac{1}{1 + e^{-8.0(cosine\_sim - 0.65)}}$<br>- Sparse lexical overlap bonus<br>- Specialty Match Boost: $+0.12$<br>- Divergence Penalty: $-0.10$<br>- Credibility Damper: $\log_{10}(\text{review\_count} + 1) / \log_{10}(100)$<br>Step 8: Top $K=5$ doctors serialized into `DoctorMatchDto` list.<br>Step 9: Frontend renders doctor cards with match percentage, specialty badge, rating, fee, and available slots. |
| **Alternative Flow** | - Alt Flow 11a: Embedding Service Offline:<br>1. Backend falls back to local Unsupervised Feature Hashing (Character N-gram FNV-1a).<br>2. Search completes with degraded semantic precision. |
| **Exceptions** | None. |
| **Priority** | High (P0 - Core Differentiator) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-13: Only verified doctors (`is_verified = true`) are visible in search results. |
| **Data Entities Involved** | - `doctor_profiles` (id, user_id, specialty_id, bio_embedding, rating_avg, review_count, consultation_fee, is_verified).<br>- `specialties`. |
| **User Interface Controls** | - Search input, Specialty filter, Price filter, Doctor card list, "Đặt Lịch Khám" button. |


##### 2.3.2.4 View Doctor Details & Available Slots (UC-PAT-04)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-04` |
| **Use Case Name** | View Doctor Details & Available Slots |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Doctor Directory Subsystem — Doctor bio, credentials, CCHN number, and 30-min consultation slots rendered. |
| **Trigger** | Patient selects doctor card to view schedule and credentials. |
| **Pre-conditions** | Doctor account exists and is verified. |
| **Post-conditions** | Doctor bio, credentials, CCHN number, and 30-min consultation slots rendered. |
| **Normal Flow** | Step 1: Patient clicks doctor card on `/patient/doctors`.<br>Step 2: Frontend calls HTTP GET `/api/v1/doctors/{id}` to fetch `DoctorDetailDto`.<br>Step 3: Frontend calls HTTP GET `/api/v1/doctors/{id}/slots?date=YYYY-MM-DD` to fetch available slots.<br>Step 4: Backend retrieves `doctor_schedule_slots` and filters out existing bookings from `appointments`.<br>Step 5: Backend returns list of `DoctorSlotDto` (startTime, endTime, isAvailable).<br>Step 6: Frontend renders doctor profile header, CCHN license badge, bio, fee, and slot grid. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Doctor Not Found:<br>1. Backend throws HTTP 404 Not Found. |
| **Priority** | Medium (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-14: Doctor practice certificate number (CCHN) must be publicly displayed. |
| **Data Entities Involved** | `doctor_profiles`, `doctor_schedule_slots`, `appointments`. |
| **User Interface Controls** | Date picker, 30-minute slot chips, "Đặt Lịch" action button. |


##### 2.3.2.5 Upload Medical Document & Vision OCR (UC-PAT-05)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-05` |
| **Use Case Name** | Upload Medical Document & Vision OCR |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | Google Gemini 1.5 Flash Vision, OpenAI text-embedding-3-small |
| **Description** | MediAssist-AI Document Ingestion Subsystem — - SHA-256 checksum computed for deduplication.<br>- Document stored in private Supabase S3 bucket `medical-documents`.<br>- Record inserted in `medical_documents` with status `ANALYZED`.<br>- OCR extraction saved in `document_analyses` table (Flyway V1, V5, V20). |
| **Trigger** | Patient uploads a medical document file on `/patient/documents`. |
| **Pre-conditions** | - Patient is authenticated.<br>- File format: PDF, PNG, or JPEG; size <= 10MB; PDF pages <= 10. |
| **Post-conditions** | - SHA-256 checksum computed for deduplication.<br>- Document stored in private Supabase S3 bucket `medical-documents`.<br>- Record inserted in `medical_documents` with status `ANALYZED`.<br>- OCR extraction saved in `document_analyses` table (Flyway V1, V5, V20). |
| **Normal Flow** | Step 1: Patient drops lab test file (blood test, urinalysis, ultrasound) onto upload zone.<br>Step 2: Frontend validates file size (<= 10MB) and MIME type.<br>Step 3: Frontend calls HTTP POST `/api/v1/documents/analyze` with multipart file.<br>Step 4: Backend `MedicalDocumentValidator` validates PDF page limit (<= 10 pages) and checks file signature.<br>Step 5: Backend computes SHA-256 hash (`file_hash`).<br>Step 6: Backend checks for duplicate upload in `medical_documents`.<br>Step 7: Backend streams file to Supabase S3 private bucket under path `documents/{patientId}/{uuid}.ext`.<br>Step 8: Backend calls Google Gemini 1.5 Flash Vision API to perform multimodal OCR and clinical extraction.<br>Step 9: Backend extracts biomarkers table, abnormal indicators, LOINC codes, and layperson summary.<br>Step 10: Backend saves metadata in `medical_documents` (`storage_path`) and extraction in `document_analyses`.<br>Step 11: Backend decrements user's remaining AI quota in `patient_profiles.remaining_ai_quota`.<br>Step 12: Backend returns HTTP 200 OK with `DocumentAnalysisResponse`.<br>Step 13: Frontend renders split-view modal with extracted indicators and plain-text summary. |
| **Alternative Flow** | - Alt Flow 11a: Identical Duplicate Document:<br>1. Backend finds existing document with matching SHA-256 hash for this patient.<br>2. Backend returns cached analysis without re-uploading or consuming AI quota. |
| **Exceptions** | - Exc Flow 12a: File Too Large (> 10MB):<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", ...)`.<br>- Exc Flow 12b: Quota Depleted:<br>1. Patient has 0 remaining AI quota.<br>2. Backend prompts patient to purchase additional analysis quota (UC-PAT-08). |
| **Priority** | High (P0) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-15: Medical documents must reside strictly in private S3 buckets. Public URLs forbidden (V20). |
| **Data Entities Involved** | - `medical_documents`, `document_analyses`, `patient_profiles`. |
| **User Interface Controls** | - Drag-and-drop zone, file preview thumbnail, "Phân Tích AI" button, quota counter badge. |


##### 2.3.2.6 Inspect Extracted Biomarkers & LOINC Codes (UC-PAT-06)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-06` |
| **Use Case Name** | Inspect Extracted Biomarkers & LOINC Codes |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient, Attending Doctor |
| **Secondary Actor** | Google Gemini 1.5 Flash Vision, OpenAI text-embedding-3-small |
| **Description** | MediAssist-AI Clinical Analysis Subsystem — Structured biomarker table and layperson summary displayed. |
| **Trigger** | User clicks "Xem Phân Tích" on an uploaded medical document. |
| **Pre-conditions** | Document has been analyzed (`document_analyses` record exists). |
| **Post-conditions** | Structured biomarker table and layperson summary displayed. |
| **Normal Flow** | Step 1: User selects document from document list on `/patient/documents`.<br>Step 2: Frontend calls HTTP GET `/api/v1/documents/{id}/analysis`.<br>Step 3: Backend enforces `PatientAccessGuard` verifying patient ownership or doctor care relationship.<br>Step 4: Backend retrieves `document_analyses` record joined with `medical_documents`.<br>Step 5: Backend returns payload containing:<br>- Table of biomarkers: Test name, measured value, unit, reference range, status (`NORMAL`, `ELEVATED`, `LOW`).<br>- Standardized LOINC codes.<br>- Layperson clinical summary in plain Vietnamese.<br>- Recommended medical specialty.<br>Step 6: Frontend renders interactive table with abnormal rows highlighted in red or amber. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Unauthorized Access (IDOR Attempt):<br>1. Backend throws `AppException(HttpStatus.FORBIDDEN, "FORBIDDEN_PATIENT_ACCESS", ...)`. |
| **Priority** | High (P0) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-10: Medical safety disclaimer mandatory on all biomarker views.<br>- BR-16: Numerical lab values must retain exact precision extracted from the scan. |
| **Data Entities Involved** | `medical_documents`, `document_analyses`. |
| **User Interface Controls** | Biomarker table, status pills, layperson accordion. |


##### 2.3.2.7 Download Document File via 15-Minute Signed URL (UC-PAT-07)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-07` |
| **Use Case Name** | Download Document File via 15-Minute Signed URL |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient, Authorized Doctor |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Storage Subsystem — 15-minute temporary signed URL generated; file stream returned. |
| **Trigger** | User clicks "Tải Tệp Gốc" or previews source file. |
| **Pre-conditions** | Document exists in private Supabase S3 bucket. |
| **Post-conditions** | 15-minute temporary signed URL generated; file stream returned. |
| **Normal Flow** | Step 1: User clicks download/preview icon for document ID.<br>Step 2: Frontend calls HTTP GET `/api/v1/documents/{id}/file` or `/api/v1/documents/{id}/signed-url`.<br>Step 3: Backend verifies authorization via `PatientAccessGuard`.<br>Step 4: Backend retrieves `storage_path` from `medical_documents`.<br>Step 5: Backend invokes `SupabaseStorageService.createSignedUrl(storagePath, 900)` (TTL = 15 minutes / 900 seconds).<br>Step 6: Backend returns `DocumentFileAccessDto(signedUrl, expiresInSeconds=900)`.<br>Step 7: Browser opens secure preview or initiates direct download. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: File Missing from Storage:<br>1. Backend throws `AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", ...)`. |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-15: Direct public links to medical files are strictly forbidden (Flyway V20). |
| **Data Entities Involved** | `medical_documents`, `audit_logs`. |
| **User Interface Controls** | Download button, progress spinner. |


##### 2.3.2.8 Purchase AI Analysis Quota (UC-PAT-08)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-08` |
| **Use Case Name** | Purchase AI Analysis Quota |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | VNPay Payment Gateway, Mock Payment Sandbox |
| **Description** | MediAssist-AI Payment & Quota Subsystem — Payment checkout initiated; quota credited upon successful transaction. |
| **Trigger** | Patient clicks "Mua Thêm Hạn Ngạch" on `/patient/documents`. |
| **Pre-conditions** | Patient is authenticated. |
| **Post-conditions** | Payment checkout initiated; quota credited upon successful transaction. |
| **Normal Flow** | Step 1: Patient opens Quota Purchase modal on `/patient/documents`.<br>Step 2: Frontend calls HTTP GET `/api/v1/payments/packages` to display quota tiers:<br>- Gói Tiêu Chuẩn: 5 lượt phân tích (50.000 VNĐ).<br>- Gói Nâng Cao: 15 lượt phân tích (120.000 VNĐ).<br>- Gói Không Giới Hạn: 50 lượt phân tích (300.000 VNĐ).<br>Step 3: Patient selects package and clicks "Thanh Toán".<br>Step 4: Frontend calls HTTP POST `/api/v1/payments/create-url` with `orderType = QUOTA_PURCHASE`.<br>Step 5: Backend initializes payment via Stripe or Mock Sandbox.<br>Step 6: Patient completes payment; transaction verified via `POST /api/v1/payments/verify`.<br>Step 7: Backend increments `patient_profiles.remaining_ai_quota`.<br>Step 8: Frontend updates quota balance badge. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | None. |
| **Data Entities Involved** | `patient_profiles`, `payment_transactions`. |
| **User Interface Controls** | Package selection cards, payment checkout modal. |


##### 2.3.2.9 Book In-Clinic Appointment & Slot Reservation (UC-PAT-09)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-09` |
| **Use Case Name** | Book In-Clinic Appointment & Slot Reservation |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Clinical Scheduling Subsystem — - Appointment record created with status `SCHEDULED` and payment status `UNPAID`.<br>- Sequential daily STT queue number assigned (`queue_number = 'STT 01'`).<br>- Clinic room assigned from doctor profile. |
| **Trigger** | Patient confirms slot selection in `BookingModal`. |
| **Pre-conditions** | - Patient is authenticated with verified email (`email_verified = true`).<br>- Doctor is verified (`is_verified = true`) and active (`is_active = true`). |
| **Post-conditions** | - Appointment record created with status `SCHEDULED` and payment status `UNPAID`.<br>- Sequential daily STT queue number assigned (`queue_number = 'STT 01'`).<br>- Clinic room assigned from doctor profile. |
| **Normal Flow** | Step 1: Patient selects doctor and 30-min slot on `/patient/doctors` (e.g., 2026-10-20 09:00:00 to 09:30:00).<br>Step 2: Patient opens `BookingModal`, enters chief complaint, and optionally selects an uploaded `medicalDocumentId`.<br>Step 3: Frontend calls HTTP POST `/api/v1/appointments` with `CreateAppointmentRequest`.<br>Step 4: Backend checks doctor status (`DOCTOR_NOT_ACTIVE`, `DOCTOR_NOT_VERIFIED`).<br>Step 5: Backend checks clinic hours: Monday–Saturday, 08:00–12:00 & 13:30–17:00 (Sundays blocked).<br>Step 6: Backend verifies slot vacancy:<br>`SELECT COUNT(*) FROM appointments WHERE doctor_id = :d AND scheduled_start = :s AND status NOT IN ('CANCELLED')`<br>Step 7: Backend calculates next daily sequential queue number:<br>`queue_number = String.format("STT %02d", countToday + 1)`.<br>Step 8: Backend generates unique `appointment_code` (e.g., `AP-20261020-XXXX`).<br>Step 9: Backend sets `clinic_room = doctorProfile.getClinicRoom()`.<br>Step 10: Backend inserts record into `appointments` with status `SCHEDULED`.<br>Step 11: Backend returns HTTP 201 Created with `AppointmentDto`.<br>Step 12: Frontend opens payment modal or redirects to checkout. |
| **Alternative Flow** | - Alt Flow 11a: Concurrent Slot Collision:<br>1. Another patient booked the same slot milliseconds earlier.<br>2. Backend detects conflict and throws `AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác.")`.<br>3. Frontend refreshes slot picker. |
| **Exceptions** | - Exc Flow 12a: Sunday Booking Attempt:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_DAY", "Bệnh viện không tiếp nhận lịch hẹn vào Chủ Nhật.")`.<br>- Exc Flow 12b: Outside Operating Hours:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_TIME", "Khung giờ khám hợp lệ là 08:00-12:00 và 13:30-17:00.")`. |
| **Priority** | High (P0) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-17: In-clinic consultations operate strictly Monday–Saturday, 08:00–12:00 & 13:30–17:00.<br>- BR-20: Queue numbers (STT) are sequential per doctor per calendar date starting at STT 01. |
| **Data Entities Involved** | `appointments`, `doctor_profiles`, `users`. |
| **User Interface Controls** | `BookingModal`, slot pills, document select dropdown, "Xác Nhận Đặt Lịch" button. |


##### 2.3.2.10 Process Payment via VNPay / Mock Sandbox (UC-PAT-10)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-10` |
| **Use Case Name** | Process Payment via VNPay / Mock Sandbox |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | VNPay Payment Gateway, Mock Payment Sandbox |
| **Description** | MediAssist-AI Payment Gateway Subsystem — - Payment authorized and settled.<br>- `appointments.payment_status` updated to `PAID`.<br>- Record inserted in `payment_transactions` with status `SUCCESS`.<br>- Confirmation notification dispatched to patient. |
| **Trigger** | Patient proceeds to pay consultation fee for scheduled appointment. |
| **Pre-conditions** | Appointment exists with `payment_status = UNPAID`. |
| **Post-conditions** | - Payment authorized and settled.<br>- `appointments.payment_status` updated to `PAID`.<br>- Record inserted in `payment_transactions` with status `SUCCESS`.<br>- Confirmation notification dispatched to patient. |
| **Normal Flow** | Step 1: Patient selects payment method (VNPay QR / ATM Card or Mock Sandbox).<br>Step 2: Frontend calls HTTP POST `/api/v1/payments/checkout` with `CreatePaymentRequest(orderType=APPOINTMENT_FEE, appointmentId=...)`.<br>Step 3: Backend verifies `app.payment.mock.enabled`:<br>- If production (`mock.enabled = false`): Routes to VNPay Payment Gateway, generates HMAC-SHA512 checksum URL.<br>- If demo/dev (`mock.enabled = true`): Routes to Mock Payment Gateway.<br>Step 4: Backend creates `PaymentTransaction` record with status `PENDING`.<br>Step 5: Patient submits payment details; gateway returns transaction confirmation.<br>Step 6: Frontend calls HTTP VNPay IPN Webhook `/api/v1/payments/vnpay-ipn` with `VerifyPaymentRequest(transactionCode)`.<br>Step 7: Backend verifies transaction with gateway and updates `payment_transactions.status = SUCCESS`.<br>Step 8: Backend updates `appointments.payment_status = PAID`.<br>Step 9: Backend publishes `PaymentCompletedEvent` -> dispatches confirmation email.<br>Step 10: Frontend redirects to `/payment/success` with receipt details. |
| **Alternative Flow** | - Alt Flow 11a: VNPay IPN Webhook Asynchronous Capture:<br>1. VNPay posts webhook to `/api/v1/payments/vnpay-ipn`.<br>2. Backend validates HMAC-SHA512 checksum and auto-fulfills with idempotency lock appointment payment status. |
| **Exceptions** | - Exc Flow 12a: Mock Payment Attempt in Production:<br>1. Backend detects `mock.enabled = false` and throws `AppException(HttpStatus.FORBIDDEN, "MOCK_PAYMENT_DISABLED", ...)`. |
| **Priority** | High (P0) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-19: Mock payment permanently disabled in production mode (Security Audit BE-10). |
| **Data Entities Involved** | `payment_transactions`, `appointments`. |
| **User Interface Controls** | Payment modal, VNPay QR iframe, "Thanh Toán VNPay" button. |


##### 2.3.2.11 View Electronic Encounter Slip & Admission STT (UC-PAT-11)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-11` |
| **Use Case Name** | View Electronic Encounter Slip & Admission STT |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient, Clinic Reception |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Appointment Subsystem — Electronic admission slip rendered with clinic navigation details. |
| **Trigger** | Patient accesses ticket view for confirmed appointment. |
| **Pre-conditions** | Appointment exists. |
| **Post-conditions** | Electronic admission slip rendered with clinic navigation details. |
| **Normal Flow** | Step 1: Patient clicks "Xem Phiếu Khám" from dashboard or appointment card.<br>Step 2: Frontend calls HTTP GET `/api/v1/appointments/{id}/ticket`.<br>Step 3: Backend verifies user ownership or staff access via `PatientAccessGuard`.<br>Step 4: Backend returns ticket DTO:<br>- Sequential Queue Number (e.g., `STT 05`).<br>- Appointment Code (e.g., `AP-20261020-0012`).<br>- Patient Name, Scheduled Date & Time Window.<br>- Attending Doctor Name, Academic Title, Specialty.<br>- Clinic Room (e.g., "Phòng Khám 204 - Khu Khám Yêu Cầu").<br>- Preparation Instructions (nhịn ăn 8h nếu xét nghiệm máu, mang CCCD).<br>Step 5: Frontend renders styled digital encounter ticket card with print button. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-20: Sequential STT displayed prominently on all tickets. |
| **Data Entities Involved** | `appointments`, `doctor_profiles`, `users`. |
| **User Interface Controls** | Ticket frame, "In Phiếu Khám" button, "Xem Lịch Hẹn" link. |


##### 2.3.2.12 View Patient Appointment History (UC-PAT-12)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-12` |
| **Use Case Name** | View Patient Appointment History |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Patient Appointment Subsystem — List of user appointments rendered with status badges. |
| **Trigger** | Patient navigates to appointments section on `/patient`. |
| **Pre-conditions** | Patient is authenticated. |
| **Post-conditions** | List of user appointments rendered with status badges. |
| **Normal Flow** | Step 1: Patient views appointments section on `/patient`.<br>Step 2: Frontend calls HTTP GET `/api/v1/appointments/my`.<br>Step 3: Backend queries `appointments` for `patient_id = currentUserId` ordered by `scheduled_start DESC`.<br>Step 4: Backend returns `List<AppointmentDto>`.<br>Step 5: Frontend renders cards showing Doctor name, Date/Time, STT, and status badge (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`). |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | None. |
| **Data Entities Involved** | `appointments`, `users`, `doctor_profiles`. |
| **User Interface Controls** | Appointment cards, status pills, filter tabs. |


##### 2.3.2.13 Patient Check-In for In-Clinic Appointment (UC-PAT-13)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-13` |
| **Use Case Name** | Patient Check-In for In-Clinic Appointment |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient, Clinic Receptionist |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Clinical Scheduling Subsystem — `checked_in_at` timestamp recorded; appointment marked ready in doctor queue. |
| **Trigger** | Patient arrives at hospital and checks in. |
| **Pre-conditions** | Appointment status is `SCHEDULED`. |
| **Post-conditions** | `checked_in_at` timestamp recorded; appointment marked ready in doctor queue. |
| **Normal Flow** | Step 1: Patient clicks "Tôi Đã Đến Phòng Khám (Check-in)" on appointment card.<br>Step 2: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/check-in`.<br>Step 3: Backend verifies user is the appointment patient or assigned doctor.<br>Step 4: Backend sets `checkedInAt = LocalDateTime.now()`.<br>Step 5: Backend commits update to `appointments` table.<br>Step 6: Backend returns HTTP 200 OK with updated appointment DTO.<br>Step 7: Frontend updates appointment badge to "Đã Check-in / Sẵn Sàng Khám". |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Check-in on non-scheduled appointment:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_CHECKIN", ...)`. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | None. |
| **Data Entities Involved** | `appointments`. |
| **User Interface Controls** | "Check-in Ngay" button, check-in confirmation badge. |


##### 2.3.2.14 Reschedule Active Appointment (UC-PAT-14)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-14` |
| **Use Case Name** | Reschedule Active Appointment |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Clinical Scheduling Subsystem — `scheduled_start` and `scheduled_end` updated to new available slot. |
| **Trigger** | Patient selects "Dời Lịch Khám" on active appointment. |
| **Pre-conditions** | - Appointment is in `SCHEDULED` status.<br>- New appointment time is at least 2 hours in the future. |
| **Post-conditions** | `scheduled_start` and `scheduled_end` updated to new available slot. |
| **Normal Flow** | Step 1: Patient opens reschedule dialog on appointment card.<br>Step 2: Patient selects new date and slot from doctor's available schedule.<br>Step 3: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/reschedule` with `RescheduleAppointmentRequest(newScheduledStart, newScheduledEnd)`.<br>Step 4: Backend checks current appointment status is `SCHEDULED`.<br>Step 5: Backend verifies new slot is >= 2 hours from current time (`PAST_DATE`).<br>Step 6: Backend verifies clinic hours (Monday–Saturday, 08:00–12:00 / 13:30–17:00).<br>Step 7: Backend checks new slot vacancy to prevent conflict (`SLOT_CONFLICT`).<br>Step 8: Backend updates appointment schedule times and re-computes queue number.<br>Step 9: Backend sends email notice of schedule change.<br>Step 10: Frontend displays toast: "Đã dời lịch hẹn thành công." |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Reschedule within 2 hours of appointment:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Thời gian hẹn mới phải cách thời điểm hiện tại ít nhất 2 giờ")`. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-21: Rescheduling allowed up to 2 hours prior to scheduled appointment. |
| **Data Entities Involved** | `appointments`, `audit_logs`. |
| **User Interface Controls** | Reschedule modal, slot picker, confirm button. |


##### 2.3.2.15 Cancel Appointment with Automated Policy Refund (UC-PAT-15)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-15` |
| **Use Case Name** | Cancel Appointment with Automated Policy Refund |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Refund Subsystem — - `appointments.status` updated to `CANCELLED`.<br>- Automated refund calculated via `AppointmentRefundService`.<br>- Slot freed for other patients. |
| **Trigger** | Patient clicks "Hủy Lịch Hẹn" and confirms cancellation reason. |
| **Pre-conditions** | Appointment status is `SCHEDULED`. |
| **Post-conditions** | - `appointments.status` updated to `CANCELLED`.<br>- Automated refund calculated via `AppointmentRefundService`.<br>- Slot freed for other patients. |
| **Normal Flow** | Step 1: Patient clicks "Hủy Lịch" on `/patient` and inputs cancellation reason.<br>Step 2: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/status` with `{"status": "CANCELLED", "cancellationReason": "..."}`.<br>Step 3: Backend verifies user is the appointment patient.<br>Step 4: Backend invokes unified `AppointmentRefundService.processRefund(appointment, PATIENT)`.<br>Step 5: Refund Service calculates refund tier:<br>- Cancelled > 24 hours in advance: 100% full refund.<br>- Cancelled 2 to 24 hours in advance: 80% refund (20% administrative retention).<br>- Cancelled < 2 hours in advance: 0% refund.<br>Step 6: Backend updates `appointments.status = CANCELLED` and records `cancellation_reason`.<br>Step 7: Backend triggers refund via payment gateway if fee was paid.<br>Step 8: Backend sends cancellation email with refund statement.<br>Step 9: Frontend renders cancellation confirmation toast. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Attempt to cancel completed appointment:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "CANNOT_CANCEL", ...)`. |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-22: Cancellation refund tiers: >24h = 100%, 2-24h = 80%, <2h = 0%. |
| **Data Entities Involved** | `appointments`, `payment_transactions`, `audit_logs`. |
| **User Interface Controls** | Cancel dialog, cancellation reason textarea, confirm button. |


##### 2.3.2.16 Submit Doctor Review and Rating (UC-PAT-16)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-16` |
| **Use Case Name** | Submit Doctor Review and Rating |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Feedback Subsystem — - Review saved in `doctor_reviews` table (Flyway V17).<br>- `doctor_profiles.rating_avg` and `review_count` updated. |
| **Trigger** | Patient rates completed consultation. |
| **Pre-conditions** | - Appointment is in `COMPLETED` status.<br>- Patient has not previously reviewed this appointment. |
| **Post-conditions** | - Review saved in `doctor_reviews` table (Flyway V17).<br>- `doctor_profiles.rating_avg` and `review_count` updated. |
| **Normal Flow** | Step 1: Patient clicks "Đánh Giá Bác Sĩ" on a completed appointment card.<br>Step 2: Patient selects star rating (1 to 5) and writes feedback comment.<br>Step 3: Frontend calls HTTP POST `/api/v1/appointments/{id}/review` with `DoctorReviewRequest(rating, comment)`.<br>Step 4: Backend checks appointment status is `COMPLETED` (`APPOINTMENT_NOT_COMPLETED`).<br>Step 5: Backend checks for duplicate review (`REVIEW_ALREADY_EXISTS`).<br>Step 6: Backend saves record in `doctor_reviews`.<br>Step 7: Backend recalculates doctor's average rating and updates `doctor_profiles`.<br>Step 8: Backend returns HTTP 201 Created with `DoctorReviewDto`.<br>Step 9: Frontend renders review confirmation. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Reviewing Incomplete Appointment:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "APPOINTMENT_NOT_COMPLETED", "Chỉ có thể đánh giá ca khám đã hoàn tất.")`. |
| **Priority** | Low (P3) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-23: Only patients with verified `COMPLETED` appointments can submit reviews. |
| **Data Entities Involved** | `doctor_reviews`, `appointments`, `doctor_profiles`. |
| **User Interface Controls** | 5-star rating input, comment textarea, submit button. |


##### 2.3.2.17 View Patient Triage History (UC-PAT-17)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-17` |
| **Use Case Name** | View Patient Triage History |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Clinical Triage Subsystem — List of past triage sessions and SBAR summaries rendered. |
| **Trigger** | Patient accesses historical triage conversations on `/patient/triage`. |
| **Pre-conditions** | Patient is authenticated. |
| **Post-conditions** | List of past triage sessions and SBAR summaries rendered. |
| **Normal Flow** | Step 1: Patient opens history tab on `/patient/triage`.<br>Step 2: Frontend calls HTTP GET `/api/v1/triage/history`.<br>Step 3: Backend queries `triage_sessions` for `user_id = currentUserId` ordered by `created_at DESC`.<br>Step 4: Backend returns `List<TriageSessionDto>`.<br>Step 5: Frontend renders past symptom cards with urgency badges and SBAR summaries. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Low (P3) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | None. |
| **Data Entities Involved** | `triage_sessions`. |
| **User Interface Controls** | Triage history drawer, SBAR modal inspector. |


##### 2.3.2.18 De-identify Medical PII in Text (UC-PAT-18)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-PAT-18` |
| **Use Case Name** | De-identify Medical PII in Text |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Patient (System Pre-processor) |
| **Secondary Actor** | External Gateway |
| **Description** | MediAssist-AI Privacy Engine — PII tokens (names, phone numbers, CCCD) redacted with privacy placeholders. |
| **Trigger** | Patient submits clinical text for PII sanitization. |
| **Pre-conditions** | Input text length <= 20,000 characters (`@Size(max = 20000)`). |
| **Post-conditions** | PII tokens (names, phone numbers, CCCD) redacted with privacy placeholders. |
| **Normal Flow** | Step 1: Frontend calls HTTP POST `/api/v1/pii/deidentify` with `DeidentifyTextRequest(text)`.<br>Step 2: Backend `MedicalPiiService` scans for Vietnamese identifiers:<br>- Phone numbers: replaced with `[PHONE_REDACTED]`<br>- Citizen ID / CCCD: replaced with `[CITIZEN_ID_REDACTED]`<br>- Email addresses: replaced with `[EMAIL_REDACTED]`<br>- Personal patient names: replaced with `[PATIENT_NAME]`<br>Step 3: Backend returns `DeidentificationResult(sanitizedText, entitiesFound)`. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Text Exceeds 20,000 Characters:<br>1. Validation fails; backend returns HTTP 400 Bad Request (Security Fix BE-12). |
| **Priority** | High (P1) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-24: De-identification complies with Decree 13/2023/NĐ-CP and HIPAA Safe Harbor. |
| **Data Entities Involved** | None (pure in-memory text filter). |
| **User Interface Controls** | Privacy badge, toggle "Bảo vệ thông tin cá nhân (Ẩn PII)". |

"""

if __name__ == "__main__":
    print("Part 2 module loaded successfully. Character count:", len(get_content()))
