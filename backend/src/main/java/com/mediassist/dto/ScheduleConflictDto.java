package com.mediassist.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ScheduleConflictDto {

    private UUID appointmentId;
    private String appointmentCode;
    private String patientName;
    private LocalDateTime scheduledStart;
    private LocalDateTime scheduledEnd;
    private String status;
    private String reason;

    public ScheduleConflictDto() {}

    public ScheduleConflictDto(UUID appointmentId, String appointmentCode, String patientName,
                               LocalDateTime scheduledStart, LocalDateTime scheduledEnd,
                               String status, String reason) {
        this.appointmentId = appointmentId;
        this.appointmentCode = appointmentCode;
        this.patientName = patientName;
        this.scheduledStart = scheduledStart;
        this.scheduledEnd = scheduledEnd;
        this.status = status;
        this.reason = reason;
    }

    public UUID getAppointmentId() { return appointmentId; }
    public void setAppointmentId(UUID appointmentId) { this.appointmentId = appointmentId; }

    public String getAppointmentCode() { return appointmentCode; }
    public void setAppointmentCode(String appointmentCode) { this.appointmentCode = appointmentCode; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public LocalDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public LocalDateTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(LocalDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
