package com.mediassist.event;

/**
 * Phat khi can gui (lai) email xac thuc dia chi email.
 * rawToken chi ton tai trong bo nho de dung link email - DB chi luu SHA-256 hash.
 */
public record EmailVerificationRequestedEvent(String email, String fullName, String rawToken) {

    @Override
    public String toString() {
        return "EmailVerificationRequestedEvent[email=" + email + ", rawToken=***]";
    }
}
