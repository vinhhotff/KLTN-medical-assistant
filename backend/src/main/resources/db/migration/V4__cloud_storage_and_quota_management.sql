-- ===================================================================
-- MediAssist-AI Flyway Migration: V4__cloud_storage_and_quota_management.sql
-- Cloud Storage URLs, SHA-256 Content Deduplication & User Quota Management
-- ===================================================================

-- 1. ADD QUOTA & SUBSCRIPTION COLUMNS TO USERS TABLE
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS scan_quota INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(30) NOT NULL DEFAULT 'FREE',
    ADD COLUMN IF NOT EXISTS vip_valid_until TIMESTAMP(6) WITHOUT TIME ZONE;

-- Update existing users to have 1 free scan quota if they were 0
UPDATE users SET scan_quota = 1 WHERE scan_quota = 0;

-- 2. ADD CLOUD STORAGE & DEDUPLICATION COLUMNS TO MEDICAL_DOCUMENTS TABLE
ALTER TABLE medical_documents
    ADD COLUMN IF NOT EXISTS storage_url TEXT,
    ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS is_valid_medical BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. CREATE COMPOSITE INDEX FOR FAST SHA-256 DEDUPLICATION LOOKUP
CREATE INDEX IF NOT EXISTS idx_med_doc_hash ON medical_documents(user_id, file_hash);
