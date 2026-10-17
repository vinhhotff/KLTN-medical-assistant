package com.mediassist.event;

/**
 * Phat khi nguoi dung yeu cau dat lai mat khau.
 * rawToken chi ton tai trong bo nho de dung link email - DB chi luu SHA-256 hash.
 */
public record PasswordResetRequestedEvent(String email, String fullName, String rawToken) {

    @Override
    public String toString() {
        return "PasswordResetRequestedEvent[email=" + email + ", rawToken=***]";
    }
}
