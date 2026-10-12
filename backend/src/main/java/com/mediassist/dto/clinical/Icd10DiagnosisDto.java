package com.mediassist.dto.clinical;

import java.util.List;

public class Icd10DiagnosisDto {

    private String code;
    private String nameVi;
    private String nameEn;
    private String chapter;
    private String specialtySlug;
    private String specialtyName;
    private List<String> commonSymptoms;

    public Icd10DiagnosisDto() {}

    public Icd10DiagnosisDto(String code, String nameVi, String nameEn, String chapter,
                             String specialtySlug, String specialtyName, List<String> commonSymptoms) {
        this.code = code;
        this.nameVi = nameVi;
        this.nameEn = nameEn;
        this.chapter = chapter;
        this.specialtySlug = specialtySlug;
        this.specialtyName = specialtyName;
        this.commonSymptoms = commonSymptoms;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getNameVi() { return nameVi; }
    public void setNameVi(String nameVi) { this.nameVi = nameVi; }

    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }

    public String getChapter() { return chapter; }
    public void setChapter(String chapter) { this.chapter = chapter; }

    public String getSpecialtySlug() { return specialtySlug; }
    public void setSpecialtySlug(String specialtySlug) { this.specialtySlug = specialtySlug; }

    public String getSpecialtyName() { return specialtyName; }
    public void setSpecialtyName(String specialtyName) { this.specialtyName = specialtyName; }

    public List<String> getCommonSymptoms() { return commonSymptoms; }
    public void setCommonSymptoms(List<String> commonSymptoms) { this.commonSymptoms = commonSymptoms; }
}
