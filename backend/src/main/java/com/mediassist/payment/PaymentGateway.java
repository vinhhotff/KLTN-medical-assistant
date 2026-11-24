package com.mediassist.payment;

import com.mediassist.model.entity.PaymentTransaction;

public interface PaymentGateway {

    String getGatewayName();

    boolean supports(String paymentMethod);

    PaymentInitiationResult initiatePayment(PaymentTransaction tx, String successUrl, String cancelUrl);

    PaymentVerificationResult verifyPayment(String gatewayReference);

    default boolean refundPayment(PaymentTransaction tx, java.math.BigDecimal amount, String reason) {
        return true;
    }
}
