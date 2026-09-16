package com.mediassist.payment;

public class PaymentVerificationResult {

    private final boolean paid;
    private final String gatewayReference;
    private final String paymentMethodDetails;
    private final String failureReason;

    public PaymentVerificationResult(boolean paid, String gatewayReference, String paymentMethodDetails, String failureReason) {
        this.paid = paid;
        this.gatewayReference = gatewayReference;
        this.paymentMethodDetails = paymentMethodDetails;
        this.failureReason = failureReason;
    }

    public static PaymentVerificationResult paid(String gatewayReference, String paymentMethodDetails) {
        return new PaymentVerificationResult(true, gatewayReference, paymentMethodDetails, null);
    }

    public static PaymentVerificationResult unpaid(String failureReason) {
        return new PaymentVerificationResult(false, null, null, failureReason);
    }

    public boolean isPaid() {
        return paid;
    }

    public String getGatewayReference() {
        return gatewayReference;
    }

    public String getPaymentMethodDetails() {
        return paymentMethodDetails;
    }

    public String getFailureReason() {
        return failureReason;
    }
}
