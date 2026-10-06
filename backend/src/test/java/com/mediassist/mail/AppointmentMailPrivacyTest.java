package com.mediassist.mail;

import com.mediassist.event.AppointmentBookedEvent;
import com.mediassist.event.AppointmentCancelledEvent;
import com.mediassist.event.AppointmentMailInfo;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.User;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bao dam email lich hen KHONG chua thong tin y te: chay tu entity Appointment that (co ly do kham,
 * ghi chu kham, ly do huy) qua AppointmentMailInfo.from -> listener -> HTML render bang Thymeleaf that.
 */
class AppointmentMailPrivacyTest {

    private static final String CHIEF_COMPLAINT = "Đau thắt ngực trái lan cánh tay BÍ-MẬT-1";
    private static final String CONSULTATION_NOTES = "Nghi nhồi máu cơ tim, chỉ định troponin BÍ-MẬT-2";
    private static final String CANCELLATION_REASON = "Đang điều trị HIV tại bệnh viện khác BÍ-MẬT-3";

    private JavaMailSender sender;
    private MailNotificationListener listener;
    private Appointment appointment;
    private DoctorProfile doctorProfile;

    @BeforeEach
    void setUp() {
        sender = MailTestSupport.mockSender();
        listener = new MailNotificationListener(MailTestSupport.emailService(sender, true), "http://localhost:5173");

        User patient = User.builder().id(UUID.randomUUID()).email("patient@example.com").fullName("Nguyễn Văn Nam")
                .role(Role.PATIENT).build();
        User doctor = User.builder().id(UUID.randomUUID()).email("doctor@example.com").fullName("Trần Văn An")
                .role(Role.DOCTOR).build();
        appointment = Appointment.builder()
                .id(UUID.randomUUID())
                .appointmentCode("AP-20261002-PRIV01")
                .patient(patient)
                .doctor(doctor)
                .scheduledStart(LocalDateTime.of(2026, 10, 5, 9, 30))
                .status(AppointmentStatus.CANCELLED)
                .feeAmount(new BigDecimal("350000"))
                .consultationNotes(CONSULTATION_NOTES)
                .build();
        appointment.setChiefComplaint(CHIEF_COMPLAINT);
        appointment.setCancellationReason(CANCELLATION_REASON);
        appointment.setClinicRoom("Phòng Khám - Khoa Tim Mạch");

        Specialty cardiology = new Specialty();
        cardiology.setName("Tim mạch");
        doctorProfile = new DoctorProfile();
        doctorProfile.setSpecialties(Set.of(cardiology));
    }

    private void assertNoClinicalData(List<MimeMessage> messages) throws Exception {
        for (MimeMessage m : messages) {
            String all = m.getSubject() + "\n" + MailTestSupport.html(m);
            assertFalse(all.contains("BÍ-MẬT-1"), "chiefComplaint lọt vào email");
            assertFalse(all.contains("BÍ-MẬT-2"), "consultationNotes lọt vào email");
            assertFalse(all.contains("BÍ-MẬT-3"), "cancellationReason lọt vào email");
        }
    }

    @Test
    @DisplayName("Snapshot chi gom du lieu hanh chinh: ma lich, gio, ten, chuyen khoa, phong kham")
    void snapshotHasAdministrativeDataOnly() {
        AppointmentMailInfo info = AppointmentMailInfo.from(appointment, doctorProfile);

        assertEquals("AP-20261002-PRIV01", info.appointmentCode());
        assertEquals("Tim mạch", info.specialtyName());
        assertEquals("Phòng Khám - Khoa Tim Mạch", info.clinicRoom());
        assertFalse(info.toString().contains("BÍ-MẬT"));
    }

    @Test
    @DisplayName("Email dat lich (benh nhan + bac si) khong chua chiefComplaint / consultationNotes")
    void bookedMailsHaveNoClinicalData() throws Exception {
        listener.onAppointmentBooked(new AppointmentBookedEvent(AppointmentMailInfo.from(appointment, doctorProfile), false));

        List<MimeMessage> messages = MailTestSupport.sentMessages(sender);
        assertEquals(2, messages.size());
        assertNoClinicalData(messages);
        assertTrue(MailTestSupport.html(messages.get(0)).contains("AP-20261002-PRIV01"));
    }

    @Test
    @DisplayName("Email huy lich (benh nhan + bac si) khong chua ly do huy tu go, chi ghi nguoi huy + huong dan dang nhap")
    void cancelledMailsHaveNoReason() throws Exception {
        listener.onAppointmentCancelled(new AppointmentCancelledEvent(AppointmentMailInfo.from(appointment, doctorProfile),
                AppointmentCancelledEvent.CancelledBy.DOCTOR, true, new BigDecimal("350000")));

        List<MimeMessage> messages = MailTestSupport.sentMessages(sender);
        assertEquals(2, messages.size());
        assertNoClinicalData(messages);
        for (MimeMessage m : messages) {
            String html = MailTestSupport.html(m);
            assertTrue(html.contains("Bác sĩ Trần Văn An"));
            assertTrue(html.contains("Xem chi tiết lý do sau khi đăng nhập"));
        }
    }

    @Test
    @DisplayName("Hoan tien khong ro so tien: email ghi 'phi kham' thay vi de trong")
    void refundWithoutAmount() throws Exception {
        listener.onAppointmentCancelled(new AppointmentCancelledEvent(AppointmentMailInfo.from(appointment, null),
                AppointmentCancelledEvent.CancelledBy.ADMIN, true, null));

        String patientHtml = MailTestSupport.html(MailTestSupport.sentTo(MailTestSupport.sentMessages(sender), "patient@example.com"));
        assertTrue(patientHtml.contains("Quản trị viên"));
        assertTrue(patientHtml.contains("phí khám"));
    }
}
