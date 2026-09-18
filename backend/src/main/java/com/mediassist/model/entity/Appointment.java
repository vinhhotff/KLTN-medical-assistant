package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointments", indexes = {
        @Index(name = "idx_appointment_code", columnList = "appointment_code", unique = true),
        @Index(name = "idx_appointment_patient", columnList = "patient_id"),
        @Index(name = "idx_appointment_doctor", columnList = "doctor_id"),
        @Index(name = "idx_appointment_status", columnList = "status"),
        @Index(name = "idx_appointment_schedule", columnList = "doctor_id, scheduled_start")
})
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String appointmentCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @Column(nullable = false)
    private LocalDateTime scheduledStart;

    @Column(nullable = false)
    private LocalDateTime scheduledEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(columnDefinition = "TEXT")
    private String consultationNotes;

    @Column(length = 20)
    private String queueNumber; // STT 01, STT 02...

    @Column(length = 100)
    private String clinicRoom; // Phòng 204 - Khu Khám Yêu Cầu

    @Column(columnDefinition = "TEXT")
    private String chiefComplaint; // Lý do vào viện / Triệu chứng chính

    @Column(columnDefinition = "TEXT")
    private String vitalSignsJson; // Huyết áp, Mạch, Nhiệt độ, Nhịp thở, Chiều cao, Cân nặng, BMI, SpO2

    @Column(length = 50)
    private String icd10Code; // Mã ICD-10 chính (VD: I10, I20.9, K21.0)

    @Column(length = 255)
    private String icd10Name; // Tên chẩn đoán quốc tế

    @Column(columnDefinition = "TEXT")
    private String prescriptionJson; // Đơn thuốc ngoại trú dạng JSON

    @Column(columnDefinition = "TEXT")
    private String treatmentPlan; // Hướng xử trí / Lời dặn theo dõi

    @Column
    private LocalDate followUpDate; // Hẹn tái khám

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal feeAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @Column(name = "medical_document_id")
    private UUID medicalDocumentId;

    @Version
    private Long version = 0L;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public Appointment() {}

    public Appointment(UUID id, String appointmentCode, User patient, User doctor, LocalDateTime scheduledStart,
                       LocalDateTime scheduledEnd, AppointmentStatus status, String cancellationReason,
                       String consultationNotes, BigDecimal feeAmount, PaymentStatus paymentStatus) {
        this.id = id;
        this.appointmentCode = appointmentCode;
        this.patient = patient;
        this.doctor = doctor;
        this.scheduledStart = scheduledStart;
        this.scheduledEnd = scheduledEnd;
        this.status = status;
        this.cancellationReason = cancellationReason;
        this.consultationNotes = consultationNotes;
        this.feeAmount = feeAmount;
        this.paymentStatus = paymentStatus;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getAppointmentCode() { return appointmentCode; }
    public void setAppointmentCode(String appointmentCode) { this.appointmentCode = appointmentCode; }

    public User getPatient() { return patient; }
    public void setPatient(User patient) { this.patient = patient; }

    public User getDoctor() { return doctor; }
    public void setDoctor(User doctor) { this.doctor = doctor; }

    public LocalDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public LocalDateTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(LocalDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }

    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public String getConsultationNotes() { return consultationNotes; }
    public void setConsultationNotes(String consultationNotes) { this.consultationNotes = consultationNotes; }

    public BigDecimal getFeeAmount() { return feeAmount; }
    public void setFeeAmount(BigDecimal feeAmount) { this.feeAmount = feeAmount; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public String getQueueNumber() { return queueNumber; }
    public void setQueueNumber(String queueNumber) { this.queueNumber = queueNumber; }

    public String getClinicRoom() { return clinicRoom; }
    public void setClinicRoom(String clinicRoom) { this.clinicRoom = clinicRoom; }

    public String getChiefComplaint() { return chiefComplaint; }
    public void setChiefComplaint(String chiefComplaint) { this.chiefComplaint = chiefComplaint; }

    public String getVitalSignsJson() { return vitalSignsJson; }
    public void setVitalSignsJson(String vitalSignsJson) { this.vitalSignsJson = vitalSignsJson; }

    public String getIcd10Code() { return icd10Code; }
    public void setIcd10Code(String icd10Code) { this.icd10Code = icd10Code; }

    public String getIcd10Name() { return icd10Name; }
    public void setIcd10Name(String icd10Name) { this.icd10Name = icd10Name; }

    public String getPrescriptionJson() { return prescriptionJson; }
    public void setPrescriptionJson(String prescriptionJson) { this.prescriptionJson = prescriptionJson; }

    public String getTreatmentPlan() { return treatmentPlan; }
    public void setTreatmentPlan(String treatmentPlan) { this.treatmentPlan = treatmentPlan; }

    public LocalDate getFollowUpDate() { return followUpDate; }
    public void setFollowUpDate(LocalDate followUpDate) { this.followUpDate = followUpDate; }

    public UUID getMedicalDocumentId() { return medicalDocumentId; }
    public void setMedicalDocumentId(UUID medicalDocumentId) { this.medicalDocumentId = medicalDocumentId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private UUID id;
        private String appointmentCode;
        private User patient;
        private User doctor;
        private LocalDateTime scheduledStart;
        private LocalDateTime scheduledEnd;
        private AppointmentStatus status = AppointmentStatus.SCHEDULED;
        private String cancellationReason;
        private String consultationNotes;
        private BigDecimal feeAmount = BigDecimal.ZERO;
        private PaymentStatus paymentStatus = PaymentStatus.UNPAID;
        private UUID medicalDocumentId;

        public Builder id(UUID id) { this.id = id; return this; }
        public Builder appointmentCode(String appointmentCode) { this.appointmentCode = appointmentCode; return this; }
        public Builder patient(User patient) { this.patient = patient; return this; }
        public Builder doctor(User doctor) { this.doctor = doctor; return this; }
        public Builder scheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; return this; }
        public Builder scheduledEnd(LocalDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; return this; }
        public Builder status(AppointmentStatus status) { this.status = status; return this; }
        public Builder cancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; return this; }
        public Builder consultationNotes(String consultationNotes) { this.consultationNotes = consultationNotes; return this; }
        public Builder feeAmount(BigDecimal feeAmount) { this.feeAmount = feeAmount; return this; }
        public Builder paymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; return this; }
        public Builder medicalDocumentId(UUID medicalDocumentId) { this.medicalDocumentId = medicalDocumentId; return this; }

        public Appointment build() {
            Appointment appt = new Appointment(id, appointmentCode, patient, doctor, scheduledStart, scheduledEnd, status, cancellationReason, consultationNotes, feeAmount, paymentStatus);
            appt.setMedicalDocumentId(medicalDocumentId);
            return appt;
        }
    }
}
