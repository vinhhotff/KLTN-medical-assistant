package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_documents", indexes = {
        @Index(name = "idx_med_doc_user", columnList = "user_id"),
        @Index(name = "idx_med_doc_created", columnList = "created_at"),
        @Index(name = "idx_med_doc_hash", columnList = "user_id, file_hash")
})
public class MedicalDocument {

    public static final String LOCAL_PREFIX = "/uploads/";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @com.fasterxml.jackson.annotation.JsonIgnore
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

    /**
     * Khóa đối tượng lưu trữ (KHÔNG phải URL công khai).
     * - Bắt đầu bằng "/uploads/": tệp local (fallback dev).
     * - Còn lại: object key trong bucket Supabase PRIVATE, chỉ xem qua signed URL ngắn hạn.
     */
    @Column(name = "storage_path")
    private String storagePath;

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

    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }

    @Transient
    public boolean hasStoredFile() { return storagePath != null && !storagePath.isBlank(); }

    @Transient
    public boolean isLocalFile() { return storagePath != null && storagePath.startsWith(LOCAL_PREFIX); }

    public String getFileHash() { return fileHash; }
    public void setFileHash(String fileHash) { this.fileHash = fileHash; }

    public boolean isValidMedical() { return isValidMedical; }
    public void setValidMedical(boolean validMedical) { isValidMedical = validMedical; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
