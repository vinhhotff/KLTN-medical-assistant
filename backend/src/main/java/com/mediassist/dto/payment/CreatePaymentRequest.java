package com.mediassist.dto.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreatePaymentRequest {

    @NotBlank(message = "Loại đơn hàng (orderType) không được để trống")
    private String orderType; // QUOTA_PURCHASE or APPOINTMENT_FEE

    private String packageId; // e.g. BASIC_5, VIP_MONTHLY, VIP_ENTERPRISE

    private String appointmentId; // for APPOINTMENT_FEE

    @NotBlank(message = "Phương thức thanh toán (paymentMethod) không được để trống")
    private String paymentMethod; // STRIPE, VIETQR, VNPAY, MOMO, MOCK

    public CreatePaymentRequest() {
    }

    public CreatePaymentRequest(String orderType, String packageId, String appointmentId, String paymentMethod) {
        this.orderType = orderType;
        this.packageId = packageId;
        this.appointmentId = appointmentId;
        this.paymentMethod = paymentMethod;
    }

    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }

    public String getPackageId() {
        return packageId;
    }

    public void setPackageId(String packageId) {
        this.packageId = packageId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
}
