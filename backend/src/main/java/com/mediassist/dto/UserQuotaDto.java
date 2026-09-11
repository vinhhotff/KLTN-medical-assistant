package com.mediassist.dto;

import java.time.LocalDateTime;

public class UserQuotaDto {
    private int scanQuota;
    private String subscriptionTier;
    private LocalDateTime vipValidUntil;
    private boolean isVip;
    private boolean hasQuota;

    public UserQuotaDto() {}

    public UserQuotaDto(int scanQuota, String subscriptionTier, LocalDateTime vipValidUntil, boolean isVip, boolean hasQuota) {
        this.scanQuota = scanQuota;
        this.subscriptionTier = subscriptionTier;
        this.vipValidUntil = vipValidUntil;
        this.isVip = isVip;
        this.hasQuota = hasQuota;
    }

    public int getScanQuota() { return scanQuota; }
    public void setScanQuota(int scanQuota) { this.scanQuota = scanQuota; }

    public String getSubscriptionTier() { return subscriptionTier; }
    public void setSubscriptionTier(String subscriptionTier) { this.subscriptionTier = subscriptionTier; }

    public LocalDateTime getVipValidUntil() { return vipValidUntil; }
    public void setVipValidUntil(LocalDateTime vipValidUntil) { this.vipValidUntil = vipValidUntil; }

    public boolean isVip() { return isVip; }
    public void setVip(boolean vip) { isVip = vip; }

    public boolean isHasQuota() { return hasQuota; }
    public void setHasQuota(boolean hasQuota) { this.hasQuota = hasQuota; }
}
