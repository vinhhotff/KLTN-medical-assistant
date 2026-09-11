package com.mediassist.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class DoctorMatchDto {

    private UUID doctorId;
    private String fullName;
    private String bio;
    private String licenseNumber;
    private int yearsOfExperience;
    private BigDecimal consultationFee;
    private double similarityScore;
    private List<String> specialties;
    private String academicTitle;
    private String hospitalAffiliation;

    public DoctorMatchDto() {}

    public DoctorMatchDto(UUID doctorId, String fullName, String bio, String licenseNumber,
                          int yearsOfExperience, BigDecimal consultationFee, double similarityScore,
                          List<String> specialties) {
        this(doctorId, fullName, bio, licenseNumber, yearsOfExperience, consultationFee, similarityScore, specialties, "TS.BS", "BV Đại Học Y Dược TP.HCM");
    }

    public DoctorMatchDto(UUID doctorId, String fullName, String bio, String licenseNumber,
                          int yearsOfExperience, BigDecimal consultationFee, double similarityScore,
                          List<String> specialties, String academicTitle, String hospitalAffiliation) {
        this.doctorId = doctorId;
        this.fullName = fullName;
        this.bio = bio;
        this.licenseNumber = licenseNumber;
        this.yearsOfExperience = yearsOfExperience;
        this.consultationFee = consultationFee;
        this.similarityScore = similarityScore;
        this.specialties = specialties;
        this.academicTitle = academicTitle != null ? academicTitle : "TS.BS";
        this.hospitalAffiliation = hospitalAffiliation != null ? hospitalAffiliation : "BV Đại Học Y Dược TP.HCM";
    }

    public UUID getDoctorId() { return doctorId; }
    public void setDoctorId(UUID doctorId) { this.doctorId = doctorId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public int getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(int yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public double getSimilarityScore() { return similarityScore; }
    public void setSimilarityScore(double similarityScore) { this.similarityScore = similarityScore; }

    public List<String> getSpecialties() { return specialties; }
    public void setSpecialties(List<String> specialties) { this.specialties = specialties; }

    public String getAcademicTitle() { return academicTitle; }
    public void setAcademicTitle(String academicTitle) { this.academicTitle = academicTitle; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }
}
