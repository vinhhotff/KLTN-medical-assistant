package com.mediassist.service;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.PaymentStatus;
import com.mediassist.model.entity.PaymentTransaction;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.TransactionStatus;
import com.mediassist.repository.PaymentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Tu dong tinh toan va hoan tien theo chinh sach huy lich hen (100% >24h / Bac si-Admin huy, 80% 2-24h, 0% <2h)
 * dung chung cho benh nhan/bac si huy (AppointmentService) va quan tri vien huy (AdminVettingService).
 * Chay trong transaction cua nguoi goi.
 */
@Service
public class AppointmentRefundService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentRefundService.class);

    private final PaymentTransactionRepository paymentTransactionRepository;

    public AppointmentRefundService(PaymentTransactionRepository paymentTransactionRepository) {
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    /** Ket qua hoan tien: refunded=false khi lich hen chua thanh toan hoac khong du dieu kien hoan; amount co the null/0. */
    public record RefundResult(boolean refunded, BigDecimal amount) {
        public static final RefundResult NONE = new RefundResult(false, null);
    }

    /** Muc hoan tien ap dung theo vai tro huy va khoang thoi gian truoc gio kham. */
    public record RefundPolicy(int percentage, String policyNote) {}

    /**
     * Danh gia ty le hoan tien ap dung theo chinh sach BR-22 / BR-30.
     */
    public RefundPolicy evaluatePolicy(Appointment appointment, Role cancelledByRole) {
        if (cancelledByRole == Role.DOCTOR || cancelledByRole == Role.ADMIN) {
            return new RefundPolicy(100, "Hoàn tiền 100% do Bác sĩ / Phòng khám hủy lịch hẹn");
        }
        if (appointment.getScheduledStart() == null) {
            return new RefundPolicy(100, "Hoàn tiền 100% khi hủy lịch hẹn đã thanh toán");
        }

        long minutesUntil = Duration.between(LocalDateTime.now(), appointment.getScheduledStart()).toMinutes();
        if (minutesUntil >= 24L * 60L) {
            return new RefundPolicy(100, "Hoàn tiền 100% (Hủy lịch trước giờ khám trên 24 giờ)");
        }
        if (minutesUntil >= 2L * 60L) {
            return new RefundPolicy(80, "Hoàn tiền 80% (Hủy trước giờ khám 2–24 giờ, khấu trừ 20% phí hành chính)");
        }
        return new RefundPolicy(0, "Không hoàn tiền (Hủy sát giờ khám dưới 2 giờ)");
    }

    /**
     * Phien ban tuong thich nguoc (mac dinh 100% neu Admin/he thong goi).
     */
    public RefundResult refundIfPaid(Appointment appointment) {
        return refundIfPaid(appointment, null);
    }

    /**
     * Lich hen dang PAID: tinh ty le hoan theo chinh sach, cap nhat giao dich tuong ung va luu thong tin hoan tien.
     */
    public RefundResult refundIfPaid(Appointment appointment, Role cancelledByRole) {
        if (appointment.getPaymentStatus() != PaymentStatus.PAID) {
            return RefundResult.NONE;
        }

        RefundPolicy policy = evaluatePolicy(appointment, cancelledByRole);
        int pct = policy.percentage();
        String policyNote = policy.policyNote();

        if (pct == 0) {
            appointment.setRefundAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            appointment.setRefundPercentage(0);
            appointment.setRefundPolicyNote(policyNote);
            log.info("ℹ️ [NO-REFUND POLICY] Appointment {} cancelled <2h before visit; keeping PAID without refund.",
                    appointment.getAppointmentCode());
            return new RefundResult(false, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }

        Optional<PaymentTransaction> completedTx = paymentTransactionRepository
                .findFirstByReferenceIdAndStatus(appointment.getId().toString(), TransactionStatus.COMPLETED);
        BigDecimal baseAmount = completedTx
                .map(tx -> {
                    tx.setStatus(TransactionStatus.REFUNDED);
                    paymentTransactionRepository.save(tx);
                    return tx.getAmount();
                })
                .orElseGet(() -> paymentTransactionRepository
                        .findFirstByReferenceIdAndStatus(appointment.getId().toString(), TransactionStatus.REFUNDED)
                        .map(PaymentTransaction::getAmount)
                        .orElse(appointment.getFeeAmount()));

        BigDecimal refundAmount = null;
        if (baseAmount != null) {
            refundAmount = (pct == 100)
                    ? baseAmount
                    : baseAmount.multiply(BigDecimal.valueOf(pct)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        appointment.setPaymentStatus(PaymentStatus.REFUNDED);
        appointment.setRefundAmount(refundAmount);
        appointment.setRefundPercentage(pct);
        appointment.setRefundedAt(LocalDateTime.now());
        appointment.setRefundPolicyNote(policyNote);

        log.info("💸 [AUTO-REFUND] Appointment {} refunded {}% ({}) due to cancellation",
                appointment.getAppointmentCode(), pct, refundAmount);
        return new RefundResult(true, refundAmount);
    }
}
