package com.mediassist.dto;

import java.time.LocalDate;
import java.util.List;

public class UpsertScheduleExceptionRequest {

    private LocalDate exceptionDate;
    private boolean dayOff = true;
    private List<ScheduleShiftDto> customShifts;
    private String reason;
    private boolean force = false;

    public UpsertScheduleExceptionRequest() {}

    public UpsertScheduleExceptionRequest(LocalDate exceptionDate, boolean dayOff, List<ScheduleShiftDto> customShifts,
                                          String reason, boolean force) {
        this.exceptionDate = exceptionDate;
        this.dayOff = dayOff;
        this.customShifts = customShifts;
        this.reason = reason;
        this.force = force;
    }

    public LocalDate getExceptionDate() { return exceptionDate; }
    public void setExceptionDate(LocalDate exceptionDate) { this.exceptionDate = exceptionDate; }

    public boolean isDayOff() { return dayOff; }
    public void setDayOff(boolean dayOff) { this.dayOff = dayOff; }

    public List<ScheduleShiftDto> getCustomShifts() { return customShifts; }
    public void setCustomShifts(List<ScheduleShiftDto> customShifts) { this.customShifts = customShifts; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public boolean isForce() { return force; }
    public void setForce(boolean force) { this.force = force; }
}
