package com.mediassist.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public class FollowUpAppointmentRequest {

    @NotNull(message = "Mã bệnh nhân không được để trống")
    private UUID patientId;

    @NotNull(message = "Thời gian hẹn tái khám không được để trống")
    private LocalDateTime scheduledStart;

    private String notes;

    private String clinicRoom;

    public FollowUpAppointmentRequest() {}

    public UUID getPatientId() { return patientId; }
    public void setPatientId(UUID patientId) { this.patientId = patientId; }

    public LocalDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getClinicRoom() { return clinicRoom; }
    public void setClinicRoom(String clinicRoom) { this.clinicRoom = clinicRoom; }
}
