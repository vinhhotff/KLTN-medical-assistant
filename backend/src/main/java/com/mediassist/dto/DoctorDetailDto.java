package com.mediassist.dto;

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
    private BigDecimal consultationFee;
    private int yearsOfExperience;
    private boolean isVerified;
    private List<String> specialties;
    private String academicTitle;
    private String hospitalAffiliation;
    private String department;
    private String licenseIssuedBy;
    private Double rating;
    private Integer totalConsultations;

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
        }
        dto.setBio(profile.getBio());
        dto.setLicenseNumber(profile.getLicenseNumber());
        dto.setConsultationFee(profile.getConsultationFee());
        dto.setYearsOfExperience(profile.getYearsOfExperience());
        dto.setVerified(profile.isVerified());
        dto.setAcademicTitle(profile.getAcademicTitle());
        dto.setHospitalAffiliation(profile.getHospitalAffiliation());
        dto.setDepartment(profile.getDepartment());
        dto.setLicenseIssuedBy(profile.getLicenseIssuedBy());
        dto.setRating(profile.getRating() != null ? profile.getRating() : 4.9);
        dto.setTotalConsultations(profile.getTotalConsultations() != null ? profile.getTotalConsultations() : 1250);
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

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public int getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(int yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public boolean isVerified() { return isVerified; }
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
}
