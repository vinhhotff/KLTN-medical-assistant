-- ===================================================================
-- MediAssist-AI Flyway Migration: V26__doctor_schedule_v2_exceptions_and_buffer.sql
-- Adds per-doctor slot duration & buffer time, plus Date Override / Exceptions
-- ===================================================================

-- 1. Add slot duration and buffer time configuration to doctor_profiles
ALTER TABLE doctor_profiles
ADD COLUMN IF NOT EXISTS slot_duration_minutes INT NOT NULL DEFAULT 30;

ALTER TABLE doctor_profiles
ADD COLUMN IF NOT EXISTS buffer_time_minutes INT NOT NULL DEFAULT 0;

-- Backfill slot_duration_minutes from each doctor's active weekly slots
UPDATE doctor_profiles dp
SET slot_duration_minutes = sub.dur
FROM (
    SELECT DISTINCT ON (doctor_profile_id)
        doctor_profile_id,
        slot_duration_minutes AS dur
    FROM doctor_schedule_slots
    WHERE is_active = TRUE
      AND slot_duration_minutes IN (15, 20, 30, 45, 60)
    GROUP BY doctor_profile_id, slot_duration_minutes
    ORDER BY doctor_profile_id, COUNT(*) DESC, slot_duration_minutes ASC
) sub
WHERE dp.id = sub.doctor_profile_id;

-- 2. Create doctor_schedule_exceptions table (Day-Off & Custom Hours overrides)
CREATE TABLE IF NOT EXISTS doctor_schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_day_off BOOLEAN NOT NULL DEFAULT TRUE,
    custom_shifts_json TEXT NOT NULL DEFAULT '[]',
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_doctor_schedule_exception_date UNIQUE (doctor_profile_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_exceptions_lookup
ON doctor_schedule_exceptions(doctor_profile_id, exception_date);

-- 3. Enhance doctor_schedule_slots with audit timestamp & composite lookup index
ALTER TABLE doctor_schedule_slots
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_profile_active
ON doctor_schedule_slots(doctor_profile_id, is_active, day_of_week, start_time);
