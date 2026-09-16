package com.mediassist.payment;

import com.mediassist.model.entity.PaymentTransaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class MockPaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MockPaymentGateway.class);

    @Override
    public String getGatewayName() {
        return "LOCAL_MOCK";
    }

    @Override
    public boolean supports(String paymentMethod) {
        if (paymentMethod == null) return false;
        String m = paymentMethod.trim().toUpperCase();
        return "VIETQR".equals(m) || "VNPAY".equals(m) || "MOMO".equals(m) || "MOCK".equals(m) || "CASH".equals(m);
    }

    @Override
    public PaymentInitiationResult initiatePayment(PaymentTransaction tx, String successUrl, String cancelUrl) {
        String mockRef = "mock_ref_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        log.info("💳 [MOCK GATEWAY] Initiating mock payment for method: {}, tx: {}", tx.getPaymentMethod(), tx.getTransactionCode());

        String redirectUrl = successUrl + (successUrl.contains("?") ? "&" : "?")
                + "session_id=" + mockRef
                + "&tx=" + tx.getTransactionCode()
                + "&method=" + tx.getPaymentMethod().toLowerCase();

        String qrPayload = "00020101021238540010A00000072701240006970422011099998888665303704540"
                + tx.getAmount().longValue() + "5802VN62" + tx.getTransactionCode();

        return PaymentInitiationResult.qrSuccess(
                redirectUrl,
                mockRef,
                qrPayload,
                "Mã QR Sandbox và luồng thanh toán thử nghiệm đã tạo thành công."
        );
    }

    @Override
    public PaymentVerificationResult verifyPayment(String gatewayReference) {
        log.info("💳 [MOCK GATEWAY VERIFY] Successfully verified simulated payment: {}", gatewayReference);
        return PaymentVerificationResult.paid(gatewayReference, "Cổng Thanh Toán Thử Nghiệm Sandbox");
    }
}
