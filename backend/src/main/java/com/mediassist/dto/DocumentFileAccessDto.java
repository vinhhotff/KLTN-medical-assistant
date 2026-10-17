package com.mediassist.dto;

import java.time.Instant;

/**
 * Quyền xem tệp y tế gốc trong thời gian ngắn.
 * - Tệp trên Supabase: url là signed URL hết hạn sau expiresInSeconds giây.
 * - Tệp local (fallback dev): url trỏ về /api/v1/documents/{id}/file (đi qua backend có kiểm tra quyền), expiresAt = null.
 */
public class DocumentFileAccessDto {
    private String url;
    private Instant expiresAt;
    private Integer expiresInSeconds;
    private String fileName;
    private String contentType;

    public DocumentFileAccessDto() {}

    public DocumentFileAccessDto(String url, Instant expiresAt, Integer expiresInSeconds, String fileName, String contentType) {
        this.url = url;
        this.expiresAt = expiresAt;
        this.expiresInSeconds = expiresInSeconds;
        this.fileName = fileName;
        this.contentType = contentType;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Integer getExpiresInSeconds() { return expiresInSeconds; }
    public void setExpiresInSeconds(Integer expiresInSeconds) { this.expiresInSeconds = expiresInSeconds; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    @Override
    public String toString() {
        return "DocumentFileAccessDto[fileName=" + fileName + ", expiresAt=" + expiresAt + "]";
    }
}
