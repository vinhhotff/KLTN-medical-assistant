package com.mediassist.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mediassist.model.entity.TriageSession;
import com.mediassist.model.entity.TriageUrgencyLevel;

import java.time.LocalDateTime;
import java.util.UUID;

public class TriageSessionDto {
    private UUID id;
    private String patientName;
    private String symptomsText;
    private boolean emergency;
    private TriageUrgencyLevel urgencyLevel;
    private String primarySpecialty;
    private String sbarSummary;
    private String aiAdvice;
    private String conversationHistory;
    private LocalDateTime createdAt;

    public TriageSessionDto() {}

    public static TriageSessionDto fromEntity(TriageSession session) {
        TriageSessionDto dto = new TriageSessionDto();
        dto.setId(session.getId());
        dto.setPatientName(session.getPatientName());
        dto.setSymptomsText(session.getSymptomsText());
        dto.setEmergency(session.isEmergency());
        dto.setUrgencyLevel(session.getUrgencyLevel());
        dto.setPrimarySpecialty(session.getPrimarySpecialty());
        dto.setSbarSummary(session.getSbarSummary());
        dto.setAiAdvice(session.getAiAdvice());
        dto.setConversationHistory(session.getConversationHistory());
        dto.setCreatedAt(session.getCreatedAt());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getSymptomsText() { return symptomsText; }
    public void setSymptomsText(String symptomsText) { this.symptomsText = symptomsText; }

    @JsonProperty("isEmergency")
    public boolean isEmergency() { return emergency; }
    public void setEmergency(boolean emergency) { this.emergency = emergency; }

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
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
