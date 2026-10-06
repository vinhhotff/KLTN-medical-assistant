package com.mediassist.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class AiUsageStatsDto {

    private Long totalRequests = 0L;
    private Long totalTokens = 0L;
    private BigDecimal totalCostUsd = BigDecimal.ZERO;
    private BigDecimal totalCostVnd = BigDecimal.ZERO; // = totalCostUsd * exchangeRate
    private Double errorRatePercent = 0.0;
    private List<DailyStatDto> dailyStats = new ArrayList<>(); // cho line chart
    private List<ServiceStatDto> serviceStats = new ArrayList<>(); // cho pie chart

    public AiUsageStatsDto() {}

    public AiUsageStatsDto(Long totalRequests, Long totalTokens, BigDecimal totalCostUsd,
                           BigDecimal totalCostVnd, Double errorRatePercent,
                           List<DailyStatDto> dailyStats, List<ServiceStatDto> serviceStats) {
        this.totalRequests = totalRequests;
        this.totalTokens = totalTokens;
        this.totalCostUsd = totalCostUsd;
        this.totalCostVnd = totalCostVnd;
        this.errorRatePercent = errorRatePercent;
        this.dailyStats = dailyStats;
        this.serviceStats = serviceStats;
    }

    public Long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(Long totalRequests) {
        this.totalRequests = totalRequests;
    }

    public Long getTotalTokens() {
        return totalTokens;
    }

    public void setTotalTokens(Long totalTokens) {
        this.totalTokens = totalTokens;
    }

    public BigDecimal getTotalCostUsd() {
        return totalCostUsd;
    }

    public void setTotalCostUsd(BigDecimal totalCostUsd) {
        this.totalCostUsd = totalCostUsd;
    }

    public BigDecimal getTotalCostVnd() {
        return totalCostVnd;
    }

    public void setTotalCostVnd(BigDecimal totalCostVnd) {
        this.totalCostVnd = totalCostVnd;
    }

    public Double getErrorRatePercent() {
        return errorRatePercent;
    }

    public void setErrorRatePercent(Double errorRatePercent) {
        this.errorRatePercent = errorRatePercent;
    }

    public List<DailyStatDto> getDailyStats() {
        return dailyStats;
    }

    public void setDailyStats(List<DailyStatDto> dailyStats) {
        this.dailyStats = dailyStats;
    }

    public List<ServiceStatDto> getServiceStats() {
        return serviceStats;
    }

    public void setServiceStats(List<ServiceStatDto> serviceStats) {
        this.serviceStats = serviceStats;
    }

    // Inner Records
    public record DailyStatDto(String date, Long tokens, BigDecimal costUsd) {}

    public record ServiceStatDto(String service, Long tokens, BigDecimal costUsd, Long requests) {}
}
