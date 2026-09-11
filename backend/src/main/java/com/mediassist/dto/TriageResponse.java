package com.mediassist.dto;

import com.mediassist.model.entity.TriageUrgencyLevel;

import java.util.List;
import java.util.UUID;

public class TriageResponse {

    private UUID sessionId;
    private boolean isEmergency;
    private String emergencyAlert;
    private TriageUrgencyLevel urgencyLevel;
    private String primarySpecialtySlug;
    private String primarySpecialtyName;
    private String sbarSummary;
    private String aiAdvice;
    private List<String> clarifyingQuestions;
    private List<DoctorMatchDto> matchedDoctors;

    public TriageResponse() {}

    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }

    public boolean isEmergency() { return isEmergency; }
    public void setEmergency(boolean emergency) { isEmergency = emergency; }

    public String getEmergencyAlert() { return emergencyAlert; }
    public void setEmergencyAlert(String emergencyAlert) { this.emergencyAlert = emergencyAlert; }

    public TriageUrgencyLevel getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(TriageUrgencyLevel urgencyLevel) { this.urgencyLevel = urgencyLevel; }

    public String getPrimarySpecialtySlug() { return primarySpecialtySlug; }
    public void setPrimarySpecialtySlug(String primarySpecialtySlug) { this.primarySpecialtySlug = primarySpecialtySlug; }

    public String getPrimarySpecialtyName() { return primarySpecialtyName; }
    public void setPrimarySpecialtyName(String primarySpecialtyName) { this.primarySpecialtyName = primarySpecialtyName; }

    public String getSbarSummary() { return sbarSummary; }
    public void setSbarSummary(String sbarSummary) { this.sbarSummary = sbarSummary; }

    public String getAiAdvice() { return aiAdvice; }
    public void setAiAdvice(String aiAdvice) { this.aiAdvice = aiAdvice; }

    public List<String> getClarifyingQuestions() { return clarifyingQuestions; }
    public void setClarifyingQuestions(List<String> clarifyingQuestions) { this.clarifyingQuestions = clarifyingQuestions; }

    public List<DoctorMatchDto> getMatchedDoctors() { return matchedDoctors; }
    public void setMatchedDoctors(List<DoctorMatchDto> matchedDoctors) { this.matchedDoctors = matchedDoctors; }
}
