package com.mediassist.dto.clinical;

/**
 * Standardized Drug-Allergy Conflict alert DTO.
 */
public class DrugAllergyConflictDto {

    private String drugName;
    private String matchedIngredient;
    private String drugClass;
    private String patientAllergy;
    private String severity; // "CRITICAL", "HIGH", "MODERATE"
    private String warning;

    public DrugAllergyConflictDto() {}

    public DrugAllergyConflictDto(String drugName, String matchedIngredient, String drugClass,
                                  String patientAllergy, String severity, String warning) {
        this.drugName = drugName;
        this.matchedIngredient = matchedIngredient;
        this.drugClass = drugClass;
        this.patientAllergy = patientAllergy;
        this.severity = severity;
        this.warning = warning;
    }

    public String getDrugName() {
        return drugName;
    }

    public void setDrugName(String drugName) {
        this.drugName = drugName;
    }

    public String getMatchedIngredient() {
        return matchedIngredient;
    }

    public void setMatchedIngredient(String matchedIngredient) {
        this.matchedIngredient = matchedIngredient;
    }

    public String getDrugClass() {
        return drugClass;
    }

    public void setDrugClass(String drugClass) {
        this.drugClass = drugClass;
    }

    public String getPatientAllergy() {
        return patientAllergy;
    }

    public void setPatientAllergy(String patientAllergy) {
        this.patientAllergy = patientAllergy;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getWarning() {
        return warning;
    }

    public void setWarning(String warning) {
        this.warning = warning;
    }
}
