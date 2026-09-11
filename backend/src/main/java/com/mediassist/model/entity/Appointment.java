package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointments", indexes = {
        @Index(name = "idx_appointment_code", columnList = "appointmentCode", unique = true),
        @Index(name = "idx_appointment_patient", columnList = "patient_id"),
        @Index(name = "idx_appointment_doctor", columnList = "doctor_id"),
        @Index(name = "idx_appointment_status", columnList = "status"),
        @Index(name = "idx_appointment_schedule", columnList = "doctor_id, scheduledStart")
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

    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal feeAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

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

        public Appointment build() {
            return new Appointment(id, appointmentCode, patient, doctor, scheduledStart, scheduledEnd, status, cancellationReason, consultationNotes, feeAmount, paymentStatus);
        }
    }
}
