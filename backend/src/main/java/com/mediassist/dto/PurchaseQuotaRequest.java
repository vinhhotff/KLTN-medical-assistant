package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;

public class PurchaseQuotaRequest {

    @NotBlank(message = "Mã gói dịch vụ không được để trống")
    private String packageId;

    private String paymentMethod;

    public PurchaseQuotaRequest() {}

    public PurchaseQuotaRequest(String packageId, String paymentMethod) {
        this.packageId = packageId;
        this.paymentMethod = paymentMethod;
    }

    public String getPackageId() { return packageId; }
    public void setPackageId(String packageId) { this.packageId = packageId; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
}
