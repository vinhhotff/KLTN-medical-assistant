package com.mediassist.mail;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

class EmailServiceTest {

    @Test
    @DisplayName("Gui email HTML UTF-8 dung nguoi nhan, nguoi gui va tieu de tieng Viet")
    void sendsHtmlMail() throws Exception {
        JavaMailSender sender = MailTestSupport.mockSender();
        EmailService service = MailTestSupport.emailService(sender, true);

        boolean sent = service.send("patient@example.com", "[MediAssist] Xác thực địa chỉ email", "verify-email",
                Map.of("recipientName", "Nguyễn Văn Nam", "actionUrl", "http://localhost:5173/verify-email?token=abc", "expiresInHours", 24));

        assertTrue(sent);
        MimeMessage message = MailTestSupport.sentMessages(sender).get(0);
        assertEquals("patient@example.com", MailTestSupport.recipient(message));
        assertEquals("no-reply@mediassist.local", ((InternetAddress) message.getFrom()[0]).getAddress());
        assertEquals("[MediAssist] Xác thực địa chỉ email", message.getSubject());
        String html = MailTestSupport.html(message);
        assertTrue(html.contains("Nguyễn Văn Nam"));
        assertTrue(html.contains("http://localhost:5173/verify-email?token=abc"));
        assertTrue(html.contains("24 giờ"));
        // Layout chung duoc ap dung: header + footer canh bao khong chua thong tin suc khoe
        assertTrue(html.contains("Trợ lý y tế thông minh"));
        assertTrue(html.contains("email không chứa thông tin sức khỏe"));
    }

    @Test
    @DisplayName("Du lieu nguoi dung trong template duoc auto-escape (chong HTML injection)")
    void escapesUserData() throws Exception {
        JavaMailSender sender = MailTestSupport.mockSender();
        EmailService service = MailTestSupport.emailService(sender, true);

        service.send("patient@example.com", "Test", "password-changed",
                Map.of("recipientName", "<script>alert(1)</script>", "changedAt", "08:00 01/10/2026",
                        "forgotPasswordUrl", "http://localhost:5173/forgot-password"));

        String html = MailTestSupport.html(MailTestSupport.sentMessages(sender).get(0));
        assertFalse(html.contains("<script>alert(1)</script>"));
        assertTrue(html.contains("&lt;script&gt;"));
    }

    @Test
    @DisplayName("app.mail.enabled=false: khong goi SMTP")
    void disabledSkipsSending() {
        JavaMailSender sender = MailTestSupport.mockSender();
        EmailService service = MailTestSupport.emailService(sender, false);

        assertFalse(service.send("patient@example.com", "Test", "verify-email", Map.of()));
        MailTestSupport.neverSent(sender);
    }

    @Test
    @DisplayName("SMTP loi: tra false, KHONG nem exception ra nghiep vu")
    void smtpFailureIsSwallowed() {
        JavaMailSender sender = MailTestSupport.mockSender();
        doThrow(new MailSendException("Connection refused")).when(sender).send(any(MimeMessage.class));
        EmailService service = MailTestSupport.emailService(sender, true);

        assertDoesNotThrow(() -> assertFalse(service.send("patient@example.com", "Test", "password-reset",
                Map.of("recipientName", "A", "actionUrl", "http://x/reset-password?token=t", "expiresInMinutes", 30))));
    }

    @Test
    @DisplayName("Template khong ton tai: tra false, khong nem exception")
    void missingTemplateIsSwallowed() {
        JavaMailSender sender = MailTestSupport.mockSender();
        EmailService service = MailTestSupport.emailService(sender, true);

        assertFalse(service.send("patient@example.com", "Test", "does-not-exist", Map.of()));
        MailTestSupport.neverSent(sender);
    }

    @Test
    @DisplayName("MailFormat: gio HH:mm dd/MM/yyyy, tien 350.000 ₫, che email trong log")
    void formats() {
        assertEquals("09:30 05/10/2026", MailFormat.dateTime(LocalDateTime.of(2026, 10, 5, 9, 30)));
        assertEquals("350.000 ₫", MailFormat.money(new BigDecimal("350000.00")));
        assertEquals("1.250.000 ₫", MailFormat.money(new BigDecimal("1250000")));
        assertEquals("p***@gmail.com", MailFormat.maskEmail("patient@gmail.com"));
        assertEquals("", MailFormat.dateTime(null));
    }
}
