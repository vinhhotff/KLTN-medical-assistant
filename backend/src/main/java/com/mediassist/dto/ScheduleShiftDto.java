package com.mediassist.dto;

public class ScheduleShiftDto {

    private String startTime; // HH:mm
    private String endTime;   // HH:mm

    public ScheduleShiftDto() {}

    public ScheduleShiftDto(String startTime, String endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
}
