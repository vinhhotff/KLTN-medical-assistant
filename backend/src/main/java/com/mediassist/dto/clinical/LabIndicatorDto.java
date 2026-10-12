package com.mediassist.dto.clinical;

public class LabIndicatorDto {

    private String id;
    private String loincCode;
    private String nameVi;
    private String nameEn;
    private String category;
    private String unit;
    private Double refRangeMin;
    private Double refRangeMax;
    private String refRangeText;
    private String clinicalRelevance;
    private String targetSpecialty;

    public LabIndicatorDto() {}

    public LabIndicatorDto(String id, String loincCode, String nameVi, String nameEn,
                           String category, String unit, Double refRangeMin, Double refRangeMax,
                           String refRangeText, String clinicalRelevance, String targetSpecialty) {
        this.id = id;
        this.loincCode = loincCode;
        this.nameVi = nameVi;
        this.nameEn = nameEn;
        this.category = category;
        this.unit = unit;
        this.refRangeMin = refRangeMin;
        this.refRangeMax = refRangeMax;
        this.refRangeText = refRangeText;
        this.clinicalRelevance = clinicalRelevance;
        this.targetSpecialty = targetSpecialty;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLoincCode() { return loincCode; }
    public void setLoincCode(String loincCode) { this.loincCode = loincCode; }

    public String getNameVi() { return nameVi; }
    public void setNameVi(String nameVi) { this.nameVi = nameVi; }

    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getRefRangeMin() { return refRangeMin; }
    public void setRefRangeMin(Double refRangeMin) { this.refRangeMin = refRangeMin; }

    public Double getRefRangeMax() { return refRangeMax; }
    public void setRefRangeMax(Double refRangeMax) { this.refRangeMax = refRangeMax; }

    public String getRefRangeText() { return refRangeText; }
    public void setRefRangeText(String refRangeText) { this.refRangeText = refRangeText; }

    public String getClinicalRelevance() { return clinicalRelevance; }
    public void setClinicalRelevance(String clinicalRelevance) { this.clinicalRelevance = clinicalRelevance; }

    public String getTargetSpecialty() { return targetSpecialty; }
    public void setTargetSpecialty(String targetSpecialty) { this.targetSpecialty = targetSpecialty; }
}
