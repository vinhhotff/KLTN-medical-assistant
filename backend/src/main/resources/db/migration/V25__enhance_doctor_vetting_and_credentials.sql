-- ====================================================================
-- Flyway Migration: V25__enhance_doctor_vetting_and_credentials.sql
-- Description:
--   1. Adds medical license accreditation and verification lifecycle columns to doctor_profiles:
--      - verification_status: UNSUBMITTED, PENDING_VERIFICATION, APPROVED, REJECTED
--      - rejection_reason: Detailed feedback from medical council / hospital admins
--      - rejection_at: Timestamp of vetting rejection
--      - license_issued_date: Official issuance date per MoH / DoH guidelines
--      - scope_of_practice: Clinical practice scope permitted by the license
--      - license_document_storage_path: Supabase Storage private object key
--   2. Backfills verification_status based on current is_verified and license_number values.
--   3. Adds performance index on verification_status for admin queue filtering.
-- ====================================================================

-- 1. ADD NEW CLINICAL CREDENTIAL & VETTING COLUMNS
ALTER TABLE doctor_profiles 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'UNSUBMITTED',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS license_issued_date DATE,
ADD COLUMN IF NOT EXISTS scope_of_practice TEXT,
ADD COLUMN IF NOT EXISTS license_document_storage_path TEXT;

-- 2. BACKFILL VERIFICATION STATUS
UPDATE doctor_profiles
SET verification_status = CASE 
    WHEN is_verified = TRUE THEN 'APPROVED'
    WHEN license_number IS NOT NULL AND TRIM(license_number) <> '' THEN 'PENDING_VERIFICATION'
    ELSE 'UNSUBMITTED'
END
WHERE verification_status IS NULL OR verification_status = 'UNSUBMITTED';

-- 3. INDEX FOR ADMIN VETTING QUEUE AND SEARCH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_doctor_verification_status ON doctor_profiles(verification_status);
