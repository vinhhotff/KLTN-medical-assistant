package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "consultation_messages", indexes = {
        @Index(name = "idx_consultation_messages_appt_created", columnList = "appointment_id, created_at")
})
public class ConsultationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "sender_role", nullable = false, length = 30)
    private String senderRole;

    @Column(name = "sender_name", nullable = false, length = 150)
    private String senderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 30)
    private ConsultationMessageType messageType = ConsultationMessageType.TEXT;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "attachment_url", columnDefinition = "TEXT")
    private String attachmentUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ConsultationMessage() {}

    public ConsultationMessage(UUID id, Appointment appointment, UUID senderId, String senderRole, String senderName,
                               ConsultationMessageType messageType, String content, String attachmentUrl,
                               LocalDateTime createdAt) {
        this.id = id;
        this.appointment = appointment;
        this.senderId = senderId;
        this.senderRole = senderRole;
        this.senderName = senderName;
        this.messageType = messageType != null ? messageType : ConsultationMessageType.TEXT;
        this.content = content;
        this.attachmentUrl = attachmentUrl;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Appointment getAppointment() { return appointment; }
    public void setAppointment(Appointment appointment) { this.appointment = appointment; }

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
