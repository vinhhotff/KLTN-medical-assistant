package com.mediassist.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public class UpdateDoctorScheduleRequest {

    private List<SlotItem> slots;

    public UpdateDoctorScheduleRequest() {}

    public UpdateDoctorScheduleRequest(List<SlotItem> slots) {
        this.slots = slots;
    }

    public List<SlotItem> getSlots() { return slots; }
    public void setSlots(List<SlotItem> slots) { this.slots = slots; }

    public static class SlotItem {
        private DayOfWeek dayOfWeek;
        private LocalTime startTime;
        private LocalTime endTime;
        private int slotDurationMinutes = 30;
        private boolean active = true;

        public SlotItem() {}

        public SlotItem(DayOfWeek dayOfWeek, LocalTime startTime, LocalTime endTime, int slotDurationMinutes, boolean active) {
            this.dayOfWeek = dayOfWeek;
            this.startTime = startTime;
            this.endTime = endTime;
            this.slotDurationMinutes = slotDurationMinutes;
            this.active = active;
        }

        public DayOfWeek getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }

        public LocalTime getStartTime() { return startTime; }
        public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

        public LocalTime getEndTime() { return endTime; }
        public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

        public int getSlotDurationMinutes() { return slotDurationMinutes; }
        public void setSlotDurationMinutes(int slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }

        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
    }
}
