package com.mediassist.mail;

import com.mediassist.event.AppointmentBookedEvent;
import com.mediassist.event.AppointmentCancelledEvent;
import com.mediassist.event.AppointmentMailInfo;
import com.mediassist.event.EmailVerificationRequestedEvent;
import com.mediassist.event.PasswordChangedEvent;
import com.mediassist.event.PasswordResetRequestedEvent;
import com.mediassist.event.PaymentCompletedEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Chuyen domain event thanh email.
 * AFTER_COMMIT: transaction rollback thi khong gui mail. fallbackExecution: event publish ngoai transaction van duoc xu ly.
 * @Async("mailExecutor"): SMTP cham/loi khong anh huong thoi gian phan hoi cua nghiep vu.
 */
@Component
public class MailNotificationListener {

    static final String PATIENT_PORTAL_PATH = "/patient";
    static final String DOCTOR_PORTAL_PATH = "/doctor";

    private final EmailService emailService;
    private final String clientBaseUrl;

    public MailNotificationListener(EmailService emailService,
                                    @Value("${app.client-base-url:http://localhost:5173}") String clientBaseUrl) {
        this.emailService = emailService;
        this.clientBaseUrl = clientBaseUrl.endsWith("/") ? clientBaseUrl.substring(0, clientBaseUrl.length() - 1) : clientBaseUrl;
    }

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPasswordResetRequested(PasswordResetRequestedEvent event) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("recipientName", event.fullName());
        vars.put("actionUrl", clientBaseUrl + "/reset-password?token=" + encode(event.rawToken()));
        vars.put("expiresInMinutes", 30);
        emailService.send(event.email(), "[MediAssist] Đặt lại mật khẩu", "password-reset", vars);
    }

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPasswordChanged(PasswordChangedEvent event) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("recipientName", event.fullName());
        vars.put("changedAt", MailFormat.dateTime(event.changedAt()));
        vars.put("forgotPasswordUrl", clientBaseUrl + "/forgot-password");
        emailService.send(event.email(), "[MediAssist] Mật khẩu của bạn vừa được thay đổi", "password-changed", vars);
    }

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEmailVerificationRequested(EmailVerificationRequestedEvent event) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("recipientName", event.fullName());
        vars.put("actionUrl", clientBaseUrl + "/verify-email?token=" + encode(event.rawToken()));
        vars.put("expiresInHours", 24);
        emailService.send(event.email(), "[MediAssist] Xác thực địa chỉ email", "verify-email", vars);
    }

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAppointmentBooked(AppointmentBookedEvent event) {
        AppointmentMailInfo appt = event.appointment();

        Map<String, Object> patientVars = appointmentVars(appt);
        patientVars.put("recipientName", appt.patientName());
        patientVars.put("followUp", event.followUp());
        patientVars.put("portalUrl", clientBaseUrl + PATIENT_PORTAL_PATH);
        String patientSubject = (event.followUp() ? "[MediAssist] Lịch tái khám " : "[MediAssist] Xác nhận lịch hẹn ")
                + appt.appointmentCode();
        emailService.send(appt.patientEmail(), patientSubject, "appointment-booked-patient", patientVars);

        Map<String, Object> doctorVars = appointmentVars(appt);
        doctorVars.put("recipientName", appt.doctorName());
        doctorVars.put("followUp", event.followUp());
        doctorVars.put("portalUrl", clientBaseUrl + DOCTOR_PORTAL_PATH);
        emailService.send(appt.doctorEmail(), "[MediAssist] Lịch hẹn mới " + appt.appointmentCode(),
                "appointment-booked-doctor", doctorVars);
    }

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAppointmentCancelled(AppointmentCancelledEvent event) {
        AppointmentMailInfo appt = event.appointment();
        String subject = "[MediAssist] Lịch hẹn " + appt.appointmentCode() + " đã bị hủy";
        String cancelledByLabel = cancelledByLabel(event.cancelledBy(), appt.doctorName());

        Map<String, Object> patientVars = cancellationVars(event, cancelledByLabel);
        patientVars.put("recipientName", appt.patientName());
        patientVars.put("forPatient", true);
        patientVars.put("portalUrl", clientBaseUrl + PATIENT_PORTAL_PATH);
        emailService.send(appt.patientEmail(), subject, "appointment-cancelled", patientVars);

        Map<String, Object> doctorVars = cancellationVars(event, cancelledByLabel);
        doctorVars.put("recipientName", appt.doctorName());
        doctorVars.put("forPatient", false);
        doctorVars.put("portalUrl", clientBaseUrl + DOCTOR_PORTAL_PATH);
        emailService.send(appt.doctorEmail(), subject, "appointment-cancelled", doctorVars);
    }

    @Async("mailExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        boolean appointmentFee = "APPOINTMENT_FEE".equals(event.orderType());
        Map<String, Object> vars = new HashMap<>();
        vars.put("recipientName", event.userName());
        vars.put("transactionCode", event.transactionCode());
        vars.put("amount", MailFormat.money(event.amount()));
        vars.put("paymentMethod", MailFormat.paymentMethod(event.paymentMethod()));
        vars.put("completedAt", MailFormat.dateTime(event.completedAt()));
        vars.put("appointmentFee", appointmentFee);
        vars.put("orderLabel", appointmentFee ? "Phí khám bệnh" : MailFormat.quotaPackage(event.packageId()));
        vars.put("appointmentCode", event.appointmentCode());
        vars.put("appointmentTime", MailFormat.dateTime(event.appointmentStart()));
        vars.put("portalUrl", clientBaseUrl + PATIENT_PORTAL_PATH + (appointmentFee ? "" : "/documents"));
        emailService.send(event.userEmail(), "[MediAssist] Biên nhận thanh toán " + event.transactionCode(),
                "payment-receipt", vars);
    }

    private Map<String, Object> appointmentVars(AppointmentMailInfo appt) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("appointmentCode", appt.appointmentCode());
        vars.put("scheduledTime", MailFormat.dateTime(appt.scheduledStart()));
        vars.put("patientName", appt.patientName());
        vars.put("doctorName", appt.doctorName());
        vars.put("specialtyName", appt.specialtyName());
        vars.put("clinicRoom", appt.clinicRoom());
        return vars;
    }

    private Map<String, Object> cancellationVars(AppointmentCancelledEvent event, String cancelledByLabel) {
        Map<String, Object> vars = appointmentVars(event.appointment());
        vars.put("cancelledBy", cancelledByLabel);
        vars.put("refunded", event.refunded());
        // Khong ro so tien (giao dich goc khong con) -> ghi chung "phi kham" thay vi de trong
        vars.put("refundAmount", event.refundAmount() != null ? MailFormat.money(event.refundAmount()) : "phí khám");
        return vars;
    }

    static String cancelledByLabel(AppointmentCancelledEvent.CancelledBy cancelledBy, String doctorName) {
        if (cancelledBy == null) return "Hệ thống";
        return switch (cancelledBy) {
            case PATIENT -> "Bệnh nhân";
            case DOCTOR -> "Bác sĩ " + (doctorName != null ? doctorName : "");
            case ADMIN -> "Quản trị viên";
        };
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
