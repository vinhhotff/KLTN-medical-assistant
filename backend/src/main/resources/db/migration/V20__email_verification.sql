-- ===================================================================
-- V20: Xác thực địa chỉ email khi đăng ký
-- - users.email_verified (BOOLEAN NOT NULL DEFAULT FALSE) + users.email_verified_at.
--   V1 đã tạo cột users.is_email_verified nhưng entity chưa từng map (mọi dòng đều FALSE, vô nghĩa)
--   => ĐỔI TÊN cột đó thành email_verified thay vì thêm cột thứ hai cùng ý nghĩa.
-- - BACKFILL TRUE cho toàn bộ người dùng đã tồn tại trước migration (tài khoản seed/demo, Google, bác sĩ)
--   để không chặn đặt lịch/thanh toán của tài khoản cũ. Chỉ tài khoản đăng ký MỚI sau V20 mới cần xác thực.
-- - Bảng email_verification_tokens: chỉ lưu SHA-256 hash của token (giống password_reset_tokens sau V19).
-- Idempotent: an toàn khi chạy trên DB đã có sẵn cột/bảng.
-- ===================================================================

DO $$
DECLARE
    has_legacy BOOLEAN;
    has_new    BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'is_email_verified')
      INTO has_legacy;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'email_verified')
      INTO has_new;

    IF NOT has_new THEN
        IF has_legacy THEN
            ALTER TABLE users RENAME COLUMN is_email_verified TO email_verified;
        ELSE
            ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        -- Backfill chỉ chạy đúng một lần (khi cột email_verified vừa xuất hiện): mọi user hiện có coi như đã xác thực
        UPDATE users SET email_verified = TRUE;
    ELSIF has_legacy THEN
        -- Cả hai cột cùng tồn tại: giữ email_verified, bỏ cột cũ không dùng
        ALTER TABLE users DROP COLUMN is_email_verified;
    END IF;
END $$;

ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
UPDATE users SET email_verified_at = COALESCE(created_at, CURRENT_TIMESTAMP)
 WHERE email_verified = TRUE AND email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evt_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_evt_user_id ON email_verification_tokens(user_id);

COMMENT ON COLUMN users.email_verified IS 'TRUE khi người dùng đã chứng minh sở hữu email (link xác thực, đặt lại mật khẩu, Google OAuth, admin tạo). PATIENT chưa xác thực không được đặt lịch/thanh toán.';
COMMENT ON COLUMN email_verification_tokens.token_hash IS 'SHA-256 hex của token gốc. Token gốc chỉ nằm trong email, hết hạn sau 24 giờ.';
