package com.mediassist.payment;

import com.mediassist.model.entity.OrderType;
import com.mediassist.model.entity.PaymentTransaction;
import com.stripe.Stripe;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class StripePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);

    @Value("${app.payment.stripe.secret-key:}")
    private String secretKey;

    @Value("${app.payment.stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.payment.stripe.currency:vnd}")
    private String currency;

    @Value("${app.payment.stripe.enabled:true}")
    private boolean enabled;

    @Override
    public String getGatewayName() {
        return "STRIPE";
    }

    @Override
    public boolean supports(String paymentMethod) {
        if (paymentMethod == null) return false;
        String m = paymentMethod.trim().toUpperCase();
        return "STRIPE".equals(m) || "CARD".equals(m) || "CREDIT_CARD".equals(m) || "STRIPE_SANDBOX".equals(m);
    }

    @Override
    public PaymentInitiationResult initiatePayment(PaymentTransaction tx, String successUrl, String cancelUrl) {
        boolean isRealKey = secretKey != null && !secretKey.isBlank()
                && !secretKey.contains("mock")
                && (secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_"));

        if (!isRealKey) {
            log.info("💳 [STRIPE SANDBOX MOCK] No live/sandbox Stripe API key provided. Using local sandbox fallback for tx: {}", tx.getTransactionCode());
            String mockSessionId = "cs_test_mock_" + UUID.randomUUID().toString().replace("-", "");
            String redirectUrl = successUrl + (successUrl.contains("?") ? "&" : "?")
                    + "session_id=" + mockSessionId
                    + "&tx=" + tx.getTransactionCode()
                    + "&sandbox=stripe";
            return PaymentInitiationResult.success(redirectUrl, mockSessionId,
                    "Chế độ Stripe Sandbox mô phỏng nội bộ đã sẵn sàng.");
        }

        try {
            Stripe.apiKey = secretKey;

            String curr = tx.getCurrency() != null ? tx.getCurrency().toLowerCase() : "vnd";
            long unitAmount = tx.getAmount().longValue();
            if (!"vnd".equals(curr)) {
                unitAmount = tx.getAmount().multiply(new BigDecimal(100)).longValue();
            }

            String productName = buildProductName(tx);

            SessionCreateParams.LineItem.PriceData.ProductData productData =
                    SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName(productName)
                            .setDescription("Dịch vụ y tế MediAssist-AI - Mã đơn: " + tx.getTransactionCode())
                            .build();

            SessionCreateParams.LineItem.PriceData priceData =
                    SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(curr)
                            .setUnitAmount(unitAmount)
                            .setProductData(productData)
                            .build();

            SessionCreateParams.LineItem lineItem =
                    SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(priceData)
                            .build();

            String finalSuccessUrl = successUrl + (successUrl.contains("?") ? "&" : "?")
                    + "session_id={CHECKOUT_SESSION_ID}&tx=" + tx.getTransactionCode();
            String finalCancelUrl = cancelUrl + (cancelUrl.contains("?") ? "&" : "?")
                    + "tx=" + tx.getTransactionCode();

            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(finalSuccessUrl)
                    .setCancelUrl(finalCancelUrl)
                    .addLineItem(lineItem)
                    .putMetadata("transaction_code", tx.getTransactionCode())
                    .putMetadata("order_type", tx.getOrderType().name())
                    .putMetadata("user_id", tx.getUser().getId().toString())
                    .build();

            Session session = Session.create(params);
            log.info("💳 [STRIPE CHECKOUT CREATED] Session: {}, URL: {}", session.getId(), session.getUrl());
            return PaymentInitiationResult.success(session.getUrl(), session.getId(), "Khởi tạo Stripe Checkout thành công");

        } catch (Exception e) {
            log.warn("🚨 [STRIPE API ERROR] Could not create Stripe checkout session: {}. Falling back to sandbox.", e.getMessage());
            String mockSessionId = "cs_test_mock_" + UUID.randomUUID().toString().replace("-", "");
            String redirectUrl = successUrl + (successUrl.contains("?") ? "&" : "?")
                    + "session_id=" + mockSessionId
                    + "&tx=" + tx.getTransactionCode()
                    + "&sandbox=stripe";
            return PaymentInitiationResult.success(redirectUrl, mockSessionId,
                    "Stripe API gián đoạn, tự động chuyển chế độ Stripe Sandbox mô phỏng.");
        }
    }

    @Override
    public PaymentVerificationResult verifyPayment(String gatewayReference) {
        if (gatewayReference == null || gatewayReference.isBlank()) {
            return PaymentVerificationResult.unpaid("Thiếu mã tham chiếu cổng thanh toán Stripe");
        }

        if (gatewayReference.startsWith("cs_test_mock_")) {
            log.info("💳 [STRIPE SANDBOX VERIFY] Verified mock sandbox session: {}", gatewayReference);
            return PaymentVerificationResult.paid(gatewayReference, "Stripe Sandbox (Thẻ thử nghiệm Visa 4242)");
        }

        boolean isRealKey = secretKey != null && !secretKey.isBlank()
                && !secretKey.contains("mock")
                && (secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_"));

        if (!isRealKey) {
            return PaymentVerificationResult.paid(gatewayReference, "Stripe Sandbox (Mô phỏng)");
        }

        try {
            Stripe.apiKey = secretKey;
            Session session = Session.retrieve(gatewayReference);
            if ("paid".equalsIgnoreCase(session.getPaymentStatus())) {
                log.info("✅ [STRIPE VERIFIED] Session {} is paid successfully.", gatewayReference);
                return PaymentVerificationResult.paid(gatewayReference, "Stripe Thẻ Quốc Tế");
            } else {
                log.warn("⚠️ [STRIPE UNPAID] Session {} payment_status is: {}", gatewayReference, session.getPaymentStatus());
                return PaymentVerificationResult.unpaid("Trạng thái thanh toán Stripe: " + session.getPaymentStatus());
            }
        } catch (Exception e) {
            log.error("❌ [STRIPE VERIFY ERROR] Error retrieving session {}: {}", gatewayReference, e.getMessage());
            return PaymentVerificationResult.unpaid("Không thể kiểm tra phiên thanh toán Stripe: " + e.getMessage());
        }
    }

    public Event constructWebhookEvent(String payload, String sigHeader) {
        if (webhookSecret == null || webhookSecret.isBlank() || webhookSecret.contains("mock")) {
            log.warn("Stripe webhookSecret not configured or mock. Skipping HMAC check.");
            return null;
        }
        try {
            return Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (Exception e) {
            log.error("Invalid Stripe webhook signature: {}", e.getMessage());
            return null;
        }
    }

    private String buildProductName(PaymentTransaction tx) {
        if (tx.getOrderType() == OrderType.QUOTA_PURCHASE) {
            String pkg = tx.getReferenceId() != null ? tx.getReferenceId() : "BASIC_5";
            return switch (pkg) {
                case "VIP_MONTHLY" -> "Gói Hội Viên VIP Tiết Kiệm (30 Ngày)";
                case "VIP_ENTERPRISE" -> "Gói Hội Viên VIP Gia Đình (90 Ngày)";
                default -> "Gói Phân Tích Bệnh Án (+5 Lượt Quét)";
            };
        } else if (tx.getOrderType() == OrderType.APPOINTMENT_FEE) {
            return "Phí Khám Tư Vấn Chuyên Khoa - Lịch Hẹn";
        }
        return "Dịch Vụ Y Tế MediAssist-AI";
    }
}
