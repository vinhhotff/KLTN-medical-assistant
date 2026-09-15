-- ===================================================================
-- MediAssist-AI Flyway Migration: V11__add_composite_performance_indexes.sql
-- Composite indexes for frequent queries, sorting, and foreign keys
-- ===================================================================

-- 1. Appointments frequent sorting by scheduled_start DESC for patient and doctor dashboards
CREATE INDEX IF NOT EXISTS idx_appointments_patient_schedule
ON appointments(patient_id, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_schedule
ON appointments(doctor_id, scheduled_start DESC);

-- 2. Medical Documents frequent sorting by created_at DESC for patient document history
CREATE INDEX IF NOT EXISTS idx_med_doc_user_created
ON medical_documents(user_id, created_at DESC);

-- 3. Triage Sessions frequent sorting by created_at DESC for patient consultation history
CREATE INDEX IF NOT EXISTS idx_triage_user_created
ON triage_sessions(user_id, created_at DESC);

-- 4. Foreign key index on doctor_specialties (second column of composite primary key)
CREATE INDEX IF NOT EXISTS idx_doctor_specialties_specialty_id
ON doctor_specialties(specialty_id);
