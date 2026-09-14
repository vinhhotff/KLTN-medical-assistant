-- ===================================================================
-- MediAssist-AI Flyway Migration: V6__allow_null_password_hash_for_oauth.sql
-- Ho tro tai khoan nguoi dung dang ky thong qua Social Login (OAuth2 / Google)
-- ===================================================================

-- 1. Cho phep password_hash nullable (nguoi dung OAuth2 khong can mat khau khoi tao)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Chuyen avatar_url sang TEXT de chua duoc URL dai cua Google/mang xa hoi
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;

-- 3. Bo sung chi muc unique cho google_id neu chua co
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
