package com.mediassist.dto;

import com.mediassist.model.entity.ConsultationMessage;
import com.mediassist.model.entity.ConsultationMessageType;

import java.time.LocalDateTime;
import java.util.UUID;

public class ConsultationMessageDto {

    private UUID id;
    private UUID appointmentId;
    private UUID senderId;
    private String senderRole;
    private String senderName;
    private ConsultationMessageType messageType = ConsultationMessageType.TEXT;
    private String content;
    private String attachmentUrl;
    private LocalDateTime createdAt;

    public ConsultationMessageDto() {}

    public ConsultationMessageDto(UUID id, UUID appointmentId, UUID senderId, String senderRole, String senderName,
                                  ConsultationMessageType messageType, String content, String attachmentUrl,
                                  LocalDateTime createdAt) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.senderId = senderId;
        this.senderRole = senderRole;
        this.senderName = senderName;
        this.messageType = messageType != null ? messageType : ConsultationMessageType.TEXT;
        this.content = content;
        this.attachmentUrl = attachmentUrl;
        this.createdAt = createdAt;
    }

    public static ConsultationMessageDto fromEntity(ConsultationMessage entity) {
        if (entity == null) return null;
        return new ConsultationMessageDto(
                entity.getId(),
                entity.getAppointment() != null ? entity.getAppointment().getId() : null,
                entity.getSenderId(),
                entity.getSenderRole(),
                entity.getSenderName(),
                entity.getMessageType(),
                entity.getContent(),
                entity.getAttachmentUrl(),
                entity.getCreatedAt()
        );
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAppointmentId() { return appointmentId; }
    public void setAppointmentId(UUID appointmentId) { this.appointmentId = appointmentId; }

    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }

    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public ConsultationMessageType getMessageType() {
        return messageType != null ? messageType : ConsultationMessageType.TEXT;
    }
    public void setMessageType(ConsultationMessageType messageType) {
        this.messageType = messageType != null ? messageType : ConsultationMessageType.TEXT;
    }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
