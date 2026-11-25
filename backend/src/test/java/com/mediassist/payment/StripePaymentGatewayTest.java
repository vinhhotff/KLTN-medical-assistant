package com.mediassist.payment;

import com.mediassist.common.AppException;
import com.mediassist.model.entity.OrderType;
import com.mediassist.model.entity.PaymentTransaction;
import com.mediassist.model.entity.User;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class StripePaymentGatewayTest {

    private StripePaymentGateway.StripeSdkClient sdkClient;
    private StripePaymentGateway gateway;
    private PaymentTransaction tx;

    @BeforeEach
    void setUp() {
        sdkClient = mock(StripePaymentGateway.StripeSdkClient.class);
        gateway = new StripePaymentGateway(sdkClient);
        ReflectionTestUtils.setField(gateway, "currency", "vnd");
        ReflectionTestUtils.setField(gateway, "enabled", true);
        ReflectionTestUtils.setField(gateway, "mockEnabled", false);
        ReflectionTestUtils.setField(gateway, "configuredMode", "auto");
        ReflectionTestUtils.setField(gateway, "minVndAmount", 15000L);
        ReflectionTestUtils.setField(gateway, "secretKey", "sk_test_51RealStripeTestKey123456");
        ReflectionTestUtils.setField(gateway, "publishableKey", "pk_test_51RealStripePubKey123456");
        ReflectionTestUtils.setField(gateway, "webhookSecret", "whsec_real_secret_123456");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("patient@mediassist.local");

        tx = new PaymentTransaction();
        tx.setTransactionCode("TX-20261125-REAL01");
        tx.setUser(user);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setReferenceId("VIP_MONTHLY");
        tx.setAmount(new BigDecimal("99000.00"));
        tx.setCurrency("VND");
        tx.setPaymentMethod("STRIPE");
    }

    @Test
    @DisplayName("Real Stripe mode: tạo Checkout Session với VND zero-decimal (unitAmount = 99000, không * 100)")
    void realMode_CreatesCheckoutSessionWithZeroDecimalVnd() throws Exception {
        AtomicReference<SessionCreateParams> capturedParams = new AtomicReference<>();
        AtomicReference<RequestOptions> capturedOptions = new AtomicReference<>();

        Session mockSession = mock(Session.class);
        when(mockSession.getId()).thenReturn("cs_test_real_abc123");
        when(mockSession.getUrl()).thenReturn("https://checkout.stripe.com/c/pay/cs_test_real_abc123");
        when(sdkClient.createSession(any(SessionCreateParams.class), any(RequestOptions.class)))
                .thenAnswer(inv -> {
                    capturedParams.set(inv.getArgument(0));
                    capturedOptions.set(inv.getArgument(1));
                    return mockSession;
                });

        PaymentInitiationResult result = gateway.initiatePayment(
                tx, "http://localhost:5173/payment/success", "http://localhost:5173/payment/cancel");

        assertTrue(result.isSuccess());
        assertEquals("REAL", result.getMode());
        assertEquals("cs_test_real_abc123", result.getGatewayReference());
        assertEquals("https://checkout.stripe.com/c/pay/cs_test_real_abc123", result.getCheckoutUrl());

        SessionCreateParams params = capturedParams.get();
        assertNotNull(params);
        assertEquals("TX-20261125-REAL01", params.getClientReferenceId());
        assertEquals("patient@mediassist.local", params.getCustomerEmail());
        assertEquals("vnd", params.getLineItems().getFirst().getPriceData().getCurrency());
        assertEquals(99000L, params.getLineItems().getFirst().getPriceData().getUnitAmount());
        assertEquals("TX-20261125-REAL01", params.getMetadata().get("transaction_code"));
        assertNotNull(capturedOptions.get());
        assertNotNull(capturedOptions.get().getAuthenticator());
    }

    @Test
    @DisplayName("Real Stripe mode: từ chối số tiền VND dưới mức tối thiểu Stripe (< 15,000 VND)")
    void realMode_RejectsBelowMinimumVndAmount() throws Exception {
        tx.setAmount(new BigDecimal("10000.00"));

        PaymentInitiationResult result = gateway.initiatePayment(
                tx, "http://localhost:5173/payment/success", "http://localhost:5173/payment/cancel");

        assertFalse(result.isSuccess());
        assertTrue(result.getMessage().contains("15000"));
        verify(sdkClient, never()).createSession(any(), any());
    }

    @Test
    @DisplayName("Mock fallback: key sk_test_mock_ + mock=true -> trả về chế độ MOCK và URL sandbox")
    void mockKeyWithMockEnabled_UsesMockSandbox() throws Exception {
        ReflectionTestUtils.setField(gateway, "secretKey", "sk_test_mock_sandbox_key_mediassist_2026");
        ReflectionTestUtils.setField(gateway, "mockEnabled", true);

        assertEquals("MOCK", gateway.getActiveMode());

        PaymentInitiationResult result = gateway.initiatePayment(
                tx, "http://localhost:5173/payment/success", "http://localhost:5173/payment/cancel");

        assertTrue(result.isSuccess());
        assertEquals("MOCK", result.getMode());
        assertTrue(result.getGatewayReference().startsWith("cs_test_mock_"));
        assertTrue(result.getCheckoutUrl().contains("sandbox=stripe"));
        verify(sdkClient, never()).createSession(any(), any());
    }

    @Test
    @DisplayName("Mock key nhưng mock=false -> mode DISABLED và không giả lập thành công")
    void mockKeyWithMockDisabled_ReturnsFailed() {
        ReflectionTestUtils.setField(gateway, "secretKey", "sk_test_mock_sandbox_key_mediassist_2026");
        ReflectionTestUtils.setField(gateway, "mockEnabled", false);

        assertEquals("DISABLED", gateway.getActiveMode());

        PaymentInitiationResult result = gateway.initiatePayment(
                tx, "http://localhost:5173/payment/success", "http://localhost:5173/payment/cancel");

        assertFalse(result.isSuccess());
        assertFalse(gateway.verifyPayment("cs_test_mock_123").isPaid());
        assertFalse(gateway.refundPayment("cs_test_mock_123"));
    }

    @Test
    @DisplayName("Real Stripe mode: chặn cs_test_mock_ khi verifyPayment")
    void realMode_RejectsMockSessionIdOnVerify() {
        PaymentVerificationResult res = gateway.verifyPayment("cs_test_mock_forged", "TX-20261125-REAL01");

        assertFalse(res.isPaid());
    }

    @Test
    @DisplayName("Real Stripe mode: verifyPayment kiểm tra Session.retrieve payment_status=paid và metadata")
    void realMode_VerifiesPaidSessionAndPaymentIntent() throws Exception {
        Session session = mock(Session.class);
        when(session.getId()).thenReturn("cs_test_real_paid");
        when(session.getPaymentStatus()).thenReturn("paid");
        when(session.getMetadata()).thenReturn(Map.of("transaction_code", "TX-20261125-REAL01"));
        when(session.getClientReferenceId()).thenReturn("TX-20261125-REAL01");
        when(sdkClient.retrieveSession(eq("cs_test_real_paid"), any())).thenReturn(session);

        PaymentVerificationResult paidRes = gateway.verifyPayment("cs_test_real_paid", "TX-20261125-REAL01");
        assertTrue(paidRes.isPaid());

        PaymentIntent pi = mock(PaymentIntent.class);
        when(pi.getId()).thenReturn("pi_real_123");
        when(pi.getStatus()).thenReturn("succeeded");
        when(pi.getMetadata()).thenReturn(Map.of("transaction_code", "TX-20261125-REAL01"));
        when(sdkClient.retrievePaymentIntent(eq("pi_real_123"), any())).thenReturn(pi);

        PaymentVerificationResult piRes = gateway.verifyPayment("pi_real_123", "TX-20261125-REAL01");
        assertTrue(piRes.isPaid());
        assertEquals("pi_real_123", piRes.getGatewayReference());
    }

    @Test
    @DisplayName("Real Stripe mode: refundPayment gọi Refund.create với paymentIntent của Session")
    void realMode_CreatesRefundViaStripeSdk() throws Exception {
        Session session = mock(Session.class);
        when(session.getPaymentIntent()).thenReturn("pi_real_refund_999");
        when(sdkClient.retrieveSession(eq("cs_test_real_paid"), any())).thenReturn(session);

        Refund refund = mock(Refund.class);
        when(refund.getId()).thenReturn("re_real_123");
        when(sdkClient.createRefund(any(RefundCreateParams.class), any(RequestOptions.class))).thenReturn(refund);

        assertTrue(gateway.refundPayment("cs_test_real_paid"));
        verify(sdkClient).createRefund(argThat(p -> "pi_real_refund_999".equals(p.getPaymentIntent())), any());
    }

    @Test
    @DisplayName("Real webhook secret: chữ ký sai ném AppException 400 INVALID_STRIPE_SIGNATURE")
    void realWebhookSecret_InvalidSignatureThrowsBadRequest() throws Exception {
        when(sdkClient.constructWebhookEvent("{}", "bad_sig", "whsec_real_secret_123456"))
                .thenThrow(new SignatureVerificationException("Invalid signature", "bad_sig"));

        AppException ex = assertThrows(AppException.class, () -> gateway.constructWebhookEvent("{}", "bad_sig"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("INVALID_STRIPE_SIGNATURE", ex.getCode());

        Event validEvent = mock(Event.class);
        when(sdkClient.constructWebhookEvent("{}", "good_sig", "whsec_real_secret_123456"))
                .thenReturn(validEvent);
        assertSame(validEvent, gateway.constructWebhookEvent("{}", "good_sig"));
    }
}
