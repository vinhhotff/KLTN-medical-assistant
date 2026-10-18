# -*- coding: utf-8 -*-
"""
Part 2: 2.3.2 Patient Use Case Specifications (UC-PAT-01 to UC-PAT-18).
Exhaustive 17-field tabular specifications for each patient use case.
"""

def get_content():
    return """
#### 2.3.2 Patient (Portal & Triage)

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.1 INTERACTIVE CONVERSATIONAL AI SYMPTOM TRIAGE (UC-PAT-01)
================================================================================
1.  Use Case ID:         UC-PAT-01
2.  Use Case Name:       Interactive Conversational AI Symptom Triage
3.  Target System:       MediAssist-AI Clinical Triage Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician, Clinical Safety Board
6.  Trigger:             Patient enters chat interface and sends a natural language symptom query.
7.  Pre-conditions:      
    - Patient is authenticated or operating in verified guest screening session.
    - AI Inference Gateway (Gemini 1.5 Flash / OpenRouter) is operational.
8.  Post-conditions:     
    - Conversation session is initialized or appended in Redis session cache.
    - AI evaluates multi-turn symptom descriptions and generates clarifying questions or final triage summary.
    - Structured SBAR clinical report (Situation, Background, Assessment, Recommendation) is generated.
    - Urgency level (`ROUTINE`, `URGENT`, `EMERGENCY`) and recommended medical specialty are determined.
9.  Priority:            High (P0 - Core Differentiator)
10. Normal Flow:
    Step 1: Patient opens the AI Triage Assistant (`/triage`) and types their symptoms in natural language.
    Step 2: Frontend dispatches HTTP POST to `/api/v1/triage/chat` with session ID and message text.
    Step 3: Backend passes the raw input through `ClinicalQueryDefenseEngine` (UC-PAT-02).
    Step 4: System verifies query is valid and non-emergency clinical symptom description.
    Step 5: Backend constructs system prompt containing clinical role constraints and SBAR guidelines:
            - Explicit directive: Do NOT prescribe medications or offer definitive clinical diagnoses.
            - Instruct model to ask 1 to 2 targeted clarifying questions (duration, severity, onset, triggers)
              if symptoms are ambiguous or incomplete.
    Step 6: Backend sends prompt with conversational history to Google Gemini 1.5 Flash API.
    Step 7: If Gemini response requires clarification:
            - Backend caches conversation turn in Redis (`triage:session:{id}`).
            - Backend returns conversational response with structured prompt pills.
            - Patient responds to clarifying questions (returns to Step 2).
    Step 8: If sufficient clinical information is gathered:
            - AI outputs final structured SBAR JSON response:
              * Situation: Primary chief complaint.
              * Background: Symptom timeline, medical context, and aggravating factors.
              * Assessment: Clinical risk evaluation and triage urgency tag (`ROUTINE` or `URGENT`).
              * Recommendation: Next steps, self-care warnings, and recommended specialty taxonomy code.
    Step 9: Backend extracts recommended specialty and calls pgvector semantic doctor matching (UC-PAT-03).
    Step 10: Backend stores triage summary in `triage_sessions` database table.
    Step 11: Frontend renders conversational messages, SBAR assessment card, and matched specialist doctor cards.
11. Alternative Flows:
    - Alt Flow 11a: Red-Flag Emergency Detected:
      1. Defense Engine detects acute red-flag symptoms (chest pain, stroke FAST, severe hemoptysis).
      2. Normal conversational flow is immediately halted (Branch to UC-PAT-02 Alt Flow).
    - Alt Flow 11b: AI Service Fallback:
      1. Primary Gemini API times out (> 4000ms) or returns HTTP 429 Rate Limit.
      2. Backend switches to secondary OpenRouter free-tier pool.
      3. If all external APIs fail, system activates rule-based heuristic triage and symptom keyword matcher.
12. Exception Flows:
    - Exc Flow 12a: Empty or gibberish input:
      1. Defense engine flags input as unprocessable text.
      2. System responds politely: "Vui lòng mô tả chi tiết hơn về các triệu chứng hoặc cảm giác khó chịu bạn đang gặp phải."
13. Business Rules:
    - BR-10: Medical Disclaimer must be rendered on all triage responses: "Kết quả sàng lọc mang tính chất tham khảo, không thay thế chẩn đoán y khoa chính thức từ bác sĩ."
    - BR-11: Maximum 5 conversation turns per triage session to prevent infinite conversational loops.
14. Non-Functional Requirements:
    - NFR-PERF: Triage response generation latency < 2500ms (P95).
    - NFR-SEC: All PII stripped before prompt assembly.
15. Data Entities Involved:
    - `triage_sessions` (id, user_id, chief_complaint, sbar_summary, urgency_level, specialty_id, created_at).
16. User Interface Controls:
    - Chat message stream, chat input box, send button, symptom quick-select tags, SBAR result card.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.2 CLINICAL QUERY DEFENSE SCREENING (UC-PAT-02)
================================================================================
1.  Use Case ID:         UC-PAT-02
2.  Use Case Name:       Clinical Query Defense Screening (5-Stage Pipeline)
3.  Target System:       MediAssist-AI Clinical Query Defense Engine
4.  Primary Actor:       Patient (System-interceptor)
5.  Stakeholders:        Patient Safety Officer, Medical Director
6.  Trigger:             Invoked automatically on every inbound natural language symptom query.
7.  Pre-conditions:      Raw text query received from frontend client.
8.  Post-conditions:     
    - Query is either approved and sanitized for vector embedding and LLM inference,
      OR intercepted with immediate emergency lockout / administrative routing.
9.  Priority:            High (P0 - Patient Safety Critical)
10. Normal Flow:
    Step 1: Raw patient string is received by `ClinicalQueryDefenseEngine.process(rawInput)`.
    Step 2: Stage 1 — Acute Red-Flag Emergency Interception:
            Engine evaluates input against comprehensive regex and keyword patterns for acute conditions:
            - Stroke (FAST): méo miệng, liệt nửa người, nói ngọng, mờ mắt đột ngột.
            - Acute Myocardial Infarction: đau thắt ngực lan ra cánh tay trái, vã mồ hôi lạnh, khó thở dữ dội.
            - Anaphylaxis: khó thở sau dùng thuốc/thức ăn, sưng phù môi họng, tím tái.
            - Severe Hemorrhage: nôn ra máu tươi, ho ra máu sét đánh, đi ngoài phân đen như bã cà phê.
            If red-flag match found -> Divert to Alternative Flow 10a.
    Step 3: Stage 2 — Vietnamese Slang & Teen-Code Normalization:
            Engine applies dictionary mapping and tone restoration:
            - `ko`, `k`, `khg` -> `không`
            - `bs`, `bsi` -> `bác sĩ`
            - `dau da day` -> `đau dạ dày`
            - `met` -> `mệt mỏi`
            - `sot cao` -> `sốt cao`
    Step 4: Stage 3 — Vietnamese NegEx Clause-Level Negation Splitting:
            Engine scans for clinical negation trigger phrases: `không bị`, `chưa từng`, `không có`, `không sốt`.
            Input is parsed into Affirmative Clause (symptoms present) and Negated Clause (symptoms absent).
            Negated symptoms are extracted into `negated_symptoms` list and isolated from the positive query.
            Example: "Tôi đau tức ngực dữ dội nhưng không bị sốt"
            -> Affirmative: "Tôi đau tức ngực dữ dội" (passed to vector embedding).
            -> Negated: "không bị sốt" (quarantined to prevent false infectious/pulmonology doctor routing).
    Step 5: Stage 4 — Out-of-Domain (OOD) Intent Gating:
            Engine analyzes if query is non-clinical administrative chatter:
            - Hospital opening hours, parking fees, insurance policies, or greeting spam.
            If OOD match found -> Divert to Alternative Flow 10b.
    Step 6: Stage 5 — Compound Multi-Symptom Decomposition:
            Engine identifies multi-symptom conjunctions (`đồng thời`, `kèm theo`, `và`) and splits query
            into distinct clinical sub-facets to facilitate comprehensive specialist matching.
    Step 7: Engine outputs sanitized, normalized query string ready for embedding generation.
11. Alternative Flows:
    - Alt Flow 10a: Emergency Red-Flag Interception:
      1. Engine immediately halts triage and embedding generation.
      2. Engine sets response flag `is_emergency = true`, `urgency = EMERGENCY`.
      3. Backend returns emergency payload with prominent red banner:
         "CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn có dấu hiệu cấp cứu y khoa đe dọa tính mạng! Vui lòng gọi ngay Cấp cứu 115 hoặc đến ngay khoa Cấp cứu bệnh viện gần nhất!"
      4. Frontend locks the booking interface and renders direct 115 calling hotline button.
    - Alt Flow 10b: Out-of-Domain Administrative Response:
      1. Engine identifies administrative query.
      2. System returns pre-configured administrative guidance:
         "MediAssist-AI là trợ lý sàng lọc triệu chứng y khoa. Đối với thông tin về viện phí, thủ tục BHYT hoặc lịch làm việc bệnh viện, vui lòng liên hệ tổng đài CSKH 1900-xxxx."
12. Exception Flows: None.
13. Business Rules:
    - BR-12: Zero tolerance for acute emergency bypass. Red-flag pattern check must run synchronously with 0 external network dependencies.
14. Non-Functional Requirements:
    - NFR-PERF: 5-Stage screening execution latency < 15ms.
15. Data Entities Involved: None (pure computational in-memory defense engine).
16. User Interface Controls:
    - Emergency Red Banner, 115 Call Trigger, Administrative guidance pill.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.3 SEMANTIC DOCTOR SEARCH VIA PGVECTOR HNSW (UC-PAT-03)
================================================================================
1.  Use Case ID:         UC-PAT-03
2.  Use Case Name:       Semantic Doctor Search via pgvector HNSW
3.  Target System:       MediAssist-AI Vector Search & Retrieval Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Platform Architect
6.  Trigger:             Patient submits symptom description or specialty search query.
7.  Pre-conditions:      
    - Verified doctor profiles possess pre-computed 1536-dimensional continuous embeddings in `doctor_profiles.bio_embedding`.
    - PostgreSQL 16 HNSW index `idx_doctor_bio_hnsw_verified` is built and active.
8.  Post-conditions:     
    - System executes session-tuned vector similarity query.
    - Top candidates are scored using Weighted Hybrid Re-Ranking Formula (WHRF) in a bounded min-heap.
    - Ranked list of qualified specialist doctors is returned with compatibility scores.
9.  Priority:            High (P0 - Core Differentiator)
10. Normal Flow:
    Step 1: Patient inputs symptom text or selects a specialty filter on `/doctors`.
    Step 2: Backend passes query through 5-stage defense engine (UC-PAT-02).
    Step 3: Backend invokes `EmbeddingService` to convert affirmative query into 1536-d dense vector
            using `openai/text-embedding-3-small` (or local FNV-1a feature hash if offline).
    Step 4: Backend configures PostgreSQL session parameters via `SET LOCAL` within a transaction:
            - `SET LOCAL hnsw.ef_search = 120;` (expands neighborhood exploration for 99.95% recall).
            - `SET LOCAL enable_seqscan = off;` (forces PostgreSQL query planner to execute Index Scan).
            - `SET LOCAL work_mem = '64MB';` (guarantees in-memory graph traversal).
    Step 5: Backend executes vector similarity query fetching top 20 candidate doctors:
            `SELECT d.*, 1 - (d.bio_embedding <=> :queryEmbedding) AS cosine_sim FROM doctor_profiles d WHERE d.is_verified = true ...`
    Step 6: Backend feeds candidates into Bounded Min-Heap executing WHRF Re-ranking:
            Score Formula:
            - $S_{dense} = \frac{1}{1 + e^{-8.0 \cdot (cosine\_sim - 0.65)}}$ (Sigmoid Contrastive Sharpening).
            - $S_{sparse}$: Sparse BM25-like lexical keyword overlap between query and doctor clinical keywords.
            - Specialty Match Boost: $+0.12$ if primary specialty matches triage recommendation.
            - Divergence Penalty: $-0.10$ if candidate specialty contradicts clinical presentation.
            - Credibility Damper: $\text{Weight} = \log_{10}(\text{review\_count} + 1) / \log_{10}(100)$ to prevent rating spoofing.
            - Academic Credential Multiplier: Prof (+0.08), Assoc Prof (+0.05), PhD/CKII (+0.03).
    Step 7: Min-heap retains top $K=5$ optimal doctors.
    Step 8: Backend serializes results into `DoctorSearchResultDTO` list including match percentage.
    Step 9: Frontend renders doctor cards displaying specialty badges, match score, rating, fee, and available slots.
11. Alternative Flows:
    - Alt Flow 11a: AI Provider Offline / Degradation:
      1. Embedding API fails -> Backend activates local Unsupervised Feature Hashing fallback (Character N-gram FNV-1a).
      2. Search completes with degraded semantic precision; UI indicates standard matching.
12. Exception Flows:
    - Exc Flow 12a: No matching doctors found:
      1. Query returns 0 records above minimum threshold (score < 0.35).
      2. Frontend displays "Không tìm thấy bác sĩ phù hợp với mô tả triệu chứng cụ thể này. Bạn có thể duyệt danh sách theo chuyên khoa."
13. Business Rules:
    - BR-13: Only verified doctors (`is_verified = true`) with active practice certificates can appear in search.
14. Non-Functional Requirements:
    - NFR-PERF: Vector search query execution time in PostgreSQL < 12ms (Observed benchmark: 0.72ms).
    - NFR-PERF: Total end-to-end API response time < 350ms.
15. Data Entities Involved:
    - `doctor_profiles` (id, user_id, specialty_id, bio, bio_embedding, rating_avg, review_count, consultation_fee, is_verified).
    - `specialties` (id, name, code).
16. User Interface Controls:
    - Search input, Specialty dropdown filter, Price sort toggle, Rating sort toggle, Doctor card list.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.4 VIEW DOCTOR PROFILE & ACADEMIC CREDENTIALS (UC-PAT-04)
================================================================================
1.  Use Case ID:         UC-PAT-04
2.  Use Case Name:       View Doctor Profile & Academic Credentials
3.  Target System:       MediAssist-AI Doctor Directory Subsystem
4.  Primary Actor:       Patient, Guest
5.  Stakeholders:        Patient, Attending Physician
6.  Trigger:             Patient clicks on a doctor card in search results or directory.
7.  Pre-conditions:      Doctor account exists and is verified.
8.  Post-conditions:     Comprehensive doctor profile view is rendered.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Patient clicks doctor card navigating to `/doctors/{id}`.
    Step 2: Frontend calls HTTP GET `/api/v1/doctors/{id}`.
    Step 3: Backend queries `doctor_profiles` joined with `users`, `specialties`, and `doctor_schedules`.
    Step 4: Backend retrieves aggregated patient reviews and rating distributions.
    Step 5: Backend returns `DoctorDetailResponse` containing:
            - Full name, academic title (PGS.TS, BS.CKII, ThS.BS).
            - Practice certificate number (CCHN) and issuing authority.
            - Clinical specialty, sub-specialties, hospital affiliations.
            - Biography, years of experience, languages spoken.
            - Consultation fee, clinic room, and hospital address.
            - Real-time weekly available consultation slots.
    Step 6: Frontend renders responsive profile page with calendar slot picker.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Doctor profile not found or unverified:
      1. Backend returns HTTP 404 Not Found.
      2. Frontend displays "Hồ sơ bác sĩ không tồn tại hoặc đang trong quá trình xét duyệt."
13. Business Rules:
    - BR-14: Medical license number must be visible to ensure public transparency.
14. Non-Functional Requirements:
    - NFR-PERF: Profile page load time < 200ms (served from Redis L2 cache if available).
15. Data Entities Involved:
    - `doctor_profiles`, `users`, `specialties`, `reviews`, `doctor_schedules`.
16. User Interface Controls:
    - Doctor header, credential badges, biography section, review list, interactive slot picker.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.5 UPLOAD MEDICAL DOCUMENT & LAB TEST (UC-PAT-05)
================================================================================
1.  Use Case ID:         UC-PAT-05
2.  Use Case Name:       Upload Medical Document & Lab Test Image/PDF
3.  Target System:       MediAssist-AI Document Ingestion Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician, Storage Administrator
6.  Trigger:             Patient drags and drops or browses a lab test document file.
7.  Pre-conditions:      
    - Patient is authenticated with verified account.
    - File format is PDF, PNG, or JPEG; file size <= 10MB.
8.  Post-conditions:     
    - Document is deduplicated via SHA-256 hash.
    - File is uploaded to private Supabase S3 bucket `medical-documents` under path `patient_{id}/{uuid}.ext`.
    - Document metadata record is persisted in `medical_documents` table with status `UPLOADED`.
    - Asynchronous OCR and clinical interpretation pipeline is queued.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Patient navigates to Document Summarizer (`/documents`) and drops a medical report file.
    Step 2: Frontend validates file constraints (format: PDF/PNG/JPEG, size <= 10MB, PDF pages <= 10).
    Step 3: Frontend computes client-side SHA-256 hash of the file bytes.
    Step 4: Frontend calls HTTP POST `/api/v1/documents/upload` with multipart file and SHA-256 checksum.
    Step 5: Backend verifies checksum to detect identical duplicate uploads.
    Step 6: Backend sanitizes filename and generates storage path: `documents/{patientId}/{uuid}.{ext}`.
    Step 7: Backend streams file directly to Supabase S3 private bucket `medical-documents`.
    Step 8: Backend inserts record into `medical_documents` with `storage_path` (Flyway V20 - no plaintext URLs).
    Step 9: Backend returns HTTP 201 Created with document ID.
    Step 10: Backend triggers asynchronous document analysis job via `DocumentAnalysisService` (UC-PAT-06).
    Step 11: Frontend updates document list showing upload progress and status badge `Đang Phân Tích...`.
11. Alternative Flows:
    - Alt Flow 11a: Identical Duplicate Document:
      1. Backend finds existing document with matching SHA-256 hash for this patient.
      2. Backend returns existing document analysis result without re-uploading or re-billing AI tokens.
12. Exception Flows:
    - Exc Flow 12a: File exceeds size limit (> 10MB):
      1. Backend returns HTTP 413 Payload Too Large.
      2. Frontend displays: "Kích thước tệp vượt quá 10MB. Vui lòng nén tệp hoặc chụp lại ảnh."
    - Exc Flow 12b: Corrupted or unreadable PDF:
      1. Backend PDFBox parser detects corrupted header.
      2. Backend marks status `FAILED` and notifies patient to re-upload.
13. Business Rules:
    - BR-15: All medical files must be stored in PRIVATE cloud buckets. Public bucket URLs are strictly forbidden (Security Audit Fix V20).
14. Non-Functional Requirements:
    - NFR-SEC: Zero unauthorized file exposure. Access granted strictly via 15-minute time-limited HMAC signed URLs.
15. Data Entities Involved:
    - `medical_documents` (id, patient_id, file_name, file_type, file_size, file_hash, storage_path, status, created_at).
16. User Interface Controls:
    - Drag-and-drop zone, file browser button, progress bar, upload success notification.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.6 VIEW MEDICAL DOCUMENT AI SUMMARY (UC-PAT-06)
================================================================================
1.  Use Case ID:         UC-PAT-06
2.  Use Case Name:       View Medical Document AI Summary & Biomarker Table
3.  Target System:       MediAssist-AI Multimodal Clinical AI Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician
6.  Trigger:             Patient opens a processed medical document from their document list.
7.  Pre-conditions:      Document analysis job has completed (`status = 'ANALYZED'`).
8.  Post-conditions:     Patient reviews structured lab biomarkers and layperson clinical interpretation.
9.  Priority:            High (P0 - Core Differentiator)
10. Normal Flow:
    Step 1: Patient clicks on a processed document card on `/documents/{id}`.
    Step 2: Frontend calls HTTP GET `/api/v1/documents/{id}/analysis`.
    Step 3: Backend invokes `PatientAccessGuard.assertCanAccessPatient(actorId, role, patientId, 'VIEW_DOCUMENT')`.
    Step 4: Backend retrieves structured analysis JSON from `medical_documents.analysis_result`.
    Step 5: Backend generates 15-minute temporary signed URL for the source file via Supabase S3 client.
    Step 6: Backend returns payload containing:
            - Document Type: Blood Panel, Urinalysis, Ultrasound, X-Ray, Prescription.
            - Extracted Biomarkers Table: Test name, numerical result, unit, reference range, status (`NORMAL`, `ELEVATED`, `LOW`).
            - Standardized LOINC codes associated with each biomarker.
            - Layperson Medical Summary: Plain Vietnamese explanation of what abnormal findings indicate.
            - Red-Flag Warnings: High-risk indicators requiring immediate in-person medical evaluation.
            - Recommended Specialist: Medical specialty best equipped to address these findings.
    Step 7: Frontend renders split-view: Document preview on left, structured clinical interpretation on right.
11. Alternative Flows:
    - Alt Flow 11a: Link Document to New Appointment:
      1. Patient clicks "Đặt lịch khám với kết quả này".
      2. System pre-populates recommended specialty and attaches `medical_document_id` to booking draft.
12. Exception Flows:
    - Exc Flow 12a: Unauthorized Access Attempt (IDOR):
      1. Patient attempts to access document belonging to another patient ID.
      2. `PatientAccessGuard` throws HTTP 403 Forbidden and logs security audit trail.
13. Business Rules:
    - BR-10: Medical disclaimer mandatory on all AI lab summaries.
    - BR-16: Numerical lab values must retain exact precision extracted from original scan.
14. Non-Functional Requirements:
    - NFR-PERF: Analysis view loading latency < 250ms.
15. Data Entities Involved:
    - `medical_documents` (id, patient_id, storage_path, analysis_result, status).
16. User Interface Controls:
    - Split-screen viewer, biomarker table with color-coded status pills, summary accordion, "Đặt lịch khám" CTA.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.7 BOOK IN-CLINIC APPOINTMENT (UC-PAT-07)
================================================================================
1.  Use Case ID:         UC-PAT-07
2.  Use Case Name:       Book In-Clinic Appointment & Slot Reservation
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Clinic Receptionist
6.  Trigger:             Patient selects an available time slot and clicks "Book Appointment".
7.  Pre-conditions:      
    - Patient is authenticated with verified email.
    - Doctor has configured available consultation slots for selected date.
8.  Post-conditions:     
    - Appointment record created with status `PENDING` (awaiting payment) or `CONFIRMED`.
    - Sequential daily STT queue number assigned.
    - Temporary slot lock placed to prevent concurrent double-booking.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Patient selects doctor, appointment date, and available 30-minute time slot (e.g., 09:00 - 09:30).
    Step 2: Patient optionally attaches a processed `medical_document_id` and inputs chief complaint.
    Step 3: Frontend calls HTTP POST `/api/v1/appointments` with booking payload.
    Step 4: Backend opens transaction and executes slot availability check:
            `SELECT COUNT(*) FROM appointments WHERE doctor_id = :d AND appointment_date = :date AND start_time = :start AND status IN ('CONFIRMED', 'PENDING')`
    Step 5: If slot is vacant, backend calculates next daily sequential queue number:
            `STT = COALESCE(MAX(queue_number), 0) + 1` for that doctor and date.
    Step 6: Backend creates appointment record with status `PENDING`, queue number, and consultation fee.
    Step 7: Backend locks slot for 10 minutes to allow payment completion.
    Step 8: Backend returns HTTP 201 Created with appointment ID and payment checkout redirection URL.
11. Alternative Flows:
    - Alt Flow 11a: Concurrent Slot Collision:
      1. Another patient successfully books the identical slot milliseconds prior.
      2. Unique constraint or optimistic lock detects conflict.
      3. Backend returns HTTP 409 Conflict with message "Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác."
      4. Frontend refreshes slot picker to reflect latest availability.
12. Exception Flows:
    - Exc Flow 12a: Booking outside operational clinic hours:
      1. Patient attempts to book on Sunday or outside 08:00–12:00 / 13:30–17:00.
      2. Backend rejects request with `CLINIC_OUTSIDE_OPERATING_HOURS`.
13. Business Rules:
    - BR-17: In-clinic consultations operate strictly Monday through Saturday, 08:00–12:00 and 13:30–17:00 (Sundays closed).
    - BR-18: One patient cannot hold more than 2 active `PENDING` bookings simultaneously.
14. Non-Functional Requirements:
    - NFR-PERF: Booking transaction completes in < 150ms with serializable isolation.
15. Data Entities Involved:
    - `appointments` (id, patient_id, doctor_id, appointment_date, start_time, end_time, status, queue_number, fee, medical_document_id).
16. User Interface Controls:
    - Date picker, Slot grid, Symptom note box, Document attachment dropdown, "Xác Nhận & Thanh Toán" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.8 PROCESS APPOINTMENT PAYMENT (UC-PAT-08)
================================================================================
1.  Use Case ID:         UC-PAT-08
2.  Use Case Name:       Process Appointment Payment (Stripe / Mock Sandbox)
3.  Target System:       MediAssist-AI Financial Gateway Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Hospital Finance
6.  Trigger:             Patient proceeds to payment checkout following slot reservation.
7.  Pre-conditions:      Appointment exists in `PENDING` status.
8.  Post-conditions:     
    - Payment transaction is authorized and captured.
    - Appointment status transitions from `PENDING` to `CONFIRMED`.
    - Payment ledger record inserted in `payments` table.
    - Transactional confirmation email with electronic admission slip is dispatched.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Patient selects payment method: Stripe Credit Card or MediAssist Pay (Mock Sandbox).
    Step 2: Frontend dispatches HTTP POST `/api/v1/payments/checkout` with appointment ID.
    Step 3: Backend verifies `app.payment.mock.enabled` configuration:
            - If production (`mock.enabled = false`): Backend creates Stripe Checkout Session and returns redirect URL.
            - If development/demo (`mock.enabled = true`): Backend routes to Mock Payment Gateway.
    Step 4: Patient completes payment details on checkout page and clicks "Pay Now".
    Step 5: Payment Gateway validates transaction and posts webhook event to `/api/v1/payments/webhook`.
    Step 6: Backend validates webhook cryptographic signature.
    Step 7: Backend updates appointment status to `CONFIRMED`.
    Step 8: Backend records transaction in `payments` table (amount, currency, status = `PAID`, transaction_id).
    Step 9: Backend triggers `@Async` event: `AppointmentConfirmedEvent` -> dispatches confirmation email with ticket.
    Step 10: Client redirects to Electronic Admission Slip (`/appointments/{id}/ticket`).
11. Alternative Flows:
    - Alt Flow 11a: Payment Cancelled or Timed Out:
      1. Patient closes payment window or 10-minute slot lock expires.
      2. Backend marks appointment `CANCELLED` and releases slot back to public availability.
12. Exception Flows:
    - Exc Flow 12a: Payment Declined by Issuer:
      1. Gateway returns `insufficient_funds` or `card_declined`.
      2. Backend logs failure and prompts patient to try an alternative payment method.
13. Business Rules:
    - BR-19: In production mode (`mock.enabled = false`), mock payment verification is permanently disabled to prevent financial bypass (Security Audit BE-10).
14. Non-Functional Requirements:
    - NFR-SEC: Webhook signature verification mandatory (HMAC-SHA256).
15. Data Entities Involved:
    - `payments` (id, appointment_id, user_id, amount, status, payment_method, transaction_id, created_at).
    - `appointments` (status).
16. User Interface Controls:
    - Payment selection radio, Stripe Elements iframe, "Thanh Toán Ngay" button, countdown timer (10 mins).
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.9 VIEW ELECTRONIC ADMISSION SLIP (UC-PAT-09)
================================================================================
1.  Use Case ID:         UC-PAT-09
2.  Use Case Name:       View Electronic Patient Encounter Slip & Admission STT
3.  Target System:       MediAssist-AI Patient Encounter Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Hospital Reception, Security Staff
6.  Trigger:             Patient accesses ticket view from dashboard or confirmation email link.
7.  Pre-conditions:      Appointment is in `CONFIRMED` status.
8.  Post-conditions:     Electronic admission slip is displayed with full in-clinic navigation guidance.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Patient navigates to `/appointments/{id}/ticket`.
    Step 2: Frontend calls HTTP GET `/api/v1/appointments/{id}/ticket`.
    Step 3: Backend enforces `PatientAccessGuard` verifying patient ownership of appointment.
    Step 4: Backend compiles admission ticket details:
            - Sequential Queue Number (e.g., `STT 05`).
            - Doctor Full Name, Specialty, Academic Title.
            - Hospital Name, Facility Campus, Building, Floor, Room Number (e.g., "Phòng Khám 302, Tầng 3, Tòa Nhà A").
            - Appointment Date & Time Window (e.g., "09:00 - 09:30, Thứ Hai, 20/10/2026").
            - Google Maps coordinates and direct navigation link.
            - Pre-Encounter Preparation Guidelines:
              * "Nhịn ăn sáng ít nhất 8 tiếng nếu có chỉ định xét nghiệm máu."
              * "Mang theo bản gốc Căn cước công dân (CCCD) và Thẻ BHYT."
              * "Có mặt trước giờ hẹn ít nhất 15 phút để hoàn tất thủ tục tiếp đón."
            - Dynamic QR Code containing encrypted appointment verification payload.
    Step 5: Frontend renders styled digital encounter ticket with printable CSS layout.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-20: Queue numbers (STT) are sequential per doctor per calendar date starting at STT 01.
14. Non-Functional Requirements:
    - NFR-USA: Ticket layout optimized for mobile display and 1-click printing.
15. Data Entities Involved:
    - `appointments`, `doctor_profiles`, `users`, `specialties`.
16. User Interface Controls:
    - Digital Ticket card, QR code display, "Google Maps Dẫn Đường" button, "In Phiếu Khám" button, "Xuất Lịch" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.10 EXPORT APPOINTMENT TO CALENDAR (UC-PAT-10)
================================================================================
1.  Use Case ID:         UC-PAT-10
2.  Use Case Name:       Export Appointment to Google Calendar / .ics File
3.  Target System:       MediAssist-AI Calendar Integration Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient
6.  Trigger:             Patient clicks "Thêm vào Google Calendar" or "Tải tệp .ICS".
7.  Pre-conditions:      Appointment is `CONFIRMED`.
8.  Post-conditions:     Calendar event is added to user's Google Calendar or `.ics` file downloaded.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: On admission ticket page, patient clicks "Thêm vào lịch".
    Step 2: Sub-option A (Google Calendar):
            - Frontend generates formatted Google Calendar URL:
              `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Lịch+Khám+Bệnh+MediAssist...`
            - Browser opens new tab directly in user's Google Calendar with pre-filled title, location, and reminder.
    Step 3: Sub-option B (Apple / Outlook .ICS):
            - Frontend generates RFC 5545 iCalendar (`.ics`) string in browser memory.
            - Browser initiates automatic file download: `lich-kham-mediassist.ics`.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-USA: Zero server round-trip; executed 100% on client-side.
15. Data Entities Involved: `appointments`.
16. User Interface Controls: Dropdown menu `Thêm vào Lịch` (`Google Calendar`, `Tệp .ICS`).
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.11 VIEW APPOINTMENT HISTORY (UC-PAT-11)
================================================================================
1.  Use Case ID:         UC-PAT-11
2.  Use Case Name:       View Patient Upcoming & Historical Appointments
3.  Target System:       MediAssist-AI Patient Appointment Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient
6.  Trigger:             Patient clicks "Lịch Khám Của Tôi" in navigation menu.
7.  Pre-conditions:      Patient is authenticated.
8.  Post-conditions:     Paginated list of patient appointments is rendered with filter tabs.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Patient navigates to `/patient/appointments`.
    Step 2: Frontend calls HTTP GET `/api/v1/appointments/my-appointments?page=0&size=10`.
    Step 3: Backend verifies JWT patient ID and queries `appointments` ordered by `appointment_date DESC`.
    Step 4: Backend returns paginated list of appointment cards with status: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
    Step 5: Frontend renders tabbed interface: "Sắp Diễn Ra" (Upcoming), "Đã Hoàn Thành" (Completed), "Đã Hủy" (Cancelled).
    Step 6: Patient can click on any card to view details, admission slip, or cancel/reschedule.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Query executed using index `idx_appointments_patient_date` (< 30ms).
15. Data Entities Involved: `appointments`, `doctor_profiles`, `users`.
16. User Interface Controls: Filter tabs, appointment cards, pagination controls.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.12 RESCHEDULE APPOINTMENT (UC-PAT-12)
================================================================================
1.  Use Case ID:         UC-PAT-12
2.  Use Case Name:       Reschedule Active Appointment
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor
6.  Trigger:             Patient clicks "Dời Lịch Hẹn" on an upcoming confirmed appointment.
7.  Pre-conditions:      
    - Appointment is in `CONFIRMED` status.
    - Current time is at least 2 hours prior to scheduled appointment start time.
8.  Post-conditions:     
    - Appointment date and time slot updated to newly selected vacancy.
    - Old slot released back to public availability.
    - Updated confirmation email dispatched to patient and doctor.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Patient selects "Dời Lịch" on appointment card.
    Step 2: Frontend displays available future dates and open slots for the same doctor.
    Step 3: Patient selects a new valid slot and confirms reschedule request.
    Step 4: Frontend calls HTTP PUT `/api/v1/appointments/{id}/reschedule` with new slot parameters.
    Step 5: Backend verifies ownership via `PatientAccessGuard`.
    Step 6: Backend checks policy rule: current time must be > 2 hours before scheduled slot.
    Step 7: Backend validates new slot is vacant and acquires transaction lock.
    Step 8: Backend updates `appointment_date`, `start_time`, `end_time`, and re-computes `queue_number`.
    Step 9: Backend sends updated appointment notification email via async mail executor.
    Step 10: Frontend renders success toast: "Lịch hẹn đã được dời thành công."
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Reschedule within 2 hours of appointment:
      1. Backend rejects request with HTTP 400 Bad Request: "Không thể dời lịch trong vòng 2 giờ trước giờ khám."
13. Business Rules:
    - BR-21: Rescheduling is permitted up to 2 hours prior to appointment without fee penalty. Maximum 2 reschedules per booking.
14. Non-Functional Requirements:
    - NFR-PERF: Reschedule transaction executed in < 150ms.
15. Data Entities Involved: `appointments`, `audit_logs`.
16. User Interface Controls: Reschedule modal, slot picker, "Xác Nhận Dời Lịch" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.13 CANCEL APPOINTMENT WITH REFUND (UC-PAT-13)
================================================================================
1.  Use Case ID:         UC-PAT-13
2.  Use Case Name:       Cancel Appointment with Automated Policy Refund
3.  Target System:       MediAssist-AI Refund & Cancellation Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Hospital Finance
6.  Trigger:             Patient clicks "Hủy Lịch Hẹn" and provides cancellation reason.
7.  Pre-conditions:      Appointment status is `CONFIRMED` or `PENDING`.
8.  Post-conditions:     
    - Appointment status transitions to `CANCELLED`.
    - Time slot is immediately freed.
    - Automated refund calculated and processed via `AppointmentRefundService`.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Patient clicks "Hủy Lịch" and selects cancellation reason (change of plans, feeling better, other).
    Step 2: Frontend calls HTTP POST `/api/v1/appointments/{id}/cancel` with reason payload.
    Step 3: Backend verifies ownership via `PatientAccessGuard`.
    Step 4: Backend invokes unified `AppointmentRefundService.processRefund(appointment, actorRole)`.
    Step 5: Refund Service evaluates cancellation timeline against policy:
            - If cancelled > 24 hours before appointment: 100% refund of consultation fee.
            - If cancelled between 2 and 24 hours before appointment: 80% refund (20% administrative fee retained).
            - If cancelled < 2 hours before appointment: 0% refund (slot wasted penalty).
    Step 6: Backend updates appointment status to `CANCELLED` and sets `cancellation_reason`.
    Step 7: Backend triggers payment refund via Stripe API or Mock Payment Gateway.
    Step 8: Backend records refund transaction in `payments` ledger.
    Step 9: Backend dispatches cancellation & refund notice email to patient.
    Step 10: Frontend renders modal displaying refund amount processed.
11. Alternative Flows:
    - Alt Flow 11a: Unpaid Appointment Cancellation:
      1. If appointment is still `PENDING`, slot is simply freed with zero refund transaction required.
12. Exception Flows: None.
13. Business Rules:
    - BR-22: Cancellation refund policy tiers: >24h = 100%, 2-24h = 80%, <2h = 0%.
14. Non-Functional Requirements:
    - NFR-SEC: Refund transactions must be idempotent to prevent double-crediting.
15. Data Entities Involved: `appointments`, `payments`, `audit_logs`.
16. User Interface Controls: Cancel modal, cancellation reason dropdown, refund preview box, confirm button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.14 VIEW MEDICAL PASSPORT (UC-PAT-14)
================================================================================
1.  Use Case ID:         UC-PAT-14
2.  Use Case Name:       View Personal Medical Passport / Longitudinal EMR
3.  Target System:       MediAssist-AI Longitudinal EMR Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Attending Physician
6.  Trigger:             Patient navigates to "Hồ Sơ Sức Khỏe" (Medical Passport).
7.  Pre-conditions:      Patient is authenticated.
8.  Post-conditions:     Aggregated longitudinal health timeline is rendered.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Patient navigates to `/patient/medical-passport`.
    Step 2: Frontend calls HTTP GET `/api/v1/patient/medical-passport`.
    Step 3: Backend queries patient's completed clinical encounters, historical ICD-10 diagnoses, past prescriptions, and lab test trends.
    Step 4: Backend groups health timeline chronologically.
    Step 5: Frontend renders visual timeline displaying clinical diagnoses, vital sign trends (blood pressure, heart rate, BMI), and past medication history.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: EMR compilation response time < 350ms.
15. Data Entities Involved: `appointments`, `medical_records`, `prescriptions`, `medical_documents`.
16. User Interface Controls: Longitudinal timeline, biomarker trend charts, prescription history table.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.15 DOWNLOAD DOCUMENT SOURCE FILE (UC-PAT-15)
================================================================================
1.  Use Case ID:         UC-PAT-15
2.  Use Case Name:       Download Medical Document Source File via Signed URL
3.  Target System:       MediAssist-AI Storage Subsystem
4.  Primary Actor:       Patient, Authorized Doctor
5.  Stakeholders:        Patient, Doctor, Storage Admin
6.  Trigger:             User clicks "Tải Tệp Gốc" on a medical document card.
7.  Pre-conditions:      Document exists in private Supabase S3 bucket.
8.  Post-conditions:     Temporary 15-minute signed HMAC URL generated; browser initiates download.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: User clicks download icon next to medical document.
    Step 2: Frontend calls HTTP GET `/api/v1/documents/{id}/file`.
    Step 3: Backend invokes `PatientAccessGuard.assertCanAccessPatient(actorId, role, patientId, 'DOWNLOAD_FILE')`.
    Step 4: Backend retrieves `storage_path` from `medical_documents`.
    Step 5: Backend calls Supabase S3 client `createSignedUrl(storagePath, 900)` (TTL = 15 minutes / 900 seconds).
    Step 6: Backend returns HTTP 200 OK with `{"download_url": signedUrl}`.
    Step 7: Frontend triggers automatic browser download or opens secure image viewer.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Unauthorized Access:
      1. Actor is neither the document owner nor an assigned attending physician with active appointment.
      2. `PatientAccessGuard` rejects request with HTTP 403 Forbidden.
13. Business Rules:
    - BR-15: Direct public links to medical files are strictly prohibited.
14. Non-Functional Requirements:
    - NFR-SEC: Signed URL TTL strictly capped at 900 seconds (`APP_STORAGE_SIGNED_URL_TTL_SECONDS`).
15. Data Entities Involved: `medical_documents`, `audit_logs`.
16. User Interface Controls: Download button, progress spinner.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.16 SUBMIT DOCTOR REVIEW AND RATING (UC-PAT-16)
================================================================================
1.  Use Case ID:         UC-PAT-16
2.  Use Case Name:       Submit Doctor Review and Rating
3.  Target System:       MediAssist-AI Feedback & Reputation Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient, Doctor, Quality Review Board
6.  Trigger:             Patient completes an in-clinic consultation and submits review.
7.  Pre-conditions:      
    - Appointment is in `COMPLETED` status.
    - Patient has not previously reviewed this specific appointment.
8.  Post-conditions:     
    - Review record is saved in `reviews` table.
    - Doctor's aggregated `rating_avg` and `review_count` in `doctor_profiles` are re-calculated.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Patient receives post-consultation prompt on dashboard: "Đánh giá buổi khám cùng Bác sĩ".
    Step 2: Patient selects star rating (1 to 5 stars) and writes optional qualitative comment.
    Step 3: Frontend calls HTTP POST `/api/v1/reviews` with appointment ID, rating, and comment.
    Step 4: Backend verifies appointment is `COMPLETED` and belongs to this patient.
    Step 5: Backend checks unique constraint: 1 review per appointment.
    Step 6: Backend saves review in `reviews` table.
    Step 7: Backend recomputes doctor's average rating and updates `doctor_profiles.rating_avg`.
    Step 8: Backend returns HTTP 201 Created. Frontend renders thank-you confirmation.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-23: Only patients with verified `COMPLETED` appointments can submit reviews (prevents fake reviews).
14. Non-Functional Requirements:
    - NFR-PERF: Rating recalculation executes within transaction in < 50ms.
15. Data Entities Involved: `reviews`, `appointments`, `doctor_profiles`.
16. User Interface Controls: Interactive 5-star rating widget, text area, submit button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.17 VIEW SYSTEM NOTIFICATIONS (UC-PAT-17)
================================================================================
1.  Use Case ID:         UC-PAT-17
2.  Use Case Name:       View System Notifications & Email Alerts
3.  Target System:       MediAssist-AI Notification Subsystem
4.  Primary Actor:       Patient
5.  Stakeholders:        Patient
6.  Trigger:             Patient clicks notification bell icon in top navigation header.
7.  Pre-conditions:      Patient is authenticated.
8.  Post-conditions:     Notification dropdown renders unread alerts; clicked alerts marked read.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Patient observes red badge on bell icon indicating unread notifications.
    Step 2: Patient clicks bell icon.
    Step 3: Frontend calls HTTP GET `/api/v1/notifications/unread`.
    Step 4: Backend returns list of notifications (appointment confirmations, reminders, lab analysis ready).
    Step 5: Patient clicks an alert -> Frontend marks alert as read via HTTP PUT `/api/v1/notifications/{id}/read`.
    Step 6: User is routed directly to the relevant target screen (ticket, document, or review).
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Unread count query cached in Redis; response < 20ms.
15. Data Entities Involved: `notifications`.
16. User Interface Controls: Notification bell icon with numeric badge, notification dropdown drawer.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.2.18 DE-IDENTIFY PII IN CLINICAL TEXT (UC-PAT-18)
================================================================================
1.  Use Case ID:         UC-PAT-18
2.  Use Case Name:       De-identify PII in Clinical Text
3.  Target System:       MediAssist-AI Privacy & Anonymization Engine
4.  Primary Actor:       Patient (System Pre-processor)
5.  Stakeholders:        Patient, Data Privacy Officer, Regulatory Auditor
6.  Trigger:             Patient enters text containing personal information before AI dispatch.
7.  Pre-conditions:      Raw text payload size <= 20,000 characters.
8.  Post-conditions:     Identified PII entities (names, phone numbers, CCCD) replaced with privacy tokens.
9.  Priority:            High (P1 - Compliance Requirement)
10. Normal Flow:
    Step 1: Patient enters clinical notes or uses public de-identification endpoint `/api/v1/pii/deidentify`.
    Step 2: Backend validates `@Size(max = 20000)` constraint on input DTO (Security Fix BE-12).
    Step 3: Anonymization engine applies regex and named-entity recognition rules for Vietnamese identifiers:
            - Phone numbers: replaced with `[PHONE_REDACTED]`
            - Citizen ID / CCCD (12 digits): replaced with `[CCCD_REDACTED]`
            - Personal Email addresses: replaced with `[EMAIL_REDACTED]`
            - Patient Names preceded by "bệnh nhân", "tôi tên là": replaced with `[PATIENT_NAME]`
    Step 4: Backend returns sanitized text string and list of redacted entity types.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Payload exceeds 20,000 characters:
      1. Backend rejects request with HTTP 400 Bad Request to prevent ReDoS / CPU exhaustion.
13. Business Rules:
    - BR-24: Compliance with Vietnam Decree 13/2023/NĐ-CP (PDPD) and HIPAA Safe Harbor method.
14. Non-Functional Requirements:
    - NFR-PERF: 20k character de-identification completes in < 30ms.
15. Data Entities Involved: None (in-memory stream filter).
16. User Interface Controls: Privacy badge, toggle "Bảo vệ thông tin cá nhân (Ẩn PII)".
17. Open Issues: None.
================================================================================
```
"""

if __name__ == "__main__":
    print("Part 2 module loaded successfully. Character count:", len(get_content()))
