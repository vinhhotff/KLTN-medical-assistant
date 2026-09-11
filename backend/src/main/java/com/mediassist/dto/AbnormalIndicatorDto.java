package com.mediassist.dto;

public class AbnormalIndicatorDto {

    private String name;
    private String value;
    private String unit;
    private String referenceRange;
    private String status; // ELEVATED, NORMAL, LOW
    private String clinicalSignificance;

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
}
