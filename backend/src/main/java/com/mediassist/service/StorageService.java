package com.mediassist.service;

import java.time.Instant;
import java.util.UUID;

/**
 * Lưu trữ tệp y tế gốc. Quy ước giá trị storage path:
 * - Bắt đầu bằng "/uploads/": tệp local (fallback môi trường dev).
 * - Còn lại: object key trong bucket Supabase PRIVATE (ví dụ patients/{userId}/{random}_{tên}).
 */
public interface StorageService {

    String ERROR_FILE_NOT_AVAILABLE = "FILE_NOT_AVAILABLE";
    String ERROR_STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE";

    /**
     * Uploads medical document binary to private cloud storage (Supabase) or local fallback.
     *
     * @return object key trên Supabase, đường dẫn local "/uploads/...", hoặc null nếu không lưu được tệp
     */
    String uploadDocument(byte[] fileBytes, String fileName, String contentType, UUID userId);

    /**
     * Deletes medical document from storage (used in rollback compensating hooks to eliminate orphan files).
     *
     * @param storagePath object key, đường dẫn local, hoặc URL public kiểu cũ (tương thích ngược)
     * @return true if successfully deleted, false otherwise
     */
    boolean deleteDocument(String storagePath);

    /**
     * Tạo signed URL ngắn hạn cho object trên bucket private.
     *
     * @throws com.mediassist.common.AppException 404 FILE_NOT_AVAILABLE khi object không tồn tại,
     *                                            503 STORAGE_UNAVAILABLE khi Supabase lỗi / chưa cấu hình
     */
    SignedUrl createSignedUrl(String objectKey, boolean download, String downloadFileName);

    /** Thời gian sống của signed URL (giây), lấy từ app.storage.signed-url-ttl-seconds. */
    int getSignedUrlTtlSeconds();

    record SignedUrl(String url, Instant expiresAt, int expiresInSeconds) {
        @Override
        public String toString() {
            // Không bao giờ in URL chứa token ra log
            return "SignedUrl[expiresAt=" + expiresAt + ", expiresInSeconds=" + expiresInSeconds + "]";
        }
    }
}
