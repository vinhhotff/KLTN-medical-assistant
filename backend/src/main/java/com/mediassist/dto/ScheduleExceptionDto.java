package com.mediassist.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class ScheduleExceptionDto {

    private UUID id;
    private LocalDate exceptionDate;
    private boolean dayOff;
    private List<ScheduleShiftDto> customShifts = Collections.emptyList();
    private String reason;
    private LocalDateTime createdAt;

    public ScheduleExceptionDto() {}

    public ScheduleExceptionDto(UUID id, LocalDate exceptionDate, boolean dayOff,
                                List<ScheduleShiftDto> customShifts, String reason, LocalDateTime createdAt) {
        this.id = id;
        this.exceptionDate = exceptionDate;
        this.dayOff = dayOff;
        this.customShifts = customShifts != null ? customShifts : Collections.emptyList();
        this.reason = reason;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public LocalDate getExceptionDate() { return exceptionDate; }
    public void setExceptionDate(LocalDate exceptionDate) { this.exceptionDate = exceptionDate; }

    public boolean isDayOff() { return dayOff; }
    public void setDayOff(boolean dayOff) { this.dayOff = dayOff; }

    public List<ScheduleShiftDto> getCustomShifts() { return customShifts; }
    public void setCustomShifts(List<ScheduleShiftDto> customShifts) {
        this.customShifts = customShifts != null ? customShifts : Collections.emptyList();
    }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
