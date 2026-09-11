package com.mediassist.service;

import java.util.UUID;

public interface StorageService {
    /**
     * Uploads medical document binary to cloud storage (Supabase) or local fallback.
     *
     * @param fileBytes   Binary contents of the document
     * @param fileName    Original or sanitized file name
     * @param contentType MIME type (e.g. application/pdf, image/jpeg)
     * @param userId      ID of the patient/user uploading the file
     * @return Public or accessible URL/path of the stored object
     */
    String uploadDocument(byte[] fileBytes, String fileName, String contentType, UUID userId);
}
