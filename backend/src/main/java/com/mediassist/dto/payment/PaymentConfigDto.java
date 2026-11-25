package com.mediassist.dto.payment;

/**
 * Cấu hình cổng thanh toán công khai trả về cho frontend để hiển thị trạng thái REAL vs MOCK.
 */
public class PaymentConfigDto {

    private String stripeMode;
    private boolean stripeEnabled;
    private boolean stripeRealConfigured;
    private String publishableKey;
    private String currency;
    private long minStripeAmountVnd;
    private boolean mockGatewayEnabled;
    private boolean webhookConfigured;

    public PaymentConfigDto() {
    }

    public PaymentConfigDto(String stripeMode,
                            boolean stripeEnabled,
                            boolean stripeRealConfigured,
                            String publishableKey,
                            String currency,
                            long minStripeAmountVnd,
                            boolean mockGatewayEnabled,
                            boolean webhookConfigured) {
        this.stripeMode = stripeMode;
        this.stripeEnabled = stripeEnabled;
        this.stripeRealConfigured = stripeRealConfigured;
        this.publishableKey = publishableKey;
        this.currency = currency;
        this.minStripeAmountVnd = minStripeAmountVnd;
        this.mockGatewayEnabled = mockGatewayEnabled;
        this.webhookConfigured = webhookConfigured;
    }

    public String getStripeMode() {
        return stripeMode;
    }

    public void setStripeMode(String stripeMode) {
        this.stripeMode = stripeMode;
    }

    public boolean isStripeEnabled() {
        return stripeEnabled;
    }

    public void setStripeEnabled(boolean stripeEnabled) {
        this.stripeEnabled = stripeEnabled;
    }

    public boolean isStripeRealConfigured() {
        return stripeRealConfigured;
    }

    public void setStripeRealConfigured(boolean stripeRealConfigured) {
        this.stripeRealConfigured = stripeRealConfigured;
    }

    public String getPublishableKey() {
        return publishableKey;
    }

    public void setPublishableKey(String publishableKey) {
        this.publishableKey = publishableKey;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public long getMinStripeAmountVnd() {
        return minStripeAmountVnd;
    }

    public void setMinStripeAmountVnd(long minStripeAmountVnd) {
        this.minStripeAmountVnd = minStripeAmountVnd;
    }

    public boolean isMockGatewayEnabled() {
        return mockGatewayEnabled;
    }

    public void setMockGatewayEnabled(boolean mockGatewayEnabled) {
        this.mockGatewayEnabled = mockGatewayEnabled;
    }

    public boolean isWebhookConfigured() {
        return webhookConfigured;
    }

    public void setWebhookConfigured(boolean webhookConfigured) {
        this.webhookConfigured = webhookConfigured;
    }
}
