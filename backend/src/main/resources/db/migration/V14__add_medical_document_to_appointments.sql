-- ===================================================================
-- MediAssist-AI Flyway Migration: V14__add_medical_document_to_appointments.sql
-- Link Telehealth Appointments directly to Patient Medical Documents & AI Analysis
-- ===================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS medical_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_medical_document_id
    ON appointments(medical_document_id);
