package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_documents", indexes = {
        @Index(name = "idx_med_doc_user", columnList = "user_id"),
        @Index(name = "idx_med_doc_created", columnList = "createdAt")
})
public class MedicalDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private long fileSizeBytes;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false, length = 30)
    private String status = "PROCESSED";

    @Column(name = "storage_url")
    private String storageUrl;

    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(name = "is_valid_medical", nullable = false)
    private boolean isValidMedical = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public MedicalDocument() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

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

    public String getFileHash() { return fileHash; }
    public void setFileHash(String fileHash) { this.fileHash = fileHash; }

    public boolean isValidMedical() { return isValidMedical; }
    public void setValidMedical(boolean validMedical) { isValidMedical = validMedical; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
