package com.mediassist.event;

import java.math.BigDecimal;

/**
 * Phat khi lich hen bi huy (benh nhan / bac si / quan tri vien).
 * Khong mang ly do huy dang tu go - ly do chi xem duoc sau khi dang nhap.
 */
public record AppointmentCancelledEvent(
        AppointmentMailInfo appointment,
        CancelledBy cancelledBy,
        boolean refunded,
        BigDecimal refundAmount
) {

    public enum CancelledBy { PATIENT, DOCTOR, ADMIN }
}
