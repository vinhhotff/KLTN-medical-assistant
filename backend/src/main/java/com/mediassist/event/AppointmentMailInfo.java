package com.mediassist.event;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Specialty;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.stream.Collectors;

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

    /**
     * Chup du lieu trong transaction (truoc khi listener async chay) de khong cham lazy collection ngoai session.
     * @param doctorProfile co the null (khong co ho so chuyen mon) - khi do bo trong chuyen khoa
     */
    public static AppointmentMailInfo from(Appointment appointment, DoctorProfile doctorProfile) {
        String specialty = null;
        if (doctorProfile != null && doctorProfile.getSpecialties() != null && !doctorProfile.getSpecialties().isEmpty()) {
            specialty = doctorProfile.getSpecialties().stream()
                    .map(Specialty::getName)
                    .filter(Objects::nonNull)
                    .sorted()
                    .collect(Collectors.joining(", "));
        }
        return new AppointmentMailInfo(
                appointment.getAppointmentCode(),
                appointment.getScheduledStart(),
                appointment.getPatient().getEmail(),
                appointment.getPatient().getFullName(),
                appointment.getDoctor().getEmail(),
                appointment.getDoctor().getFullName(),
                specialty,
                appointment.getClinicRoom()
        );
    }
}
