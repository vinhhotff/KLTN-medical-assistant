package com.mediassist.payment;

public class PaymentInitiationResult {

    private final boolean success;
    private final String checkoutUrl;
    private final String gatewayReference;
    private final String qrPayload;
    private final String message;
    private final String mode;

    public PaymentInitiationResult(boolean success, String checkoutUrl, String gatewayReference, String qrPayload, String message) {
        this(success, checkoutUrl, gatewayReference, qrPayload, message, null);
    }

    public PaymentInitiationResult(boolean success, String checkoutUrl, String gatewayReference, String qrPayload, String message, String mode) {
        this.success = success;
        this.checkoutUrl = checkoutUrl;
        this.gatewayReference = gatewayReference;
        this.qrPayload = qrPayload;
        this.message = message;
        this.mode = mode;
    }

    public static PaymentInitiationResult success(String checkoutUrl, String gatewayReference, String message) {
        return new PaymentInitiationResult(true, checkoutUrl, gatewayReference, null, message, null);
    }

    public static PaymentInitiationResult success(String checkoutUrl, String gatewayReference, String message, String mode) {
        return new PaymentInitiationResult(true, checkoutUrl, gatewayReference, null, message, mode);
    }

    public static PaymentInitiationResult qrSuccess(String checkoutUrl, String gatewayReference, String qrPayload, String message) {
        return new PaymentInitiationResult(true, checkoutUrl, gatewayReference, qrPayload, message, "MOCK");
    }

    public static PaymentInitiationResult failed(String message) {
        return new PaymentInitiationResult(false, null, null, null, message, null);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }

    public String getGatewayReference() {
        return gatewayReference;
    }

    public String getQrPayload() {
        return qrPayload;
    }

    public String getMessage() {
        return message;
    }

    public String getMode() {
        return mode;
    }
}
