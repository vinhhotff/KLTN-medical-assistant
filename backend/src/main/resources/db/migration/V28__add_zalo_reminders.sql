-- V28: Add Zalo OA linking & clinical reminder tracking columns
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS zalo_user_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS zalo_opted_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS zalo_linked_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_zalo_user_id
    ON users (zalo_user_id)
    WHERE zalo_user_id IS NOT NULL;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS zalo_appointment_reminded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS zalo_medication_reminded_date DATE;
