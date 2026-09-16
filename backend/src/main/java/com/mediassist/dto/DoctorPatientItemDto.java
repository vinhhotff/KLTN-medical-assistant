package com.mediassist.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class DoctorPatientItemDto {

    private UUID patientId;
    private String patientCode;
    private String fullName;
    private String email;
    private String phone;
    private String gender;
    private String bloodGroup;
    private LocalDate dateOfBirth;
    private String allergies;
    private String medicalHistory;
    private long totalVisits;
    private LocalDateTime lastVisitDate;
    private String lastStatus;
    private String lastIcd10Code;
    private String lastIcd10Name;
    private String lastChiefComplaint;

    public DoctorPatientItemDto() {}

    public UUID getPatientId() { return patientId; }
    public void setPatientId(UUID patientId) { this.patientId = patientId; }

    public String getPatientCode() { return patientCode; }
    public void setPatientCode(String patientCode) { this.patientCode = patientCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getMedicalHistory() { return medicalHistory; }
    public void setMedicalHistory(String medicalHistory) { this.medicalHistory = medicalHistory; }

    public long getTotalVisits() { return totalVisits; }
    public void setTotalVisits(long totalVisits) { this.totalVisits = totalVisits; }

    public LocalDateTime getLastVisitDate() { return lastVisitDate; }
    public void setLastVisitDate(LocalDateTime lastVisitDate) { this.lastVisitDate = lastVisitDate; }

    public String getLastStatus() { return lastStatus; }
    public void setLastStatus(String lastStatus) { this.lastStatus = lastStatus; }

    public String getLastIcd10Code() { return lastIcd10Code; }
    public void setLastIcd10Code(String lastIcd10Code) { this.lastIcd10Code = lastIcd10Code; }

    public String getLastIcd10Name() { return lastIcd10Name; }
    public void setLastIcd10Name(String lastIcd10Name) { this.lastIcd10Name = lastIcd10Name; }

    public String getLastChiefComplaint() { return lastChiefComplaint; }
    public void setLastChiefComplaint(String lastChiefComplaint) { this.lastChiefComplaint = lastChiefComplaint; }
}
