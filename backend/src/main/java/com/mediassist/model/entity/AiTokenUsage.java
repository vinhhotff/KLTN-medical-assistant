package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_token_usage", indexes = {
        @Index(name = "idx_ai_token_created_at", columnList = "created_at"),
        @Index(name = "idx_ai_token_service_type", columnList = "service_type"),
        @Index(name = "idx_ai_token_request_status", columnList = "request_status")
})
public class AiTokenUsage {

    public enum ServiceType {
        TRIAGE,
        DOCUMENT_ANALYSIS
    }

    public enum RequestStatus {
        SUCCESS,
        ERROR,
        TIMEOUT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", length = 50)
    private ServiceType serviceType; // TRIAGE, DOCUMENT_ANALYSIS

    @Column(name = "model_name", length = 100, nullable = false)
    private String modelName; // "gemini-3.6-flash", "gpt-4o"

    @Column(name = "prompt_tokens")
    private Integer promptTokens = 0;

    @Column(name = "completion_tokens")
    private Integer completionTokens = 0;

    @Column(name = "total_tokens")
    private Integer totalTokens = 0;

    @Column(name = "cost_usd", precision = 10, scale = 6)
    private BigDecimal costUsd = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_status", length = 30)
    private RequestStatus requestStatus = RequestStatus.SUCCESS; // SUCCESS, ERROR, TIMEOUT

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    public AiTokenUsage() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ServiceType getServiceType() {
        return serviceType;
    }

    public void setServiceType(ServiceType serviceType) {
        this.serviceType = serviceType;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public Integer getPromptTokens() {
        return promptTokens;
    }

    public void setPromptTokens(Integer promptTokens) {
        this.promptTokens = promptTokens;
    }

    public Integer getCompletionTokens() {
        return completionTokens;
    }

    public void setCompletionTokens(Integer completionTokens) {
        this.completionTokens = completionTokens;
    }

    public Integer getTotalTokens() {
        return totalTokens;
    }

    public void setTotalTokens(Integer totalTokens) {
        this.totalTokens = totalTokens;
    }

    public BigDecimal getCostUsd() {
        return costUsd;
    }

    public void setCostUsd(BigDecimal costUsd) {
        this.costUsd = costUsd;
    }

    public RequestStatus getRequestStatus() {
        return requestStatus;
    }

    public void setRequestStatus(RequestStatus requestStatus) {
        this.requestStatus = requestStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public void setAppointment(Appointment appointment) {
        this.appointment = appointment;
    }
}
