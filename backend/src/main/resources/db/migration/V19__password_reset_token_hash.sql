-- ===================================================================
-- V19: Password reset token chỉ lưu SHA-256 hash (không lưu plaintext)
-- - Xóa toàn bộ token cũ (đang là plaintext): người dùng chỉ cần yêu cầu lại liên kết mới.
-- - Đổi tên password_reset_tokens.token → token_hash (hex 64 ký tự của SHA-256(token gốc)).
-- - Gỡ mọi ràng buộc UNIQUE / index cũ trên cột token (kể cả do Hibernate ddl-auto=update tự sinh),
--   rồi tạo lại UNIQUE index trên token_hash.
-- Idempotent: an toàn khi chạy trên DB đã có sẵn cột token_hash.
-- ===================================================================

DELETE FROM password_reset_tokens;

DO $$
DECLARE
    has_token      BOOLEAN;
    has_token_hash BOOLEAN;
    con            RECORD;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'password_reset_tokens' AND column_name = 'token')
      INTO has_token;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'password_reset_tokens' AND column_name = 'token_hash')
      INTO has_token_hash;

    -- Gỡ các ràng buộc UNIQUE (không phải khóa chính) trên bảng; tên do PostgreSQL/Hibernate sinh nên không cố định
    FOR con IN
        SELECT conname FROM pg_constraint
         WHERE conrelid = 'password_reset_tokens'::regclass AND contype = 'u'
    LOOP
        EXECUTE format('ALTER TABLE password_reset_tokens DROP CONSTRAINT %I', con.conname);
    END LOOP;

    IF has_token AND NOT has_token_hash THEN
        ALTER TABLE password_reset_tokens RENAME COLUMN token TO token_hash;
    ELSIF has_token AND has_token_hash THEN
        ALTER TABLE password_reset_tokens DROP COLUMN token;
    ELSIF NOT has_token_hash THEN
        ALTER TABLE password_reset_tokens ADD COLUMN token_hash VARCHAR(64) NOT NULL;
    END IF;
END $$;

DROP INDEX IF EXISTS idx_prt_token;
DROP INDEX IF EXISTS idx_prt_token_hash;

ALTER TABLE password_reset_tokens ALTER COLUMN token_hash TYPE VARCHAR(64);
ALTER TABLE password_reset_tokens ALTER COLUMN token_hash SET NOT NULL;
CREATE UNIQUE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);

COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hex của token gốc (32 byte SecureRandom, Base64 URL-safe). Token gốc chỉ nằm trong email, không lưu DB.';
