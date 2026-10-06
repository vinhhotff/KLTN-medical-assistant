-- ===================================================================
-- V18: Private Document Storage (Supabase bucket PRIVATE + signed URL 15 phút)
-- - Đổi tên medical_documents.storage_url → storage_path (lưu object key, KHÔNG lưu URL public).
-- - Chuẩn hóa dữ liệu cũ dạng https://<host>/storage/v1/object/[public/|sign/|authenticated/]<bucket>/<key>[?...] → <key>.
-- - Giữ nguyên giá trị local "/uploads/...".
-- - Xóa đường dẫn giả "/uploads/medical_documents/default_emr.pdf" (trước đây trả về khi ghi file local lỗi).
-- Idempotent: an toàn trên DB dev đã có dữ liệu và trên DB mà Hibernate ddl-auto=update đã tự tạo cột storage_path.
-- ===================================================================

DO $$
DECLARE
    has_url  BOOLEAN;
    has_path BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'medical_documents' AND column_name = 'storage_url')
      INTO has_url;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'medical_documents' AND column_name = 'storage_path')
      INTO has_path;

    IF has_url AND NOT has_path THEN
        ALTER TABLE medical_documents RENAME COLUMN storage_url TO storage_path;
    ELSIF has_url AND has_path THEN
        UPDATE medical_documents SET storage_path = storage_url
         WHERE storage_path IS NULL AND storage_url IS NOT NULL;
        ALTER TABLE medical_documents DROP COLUMN storage_url;
    ELSIF NOT has_path THEN
        ALTER TABLE medical_documents ADD COLUMN storage_path TEXT;
    END IF;
END $$;

-- Chuyển URL Supabase kiểu cũ về object key trong bucket (bỏ host, prefix API, tên bucket và query string)
UPDATE medical_documents
   SET storage_path = regexp_replace(
           storage_path,
           '^https?://[^/]+/storage/v1/object/(public/|sign/|authenticated/)?[^/]+/([^?#]*).*$',
           '\2')
 WHERE storage_path ~ '^https?://[^/]+/storage/v1/object/';

-- Đường dẫn giả từ fallback local cũ → không có tệp
UPDATE medical_documents
   SET storage_path = NULL
 WHERE storage_path = '/uploads/medical_documents/default_emr.pdf';

-- Chuỗi rỗng → NULL để hasFile=false nhất quán
UPDATE medical_documents
   SET storage_path = NULL
 WHERE storage_path IS NOT NULL AND btrim(storage_path) = '';

COMMENT ON COLUMN medical_documents.storage_path IS
    'Object key trong bucket Supabase PRIVATE (vd patients/{userId}/{random}_{ten}) hoặc đường dẫn local /uploads/... (fallback dev). Không bao giờ trả ra API.';
