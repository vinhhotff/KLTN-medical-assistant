package com.mediassist.dto.payment;

import jakarta.validation.constraints.NotBlank;

public class VerifyPaymentRequest {

    @NotBlank(message = "Mã giao dịch (transactionCode) không được để trống")
    private String transactionCode;

    private String sessionId;

    public VerifyPaymentRequest() {
    }

    public VerifyPaymentRequest(String transactionCode, String sessionId) {
        this.transactionCode = transactionCode;
        this.sessionId = sessionId;
    }

    public String getTransactionCode() {
        return transactionCode;
    }

    public void setTransactionCode(String transactionCode) {
        this.transactionCode = transactionCode;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}
