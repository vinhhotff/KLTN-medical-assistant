package com.mediassist.event;

/**
 * Phat khi lich hen moi duoc tao (benh nhan dat lich hoac bac si tao lich tai kham).
 */
public record AppointmentBookedEvent(AppointmentMailInfo appointment, boolean followUp) {
}
