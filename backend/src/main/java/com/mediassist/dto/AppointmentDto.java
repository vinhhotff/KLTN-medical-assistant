package com.mediassist.dto;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class AppointmentDto {

    private UUID id;
    private String appointmentCode;
    private UUID patientId;
    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private UUID doctorId;
    private String doctorName;
    private String doctorEmail;
    private LocalDateTime scheduledStart;
    private LocalDateTime scheduledEnd;
    private AppointmentStatus status;
    private BigDecimal feeAmount;
    private PaymentStatus paymentStatus;
    private String consultationNotes;
    private String cancellationReason;
    private String queueNumber;
    private String clinicRoom;
    private String chiefComplaint;
    private String vitalSignsJson;
    private String icd10Code;
    private String icd10Name;
    private String prescriptionJson;
    private String treatmentPlan;
    private java.time.LocalDate followUpDate;
    private LocalDateTime createdAt;
    private UUID medicalDocumentId;
    private String medicalDocumentFileName;
    private UUID triageSessionId;
    private String triageSbarSummary;
    private String triageUrgencyLevel;

    public AppointmentDto() {}

    public static AppointmentDto fromEntity(Appointment a) {
        AppointmentDto dto = new AppointmentDto();
        dto.setId(a.getId());
        dto.setAppointmentCode(a.getAppointmentCode());
        if (a.getPatient() != null) {
            dto.setPatientId(a.getPatient().getId());
            dto.setPatientName(a.getPatient().getFullName());
            dto.setPatientEmail(a.getPatient().getEmail());
            dto.setPatientPhone(a.getPatient().getPhone());
        }
        if (a.getDoctor() != null) {
            dto.setDoctorId(a.getDoctor().getId());
            dto.setDoctorName(a.getDoctor().getFullName());
            dto.setDoctorEmail(a.getDoctor().getEmail());
        }
        dto.setScheduledStart(a.getScheduledStart());
        dto.setScheduledEnd(a.getScheduledEnd());
        dto.setStatus(a.getStatus());
        dto.setFeeAmount(a.getFeeAmount());
        dto.setPaymentStatus(a.getPaymentStatus());
        dto.setConsultationNotes(a.getConsultationNotes());
        dto.setCancellationReason(a.getCancellationReason());
        dto.setQueueNumber(a.getQueueNumber());
        dto.setClinicRoom(a.getClinicRoom());
        dto.setChiefComplaint(a.getChiefComplaint());
        dto.setVitalSignsJson(a.getVitalSignsJson());
        dto.setIcd10Code(a.getIcd10Code());
        dto.setIcd10Name(a.getIcd10Name());
        dto.setPrescriptionJson(a.getPrescriptionJson());
        dto.setTreatmentPlan(a.getTreatmentPlan());
        dto.setFollowUpDate(a.getFollowUpDate());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setMedicalDocumentId(a.getMedicalDocumentId());
        dto.setTriageSessionId(a.getTriageSessionId());
        return dto;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getAppointmentCode() { return appointmentCode; }
    public void setAppointmentCode(String appointmentCode) { this.appointmentCode = appointmentCode; }

    public UUID getPatientId() { return patientId; }
    public void setPatientId(UUID patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientEmail() { return patientEmail; }
    public void setPatientEmail(String patientEmail) { this.patientEmail = patientEmail; }

    public String getPatientPhone() { return patientPhone; }
    public void setPatientPhone(String patientPhone) { this.patientPhone = patientPhone; }

    public UUID getDoctorId() { return doctorId; }
    public void setDoctorId(UUID doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDoctorEmail() { return doctorEmail; }
    public void setDoctorEmail(String doctorEmail) { this.doctorEmail = doctorEmail; }

    public LocalDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public LocalDateTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(LocalDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }

    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }

    public BigDecimal getFeeAmount() { return feeAmount; }
    public void setFeeAmount(BigDecimal feeAmount) { this.feeAmount = feeAmount; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getConsultationNotes() { return consultationNotes; }
    public void setConsultationNotes(String consultationNotes) { this.consultationNotes = consultationNotes; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

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

    public java.time.LocalDate getFollowUpDate() { return followUpDate; }
    public void setFollowUpDate(java.time.LocalDate followUpDate) { this.followUpDate = followUpDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public UUID getMedicalDocumentId() { return medicalDocumentId; }
    public void setMedicalDocumentId(UUID medicalDocumentId) { this.medicalDocumentId = medicalDocumentId; }

    public String getMedicalDocumentFileName() { return medicalDocumentFileName; }
    public void setMedicalDocumentFileName(String medicalDocumentFileName) { this.medicalDocumentFileName = medicalDocumentFileName; }

    public UUID getTriageSessionId() { return triageSessionId; }
    public void setTriageSessionId(UUID triageSessionId) { this.triageSessionId = triageSessionId; }

    public String getTriageSbarSummary() { return triageSbarSummary; }
    public void setTriageSbarSummary(String triageSbarSummary) { this.triageSbarSummary = triageSbarSummary; }

    public String getTriageUrgencyLevel() { return triageUrgencyLevel; }
    public void setTriageUrgencyLevel(String triageUrgencyLevel) { this.triageUrgencyLevel = triageUrgencyLevel; }
}
