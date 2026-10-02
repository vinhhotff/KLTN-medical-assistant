package com.mediassist.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Phat dung 1 lan khi giao dich chuyen PENDING -> COMPLETED (verify hoac Stripe webhook).
 * appointmentCode/appointmentStart chi co voi APPOINTMENT_FEE; packageId chi co voi QUOTA_PURCHASE.
 */
public record PaymentCompletedEvent(
        String transactionCode,
        String userEmail,
        String userName,
        BigDecimal amount,
        String currency,
        String paymentMethod,
        LocalDateTime completedAt,
        String orderType,
        String packageId,
        String appointmentCode,
        LocalDateTime appointmentStart
) {
}
