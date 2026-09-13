package com.mediassist.dto;

import java.math.BigDecimal;
import java.util.List;

public class AdminUpdateDoctorRequest {

    private String fullName;
    private String phone;
    private String academicTitle;
    private String hospitalAffiliation;
    private String department;
    private String licenseNumber;
    private String licenseIssuedBy;
    private BigDecimal consultationFee;
    private Integer yearsOfExperience;
    private List<String> specialtySlugs;
    private String bio;
    private Boolean isVerified;

    public AdminUpdateDoctorRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAcademicTitle() { return academicTitle; }
    public void setAcademicTitle(String academicTitle) { this.academicTitle = academicTitle; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getLicenseIssuedBy() { return licenseIssuedBy; }
    public void setLicenseIssuedBy(String licenseIssuedBy) { this.licenseIssuedBy = licenseIssuedBy; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public List<String> getSpecialtySlugs() { return specialtySlugs; }
    public void setSpecialtySlugs(List<String> specialtySlugs) { this.specialtySlugs = specialtySlugs; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public Boolean getIsVerified() { return isVerified; }
    public void setIsVerified(Boolean isVerified) { this.isVerified = isVerified; }
}
