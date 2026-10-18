# -*- coding: utf-8 -*-
"""
Part 3: 2.3.3 Doctor Use Case Specifications (UC-DOC-01 to UC-DOC-14)
and 2.3.4 Admin Use Case Specifications (UC-ADM-01 to UC-ADM-10).
Exhaustive 17-field tabular specifications.
"""

def get_content():
    return """
#### 2.3.3 Doctor (Clinical Workstation)

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.1 CONFIGURE WORKING SCHEDULE (UC-DOC-01)
================================================================================
1.  Use Case ID:         UC-DOC-01
2.  Use Case Name:       Configure Working Schedule & Slot Availability
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Hospital Administration, Patients
6.  Trigger:             Doctor accesses Schedule Manager (`/doctor/schedule`) to configure hours.
7.  Pre-conditions:      Doctor is authenticated and profile is verified (`is_verified = true`).
8.  Post-conditions:     
    - Weekly recurring consultation shift templates saved in `doctor_schedules`.
    - Public 30-minute booking slots automatically generated for patient reservation.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor navigates to Schedule Configuration tab on Doctor Workstation.
    Step 2: Doctor selects days of the week (Monday through Saturday) and sets operational shifts:
            - Morning shift: e.g., 08:00 - 11:30 (7 slots of 30 mins).
            - Afternoon shift: e.g., 13:30 - 16:30 (6 slots of 30 mins).
    Step 3: Doctor specifies slot capacity (1 patient per 30-min slot) and consultation fee.
    Step 4: Doctor clicks "Lưu Lịch Làm Việc".
    Step 5: Frontend sends HTTP POST to `/api/v1/doctor/schedules` with shift matrix DTO.
    Step 6: Backend validates schedule complies with clinic operational hours (08:00–17:00, Sundays locked).
    Step 7: Backend writes schedule templates to `doctor_schedules` within a transaction.
    Step 8: Backend invalidates doctor slot cache in Redis (`doctor:slots:{id}:{date}`).
    Step 9: Backend returns HTTP 200 OK. Frontend displays "Lịch làm việc đã được cập nhật thành công."
11. Alternative Flows:
    - Alt Flow 11a: Set Leave / Absence Day:
      1. Doctor selects specific calendar date and marks "Nghỉ phép" (Unavailable).
      2. If date has no existing bookings, slot generation is suppressed.
      3. If date has existing confirmed bookings, system prompts doctor to reschedule or trigger refunds (UC-DOC-11).
12. Exception Flows:
    - Exc Flow 12a: Configuration outside hospital hours:
      1. Doctor attempts to configure shift after 17:00 or on Sunday.
      2. Backend rejects with HTTP 400 Bad Request: "Lịch khám chỉ hoạt động Thứ 2 - Thứ 7, 08:00 - 17:00."
13. Business Rules:
    - BR-17: Clinic operating hours: Monday–Saturday, 08:00–12:00 & 13:30–17:00.
14. Non-Functional Requirements:
    - NFR-PERF: Slot generation takes < 100ms for 30-day forward window.
15. Data Entities Involved: `doctor_schedules`, `doctor_profiles`.
16. User Interface Controls: Weekly schedule grid, shift toggles, time pickers, save button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.2 VIEW DAILY PATIENT QUEUE (UC-DOC-02)
================================================================================
1.  Use Case ID:         UC-DOC-02
2.  Use Case Name:       View Doctor Daily Patient Queue (Sequential STT)
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Clinic Nurse, Patients
6.  Trigger:             Doctor opens workstation home page on consultation day.
7.  Pre-conditions:      Doctor is logged in.
8.  Post-conditions:     Sequential queue of patients for current date is rendered in order of STT numbers.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor accesses Doctor Dashboard (`/doctor/dashboard`).
    Step 2: Frontend calls HTTP GET `/api/v1/doctor/appointments/today`.
    Step 3: Backend queries `appointments` for `doctor_id = currentUserId` and `appointment_date = CURRENT_DATE`.
    Step 4: Query sorts records by `queue_number ASC` (STT 01, STT 02, STT 03...).
    Step 5: Backend returns queue list containing:
            - STT number, Patient Full Name, Age, Gender.
            - Appointment slot window (e.g., 09:00 - 09:30).
            - Chief Complaint and Triage Urgency badge (`ROUTINE`, `URGENT`).
            - Status badge (`CONFIRMED`, `IN_PROGRESS`, `COMPLETED`).
            - Document attachment indicator (if patient uploaded lab results).
    Step 6: Frontend displays queue sidebar with currently active patient highlighted.
    Step 7: Doctor clicks "Tiếp Nhận Khám" on STT 01 -> transitions status to `IN_PROGRESS`.
11. Alternative Flows:
    - Alt Flow 11a: Patient No-Show:
      1. Doctor marks patient as `NO_SHOW` if patient fails to arrive after 20 minutes.
      2. System advances queue pointer to next STT.
12. Exception Flows: None.
13. Business Rules:
    - BR-20: Queue strictly follows sequential STT ordering.
14. Non-Functional Requirements:
    - NFR-PERF: Queue refresh latency < 80ms.
15. Data Entities Involved: `appointments`, `users`, `medical_documents`.
16. User Interface Controls: Queue sidebar, STT badges, "Tiếp Nhận Khám" button, "Hoàn Thành" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.3 PRE-ENCOUNTER CLINICAL INSPECTION (UC-DOC-03)
================================================================================
1.  Use Case ID:         UC-DOC-03
2.  Use Case Name:       Pre-Encounter Clinical Inspection (Split-Screen Raw vs AI)
3.  Target System:       MediAssist-AI Doctor Clinical Workstation
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient Safety Officer
6.  Trigger:             Doctor selects a patient from the queue prior to calling them into the exam room.
7.  Pre-conditions:      
    - Appointment is in `CONFIRMED` or `IN_PROGRESS` status.
    - Patient uploaded a lab report (`medical_document_id != null`).
8.  Post-conditions:     
    - Doctor workstation renders split-screen clinical inspection workspace.
    - Doctor reviews AI SBAR synthesis alongside high-resolution original lab scan.
9.  Priority:            High (P0 - Key Clinical Feature)
10. Normal Flow:
    Step 1: Doctor selects patient row in workstation.
    Step 2: Frontend calls HTTP GET `/api/v1/doctor/encounters/pre-check/{appointmentId}`.
    Step 3: Backend verifies care relationship via `PatientAccessGuard`.
    Step 4: Backend issues 15-minute signed URL for original lab image/PDF.
    Step 5: Backend returns AI SBAR summary, extracted biomarker table, and symptom history.
    Step 6: Frontend renders responsive Split-Screen Workspace:
            - Left Pane: High-resolution PDF/Image document viewer with zoom, pan, and rotation tools.
            - Right Pane: AI Clinical Synthesis Panel:
              * Chief complaint and symptom duration.
              * Table of extracted biomarkers with abnormal flags highlighted in red (`ELEVATED`) or blue (`LOW`).
              * Matched LOINC standard terminology.
              * AI clinical impressions and potential differential diagnoses.
    Step 7: Attending doctor cross-examines AI extraction against original scan to verify accuracy before physical consultation.
11. Alternative Flows:
    - Alt Flow 11a: Appointment has no attached document:
      1. Left pane displays patient's conversational triage history and chief complaint text.
12. Exception Flows: None.
13. Business Rules:
    - BR-25: Doctor must review clinical evidence before completing encounter.
14. Non-Functional Requirements:
    - NFR-USA: Split-screen interface optimized for desktop monitors (>= 1280px width).
15. Data Entities Involved: `appointments`, `medical_documents`, `triage_sessions`.
16. User Interface Controls: Split-pane slider, PDF controls (zoom, page switch), biomarker table.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.4 GUARDED PATIENT RECORD ACCESS (UC-DOC-04)
================================================================================
1.  Use Case ID:         UC-DOC-04
2.  Use Case Name:       Access Patient Historical Medical Records via Guard
3.  Target System:       MediAssist-AI Security & IDOR Defense Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Data Protection Officer
6.  Trigger:             Doctor attempts to view a patient's historical medical records or past documents.
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:     
    - Access granted ONLY IF doctor has an active care relationship (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED` appointment).
    - Access event is recorded in `audit_logs` (`VIEW_PATIENT_RECORD`).
9.  Priority:            High (P0 - Security Audit Fix)
10. Normal Flow:
    Step 1: Doctor clicks "Xem Lịch Sử Bệnh Án" for patient ID on clinical workstation.
    Step 2: Frontend requests HTTP GET `/api/v1/documents/patient/{patientId}`.
    Step 3: Backend passes request to `PatientAccessGuard.assertCanAccessPatient(doctorId, DOCTOR, patientId, 'PATIENT_DOCUMENTS')`.
    Step 4: Guard checks database for active care relationship:
            `appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(doctorId, patientId, ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])`.
    Step 5: Care relationship is confirmed (true).
    Step 6: Guard records security audit entry in `audit_logs`:
            `recordView(doctorId, DOCTOR, patientId, 'PATIENT_DOCUMENTS')`.
    Step 7: Backend fetches patient's document summaries and returns list.
    Step 8: Frontend renders patient historical clinical document timeline.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: IDOR Access Violation (No Care Relationship):
      1. Doctor attempts to query patient records without having an appointment with that patient.
      2. Guard check evaluates to false.
      3. Guard throws `AppException(ErrorCode.ACCESS_DENIED)`.
      4. Backend returns HTTP 403 Forbidden.
      5. Security alert logged to audit trail.
13. Business Rules:
    - BR-26: Doctors cannot access medical records of patients they do not treat (BOLA/IDOR Defense).
14. Non-Functional Requirements:
    - NFR-SEC: 100% IDOR prevention on all patient endpoints.
15. Data Entities Involved: `appointments`, `medical_documents`, `audit_logs`.
16. User Interface Controls: Historical records modal, document timeline cards.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.5 CONDUCT CLINICAL CONSULTATION (UC-DOC-05)
================================================================================
1.  Use Case ID:         UC-DOC-05
2.  Use Case Name:       Conduct Clinical Consultation & Record Physical Examination
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient
6.  Trigger:             Doctor conducts face-to-face consultation and records findings in EMR.
7.  Pre-conditions:      Appointment status is `IN_PROGRESS`.
8.  Post-conditions:     Objective examination findings, vital signs, and clinical notes are saved to encounter draft.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor performs physical examination on patient in consultation room.
    Step 2: Doctor inputs vital signs into Workstation EMR form:
            - Blood Pressure (systolic / diastolic mmHg).
            - Heart Rate (bpm), Respiratory Rate (breaths/min).
            - Body Temperature (°C), SpO2 (%).
            - Height (cm), Weight (kg) -> Auto-computes BMI.
    Step 3: Doctor types Clinical Examination Notes (General condition, cardiovascular, respiratory, abdominal findings).
    Step 4: Frontend auto-saves draft changes via debounced HTTP PATCH to `/api/v1/doctor/encounters/{id}/draft`.
    Step 5: Backend updates draft state in Redis session cache.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-USA: Auto-save draft every 5 seconds to prevent accidental data loss.
15. Data Entities Involved: `medical_records` (draft state).
16. User Interface Controls: Vital signs numeric inputs, auto-calculated BMI badge, clinical notes rich textarea.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.6 ICD-10 DIAGNOSIS AUTOCOMPLETE (UC-DOC-06)
================================================================================
1.  Use Case ID:         UC-DOC-06
2.  Use Case Name:       Autocomplete Medical Diagnosis with WHO ICD-10
3.  Target System:       MediAssist-AI Clinical Ontology Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Medical Records Department, Health Insurance (BHYT)
6.  Trigger:             Doctor types letters into Diagnosis input field on EMR form.
7.  Pre-conditions:      Clinical Ontology Service loaded with WHO ICD-10 & MOH Decision 7603/QĐ-BYT.
8.  Post-conditions:     Standardized ICD-10 diagnosis code and official clinical term selected.
9.  Priority:            High (P0 - Clinical Standardization)
10. Normal Flow:
    Step 1: Doctor focuses on "Chẩn Đoán Bệnh (ICD-10)" and types search term (e.g., "tang huyet ap" or "I10").
    Step 2: Frontend debounces keystroke (250ms) and dispatches HTTP GET to:
            `/api/v1/clinical/ontology/icd10/search?query=tang+huyet+ap&limit=10`.
    Step 3: Backend `ClinicalOntologyService` searches in-memory index or database for prefix and text matches:
            - Vietnamese description: "Bệnh tăng huyết áp vô căn (nguyên phát)".
            - ICD-10 Code: "I10".
            - Disease Chapter: "Bệnh hệ tuần hoàn".
    Step 4: Backend returns list of matching `Icd10EntryDTO` objects in < 15ms.
    Step 5: Frontend renders styled dropdown list showing code badges and official Vietnamese terminology.
    Step 6: Doctor clicks to select "I10 - Bệnh tăng huyết áp vô căn".
    Step 7: Diagnosis is attached as Primary Diagnosis (or Secondary Diagnosis) on the clinical encounter.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-27: Completed encounters must include at least 1 primary standardized ICD-10 diagnosis.
14. Non-Functional Requirements:
    - NFR-PERF: Autocomplete response latency < 30ms for 100% fluid typing experience.
15. Data Entities Involved: `clinical_ontology_icd10`, `medical_records`.
16. User Interface Controls: ICD-10 autocomplete input, code pill badges, chapter indicator.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.7 LOINC LAB TEST AUTOCOMPLETE (UC-DOC-07)
================================================================================
1.  Use Case ID:         UC-DOC-07
2.  Use Case Name:       Autocomplete Laboratory & Diagnostic Tests with LOINC
3.  Target System:       MediAssist-AI Clinical Ontology Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Hospital Laboratory, BHYT
6.  Trigger:             Doctor types in "Chỉ Định Xét Nghiệm / Cận Lâm Sàng" section.
7.  Pre-conditions:      Clinical Ontology Service loaded with LOINC & MOH Decision 3280/QĐ-BYT.
8.  Post-conditions:     Standardized laboratory test code and Vietnamese test name appended to order.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Doctor types test name (e.g., "glucose", "cong thuc mau", "2345-7") in lab order field.
    Step 2: Frontend dispatches HTTP GET to `/api/v1/clinical/ontology/loinc/search?query=glucose`.
    Step 3: Backend `ClinicalOntologyService` matches against LOINC database:
            - LOINC Code: `2345-7`
            - Component: Glucose [Mass/volume] in Serum or Plasma
            - MOH 3280 Name: "Định lượng Glucose máu"
    Step 4: Backend returns matching LOINC entries.
    Step 5: Doctor selects item; test is added to encounter lab requisition list.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: LOINC search latency < 30ms.
15. Data Entities Involved: `clinical_ontology_loinc`, `medical_records`.
16. User Interface Controls: LOINC autocomplete box, test chip list.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.8 PRESCRIBE OUTPATIENT MEDICATION (UC-DOC-08)
================================================================================
1.  Use Case ID:         UC-DOC-08
2.  Use Case Name:       Prescribe Outpatient Medication
3.  Target System:       MediAssist-AI Outpatient Pharmacy Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Pharmacist
6.  Trigger:             Doctor adds medications to the encounter prescription form.
7.  Pre-conditions:      Encounter has at least one valid ICD-10 diagnosis.
8.  Post-conditions:     Electronic prescription lines saved with dosage, frequency, and instructions.
9.  Priority:            High (P0)
10. Normal Flow:
    Step 1: Doctor searches medication by brand name or active pharmaceutical ingredient (API).
    Step 2: Doctor inputs Quantity, Unit (Viên, Gói, Lọ), Route of Administration (Uống, Tiêm, Bôi).
    Step 3: Doctor inputs Dosage Regimen (e.g., "Sáng 1 viên, Tối 1 viên sau ăn").
    Step 4: Doctor sets Treatment Duration (e.g., "Uống trong 7 ngày").
    Step 5: System checks for duplicate drug items or known major contraindications.
    Step 6: Doctor reviews prescription item list.
    Step 7: Prescription line items are staged for final encounter submission.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-28: Medication directions must explicitly state timing (e.g., trước ăn, sau ăn).
14. Non-Functional Requirements:
    - NFR-USA: 1-click addition of common medication templates for standard chronic conditions.
15. Data Entities Involved: `prescriptions`, `prescription_items`, `medications`.
16. User Interface Controls: Drug search autocomplete, quantity spinner, dosage grid, delete icon.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.9 SCHEDULE FOLLOW-UP APPOINTMENT (UC-DOC-09)
================================================================================
1.  Use Case ID:         UC-DOC-09
2.  Use Case Name:       Schedule In-Clinic Follow-up Appointment
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient
6.  Trigger:             Doctor determines patient requires in-person follow-up evaluation.
7.  Pre-conditions:      Active encounter `IN_PROGRESS`.
8.  Post-conditions:     Future appointment reservation pre-created for patient.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: In the Encounter Finalization section, doctor checks "Hẹn Khám Lại".
    Step 2: Doctor selects follow-up timeframe (e.g., "Sau 1 tuần", "Sau 2 tuần", "Sau 1 tháng").
    Step 3: Doctor selects target date and slot from their own upcoming available schedule.
    Step 4: Doctor inputs clinical objective for follow-up (e.g., "Tái khám kiểm tra huyết áp và chức năng thận").
    Step 5: Reservation is linked to the primary encounter as a follow-up visit.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-USA: 1-click date shortcut calculation.
15. Data Entities Involved: `appointments` (follow_up_for_id).
16. User Interface Controls: Follow-up toggle, quick duration pills (+7d, +14d, +30d), date picker.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.10 FINALIZE CLINICAL ENCOUNTER (UC-DOC-10)
================================================================================
1.  Use Case ID:         UC-DOC-10
2.  Use Case Name:       Finalize Clinical Encounter & Complete Appointment
3.  Target System:       MediAssist-AI Doctor Clinical Workstation
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Hospital EMR Archive
6.  Trigger:             Doctor finishes consultation and clicks "Hoàn Thành Ca Khám".
7.  Pre-conditions:      
    - Encounter contains vital signs, examination notes, and at least 1 ICD-10 diagnosis.
    - Appointment is currently `IN_PROGRESS`.
8.  Post-conditions:     
    - Appointment status transitions to `COMPLETED`.
    - Medical record is locked as immutable (preventing post-facto alterations).
    - Longitudinal patient health passport updated.
    - Notification email dispatched to patient with full consultation summary and prescription.
9.  Priority:            High (P0 - Clinical Closure)
10. Normal Flow:
    Step 1: Doctor reviews encounter summary modal (Diagnoses, Prescriptions, Lab orders, Follow-up).
    Step 2: Doctor clicks "Xác Nhận & Hoàn Tất Khám".
    Step 3: Frontend calls HTTP POST `/api/v1/doctor/encounters/{id}/finalize`.
    Step 4: Backend opens transaction:
            - Validates presence of mandatory primary ICD-10 diagnosis.
            - Writes finalized `medical_records` entity with timestamp and doctor digital sign-off.
            - Updates `appointments.status = 'COMPLETED'`.
            - Marks queue item as finished.
    Step 5: Backend commits transaction.
    Step 6: Backend dispatches `EncounterCompletedEvent` -> triggers async PDF generation & email.
    Step 7: Workstation advances queue and selects next waiting patient (STT + 1).
    Step 8: Frontend renders success toast: "Ca khám đã hoàn thành thành công."
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Missing mandatory fields:
      1. Backend throws HTTP 422 if ICD-10 diagnosis is missing.
      2. Frontend highlights diagnosis field in red.
13. Business Rules:
    - BR-29: Finalized medical records are legally immutable. Any corrections require an addendum record.
14. Non-Functional Requirements:
    - NFR-PERF: Finalize transaction commits in < 200ms.
15. Data Entities Involved: `appointments`, `medical_records`, `prescriptions`, `audit_logs`.
16. User Interface Controls: Finalize CTA button, confirmation modal with summary checklist.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.11 DOCTOR CANCEL / RESCHEDULE (UC-DOC-11)
================================================================================
1.  Use Case ID:         UC-DOC-11
2.  Use Case Name:       Doctor Cancel / Reschedule Appointment with Refund
3.  Target System:       MediAssist-AI Clinical Scheduling Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Patient, Hospital Admin
6.  Trigger:             Doctor experiences emergency conflict and must cancel/reschedule shifts.
7.  Pre-conditions:      Affected appointments are in `CONFIRMED` status.
8.  Post-conditions:     
    - Patient appointments cancelled or moved.
    - 100% full refund automatically processed for all affected patients.
    - Apology notification emails dispatched to patients.
9.  Priority:            Medium (P1)
10. Normal Flow:
    Step 1: Doctor selects shift or specific appointment and clicks "Hủy Do Bác Sĩ Có Sự Cố".
    Step 2: Doctor inputs explanation note (e.g., "Bác sĩ phải thực hiện ca phẫu thuật cấp cứu").
    Step 3: Frontend calls HTTP POST `/api/v1/doctor/appointments/{id}/cancel`.
    Step 4: Backend invokes `AppointmentRefundService.processRefund(appointment, DOCTOR)`.
    Step 5: Because cancellation is initiated by Doctor, system unconditionally issues 100% full refund.
    Step 6: Backend updates appointment status to `CANCELLED_BY_DOCTOR`.
    Step 7: Backend triggers async email notification with refund confirmation and priority rebooking link.
    Step 8: Frontend updates queue.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-30: Doctor-initiated cancellations always result in 100% full patient refunds.
14. Non-Functional Requirements:
    - NFR-SEC: Bulk refunds executed atomically per transaction.
15. Data Entities Involved: `appointments`, `payments`, `audit_logs`.
16. User Interface Controls: Doctor cancellation modal, reason textarea, confirm button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.12 EXPORT ENCOUNTER SUMMARY PDF (UC-DOC-12)
================================================================================
1.  Use Case ID:         UC-DOC-12
2.  Use Case Name:       Export Patient Encounter Summary / Prescription PDF
3.  Target System:       MediAssist-AI Document Generation Subsystem
4.  Primary Actor:       Doctor, Patient
5.  Stakeholders:        Doctor, Patient, Pharmacy
6.  Trigger:             User clicks "Xuất Bệnh Án / Đơn Thuốc PDF".
7.  Pre-conditions:      Encounter is `COMPLETED`.
8.  Post-conditions:     Official formatted PDF file generated and downloaded.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: User clicks "In Đơn Thuốc / Bệnh Án".
    Step 2: Frontend calls HTTP GET `/api/v1/doctor/encounters/{id}/export-pdf`.
    Step 3: Backend verifies authorization via `PatientAccessGuard`.
    Step 4: Backend populates Thymeleaf HTML print template with clinic header, patient details, vital signs, ICD-10 diagnosis, prescription list, doctor signature, and verification QR.
    Step 5: Backend renders PDF via OpenPDF / iText.
    Step 6: Backend returns PDF byte stream with `Content-Disposition: attachment; filename=don-thuoc-{id}.pdf`.
    Step 7: Browser downloads or opens native print preview window.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: PDF generation completed in < 400ms.
15. Data Entities Involved: `medical_records`, `appointments`, `prescriptions`, `users`.
16. User Interface Controls: Print / Export PDF button with printer icon.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.13 VIEW PRACTICE ANALYTICS (UC-DOC-13)
================================================================================
1.  Use Case ID:         UC-DOC-13
2.  Use Case Name:       View Doctor Revenue & Performance Analytics
3.  Target System:       MediAssist-AI Doctor Workstation Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Hospital Finance
6.  Trigger:             Doctor navigates to Analytics tab (`/doctor/analytics`).
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:     Performance metrics and revenue charts are displayed.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Doctor clicks Analytics tab.
    Step 2: Frontend calls HTTP GET `/api/v1/doctor/analytics/summary`.
    Step 3: Backend computes total consultations completed, average rating, patient retention rate, and gross revenue generated over selected timeframe (This Week, This Month, All Time).
    Step 4: Frontend renders metric cards and trend charts.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Aggregation queries execute on read-replica / indexed columns in < 150ms.
15. Data Entities Involved: `appointments`, `payments`, `reviews`.
16. User Interface Controls: Timeframe filter dropdown, metric KPI cards, ChartJS visual charts.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.3.14 MANAGE DOCTOR PROFILE (UC-DOC-14)
================================================================================
1.  Use Case ID:         UC-DOC-14
2.  Use Case Name:       Manage Doctor Professional Profile & Credentials
3.  Target System:       MediAssist-AI Doctor Directory Subsystem
4.  Primary Actor:       Doctor
5.  Stakeholders:        Doctor, Admin
6.  Trigger:             Doctor updates their professional bio, fees, or clinical experience.
7.  Pre-conditions:      Doctor is authenticated.
8.  Post-conditions:     Doctor profile updated; if bio changed, 1536-d embedding is re-computed.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Doctor navigates to Professional Profile (`/doctor/profile`).
    Step 2: Doctor modifies biography, clinical focus keywords, consultation fee, or clinic address.
    Step 3: Doctor clicks "Lưu Hồ Sơ Chuyên Môn".
    Step 4: Frontend calls HTTP PUT `/api/v1/doctor/profile` with updated DTO.
    Step 5: Backend updates `doctor_profiles` table.
    Step 6: If biography or specialty keywords changed, backend triggers asynchronous re-embedding:
            `EmbeddingService.generateEmbedding(bio)` -> updates `doctor_profiles.bio_embedding`.
    Step 7: Backend invalidates doctor cache in Redis.
    Step 8: Frontend displays success notification.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-31: Practice certificate number (CCHN) cannot be modified once approved by Admin without re-verification.
14. Non-Functional Requirements:
    - NFR-PERF: Profile update commits in < 100ms; vector re-embedding executes asynchronously.
15. Data Entities Involved: `doctor_profiles`, `specialties`.
16. User Interface Controls: Bio textarea, fee input, specialty tags, save button.
17. Open Issues: None.
================================================================================
```

---

#### 2.3.4 Admin (Governance & AI FinOps)

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.1 EXECUTIVE DASHBOARD (UC-ADM-01)
================================================================================
1.  Use Case ID:         UC-ADM-01
2.  Use Case Name:       View System Governance Dashboard & Executive Telemetry
3.  Target System:       MediAssist-AI Admin Governance Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Hospital Director, Operations Manager
6.  Trigger:             Admin logs in and accesses `/admin/dashboard`.
7.  Pre-conditions:      User possesses `ADMIN` role.
8.  Post-conditions:     Executive telemetry, active user statistics, and system health rendered.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/dashboard`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/telemetry/overview`.
    Step 3: Backend aggregates real-time metrics:
            - Active users online, total registered patients, verified doctors.
            - Total appointments booked today, completed consultations, cancellation rates.
            - AI API health status (Gemini, OpenAI, Redis, PostgreSQL).
            - Real-time token consumption and estimated cost today.
    Step 4: Frontend renders executive dashboard cards, health indicators, and activity feeds.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Telemetry dashboard cached in Redis; load latency < 120ms.
15. Data Entities Involved: `users`, `appointments`, `doctor_profiles`, `ai_token_logs`.
16. User Interface Controls: KPI cards, status badges, live activity feed list.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.2 USER ACCESS CONTROL (UC-ADM-02)
================================================================================
1.  Use Case ID:         UC-ADM-02
2.  Use Case Name:       Manage User Accounts & Access Control
3.  Target System:       MediAssist-AI Admin Governance Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Security Compliance
6.  Trigger:             Admin searches user directory to audit, lock, or modify user roles.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Target user account locked/unlocked or role modified; active sessions revoked.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin navigates to User Management (`/admin/users`).
    Step 2: Admin searches by email, name, or filters by role (`PATIENT`, `DOCTOR`, `ADMIN`).
    Step 3: Frontend calls HTTP GET `/api/v1/admin/users?query=...&page=0&size=20`.
    Step 4: Backend returns paginated list of accounts.
    Step 5: Admin clicks "Khóa Tài Khoản" on a suspicious or compromised account.
    Step 6: Frontend calls HTTP PUT `/api/v1/admin/users/{id}/status` with `is_active = false`.
    Step 7: Backend commits update to `users.is_active` and invalidates all JWT refresh tokens for user.
    Step 8: Backend logs security audit trail: `ADMIN_LOCK_USER`.
    Step 9: Frontend updates account status pill to `Bị Khóa`.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Admin attempts to lock own account:
      1. Backend rejects request with HTTP 400 Bad Request: "Không thể tự khóa tài khoản quản trị hiện tại."
13. Business Rules:
    - BR-32: Locking an account immediately terminates all active web and mobile sessions.
14. Non-Functional Requirements:
    - NFR-SEC: Action strictly logged to `audit_logs`.
15. Data Entities Involved: `users`, `audit_logs`.
16. User Interface Controls: Search bar, role filter dropdown, lock/unlock toggle switch, user table.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.3 VET DOCTOR LICENSE (UC-ADM-03)
================================================================================
1.  Use Case ID:         UC-ADM-03
2.  Use Case Name:       Vet and Approve Doctor Professional Credentials
3.  Target System:       MediAssist-AI Credential Vetting Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Medical Board, Doctor
6.  Trigger:             Doctor registers and submits medical practice certificate (CCHN) for review.
7.  Pre-conditions:      Doctor profile exists with `is_verified = false`.
8.  Post-conditions:     Doctor credentials verified (`is_verified = true`); doctor appears in search.
9.  Priority:            High (P0 - Legal Compliance)
10. Normal Flow:
    Step 1: Admin navigates to Doctor Verification Queue (`/admin/doctors/vetting`).
    Step 2: Frontend displays pending doctors awaiting certification audit.
    Step 3: Admin clicks a doctor record to inspect submitted credentials:
            - Medical degree scans, Medical Practice Certificate (CCHN) number.
            - Issuing Department of Health (Sở Y Tế / Bộ Y Tế).
            - Claimed primary clinical specialty and hospital affiliations.
    Step 4: Admin verifies credentials against the official National Healthcare Practitioner Registry.
    Step 5: Admin clicks "Phê Duyệt Bác Sĩ" (Approve).
    Step 6: Frontend calls HTTP PUT `/api/v1/admin/doctors/{id}/verify`.
    Step 7: Backend sets `doctor_profiles.is_verified = true`.
    Step 8: Backend generates 1536-d embedding for the doctor profile if not already present.
    Step 9: Backend dispatches welcome & approval notification email to doctor.
    Step 10: Frontend renders verification confirmation.
11. Alternative Flows:
    - Alt Flow 11a: Reject Doctor Credentials:
      1. Admin clicks "Từ Chối" and enters rejection justification.
      2. Backend sends rejection email prompting doctor to upload valid documentation.
12. Exception Flows: None.
13. Business Rules:
    - BR-13: Unverified doctors are strictly excluded from public search and booking directories.
14. Non-Functional Requirements:
    - NFR-SEC: Vetting decisions audited with Admin user ID and timestamp.
15. Data Entities Involved: `doctor_profiles`, `users`, `audit_logs`.
16. User Interface Controls: Document preview modal, "Phê Duyệt" button, "Từ Chối" button.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.4 MANAGE CLINICAL SPECIALTIES (UC-ADM-04)
================================================================================
1.  Use Case ID:         UC-ADM-04
2.  Use Case Name:       Manage Clinical Specialties & Hospital Departments
3.  Target System:       MediAssist-AI Clinical Taxonomy Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Doctors, Patients
6.  Trigger:             Admin creates or modifies medical specialty taxonomy records.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Specialty entity created or updated in `specialties` table.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Admin navigates to Specialty Management (`/admin/specialties`).
    Step 2: Admin clicks "Thêm Chuyên Khoa Mới".
    Step 3: Admin enters Specialty Name (e.g., "Tim Mạch", "Tiêu Hóa"), Code (`CARDIO`, `GASTRO`), Description, and Icon identifier.
    Step 4: Frontend calls HTTP POST `/api/v1/admin/specialties` with JSON payload.
    Step 5: Backend validates unique specialty code and name.
    Step 6: Backend inserts record into `specialties` table.
    Step 7: Backend refreshes global specialty taxonomy cache in Redis.
    Step 8: Frontend updates specialty directory table.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Cache refreshed instantly across all active nodes.
15. Data Entities Involved: `specialties`.
16. User Interface Controls: Specialty table, Add/Edit modal, icon selector.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.5 SUPERVISE SYSTEM APPOINTMENTS (UC-ADM-05)
================================================================================
1.  Use Case ID:         UC-ADM-05
2.  Use Case Name:       Supervise System-Wide Appointments & Intervene
3.  Target System:       MediAssist-AI Appointment Supervision Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Patients, Doctors
6.  Trigger:             Admin inspects system-wide appointments to resolve disputes or anomalies.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Appointment details audited; administrative intervention executed if needed.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/supervision`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/appointments?status=...&date=...`.
    Step 3: Backend returns paginated list of all system appointments.
    Step 4: Admin searches by Patient Email, Doctor Name, or Appointment ID.
    Step 5: Admin can review full lifecycle events (created, paid, rescheduled, completed, cancelled).
    Step 6: In case of dispute, Admin can execute "Buộc Hủy & Hoàn Tiền" (Force Cancel & Refund).
    Step 7: Backend triggers `AppointmentRefundService` and logs administrative override in `audit_logs`.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-SEC: All administrative overrides require mandatory explanation text logged to audit trail.
15. Data Entities Involved: `appointments`, `payments`, `audit_logs`.
16. User Interface Controls: Supervision data table, filter pills, Force Cancel button, audit trail modal.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.6 MONITOR AI FINOPS TELEMETRY (UC-ADM-06)
================================================================================
1.  Use Case ID:         UC-ADM-06
2.  Use Case Name:       Monitor AI Token Usage & FinOps Telemetry
3.  Target System:       MediAssist-AI FinOps Analytics Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Financial Controller, System Architect
6.  Trigger:             Admin views AI Cost & Token Analytics tab (`/admin/ai-finops`).
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Real-time token metrics, cost graphs, and model distribution displayed.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin accesses AI FinOps tab on admin dashboard.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/ai/finops/summary`.
    Step 3: Backend queries `ai_token_logs` table aggregating by provider (Gemini 1.5 Flash, OpenAI Embeddings, OpenRouter):
            - Prompt Tokens consumed today, this week, this month.
            - Completion Tokens consumed.
            - Estimated cost calculated using official pricing tiers:
              * Gemini 1.5 Flash: $0.075 / 1M prompt tokens, $0.30 / 1M completion tokens.
              * OpenAI text-embedding-3-small: $0.02 / 1M tokens.
            - Total cost converted to VNĐ using dynamic rate (`AI_COST_VND_PER_USD = 25450`).
    Step 4: Frontend renders breakdown charts (Tokens per feature: Triage vs. Document OCR vs. Vector Search).
    Step 5: System highlights any anomalous spike exceeding 3x daily average.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: FinOps analytics queries use indexed date aggregates (< 100ms).
15. Data Entities Involved: `ai_token_logs`.
16. User Interface Controls: Token count metric cards, USD/VND toggle, provider donut chart, daily line chart.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.7 TOGGLE AI PROVIDER MODE (UC-ADM-07)
================================================================================
1.  Use Case ID:         UC-ADM-07
2.  Use Case Name:       Toggle System-wide AI Provider & Fallback Mode
3.  Target System:       MediAssist-AI Inference Routing Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, Platform Architect
6.  Trigger:             Admin triggers emergency provider failover or cost-saving mode.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Global AI provider configuration updated in Redis and application memory.
9.  Priority:            High (P1)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/ai-settings`.
    Step 2: Admin views current provider status: Gemini (Active), OpenRouter (Standby), Local Hash (Standby).
    Step 3: Admin selects target operational mode:
            - Mode 1: Primary (Google Gemini 1.5 Flash Direct).
            - Mode 2: Secondary (OpenRouter Free-tier Pool).
            - Mode 3: Emergency Offline (Rule-based Triage + Local FNV-1a Vector Hashing).
    Step 4: Admin clicks "Lưu Cấu Hình AI".
    Step 5: Frontend dispatches HTTP POST `/api/v1/system/ai-mode/toggle` (Backend Security Fix BE-1).
    Step 6: Backend verifies `@PreAuthorize("hasRole('ADMIN')")`.
    Step 7: Backend updates runtime provider flag in Redis (`system:ai:mode`).
    Step 8: Backend logs `ADMIN_TOGGLE_AI_MODE` in `audit_logs`.
    Step 9: Frontend updates live provider indicator badge.
11. Alternative Flows: None.
12. Exception Flows:
    - Exc Flow 12a: Non-Admin attempts toggle:
      1. Backend returns HTTP 403 Forbidden.
13. Business Rules:
    - BR-33: Only ADMIN role can modify system-wide AI provider configuration.
14. Non-Functional Requirements:
    - NFR-REL: Failover mode propagates to all worker threads in < 1 second.
15. Data Entities Involved: `system_configs`, `audit_logs`.
16. User Interface Controls: AI Mode toggle buttons, Ping test button, active provider badge.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.8 VIEW SYSTEM AUDIT LOGS (UC-ADM-08)
================================================================================
1.  Use Case ID:         UC-ADM-08
2.  Use Case Name:       View System Audit Logs & Patient Record Access Logs
3.  Target System:       MediAssist-AI Audit & Compliance Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Security Auditor, Data Privacy Officer, Legal Counsel
6.  Trigger:             Admin accesses Audit Log viewer (`/admin/audit-logs`).
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Immutable audit trail records rendered with multi-criteria filtering.
9.  Priority:            High (P1 - HIPAA & Decree 13 Compliance)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/audit-logs`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/audit-logs?page=0&size=50`.
    Step 3: Backend queries `audit_logs` table ordered by `timestamp DESC`.
    Step 4: Admin filters by action type:
            - `VIEW_PATIENT_RECORD` (Monitors doctor access to patient documents).
            - `USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_RESET`.
            - `PAYMENT_REFUND`, `ADMIN_LOCK_USER`, `ADMIN_TOGGLE_AI_MODE`.
    Step 5: Backend returns paginated list of timestamped events including Actor ID, Target Entity, IP Address, Action, and Result.
    Step 6: Frontend renders responsive audit table with JSON payload inspector.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules:
    - BR-34: Audit logs are append-only and strictly immutable. No user, including Admin, can delete or update audit entries.
14. Non-Functional Requirements:
    - NFR-SEC: Audit records retained for minimum 3 years per healthcare regulatory requirements.
15. Data Entities Involved: `audit_logs`.
16. User Interface Controls: Action filter dropdown, Date range picker, User search input, Audit table.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.9 MANAGE DATABASE MIGRATIONS (UC-ADM-09)
================================================================================
1.  Use Case ID:         UC-ADM-09
2.  Use Case Name:       Manage Database Migrations & Vector Index Status
3.  Target System:       MediAssist-AI Infrastructure Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Database Administrator, Platform Engineer
6.  Trigger:             Admin inspects database schema status and pgvector index health.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Flyway migration baseline and pgvector index metrics displayed.
9.  Priority:            Medium (P2)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/database-status`.
    Step 2: Frontend calls HTTP GET `/api/v1/admin/system/database-status`.
    Step 3: Backend queries `flyway_schema_history` table:
            - Displays executed migrations V1 through V22 with checksums and execution durations.
    Step 4: Backend queries PostgreSQL statistics for `idx_doctor_bio_hnsw_verified`:
            - Index size (KB), tuple count, and execution plan scan verification.
    Step 5: Frontend renders database status card showing 100% migration success and HNSW health.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-MAINT: Migration baseline strictly matches Flyway V1–V22.
15. Data Entities Involved: `flyway_schema_history`, `pg_stat_user_indexes`.
16. User Interface Controls: Migration version list, HNSW index health meter.
17. Open Issues: None.
================================================================================
```

```
================================================================================
USE CASE SPECIFICATION: 2.3.4.10 BROADCAST SYSTEM ANNOUNCEMENTS (UC-ADM-10)
================================================================================
1.  Use Case ID:         UC-ADM-10
2.  Use Case Name:       Send System-Wide Broadcast Announcements
3.  Target System:       MediAssist-AI Notification Subsystem
4.  Primary Actor:       Admin
5.  Stakeholders:        Admin, All Users
6.  Trigger:             Admin publishes a global banner or public health advisory.
7.  Pre-conditions:      Admin is authenticated.
8.  Post-conditions:     Broadcast notification record created; banner displayed across all user client sessions.
9.  Priority:            Low (P3)
10. Normal Flow:
    Step 1: Admin navigates to `/admin/announcements`.
    Step 2: Admin inputs Title, Content, Priority (`INFO`, `WARNING`, `CRITICAL`), and Expiration Date.
    Step 3: Frontend calls HTTP POST `/api/v1/admin/announcements`.
    Step 4: Backend persists announcement in `system_announcements`.
    Step 5: Backend publishes event to Redis pub/sub channel.
    Step 6: Active client sessions receive event and render top banner alert.
11. Alternative Flows: None.
12. Exception Flows: None.
13. Business Rules: None.
14. Non-Functional Requirements:
    - NFR-PERF: Broadcast message delivered to connected clients in < 500ms.
15. Data Entities Involved: `system_announcements`.
16. User Interface Controls: Rich announcement editor, priority selector, publish button.
17. Open Issues: None.
================================================================================
```
"""

if __name__ == "__main__":
    print("Part 3 module loaded successfully. Character count:", len(get_content()))
