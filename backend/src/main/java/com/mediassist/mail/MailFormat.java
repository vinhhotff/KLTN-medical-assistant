package com.mediassist.mail;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Dinh dang hien thi trong email: gio "HH:mm dd/MM/yyyy", tien "350.000 ₫".
 */
public final class MailFormat {

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private MailFormat() {}

    public static String dateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME) : "";
    }

    public static String money(BigDecimal amount) {
        if (amount == null) return "";
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ROOT);
        symbols.setGroupingSeparator('.');
        DecimalFormat format = new DecimalFormat("#,##0", symbols);
        return format.format(amount.setScale(0, RoundingMode.HALF_UP)) + " ₫";
    }

    /** Che dia chi email truoc khi ghi log: "patient@gmail.com" -> "p***@gmail.com". */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) return "<empty>";
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        return email.charAt(0) + "***" + email.substring(at);
    }

    public static String paymentMethod(String method) {
        if (method == null) return "";
        return switch (method.toUpperCase()) {
            case "STRIPE", "CARD", "CREDIT_CARD" -> "Thẻ quốc tế (Stripe)";
            case "VNPAY" -> "VNPay";
            case "MOMO" -> "Ví MoMo";
            case "BANK_TRANSFER", "VIETQR" -> "Chuyển khoản ngân hàng";
            default -> method;
        };
    }

    public static String quotaPackage(String packageId) {
        if (packageId == null) return "Gói dịch vụ";
        return switch (packageId.toUpperCase()) {
            case "VIP_MONTHLY" -> "Gói VIP 30 ngày";
            case "VIP_ENTERPRISE" -> "Gói VIP Enterprise 90 ngày";
            case "BASIC_5" -> "Gói 5 lượt phân tích tài liệu";
            default -> packageId;
        };
    }
}
