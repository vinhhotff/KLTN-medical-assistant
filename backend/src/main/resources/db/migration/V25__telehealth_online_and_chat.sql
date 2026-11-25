-- ===================================================================
-- MediAssist-AI Flyway Migration: V25__telehealth_online_and_chat.sql
-- Hybrid Online/In-Person Appointments & Real-time Consultation Chat
-- ===================================================================

-- 1. Extend appointments with consultation type & telehealth meeting room metadata
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(20) NOT NULL DEFAULT 'IN_PERSON';

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS meeting_room_code VARCHAR(100);

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS meeting_url VARCHAR(500);

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Ensure consultation_type check constraint exists cleanly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_consultation_type_check'
    ) THEN
        ALTER TABLE appointments
            ADD CONSTRAINT appointments_consultation_type_check
            CHECK (consultation_type IN ('IN_PERSON', 'ONLINE'));
    END IF;
END $$;

-- Ensure appointments_status_check includes CHECKED_IN
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_status_check'
    ) THEN
        ALTER TABLE appointments DROP CONSTRAINT appointments_status_check;
    END IF;
    ALTER TABLE appointments
        ADD CONSTRAINT appointments_status_check
        CHECK (status IN ('SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'));
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_consultation_type
    ON appointments(consultation_type);

CREATE INDEX IF NOT EXISTS idx_appointments_meeting_room_code
    ON appointments(meeting_room_code)
    WHERE meeting_room_code IS NOT NULL;

-- 2. Consultation Messages Table (Persistent Telehealth Chat: TEXT / IMAGE / PRESCRIPTION_NOTE)
CREATE TABLE IF NOT EXISTS consultation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sender_role VARCHAR(30) NOT NULL CHECK (sender_role IN ('PATIENT', 'DOCTOR', 'ADMIN')),
    sender_name VARCHAR(150) NOT NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT'
        CHECK (message_type IN ('TEXT', 'IMAGE', 'PRESCRIPTION_NOTE')),
    content TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultation_messages_appt_created
    ON consultation_messages(appointment_id, created_at ASC);
