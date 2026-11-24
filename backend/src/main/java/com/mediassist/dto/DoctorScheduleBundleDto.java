package com.mediassist.dto;

import java.util.Collections;
import java.util.List;

public class DoctorScheduleBundleDto {

    private int slotDurationMinutes;
    private int bufferTimeMinutes;
    private List<DoctorScheduleConfigDto> weeklySlots = Collections.emptyList();
    private List<ScheduleExceptionDto> exceptions = Collections.emptyList();
    private List<ScheduleConflictDto> warnings = Collections.emptyList();

    public DoctorScheduleBundleDto() {}

    public DoctorScheduleBundleDto(int slotDurationMinutes, int bufferTimeMinutes,
                                   List<DoctorScheduleConfigDto> weeklySlots,
                                   List<ScheduleExceptionDto> exceptions,
                                   List<ScheduleConflictDto> warnings) {
        this.slotDurationMinutes = slotDurationMinutes;
        this.bufferTimeMinutes = bufferTimeMinutes;
        this.weeklySlots = weeklySlots != null ? weeklySlots : Collections.emptyList();
        this.exceptions = exceptions != null ? exceptions : Collections.emptyList();
        this.warnings = warnings != null ? warnings : Collections.emptyList();
    }

    public int getSlotDurationMinutes() { return slotDurationMinutes; }
    public void setSlotDurationMinutes(int slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }

    public int getBufferTimeMinutes() { return bufferTimeMinutes; }
    public void setBufferTimeMinutes(int bufferTimeMinutes) { this.bufferTimeMinutes = bufferTimeMinutes; }

    public List<DoctorScheduleConfigDto> getWeeklySlots() { return weeklySlots; }
    public void setWeeklySlots(List<DoctorScheduleConfigDto> weeklySlots) {
        this.weeklySlots = weeklySlots != null ? weeklySlots : Collections.emptyList();
    }

    public List<ScheduleExceptionDto> getExceptions() { return exceptions; }
    public void setExceptions(List<ScheduleExceptionDto> exceptions) {
        this.exceptions = exceptions != null ? exceptions : Collections.emptyList();
    }

    public List<ScheduleConflictDto> getWarnings() { return warnings; }
    public void setWarnings(List<ScheduleConflictDto> warnings) {
        this.warnings = warnings != null ? warnings : Collections.emptyList();
    }
}
