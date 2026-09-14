-- ===================================================================
-- MediAssist-AI Flyway Migration: V7__slot_collision_guard_and_dedup_constraints.sql
-- Concurrency Guards: Appointment Active Slot Partial Unique Index
-- and Medical Document SHA-256 Deduplication Unique Index
-- ===================================================================

-- 1. CLEANUP POTENTIAL DUPLICATES BEFORE APPLYING UNIQUE CONSTRAINTS (IF ANY)
DELETE FROM appointments a USING appointments b
WHERE a.id < b.id
  AND a.doctor_id = b.doctor_id
  AND a.scheduled_start = b.scheduled_start
  AND a.status != 'CANCELLED'
  AND b.status != 'CANCELLED';

DELETE FROM medical_documents a USING medical_documents b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.file_hash = b.file_hash
  AND a.file_hash IS NOT NULL;

-- 2. PARTIAL UNIQUE INDEX FOR APPOINTMENT ACTIVE SLOTS (RACE CONDITION GUARD)
-- Prevents double-booking even under extreme concurrent burst requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_unique_active_slot
ON appointments(doctor_id, scheduled_start)
WHERE status != 'CANCELLED';

-- 3. DEDUPLICATION UNIQUE CONSTRAINT ON MEDICAL DOCUMENTS
-- Prevents TOCTOU duplicate file analysis insertion and quota drain
CREATE UNIQUE INDEX IF NOT EXISTS idx_med_doc_user_hash_unique
ON medical_documents(user_id, file_hash)
WHERE file_hash IS NOT NULL;
