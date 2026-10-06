package com.mediassist.event;

import java.time.LocalDateTime;

/**
 * Phat sau khi mat khau duoc dat lai thanh cong - canh bao chu tai khoan neu khong phai ho thuc hien.
 */
public record PasswordChangedEvent(String email, String fullName, LocalDateTime changedAt) {
}
