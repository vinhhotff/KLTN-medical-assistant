package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "triage_sessions", indexes = {
        @Index(name = "idx_triage_user", columnList = "user_id"),
        @Index(name = "idx_triage_urgency", columnList = "urgency_level"),
        @Index(name = "idx_triage_created_at", columnList = "created_at")
})
public class TriageSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column
    private String patientName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String symptomsText;

    @Column(nullable = false)
    private boolean isEmergency = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TriageUrgencyLevel urgencyLevel;

    @Column
    private String primarySpecialty;

    @Column(columnDefinition = "TEXT")
    private String sbarSummary;

    @Column(columnDefinition = "TEXT")
    private String aiAdvice;

    @Column(columnDefinition = "TEXT")
    private String conversationHistory;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public TriageSession() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getSymptomsText() { return symptomsText; }
    public void setSymptomsText(String symptomsText) { this.symptomsText = symptomsText; }

    public boolean isEmergency() { return isEmergency; }
    public void setEmergency(boolean emergency) { isEmergency = emergency; }

    public TriageUrgencyLevel getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(TriageUrgencyLevel urgencyLevel) { this.urgencyLevel = urgencyLevel; }

    public String getPrimarySpecialty() { return primarySpecialty; }
    public void setPrimarySpecialty(String primarySpecialty) { this.primarySpecialty = primarySpecialty; }

    public String getSbarSummary() { return sbarSummary; }
    public void setSbarSummary(String sbarSummary) { this.sbarSummary = sbarSummary; }

    public String getAiAdvice() { return aiAdvice; }
    public void setAiAdvice(String aiAdvice) { this.aiAdvice = aiAdvice; }

    public String getConversationHistory() { return conversationHistory; }
    public void setConversationHistory(String conversationHistory) { this.conversationHistory = conversationHistory; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
