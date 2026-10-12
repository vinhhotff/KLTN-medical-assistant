package com.mediassist.dto.payment;

import java.math.BigDecimal;

public class PaymentPackageDto {

    private String code;
    private String name;
    private String description;
    private BigDecimal priceVnd;
    private Integer scans;
    private Integer durationDays;
    private boolean unlimitedScans;

    public PaymentPackageDto() {}

    public PaymentPackageDto(String code, String name, String description, BigDecimal priceVnd,
                             Integer scans, Integer durationDays, boolean unlimitedScans) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.priceVnd = priceVnd;
        this.scans = scans;
        this.durationDays = durationDays;
        this.unlimitedScans = unlimitedScans;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPriceVnd() { return priceVnd; }
    public void setPriceVnd(BigDecimal priceVnd) { this.priceVnd = priceVnd; }

    public Integer getScans() { return scans; }
    public void setScans(Integer scans) { this.scans = scans; }

    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }

    public boolean isUnlimitedScans() { return unlimitedScans; }
    public void setUnlimitedScans(boolean unlimitedScans) { this.unlimitedScans = unlimitedScans; }
}
