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

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.1 VIEW WORKSTATION & STATS (UC-DOC-01)
================================================================================
1.  Use Case ID:         UC-DOC-01
2.  Use Case Name:       View Doctor Workstation Dashboard & Stats
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Hospital Clinic Director
6.  Trigger:             Doctor opens Doctor Dashboard (`/doctor`).
7.  Pre-conditions:      Doctor is authenticated and profile is verified (`is_verified = true`).
8.  Post-conditions:     Workstation rendered with queue metrics and active patient list.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor navigates to `/doctor`.
    Step 2: Frontend calls HTTP GET `/api/v1/doctors/me/stats`.
    Step 3: Backend queries `appointments` table for `doctor_id = currentUserId` on current date.
    Step 4: Backend aggregates:
            - `todayPatients`: Total patients scheduled today.
            - `completedToday`: Consultations finished.
            - `inProgressCount`: Currently active consultation.
            - `pendingCount`: Patients remaining in queue.
    Step 5: Backend returns `DoctorStatsDto`.
    Step 6: Frontend renders workstation summary cards and today's sequential patient queue.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-13: Only verified doctors can access the clinical workstation.
14. Non-Functional Requirements:
    - NFR-PERF: Workstation metrics load latency < 120ms.
15. Data Entities Involved: `appointments`, `doctor_profiles`.
16. User Interface Controls: KPI cards, queue progress bar, active patient panel.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.2 CONFIGURE SCHEDULE SLOTS (UC-DOC-02)
================================================================================
1.  Use Case ID:         UC-DOC-02
2.  Use Case Name:       Configure Doctor Schedule Slots
3.  Target System:       MediAssist-AI Scheduling Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patients
6.  Trigger:             Doctor updates weekly shifts on `/doctor/profile`.
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:     `doctor_schedule_slots` records persisted for days of the week.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor navigates to Schedule tab on `/doctor/profile`.
    Step 2: Frontend calls HTTP GET `/api/v1/doctors/me/schedules`.
    Step 3: Backend returns existing `doctor_schedule_slots` records.
    Step 4: Doctor configures operational time windows (Monday through Saturday, 08:00–12:00 and 13:30–17:00).
    Step 5: Frontend sends HTTP PUT `/api/v1/doctors/me/schedules` with `UpdateDoctorScheduleRequest`.
    Step 6: Backend validates shifts fall within hospital working hours (Sunday blocked).
    Step 7: Backend updates `doctor_schedule_slots` table within a transaction.
    Step 8: Backend invalidates doctor slot cache in Redis.
    Step 9: Frontend displays toast: "Lịch khám đã được cập nhật thành công."
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Invalid Slot Window:
      1. Doctor attempts to configure Sunday or hours outside 08:00–17:00.
      2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_SLOT_TIME", ...)`.
13. Business Rules:
    - BR-17: Clinic operating hours: Monday–Saturday, 08:00–12:00 and 13:30–17:00.
14. Non-Functional Requirements:
    - NFR-PERF: Schedule update completes in < 100ms.
15. Data Entities Involved: `doctor_schedule_slots`, `doctor_profiles`.
16. User Interface Controls: Weekly schedule matrix, time pickers, save button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.3 DAILY QUEUE & CALL NEXT (UC-DOC-03)
================================================================================
1.  Use Case ID:         UC-DOC-03
2.  Use Case Name:       View Daily Patient Queue & Call Next Patient
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patients, Clinic Nurse
6.  Trigger:             Doctor clicks "Gọi Bệnh Nhân Tiếp Theo" on workstation.
7.  Pre-conditions:      There are waiting patients scheduled today.
8.  Post-conditions:
    - Next waiting patient in queue selected by sequential STT.
    - `appointments.status` transitions from `SCHEDULED` to `IN_PROGRESS`.
    - Active clinical encounter opened on doctor workstation.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor inspects today's patient queue on `/doctor`.
    Step 2: Doctor clicks "Gọi Khám Tiếp" (`POST /api/v1/doctors/me/call-next`).
    Step 3: Backend locates next appointment for this doctor today where `status IN ('SCHEDULED')` ordered by `queue_number ASC`.
    Step 4: If previous appointment was `IN_PROGRESS`, backend marks it completed or requires finalization.
    Step 5: Backend updates target appointment `status = IN_PROGRESS`.
    Step 6: Backend logs call event in application log.
    Step 7: Backend returns `AppointmentDto` with patient details, STT, and attached document ID.
    Step 8: Frontend opens Split-Screen Clinical Encounter Modal with patient's case loaded.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Queue Empty:
      1. No patients waiting in queue today.
      2. Backend throws `AppException(HttpStatus.NOT_FOUND, "QUEUE_EMPTY", "Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay.")`.
      3. Frontend displays: "Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay."
13. Business Rules:
    - BR-20: Queue strictly follows sequential STT ordering.
14. Non-Functional Requirements:
    - NFR-PERF: Call-next transition latency < 100ms.
15. Data Entities Involved: `appointments`, `users`.
16. User Interface Controls: "Gọi Khám Tiếp" button, active queue row highlight.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.4 SPLIT-SCREEN PRE-CHECK (UC-DOC-04)
================================================================================
1.  Use Case ID:         UC-DOC-04
2.  Use Case Name:       Pre-Encounter Split-Screen Clinical Inspection
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient Safety Officer
6.  Trigger:             Doctor opens patient case in Clinical Encounter Modal.
7.  Pre-conditions:
    - Active appointment in `IN_PROGRESS` or `SCHEDULED` status.
    - Patient attached a lab document (`medical_document_id != null`).
8.  Post-conditions:     Split-screen view renders raw lab scan alongside AI SBAR synthesis.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor opens active patient encounter modal on `/doctor`.
    Step 2: Frontend checks if `appointment.medicalDocumentId` exists.
    Step 3: Frontend calls HTTP GET `/api/v1/documents/{id}/signed-url` to fetch secure S3 view link.
    Step 4: Frontend calls HTTP GET `/api/v1/documents/{id}/analysis` to fetch structured extraction.
    Step 5: Frontend renders Split-Screen Workspace:
            - Left Pane: Embedded PDF / Image viewer rendering original scan (zoom, pan, rotate).
            - Right Pane: AI Clinical Synthesis Panel:
              * Chief complaint and triage urgency.
              * Extracted Biomarkers table with abnormal flags highlighted (`NORMAL`, `ELEVATED`, `LOW`).
              * Matched LOINC standard terminology.
              * AI clinical impressions.
    Step 6: Doctor cross-examines AI findings against original report prior to physical examination.
11. Alternative Flows:
    - Alt Flow 11a: No Document Attached:
      1. Left pane displays patient's conversational triage history and chief complaint.
12. Exception Flows: None.
13. Business Rules:
    - BR-25: Doctor must review clinical evidence before completing encounter.
14. Non-Functional Requirements:
    - NFR-USA: Split-screen optimized for desktop viewports (>= 1280px).
15. Data Entities Involved: `appointments`, `medical_documents`, `document_analyses`.
16. User Interface Controls: Split-pane divider, PDF controls, biomarker status pills.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.5 GUARDED PATIENT RECORD ACCESS (UC-DOC-05)
================================================================================
1.  Use Case ID:         UC-DOC-05
2.  Use Case Name:       Access Patient Records via PatientAccessGuard
3.  Target System:       MediAssist-AI Security Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Data Privacy Officer
6.  Trigger:             Doctor accesses patient historical medical documents or appointment history.
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:
    - Access granted ONLY IF doctor has an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment).
    - Access event recorded in `audit_logs` (`VIEW_PATIENT_RECORD`).
9.  Priority:            High (P0 - Security Fix)
10. Normal Flow:
    Step 1: Doctor navigates to Patient Records (`/doctor/patients`).
    Step 2: Frontend calls HTTP GET `/api/v1/appointments/patient/{patientId}` or `/api/v1/documents/patient/{patientId}`.
    Step 3: Backend invokes `PatientAccessGuard.assertCanAccessPatient(doctorId, DOCTOR, patientId, resource)`.
    Step 4: Guard executes care relationship check:
            `appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(doctorId, patientId, ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])`.
    Step 5: Care relationship confirmed (true).
    Step 6: Guard records security audit entry in `audit_logs`:
            `recordView(doctorId, DOCTOR, patientId, resource)`.
    Step 7: Backend queries records and returns patient clinical history.
    Step 8: Frontend renders patient encounter timeline and past lab reports.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: BOLA/IDOR Violation (No Care Relationship):
      1. Doctor attempts to access patient with whom they have no appointment.
      2. Guard check evaluates to false.
      3. Guard throws `AppException(HttpStatus.FORBIDDEN, "FORBIDDEN_PATIENT_ACCESS", "Bạn không có quyền xem hồ sơ của bệnh nhân này. Chỉ bác sĩ có lịch hẹn điều trị với bệnh nhân mới được truy cập.")`.
      4. Backend returns HTTP 403 Forbidden.
13. Business Rules:
    - BR-26: Doctors cannot access records of patients they do not treat (BOLA/IDOR Defense).
14. Non-Functional Requirements:
    - NFR-SEC: 100% IDOR prevention on all patient clinical endpoints.
15. Data Entities Involved: `appointments`, `medical_documents`, `audit_logs`.
16. User Interface Controls: Patient records table, encounter timeline.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.6 ICD-10 DIAGNOSIS AUTOCOMPLETE (UC-DOC-06)
================================================================================
1.  Use Case ID:         UC-DOC-06
2.  Use Case Name:       Autocomplete Diagnosis with WHO ICD-10
3.  Target System:       MediAssist-AI Clinical Ontology Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Medical Records, BHYT
6.  Trigger:             Doctor types diagnosis search query in Clinical Encounter Modal.
7.  Pre-conditions:      Clinical Ontology Service loaded with WHO ICD-10 and MOH Decision 7603/QĐ-BYT.
8.  Post-conditions:     Standardized ICD-10 code and Vietnamese clinical term selected.
9.  Priority:            High (P0 - Clinical Standardization)
10. Normal Flow:
    Step 1: In the Encounter Modal, doctor focuses on "Mã bệnh / Chẩn đoán (ICD-10)".
    Step 2: Doctor types query (e.g., "tang huyet ap" or "I10").
    Step 3: Frontend calls HTTP GET `/api/v1/clinical/ontology/icd10?query=tang+huyet+ap&limit=10`.
    Step 4: Backend `ClinicalOntologyService` searches in-memory index or database for prefix and text matches.
    Step 5: Backend returns list of `Icd10DiagnosisDto` (code="I10", name="Bệnh tăng huyết áp vô căn (nguyên phát)", chapter="Bệnh hệ tuần hoàn").
    Step 6: Frontend renders autocomplete dropdown with ICD-10 badges.
    Step 7: Doctor clicks item; system populates `icd10Code = 'I10'` and `icd10Name`.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-27: Finalized clinical encounter must include at least 1 standardized ICD-10 diagnosis.
14. Non-Functional Requirements:
    - NFR-PERF: Autocomplete response latency < 30ms.
15. Data Entities Involved: `appointments` (icd10_code, icd10_name).
16. User Interface Controls: ICD-10 autocomplete input, code pill badges, chapter tag.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.7 LOINC LAB AUTOCOMPLETE (UC-DOC-07)
================================================================================
1.  Use Case ID:         UC-DOC-07
2.  Use Case Name:       Autocomplete Lab Indicators with LOINC
3.  Target System:       MediAssist-AI Clinical Ontology Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Hospital Laboratory
6.  Trigger:             Doctor searches lab test indicator in encounter form.
7.  Pre-conditions:      LOINC and MOH Decision 3280/QĐ-BYT loaded in `ClinicalOntologyService`.
8.  Post-conditions:     Standardized LOINC lab test code and description selected.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Doctor types test name in "Chỉ định cận lâm sàng" (e.g., "glucose", "2345-7").
    Step 2: Frontend calls HTTP GET `/api/v1/clinical/ontology/lab-indicators?query=glucose&limit=10`.
    Step 3: Backend returns `List<LabIndicatorDto>` (loincCode, testName, category, referenceRange).
    Step 4: Doctor selects test item; test code is appended to clinical notes.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: LOINC search latency < 30ms.
15. Data Entities Involved: None (in-memory ontology lookup).
16. User Interface Controls: LOINC search input, test chip list.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.8 COMPLETE CLINICAL ENCOUNTER (UC-DOC-08)
================================================================================
1.  Use Case ID:         UC-DOC-08
2.  Use Case Name:       Complete Clinical Encounter & Record EMR
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Medical Records Department
6.  Trigger:             Doctor clicks "Hoàn Thành Ca Khám" in Encounter Modal.
7.  Pre-conditions:
    - Appointment is in `IN_PROGRESS` status.
    - Doctor provides vital signs, consultation notes, and ICD-10 diagnosis.
8.  Post-conditions:
    - `appointments.status` updated to `COMPLETED`.
    - Vital signs JSON, ICD-10 code/name, prescription JSON, treatment plan, and notes saved directly on `Appointment` entity.
    - Medical record locked as legally immutable.
    - Completion email notification dispatched to patient.
9.  Priority:            High (P0 - Clinical Closure)
10. Normal Flow:
    Step 1: Doctor fills out Clinical Encounter Form in modal:
            - Vital Signs: Huyết áp (mmHg), Mạch (bpm), Nhiệt độ (°C), SpO2 (%), Chiều cao (cm), Cân nặng (kg), BMI.
            - ICD-10 Code & Name (e.g., "I10 - Bệnh tăng huyết áp vô căn").
            - Consultation Notes & Physical Examination findings.
            - Prescription JSON (Tên thuốc, số lượng, đơn vị, liều dùng, cách dùng).
            - Treatment Plan & Patient Instructions.
            - Follow-up date (optional).
    Step 2: Doctor clicks "Hoàn Thành Ca Khám".
    Step 3: Frontend calls HTTP POST `/api/v1/appointments/{id}/complete-clinical` with `ClinicalEncounterRequest`.
    Step 4: Backend verifies user is the assigned doctor (`FORBIDDEN`).
    Step 5: Backend checks appointment status is `IN_PROGRESS`.
    Step 6: Backend updates `Appointment` fields:
            `appt.setVitalSignsJson(req.getVitalSignsJson())`;
            `appt.setIcd10Code(req.getIcd10Code())`;
            `appt.setIcd10Name(req.getIcd10Name())`;
            `appt.setConsultationNotes(req.getConsultationNotes())`;
            `appt.setPrescriptionJson(req.getPrescriptionJson())`;
            `appt.setTreatmentPlan(req.getTreatmentPlan())`;
            `appt.setFollowUpDate(req.getFollowUpDate())`;
            `appt.setStatus(AppointmentStatus.COMPLETED)`.
    Step 7: Backend commits transaction.
    Step 8: Backend triggers `MeddiesPdfGeneratorService` to generate encounter summary.
    Step 9: Backend returns HTTP 200 OK with finalized `AppointmentDto`.
    Step 10: Workstation closes modal and refreshes queue.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Invalid Appointment Status:
      1. Appointment is not `IN_PROGRESS`.
      2. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION", ...)`.
13. Business Rules:
    - BR-27: ICD-10 diagnosis mandatory for encounter completion.
    - BR-29: Finalized encounter records are legally immutable.
14. Non-Functional Requirements:
    - NFR-PERF: Encounter completion transaction commits in < 150ms.
15. Data Entities Involved: `appointments`, `users`.
16. User Interface Controls: Encounter modal, vital sign inputs, ICD-10 selector, prescription table, "Hoàn Thành" CTA.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.9 SCHEDULE FOLLOW-UP VISIT (UC-DOC-09)
================================================================================
1.  Use Case ID:         UC-DOC-09
2.  Use Case Name:       Schedule In-Clinic Follow-up Visit
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient
6.  Trigger:             Doctor schedules a follow-up appointment for patient.
7.  Pre-conditions:      Prior appointment exists.
8.  Post-conditions:     New appointment created linked as follow-up visit.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Doctor selects follow-up date and time slot in encounter form.
    Step 2: Frontend calls HTTP POST `/api/v1/appointments/follow-up` with `FollowUpAppointmentRequest(appointmentId, scheduledStart, scheduledEnd, chiefComplaint)`.
    Step 3: Backend verifies slot vacancy and clinic hours.
    Step 4: Backend creates new `Appointment` record for the patient with assigned doctor.
    Step 5: Backend returns HTTP 201 Created with new appointment details.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Follow-up booking commits in < 100ms.
15. Data Entities Involved: `appointments`.
16. User Interface Controls: Follow-up date picker, slot selector, confirm button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.10 DOCTOR CANCEL WITH REFUND (UC-DOC-10)
================================================================================
1.  Use Case ID:         UC-DOC-10
2.  Use Case Name:       Doctor Cancel Appointment with 100% Refund
3.  Target System:       MediAssist-AI Scheduling Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Hospital Admin
6.  Trigger:             Doctor cancels appointment due to emergency medical duties.
7.  Pre-conditions:      Appointment status is `SCHEDULED`.
8.  Post-conditions:
    - `appointments.status` updated to `CANCELLED`.
    - 100% full refund automatically issued to patient via `AppointmentRefundService`.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Doctor clicks "Hủy Ca Khám" on queue item and inputs reason.
    Step 2: Frontend calls HTTP PATCH `/api/v1/appointments/{id}/status` with `{"status": "CANCELLED", "cancellationReason": "..."}`.
    Step 3: Backend verifies user is the assigned doctor.
    Step 4: Backend invokes `AppointmentRefundService.processRefund(appointment, DOCTOR)`.
    Step 5: Refund service unconditionally grants 100% full refund because cancellation is doctor-initiated.
    Step 6: Backend updates appointment status to `CANCELLED`.
    Step 7: Backend dispatches apology email to patient with refund statement.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-30: Doctor-initiated cancellations always issue 100% full patient refunds.
14. Non-Functional Requirements:
    - NFR-SEC: Refund executed atomically within transaction.
15. Data Entities Involved: `appointments`, `payment_transactions`, `audit_logs`.
16. User Interface Controls: Doctor cancel dialog, reason textarea, confirm button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.11 VIEW PATIENT REVIEWS & RATINGS (UC-DOC-11)
================================================================================
1.  Use Case ID:         UC-DOC-11
2.  Use Case Name:       View Patient Reviews & Ratings
3.  Target System:       MediAssist-AI Feedback Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor
6.  Trigger:             Doctor navigates to reviews tab on `/doctor/profile`.
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:     List of patient reviews and rating breakdown rendered.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Doctor opens reviews section.
    Step 2: Frontend calls HTTP GET `/api/v1/doctors/{doctorId}/reviews`.
    Step 3: Backend queries `doctor_reviews` table for `doctor_id = currentUserId` ordered by `created_at DESC`.
    Step 4: Backend returns `List<DoctorReviewDto>`.
    Step 5: Frontend renders review cards with star ratings and patient comments.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Query executed in < 40ms.
15. Data Entities Involved: `doctor_reviews`.
16. User Interface Controls: Rating distribution bar, review cards list.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.12 UPDATE DOCTOR PROFILE & BIO (UC-DOC-12)
================================================================================
1.  Use Case ID:         UC-DOC-12
2.  Use Case Name:       Update Doctor Profile & Biography
3.  Target System:       MediAssist-AI Doctor Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor
6.  Trigger:             Doctor updates bio, consultation fee, or clinic room.
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:
    - `doctor_profiles` updated.
    - If bio changed, 1536-d vector embedding re-computed asynchronously.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Doctor edits bio, fee, or clinic room on `/doctor/profile`.
    Step 2: Frontend calls HTTP PUT `/api/v1/doctors/me/profile` with `UpdateDoctorProfileRequest`.
    Step 3: Backend updates `doctor_profiles` table.
    Step 4: If bio was modified, backend triggers asynchronous re-embedding via `EmbeddingService`.
    Step 5: Backend updates `doctor_profiles.bio_embedding`.
    Step 6: Backend invalidates doctor cache in Redis.
    Step 7: Frontend displays success notification.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-31: CCHN license number cannot be altered without admin re-vetting.
14. Non-Functional Requirements:
    - NFR-PERF: Profile update commits in < 80ms.
15. Data Entities Involved: `doctor_profiles`.
16. User Interface Controls: Bio textarea, fee input, clinic room input, save button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.13 EXPORT MEDICAL RECORD PDF (UC-DOC-13)
================================================================================
1.  Use Case ID:         UC-DOC-13
2.  Use Case Name:       Export Medical Record & Prescription PDF
3.  Target System:       MediAssist-AI Document Generation Subsystem
4.  Primary Actor:       Doctor, Patient
5.  Stakeholders:        Doctor, Patient, Pharmacy
6.  Trigger:             User clicks "In Đơn Thuốc / Bệnh Án" on completed encounter.
7.  Pre-conditions:      Appointment status is `COMPLETED`.
8.  Post-conditions:     Printable PDF file generated via `MeddiesPdfGeneratorService`.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: User clicks print icon on encounter card.
    Step 2: Backend generates official medical report PDF including hospital header, patient info, vital signs, ICD-10 diagnosis, prescription table, and doctor sign-off.
    Step 3: Browser opens PDF print preview.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: PDF byte generation completes in < 350ms.
15. Data Entities Involved: `appointments`, `doctor_profiles`, `users`.
16. User Interface Controls: Print / Export PDF button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.14 MANAGE ASSIGNED SPECIALTIES (UC-DOC-14)
================================================================================
1.  Use Case ID:         UC-DOC-14
2.  Use Case Name:       Manage Assigned Clinical Specialties
3.  Target System:       MediAssist-AI Specialty Subsystem
4.  Primary Actor:       Doctor, Admin
5.  Stakeholders:        Doctor, Hospital Administration
6.  Trigger:             Doctor or Admin links secondary medical specialties to doctor profile.
7.  Pre-conditions:      Doctor profile exists.
8.  Post-conditions:     Association records saved in `doctor_specialties` table (Flyway V1).
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Doctor selects additional clinical sub-specialties.
    Step 2: Backend updates `doctor_specialties` join table.
    Step 3: Doctor profile reflects multi-specialty clinical scope.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Commit in < 50ms.
15. Data Entities Involved: `doctor_specialties`, `specialties`, `doctor_profiles`.
16. User Interface Controls: Specialty multi-select dropdown.
17. Open Issues: None.
================================================================================
```

---

#### 2.3.4 Admin (Governance & AI FinOps)

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.1 EXECUTIVE STATISTICS & OVERVIEW (UC-ADM-01)
================================================================================
1.  Use Case ID:         UC-ADM-01
2.  Use Case Name:       View Executive Statistics & Overview
3.  Target System:       MediAssist-AI Admin Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Hospital Director, Operations Manager
6.  Trigger:             Admin logs in and accesses `/admin`.
7.  Pre-conditions:      User possesses `ADMIN` role.
8.  Post-conditions:     Executive telemetry and platform metrics displayed.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin navigates to `/admin`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/stats`.
    Step 3: Backend aggregates metrics from database:
            - `totalUsers`: Total registered accounts.
            - `totalDoctors`: Active doctors.
            - `totalPatients`: Patient accounts.
            - `totalAppointments`: System-wide consultations.
            - `totalRevenue`: Gross revenue settled.
    Step 4: Backend returns `AdminSystemStatsDto`.
    Step 5: Frontend renders executive dashboard KPI cards and activity trends.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Stats query cached in Redis; response < 100ms.
15. Data Entities Involved: `users`, `appointments`, `doctor_profiles`, `payment_transactions`.
16. User Interface Controls: KPI cards, refresh button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.2 MONITOR AI TOKEN USAGE & FINOPS (UC-ADM-02)
================================================================================
1.  Use Case ID:         UC-ADM-02
2.  Use Case Name:       Monitor AI Token Usage & FinOps
3.  Target System:       MediAssist-AI FinOps Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Financial Controller
6.  Trigger:             Admin inspects AI usage on `/admin`.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Token consumption charts and cost projections displayed.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin views AI Usage widget on `/admin`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/ai-usage`.
    Step 3: Backend queries `ai_token_usage` table (Flyway V1, V12) aggregating prompt/completion tokens:
            - Gemini 1.5 Flash tokens and cost.
            - OpenAI text-embedding-3-small tokens and cost.
            - OpenRouter tokens and cost.
            - Total cost converted to VNĐ (`AI_COST_VND_PER_USD = 25450`).
    Step 4: Backend returns `AiUsageStatsDto`.
    Step 5: Frontend renders token distribution charts and daily cost trends.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: FinOps aggregation completes in < 80ms using indexed date columns.
15. Data Entities Involved: `ai_token_usage`.
16. User Interface Controls: Token count cards, USD/VND toggle, provider donut chart.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.3 TOGGLE AI PROVIDER MODE (UC-ADM-03)
================================================================================
1.  Use Case ID:         UC-ADM-03
2.  Use Case Name:       Toggle System-wide AI Provider & Fallback Mode
3.  Target System:       MediAssist-AI Inference Routing Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Platform Architect
6.  Trigger:             Admin switches active AI provider on system console.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Runtime AI provider mode updated in Redis and application memory.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Frontend calls HTTP GET `/api/v1/system/ai-mode` to check current provider.
    Step 2: Admin selects target provider mode:
            - Primary: Google Gemini 1.5 Flash Direct.
            - Secondary: OpenRouter Free-tier Pool.
            - Fallback: Local Rule-based Triage & FNV-1a Vector Hashing.
    Step 3: Frontend calls HTTP POST `/api/v1/system/ai-mode/toggle` (Backend Security Fix BE-1).
    Step 4: Backend verifies `@PreAuthorize("hasRole('ADMIN')")`.
    Step 5: Backend updates provider flag in Redis (`system:ai:mode`).
    Step 6: Backend logs `ADMIN_TOGGLE_AI_MODE` in `audit_logs`.
    Step 7: Frontend updates active AI mode indicator badge.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Non-Admin Access:
      1. Backend throws HTTP 403 Forbidden.
13. Business Rules:
    - BR-33: Only ADMIN role can modify system-wide AI provider configuration.
14. Non-Functional Requirements:
    - NFR-REL: Failover mode propagates instantly across all worker threads.
15. Data Entities Involved: `audit_logs`.
16. User Interface Controls: AI Mode toggle buttons, active provider badge.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.4 SYNC DOCTOR VECTOR EMBEDDINGS (UC-ADM-04)
================================================================================
1.  Use Case ID:         UC-ADM-04
2.  Use Case Name:       Sync Doctor Vector Embeddings
3.  Target System:       MediAssist-AI Vector Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Search Quality Board
6.  Trigger:             Admin clicks "Đồng Bộ Toàn Bộ Vector Bác Sĩ".
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     1536-d vectors generated for all doctor profiles and HNSW index synced.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Admin clicks "Sync Vectors" on `/admin/doctors`.
    Step 2: Frontend calls HTTP POST `/api/v1/admin/doctors/sync-vectors` or `/api/v1/system/ai-mode/sync-vectors`.
    Step 3: Backend iterates over `doctor_profiles`:
            - Combines doctor bio, specialty name, and academic title into text string.
            - Calls `EmbeddingService.generateEmbedding(text)` -> produces 1536-d vector.
            - Updates `doctor_profiles.bio_embedding`.
    Step 4: Backend commits updates in batch.
    Step 5: Backend returns count of synchronized vectors.
    Step 6: Frontend renders completion toast: "Đã đồng bộ vector thành công cho {count} bác sĩ."
11. Alternative Flows:
    - Alt Flow 11a: Single Doctor Vector Sync:
      1. Admin calls `POST /api/v1/admin/doctors/{id}/sync-vector` for a specific doctor.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Batch sync processes 100 doctors in < 15 seconds.
15. Data Entities Involved: `doctor_profiles`.
16. User Interface Controls: "Sync All Vectors" button, single doctor sync icon.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.5 VET DOCTOR CCHN LICENSE (UC-ADM-05)
================================================================================
1.  Use Case ID:         UC-ADM-05
2.  Use Case Name:       Vet & Approve Doctor CCHN License
3.  Target System:       MediAssist-AI Vetting Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Medical Board, Doctor
6.  Trigger:             Admin reviews pending doctor license applications.
7.  Pre-conditions:      Doctor account exists with `is_verified = false`.
8.  Post-conditions:     Doctor verified (`is_verified = true`) and activated for public search.
9.  Priority:            High (P0 - Legal Compliance)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/doctors`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/doctors/pending`.
    Step 3: Backend returns doctors with `is_verified = false`.
    Step 4: Admin inspects CCHN license number, issuing authority, and specialty credentials.
    Step 5: Admin clicks "Phê Duyệt" (Approve).
    Step 6: Frontend calls HTTP POST `/api/v1/admin/doctors/{id}/vet` with `VetDoctorRequest(approved=true)`.
    Step 7: Backend sets `doctor_profiles.is_verified = true`.
    Step 8: Backend triggers vector embedding generation if missing.
    Step 9: Backend sends approval email to doctor.
    Step 10: Frontend removes doctor from pending queue.
11. Alternative Flows:
    - Alt Flow 11a: Reject Application:
      1. Admin calls vetting endpoint with `approved = false` and rejection reason.
      2. Backend sends rejection email prompting re-submission.
12. Exception Flows: None.
13. Business Rules:
    - BR-13: Unverified doctors are strictly excluded from public search and booking.
14. Non-Functional Requirements:
    - NFR-SEC: Vetting decisions audited with Admin ID and timestamp.
15. Data Entities Involved: `doctor_profiles`, `audit_logs`.
16. User Interface Controls: Pending doctors tab, "Phê Duyệt" button, "Từ Chối" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.6 MANAGE DOCTOR DIRECTORY (UC-ADM-06)
================================================================================
1.  Use Case ID:         UC-ADM-06
2.  Use Case Name:       Manage Doctor Directory
3.  Target System:       MediAssist-AI Admin Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Doctors
6.  Trigger:             Admin creates, edits, or toggles status of a doctor.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Doctor record in `doctor_profiles` and `users` updated.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/doctors`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/doctors/paged?page=0&size=10`.
    Step 3: Admin clicks "Tạo Bác Sĩ Mới" and inputs Name, Email, License Number, Specialty, Fee, Clinic Room.
    Step 4: Frontend calls HTTP POST `/api/v1/admin/doctors` with `AdminCreateDoctorRequest`.
    Step 5: Backend creates `User` (role=`DOCTOR`) and `DoctorProfile` within a transaction.
    Step 6: Backend sends welcome email with temporary credentials.
    Step 7: Admin can also toggle doctor status via `PATCH /api/v1/admin/doctors/{id}/toggle-status`.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Duplicate Email or License:
      1. Backend throws `AppException(HttpStatus.CONFLICT, "EMAIL_EXISTS", ...)` or `"LICENSE_EXISTS"`.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Directory page load < 150ms.
15. Data Entities Involved: `doctor_profiles`, `users`, `specialties`.
16. User Interface Controls: Doctor table, Add/Edit modal, toggle status switch.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.7 USER ACCESS CONTROL (UC-ADM-07)
================================================================================
1.  Use Case ID:         UC-ADM-07
2.  Use Case Name:       User Access Control & Account Locking
3.  Target System:       MediAssist-AI Admin Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Security Compliance
6.  Trigger:             Admin searches users on `/admin/users` and modifies account status.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     `users.is_active` updated; user sessions invalidated.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/users`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/users?query=...&page=0&size=20`.
    Step 3: Admin inspects user details and clicks "Khóa Tài Khoản".
    Step 4: Admin inputs mandatory lock reason (min 10 characters).
    Step 5: Frontend calls HTTP PATCH `/api/v1/admin/users/{id}/status` with `UpdateUserStatusRequest(status, reason)`.
    Step 6: Backend updates `users.is_active = false`.
    Step 7: Backend logs `ADMIN_LOCK_USER` in `audit_logs`.
    Step 8: Frontend updates user status badge to `Bị Khóa`.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Lock Reason Too Short:
      1. Backend throws `AppException(HttpStatus.BAD_REQUEST, "INVALID_REASON", "Lý do khóa tài khoản bắt buộc tối thiểu 10 ký tự")`.
13. Business Rules:
    - BR-32: Locking an account immediately terminates active web and mobile sessions.
14. Non-Functional Requirements:
    - NFR-SEC: Action logged to audit trail.
15. Data Entities Involved: `users`, `audit_logs`.
16. User Interface Controls: User table, role filter, lock modal with reason textarea.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.8 MANAGE CLINICAL SPECIALTIES (UC-ADM-08)
================================================================================
1.  Use Case ID:         UC-ADM-08
2.  Use Case Name:       Manage Clinical Specialties & Taxonomy
3.  Target System:       MediAssist-AI Clinical Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Doctors, Patients
6.  Trigger:             Admin creates specialty on `/admin/specialties`.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Specialty record created in `specialties` table.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/specialties`.
    Step 2: Admin clicks "Thêm Chuyên Khoa Mới".
    Step 3: Admin enters Name (e.g., "Tim Mạch Can Thiệp"), Code (`CARDIO`), Description, and Icon Name.
    Step 4: Frontend calls HTTP POST `/api/v1/admin/specialties` with `CreateSpecialtyRequest`.
    Step 5: Backend verifies code uniqueness (`SPECIALTY_SLUG_EXISTS`).
    Step 6: Backend saves record in `specialties`.
    Step 7: Backend refreshes specialty cache in Redis.
    Step 8: Frontend updates specialties list.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Cache refresh propagated instantly.
15. Data Entities Involved: `specialties`.
16. User Interface Controls: Specialty table, Add modal, icon picker.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.9 SUPERVISE APPOINTMENTS (UC-ADM-09)
================================================================================
1.  Use Case ID:         UC-ADM-09
2.  Use Case Name:       Supervise Appointments & Force Cancel
3.  Target System:       MediAssist-AI Supervision Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Patients, Doctors
6.  Trigger:             Admin inspects appointments on `/admin/appointments`.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Appointment details audited; force-cancel override executed if needed.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/appointments`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/appointments`.
    Step 3: Backend returns system-wide appointments list with status filters.
    Step 4: In case of dispute, Admin clicks "Hủy Bắt Buộc & Hoàn Tiền".
    Step 5: Admin enters cancellation reason (min 10 characters).
    Step 6: Frontend calls HTTP PATCH `/api/v1/admin/appointments/{id}/cancel` with reason.
    Step 7: Backend invokes `AppointmentRefundService` and updates status to `CANCELLED`.
    Step 8: Backend logs administrative override in `audit_logs`.
    Step 9: Frontend updates appointment status badge.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-SEC: All overrides require mandatory explanation logged to audit trail.
15. Data Entities Involved: `appointments`, `payment_transactions`, `audit_logs`.
16. User Interface Controls: Supervision table, force-cancel button, reason dialog.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.10 SUPERVISE AI TRIAGE SESSIONS (UC-ADM-10)
================================================================================
1.  Use Case ID:         UC-ADM-10
2.  Use Case Name:       Supervise AI Triage Sessions
3.  Target System:       MediAssist-AI Supervision Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Medical Quality Committee
6.  Trigger:             Admin navigates to `/admin/triage`.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Anonymized triage session logs and SBAR summaries rendered.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Admin accesses `/admin/triage`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/triage-sessions`.
    Step 3: Backend queries `triage_sessions` table (Flyway V1, V15).
    Step 4: Backend returns list of `AdminTriageSessionDto` (chiefComplaint, sbarSummary, urgencyLevel, recommendedSpecialty, redFlagsDetected, createdAt).
    Step 5: Frontend renders triage supervision table showing urgency level breakdown and SBAR details.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Query executed in < 60ms using index `idx_triage_urgency`.
15. Data Entities Involved: `triage_sessions`.
16. User Interface Controls: Triage session table, SBAR inspector modal, urgency filters.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.11 VIEW SECURITY AUDIT LOGS (UC-ADM-11)
================================================================================
1.  Use Case ID:         UC-ADM-11
2.  Use Case Name:       View Security Audit Logs & IDOR Records
3.  Target System:       MediAssist-AI Audit Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Security Auditor, Data Privacy Officer
6.  Trigger:             Admin accesses `/admin/audit-logs`.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Immutable audit trail records rendered.
9.  Priority:            High (P1 - Compliance)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/audit-logs`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/audit-logs`.
    Step 3: Backend queries `audit_logs` table (Flyway V1) ordered by `created_at DESC`.
    Step 4: Admin filters by action:
            - `VIEW_PATIENT_RECORD` (Doctor patient record inspection under `PatientAccessGuard`).
            - `USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_RESET`.
            - `ADMIN_LOCK_USER`, `ADMIN_TOGGLE_AI_MODE`, `FORCE_CANCEL_APPOINTMENT`.
    Step 5: Backend returns list of `AuditLogDto` (action, entityType, entityId, userId, ipAddress, detailsJson, createdAt).
    Step 6: Frontend renders audit table with expandable JSON details.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-34: Audit logs are append-only and strictly immutable. Deletions/updates blocked.
14. Non-Functional Requirements:
    - NFR-SEC: Audit records retained for minimum 3 years.
15. Data Entities Involved: `audit_logs`.
16. User Interface Controls: Audit data table, action filter dropdown, JSON inspector.
17. Open Issues: None.
================================================================================
"""

if __name__ == "__main__":
    print("Part 3 module loaded successfully. Character count:", len(get_content()))
