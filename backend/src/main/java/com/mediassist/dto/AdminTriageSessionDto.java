package com.mediassist.dto;

import com.mediassist.model.entity.TriageSession;
import com.mediassist.model.entity.TriageUrgencyLevel;
import java.time.LocalDateTime;
import java.util.UUID;

public class AdminTriageSessionDto {
    private UUID id;
    private UUID userId;
    private String patientName;
    private String patientEmail;
    private String symptomsText;
    private boolean isEmergency;
    private TriageUrgencyLevel urgencyLevel;
    private String primarySpecialty;
    private String sbarSummary;
    private String aiAdvice;
    private LocalDateTime createdAt;

    public AdminTriageSessionDto() {}

    public static AdminTriageSessionDto fromEntity(TriageSession session) {
        AdminTriageSessionDto dto = new AdminTriageSessionDto();
        dto.setId(session.getId());
        if (session.getUser() != null) {
            dto.setUserId(session.getUser().getId());
            dto.setPatientEmail(session.getUser().getEmail());
        }
        dto.setPatientName(session.getPatientName() != null ? session.getPatientName() : "Bệnh nhân ẩn danh");
        dto.setSymptomsText(session.getSymptomsText());
        dto.setEmergency(session.isEmergency());
        dto.setUrgencyLevel(session.getUrgencyLevel());
        dto.setPrimarySpecialty(session.getPrimarySpecialty());
        dto.setSbarSummary(session.getSbarSummary());
        dto.setAiAdvice(session.getAiAdvice());
        dto.setCreatedAt(session.getCreatedAt());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientEmail() { return patientEmail; }
    public void setPatientEmail(String patientEmail) { this.patientEmail = patientEmail; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
