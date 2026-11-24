package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "doctor_schedule_exceptions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_doctor_schedule_exception_date", columnNames = {"doctor_profile_id", "exception_date"})
        },
        indexes = {
                @Index(name = "idx_doctor_schedule_exceptions_lookup", columnList = "doctor_profile_id, exception_date")
        }
)
public class DoctorScheduleException {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_profile_id", nullable = false)
    private DoctorProfile doctorProfile;

    @Column(name = "exception_date", nullable = false)
    private LocalDate exceptionDate;

    @Column(name = "is_day_off", nullable = false)
    private boolean dayOff = true;

    @Column(name = "custom_shifts_json", columnDefinition = "TEXT", nullable = false)
    private String customShiftsJson = "[]";

    @Column(length = 255)
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public DoctorScheduleException() {}

    public DoctorScheduleException(DoctorProfile doctorProfile, LocalDate exceptionDate, boolean dayOff, String customShiftsJson, String reason) {
        this.doctorProfile = doctorProfile;
        this.exceptionDate = exceptionDate;
        this.dayOff = dayOff;
        this.customShiftsJson = (customShiftsJson != null && !customShiftsJson.isBlank()) ? customShiftsJson : "[]";
        this.reason = reason;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public DoctorProfile getDoctorProfile() { return doctorProfile; }
    public void setDoctorProfile(DoctorProfile doctorProfile) { this.doctorProfile = doctorProfile; }

    public LocalDate getExceptionDate() { return exceptionDate; }
    public void setExceptionDate(LocalDate exceptionDate) { this.exceptionDate = exceptionDate; }

    public boolean isDayOff() { return dayOff; }
    public void setDayOff(boolean dayOff) { this.dayOff = dayOff; }

    public String getCustomShiftsJson() { return customShiftsJson; }
    public void setCustomShiftsJson(String customShiftsJson) {
        this.customShiftsJson = (customShiftsJson != null && !customShiftsJson.isBlank()) ? customShiftsJson : "[]";
    }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
