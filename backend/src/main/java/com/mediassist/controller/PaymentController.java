package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.common.AppException;
import com.mediassist.dto.payment.CreatePaymentRequest;
import com.mediassist.dto.payment.PaymentHistoryDto;
import com.mediassist.dto.payment.PaymentResponseDto;
import com.mediassist.dto.payment.VerifyPaymentRequest;
import com.mediassist.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payment & Financial Transactions", description = "Cổng thanh toán đa kênh tích hợp Stripe Sandbox, VietQR và Sổ cái giao dịch")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/checkout")
    @Operation(summary = "Khởi tạo phiên thanh toán (Stripe Checkout Sandbox / VietQR / MoMo)")
    public ResponseEntity<ApiResponse<PaymentResponseDto>> createCheckout(
            @Valid @RequestBody CreatePaymentRequest request,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để thực hiện thanh toán.");
        }
        PaymentResponseDto response = paymentService.createCheckoutSession(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/verify")
    @Operation(summary = "Xác minh kết quả thanh toán sau khi điều hướng từ cổng thanh toán")
    public ResponseEntity<ApiResponse<PaymentResponseDto>> verifyPayment(
            @Valid @RequestBody VerifyPaymentRequest request,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xác thực giao dịch.");
        }
        PaymentResponseDto response = paymentService.verifyAndFulfillPayment(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/webhook/stripe")
    @Operation(summary = "Tiếp nhận webhook bất đồng bộ từ Stripe Gateway")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        paymentService.handleStripeWebhook(payload, sigHeader);
        return ResponseEntity.ok("Webhook received");
    }

    @GetMapping("/history")
    @Operation(summary = "Lịch sử giao dịch tài chính y tế của người dùng hiện tại")
    public ResponseEntity<ApiResponse<List<PaymentHistoryDto>>> getPaymentHistory(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem lịch sử giao dịch.");
        }
        List<PaymentHistoryDto> history = paymentService.getUserPaymentHistory(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/transactions/{code}")
    @Operation(summary = "Tra cứu chi tiết một giao dịch cụ thể theo mã")
    public ResponseEntity<ApiResponse<PaymentResponseDto>> getTransactionDetails(
            @PathVariable("code") String code,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để xem thông tin giao dịch.");
        }
        PaymentResponseDto response = paymentService.getTransactionStatus(code);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
