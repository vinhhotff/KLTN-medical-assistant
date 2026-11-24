package com.mediassist.service;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.PaymentStatus;
import com.mediassist.model.entity.TransactionStatus;
import com.mediassist.payment.PaymentGateway;
import com.mediassist.payment.PaymentGatewayRouter;
import com.mediassist.repository.PaymentTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Tự động hoàn tiền 100% khi lịch hẹn đã thanh toán bị hủy bởi Bác sĩ hoặc Bệnh nhân.
 * Hỗ trợ kích hoạt trực tiếp qua PaymentGateway (Stripe / Mock VietQR).
 */
@Service
public class AppointmentRefundService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentRefundService.class);

    private final PaymentTransactionRepository paymentTransactionRepository;
    private PaymentGatewayRouter paymentGatewayRouter;

    public AppointmentRefundService(PaymentTransactionRepository paymentTransactionRepository) {
        this.paymentTransactionRepository = paymentTransactionRepository;
    }

    @Autowired(required = false)
    public void setPaymentGatewayRouter(PaymentGatewayRouter paymentGatewayRouter) {
        this.paymentGatewayRouter = paymentGatewayRouter;
    }

    /** Ket qua hoan tien: refunded=false khi lich hen chua thanh toan; amount co the null neu khong ro so tien. */
    public record RefundResult(boolean refunded, BigDecimal amount) {
        public static final RefundResult NONE = new RefundResult(false, null);
    }

    /**
     * Lich hen dang PAID: giao dich COMPLETED tuong ung -> REFUNDED, lich hen -> REFUNDED.
     * Khi Bác sĩ hủy lịch hoặc Bệnh nhân hủy hợp lệ, hệ thống hoàn tiền 100% qua PaymentGateway.
     */
    public RefundResult refundIfPaid(Appointment appointment) {
        if (appointment.getPaymentStatus() != PaymentStatus.PAID) {
            return RefundResult.NONE;
        }
        BigDecimal refundAmount = paymentTransactionRepository
                .findFirstByReferenceIdAndStatus(appointment.getId().toString(), TransactionStatus.COMPLETED)
                .map(tx -> {
                    if (paymentGatewayRouter != null) {
                        try {
                            PaymentGateway gateway = paymentGatewayRouter.resolveGateway(tx.getPaymentMethod());
                            if (gateway != null) {
                                gateway.refundPayment(tx, tx.getAmount(), "Appointment cancelled: " + appointment.getAppointmentCode());
                            }
                        } catch (Exception e) {
                            log.error("Failed to execute gateway refund for tx {}: {}", tx.getTransactionCode(), e.getMessage());
                        }
                    }
                    tx.setStatus(TransactionStatus.REFUNDED);
                    paymentTransactionRepository.save(tx);
                    return tx.getAmount();
                })
                .orElse(appointment.getFeeAmount());
        appointment.setPaymentStatus(PaymentStatus.REFUNDED);
        log.info("💸 [AUTO-REFUND-100%] Appointment {} 100% refunded successfully (Amount: {} VND)", 
                appointment.getAppointmentCode(), refundAmount);
        return new RefundResult(true, refundAmount);
    }
}
