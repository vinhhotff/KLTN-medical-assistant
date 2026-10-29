package com.mediassist.dto;

public class AbnormalIndicatorDto {

    private String name;
    private String value;
    private String unit;
    private String referenceRange;
    private String status; // ELEVATED, NORMAL, LOW
    private String clinicalSignificance;

    // Evidence-grounding fields (LOINC / QĐ 3280/BYT)
    private String loincCode;           // International LOINC code (e.g., "2345-7")
    private String bytReferenceRange;   // MOH Vietnam standard ref range (e.g., "3.9 - 6.4 mmol/L")
    private String scientificBasis;     // Citation trail (e.g., "QĐ 3280/QĐ-BYT, LOINC 2345-7")

    public AbnormalIndicatorDto() {}

    public AbnormalIndicatorDto(String name, String value, String unit, String referenceRange, String status, String clinicalSignificance) {
        this.name = name;
        this.value = value;
        this.unit = unit;
        this.referenceRange = referenceRange;
        this.status = status;
        this.clinicalSignificance = clinicalSignificance;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getReferenceRange() { return referenceRange; }
    public void setReferenceRange(String referenceRange) { this.referenceRange = referenceRange; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getClinicalSignificance() { return clinicalSignificance; }
    public void setClinicalSignificance(String clinicalSignificance) { this.clinicalSignificance = clinicalSignificance; }

    public String getLoincCode() { return loincCode; }
    public void setLoincCode(String loincCode) { this.loincCode = loincCode; }

    public String getBytReferenceRange() { return bytReferenceRange; }
    public void setBytReferenceRange(String bytReferenceRange) { this.bytReferenceRange = bytReferenceRange; }

    public String getScientificBasis() { return scientificBasis; }
    public void setScientificBasis(String scientificBasis) { this.scientificBasis = scientificBasis; }
}
