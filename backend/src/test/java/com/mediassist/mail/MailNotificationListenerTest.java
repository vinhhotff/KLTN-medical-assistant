package com.mediassist.mail;

import com.mediassist.event.AppointmentBookedEvent;
import com.mediassist.event.AppointmentCancelledEvent;
import com.mediassist.event.AppointmentMailInfo;
import com.mediassist.event.EmailVerificationRequestedEvent;
import com.mediassist.event.PasswordChangedEvent;
import com.mediassist.event.PasswordResetRequestedEvent;
import com.mediassist.event.PaymentCompletedEvent;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MailNotificationListenerTest {

    private static final String BASE_URL = "http://localhost:5173";
    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 5, 9, 30);

    private JavaMailSender sender;
    private MailNotificationListener listener;

    @BeforeEach
    void setUp() {
        sender = MailTestSupport.mockSender();
        listener = new MailNotificationListener(MailTestSupport.emailService(sender, true), BASE_URL + "/");
    }

    private AppointmentMailInfo appointment() {
        return new AppointmentMailInfo("AP-20261002-ABC123", START,
                "patient@example.com", "Nguyễn Văn Nam",
                "doctor@example.com", "Trần Văn An",
                "Tim mạch", "Phòng Khám - Khoa Tim Mạch");
    }

    @Test
    @DisplayName("Quen mat khau: link {client-base-url}/reset-password?token=... gui toi dung email")
    void passwordResetMail() throws Exception {
        listener.onPasswordResetRequested(new PasswordResetRequestedEvent("patient@example.com", "Nam", "tok-EN_123"));

        MimeMessage message = MailTestSupport.sentMessages(sender).get(0);
        assertEquals("patient@example.com", MailTestSupport.recipient(message));
        assertEquals("[MediAssist] Đặt lại mật khẩu", message.getSubject());
        String html = MailTestSupport.html(message);
        assertTrue(html.contains(BASE_URL + "/reset-password?token=tok-EN_123"));
        assertTrue(html.contains("30 phút"));
    }

    @Test
    @DisplayName("Token khong lo qua toString cua event (phong ghi log nham)")
    void tokenEventsMaskToString() {
        assertFalse(new PasswordResetRequestedEvent("a@b.c", "A", "secret-token").toString().contains("secret-token"));
        assertFalse(new EmailVerificationRequestedEvent("a@b.c", "A", "secret-token").toString().contains("secret-token"));
    }

    @Test
    @DisplayName("Doi mat khau thanh cong: email canh bao kem thoi diem")
    void passwordChangedMail() throws Exception {
        listener.onPasswordChanged(new PasswordChangedEvent("patient@example.com", "Nam", START));

        MimeMessage message = MailTestSupport.sentMessages(sender).get(0);
        assertEquals("[MediAssist] Mật khẩu của bạn vừa được thay đổi", message.getSubject());
        assertTrue(MailTestSupport.html(message).contains("09:30 05/10/2026"));
    }

    @Test
    @DisplayName("Xac thuc email: link {client-base-url}/verify-email?token=...")
    void verificationMail() throws Exception {
        listener.onEmailVerificationRequested(new EmailVerificationRequestedEvent("patient@example.com", "Nam", "verify-tok"));

        MimeMessage message = MailTestSupport.sentMessages(sender).get(0);
        assertEquals("[MediAssist] Xác thực địa chỉ email", message.getSubject());
        assertTrue(MailTestSupport.html(message).contains(BASE_URL + "/verify-email?token=verify-tok"));
    }

    @Test
    @DisplayName("Dat lich: 1 email xac nhan cho benh nhan + 1 email bao lich moi cho bac si")
    void appointmentBookedMails() throws Exception {
        listener.onAppointmentBooked(new AppointmentBookedEvent(appointment(), false));

        List<MimeMessage> messages = MailTestSupport.sentMessages(sender);
        assertEquals(2, messages.size());

        MimeMessage patientMail = MailTestSupport.sentTo(messages, "patient@example.com");
        assertEquals("[MediAssist] Xác nhận lịch hẹn AP-20261002-ABC123", patientMail.getSubject());
        String patientHtml = MailTestSupport.html(patientMail);
        assertTrue(patientHtml.contains("09:30 05/10/2026"));
        assertTrue(patientHtml.contains("Trần Văn An"));
        assertTrue(patientHtml.contains("Tim mạch"));
        assertTrue(patientHtml.contains("Phòng Khám - Khoa Tim Mạch"));
        assertTrue(patientHtml.contains(BASE_URL + "/patient"));

        MimeMessage doctorMail = MailTestSupport.sentTo(messages, "doctor@example.com");
        assertEquals("[MediAssist] Lịch hẹn mới AP-20261002-ABC123", doctorMail.getSubject());
        assertTrue(MailTestSupport.html(doctorMail).contains("Nguyễn Văn Nam"));
        assertTrue(MailTestSupport.html(doctorMail).contains(BASE_URL + "/doctor"));
    }

    @Test
    @DisplayName("Lich tai kham: tieu de rieng cho benh nhan")
    void followUpSubject() throws Exception {
        listener.onAppointmentBooked(new AppointmentBookedEvent(appointment(), true));

        MimeMessage patientMail = MailTestSupport.sentTo(MailTestSupport.sentMessages(sender), "patient@example.com");
        assertEquals("[MediAssist] Lịch tái khám AP-20261002-ABC123", patientMail.getSubject());
    }

    @Test
    @DisplayName("Huy lich: gui ca benh nhan va bac si, ghi nguoi huy, hoan tien, KHONG co ly do")
    void appointmentCancelledMails() throws Exception {
        listener.onAppointmentCancelled(new AppointmentCancelledEvent(appointment(),
                AppointmentCancelledEvent.CancelledBy.DOCTOR, true, new BigDecimal("350000.00")));

        List<MimeMessage> messages = MailTestSupport.sentMessages(sender);
        assertEquals(2, messages.size());

        String patientHtml = MailTestSupport.html(MailTestSupport.sentTo(messages, "patient@example.com"));
        assertTrue(patientHtml.contains("Bác sĩ Trần Văn An"));
        assertTrue(patientHtml.contains("350.000 ₫"));
        assertTrue(patientHtml.contains("Xem chi tiết lý do sau khi đăng nhập"));

        MimeMessage doctorMail = MailTestSupport.sentTo(messages, "doctor@example.com");
        assertEquals("[MediAssist] Lịch hẹn AP-20261002-ABC123 đã bị hủy", doctorMail.getSubject());
        assertTrue(MailTestSupport.html(doctorMail).contains("Nguyễn Văn Nam"));
    }

    @Test
    @DisplayName("Huy lich chua thanh toan: khong nhac hoan tien")
    void cancelledWithoutRefund() throws Exception {
        listener.onAppointmentCancelled(new AppointmentCancelledEvent(appointment(),
                AppointmentCancelledEvent.CancelledBy.PATIENT, false, null));

        String patientHtml = MailTestSupport.html(MailTestSupport.sentTo(MailTestSupport.sentMessages(sender), "patient@example.com"));
        assertTrue(patientHtml.contains("Bệnh nhân"));
        assertFalse(patientHtml.contains("hoàn tiền"));
    }

    @Test
    @DisplayName("Thanh toan phi kham: bien nhan gom ma giao dich, so tien, phuong thuc, ma lich hen")
    void appointmentFeeReceipt() throws Exception {
        listener.onPaymentCompleted(new PaymentCompletedEvent("TX-20261002-AAAAAA", "patient@example.com", "Nam",
                new BigDecimal("350000.00"), "VND", "STRIPE", START, "APPOINTMENT_FEE", null,
                "AP-20261002-ABC123", START.plusDays(1)));

        MimeMessage message = MailTestSupport.sentMessages(sender).get(0);
        assertEquals("[MediAssist] Biên nhận thanh toán TX-20261002-AAAAAA", message.getSubject());
        String html = MailTestSupport.html(message);
        assertTrue(html.contains("350.000 ₫"));
        assertTrue(html.contains("Thẻ quốc tế (Stripe)"));
        assertTrue(html.contains("Phí khám bệnh"));
        assertTrue(html.contains("AP-20261002-ABC123"));
        assertTrue(html.contains("09:30 06/10/2026"));
    }

    @Test
    @DisplayName("Thanh toan goi VIP: bien nhan ghi ten goi, khong co ma lich hen")
    void quotaReceipt() throws Exception {
        listener.onPaymentCompleted(new PaymentCompletedEvent("TX-20261002-BBBBBB", "patient@example.com", "Nam",
                new BigDecimal("99000.00"), "VND", "VNPAY", START, "QUOTA_PURCHASE", "VIP_MONTHLY", null, null));

        String html = MailTestSupport.html(MailTestSupport.sentMessages(sender).get(0));
        assertTrue(html.contains("Gói VIP 30 ngày"));
        assertTrue(html.contains("99.000 ₫"));
        assertFalse(html.contains("Mã lịch hẹn"));
    }
}
