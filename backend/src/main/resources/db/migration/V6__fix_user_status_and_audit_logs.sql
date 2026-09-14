-- ===================================================================
-- MediAssist-AI Flyway Migration: V6__fix_user_status_and_audit_logs.sql
-- 1. Align UserStatus enum check constraint (support PENDING_VERIFICATION)
-- 2. Add version column to users for JPA @Version optimistic locking
-- 3. Harmonize audit_logs schema with AuditLog JPA entity
-- 4. Add index on appointments(doctor_id, scheduled_start)
-- ===================================================================

-- 1. Fix UserStatus Check Constraint
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
    ALTER TABLE users ADD CONSTRAINT users_status_check 
        CHECK (status IN ('ACTIVE', 'PENDING', 'PENDING_VERIFICATION', 'SUSPENDED'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Add @Version column to users for Optimistic Locking
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 3. Harmonize audit_logs table with AuditLog Entity
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255),
    ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Relax actor NOT NULL constraint if present (Entity does not populate actor directly)
DO $$
BEGIN
    ALTER TABLE audit_logs ALTER COLUMN actor DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);

-- 4. Add index for appointment schedule queries
CREATE INDEX IF NOT EXISTS idx_appointment_schedule ON appointments(doctor_id, scheduled_start);
