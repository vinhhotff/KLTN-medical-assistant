package com.mediassist.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.User;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class DoctorDetailDto {

    private UUID id;            // User ID
    private UUID profileId;     // DoctorProfile ID
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private String bio;
    private String licenseNumber;
    private String licenseDocumentUrl;
    private String licenseDocumentStoragePath;
    private boolean hasLicenseDocument;
    private BigDecimal consultationFee;
    private Integer yearsOfExperience;
    @JsonProperty("isVerified")
    private boolean isVerified;
    private String verificationStatus;
    private String rejectionReason;
    private java.time.LocalDateTime rejectionAt;
    private java.time.LocalDate licenseIssuedDate;
    private String scopeOfPractice;
    private List<String> specialties;
    private String academicTitle;
    private String hospitalAffiliation;
    private String department;
    private String licenseIssuedBy;
    private Double rating;
    private Integer totalConsultations;
    private Integer reviewCount;
    private String userStatus;
    private java.time.LocalDateTime createdAt;

    public DoctorDetailDto() {}

    public static DoctorDetailDto fromEntity(DoctorProfile profile) {
        DoctorDetailDto dto = new DoctorDetailDto();
        dto.setProfileId(profile.getId());
        User u = profile.getUser();
        if (u != null) {
            dto.setId(u.getId());
            dto.setFullName(u.getFullName());
            dto.setEmail(u.getEmail());
            dto.setPhone(u.getPhone());
            dto.setAvatarUrl(u.getAvatarUrl());
            dto.setUserStatus(u.getStatus() != null ? u.getStatus().name() : "ACTIVE");
            dto.setCreatedAt(profile.getCreatedAt() != null ? profile.getCreatedAt() : u.getCreatedAt());
        }
        dto.setBio(profile.getBio());
        dto.setLicenseNumber(profile.getLicenseNumber());
        dto.setLicenseDocumentUrl(profile.getLicenseDocumentUrl());
        dto.setLicenseDocumentStoragePath(profile.getLicenseDocumentStoragePath());
        dto.setHasLicenseDocument(
                (profile.getLicenseDocumentStoragePath() != null && !profile.getLicenseDocumentStoragePath().isBlank()) ||
                (profile.getLicenseDocumentUrl() != null && !profile.getLicenseDocumentUrl().isBlank())
        );
        dto.setConsultationFee(profile.getConsultationFee());
        dto.setYearsOfExperience(profile.getYearsOfExperience());
        dto.setVerified(profile.isVerified());
        dto.setVerificationStatus(profile.getVerificationStatus() != null ? profile.getVerificationStatus().name() : (profile.isVerified() ? "APPROVED" : "UNSUBMITTED"));
        dto.setRejectionReason(profile.getRejectionReason());
        dto.setRejectionAt(profile.getRejectionAt());
        dto.setLicenseIssuedDate(profile.getLicenseIssuedDate());
        dto.setScopeOfPractice(profile.getScopeOfPractice());
        dto.setAcademicTitle(profile.getAcademicTitle());
        dto.setHospitalAffiliation(profile.getHospitalAffiliation());
        dto.setDepartment(profile.getDepartment());
        dto.setLicenseIssuedBy(profile.getLicenseIssuedBy());
        dto.setReviewCount(profile.getReviewCount() != null ? profile.getReviewCount() : 0);
        dto.setRating(profile.getReviewCount() != null && profile.getReviewCount() > 0 ? profile.getRating() : null);
        dto.setTotalConsultations(profile.getTotalConsultations() != null ? profile.getTotalConsultations() : 0);
        if (profile.getSpecialties() != null) {
            dto.setSpecialties(profile.getSpecialties().stream()
                    .map(Specialty::getName)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getProfileId() { return profileId; }
    public void setProfileId(UUID profileId) { this.profileId = profileId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    @JsonProperty("isVerified")
    public boolean isVerified() { return isVerified; }
    @JsonProperty("isVerified")
    public void setVerified(boolean verified) { isVerified = verified; }

    public List<String> getSpecialties() { return specialties; }
    public void setSpecialties(List<String> specialties) { this.specialties = specialties; }

    public String getAcademicTitle() { return academicTitle; }
    public void setAcademicTitle(String academicTitle) { this.academicTitle = academicTitle; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getLicenseIssuedBy() { return licenseIssuedBy; }
    public void setLicenseIssuedBy(String licenseIssuedBy) { this.licenseIssuedBy = licenseIssuedBy; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getTotalConsultations() { return totalConsultations; }
    public void setTotalConsultations(Integer totalConsultations) { this.totalConsultations = totalConsultations; }

    public Integer getReviewCount() { return reviewCount != null ? reviewCount : 0; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public String getUserStatus() { return userStatus; }
    public void setUserStatus(String userStatus) { this.userStatus = userStatus; }

    public String getLicenseDocumentStoragePath() { return licenseDocumentStoragePath; }
    public void setLicenseDocumentStoragePath(String licenseDocumentStoragePath) { this.licenseDocumentStoragePath = licenseDocumentStoragePath; }

    public boolean isHasLicenseDocument() { return hasLicenseDocument; }
    public void setHasLicenseDocument(boolean hasLicenseDocument) { this.hasLicenseDocument = hasLicenseDocument; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public java.time.LocalDateTime getRejectionAt() { return rejectionAt; }
    public void setRejectionAt(java.time.LocalDateTime rejectionAt) { this.rejectionAt = rejectionAt; }

    public java.time.LocalDate getLicenseIssuedDate() { return licenseIssuedDate; }
    public void setLicenseIssuedDate(java.time.LocalDate licenseIssuedDate) { this.licenseIssuedDate = licenseIssuedDate; }

    public String getScopeOfPractice() { return scopeOfPractice; }
    public void setScopeOfPractice(String scopeOfPractice) { this.scopeOfPractice = scopeOfPractice; }

    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }
}
