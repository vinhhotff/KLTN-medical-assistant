package com.mediassist.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class RescheduleAppointmentRequest {

    @NotNull(message = "New scheduled start time is required")
    private LocalDateTime newScheduledStart;

    private String reason;

    public RescheduleAppointmentRequest() {}

    public RescheduleAppointmentRequest(LocalDateTime newScheduledStart, String reason) {
        this.newScheduledStart = newScheduledStart;
        this.reason = reason;
    }

    public LocalDateTime getNewScheduledStart() { return newScheduledStart; }
    public void setNewScheduledStart(LocalDateTime newScheduledStart) { this.newScheduledStart = newScheduledStart; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
