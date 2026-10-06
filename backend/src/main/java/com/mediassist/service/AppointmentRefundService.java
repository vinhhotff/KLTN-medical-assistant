package com.mediassist.service;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.PaymentStatus;
import com.mediassist.model.entity.TransactionStatus;
import com.mediassist.repository.PaymentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Tu dong hoan tien khi huy lich hen da thanh toan - dung chung cho benh nhan/bac si huy
 * (AppointmentService) va quan tri vien huy (AdminVettingService).
 * Hien chi ghi nhan trang thai REFUNDED trong he thong, chua goi API refund cua cong thanh toan.
 * Chay trong transaction cua nguoi goi.
 */
@Service
public class AppointmentRefundService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentRefundService.class);

    private final PaymentTransactionRepository paymentTransactionRepository;

    public AppointmentRefundService(PaymentTransactionRepository paymentTransactionRepository) {
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    /** Ket qua hoan tien: refunded=false khi lich hen chua thanh toan; amount co the null neu khong ro so tien. */
    public record RefundResult(boolean refunded, BigDecimal amount) {
        public static final RefundResult NONE = new RefundResult(false, null);
    }

    /**
     * Lich hen dang PAID: giao dich COMPLETED tuong ung -> REFUNDED, lich hen -> REFUNDED.
     */
    public RefundResult refundIfPaid(Appointment appointment) {
        if (appointment.getPaymentStatus() != PaymentStatus.PAID) {
            return RefundResult.NONE;
        }
        BigDecimal refundAmount = paymentTransactionRepository
                .findFirstByReferenceIdAndStatus(appointment.getId().toString(), TransactionStatus.COMPLETED)
                .map(tx -> {
                    tx.setStatus(TransactionStatus.REFUNDED);
                    paymentTransactionRepository.save(tx);
                    return tx.getAmount();
                })
                .orElse(appointment.getFeeAmount());
        appointment.setPaymentStatus(PaymentStatus.REFUNDED);
        log.info("💸 [AUTO-REFUND] Appointment {} refunded due to cancellation", appointment.getAppointmentCode());
        return new RefundResult(true, refundAmount);
    }
}
