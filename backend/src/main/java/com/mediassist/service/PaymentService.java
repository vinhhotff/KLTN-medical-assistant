package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.dto.payment.*;
import com.mediassist.model.entity.*;
import com.mediassist.payment.PaymentGateway;
import com.mediassist.payment.PaymentGatewayRouter;
import com.mediassist.payment.PaymentInitiationResult;
import com.mediassist.payment.PaymentVerificationResult;
import com.mediassist.payment.StripePaymentGateway;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.PaymentTransactionRepository;
import com.mediassist.repository.UserRepository;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentGatewayRouter gatewayRouter;
    private final StripePaymentGateway stripePaymentGateway;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.payment.client-base-url:http://localhost:5173}")
    private String clientBaseUrl;

    public PaymentService(PaymentTransactionRepository paymentTransactionRepository,
                          PaymentGatewayRouter gatewayRouter,
                          StripePaymentGateway stripePaymentGateway,
                          UserRepository userRepository,
                          AppointmentRepository appointmentRepository,
                          AuditLogRepository auditLogRepository,
                          ObjectMapper objectMapper) {
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.gatewayRouter = gatewayRouter;
        this.stripePaymentGateway = stripePaymentGateway;
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PaymentResponseDto createCheckoutSession(String userEmail, CreatePaymentRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại."));

        OrderType orderType;
        try {
            orderType = OrderType.valueOf(request.getOrderType().toUpperCase());
        } catch (Exception e) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_ORDER_TYPE", "Loại đơn hàng không hợp lệ (QUOTA_PURCHASE hoặc APPOINTMENT_FEE).");
        }

        BigDecimal amount;
        String referenceId;
        String currency = "VND";

        if (orderType == OrderType.QUOTA_PURCHASE) {
            String pkg = request.getPackageId() != null ? request.getPackageId().toUpperCase() : "BASIC_5";
            referenceId = pkg;
            amount = switch (pkg) {
                case "VIP_MONTHLY" -> new BigDecimal("99000.00");
                case "VIP_ENTERPRISE" -> new BigDecimal("149000.00");
                default -> new BigDecimal("29000.00"); // BASIC_5
            };
        } else { // APPOINTMENT_FEE
            if (request.getAppointmentId() == null || request.getAppointmentId().isBlank()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "MISSING_APPOINTMENT_ID", "Cần cung cấp mã lịch hẹn (appointmentId) để thanh toán.");
            }
            UUID apptId;
            try {
                apptId = UUID.fromString(request.getAppointmentId());
            } catch (Exception e) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_APPOINTMENT_ID", "Định dạng mã lịch hẹn không hợp lệ.");
            }

            Appointment appt = appointmentRepository.findById(apptId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "APPOINTMENT_NOT_FOUND", "Không tìm thấy thông tin lịch hẹn."));

            if (!appt.getPatient().getId().equals(user.getId())) {
                throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thanh toán lịch hẹn của bệnh nhân khác.");
            }

            if (appt.getPaymentStatus() == PaymentStatus.PAID) {
                throw new AppException(HttpStatus.BAD_REQUEST, "ALREADY_PAID", "Lịch hẹn này đã được thanh toán trước đó.");
            }

            boolean hasPendingTx = paymentTransactionRepository
                    .existsByReferenceIdAndStatusIn(appt.getId().toString(), List.of(TransactionStatus.PENDING, TransactionStatus.COMPLETED));
            if (hasPendingTx) {
                throw new AppException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_IN_PROGRESS",
                        "Đang có giao dịch thanh toán đang xử lý hoặc đã hoàn tất cho lịch hẹn này.");
            }

            referenceId = appt.getId().toString();
            amount = (appt.getFeeAmount() != null && appt.getFeeAmount().compareTo(BigDecimal.ZERO) > 0)
                    ? appt.getFeeAmount()
                    : new BigDecimal("350000.00");
        }

        // Generate Transaction Code: TX-YYYYMMDD-XXXXXX
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String txCode = "TX-" + datePrefix + "-" + randomSuffix;

        PaymentGateway gateway = gatewayRouter.resolveGateway(request.getPaymentMethod());

        PaymentTransaction tx = new PaymentTransaction();
        tx.setTransactionCode(txCode);
        tx.setUser(user);
        tx.setOrderType(orderType);
        tx.setReferenceId(referenceId);
        tx.setAmount(amount);
        tx.setCurrency(currency);
        tx.setPaymentMethod(request.getPaymentMethod().toUpperCase());
        tx.setPaymentGateway(gateway.getGatewayName());
        tx.setStatus(TransactionStatus.PENDING);
        tx = paymentTransactionRepository.save(tx);

        String successUrl = clientBaseUrl + "/payment/success";
        String cancelUrl = clientBaseUrl + "/payment/cancel";

        PaymentInitiationResult initResult = gateway.initiatePayment(tx, successUrl, cancelUrl);

        if (!initResult.isSuccess()) {
            tx.setStatus(TransactionStatus.FAILED);
            paymentTransactionRepository.save(tx);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "GATEWAY_ERROR", initResult.getMessage());
        }

        tx.setGatewayReference(initResult.getGatewayReference());
        paymentTransactionRepository.save(tx);

        log.info("💳 [PAYMENT INITIATED] TxCode: {}, Gateway: {}, Amount: {} VND", txCode, gateway.getGatewayName(), amount);

        return new PaymentResponseDto(
                tx.getTransactionCode(),
                tx.getOrderType().name(),
                tx.getStatus().name(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getPaymentMethod(),
                tx.getPaymentGateway(),
                initResult.getCheckoutUrl(),
                initResult.getGatewayReference(),
                initResult.getQrPayload(),
                initResult.getMessage()
        );
    }

    @Transactional
    public PaymentResponseDto verifyAndFulfillPayment(String userEmail, VerifyPaymentRequest request) {
        PaymentTransaction tx = paymentTransactionRepository.findByTransactionCode(request.getTransactionCode())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "TRANSACTION_NOT_FOUND", "Không tìm thấy mã giao dịch: " + request.getTransactionCode()));

        // Idempotency check: if already completed, return receipt immediately
        if (tx.getStatus() == TransactionStatus.COMPLETED) {
            log.info("⚡ [PAYMENT IDEMPOTENT] Transaction {} already completed. Returning existing receipt.", tx.getTransactionCode());
            return toDto(tx, "Giao dịch đã được ghi nhận thành công trước đó.");
        }

        String referenceToVerify = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId()
                : tx.getGatewayReference();

        PaymentGateway gateway = gatewayRouter.resolveGateway(tx.getPaymentMethod());
        PaymentVerificationResult verifyResult = gateway.verifyPayment(referenceToVerify);

        if (!verifyResult.isPaid()) {
            log.warn("⚠️ [PAYMENT VERIFY FAILED] Transaction {}: {}", tx.getTransactionCode(), verifyResult.getFailureReason());
            tx.setStatus(TransactionStatus.FAILED);
            paymentTransactionRepository.save(tx);
            throw new AppException(HttpStatus.BAD_REQUEST, "PAYMENT_NOT_COMPLETED",
                    "Giao dịch chưa được xác nhận hoàn tất: " + verifyResult.getFailureReason());
        }

        // Fulfill the business effect with error handling
        try {
            fulfillOrder(tx);
        } catch (Exception e) {
            log.error("💥 [PAYMENT FULFILL ERROR] TxCode {}: {}", tx.getTransactionCode(), e.getMessage());
            tx.setStatus(TransactionStatus.PENDING);
            paymentTransactionRepository.save(tx);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "FULFILL_FAILED",
                    "Thanh toán đã được ghi nhận nhưng kích hoạt dịch vụ gặp sự cố tạm thời. Hệ thống sẽ tự động xử lý.");
        }

        tx.setStatus(TransactionStatus.COMPLETED);
        if (verifyResult.getGatewayReference() != null) {
            tx.setGatewayReference(verifyResult.getGatewayReference());
        }

        Map<String, Object> meta = new HashMap<>();
        meta.put("verifiedAt", LocalDateTime.now().toString());
        meta.put("paymentMethodDetails", verifyResult.getPaymentMethodDetails());
        try {
            tx.setMetadataJson(objectMapper.writeValueAsString(meta));
        } catch (Exception ignored) {}

        PaymentTransaction saved = paymentTransactionRepository.save(tx);

        // Record Audit Trail
        AuditLog audit = new AuditLog();
        audit.setUserId(tx.getUser().getId());
        audit.setAction("PAYMENT_COMPLETED");
        audit.setResource("payments/" + tx.getTransactionCode());
        audit.setMetadata("Method: " + tx.getPaymentMethod() + ", Amount: " + tx.getAmount() + " " + tx.getCurrency());
        auditLogRepository.save(audit);

        log.info("🎉 [PAYMENT FULFILLED] Transaction {} successfully fulfilled for user {}", tx.getTransactionCode(), tx.getUser().getEmail());

        return toDto(saved, "Thanh toán thành công! Dịch vụ y tế đã được kích hoạt.");
    }

    @Transactional
    public void handleStripeWebhook(String payload, String sigHeader) {
        Event event = stripePaymentGateway.constructWebhookEvent(payload, sigHeader);
        if (event == null) {
            log.warn("Stripe webhook received but could not be parsed or secret missing.");
            return;
        }

        if ("checkout.session.completed".equals(event.getType())) {
            var dataObjectDeserializer = event.getDataObjectDeserializer();
            if (dataObjectDeserializer.getObject().isPresent()) {
                Session session = (Session) dataObjectDeserializer.getObject().get();
                String txCode = session.getMetadata() != null ? session.getMetadata().get("transaction_code") : null;
                if (txCode != null) {
                    paymentTransactionRepository.findByTransactionCode(txCode).ifPresent(tx -> {
                        if (tx.getStatus() == TransactionStatus.PENDING) {
                            fulfillOrder(tx);
                            tx.setStatus(TransactionStatus.COMPLETED);
                            tx.setGatewayReference(session.getId());
                            paymentTransactionRepository.save(tx);
                            log.info("🎉 [STRIPE WEBHOOK FULFILLED] Transaction {} fulfilled via webhook.", txCode);
                        }
                    });
                }
            }
        }
    }

    public List<PaymentHistoryDto> getUserPaymentHistory(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại."));
        return paymentTransactionRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(PaymentHistoryDto::fromEntity)
                .collect(Collectors.toList());
    }

    public PaymentResponseDto getTransactionStatus(String transactionCode) {
        PaymentTransaction tx = paymentTransactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "TRANSACTION_NOT_FOUND", "Không tìm thấy mã giao dịch: " + transactionCode));
        return toDto(tx, "Chi tiết thông tin giao dịch");
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void fulfillOrder(PaymentTransaction tx) {
        User user = tx.getUser();
        LocalDateTime now = LocalDateTime.now();

        if (tx.getOrderType() == OrderType.QUOTA_PURCHASE) {
            String pkg = tx.getReferenceId() != null ? tx.getReferenceId() : "BASIC_5";
            switch (pkg) {
                case "VIP_MONTHLY" -> {
                    user.setSubscriptionTier("VIP_MONTHLY");
                    LocalDateTime validUntil = (user.getVipValidUntil() != null && user.getVipValidUntil().isAfter(now))
                            ? user.getVipValidUntil().plusDays(30)
                            : now.plusDays(30);
                    user.setVipValidUntil(validUntil);
                    log.info("💎 [FULFILL VIP_MONTHLY] User {} upgraded until {}", user.getEmail(), validUntil);
                }
                case "VIP_ENTERPRISE" -> {
                    user.setSubscriptionTier("VIP_ENTERPRISE");
                    LocalDateTime validUntil = (user.getVipValidUntil() != null && user.getVipValidUntil().isAfter(now))
                            ? user.getVipValidUntil().plusDays(90)
                            : now.plusDays(90);
                    user.setVipValidUntil(validUntil);
                    log.info("💎 [FULFILL VIP_ENTERPRISE] User {} upgraded until {}", user.getEmail(), validUntil);
                }
                default -> { // BASIC_5
                    user.setScanQuota(user.getScanQuota() + 5);
                    if (user.getSubscriptionTier() == null) {
                        user.setSubscriptionTier("BASIC");
                    }
                    log.info("💳 [FULFILL SCAN_QUOTA] User {} credited +5 scans. Total: {}", user.getEmail(), user.getScanQuota());
                }
            }
            userRepository.save(user);

        } else if (tx.getOrderType() == OrderType.APPOINTMENT_FEE) {
            try {
                UUID apptId = UUID.fromString(tx.getReferenceId());
                Appointment appt = appointmentRepository.findById(apptId).orElse(null);
                if (appt == null) {
                    log.error("💥 [FULFILL ORPHAN WARNING] Payment {} fulfilled but appointment {} NOT FOUND!", tx.getTransactionCode(), tx.getReferenceId());
                    AuditLog orphan = new AuditLog();
                    orphan.setUserId(user.getId());
                    orphan.setAction("PAYMENT_ORPHAN");
                    orphan.setResource("payments/" + tx.getTransactionCode());
                    orphan.setMetadata("Appointment reference not found: " + tx.getReferenceId());
                    auditLogRepository.save(orphan);
                } else {
                    appt.setPaymentStatus(PaymentStatus.PAID);
                    appointmentRepository.save(appt);
                    log.info("🏥 [FULFILL APPOINTMENT] Appointment {} marked as PAID for patient {}", appt.getAppointmentCode(), user.getEmail());
                }
            } catch (Exception e) {
                log.error("Could not fulfill appointment payment for ref {}: {}", tx.getReferenceId(), e.getMessage());
                throw new RuntimeException("Fulfill appointment payment failed: " + e.getMessage(), e);
            }
        }
    }

    private PaymentResponseDto toDto(PaymentTransaction tx, String message) {
        return new PaymentResponseDto(
                tx.getTransactionCode(),
                tx.getOrderType().name(),
                tx.getStatus().name(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getPaymentMethod(),
                tx.getPaymentGateway(),
                null,
                tx.getGatewayReference(),
                null,
                message
        );
    }
}
