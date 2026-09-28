-- ===================================================================
-- MediAssist-AI Flyway Migration: V15__add_triage_session_and_refund_to_appointments.sql
-- Link Telehealth Appointments directly to Patient AI Triage Sessions
-- ===================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS triage_session_id UUID REFERENCES triage_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_triage_session_id
    ON appointments(triage_session_id);
