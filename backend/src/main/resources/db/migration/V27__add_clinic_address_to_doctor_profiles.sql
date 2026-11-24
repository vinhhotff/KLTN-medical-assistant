-- ===================================================================
-- MediAssist-AI Flyway Migration: V27__add_clinic_address_to_doctor_profiles.sql
-- Stores each doctor's clinic / consultation address for patient discovery & tickets
-- ===================================================================

ALTER TABLE doctor_profiles
ADD COLUMN IF NOT EXISTS clinic_address VARCHAR(300);
