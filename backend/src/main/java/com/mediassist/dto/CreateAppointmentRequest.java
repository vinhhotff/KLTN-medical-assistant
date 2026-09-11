package com.mediassist.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

public class CreateAppointmentRequest {

    @NotNull(message = "Doctor ID is required")
    private UUID doctorId;

    @NotNull(message = "Scheduled start time is required")
    private LocalDateTime scheduledStart;

    private String notes;

    public CreateAppointmentRequest() {}

    public CreateAppointmentRequest(UUID doctorId, LocalDateTime scheduledStart, String notes) {
        this.doctorId = doctorId;
        this.scheduledStart = scheduledStart;
        this.notes = notes;
    }

    public UUID getDoctorId() { return doctorId; }
    public void setDoctorId(UUID doctorId) { this.doctorId = doctorId; }

    public LocalDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
