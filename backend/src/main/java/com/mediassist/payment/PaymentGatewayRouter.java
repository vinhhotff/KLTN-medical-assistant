package com.mediassist.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PaymentGatewayRouter {

    private static final Logger log = LoggerFactory.getLogger(PaymentGatewayRouter.class);
    private final List<PaymentGateway> gateways;

    public PaymentGatewayRouter(List<PaymentGateway> gateways) {
        this.gateways = gateways;
    }

    public PaymentGateway resolveGateway(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            paymentMethod = "STRIPE";
        }

        for (PaymentGateway gateway : gateways) {
            if (gateway.supports(paymentMethod)) {
                log.debug("Mapped payment method '{}' to gateway '{}'", paymentMethod, gateway.getGatewayName());
                return gateway;
            }
        }

        // Fallback to first available gateway or Mock
        log.warn("No specific payment gateway matched '{}'. Falling back to default gateway.", paymentMethod);
        return gateways.stream()
                .filter(g -> "LOCAL_MOCK".equals(g.getGatewayName()))
                .findFirst()
                .orElse(gateways.getFirst());
    }
}
