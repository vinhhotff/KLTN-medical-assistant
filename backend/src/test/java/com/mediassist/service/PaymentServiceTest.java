package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.dto.payment.CreatePaymentRequest;
import com.mediassist.dto.payment.PaymentResponseDto;
import com.mediassist.dto.payment.VerifyPaymentRequest;
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
                objectMapper
        );
        ReflectionTestUtils.setField(paymentService, "clientBaseUrl", "http://localhost:5173");

        testPatient = new User();
        testPatient.setId(UUID.randomUUID());
        testPatient.setEmail("patient@mediassist.local");
        testPatient.setFullName("Nguyen Van Benh Nhan");
        testPatient.setScanQuota(1);
        testPatient.setSubscriptionTier("FREE");

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
}
