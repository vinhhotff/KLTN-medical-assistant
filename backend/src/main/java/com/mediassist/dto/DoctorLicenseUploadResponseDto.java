package com.mediassist.dto;

import java.time.Instant;

/**
 * DTO phản hồi sau khi Bác sĩ tải lên bản scan Chứng chỉ hành nghề (CCHN).
 * Tệp được lưu trữ trên bucket Supabase Storage PRIVATE, chỉ truy cập qua signed URL ngắn hạn.
 */
public record DoctorLicenseUploadResponseDto(
        String storagePath,
        String viewUrl,
        String fileName,
        String contentType,
        long fileSizeBytes,
        Instant expiresAt,
        int expiresInSeconds,
        String verificationStatus
) {}
