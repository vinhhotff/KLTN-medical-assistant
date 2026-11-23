package com.mediassist.dto;

import java.math.BigDecimal;
import java.util.List;

public class UpdateDoctorProfileRequest {

    private String fullName;
    private String phone;
    private String avatarUrl;
    private String bio;
    private String licenseNumber;
    private String licenseDocumentUrl;
    private BigDecimal consultationFee;
    private Integer yearsOfExperience;
    private List<String> specialtySlugs;

    private String academicTitle;
    private String hospitalAffiliation;
    private String department;
    private String licenseIssuedBy;
    private java.time.LocalDate licenseIssuedDate;
    private String scopeOfPractice;
    private Boolean submitForVerification;

    public UpdateDoctorProfileRequest() {}

    public java.time.LocalDate getLicenseIssuedDate() { return licenseIssuedDate; }
    public void setLicenseIssuedDate(java.time.LocalDate licenseIssuedDate) { this.licenseIssuedDate = licenseIssuedDate; }

    public String getScopeOfPractice() { return scopeOfPractice; }
    public void setScopeOfPractice(String scopeOfPractice) { this.scopeOfPractice = scopeOfPractice; }

    public Boolean getSubmitForVerification() { return submitForVerification; }
    public void setSubmitForVerification(Boolean submitForVerification) { this.submitForVerification = submitForVerification; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getLicenseDocumentUrl() { return licenseDocumentUrl; }
    public void setLicenseDocumentUrl(String licenseDocumentUrl) { this.licenseDocumentUrl = licenseDocumentUrl; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public List<String> getSpecialtySlugs() { return specialtySlugs; }
    public void setSpecialtySlugs(List<String> specialtySlugs) { this.specialtySlugs = specialtySlugs; }

    public String getAcademicTitle() { return academicTitle; }
    public void setAcademicTitle(String academicTitle) { this.academicTitle = academicTitle; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getLicenseIssuedBy() { return licenseIssuedBy; }
    public void setLicenseIssuedBy(String licenseIssuedBy) { this.licenseIssuedBy = licenseIssuedBy; }
}
