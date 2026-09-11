-- ===================================================================
-- MediAssist-AI Flyway Migration: V3__account_lockout_and_security_hardening.sql
-- Account Lockout & Brute-Force Defense Columns and Indexes
-- ===================================================================

-- 1. ADD ACCOUNT LOCKOUT COLUMNS TO USERS TABLE
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP(6) WITHOUT TIME ZONE;

-- 2. CREATE INDEX FOR EXPEDITIOUS LOCKOUT VERIFICATION
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
