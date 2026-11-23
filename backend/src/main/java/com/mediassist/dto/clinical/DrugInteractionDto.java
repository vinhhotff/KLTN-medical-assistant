package com.mediassist.dto.clinical;

/**
 * Standardized Drug-Drug Interaction (DDI) alert DTO.
 */
public class DrugInteractionDto {

    private String drug1;
    private String drug2;
    private String severity; // "MAJOR", "SEVERE", "CONTRAINDICATED", "MODERATE"
    private String interactionType;
    private String description;
    private String clinicalGuidance;

    public DrugInteractionDto() {}

    public DrugInteractionDto(String drug1, String drug2, String severity,
                              String interactionType, String description, String clinicalGuidance) {
        this.drug1 = drug1;
        this.drug2 = drug2;
        this.severity = severity;
        this.interactionType = interactionType;
        this.description = description;
        this.clinicalGuidance = clinicalGuidance;
    }

    public String getDrug1() {
        return drug1;
    }

    public void setDrug1(String drug1) {
        this.drug1 = drug1;
    }

    public String getDrug2() {
        return drug2;
    }

    public void setDrug2(String drug2) {
        this.drug2 = drug2;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getInteractionType() {
        return interactionType;
    }

    public void setInteractionType(String interactionType) {
        this.interactionType = interactionType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getClinicalGuidance() {
        return clinicalGuidance;
    }

    public void setClinicalGuidance(String clinicalGuidance) {
        this.clinicalGuidance = clinicalGuidance;
    }
}
