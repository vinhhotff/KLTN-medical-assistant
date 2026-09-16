package com.mediassist.dto.payment;

import com.mediassist.model.entity.PaymentTransaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class PaymentHistoryDto {

    private UUID id;
    private String transactionCode;
    private String orderType;
    private String referenceId;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
    private String paymentGateway;
    private String status;
    private String gatewayReference;
    private LocalDateTime createdAt;

    public PaymentHistoryDto() {
    }

    public static PaymentHistoryDto fromEntity(PaymentTransaction tx) {
        PaymentHistoryDto dto = new PaymentHistoryDto();
        dto.setId(tx.getId());
        dto.setTransactionCode(tx.getTransactionCode());
        dto.setOrderType(tx.getOrderType().name());
        dto.setReferenceId(tx.getReferenceId());
        dto.setAmount(tx.getAmount());
        dto.setCurrency(tx.getCurrency());
        dto.setPaymentMethod(tx.getPaymentMethod());
        dto.setPaymentGateway(tx.getPaymentGateway());
        dto.setStatus(tx.getStatus().name());
        dto.setGatewayReference(tx.getGatewayReference());
        dto.setCreatedAt(tx.getCreatedAt());
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getGatewayReference() {
        return gatewayReference;
    }

    public void setGatewayReference(String gatewayReference) {
        this.gatewayReference = gatewayReference;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
