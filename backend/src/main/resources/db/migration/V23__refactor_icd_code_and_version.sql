-- ===================================================================
-- V23: Chuẩn hóa cột chẩn đoán bệnh quốc tế ICD (icd_code & icd_version)
-- 1. Đổi tên cột chẩn đoán ("icd-10" / icd10 / icd10_code) -> icd_code VARCHAR(20).
-- 2. Thêm cột icd_version VARCHAR(10) NOT NULL DEFAULT 'ICD-10' (hỗ trợ đa phiên bản ICD-10 / ICD-11).
-- 3. Tạo chỉ mục B-Tree (Partial Index & Composite Index) tối ưu tìm kiếm theo icd_code.
-- Idempotent: An toàn khi chạy trên DB đã tồn tại dữ liệu hoặc chạy lại nhiều lần.
-- ===================================================================

DO $$
DECLARE
    has_hyphen_col BOOLEAN;
    has_icd10_col  BOOLEAN;
    has_legacy_col BOOLEAN;
    has_new_col    BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'appointments' AND column_name = 'icd-10'
    ) INTO has_hyphen_col;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'appointments' AND column_name = 'icd10'
    ) INTO has_icd10_col;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'appointments' AND column_name = 'icd10_code'
    ) INTO has_legacy_col;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'appointments' AND column_name = 'icd_code'
    ) INTO has_new_col;

    IF NOT has_new_col THEN
        IF has_hyphen_col THEN
            ALTER TABLE appointments RENAME COLUMN "icd-10" TO icd_code;
        ELSIF has_icd10_col THEN
            ALTER TABLE appointments RENAME COLUMN icd10 TO icd_code;
        ELSIF has_legacy_col THEN
            ALTER TABLE appointments RENAME COLUMN icd10_code TO icd_code;
        ELSE
            ALTER TABLE appointments ADD COLUMN icd_code VARCHAR(20);
        END IF;
    ELSE
        -- Nếu cột icd_code đã được tạo trước (ví dụ bởi Hibernate ddl-auto=update), đồng bộ dữ liệu từ cột cũ sang rồi xóa cột cũ
        IF has_hyphen_col THEN
            UPDATE appointments SET icd_code = "icd-10" WHERE icd_code IS NULL AND "icd-10" IS NOT NULL;
            ALTER TABLE appointments DROP COLUMN "icd-10";
        END IF;
        IF has_icd10_col THEN
            UPDATE appointments SET icd_code = icd10 WHERE icd_code IS NULL AND icd10 IS NOT NULL;
            ALTER TABLE appointments DROP COLUMN icd10;
        END IF;
        IF has_legacy_col THEN
            UPDATE appointments SET icd_code = icd10_code WHERE icd_code IS NULL AND icd10_code IS NOT NULL;
            ALTER TABLE appointments DROP COLUMN icd10_code;
        END IF;
    END IF;
END $$;

-- Đảm bảo kiểu dữ liệu của icd_code chuẩn VARCHAR(20)
ALTER TABLE appointments
    ALTER COLUMN icd_code TYPE VARCHAR(20);

-- Thêm cột icd_version VARCHAR(10) DEFAULT 'ICD-10'
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS icd_version VARCHAR(10) NOT NULL DEFAULT 'ICD-10';

-- Backfill dữ liệu mặc định cho các bản ghi hiện hữu nếu bị NULL hoặc rỗng
UPDATE appointments
   SET icd_version = 'ICD-10'
 WHERE icd_version IS NULL OR btrim(icd_version) = '';

ALTER TABLE appointments ALTER COLUMN icd_version SET DEFAULT 'ICD-10';
ALTER TABLE appointments ALTER COLUMN icd_version SET NOT NULL;

-- Tạo chỉ mục B-Tree tối ưu tìm kiếm theo mã bệnh icd_code (Partial Index cho các ca đã có mã chẩn đoán)
CREATE INDEX IF NOT EXISTS idx_appointments_icd_code
    ON appointments(icd_code)
    WHERE icd_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_icd_version_code
    ON appointments(icd_version, icd_code)
    WHERE icd_code IS NOT NULL;

COMMENT ON COLUMN appointments.icd_code IS 'Mã chẩn đoán bệnh quốc tế chuẩn hóa (VD: I10, I20.9, K21.0, E11.9). Đổi tên từ icd10_code / icd-10 tại V23.';
COMMENT ON COLUMN appointments.icd_version IS 'Phiên bản danh mục phân loại bệnh quốc tế (Mặc định: ICD-10, sẵn sàng nâng cấp ICD-11).';

-- ===================================================================
-- DOWN MIGRATION / ROLLBACK SCRIPT (Dành cho DBA khi cần hoàn tác)
-- ===================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_appointments_icd_version_code;
-- DROP INDEX IF EXISTS idx_appointments_icd_code;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS icd_version;
-- ALTER TABLE appointments RENAME COLUMN icd_code TO icd10_code;
-- -- (Hoặc nếu rollback về tên cột "icd-10"):
-- -- ALTER TABLE appointments RENAME COLUMN icd_code TO "icd-10";
-- COMMIT;
