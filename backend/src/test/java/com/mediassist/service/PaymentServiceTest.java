package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.dto.payment.CreatePaymentRequest;
import com.mediassist.dto.payment.PaymentResponseDto;
import com.mediassist.dto.payment.VerifyPaymentRequest;
import com.mediassist.event.PaymentCompletedEvent;
import com.mediassist.model.entity.*;
import com.mediassist.payment.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.PaymentTransactionRepository;
import com.mediassist.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private PaymentGatewayRouter gatewayRouter;
    private StripePaymentGateway stripePaymentGateway;
    private MockPaymentGateway mockPaymentGateway;
    private PaymentService paymentService;
    private ObjectMapper objectMapper;

    private User testPatient;
    private User testDoctor;
    private Appointment testAppointment;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        stripePaymentGateway = new StripePaymentGateway();
        ReflectionTestUtils.setField(stripePaymentGateway, "secretKey", "sk_test_mock");
        ReflectionTestUtils.setField(stripePaymentGateway, "webhookSecret", "whsec_mock");
        ReflectionTestUtils.setField(stripePaymentGateway, "currency", "vnd");
        ReflectionTestUtils.setField(stripePaymentGateway, "enabled", true);

        mockPaymentGateway = new MockPaymentGateway();
        gatewayRouter = new PaymentGatewayRouter(List.of(stripePaymentGateway, mockPaymentGateway));

        paymentService = new PaymentService(
                paymentTransactionRepository,
                gatewayRouter,
                stripePaymentGateway,
                userRepository,
                appointmentRepository,
                auditLogRepository,
                objectMapper,
                eventPublisher
        );
        ReflectionTestUtils.setField(paymentService, "clientBaseUrl", "http://localhost:5173");

        testPatient = new User();
        testPatient.setId(UUID.randomUUID());
        testPatient.setEmail("patient@mediassist.local");
        testPatient.setFullName("Nguyen Van Benh Nhan");
        testPatient.setScanQuota(1);
        testPatient.setSubscriptionTier("FREE");
        testPatient.setRole(Role.PATIENT);
        testPatient.markEmailVerified(LocalDateTime.now());

        testDoctor = new User();
        testDoctor.setId(UUID.randomUUID());
        testDoctor.setEmail("doctor@mediassist.local");
        testDoctor.setFullName("BS.CKI Le Van Tam");

        testAppointment = Appointment.builder()
                .id(UUID.randomUUID())
                .appointmentCode("AP-2026-TEST01")
                .patient(testPatient)
                .doctor(testDoctor)
                .scheduledStart(LocalDateTime.now().plusDays(1))
                .scheduledEnd(LocalDateTime.now().plusDays(1).plusHours(1))
                .status(AppointmentStatus.SCHEDULED)
                .paymentStatus(PaymentStatus.UNPAID)
                .feeAmount(new BigDecimal("350000.00"))
                .build();
    }

    @Test
    @DisplayName("Tạo phiên thanh toán Stripe Sandbox gói VIP_MONTHLY thành công")
    void testCreateCheckout_QuotaPurchase_StripeSandbox_Success() {
        when(userRepository.findByEmail(testPatient.getEmail())).thenReturn(Optional.of(testPatient));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> {
            PaymentTransaction tx = invocation.getArgument(0);
            if (tx.getId() == null) {
                tx.setId(UUID.randomUUID());
            }
            return tx;
        });

        CreatePaymentRequest request = new CreatePaymentRequest(
                "QUOTA_PURCHASE",
                "VIP_MONTHLY",
                null,
                "STRIPE"
        );

        PaymentResponseDto response = paymentService.createCheckoutSession(testPatient.getEmail(), request);

        assertNotNull(response);
        assertNotNull(response.getTransactionCode());
        assertTrue(response.getTransactionCode().startsWith("TX-"));
        assertEquals("QUOTA_PURCHASE", response.getOrderType());
        assertEquals("PENDING", response.getStatus());
        assertEquals(new BigDecimal("99000.00"), response.getAmount());
        assertEquals("STRIPE", response.getPaymentGateway());
        assertNotNull(response.getCheckoutUrl());
        assertTrue(response.getCheckoutUrl().contains("session_id="));
    }

    @Test
    @DisplayName("Tạo phiên thanh toán Phí khám bệnh (APPOINTMENT_FEE) với VietQR Sandbox thành công")
    void testCreateCheckout_AppointmentFee_VietQr_Success() {
        when(userRepository.findByEmail(testPatient.getEmail())).thenReturn(Optional.of(testPatient));
        when(appointmentRepository.findById(testAppointment.getId())).thenReturn(Optional.of(testAppointment));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> {
            PaymentTransaction tx = invocation.getArgument(0);
            if (tx.getId() == null) {
                tx.setId(UUID.randomUUID());
            }
            return tx;
        });

        CreatePaymentRequest request = new CreatePaymentRequest(
                "APPOINTMENT_FEE",
                null,
                testAppointment.getId().toString(),
                "VIETQR"
        );

        PaymentResponseDto response = paymentService.createCheckoutSession(testPatient.getEmail(), request);

        assertNotNull(response);
        assertEquals("APPOINTMENT_FEE", response.getOrderType());
        assertEquals(new BigDecimal("350000.00"), response.getAmount());
        assertEquals("LOCAL_MOCK", response.getPaymentGateway());
        assertNotNull(response.getQrPayload());
    }

    @Test
    @DisplayName("Thanh toán phí khám cho lịch hẹn đã thanh toán trước đó sẽ báo lỗi ALREADY_PAID")
    void testCreateCheckout_AppointmentAlreadyPaid_ThrowsException() {
        testAppointment.setPaymentStatus(PaymentStatus.PAID);
        when(userRepository.findByEmail(testPatient.getEmail())).thenReturn(Optional.of(testPatient));
        when(appointmentRepository.findById(testAppointment.getId())).thenReturn(Optional.of(testAppointment));

        CreatePaymentRequest request = new CreatePaymentRequest(
                "APPOINTMENT_FEE",
                null,
                testAppointment.getId().toString(),
                "STRIPE"
        );

        AppException ex = assertThrows(AppException.class, () ->
                paymentService.createCheckoutSession(testPatient.getEmail(), request));

        assertEquals("ALREADY_PAID", ex.getCode());
    }

    @Test
    @DisplayName("Xác thực thanh toán Quota và kích hoạt tài khoản VIP_MONTHLY thành công")
    void testVerifyAndFulfillPayment_QuotaPurchase_Success() {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(UUID.randomUUID());
        tx.setTransactionCode("TX-20260916-VIP001");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setReferenceId("VIP_MONTHLY");
        tx.setAmount(new BigDecimal("99000.00"));
        tx.setPaymentMethod("STRIPE");
        tx.setPaymentGateway("STRIPE");
        tx.setGatewayReference("cs_test_mock_12345");
        tx.setStatus(TransactionStatus.PENDING);

        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VerifyPaymentRequest verifyRequest = new VerifyPaymentRequest(tx.getTransactionCode(), "cs_test_mock_12345");
        PaymentResponseDto response = paymentService.verifyAndFulfillPayment(testPatient.getEmail(), verifyRequest);

        assertNotNull(response);
        assertEquals("COMPLETED", response.getStatus());
        assertEquals("VIP_MONTHLY", testPatient.getSubscriptionTier());
        assertNotNull(testPatient.getVipValidUntil());
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));

        // Bien nhan email: dung 1 event khi PENDING -> COMPLETED
        org.mockito.ArgumentCaptor<PaymentCompletedEvent> captor = org.mockito.ArgumentCaptor.forClass(PaymentCompletedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        PaymentCompletedEvent event = captor.getValue();
        assertEquals("TX-20260916-VIP001", event.transactionCode());
        assertEquals(testPatient.getEmail(), event.userEmail());
        assertEquals("QUOTA_PURCHASE", event.orderType());
        assertEquals("VIP_MONTHLY", event.packageId());
        assertEquals("STRIPE", event.paymentMethod());
        assertEquals(0, new BigDecimal("99000").compareTo(event.amount()));
        assertNull(event.appointmentCode());
    }

    @Test
    @DisplayName("Xác thực thanh toán Phí khám và cập nhật trạng thái Appointment thành PAID")
    void testVerifyAndFulfillPayment_AppointmentFee_Success() {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(UUID.randomUUID());
        tx.setTransactionCode("TX-20260916-APT001");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.APPOINTMENT_FEE);
        tx.setReferenceId(testAppointment.getId().toString());
        tx.setAmount(new BigDecimal("350000.00"));
        tx.setPaymentMethod("VIETQR");
        tx.setPaymentGateway("LOCAL_MOCK");
        tx.setGatewayReference("mock_ref_123");
        tx.setStatus(TransactionStatus.PENDING);

        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));
        when(appointmentRepository.findById(testAppointment.getId())).thenReturn(Optional.of(testAppointment));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VerifyPaymentRequest verifyRequest = new VerifyPaymentRequest(tx.getTransactionCode(), "mock_ref_123");
        PaymentResponseDto response = paymentService.verifyAndFulfillPayment(testPatient.getEmail(), verifyRequest);

        assertNotNull(response);
        assertEquals("COMPLETED", response.getStatus());
        assertEquals(PaymentStatus.PAID, testAppointment.getPaymentStatus());

        org.mockito.ArgumentCaptor<PaymentCompletedEvent> captor = org.mockito.ArgumentCaptor.forClass(PaymentCompletedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        assertEquals("APPOINTMENT_FEE", captor.getValue().orderType());
        assertEquals("AP-2026-TEST01", captor.getValue().appointmentCode());
        assertEquals(testAppointment.getScheduledStart(), captor.getValue().appointmentStart());
        assertNull(captor.getValue().packageId());
    }

    @Test
    @DisplayName("Idempotency: Giao dịch đã COMPLETED trước đó không bị trừ tiền hoặc cộng đúp quota")
    void testVerifyAndFulfillPayment_Idempotency() {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(UUID.randomUUID());
        tx.setTransactionCode("TX-20260916-ALREADY");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setReferenceId("BASIC_5");
        tx.setAmount(new BigDecimal("29000.00"));
        tx.setPaymentMethod("STRIPE");
        tx.setPaymentGateway("STRIPE");
        tx.setStatus(TransactionStatus.COMPLETED);

        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));

        VerifyPaymentRequest verifyRequest = new VerifyPaymentRequest(tx.getTransactionCode(), "cs_test_mock_already");
        PaymentResponseDto response = paymentService.verifyAndFulfillPayment(testPatient.getEmail(), verifyRequest);

        assertNotNull(response);
        assertEquals("COMPLETED", response.getStatus());
        // Verify that user was NOT saved again (no double fulfillment)
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Benh nhan chua xac thuc email: checkout bi chan 403 EMAIL_NOT_VERIFIED, khong tao giao dich")
    void testCreateCheckout_UnverifiedPatient_Blocked() {
        testPatient.setEmailVerified(false);
        when(userRepository.findByEmail(testPatient.getEmail())).thenReturn(Optional.of(testPatient));

        CreatePaymentRequest request = new CreatePaymentRequest("QUOTA_PURCHASE", "VIP_MONTHLY", null, "STRIPE");
        AppException ex = assertThrows(AppException.class,
                () -> paymentService.createCheckoutSession(testPatient.getEmail(), request));

        assertEquals("EMAIL_NOT_VERIFIED", ex.getCode());
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, ex.getStatus());
        verify(paymentTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Verify lap lai tren giao dich da COMPLETED: KHONG phat event bien nhan lan 2")
    void testVerifyAgain_DoesNotPublishTwice() {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionCode("TX-20261002-TWICE1");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setStatus(TransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));

        paymentService.verifyAndFulfillPayment(testPatient.getEmail(), new VerifyPaymentRequest(tx.getTransactionCode(), "x"));
        paymentService.verifyAndFulfillPayment(testPatient.getEmail(), new VerifyPaymentRequest(tx.getTransactionCode(), "x"));

        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Cong thanh toan bao chua tra tien: giao dich FAILED, KHONG phat event bien nhan")
    void testVerifyUnpaid_DoesNotPublish() {
        PaymentGateway failingGateway = mock(PaymentGateway.class);
        when(failingGateway.verifyPayment(any())).thenReturn(PaymentVerificationResult.unpaid("Thẻ bị từ chối"));
        PaymentGatewayRouter router = mock(PaymentGatewayRouter.class);
        when(router.resolveGateway(any())).thenReturn(failingGateway);
        PaymentService service = new PaymentService(paymentTransactionRepository, router, stripePaymentGateway,
                userRepository, appointmentRepository, auditLogRepository, objectMapper, eventPublisher);

        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionCode("TX-20261002-FAIL01");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setPaymentMethod("STRIPE");
        tx.setStatus(TransactionStatus.PENDING);
        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));

        assertThrows(AppException.class,
                () -> service.verifyAndFulfillPayment(testPatient.getEmail(), new VerifyPaymentRequest(tx.getTransactionCode(), "x")));
        assertEquals(TransactionStatus.FAILED, tx.getStatus());
        verify(eventPublisher, never()).publishEvent(any());
    }

    private PaymentService serviceWithWebhook(String txCode) {
        StripePaymentGateway stripe = mock(StripePaymentGateway.class);
        com.stripe.model.Event event = mock(com.stripe.model.Event.class);
        com.stripe.model.EventDataObjectDeserializer deserializer = mock(com.stripe.model.EventDataObjectDeserializer.class);
        com.stripe.model.checkout.Session session = mock(com.stripe.model.checkout.Session.class);
        when(stripe.constructWebhookEvent(any(), any())).thenReturn(event);
        when(event.getType()).thenReturn("checkout.session.completed");
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);
        when(deserializer.getObject()).thenReturn(Optional.of(session));
        when(session.getMetadata()).thenReturn(java.util.Map.of("transaction_code", txCode));
        org.mockito.Mockito.lenient().when(session.getId()).thenReturn("cs_live_webhook");
        return new PaymentService(paymentTransactionRepository, gatewayRouter, stripe,
                userRepository, appointmentRepository, auditLogRepository, objectMapper, eventPublisher);
    }

    @Test
    @DisplayName("Stripe webhook PENDING -> COMPLETED: phat dung 1 event bien nhan")
    void testWebhook_PendingToCompleted_PublishesOnce() {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionCode("TX-20261002-HOOK01");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setReferenceId("BASIC_5");
        tx.setAmount(new BigDecimal("29000.00"));
        tx.setPaymentMethod("STRIPE");
        tx.setStatus(TransactionStatus.PENDING);
        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        serviceWithWebhook(tx.getTransactionCode()).handleStripeWebhook("{}", "sig");

        assertEquals(TransactionStatus.COMPLETED, tx.getStatus());
        org.mockito.ArgumentCaptor<PaymentCompletedEvent> captor = org.mockito.ArgumentCaptor.forClass(PaymentCompletedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        assertEquals("TX-20261002-HOOK01", captor.getValue().transactionCode());
        assertEquals("BASIC_5", captor.getValue().packageId());
    }

    @Test
    @DisplayName("Stripe webhook den sau khi verify da COMPLETED: KHONG phat event lan 2")
    void testWebhook_AlreadyCompleted_DoesNotPublish() {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionCode("TX-20261002-HOOK02");
        tx.setUser(testPatient);
        tx.setOrderType(OrderType.QUOTA_PURCHASE);
        tx.setStatus(TransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findByTransactionCode(tx.getTransactionCode())).thenReturn(Optional.of(tx));

        serviceWithWebhook(tx.getTransactionCode()).handleStripeWebhook("{}", "sig");

        verify(eventPublisher, never()).publishEvent(any());
        verify(paymentTransactionRepository, never()).save(any());
    }
}
