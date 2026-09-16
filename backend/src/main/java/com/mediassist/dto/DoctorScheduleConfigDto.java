package com.mediassist.dto;

import com.mediassist.model.entity.DoctorScheduleSlot;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

public class DoctorScheduleConfigDto {

    private UUID id;
    private DayOfWeek dayOfWeek;
    private String dayOfWeekLabel;
    private LocalTime startTime;
    private LocalTime endTime;
    private int slotDurationMinutes;
    private boolean active;

    public DoctorScheduleConfigDto() {}

    public DoctorScheduleConfigDto(UUID id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime, int slotDurationMinutes, boolean active) {
        this.id = id;
        this.dayOfWeek = dayOfWeek;
        this.dayOfWeekLabel = formatDayOfWeekLabel(dayOfWeek);
        this.startTime = startTime;
        this.endTime = endTime;
        this.slotDurationMinutes = slotDurationMinutes;
        this.active = active;
    }

    public static DoctorScheduleConfigDto fromEntity(DoctorScheduleSlot slot) {
        return new DoctorScheduleConfigDto(
                slot.getId(),
                slot.getDayOfWeek(),
                slot.getStartTime(),
                slot.getEndTime(),
                slot.getSlotDurationMinutes(),
                slot.isActive()
        );
    }

    private static String formatDayOfWeekLabel(DayOfWeek day) {
        if (day == null) return "";
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public DayOfWeek getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(DayOfWeek dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
        this.dayOfWeekLabel = formatDayOfWeekLabel(dayOfWeek);
    }

    public String getDayOfWeekLabel() { return dayOfWeekLabel; }
    public void setDayOfWeekLabel(String dayOfWeekLabel) { this.dayOfWeekLabel = dayOfWeekLabel; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public int getSlotDurationMinutes() { return slotDurationMinutes; }
    public void setSlotDurationMinutes(int slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
