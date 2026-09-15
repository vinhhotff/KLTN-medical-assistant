package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email", unique = true),
        @Index(name = "idx_user_role_status", columnList = "role, status")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(nullable = true)
    private String passwordHash;

    @Column(nullable = false)
    private String fullName;

    @Column
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(unique = true)
    private String googleId;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "scan_quota", nullable = false)
    private int scanQuota = 1;

    @Column(name = "subscription_tier", nullable = false, length = 30)
    private String subscriptionTier = "FREE";

    @Column(name = "vip_valid_until")
    private LocalDateTime vipValidUntil;

    @Version
    private Long version = 0L;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public User() {}

    public User(UUID id, String email, String passwordHash, String fullName, String phone, String avatarUrl, Role role, UserStatus status, String googleId) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.phone = phone;
        this.avatarUrl = avatarUrl;
        this.role = role;
        this.status = status;
        this.googleId = googleId;
    }

    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }

    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }

    public LocalDateTime getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(LocalDateTime lockedUntil) { this.lockedUntil = lockedUntil; }

    public boolean isAccountNonLocked() {
        return lockedUntil == null || LocalDateTime.now().isAfter(lockedUntil);
    }

    public int getScanQuota() { return scanQuota; }
    public void setScanQuota(int scanQuota) { this.scanQuota = scanQuota; }

    public String getSubscriptionTier() { return subscriptionTier; }
    public void setSubscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; }

    public LocalDateTime getVipValidUntil() { return vipValidUntil; }
    public void setVipValidUntil(LocalDateTime vipValidUntil) { this.vipValidUntil = vipValidUntil; }

    public boolean isVipActive() {
        if (subscriptionTier != null && subscriptionTier.toUpperCase().contains("VIP")) {
            return vipValidUntil == null || LocalDateTime.now().isBefore(vipValidUntil);
        }
        return false;
    }

    public boolean hasScanQuota() {
        if (isVipActive()) {
            return true;
        }
        return scanQuota > 0;
    }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public static class UserBuilder {
        private UUID id;
        private String email;
        private String passwordHash;
        private String fullName;
        private String phone;
        private String avatarUrl;
        private Role role;
        private UserStatus status;
        private String googleId;

        public UserBuilder id(UUID id) { this.id = id; return this; }
        public UserBuilder email(String email) { this.email = email; return this; }
        public UserBuilder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public UserBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public UserBuilder phone(String phone) { this.phone = phone; return this; }
        public UserBuilder avatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; return this; }
        public UserBuilder role(Role role) { this.role = role; return this; }
        public UserBuilder status(UserStatus status) { this.status = status; return this; }
        public UserBuilder googleId(String googleId) { this.googleId = googleId; return this; }

        public User build() {
            return new User(id, email, passwordHash, fullName, phone, avatarUrl, role, status, googleId);
        }
    }
}
