-- ===================================================================
-- MediAssist-AI Flyway Migration: V28__add_refund_tracking_to_appointments.sql
-- Track policy-based refund amount, percentage, timestamp, and policy note
-- ===================================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS refund_percentage INT,
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS refund_policy_note VARCHAR(300);
