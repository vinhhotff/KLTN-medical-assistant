package com.mediassist.dto;

import com.mediassist.model.entity.DoctorScheduleSlot;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.UUID;

public class DoctorScheduleConfigDto {

    private UUID id;
    private DayOfWeek dayOfWeek;
    private int dayOfWeekIndex; // 0 = Sunday .. 6 = Saturday
    private String dayOfWeekLabel;
    private LocalTime startTime;
    private LocalTime endTime;
    private int slotDurationMinutes;
    private int bufferTimeMinutes;
    private boolean active;

    public DoctorScheduleConfigDto() {}

    public DoctorScheduleConfigDto(UUID id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime, int slotDurationMinutes, boolean active) {
        this(id, dayOfWeek, startTime, endTime, slotDurationMinutes, 0, active);
    }

    public DoctorScheduleConfigDto(UUID id, DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime,
                                   int slotDurationMinutes, int bufferTimeMinutes, boolean active) {
        this.id = id;
        this.dayOfWeek = dayOfWeek;
        this.dayOfWeekIndex = toDayOfWeekIndex(dayOfWeek);
        this.dayOfWeekLabel = formatDayOfWeekLabel(dayOfWeek);
        this.startTime = startTime;
        this.endTime = endTime;
        this.slotDurationMinutes = slotDurationMinutes;
        this.bufferTimeMinutes = Math.max(0, bufferTimeMinutes);
        this.active = active;
    }

    public static DoctorScheduleConfigDto fromEntity(DoctorScheduleSlot slot) {
        return fromEntity(slot, slot.getDoctorProfile() != null ? slot.getDoctorProfile().getBufferTimeMinutes() : 0);
    }

    public static DoctorScheduleConfigDto fromEntity(DoctorScheduleSlot slot, int bufferTimeMinutes) {
        return new DoctorScheduleConfigDto(
                slot.getId(),
                slot.getDayOfWeek(),
                slot.getStartTime(),
                slot.getEndTime(),
                slot.getSlotDurationMinutes(),
                bufferTimeMinutes,
                slot.isActive()
        );
    }

    public static int toDayOfWeekIndex(DayOfWeek day) {
        if (day == null) return 0;
        return day == DayOfWeek.SUNDAY ? 0 : day.getValue();
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
        this.dayOfWeekIndex = toDayOfWeekIndex(dayOfWeek);
        this.dayOfWeekLabel = formatDayOfWeekLabel(dayOfWeek);
    }

    public int getDayOfWeekIndex() { return dayOfWeekIndex; }
    public void setDayOfWeekIndex(int dayOfWeekIndex) { this.dayOfWeekIndex = dayOfWeekIndex; }

    public String getDayOfWeekLabel() { return dayOfWeekLabel; }
    public void setDayOfWeekLabel(String dayOfWeekLabel) { this.dayOfWeekLabel = dayOfWeekLabel; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public int getSlotDurationMinutes() { return slotDurationMinutes; }
    public void setSlotDurationMinutes(int slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }

    public int getBufferTimeMinutes() { return bufferTimeMinutes; }
    public void setBufferTimeMinutes(int bufferTimeMinutes) { this.bufferTimeMinutes = Math.max(0, bufferTimeMinutes); }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
