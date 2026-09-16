package com.mediassist.dto.payment;

import java.math.BigDecimal;

public class PaymentResponseDto {

    private String transactionCode;
    private String orderType;
    private String status;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String paymentGateway;
    private String checkoutUrl;
    private String gatewayReference;
    private String qrPayload;
    private String message;

    public PaymentResponseDto() {
    }

    public PaymentResponseDto(String transactionCode, String orderType, String status,
                              BigDecimal amount, String currency, String paymentMethod,
                              String paymentGateway, String checkoutUrl, String gatewayReference,
                              String qrPayload, String message) {
        this.transactionCode = transactionCode;
        this.orderType = orderType;
        this.status = status;
        this.amount = amount;
        this.currency = currency;
        this.paymentMethod = paymentMethod;
        this.paymentGateway = paymentGateway;
        this.checkoutUrl = checkoutUrl;
        this.gatewayReference = gatewayReference;
        this.qrPayload = qrPayload;
        this.message = message;
    }

    public String getTransactionCode() {
        return transactionCode;
    }

    public void setTransactionCode(String transactionCode) {
        this.transactionCode = transactionCode;
    }

    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentGateway() {
        return paymentGateway;
    }

    public void setPaymentGateway(String paymentGateway) {
        this.paymentGateway = paymentGateway;
    }

    public String getCheckoutUrl() {
        return checkoutUrl;
    }

    public void setCheckoutUrl(String checkoutUrl) {
        this.checkoutUrl = checkoutUrl;
    }

    public String getGatewayReference() {
        return gatewayReference;
    }

    public void setGatewayReference(String gatewayReference) {
        this.gatewayReference = gatewayReference;
    }

    public String getQrPayload() {
        return qrPayload;
    }

    public void setQrPayload(String qrPayload) {
        this.qrPayload = qrPayload;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
