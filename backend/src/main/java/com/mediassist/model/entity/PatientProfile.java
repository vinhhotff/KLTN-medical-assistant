package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "patient_profiles", indexes = {
        @Index(name = "idx_patient_code", columnList = "patientCode", unique = true),
        @Index(name = "idx_patient_citizen_id", columnList = "citizenId"),
        @Index(name = "idx_patient_insurance", columnList = "healthInsuranceNumber"),
        @Index(name = "idx_patient_user_id", columnList = "user_id", unique = true)
})
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true, length = 50)
    private String patientCode; // Mã Bệnh Nhân: BN-2026-XXXXX

    @Column(length = 20)
    private String citizenId; // Số CCCD: 12 chữ số

    @Column(length = 30)
    private String healthInsuranceNumber; // Mã thẻ BHYT: 15 ký tự (VD: DN4791234567890)

    @Column
    private LocalDate dateOfBirth;

    @Column(length = 20)
    private String gender; // MALE, FEMALE, OTHER

    @Column(length = 10)
    private String bloodGroup; // A+, B+, AB+, O+, Rh-, etc.

    @Column(length = 255)
    private String address;

    @Column(columnDefinition = "TEXT")
    private String allergies; // Cảnh báo dị ứng thuốc và thực phẩm

    @Column(columnDefinition = "TEXT")
    private String medicalHistory; // Tiền sử bệnh lý bản thân và gia đình

    @Column(length = 100)
    private String emergencyContactName;

    @Column(length = 30)
    private String emergencyContactPhone;

    @Column(length = 50)
    private String emergencyContactRelationship;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public PatientProfile() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getPatientCode() { return patientCode; }
    public void setPatientCode(String patientCode) { this.patientCode = patientCode; }

    public String getCitizenId() { return citizenId; }
    public void setCitizenId(String citizenId) { this.citizenId = citizenId; }

    public String getHealthInsuranceNumber() { return healthInsuranceNumber; }
    public void setHealthInsuranceNumber(String healthInsuranceNumber) { this.healthInsuranceNumber = healthInsuranceNumber; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getMedicalHistory() { return medicalHistory; }
    public void setMedicalHistory(String medicalHistory) { this.medicalHistory = medicalHistory; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmergencyContactRelationship() { return emergencyContactRelationship; }
    public void setEmergencyContactRelationship(String emergencyContactRelationship) { this.emergencyContactRelationship = emergencyContactRelationship; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
