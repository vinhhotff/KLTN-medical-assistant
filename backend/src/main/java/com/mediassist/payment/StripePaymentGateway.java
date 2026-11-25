package com.mediassist.payment;

import com.mediassist.common.AppException;
import com.mediassist.model.entity.OrderType;
import com.mediassist.model.entity.PaymentTransaction;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Component
public class StripePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);

    /**
     * Tiền tệ không có chữ số thập phân theo chuẩn Stripe (ví dụ VND, JPY, KRW):
     * unitAmount truyền cho Stripe phải bằng đúng giá trị nguyên, KHÔNG nhân 100.
     */
    private static final Set<String> ZERO_DECIMAL_CURRENCIES = Set.of(
            "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
            "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"
    );

    interface StripeSdkClient {
        Session createSession(SessionCreateParams params, RequestOptions options) throws StripeException;
        Session retrieveSession(String sessionId, RequestOptions options) throws StripeException;
        PaymentIntent retrievePaymentIntent(String paymentIntentId, RequestOptions options) throws StripeException;
        Refund createRefund(RefundCreateParams params, RequestOptions options) throws StripeException;
        Event constructWebhookEvent(String payload, String sigHeader, String webhookSecret) throws SignatureVerificationException;
    }

    private static final StripeSdkClient DEFAULT_SDK_CLIENT = new StripeSdkClient() {
        @Override
        public Session createSession(SessionCreateParams params, RequestOptions options) throws StripeException {
            return Session.create(params, options);
        }

        @Override
        public Session retrieveSession(String sessionId, RequestOptions options) throws StripeException {
            return Session.retrieve(sessionId, options);
        }

        @Override
        public PaymentIntent retrievePaymentIntent(String paymentIntentId, RequestOptions options) throws StripeException {
            return PaymentIntent.retrieve(paymentIntentId, options);
        }

        @Override
        public Refund createRefund(RefundCreateParams params, RequestOptions options) throws StripeException {
            return Refund.create(params, options);
        }

        @Override
        public Event constructWebhookEvent(String payload, String sigHeader, String webhookSecret) throws SignatureVerificationException {
            return Webhook.constructEvent(payload, sigHeader, webhookSecret);
        }
    };

    private final StripeSdkClient sdkClient;

    @Value("${app.payment.stripe.secret-key:}")
    private String secretKey;

    @Value("${app.payment.stripe.publishable-key:}")
    private String publishableKey;

    @Value("${app.payment.stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${app.payment.stripe.currency:vnd}")
    private String currency = "vnd";

    @Value("${app.payment.stripe.enabled:true}")
    private boolean enabled = true;

    @Value("${app.payment.mock.enabled:true}")
    private boolean mockEnabled = true;

    @Value("${app.payment.stripe.mode:auto}")
    private String configuredMode = "auto";

    @Value("${app.payment.stripe.min-vnd-amount:15000}")
    private long minVndAmount = 15000L;

    @Autowired
    public StripePaymentGateway() {
        this(DEFAULT_SDK_CLIENT);
    }

    StripePaymentGateway(StripeSdkClient sdkClient) {
        this.sdkClient = sdkClient;
    }

    @Override
    public String getGatewayName() {
        return "STRIPE";
    }

    @Override
    public boolean supports(String paymentMethod) {
        if (paymentMethod == null) return false;
        String m = paymentMethod.trim().toUpperCase(Locale.ROOT);
        return "STRIPE".equals(m) || "CARD".equals(m) || "CREDIT_CARD".equals(m) || "STRIPE_SANDBOX".equals(m);
    }

    public boolean hasRealSecretKey() {
        if (secretKey == null || secretKey.isBlank()) return false;
        String lower = secretKey.trim().toLowerCase(Locale.ROOT);
        if (lower.contains("mock") || lower.contains("your_") || lower.contains("placeholder")) {
            return false;
        }
        return lower.startsWith("sk_test_") || lower.startsWith("sk_live_");
    }

    public boolean hasRealWebhookSecret() {
        if (webhookSecret == null || webhookSecret.isBlank()) return false;
        String lower = webhookSecret.trim().toLowerCase(Locale.ROOT);
        if (lower.contains("mock") || lower.contains("your_") || lower.contains("placeholder")) {
            return false;
        }
        return lower.startsWith("whsec_");
    }

    public String getActiveMode() {
        if (!enabled) {
            return "DISABLED";
        }
        String mode = configuredMode != null ? configuredMode.trim().toLowerCase(Locale.ROOT) : "auto";
        if ("mock".equals(mode)) {
            return mockEnabled ? "MOCK" : "DISABLED";
        }
        if ("real".equals(mode)) {
            return hasRealSecretKey() ? "REAL" : "DISABLED";
        }
        if (hasRealSecretKey()) {
            return "REAL";
        }
        return mockEnabled ? "MOCK" : "DISABLED";
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getPublishableKey() {
        return publishableKey != null ? publishableKey.trim() : "";
    }

    public String getCurrency() {
        return currency != null ? currency.trim().toUpperCase(Locale.ROOT) : "VND";
    }

    public long getMinVndAmount() {
        return minVndAmount;
    }

    public boolean isMockEnabled() {
        return mockEnabled;
    }

    public long toStripeUnitAmount(BigDecimal amount, String curr) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số tiền thanh toán phải lớn hơn 0.");
        }
        String normalizedCurr = curr != null ? curr.trim().toLowerCase(Locale.ROOT) : "vnd";
        if (ZERO_DECIMAL_CURRENCIES.contains(normalizedCurr)) {
            return amount.setScale(0, RoundingMode.HALF_UP).longValueExact();
        }
        return amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    @Override
    public PaymentInitiationResult initiatePayment(PaymentTransaction tx, String successUrl, String cancelUrl) {
        String activeMode = getActiveMode();
        if ("DISABLED".equals(activeMode)) {
            log.warn("🚫 [STRIPE DISABLED] Stripe gateway is disabled or missing real API key while mock is off.");
            return PaymentInitiationResult.failed(
                    "Cổng thanh toán Stripe chưa sẵn sàng (thiếu STRIPE_SECRET_KEY hợp lệ và chế độ Mock đang tắt).");
        }

        if ("MOCK".equals(activeMode)) {
            log.info("💳 [STRIPE SANDBOX MOCK] Using local sandbox fallback for tx: {}", tx.getTransactionCode());
            String mockSessionId = "cs_test_mock_" + UUID.randomUUID().toString().replace("-", "");
            String redirectUrl = appendQueryParam(successUrl, "session_id=" + mockSessionId
                    + "&tx=" + tx.getTransactionCode()
                    + "&sandbox=stripe");
            return PaymentInitiationResult.success(redirectUrl, mockSessionId,
                    "Chế độ Stripe Sandbox mô phỏng nội bộ đã sẵn sàng.", "MOCK");
        }

        String curr = tx.getCurrency() != null && !tx.getCurrency().isBlank()
                ? tx.getCurrency().trim().toLowerCase(Locale.ROOT)
                : (currency != null ? currency.trim().toLowerCase(Locale.ROOT) : "vnd");

        long unitAmount;
        try {
            unitAmount = toStripeUnitAmount(tx.getAmount(), curr);
        } catch (Exception ex) {
            return PaymentInitiationResult.failed("Số tiền thanh toán không hợp lệ: " + ex.getMessage());
        }

        if ("vnd".equals(curr) && unitAmount < minVndAmount) {
            log.warn("⚠️ [STRIPE MIN AMOUNT] Rejected {} VND (< {} VND minimum) for tx {}",
                    unitAmount, minVndAmount, tx.getTransactionCode());
            return PaymentInitiationResult.failed(
                    "Số tiền thanh toán qua Stripe tối thiểu là " + minVndAmount + " VND (tương đương ~0.50 USD theo quy định của Stripe).");
        }

        try {
            RequestOptions options = buildRequestOptions();
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

            String finalSuccessUrl = appendQueryParam(successUrl,
                    "session_id={CHECKOUT_SESSION_ID}&tx=" + tx.getTransactionCode());
            String finalCancelUrl = appendQueryParam(cancelUrl,
                    "tx=" + tx.getTransactionCode());

            SessionCreateParams.PaymentIntentData.Builder piBuilder =
                    SessionCreateParams.PaymentIntentData.builder()
                            .putMetadata("transaction_code", tx.getTransactionCode())
                            .putMetadata("order_type", tx.getOrderType().name());
            if (tx.getReferenceId() != null) {
                piBuilder.putMetadata("reference_id", tx.getReferenceId());
            }

            SessionCreateParams.Builder paramsBuilder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setSuccessUrl(finalSuccessUrl)
                    .setCancelUrl(finalCancelUrl)
                    .setClientReferenceId(tx.getTransactionCode())
                    .addLineItem(lineItem)
                    .setPaymentIntentData(piBuilder.build())
                    .putMetadata("transaction_code", tx.getTransactionCode())
                    .putMetadata("order_type", tx.getOrderType().name());

            if (tx.getReferenceId() != null) {
                paramsBuilder.putMetadata("reference_id", tx.getReferenceId());
            }
            if (tx.getUser() != null) {
                if (tx.getUser().getId() != null) {
                    paramsBuilder.putMetadata("user_id", tx.getUser().getId().toString());
                }
                if (tx.getUser().getEmail() != null && !tx.getUser().getEmail().isBlank()) {
                    paramsBuilder.setCustomerEmail(tx.getUser().getEmail());
                }
            }

            Session session = sdkClient.createSession(paramsBuilder.build(), options);
            log.info("💳 [STRIPE CHECKOUT CREATED] Session: {}, URL: {}", session.getId(), session.getUrl());
            return PaymentInitiationResult.success(session.getUrl(), session.getId(),
                    "Khởi tạo Stripe Checkout thành công", "REAL");

        } catch (StripeException e) {
            log.error("🚨 [STRIPE API ERROR] Code: {}, RequestId: {}, Message: {}",
                    e.getCode(), e.getRequestId(), e.getMessage());
            return PaymentInitiationResult.failed("Không thể khởi tạo phiên thanh toán Stripe: " + e.getMessage());
        } catch (Exception e) {
            log.error("🚨 [STRIPE UNEXPECTED ERROR] {}", e.getMessage(), e);
            return PaymentInitiationResult.failed("Lỗi kết nối cổng thanh toán Stripe: " + e.getMessage());
        }
    }

    @Override
    public PaymentVerificationResult verifyPayment(String gatewayReference) {
        return verifyPayment(gatewayReference, null);
    }

    public PaymentVerificationResult verifyPayment(String gatewayReference, String expectedTransactionCode) {
        if (gatewayReference == null || gatewayReference.isBlank()) {
            return PaymentVerificationResult.unpaid("Thiếu mã tham chiếu cổng thanh toán Stripe");
        }

        String activeMode = getActiveMode();
        if (gatewayReference.startsWith("cs_test_mock_")) {
            if ("MOCK".equals(activeMode)) {
                log.info("💳 [STRIPE SANDBOX VERIFY] Verified mock sandbox session: {}", gatewayReference);
                return PaymentVerificationResult.paid(gatewayReference, "Stripe Sandbox (Thẻ thử nghiệm Visa 4242)");
            }
            log.warn("🚨 [STRIPE SECURITY] Rejected mock session {} while active mode is {}", gatewayReference, activeMode);
            return PaymentVerificationResult.unpaid("Phiên thanh toán mô phỏng không hợp lệ trong chế độ Stripe thực tế.");
        }

        if ("MOCK".equals(activeMode)) {
            return PaymentVerificationResult.paid(gatewayReference, "Stripe Sandbox (Mô phỏng)");
        }
        if ("DISABLED".equals(activeMode)) {
            return PaymentVerificationResult.unpaid("Cổng thanh toán Stripe chưa được cấu hình.");
        }

        try {
            RequestOptions options = buildRequestOptions();
            if (gatewayReference.startsWith("pi_")) {
                PaymentIntent pi = sdkClient.retrievePaymentIntent(gatewayReference, options);
                String metaTx = pi.getMetadata() != null ? pi.getMetadata().get("transaction_code") : null;
                if (expectedTransactionCode != null && metaTx != null && !expectedTransactionCode.equals(metaTx)) {
                    return PaymentVerificationResult.unpaid("Mã giao dịch trên Stripe PaymentIntent không khớp.");
                }
                if ("succeeded".equalsIgnoreCase(pi.getStatus())) {
                    log.info("✅ [STRIPE PI VERIFIED] PaymentIntent {} succeeded.", gatewayReference);
                    return PaymentVerificationResult.paid(pi.getId(), "Stripe Thẻ Quốc Tế (PaymentIntent)");
                }
                return PaymentVerificationResult.unpaid("Trạng thái PaymentIntent Stripe: " + pi.getStatus());
            }

            Session session = sdkClient.retrieveSession(gatewayReference, options);
            String metaTx = session.getMetadata() != null ? session.getMetadata().get("transaction_code") : null;
            String refTx = session.getClientReferenceId();
            if (expectedTransactionCode != null) {
                boolean matchesMeta = metaTx == null || expectedTransactionCode.equals(metaTx);
                boolean matchesClientRef = refTx == null || expectedTransactionCode.equals(refTx);
                if (!matchesMeta || !matchesClientRef) {
                    return PaymentVerificationResult.unpaid("Mã giao dịch trên Stripe Checkout Session không khớp.");
                }
            }

            if ("paid".equalsIgnoreCase(session.getPaymentStatus())) {
                log.info("✅ [STRIPE VERIFIED] Session {} is paid successfully.", gatewayReference);
                return PaymentVerificationResult.paid(session.getId() != null ? session.getId() : gatewayReference,
                        "Stripe Thẻ Quốc Tế");
            }
            log.warn("⚠️ [STRIPE UNPAID] Session {} payment_status is: {}", gatewayReference, session.getPaymentStatus());
            return PaymentVerificationResult.unpaid("Trạng thái thanh toán Stripe: " + session.getPaymentStatus());
        } catch (StripeException e) {
            log.error("❌ [STRIPE VERIFY ERROR] Error retrieving {}: {}", gatewayReference, e.getMessage());
            return PaymentVerificationResult.unpaid("Không thể kiểm tra phiên thanh toán Stripe: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ [STRIPE VERIFY ERROR] Unexpected error for {}: {}", gatewayReference, e.getMessage());
            return PaymentVerificationResult.unpaid("Không thể kiểm tra phiên thanh toán Stripe: " + e.getMessage());
        }
    }

    public boolean refundPayment(String gatewayReference) {
        if (gatewayReference == null || gatewayReference.isBlank()) {
            log.warn("⚠️ [STRIPE REFUND] Missing gatewayReference.");
            return false;
        }

        String activeMode = getActiveMode();
        if (gatewayReference.startsWith("cs_test_mock_")) {
            if ("MOCK".equals(activeMode)) {
                log.info("💳 [STRIPE SANDBOX REFUND] Refund simulated for sandbox session: {}", gatewayReference);
                return true;
            }
            log.warn("🚨 [STRIPE REFUND] Cannot refund mock session {} when mode is {}", gatewayReference, activeMode);
            return false;
        }

        if ("MOCK".equals(activeMode)) {
            log.info("💳 [STRIPE REFUND MOCK] Simulated refund for reference: {}", gatewayReference);
            return true;
        }
        if ("DISABLED".equals(activeMode)) {
            log.warn("⚠️ [STRIPE REFUND] Stripe is disabled/unconfigured.");
            return false;
        }

        try {
            RequestOptions options = buildRequestOptions();
            String paymentIntentId;
            if (gatewayReference.startsWith("pi_")) {
                paymentIntentId = gatewayReference;
            } else {
                Session session = sdkClient.retrieveSession(gatewayReference, options);
                paymentIntentId = session.getPaymentIntent();
            }

            if (paymentIntentId != null && !paymentIntentId.isBlank()) {
                RefundCreateParams params = RefundCreateParams.builder()
                        .setPaymentIntent(paymentIntentId)
                        .setReason(RefundCreateParams.Reason.REQUESTED_BY_CUSTOMER)
                        .build();
                Refund refund = sdkClient.createRefund(params, options);
                log.info("✅ [STRIPE REFUND SUCCESS] Refund created: {} for reference: {}", refund.getId(), gatewayReference);
                return true;
            }
            log.warn("⚠️ [STRIPE REFUND] No payment_intent attached to reference {}", gatewayReference);
            return false;
        } catch (Exception e) {
            log.error("❌ [STRIPE REFUND ERROR] Failed to create refund for {}: {}", gatewayReference, e.getMessage());
            throw new RuntimeException("Stripe refund failed: " + e.getMessage(), e);
        }
    }

    public Event constructWebhookEvent(String payload, String sigHeader) {
        if (!hasRealWebhookSecret()) {
            log.warn("Stripe webhookSecret not configured or mock. Skipping HMAC check.");
            return null;
        }
        if (sigHeader == null || sigHeader.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "MISSING_STRIPE_SIGNATURE",
                    "Thiếu chữ ký xác thực Stripe-Signature.");
        }
        try {
            return sdkClient.constructWebhookEvent(payload, sigHeader, webhookSecret.trim());
        } catch (SignatureVerificationException e) {
            log.error("Invalid Stripe webhook signature: {}", e.getMessage());
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STRIPE_SIGNATURE",
                    "Chữ ký Stripe Webhook không hợp lệ.");
        } catch (Exception e) {
            log.error("Failed to parse Stripe webhook event: {}", e.getMessage());
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STRIPE_WEBHOOK",
                    "Không thể đọc payload Stripe Webhook.");
        }
    }

    private RequestOptions buildRequestOptions() {
        String trimmedKey = secretKey != null ? secretKey.trim() : "";
        Stripe.apiKey = trimmedKey;
        return RequestOptions.builder().setApiKey(trimmedKey).build();
    }

    private static String appendQueryParam(String baseUrl, String query) {
        return baseUrl + (baseUrl.contains("?") ? "&" : "?") + query;
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
