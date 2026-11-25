package com.mediassist.service;

import java.time.Instant;
import java.util.UUID;

/**
 * Lưu trữ tệp y tế và hình ảnh hệ thống (Supabase Cloud Storage & Local Fallback).
 * Quy ước giá trị storage path:
 * - Bắt đầu bằng "/uploads/": tệp local (fallback môi trường dev).
 * - Còn lại: object key trong bucket Supabase (ví dụ patients/{userId}/{random}_{tên}, avatars/...).
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
     * Upload tổng quát cho ảnh và tài liệu (Avatar bác sĩ/bệnh nhân, chứng chỉ CCHN, ảnh y tế...).
     *
     * @param fileBytes byte mảng dữ liệu tệp
     * @param fileName tên tệp gốc
     * @param contentType kiểu MIME (VD: image/jpeg, image/png, application/pdf)
     * @param folder thư mục con trong bucket (VD: avatars, licenses, medical_documents)
     * @param userId ID người dùng thực hiện upload
     * @return FileUploadResult chứa URL công khai, storage path, metadata
     */
    FileUploadResult uploadFile(byte[] fileBytes, String fileName, String contentType, String folder, UUID userId);

    /**
     * Deletes document from storage (used in rollback compensating hooks to eliminate orphan files).
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

    record FileUploadResult(String url, String storagePath, String fileName, long fileSizeBytes, String contentType) {}
}
