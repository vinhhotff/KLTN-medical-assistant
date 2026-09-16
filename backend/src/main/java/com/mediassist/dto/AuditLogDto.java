package com.mediassist.dto;

import com.mediassist.model.entity.AuditLog;
import java.time.LocalDateTime;
import java.util.UUID;

public class AuditLogDto {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String action;
    private String resource;
    private String ipAddress;
    private String userAgent;
    private String metadata;
    private LocalDateTime createdAt;

    public AuditLogDto() {}

    public static AuditLogDto fromEntity(AuditLog log, String userEmail) {
        AuditLogDto dto = new AuditLogDto();
        dto.setId(log.getId());
        dto.setUserId(log.getUserId());
        dto.setUserEmail(userEmail != null ? userEmail : "Hệ Thống / Khách");
        dto.setAction(log.getAction());
        dto.setResource(log.getResource());
        dto.setIpAddress(log.getIpAddress() != null ? log.getIpAddress() : "127.0.0.1");
        dto.setUserAgent(log.getUserAgent());
        dto.setMetadata(log.getMetadata());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getResource() { return resource; }
    public void setResource(String resource) { this.resource = resource; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
