# -*- coding: utf-8 -*-
"""
Part 3: 2.3.3 Doctor Use Case Specifications (UC-DOC-01 to UC-DOC-14)
and 2.3.4 Admin Use Case Specifications (UC-ADM-01 to UC-ADM-11).
Exhaustive 17-field tabular specifications.
Derived 100% from actual MediAssist-AI codebase.
"""

def get_content():
    return """
#### 2.3.3 Doctor (Clinical Workstation)

##### 2.3.3.1 View Doctor Workstation Dashboard & Stats (UC-DOC-01)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-01` |
| **Use Case Name** | View Doctor Workstation Dashboard & Stats |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Doctor Workstation Subsystem — Workstation rendered with queue metrics and active patient list. |
| **Trigger** | Doctor opens Doctor Dashboard (`/doctor`). |
| **Pre-conditions** | Doctor is authenticated and profile is verified (`is_verified = true`). |
| **Post-conditions** | Workstation rendered with queue metrics and active patient list. |
| **Normal Flow** | Step 1: Doctor navigates to `/doctor`.<br>Step 2: Frontend calls HTTP GET `/api/v1/doctors/me/stats`.<br>Step 3: Backend queries `appointments` table for `doctor_id = currentUserId` on current date.<br>Step 4: Backend aggregates:<br>- `todayPatients`: Total patients scheduled today.<br>- `completedToday`: Consultations finished.<br>- `inProgressCount`: Currently active consultation.<br>- `pendingCount`: Patients remaining in queue.<br>Step 5: Backend returns `DoctorStatsDto`.<br>Step 6: Frontend renders workstation summary cards and today's sequential patient queue. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P0) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-13: Only verified doctors can access the clinical workstation. |
| **Data Entities Involved** | `appointments`, `doctor_profiles`. |
| **User Interface Controls** | KPI cards, queue progress bar, active patient panel. |


##### 2.3.3.2 Configure Doctor Schedule Slots (UC-DOC-02)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-02` |
| **Use Case Name** | Configure Doctor Schedule Slots |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Scheduling Subsystem — `doctor_schedule_slots` records persisted for days of the week. |
| **Trigger** | Doctor updates weekly shifts on `/doctor/profile`. |
| **Pre-conditions** | Doctor is authenticated. |
| **Post-conditions** | `doctor_schedule_slots` records persisted for days of the week. |
| **Normal Flow** | Step 1: Doctor navigates to Schedule tab on `/doctor/profile`.<br>Step 2: Frontend calls HTTP GET `/api/v1/doctors/me/schedules`.<br>Step 3: Backend returns existing `doctor_schedule_slots` records.<br>Step 4: Doctor configures operational time windows (Monday through Saturday, 08:00–12:00 and 13:30–17:00).<br>Step 5: Frontend sends HTTP PUT `/api/v1/doctors/me/schedules` with `UpdateDoctorScheduleRequest`.<br>Step 6: Backend validates shifts fall within hospital working hours (Sunday blocked).<br>Step 7: Backend updates `doctor_schedule_slots` table within a transaction.<br>Step 8: Backend invalidates doctor slot cache in Redis.<br>Step 9: Frontend displays toast: "Lịch khám đã được cập nhật thành công." |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Invalid Slot Window:<br>1. Doctor attempts to configure Sunday or hours outside 08:00–17:00.<br>2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_TIME", ...)`. |
| **Priority** | High (P0) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-17: Clinic operating hours: Monday–Saturday, 08:00–12:00 and 13:30–17:00. |
| **Data Entities Involved** | `doctor_schedule_slots`, `doctor_profiles`. |
| **User Interface Controls** | Weekly schedule matrix, time pickers, save button. |


##### 2.3.3.3 View Daily Patient Queue & Call Next Patient (UC-DOC-03)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-03` |
| **Use Case Name** | View Daily Patient Queue & Call Next Patient |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Doctor Workstation Subsystem — - Next waiting patient in queue selected by sequential STT.<br>- `appointments.status` transitions from `SCHEDULED` to `IN_PROGRESS`.<br>- Active clinical encounter opened on doctor workstation. |
| **Trigger** | Doctor clicks "Gọi Bệnh Nhân Tiếp Theo" on workstation. |
| **Pre-conditions** | There are waiting patients scheduled today. |
| **Post-conditions** | - Next waiting patient in queue selected by sequential STT.<br>- `appointments.status` transitions from `SCHEDULED` to `IN_PROGRESS`.<br>- Active clinical encounter opened on doctor workstation. |
| **Normal Flow** | Step 1: Doctor inspects today's patient queue on `/doctor`.<br>Step 2: Doctor clicks "Gọi Khám Tiếp" (`POST /api/v1/doctors/me/call-next`).<br>Step 3: Backend locates next appointment for this doctor today where `status IN ('SCHEDULED')` ordered by `queue_number ASC`.<br>Step 4: If previous appointment was `IN_PROGRESS`, backend marks it completed or requires finalization.<br>Step 5: Backend updates target appointment `status = IN_PROGRESS`.<br>Step 6: Backend logs call event in application log.<br>Step 7: Backend returns `AppointmentDto` with patient details, STT, and attached document ID.<br>Step 8: Frontend opens Split-Screen Clinical Encounter Modal with patient's case loaded. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Queue Empty:<br>1. No patients waiting in queue today.<br>2. Backend throws `AppException(HttpStatus.NOT_FOUND, "QUEUE_EMPTY", "Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay.")`.<br>3. Frontend displays: "Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay." |
| **Priority** | High (P0) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-20: Queue strictly follows sequential STT ordering. |
| **Data Entities Involved** | `appointments`, `users`. |
| **User Interface Controls** | "Gọi Khám Tiếp" button, active queue row highlight. |


##### 2.3.3.4 Pre-Encounter Split-Screen Clinical Inspection (UC-DOC-04)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-04` |
| **Use Case Name** | Pre-Encounter Split-Screen Clinical Inspection |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Doctor Workstation Subsystem — Split-screen view renders raw lab scan alongside AI SBAR synthesis. |
| **Trigger** | Doctor opens patient case in Clinical Encounter Modal. |
| **Pre-conditions** | - Active appointment in `IN_PROGRESS` or `SCHEDULED` status.<br>- Patient attached a lab document (`medical_document_id != null`). |
| **Post-conditions** | Split-screen view renders raw lab scan alongside AI SBAR synthesis. |
| **Normal Flow** | Step 1: Doctor opens active patient encounter modal on `/doctor`.<br>Step 2: Frontend checks if `appointment.medicalDocumentId` exists.<br>Step 3: Frontend calls HTTP GET `/api/v1/documents/{id}/signed-url` to fetch secure S3 view link.<br>Step 4: Frontend calls HTTP GET `/api/v1/documents/{id}/analysis` to fetch structured extraction.<br>Step 5: Frontend renders Split-Screen Workspace:<br>- Left Pane: Embedded PDF / Image viewer rendering original scan (zoom, pan, rotate).<br>- Right Pane: AI Clinical Synthesis Panel:<br>* Chief complaint and triage urgency.<br>* Extracted Biomarkers table with abnormal flags highlighted (`NORMAL`, `ELEVATED`, `LOW`).<br>* Matched LOINC standard terminology.<br>* AI clinical impressions.<br>Step 6: Doctor cross-examines AI findings against original report prior to physical examination. |
| **Alternative Flow** | - Alt Flow 11a: No Document Attached:<br>1. Left pane displays patient's conversational triage history and chief complaint. |
| **Exceptions** | None. |
| **Priority** | High (P0) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-25: Doctor must review clinical evidence before completing encounter. |
| **Data Entities Involved** | `appointments`, `medical_documents`, `document_analyses`. |
| **User Interface Controls** | Split-pane divider, PDF controls, biomarker status pills. |


##### 2.3.3.5 Access Patient Records via PatientAccessGuard (UC-DOC-05)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-05` |
| **Use Case Name** | Access Patient Records via PatientAccessGuard |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Security Subsystem — - Access granted ONLY IF doctor has an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment).<br>- Access event recorded in `audit_logs` (`VIEW_PATIENT_RECORD`). |
| **Trigger** | Doctor accesses patient historical medical documents or appointment history. |
| **Pre-conditions** | Doctor is authenticated. |
| **Post-conditions** | - Access granted ONLY IF doctor has an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment).<br>- Access event recorded in `audit_logs` (`VIEW_PATIENT_RECORD`). |
| **Normal Flow** | Step 1: Doctor navigates to Patient Records (`/doctor/patients`).<br>Step 2: Frontend calls HTTP GET `/api/v1/appointments/patient/{patientId}` or `/api/v1/documents/patient/{patientId}`.<br>Step 3: Backend invokes `PatientAccessGuard.assertCanAccessPatient(doctorId, DOCTOR, patientId, resource)`.<br>Step 4: Guard executes care relationship check:<br>`appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(doctorId, patientId, ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])`.<br>Step 5: Care relationship confirmed (true).<br>Step 6: Guard records security audit entry in `audit_logs`:<br>`recordView(doctorId, DOCTOR, patientId, resource)`.<br>Step 7: Backend queries records and returns patient clinical history.<br>Step 8: Frontend renders patient encounter timeline and past lab reports. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: BOLA/IDOR Violation (No Care Relationship):<br>1. Doctor attempts to access patient with whom they have no appointment.<br>2. Guard check evaluates to false.<br>3. Guard throws `AppException(HttpStatus.FORBIDDEN, "FORBIDDEN_PATIENT_ACCESS", "Bạn không có quyền xem hồ sơ của bệnh nhân này. Chỉ bác sĩ có lịch hẹn điều trị với bệnh nhân mới được truy cập.")`.<br>4. Backend returns HTTP 403 Forbidden. |
| **Priority** | High (P0 - Security Fix) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-26: Doctors cannot access records of patients they do not treat (BOLA/IDOR Defense). |
| **Data Entities Involved** | `appointments`, `medical_documents`, `audit_logs`. |
| **User Interface Controls** | Patient records table, encounter timeline. |


##### 2.3.3.6 Autocomplete Diagnosis with WHO ICD-10 (UC-DOC-06)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-06` |
| **Use Case Name** | Autocomplete Diagnosis with WHO ICD-10 |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Clinical Ontology Subsystem — Standardized ICD-10 code and Vietnamese clinical term selected. |
| **Trigger** | Doctor types diagnosis search query in Clinical Encounter Modal. |
| **Pre-conditions** | Clinical Ontology Service loaded with WHO ICD-10 and MOH Decision 7603/QĐ-BYT. |
| **Post-conditions** | Standardized ICD-10 code and Vietnamese clinical term selected. |
| **Normal Flow** | Step 1: In the Encounter Modal, doctor focuses on "Mã bệnh / Chẩn đoán (ICD-10)".<br>Step 2: Doctor types query (e.g., "tang huyet ap" or "I10").<br>Step 3: Frontend calls HTTP GET `/api/v1/clinical/ontology/icd10?query=tang+huyet+ap&limit=10`.<br>Step 4: Backend `ClinicalOntologyService` searches in-memory index or database for prefix and text matches.<br>Step 5: Backend returns list of `Icd10DiagnosisDto` (code="I10", name="Bệnh tăng huyết áp vô căn (nguyên phát)", chapter="Bệnh hệ tuần hoàn").<br>Step 6: Frontend renders autocomplete dropdown with ICD-10 badges.<br>Step 7: Doctor clicks item; system populates `icd10Code = 'I10'` and `icd10Name`. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P0 - Clinical Standardization) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-27: Finalized clinical encounter must include at least 1 standardized ICD-10 diagnosis. |
| **Data Entities Involved** | `appointments` (icd10_code, icd10_name). |
| **User Interface Controls** | ICD-10 autocomplete input, code pill badges, chapter tag. |


##### 2.3.3.7 Autocomplete Lab Indicators with LOINC (UC-DOC-07)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-07` |
| **Use Case Name** | Autocomplete Lab Indicators with LOINC |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Clinical Ontology Subsystem — Standardized LOINC lab test code and description selected. |
| **Trigger** | Doctor searches lab test indicator in encounter form. |
| **Pre-conditions** | LOINC and MOH Decision 3280/QĐ-BYT loaded in `ClinicalOntologyService`. |
| **Post-conditions** | Standardized LOINC lab test code and description selected. |
| **Normal Flow** | Step 1: Doctor types test name in "Chỉ định cận lâm sàng" (e.g., "glucose", "2345-7").<br>Step 2: Frontend calls HTTP GET `/api/v1/clinical/ontology/lab-indicators?query=glucose&limit=10`.<br>Step 3: Backend returns `List<LabIndicatorDto>` (loincCode, testName, category, referenceRange).<br>Step 4: Doctor selects test item; test code is appended to clinical notes. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | None (in-memory ontology lookup). |
| **User Interface Controls** | LOINC search input, test chip list. |


##### 2.3.3.8 Complete Clinical Encounter & Record EMR (UC-DOC-08)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-08` |
| **Use Case Name** | Complete Clinical Encounter & Record EMR |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Doctor Workstation Subsystem — - `appointments.status` updated to `COMPLETED`.<br>- Vital signs JSON, ICD-10 code/name, prescription JSON, treatment plan, and notes saved directly on `Appointment` entity.<br>- Medical record locked as legally immutable.<br>- Completion email notification dispatched to patient. |
| **Trigger** | Doctor clicks "Hoàn Thành Ca Khám" in Encounter Modal. |
| **Pre-conditions** | - Appointment is in `IN_PROGRESS` status.<br>- Doctor provides vital signs, consultation notes, and ICD-10 diagnosis. |
| **Post-conditions** | - `appointments.status` updated to `COMPLETED`.<br>- Vital signs JSON, ICD-10 code/name, prescription JSON, treatment plan, and notes saved directly on `Appointment` entity.<br>- Medical record locked as legally immutable.<br>- Completion email notification dispatched to patient. |
| **Normal Flow** | Step 1: Doctor fills out Clinical Encounter Form in modal:<br>- Vital Signs: Huyết áp (mmHg), Mạch (bpm), Nhiệt độ (°C), SpO2 (%), Chiều cao (cm), Cân nặng (kg), BMI.<br>- ICD-10 Code & Name (e.g., "I10 - Bệnh tăng huyết áp vô căn").<br>- Consultation Notes & Physical Examination findings.<br>- Prescription JSON (Tên thuốc, số lượng, đơn vị, liều dùng, cách dùng).<br>- Treatment Plan & Patient Instructions.<br>- Follow-up date (optional).<br>Step 2: Doctor clicks "Hoàn Thành Ca Khám".<br>Step 3: Frontend calls HTTP POST `/api/v1/appointments/{id}/complete-clinical` with `ClinicalEncounterRequest`.<br>Step 4: Backend verifies user is the assigned doctor (`FORBIDDEN`).<br>Step 5: Backend checks appointment status is `IN_PROGRESS`.<br>Step 6: Backend updates `Appointment` fields:<br>`appt.setVitalSignsJson(req.getVitalSignsJson())`;<br>`appt.setIcd10Code(req.getIcd10Code())`;<br>`appt.setIcd10Name(req.getIcd10Name())`;<br>`appt.setConsultationNotes(req.getConsultationNotes())`;<br>`appt.setPrescriptionJson(req.getPrescriptionJson())`;<br>`appt.setTreatmentPlan(req.getTreatmentPlan())`;<br>`appt.setFollowUpDate(req.getFollowUpDate())`;<br>`appt.setStatus(AppointmentStatus.COMPLETED)`.<br>Step 7: Backend commits transaction.<br>Step 8: Backend triggers `MeddiesPdfGeneratorService` to generate encounter summary.<br>Step 9: Backend returns HTTP 200 OK with finalized `AppointmentDto`.<br>Step 10: Workstation closes modal and refreshes queue. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Invalid Appointment Status:<br>1. Appointment is not `IN_PROGRESS`.<br>2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION", ...)`. |
| **Priority** | High (P0 - Clinical Closure) |
| **Frequency of Use** | High (Frequent operational use) |
| **Business Rules** | - BR-27: ICD-10 diagnosis mandatory for encounter completion.<br>- BR-29: Finalized encounter records are legally immutable. |
| **Data Entities Involved** | `appointments`, `users`. |
| **User Interface Controls** | Encounter modal, vital sign inputs, ICD-10 selector, prescription table, "Hoàn Thành" CTA. |


##### 2.3.3.9 Schedule In-Clinic Follow-up Visit (UC-DOC-09)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-09` |
| **Use Case Name** | Schedule In-Clinic Follow-up Visit |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Clinical Scheduling Subsystem — New appointment created linked as follow-up visit. |
| **Trigger** | Doctor schedules a follow-up appointment for patient. |
| **Pre-conditions** | Prior appointment exists. |
| **Post-conditions** | New appointment created linked as follow-up visit. |
| **Normal Flow** | Step 1: Doctor selects follow-up date and time slot in encounter form.<br>Step 2: Frontend calls HTTP POST `/api/v1/appointments/follow-up` with `FollowUpAppointmentRequest(appointmentId, scheduledStart, scheduledEnd, chiefComplaint)`.<br>Step 3: Backend verifies slot vacancy and clinic hours.<br>Step 4: Backend creates new `Appointment` record for the patient with assigned doctor.<br>Step 5: Backend returns HTTP 201 Created with new appointment details. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `appointments`. |
| **User Interface Controls** | Follow-up date picker, slot selector, confirm button. |


##### 2.3.3.10 Doctor Cancel Appointment with 100% Refund (UC-DOC-10)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-10` |
| **Use Case Name** | Doctor Cancel Appointment with 100% Refund |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Scheduling Subsystem — - `appointments.status` updated to `CANCELLED`.<br>- 100% full refund automatically issued to patient via `AppointmentRefundService`. |
| **Trigger** | Doctor cancels appointment due to emergency medical duties. |
| **Pre-conditions** | Appointment status is `SCHEDULED`. |
| **Post-conditions** | - `appointments.status` updated to `CANCELLED`.<br>- 100% full refund automatically issued to patient via `AppointmentRefundService`. |
| **Normal Flow** | Step 1: Doctor clicks "Hủy Ca Khám" on queue item and inputs reason.<br>Step 2: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/status` with `{"status": "CANCELLED", "cancellationReason": "..."}`.<br>Step 3: Backend verifies user is the assigned doctor.<br>Step 4: Backend invokes `AppointmentRefundService.processRefund(appointment, DOCTOR)`.<br>Step 5: Refund service unconditionally grants 100% full refund because cancellation is doctor-initiated.<br>Step 6: Backend updates appointment status to `CANCELLED`.<br>Step 7: Backend dispatches apology email to patient with refund statement. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-30: Doctor-initiated cancellations always issue 100% full patient refunds. |
| **Data Entities Involved** | `appointments`, `payment_transactions`, `audit_logs`. |
| **User Interface Controls** | Doctor cancel dialog, reason textarea, confirm button. |


##### 2.3.3.11 View Patient Reviews & Ratings (UC-DOC-11)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-11` |
| **Use Case Name** | View Patient Reviews & Ratings |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Feedback Subsystem — List of patient reviews and rating breakdown rendered. |
| **Trigger** | Doctor navigates to reviews tab on `/doctor/profile`. |
| **Pre-conditions** | Doctor is authenticated. |
| **Post-conditions** | List of patient reviews and rating breakdown rendered. |
| **Normal Flow** | Step 1: Doctor opens reviews section.<br>Step 2: Frontend calls HTTP GET `/api/v1/doctors/{doctorId}/reviews`.<br>Step 3: Backend queries `doctor_reviews` table for `doctor_id = currentUserId` ordered by `created_at DESC`.<br>Step 4: Backend returns `List<DoctorReviewDto>`.<br>Step 5: Frontend renders review cards with star ratings and patient comments. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Low (P3) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `doctor_reviews`. |
| **User Interface Controls** | Rating distribution bar, review cards list. |


##### 2.3.3.12 Update Doctor Profile & Biography (UC-DOC-12)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-12` |
| **Use Case Name** | Update Doctor Profile & Biography |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Doctor Subsystem — - `doctor_profiles` updated.<br>- If bio changed, 1536-d vector embedding re-computed asynchronously. |
| **Trigger** | Doctor updates bio, consultation fee, or clinic room. |
| **Pre-conditions** | Doctor is authenticated. |
| **Post-conditions** | - `doctor_profiles` updated.<br>- If bio changed, 1536-d vector embedding re-computed asynchronously. |
| **Normal Flow** | Step 1: Doctor edits bio, fee, or clinic room on `/doctor/profile`.<br>Step 2: Frontend calls HTTP PUT `/api/v1/doctors/me/profile` with `UpdateDoctorProfileRequest`.<br>Step 3: Backend updates `doctor_profiles` table.<br>Step 4: If bio was modified, backend triggers asynchronous re-embedding via `EmbeddingService`.<br>Step 5: Backend updates `doctor_profiles.bio_embedding`.<br>Step 6: Backend invalidates doctor cache in Redis.<br>Step 7: Frontend displays success notification. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-31: CCHN license number cannot be altered without admin re-vetting. |
| **Data Entities Involved** | `doctor_profiles`. |
| **User Interface Controls** | Bio textarea, fee input, clinic room input, save button. |


##### 2.3.3.13 Export Medical Record & Prescription PDF (UC-DOC-13)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-13` |
| **Use Case Name** | Export Medical Record & Prescription PDF |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor, Patient |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Document Generation Subsystem — Printable PDF file generated via `MeddiesPdfGeneratorService`. |
| **Trigger** | User clicks "In Đơn Thuốc / Bệnh Án" on completed encounter. |
| **Pre-conditions** | Appointment status is `COMPLETED`. |
| **Post-conditions** | Printable PDF file generated via `MeddiesPdfGeneratorService`. |
| **Normal Flow** | Step 1: User clicks print icon on encounter card.<br>Step 2: Backend generates official medical report PDF including hospital header, patient info, vital signs, ICD-10 diagnosis, prescription table, and doctor sign-off.<br>Step 3: Browser opens PDF print preview. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `appointments`, `doctor_profiles`, `users`. |
| **User Interface Controls** | Print / Export PDF button. |


##### 2.3.3.14 Manage Assigned Clinical Specialties (UC-DOC-14)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-DOC-14` |
| **Use Case Name** | Manage Assigned Clinical Specialties |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Doctor, Admin |
| **Secondary Actor** | Clinical Ontology Registry (WHO ICD-10 & LOINC), PDF Scribe |
| **Description** | MediAssist-AI Specialty Subsystem — Association records saved in `doctor_specialties` table (Flyway V1). |
| **Trigger** | Doctor or Admin links secondary medical specialties to doctor profile. |
| **Pre-conditions** | Doctor profile exists. |
| **Post-conditions** | Association records saved in `doctor_specialties` table (Flyway V1). |
| **Normal Flow** | Step 1: Doctor selects additional clinical sub-specialties.<br>Step 2: Backend updates `doctor_specialties` join table.<br>Step 3: Doctor profile reflects multi-specialty clinical scope. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Low (P3) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `doctor_specialties`, `specialties`, `doctor_profiles`. |
| **User Interface Controls** | Specialty multi-select dropdown. |


---

#### 2.3.4 Admin (Governance & AI FinOps)

##### 2.3.4.1 View Executive Statistics & Overview (UC-ADM-01)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-01` |
| **Use Case Name** | View Executive Statistics & Overview |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Admin Subsystem — Executive telemetry and platform metrics displayed. |
| **Trigger** | Admin logs in and accesses `/admin`. |
| **Pre-conditions** | User possesses `ADMIN` role. |
| **Post-conditions** | Executive telemetry and platform metrics displayed. |
| **Normal Flow** | Step 1: Admin navigates to `/admin`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/stats`.<br>Step 3: Backend aggregates metrics from database:<br>- `totalUsers`: Total registered accounts.<br>- `totalDoctors`: Active doctors.<br>- `totalPatients`: Patient accounts.<br>- `totalAppointments`: System-wide consultations.<br>- `totalRevenue`: Gross revenue settled.<br>Step 4: Backend returns `AdminSystemStatsDto`.<br>Step 5: Frontend renders executive dashboard KPI cards and activity trends. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `users`, `appointments`, `doctor_profiles`, `payment_transactions`. |
| **User Interface Controls** | KPI cards, refresh button. |


##### 2.3.4.2 Monitor AI Token Usage & FinOps (UC-ADM-02)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-02` |
| **Use Case Name** | Monitor AI Token Usage & FinOps |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI FinOps Subsystem — Token consumption charts and cost projections displayed. |
| **Trigger** | Admin inspects AI usage on `/admin`. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Token consumption charts and cost projections displayed. |
| **Normal Flow** | Step 1: Admin views AI Usage widget on `/admin`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/ai-usage`.<br>Step 3: Backend queries `ai_token_usage` table (Flyway V1, V12) aggregating prompt/completion tokens:<br>- Gemini 1.5 Flash tokens and cost.<br>- OpenAI text-embedding-3-small tokens and cost.<br>- OpenRouter tokens and cost.<br>- Total cost converted to VNĐ (`AI_COST_VND_PER_USD = 25450`).<br>Step 4: Backend returns `AiUsageStatsDto`.<br>Step 5: Frontend renders token distribution charts and daily cost trends. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `ai_token_usage`. |
| **User Interface Controls** | Token count cards, USD/VND toggle, provider donut chart. |


##### 2.3.4.3 Toggle System-wide AI Provider & Fallback Mode (UC-ADM-03)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-03` |
| **Use Case Name** | Toggle System-wide AI Provider & Fallback Mode |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Inference Routing Subsystem — Runtime AI provider mode updated in Redis and application memory. |
| **Trigger** | Admin switches active AI provider on system console. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Runtime AI provider mode updated in Redis and application memory. |
| **Normal Flow** | Step 1: Frontend calls HTTP GET `/api/v1/system/ai-mode` to check current provider.<br>Step 2: Admin selects target provider mode:<br>- Primary: Google Gemini 1.5 Flash Direct.<br>- Secondary: OpenRouter Free-tier Pool.<br>- Fallback: Local Rule-based Triage & FNV-1a Vector Hashing.<br>Step 3: Frontend calls HTTP POST `/api/v1/system/ai-mode/toggle` (Backend Security Fix BE-1).<br>Step 4: Backend verifies `@PreAuthorize("hasRole('ADMIN')")`.<br>Step 5: Backend updates provider flag in Redis (`system:ai:mode`).<br>Step 6: Backend logs `ADMIN_TOGGLE_AI_MODE` in `audit_logs`.<br>Step 7: Frontend updates active AI mode indicator badge. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Non-Admin Access:<br>1. Backend throws HTTP 403 Forbidden. |
| **Priority** | High (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-33: Only ADMIN role can modify system-wide AI provider configuration. |
| **Data Entities Involved** | `audit_logs`. |
| **User Interface Controls** | AI Mode toggle buttons, active provider badge. |


##### 2.3.4.4 Sync Doctor Vector Embeddings (UC-ADM-04)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-04` |
| **Use Case Name** | Sync Doctor Vector Embeddings |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Vector Subsystem — 1536-d vectors generated for all doctor profiles and HNSW index synced. |
| **Trigger** | Admin clicks "Đồng Bộ Toàn Bộ Vector Bác Sĩ". |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | 1536-d vectors generated for all doctor profiles and HNSW index synced. |
| **Normal Flow** | Step 1: Admin clicks "Sync Vectors" on `/admin/doctors`.<br>Step 2: Frontend calls HTTP POST `/api/v1/admin/doctors/sync-vectors` or `/api/v1/system/ai-mode/sync-vectors`.<br>Step 3: Backend iterates over `doctor_profiles`:<br>- Combines doctor bio, specialty name, and academic title into text string.<br>- Calls `EmbeddingService.generateEmbedding(text)` -> produces 1536-d vector.<br>- Updates `doctor_profiles.bio_embedding`.<br>Step 4: Backend commits updates in batch.<br>Step 5: Backend returns count of synchronized vectors.<br>Step 6: Frontend renders completion toast: "Đã đồng bộ vector thành công cho {count} bác sĩ." |
| **Alternative Flow** | - Alt Flow 11a: Single Doctor Vector Sync:<br>1. Admin calls `POST /api/v1/admin/doctors/{id}/sync-vector` for a specific doctor. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `doctor_profiles`. |
| **User Interface Controls** | "Sync All Vectors" button, single doctor sync icon. |


##### 2.3.4.5 Vet & Approve Doctor CCHN License (UC-ADM-05)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-05` |
| **Use Case Name** | Vet & Approve Doctor CCHN License |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Vetting Subsystem — Doctor verified (`is_verified = true`) and activated for public search. |
| **Trigger** | Admin reviews pending doctor license applications. |
| **Pre-conditions** | Doctor account exists with `is_verified = false`. |
| **Post-conditions** | Doctor verified (`is_verified = true`) and activated for public search. |
| **Normal Flow** | Step 1: Admin navigates to `/admin/doctors`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/doctors/pending`.<br>Step 3: Backend returns doctors with `is_verified = false`.<br>Step 4: Admin inspects CCHN license number, issuing authority, and specialty credentials.<br>Step 5: Admin clicks "Phê Duyệt" (Approve).<br>Step 6: Frontend calls HTTP POST `/api/v1/admin/doctors/{id}/vet` with `VetDoctorRequest(approved=true)`.<br>Step 7: Backend sets `doctor_profiles.is_verified = true`.<br>Step 8: Backend triggers vector embedding generation if missing.<br>Step 9: Backend sends approval email to doctor.<br>Step 10: Frontend removes doctor from pending queue. |
| **Alternative Flow** | - Alt Flow 11a: Reject Application:<br>1. Admin calls vetting endpoint with `approved = false` and rejection reason.<br>2. Backend sends rejection email prompting re-submission. |
| **Exceptions** | None. |
| **Priority** | High (P0 - Legal Compliance) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-13: Unverified doctors are strictly excluded from public search and booking. |
| **Data Entities Involved** | `doctor_profiles`, `audit_logs`. |
| **User Interface Controls** | Pending doctors tab, "Phê Duyệt" button, "Từ Chối" button. |


##### 2.3.4.6 Manage Doctor Directory (UC-ADM-06)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-06` |
| **Use Case Name** | Manage Doctor Directory |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Admin Subsystem — Doctor record in `doctor_profiles` and `users` updated. |
| **Trigger** | Admin creates, edits, or toggles status of a doctor. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Doctor record in `doctor_profiles` and `users` updated. |
| **Normal Flow** | Step 1: Admin navigates to `/admin/doctors`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/doctors/paged?page=0&size=10`.<br>Step 3: Admin clicks "Tạo Bác Sĩ Mới" and inputs Name, Email, License Number, Specialty, Fee, Clinic Room.<br>Step 4: Frontend calls HTTP POST `/api/v1/admin/doctors` with `AdminCreateDoctorRequest`.<br>Step 5: Backend creates `User` (role=`DOCTOR`) and `DoctorProfile` within a transaction.<br>Step 6: Backend sends welcome email with temporary credentials.<br>Step 7: Admin can also toggle doctor status via `PATCH /api/v1/admin/doctors/{id}/toggle-status`. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Duplicate Email or License:<br>1. Backend throws `AppException(HttpStatus.CONFLICT, "EMAIL_EXISTS", ...)` or `"LICENSE_EXISTS"`. |
| **Priority** | Medium (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `doctor_profiles`, `users`, `specialties`. |
| **User Interface Controls** | Doctor table, Add/Edit modal, toggle status switch. |


##### 2.3.4.7 User Access Control & Account Locking (UC-ADM-07)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-07` |
| **Use Case Name** | User Access Control & Account Locking |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Admin Subsystem — `users.is_active` updated; user sessions invalidated. |
| **Trigger** | Admin searches users on `/admin/users` and modifies account status. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | `users.is_active` updated; user sessions invalidated. |
| **Normal Flow** | Step 1: Admin navigates to `/admin/users`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/users?query=...&page=0&size=20`.<br>Step 3: Admin inspects user details and clicks "Khóa Tài Khoản".<br>Step 4: Admin inputs mandatory lock reason (min 10 characters).<br>Step 5: Frontend calls HTTP PATCH `/api/v1/admin/users/{id}/status` with `UpdateUserStatusRequest(status, reason)`.<br>Step 6: Backend updates `users.is_active = false`.<br>Step 7: Backend logs `ADMIN_LOCK_USER` in `audit_logs`.<br>Step 8: Frontend updates user status badge to `Bị Khóa`. |
| **Alternative Flow** | None. |
| **Exceptions** | - Exc Flow 12a: Lock Reason Too Short:<br>1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_REASON", "Lý do khóa tài khoản bắt buộc tối thiểu 10 ký tự")`. |
| **Priority** | High (P1) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-32: Locking an account immediately terminates active web and mobile sessions. |
| **Data Entities Involved** | `users`, `audit_logs`. |
| **User Interface Controls** | User table, role filter, lock modal with reason textarea. |


##### 2.3.4.8 Manage Clinical Specialties & Taxonomy (UC-ADM-08)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-08` |
| **Use Case Name** | Manage Clinical Specialties & Taxonomy |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Clinical Subsystem — Specialty record created in `specialties` table. |
| **Trigger** | Admin creates specialty on `/admin/specialties`. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Specialty record created in `specialties` table. |
| **Normal Flow** | Step 1: Admin navigates to `/admin/specialties`.<br>Step 2: Admin clicks "Thêm Chuyên Khoa Mới".<br>Step 3: Admin enters Name (e.g., "Tim Mạch Can Thiệp"), Code (`CARDIO`), Description, and Icon Name.<br>Step 4: Frontend calls HTTP POST `/api/v1/admin/specialties` with `CreateSpecialtyRequest`.<br>Step 5: Backend verifies code uniqueness (`SPECIALTY_SLUG_EXISTS`).<br>Step 6: Backend saves record in `specialties`.<br>Step 7: Backend refreshes specialty cache in Redis.<br>Step 8: Frontend updates specialties list. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `specialties`. |
| **User Interface Controls** | Specialty table, Add modal, icon picker. |


##### 2.3.4.9 Supervise Appointments & Force Cancel (UC-ADM-09)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-09` |
| **Use Case Name** | Supervise Appointments & Force Cancel |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Supervision Subsystem — Appointment details audited; force-cancel override executed if needed. |
| **Trigger** | Admin inspects appointments on `/admin/appointments`. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Appointment details audited; force-cancel override executed if needed. |
| **Normal Flow** | Step 1: Admin navigates to `/admin/appointments`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/appointments`.<br>Step 3: Backend returns system-wide appointments list with status filters.<br>Step 4: In case of dispute, Admin clicks "Hủy Bắt Buộc & Hoàn Tiền".<br>Step 5: Admin enters cancellation reason (min 10 characters).<br>Step 6: Frontend calls HTTP PATCH `/api/v1/admin/appointments/{id}/cancel` with reason.<br>Step 7: Backend invokes `AppointmentRefundService` and updates status to `CANCELLED`.<br>Step 8: Backend logs administrative override in `audit_logs`.<br>Step 9: Frontend updates appointment status badge. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Medium (P2) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `appointments`, `payment_transactions`, `audit_logs`. |
| **User Interface Controls** | Supervision table, force-cancel button, reason dialog. |


##### 2.3.4.10 Supervise AI Triage Sessions (UC-ADM-10)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-10` |
| **Use Case Name** | Supervise AI Triage Sessions |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Supervision Subsystem — Anonymized triage session logs and SBAR summaries rendered. |
| **Trigger** | Admin navigates to `/admin/triage`. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Anonymized triage session logs and SBAR summaries rendered. |
| **Normal Flow** | Step 1: Admin accesses `/admin/triage`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/triage-sessions`.<br>Step 3: Backend queries `triage_sessions` table (Flyway V1, V15).<br>Step 4: Backend returns list of `AdminTriageSessionDto` (chiefComplaint, sbarSummary, urgencyLevel, recommendedSpecialty, redFlagsDetected, createdAt).<br>Step 5: Frontend renders triage supervision table showing urgency level breakdown and SBAR details. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | Low (P3) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | None. |
| **Data Entities Involved** | `triage_sessions`. |
| **User Interface Controls** | Triage session table, SBAR inspector modal, urgency filters. |


##### 2.3.4.11 View Security Audit Logs & IDOR Records (UC-ADM-11)

| Attribute | Specification Details |
| :--- | :--- |
| **Use Case ID** | `UC-ADM-11` |
| **Use Case Name** | View Security Audit Logs & IDOR Records |
| **Created By** | SE-AI Capstone Team |
| **Created Date** | 15/02/2026 |
| **Primary Actor** | Admin |
| **Secondary Actor** | PostgreSQL Audit Subsystem, Redis Telemetry Aggregator |
| **Description** | MediAssist-AI Audit Subsystem — Immutable audit trail records rendered. |
| **Trigger** | Admin accesses `/admin/audit-logs`. |
| **Pre-conditions** | Admin is authenticated. |
| **Post-conditions** | Immutable audit trail records rendered. |
| **Normal Flow** | Step 1: Admin navigates to `/admin/audit-logs`.<br>Step 2: Frontend calls HTTP GET `/api/v1/admin/audit-logs`.<br>Step 3: Backend queries `audit_logs` table (Flyway V1) ordered by `created_at DESC`.<br>Step 4: Admin filters by action:<br>- `VIEW_PATIENT_RECORD` (Doctor patient record inspection under `PatientAccessGuard`).<br>- `USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_RESET`.<br>- `ADMIN_LOCK_USER`, `ADMIN_TOGGLE_AI_MODE`, `FORCE_CANCEL_APPOINTMENT`.<br>Step 5: Backend returns list of `AuditLogDto` (action, entityType, entityId, userId, ipAddress, detailsJson, createdAt).<br>Step 6: Frontend renders audit table with expandable JSON details. |
| **Alternative Flow** | None. |
| **Exceptions** | None. |
| **Priority** | High (P1 - Compliance) |
| **Frequency of Use** | Medium (Periodic / Administrative) |
| **Business Rules** | - BR-34: Audit logs are append-only and strictly immutable. Deletions/updates blocked. |
| **Data Entities Involved** | `audit_logs`. |
| **User Interface Controls** | Audit data table, action filter dropdown, JSON inspector. |

"""

if __name__ == "__main__":
    print("Part 3 module loaded successfully. Character count:", len(get_content()))
