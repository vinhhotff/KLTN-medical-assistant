package com.mediassist.event;

import java.time.LocalDateTime;

/**
 * Anh chup thong tin lich hen dung cho email - CHI gom du lieu hanh chinh.
 * Co y khong chua ly do kham, trieu chung, chan doan, ghi chu kham hay ly do huy:
 * template email khong the hien thi du lieu y te vi du lieu do khong bao gio vao event.
 */
public record AppointmentMailInfo(
        String appointmentCode,
        LocalDateTime scheduledStart,
        String patientEmail,
        String patientName,
        String doctorEmail,
        String doctorName,
        String specialtyName,
        String clinicRoom
) {
}
