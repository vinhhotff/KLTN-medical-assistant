# -*- coding: utf-8 -*-
"""
Part 2: 2.3.2 Patient Use Case Specifications (UC-PAT-01 to UC-PAT-18).
Exhaustive 17-field tabular specifications for each patient use case.
Derived 100% from actual MediAssist-AI codebase.
"""

def get_content():
    return """
#### 2.3.2 Patient (Portal & Triage)

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.1 CONVERSATIONAL AI SYMPTOM TRIAGE (UC-PAT-01)
================================================================================
1.  Use Case ID:         UC-PAT-01
2.  Use Case Name:       Conversational AI Symptom Triage
3.  Target System:       MediAssist-AI Clinical Triage Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician, Clinical Safety Board
6.  Trigger:             Patient sends symptom description on `/patient/triage`.
7.  Pre-conditions:
    - Patient is authenticated (or accessing guest preview).
    - AI Inference Gateway (Gemini 1.5 Flash / OpenRouter) is operational.
8.  Post-conditions:
    - Symptom input processed by 5-Stage Defense Engine.
    - AI generates structured SBAR clinical report (Situation, Background, Assessment, Recommendation).
    - Clinical urgency level (`ROUTINE`, `URGENT`, `EMERGENCY`) and recommended specialty determined.
    - Triage record persisted in `triage_sessions` table (Flyway V1, V15).
    - Matching specialist doctors retrieved via pgvector semantic search.
9.  Priority:            High (P0 - Core Differentiator)
10. Normal Flow:
    Step 1: Patient enters symptom query into chat box on `/patient/triage` (e.g., "Tôi bị sốt cao 39 độ, ho có đờm xanh và tức ngực 3 ngày nay").
    Step 2: Frontend sends HTTP POST to `/api/v1/triage/assess` with `TriageRequest(symptoms, conversationHistory, age, gender)`.
    Step 3: Backend passes input through `ClinicalQueryDefenseEngine` (UC-PAT-02).
    Step 4: System verifies non-emergency clinical symptom description.
    Step 5: Backend constructs clinical prompt with SBAR format directives and clinical safety boundaries:
            - Prohibit definitive diagnosis and medication prescriptions.
            - Instruct model to suggest clarifying questions if clinical details are ambiguous.
    Step 6: Backend dispatches prompt to Google Gemini 1.5 Flash API (Priority 1) or OpenRouter (Priority 2).
    Step 7: AI inference returns structured `ClinicalAiResult` containing:
            - `sbarSummary`: Situation, Background, Assessment, Recommendation.
            - `urgencyLevel`: `ROUTINE` or `URGENT`.
            - `recommendedSpecialtyId`: UUID of matched medical specialty.
            - `clarifyingQuestions`: 1-2 follow-up questions to refine presentation.
    Step 8: Backend calls `DoctorSemanticSearchService` to match top 3 specialist doctors for the recommended specialty.
    Step 9: Backend saves session record into `triage_sessions` table (`sbar_summary`, `urgency_level`, `recommended_specialty_id`).
    Step 10: Backend returns HTTP 200 OK with `TriageResponse` DTO.
    Step 11: Frontend renders conversational response bubble, SBAR assessment card, and matched specialist doctor cards.
11. Alternative Flows:
    - Alt Flow 11a: Acute Red-Flag Emergency Detected:
      1. Defense Engine flags acute emergency condition (FAST stroke, acute myocardial infarction, severe anaphylaxis).
      2. Normal flow interrupted immediately (Divert to UC-PAT-02 Alt Flow 10a).
    - Alt Flow 11b: AI Gateway Overloaded / Rate Limited:
      1. Gemini API throws `AiProviderOverloadedException` (HTTP 429).
      2. Router falls back to OpenRouter pool or `DeterministicFallbackAiProvider` (local keyword heuristics).
12. Exception Flows:
    - Exc Flow 12a: Empty or Too Short Input:
      1. Symptoms text is under 3 characters.
      2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INPUT_TOO_SHORT", "Vui lòng mô tả triệu chứng cụ thể hơn (tối thiểu 3 ký tự).")`.
    - Exc Flow 12b: Input Exceeds Maximum Length:
      1. Symptoms text exceeds 2,000 characters.
      2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INPUT_TOO_LONG", "Mô tả triệu chứng không được vượt quá 2000 ký tự.")`.
13. Business Rules:
    - BR-10: Medical disclaimer mandatory: "Kết quả sàng lọc mang tính chất tham khảo, không thay thế chẩn đoán y khoa chính thức từ bác sĩ."
    - BR-11: Triage rate limited to prevent API abuse (`TriageRateLimiterService`).
14. Non-Functional Requirements:
    - NFR-PERF: Triage assessment response time < 2500ms (P95).
15. Data Entities Involved:
    - `triage_sessions` (id, user_id, chief_complaint, raw_symptoms, sbar_summary, urgency_level, recommended_specialty_id, created_at).
16. User Interface Controls:
    - Chat message stream, symptom text input, quick symptom chips, SBAR summary card, matched doctor cards.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.2 5-STAGE CLINICAL QUERY DEFENSE (UC-PAT-02)
================================================================================
1.  Use Case ID:         UC-PAT-02
2.  Use Case Name:       5-Stage Clinical Query Defense Screening
3.  Target System:       MediAssist-AI Clinical Query Defense Engine
4.  Primary Actor:       Patient (System Interceptor)
5.  Stakeholders:        Patient Safety Officer, Medical Director
6.  Trigger:             Invoked automatically on every natural language symptom query.
7.  Pre-conditions:      Raw text received by `TriageController` or `DoctorSemanticSearchService`.
8.  Post-conditions:
    - Query sanitized, normalized, and categorized, OR intercepted with emergency lockout / administrative redirect.
9.  Priority:            High (P0 - Patient Safety Critical)
10. Normal Flow:
    Step 1: Input text passes to `ClinicalQueryDefenseEngine.process(rawInput)`.
    Step 2: Stage 1 — Acute Red-Flag Emergency Interception:
            Engine checks input against regex patterns for acute emergencies:
            - Đột quỵ não (FAST): "méo miệng", "liệt nửa người", "nói ngọng", "mờ mắt đột ngột".
            - Nhồi máu cơ tim: "đau thắt ngực lan ra cánh tay trái", "vã mồ hôi lạnh", "khó thở dữ dội".
            - Sốc phản vệ / Cấp cứu: "khó thở sau dùng thuốc", "sưng phù môi họng", "nôn ra máu tươi".
            If match found -> Divert to Alternative Flow 10a.
    Step 3: Stage 2 — Vietnamese Slang & Teen-Code Normalization:
            Engine converts informal phrasing into medical terminology:
            - `ko`, `k`, `khg` -> `không`
            - `bs`, `bsi` -> `bác sĩ`
            - `dau da day` -> `đau dạ dày`
            - `met` -> `mệt mỏi`
            - `sot cao` -> `sốt cao`
    Step 4: Stage 3 — Vietnamese NegEx Clause-Level Negation Splitting:
            Engine identifies negation trigger terms: `không bị`, `chưa từng`, `không có`, `không sốt`.
            Input is split into Affirmative Clause and Negated Clause.
            Negated symptoms (e.g., "không sốt") are quarantined to prevent false routing to infectious disease doctors.
    Step 5: Stage 4 — Out-of-Domain (OOD) Intent Gating:
            Engine checks if query is administrative or greeting chatter (viện phí, giờ khám, bảo hiểm).
            If OOD found -> Divert to Alternative Flow 10b.
    Step 6: Stage 5 — Compound Multi-Symptom Decomposition:
            Engine splits multi-symptom conjunctions (`đồng thời`, `kèm theo`, `và`) into sub-queries.
    Step 7: Engine outputs sanitized string and affirmative clause for downstream embedding generation.
11. Alternative Flows:
    - Alt Flow 10a: Emergency Red-Flag Interception:
      1. Engine sets `isEmergency = true`, `urgency = EMERGENCY`.
      2. Engine attaches emergency response banner:
         "CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn có dấu hiệu cấp cứu y khoa đe dọa tính mạng! Vui lòng gọi ngay Cấp cứu 115 hoặc đến khoa Cấp cứu bệnh viện gần nhất!"
      3. Booking controls locked; 115 call hotline button highlighted in red.
    - Alt Flow 10b: Out-of-Domain Administrative Gating:
      1. Engine identifies administrative query.
      2. Returns guidance text directing user to hospital customer service hotline (1900-xxxx).
12. Exception Flows: None.
13. Business Rules:
    - BR-12: Red-flag check must run in-memory synchronously with zero external network dependencies.
14. Non-Functional Requirements:
    - NFR-PERF: 5-Stage screening execution time < 15ms.
15. Data Entities Involved: None (pure computational in-memory defense engine).
16. User Interface Controls: Red Emergency Alert Banner, 115 Call Button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.3 SEMANTIC DOCTOR SEARCH VIA PGVECTOR HNSW (UC-PAT-03)
================================================================================
1.  Use Case ID:         UC-PAT-03
2.  Use Case Name:       Semantic Doctor Search via pgvector HNSW
3.  Target System:       MediAssist-AI Vector Search Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Platform Architect
6.  Trigger:             Patient enters symptoms into search bar on `/patient/doctors`.
7.  Pre-conditions:
    - Verified doctor profiles have pre-computed 1536-d embeddings in `doctor_profiles.bio_embedding`.
    - PostgreSQL 16 HNSW index `idx_doctor_bio_hnsw_verified` is active (Flyway V11).
8.  Post-conditions:
    - System executes session-tuned vector similarity query.
    - Candidates re-ranked using Weighted Hybrid Re-Ranking Formula (WHRF) in a bounded min-heap.
    - Ranked list of qualified specialist doctors returned with match compatibility scores.
9.  Priority:            High (P0 - Core Differentiator)
10. Normal Flow:
    Step 1: Patient types symptoms on `/patient/doctors` (e.g., "đau dạ dày ợ chua trào ngược").
    Step 2: Frontend dispatches HTTP GET to `/api/v1/triage/search/semantic?query=...&limit=5`.
    Step 3: Backend passes query through `ClinicalQueryDefenseEngine`.
    Step 4: Backend calls `EmbeddingService` to compute 1536-d dense vector using `openai/text-embedding-3-small`.
    Step 5: Backend applies PostgreSQL session tuning:
            - `SET LOCAL hnsw.ef_search = 120;`
            - `SET LOCAL enable_seqscan = off;`
            - `SET LOCAL work_mem = '64MB';`
    Step 6: Backend executes vector similarity query against `doctor_profiles`:
            `SELECT d.*, 1 - (d.bio_embedding <=> :queryEmbedding) AS cosine_sim FROM doctor_profiles d WHERE d.is_verified = true ...`
    Step 7: Candidates processed through Bounded Min-Heap executing WHRF Re-ranking:
            - Sigmoid Contrastive Sharpening: $S_{dense} = \frac{1}{1 + e^{-8.0(cosine\_sim - 0.65)}}$
            - Sparse lexical overlap bonus
            - Specialty Match Boost: $+0.12$
            - Divergence Penalty: $-0.10$
            - Credibility Damper: $\log_{10}(\text{review\_count} + 1) / \log_{10}(100)$
    Step 8: Top $K=5$ doctors serialized into `DoctorMatchDto` list.
    Step 9: Frontend renders doctor cards with match percentage, specialty badge, rating, fee, and available slots.
11. Alternative Flows:
    - Alt Flow 11a: Embedding Service Offline:
      1. Backend falls back to local Unsupervised Feature Hashing (Character N-gram FNV-1a).
      2. Search completes with degraded semantic precision.
12. Exception Flows: None.
13. Business Rules:
    - BR-13: Only verified doctors (`is_verified = true`) are visible in search results.
14. Non-Functional Requirements:
    - NFR-PERF: PostgreSQL vector query execution < 12ms (Observed benchmark: 0.72ms).
15. Data Entities Involved:
    - `doctor_profiles` (id, user_id, specialty_id, bio_embedding, rating_avg, review_count, consultation_fee, is_verified).
    - `specialties`.
16. User Interface Controls:
    - Search input, Specialty filter, Price filter, Doctor card list, "Đặt Lịch Khám" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.4 VIEW DOCTOR DETAILS & SLOTS (UC-PAT-04)
================================================================================
1.  Use Case ID:         UC-PAT-04
2.  Use Case Name:       View Doctor Details & Available Slots
3.  Target System:       MediAssist-AI Doctor Directory Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician
6.  Trigger:             Patient selects doctor card to view schedule and credentials.
7.  Pre-conditions:      Doctor account exists and is verified.
8.  Post-conditions:     Doctor bio, credentials, CCHN number, and 30-min consultation slots rendered.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Patient clicks doctor card on `/patient/doctors`.
    Step 2: Frontend calls HTTP GET `/api/v1/doctors/{id}` to fetch `DoctorDetailDto`.
    Step 3: Frontend calls HTTP GET `/api/v1/doctors/{id}/slots?date=YYYY-MM-DD` to fetch available slots.
    Step 4: Backend retrieves `doctor_schedule_slots` and filters out existing bookings from `appointments`.
    Step 5: Backend returns list of `DoctorSlotDto` (startTime, endTime, isAvailable).
    Step 6: Frontend renders doctor profile header, CCHN license badge, bio, fee, and slot grid.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Doctor Not Found:
      1. Backend throws HTTP 404 Not Found.
13. Business Rules:
    - BR-14: Doctor practice certificate number (CCHN) must be publicly displayed.
14. Non-Functional Requirements:
    - NFR-PERF: Slot query response time < 100ms.
15. Data Entities Involved: `doctor_profiles`, `doctor_schedule_slots`, `appointments`.
16. User Interface Controls: Date picker, 30-minute slot chips, "Đặt Lịch" action button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.5 UPLOAD MEDICAL DOCUMENT & VISION OCR (UC-PAT-05)
================================================================================
1.  Use Case ID:         UC-PAT-05
2.  Use Case Name:       Upload Medical Document & Vision OCR
3.  Target System:       MediAssist-AI Document Ingestion Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician
6.  Trigger:             Patient uploads a medical document file on `/patient/documents`.
7.  Pre-conditions:
    - Patient is authenticated.
    - File format: PDF, PNG, or JPEG; size <= 10MB; PDF pages <= 10.
8.  Post-conditions:
    - SHA-256 checksum computed for deduplication.
    - Document stored in private Supabase S3 bucket `medical-documents`.
    - Record inserted in `medical_documents` with status `ANALYZED`.
    - OCR extraction saved in `document_analyses` table (Flyway V1, V5, V20).
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Patient drops lab test file (blood test, urinalysis, ultrasound) onto upload zone.
    Step 2: Frontend validates file size (<= 10MB) and MIME type.
    Step 3: Frontend calls HTTP POST `/api/v1/documents/analyze` with multipart file.
    Step 4: Backend `MedicalDocumentValidator` validates PDF page limit (<= 10 pages) and checks file signature.
    Step 5: Backend computes SHA-256 hash (`file_hash`).
    Step 6: Backend checks for duplicate upload in `medical_documents`.
    Step 7: Backend streams file to Supabase S3 private bucket under path `documents/{patientId}/{uuid}.ext`.
    Step 8: Backend calls Google Gemini 1.5 Flash Vision API to perform multimodal OCR and clinical extraction.
    Step 9: Backend extracts biomarkers table, abnormal indicators, LOINC codes, and layperson summary.
    Step 10: Backend saves metadata in `medical_documents` (`storage_path`) and extraction in `document_analyses`.
    Step 11: Backend decrements user's remaining AI quota in `patient_profiles.remaining_ai_quota`.
    Step 12: Backend returns HTTP 200 OK with `DocumentAnalysisResponse`.
    Step 13: Frontend renders split-view modal with extracted indicators and plain-text summary.
11. Alternative Flows:
    - Alt Flow 11a: Identical Duplicate Document:
      1. Backend finds existing document with matching SHA-256 hash for this patient.
      2. Backend returns cached analysis without re-uploading or consuming AI quota.
12. Exception Flows:
    - Exc Flow 12a: File Too Large (> 10MB):
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", ...)`.
    - Exc Flow 12b: Quota Depleted:
      1. Patient has 0 remaining AI quota.
      2. Backend prompts patient to purchase additional analysis quota (UC-PAT-08).
13. Business Rules:
    - BR-15: Medical documents must reside strictly in private S3 buckets. Public URLs forbidden (V20).
14. Non-Functional Requirements:
    - NFR-PERF: Document OCR and interpretation pipeline completes in < 4500ms.
15. Data Entities Involved:
    - `medical_documents`, `document_analyses`, `patient_profiles`.
16. User Interface Controls:
    - Drag-and-drop zone, file preview thumbnail, "Phân Tích AI" button, quota counter badge.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.6 INSPECT BIOMARKERS & LOINC CODES (UC-PAT-06)
================================================================================
1.  Use Case ID:         UC-PAT-06
2.  Use Case Name:       Inspect Extracted Biomarkers & LOINC Codes
3.  Target System:       MediAssist-AI Clinical Analysis Subsystem
4.  Primary Actor:       Patient, Attending Doctor
5.  Stakeholders:        Patient, Doctor
6.  Trigger:             User clicks "Xem Phân Tích" on an uploaded medical document.
7.  Pre-conditions:      Document has been analyzed (`document_analyses` record exists).
8.  Post-conditions:     Structured biomarker table and layperson summary displayed.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: User selects document from document list on `/patient/documents`.
    Step 2: Frontend calls HTTP GET `/api/v1/documents/{id}/analysis`.
    Step 3: Backend enforces `PatientAccessGuard` verifying patient ownership or doctor care relationship.
    Step 4: Backend retrieves `document_analyses` record joined with `medical_documents`.
    Step 5: Backend returns payload containing:
            - Table of biomarkers: Test name, measured value, unit, reference range, status (`NORMAL`, `ELEVATED`, `LOW`).
            - Standardized LOINC codes.
            - Layperson clinical summary in plain Vietnamese.
            - Recommended medical specialty.
    Step 6: Frontend renders interactive table with abnormal rows highlighted in red or amber.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Unauthorized Access (IDOR Attempt):
      1. Backend throws `AppException(HttpStatus.FORBIDDEN, "FORBIDDEN_PATIENT_ACCESS", ...)`.
13. Business Rules:
    - BR-10: Medical safety disclaimer mandatory on all biomarker views.
    - BR-16: Numerical lab values must retain exact precision extracted from the scan.
14. Non-Functional Requirements:
    - NFR-PERF: Analysis retrieval latency < 150ms.
15. Data Entities Involved: `medical_documents`, `document_analyses`.
16. User Interface Controls: Biomarker table, status pills, layperson accordion.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.7 DOWNLOAD DOCUMENT FILE VIA SIGNED URL (UC-PAT-07)
================================================================================
1.  Use Case ID:         UC-PAT-07
2.  Use Case Name:       Download Document File via 15-Minute Signed URL
3.  Target System:       MediAssist-AI Storage Subsystem
4.  Primary Actor:       Patient, Authorized Doctor
5.  Stakeholders:        Patient, Doctor
6.  Trigger:             User clicks "Tải Tệp Gốc" or previews source file.
7.  Pre-conditions:      Document exists in private Supabase S3 bucket.
8.  Post-conditions:     15-minute temporary signed URL generated; file stream returned.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: User clicks download/preview icon for document ID.
    Step 2: Frontend calls HTTP GET `/api/v1/documents/{id}/file` or `/api/v1/documents/{id}/signed-url`.
    Step 3: Backend verifies authorization via `PatientAccessGuard`.
    Step 4: Backend retrieves `storage_path` from `medical_documents`.
    Step 5: Backend invokes `SupabaseStorageService.createSignedUrl(storagePath, 900)` (TTL = 15 minutes / 900 seconds).
    Step 6: Backend returns `DocumentFileAccessDto(signedUrl, expiresInSeconds=900)`.
    Step 7: Browser opens secure preview or initiates direct download.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: File Missing from Storage:
      1. Backend throws `AppException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", ...)`.
13. Business Rules:
    - BR-15: Direct public links to medical files are strictly forbidden (Flyway V20).
14. Non-Functional Requirements:
    - NFR-SEC: Signed URL TTL strictly capped at 900 seconds.
15. Data Entities Involved: `medical_documents`, `audit_logs`.
16. User Interface Controls: Download button, progress spinner.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.8 PURCHASE AI ANALYSIS QUOTA (UC-PAT-08)
================================================================================
1.  Use Case ID:         UC-PAT-08
2.  Use Case Name:       Purchase AI Analysis Quota
3.  Target System:       MediAssist-AI Payment & Quota Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Hospital Finance
6.  Trigger:             Patient clicks "Mua Thêm Hạn Ngạch" on `/patient/documents`.
7.  Pre-conditions:      Patient is authenticated.
8.  Post-conditions:     Payment checkout initiated; quota credited upon successful transaction.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Patient opens Quota Purchase modal on `/patient/documents`.
    Step 2: Frontend calls HTTP GET `/api/v1/payments/packages` to display quota tiers:
            - Gói Tiêu Chuẩn: 5 lượt phân tích (50.000 VNĐ).
            - Gói Nâng Cao: 15 lượt phân tích (120.000 VNĐ).
            - Gói Không Giới Hạn: 50 lượt phân tích (300.000 VNĐ).
    Step 3: Patient selects package and clicks "Thanh Toán".
    Step 4: Frontend calls HTTP POST `/api/v1/payments/checkout` with `orderType = QUOTA_PURCHASE`.
    Step 5: Backend initializes payment via Stripe or Mock Sandbox.
    Step 6: Patient completes payment; transaction verified via `POST /api/v1/payments/verify`.
    Step 7: Backend increments `patient_profiles.remaining_ai_quota`.
    Step 8: Frontend updates quota balance badge.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-SEC: Quota credited atomically within payment transaction.
15. Data Entities Involved: `patient_profiles`, `payment_transactions`.
16. User Interface Controls: Package selection cards, payment checkout modal.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.9 BOOK IN-CLINIC APPOINTMENT (UC-PAT-09)
================================================================================
1.  Use Case ID:         UC-PAT-09
2.  Use Case Name:       Book In-Clinic Appointment & Slot Reservation
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Clinic Receptionist
6.  Trigger:             Patient confirms slot selection in `BookingModal`.
7.  Pre-conditions:
    - Patient is authenticated with verified email (`email_verified = true`).
    - Doctor is verified (`is_verified = true`) and active (`is_active = true`).
8.  Post-conditions:
    - Appointment record created with status `SCHEDULED` and payment status `UNPAID`.
    - Sequential daily STT queue number assigned (`queue_number = 'STT 01'`).
    - Clinic room assigned from doctor profile.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Patient selects doctor and 30-min slot on `/patient/doctors` (e.g., 2026-10-20 09:00:00 to 09:30:00).
    Step 2: Patient opens `BookingModal`, enters chief complaint, and optionally selects an uploaded `medicalDocumentId`.
    Step 3: Frontend calls HTTP POST `/api/v1/appointments` with `CreateAppointmentRequest`.
    Step 4: Backend checks doctor status (`DOCTOR_NOT_ACTIVE`, `DOCTOR_NOT_VERIFIED`).
    Step 5: Backend checks clinic hours: Monday–Saturday, 08:00–12:00 & 13:30–17:00 (Sundays blocked).
    Step 6: Backend verifies slot vacancy:
            `SELECT COUNT(*) FROM appointments WHERE doctor_id = :d AND scheduled_start = :s AND status NOT IN ('CANCELLED')`
    Step 7: Backend calculates next daily sequential queue number:
            `queue_number = String.format("STT %02d", countToday + 1)`.
    Step 8: Backend generates unique `appointment_code` (e.g., `AP-20261020-XXXX`).
    Step 9: Backend sets `clinic_room = doctorProfile.getClinicRoom()`.
    Step 10: Backend inserts record into `appointments` with status `SCHEDULED`.
    Step 11: Backend returns HTTP 201 Created with `AppointmentDto`.
    Step 12: Frontend opens payment modal or redirects to checkout.
11. Alternative Flows:
    - Alt Flow 11a: Concurrent Slot Collision:
      1. Another patient booked the same slot milliseconds earlier.
      2. Backend detects conflict and throws `AppException(HttpStatus.CONFLICT, "SLOT_CONFLICT", "Khung giờ này đã có bệnh nhân khác nhanh tay đặt trước. Vui lòng chọn khung giờ khác.")`.
      3. Frontend refreshes slot picker.
12. Exception Flows:
    - Exc Flow 12a: Sunday Booking Attempt:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_DAY", "Bệnh viện không tiếp nhận lịch hẹn vào Chủ Nhật.")`.
    - Exc Flow 12b: Outside Operating Hours:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_TIME", "Khung giờ khám hợp lệ là 08:00-12:00 và 13:30-17:00.")`.
13. Business Rules:
    - BR-17: In-clinic consultations operate strictly Monday–Saturday, 08:00–12:00 & 13:30–17:00.
    - BR-20: Queue numbers (STT) are sequential per doctor per calendar date starting at STT 01.
14. Non-Functional Requirements:
    - NFR-PERF: Booking transaction commits in < 150ms with database concurrency lock.
15. Data Entities Involved: `appointments`, `doctor_profiles`, `users`.
16. User Interface Controls: `BookingModal`, slot pills, document select dropdown, "Xác Nhận Đặt Lịch" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.10 PROCESS PAYMENT VIA STRIPE / MOCK (UC-PAT-10)
================================================================================
1.  Use Case ID:         UC-PAT-10
2.  Use Case Name:       Process Payment via Stripe / Mock Sandbox
3.  Target System:       MediAssist-AI Payment Gateway Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Hospital Finance
6.  Trigger:             Patient proceeds to pay consultation fee for scheduled appointment.
7.  Pre-conditions:      Appointment exists with `payment_status = UNPAID`.
8.  Post-conditions:
    - Payment authorized and settled.
    - `appointments.payment_status` updated to `PAID`.
    - Record inserted in `payment_transactions` with status `SUCCESS`.
    - Confirmation notification dispatched to patient.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Patient selects payment method (Stripe Credit Card or Mock Sandbox).
    Step 2: Frontend calls HTTP POST `/api/v1/payments/checkout` with `CreatePaymentRequest(orderType=APPOINTMENT_FEE, appointmentId=...)`.
    Step 3: Backend verifies `app.payment.mock.enabled`:
            - If production (`mock.enabled = false`): Routes to Stripe Checkout Gateway.
            - If demo/dev (`mock.enabled = true`): Routes to Mock Payment Gateway.
    Step 4: Backend creates `PaymentTransaction` record with status `PENDING`.
    Step 5: Patient submits payment details; gateway returns transaction confirmation.
    Step 6: Frontend calls HTTP POST `/api/v1/payments/verify` with `VerifyPaymentRequest(transactionCode)`.
    Step 7: Backend verifies transaction with gateway and updates `payment_transactions.status = SUCCESS`.
    Step 8: Backend updates `appointments.payment_status = PAID`.
    Step 9: Backend publishes `PaymentCompletedEvent` -> dispatches confirmation email.
    Step 10: Frontend redirects to `/payment/success` with receipt details.
11. Alternative Flows:
    - Alt Flow 11a: Stripe Webhook Asynchronous Capture:
      1. Stripe posts webhook to `/api/v1/payments/webhook/stripe`.
      2. Backend validates webhook signature and auto-fulfills appointment payment status.
12. Exception Flows:
    - Exc Flow 12a: Mock Payment Attempt in Production:
      1. Backend detects `mock.enabled = false` and throws `AppException(HttpStatus.FORBIDDEN, "MOCK_PAYMENT_DISABLED", ...)`.
13. Business Rules:
    - BR-19: Mock payment permanently disabled in production mode (Security Audit BE-10).
14. Non-Functional Requirements:
    - NFR-SEC: Webhook signature verification mandatory (HMAC-SHA256).
15. Data Entities Involved: `payment_transactions`, `appointments`.
16. User Interface Controls: Payment modal, Stripe Elements card iframe, "Thanh Toán Ngay" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.11 VIEW ELECTRONIC ENCOUNTER SLIP (UC-PAT-11)
================================================================================
1.  Use Case ID:         UC-PAT-11
2.  Use Case Name:       View Electronic Encounter Slip & Admission STT
3.  Target System:       MediAssist-AI Appointment Subsystem
4.  Primary Actor:       Patient, Clinic Reception
5.  Stakeholders:        Patient, Doctor, Receptionist
6.  Trigger:             Patient accesses ticket view for confirmed appointment.
7.  Pre-conditions:      Appointment exists.
8.  Post-conditions:     Electronic admission slip rendered with clinic navigation details.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Patient clicks "Xem Phiếu Khám" from dashboard or appointment card.
    Step 2: Frontend calls HTTP GET `/api/v1/appointments/{id}/ticket`.
    Step 3: Backend verifies user ownership or staff access via `PatientAccessGuard`.
    Step 4: Backend returns ticket DTO:
            - Sequential Queue Number (e.g., `STT 05`).
            - Appointment Code (e.g., `AP-20261020-0012`).
            - Patient Name, Scheduled Date & Time Window.
            - Attending Doctor Name, Academic Title, Specialty.
            - Clinic Room (e.g., "Phòng Khám 204 - Khu Khám Yêu Cầu").
            - Preparation Instructions (nhịn ăn 8h nếu xét nghiệm máu, mang CCCD).
    Step 5: Frontend renders styled digital encounter ticket card with print button.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-20: Sequential STT displayed prominently on all tickets.
14. Non-Functional Requirements:
    - NFR-USA: 1-click browser print view.
15. Data Entities Involved: `appointments`, `doctor_profiles`, `users`.
16. User Interface Controls: Ticket frame, "In Phiếu Khám" button, "Xem Lịch Hẹn" link.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.12 VIEW APPOINTMENT HISTORY (UC-PAT-12)
================================================================================
1.  Use Case ID:         UC-PAT-12
2.  Use Case Name:       View Patient Appointment History
3.  Target System:       MediAssist-AI Patient Appointment Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient
6.  Trigger:             Patient navigates to appointments section on `/patient`.
7.  Pre-conditions:      Patient is authenticated.
8.  Post-conditions:     List of user appointments rendered with status badges.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Patient views appointments section on `/patient`.
    Step 2: Frontend calls HTTP GET `/api/v1/appointments/my`.
    Step 3: Backend queries `appointments` for `patient_id = currentUserId` ordered by `scheduled_start DESC`.
    Step 4: Backend returns `List<AppointmentDto>`.
    Step 5: Frontend renders cards showing Doctor name, Date/Time, STT, and status badge (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Query utilizes index `idx_appointment_patient` (< 30ms).
15. Data Entities Involved: `appointments`, `users`, `doctor_profiles`.
16. User Interface Controls: Appointment cards, status pills, filter tabs.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.13 PATIENT CHECK-IN FOR APPOINTMENT (UC-PAT-13)
================================================================================
1.  Use Case ID:         UC-PAT-13
2.  Use Case Name:       Patient Check-In for In-Clinic Appointment
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Patient, Clinic Receptionist
5.  Stakeholders:        Patient, Doctor, Clinic Nurse
6.  Trigger:             Patient arrives at hospital and checks in.
7.  Pre-conditions:      Appointment status is `SCHEDULED`.
8.  Post-conditions:     `checked_in_at` timestamp recorded; appointment marked ready in doctor queue.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Patient clicks "Tôi Đã Đến Phòng Khám (Check-in)" on appointment card.
    Step 2: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/check-in`.
    Step 3: Backend verifies user is the appointment patient or assigned doctor.
    Step 4: Backend sets `checkedInAt = LocalDateTime.now()`.
    Step 5: Backend commits update to `appointments` table.
    Step 6: Backend returns HTTP 200 OK with updated appointment DTO.
    Step 7: Frontend updates appointment badge to "Đã Check-in / Sẵn Sàng Khám".
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Check-in on non-scheduled appointment:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_CHECKIN", ...)`.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Check-in executed in < 50ms.
15. Data Entities Involved: `appointments`.
16. User Interface Controls: "Check-in Ngay" button, check-in confirmation badge.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.14 RESCHEDULE APPOINTMENT (UC-PAT-14)
================================================================================
1.  Use Case ID:         UC-PAT-14
2.  Use Case Name:       Reschedule Active Appointment
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor
6.  Trigger:             Patient selects "Dời Lịch Khám" on active appointment.
7.  Pre-conditions:
    - Appointment is in `SCHEDULED` status.
    - New appointment time is at least 2 hours in the future.
8.  Post-conditions:     `scheduled_start` and `scheduled_end` updated to new available slot.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Patient opens reschedule dialog on appointment card.
    Step 2: Patient selects new date and slot from doctor's available schedule.
    Step 3: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/reschedule` with `RescheduleAppointmentRequest(newScheduledStart, newScheduledEnd)`.
    Step 4: Backend checks current appointment status is `SCHEDULED`.
    Step 5: Backend verifies new slot is >= 2 hours from current time (`PAST_DATE`).
    Step 6: Backend verifies clinic hours (Monday–Saturday, 08:00–12:00 / 13:30–17:00).
    Step 7: Backend checks new slot vacancy to prevent conflict (`SLOT_CONFLICT`).
    Step 8: Backend updates appointment schedule times and re-computes queue number.
    Step 9: Backend sends email notice of schedule change.
    Step 10: Frontend displays toast: "Đã dời lịch hẹn thành công."
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Reschedule within 2 hours of appointment:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Thời gian hẹn mới phải cách thời điểm hiện tại ít nhất 2 giờ")`.
13. Business Rules:
    - BR-21: Rescheduling allowed up to 2 hours prior to scheduled appointment.
14. Non-Functional Requirements:
    - NFR-PERF: Reschedule transaction commits in < 100ms.
15. Data Entities Involved: `appointments`, `audit_logs`.
16. User Interface Controls: Reschedule modal, slot picker, confirm button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.15 CANCEL APPOINTMENT WITH REFUND (UC-PAT-15)
================================================================================
1.  Use Case ID:         UC-PAT-15
2.  Use Case Name:       Cancel Appointment with Automated Policy Refund
3.  Target System:       MediAssist-AI Refund Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Hospital Finance
6.  Trigger:             Patient clicks "Hủy Lịch Hẹn" and confirms cancellation reason.
7.  Pre-conditions:      Appointment status is `SCHEDULED`.
8.  Post-conditions:
    - `appointments.status` updated to `CANCELLED`.
    - Automated refund calculated via `AppointmentRefundService`.
    - Slot freed for other patients.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Patient clicks "Hủy Lịch" on `/patient` and inputs cancellation reason.
    Step 2: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/status` with `{"status": "CANCELLED", "cancellationReason": "..."}`.
    Step 3: Backend verifies user is the appointment patient.
    Step 4: Backend invokes unified `AppointmentRefundService.processRefund(appointment, PATIENT)`.
    Step 5: Refund Service calculates refund tier:
            - Cancelled > 24 hours in advance: 100% full refund.
            - Cancelled 2 to 24 hours in advance: 80% refund (20% administrative retention).
            - Cancelled < 2 hours in advance: 0% refund.
    Step 6: Backend updates `appointments.status = CANCELLED` and records `cancellation_reason`.
    Step 7: Backend triggers refund via payment gateway if fee was paid.
    Step 8: Backend sends cancellation email with refund statement.
    Step 9: Frontend renders cancellation confirmation toast.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Attempt to cancel completed appointment:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "CANNOT_CANCEL", ...)`.
13. Business Rules:
    - BR-22: Cancellation refund tiers: >24h = 100%, 2-24h = 80%, <2h = 0%.
14. Non-Functional Requirements:
    - NFR-SEC: Refund operations must be idempotent.
15. Data Entities Involved: `appointments`, `payment_transactions`, `audit_logs`.
16. User Interface Controls: Cancel dialog, cancellation reason textarea, confirm button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.16 SUBMIT DOCTOR REVIEW AND RATING (UC-PAT-16)
================================================================================
1.  Use Case ID:         UC-PAT-16
2.  Use Case Name:       Submit Doctor Review and Rating
3.  Target System:       MediAssist-AI Feedback Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor
6.  Trigger:             Patient rates completed consultation.
7.  Pre-conditions:
    - Appointment is in `COMPLETED` status.
    - Patient has not previously reviewed this appointment.
8.  Post-conditions:
    - Review saved in `doctor_reviews` table (Flyway V17).
    - `doctor_profiles.rating_avg` and `review_count` updated.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Patient clicks "Đánh Giá Bác Sĩ" on a completed appointment card.
    Step 2: Patient selects star rating (1 to 5) and writes feedback comment.
    Step 3: Frontend calls HTTP POST `/api/v1/appointments/{id}/review` with `DoctorReviewRequest(rating, comment)`.
    Step 4: Backend checks appointment status is `COMPLETED` (`APPOINTMENT_NOT_COMPLETED`).
    Step 5: Backend checks for duplicate review (`REVIEW_ALREADY_EXISTS`).
    Step 6: Backend saves record in `doctor_reviews`.
    Step 7: Backend recalculates doctor's average rating and updates `doctor_profiles`.
    Step 8: Backend returns HTTP 201 Created with `DoctorReviewDto`.
    Step 9: Frontend renders review confirmation.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Reviewing Incomplete Appointment:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "APPOINTMENT_NOT_COMPLETED", "Chỉ có thể đánh giá ca khám đã hoàn tất.")`.
13. Business Rules:
    - BR-23: Only patients with verified `COMPLETED` appointments can submit reviews.
14. Non-Functional Requirements:
    - NFR-PERF: Review transaction executes in < 60ms.
15. Data Entities Involved: `doctor_reviews`, `appointments`, `doctor_profiles`.
16. User Interface Controls: 5-star rating input, comment textarea, submit button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.17 VIEW TRIAGE HISTORY (UC-PAT-17)
================================================================================
1.  Use Case ID:         UC-PAT-17
2.  Use Case Name:       View Patient Triage History
3.  Target System:       MediAssist-AI Clinical Triage Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient
6.  Trigger:             Patient accesses historical triage conversations on `/patient/triage`.
7.  Pre-conditions:      Patient is authenticated.
8.  Post-conditions:     List of past triage sessions and SBAR summaries rendered.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Patient opens history tab on `/patient/triage`.
    Step 2: Frontend calls HTTP GET `/api/v1/triage/history`.
    Step 3: Backend queries `triage_sessions` for `user_id = currentUserId` ordered by `created_at DESC`.
    Step 4: Backend returns `List<TriageSessionDto>`.
    Step 5: Frontend renders past symptom cards with urgency badges and SBAR summaries.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Query uses index `idx_triage_user_created` (< 40ms).
15. Data Entities Involved: `triage_sessions`.
16. User Interface Controls: Triage history drawer, SBAR modal inspector.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.18 DE-IDENTIFY MEDICAL PII IN TEXT (UC-PAT-18)
================================================================================
1.  Use Case ID:         UC-PAT-18
2.  Use Case Name:       De-identify Medical PII in Text
3.  Target System:       MediAssist-AI Privacy Engine
4.  Primary Actor:       Patient (System Pre-processor)
5.  Stakeholders:        Patient, Data Privacy Officer
6.  Trigger:             Patient submits clinical text for PII sanitization.
7.  Pre-conditions:      Input text length <= 20,000 characters (`@Size(max = 20000)`).
8.  Post-conditions:     PII tokens (names, phone numbers, CCCD) redacted with privacy placeholders.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Frontend calls HTTP POST `/api/v1/pii/deidentify` with `DeidentifyTextRequest(text)`.
    Step 2: Backend `MedicalPiiService` scans for Vietnamese identifiers:
            - Phone numbers: replaced with `[PHONE_REDACTED]`
            - Citizen ID / CCCD: replaced with `[CITIZEN_ID_REDACTED]`
            - Email addresses: replaced with `[EMAIL_REDACTED]`
            - Personal patient names: replaced with `[PATIENT_NAME]`
    Step 3: Backend returns `DeidentificationResult(sanitizedText, entitiesFound)`.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Text Exceeds 20,000 Characters:
      1. Validation fails; backend returns HTTP 400 Bad Request (Security Fix BE-12).
13. Business Rules:
    - BR-24: De-identification complies with Decree 13/2023/NĐ-CP and HIPAA Safe Harbor.
14. Non-Functional Requirements:
    - NFR-PERF: Text processing latency < 25ms.
15. Data Entities Involved: None (pure in-memory text filter).
16. User Interface Controls: Privacy badge, toggle "Bảo vệ thông tin cá nhân (Ẩn PII)".
17. Open Issues: None.
================================================================================
"""

if __name__ == "__main__":
    print("Part 2 module loaded successfully. Character count:", len(get_content()))
