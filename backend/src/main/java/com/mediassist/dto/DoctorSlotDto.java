package com.mediassist.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;

public class DoctorSlotDto {

    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private boolean isAvailable;

    public DoctorSlotDto() {}

    public DoctorSlotDto(LocalTime startTime, LocalTime endTime, LocalDateTime startDateTime, LocalDateTime endDateTime, boolean isAvailable) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.isAvailable = isAvailable;
    }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public LocalDateTime getStartDateTime() { return startDateTime; }
    public void setStartDateTime(LocalDateTime startDateTime) { this.startDateTime = startDateTime; }

    public LocalDateTime getScheduledStart() { return startDateTime; }

    public LocalDateTime getEndDateTime() { return endDateTime; }
    public void setEndDateTime(LocalDateTime endDateTime) { this.endDateTime = endDateTime; }

    public LocalDateTime getScheduledEnd() { return endDateTime; }

    public boolean isAvailable() { return isAvailable; }
    public void setAvailable(boolean available) { isAvailable = available; }
}
