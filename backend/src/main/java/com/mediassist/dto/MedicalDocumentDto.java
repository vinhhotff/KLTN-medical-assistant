package com.mediassist.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mediassist.model.entity.MedicalDocument;

import java.time.LocalDateTime;
import java.util.UUID;

public class MedicalDocumentDto {
    private UUID id;
    private String fileName;
    private long fileSizeBytes;
    private String contentType;
    private String status;
    private String storageUrl;
    private boolean validMedical;
    private LocalDateTime createdAt;

    public MedicalDocumentDto() {}

    public static MedicalDocumentDto fromEntity(MedicalDocument doc) {
        MedicalDocumentDto dto = new MedicalDocumentDto();
        dto.setId(doc.getId());
        dto.setFileName(doc.getFileName());
        dto.setFileSizeBytes(doc.getFileSizeBytes());
        dto.setContentType(doc.getContentType());
        dto.setStatus(doc.getStatus());
        dto.setStorageUrl(doc.getStorageUrl());
        dto.setValidMedical(doc.isValidMedical());
        dto.setCreatedAt(doc.getCreatedAt());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStorageUrl() { return storageUrl; }
    public void setStorageUrl(String storageUrl) { this.storageUrl = storageUrl; }

    @JsonProperty("isValidMedical")
    public boolean isValidMedical() { return validMedical; }
    public void setValidMedical(boolean validMedical) { this.validMedical = validMedical; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
