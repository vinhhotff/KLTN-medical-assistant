package com.mediassist.service;

import com.mediassist.dto.AiUsageStatsDto;
import com.mediassist.dto.AiUsageStatsDto.DailyStatDto;
import com.mediassist.dto.AiUsageStatsDto.ServiceStatDto;
import com.mediassist.model.entity.AiTokenUsage;
import com.mediassist.model.entity.AiTokenUsage.RequestStatus;
import com.mediassist.model.entity.AiTokenUsage.ServiceType;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AiTokenUsageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AiUsageAnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AiUsageAnalyticsService.class);

    private final AiTokenUsageRepository aiTokenUsageRepository;

    @Value("${app.ai.cost.vnd-per-usd:25000}")
    private BigDecimal vndPerUsdRate;

    public AiUsageAnalyticsService(AiTokenUsageRepository aiTokenUsageRepository) {
        this.aiTokenUsageRepository = aiTokenUsageRepository;
    }

    /**
     * Calculates cost based on standard Gemini 1.5/Flash pricing:
     * $0.00125 per 1,000 prompt tokens, $0.005 per 1,000 completion tokens.
     */
    public BigDecimal calculateCost(int promptTokens, int completionTokens) {
        BigDecimal promptCost = BigDecimal.valueOf(promptTokens)
                .multiply(new BigDecimal("0.00000125")); // $0.00125 / 1000
        BigDecimal completionCost = BigDecimal.valueOf(completionTokens)
                .multiply(new BigDecimal("0.000005")); // $0.005 / 1000
        return promptCost.add(completionCost).setScale(6, RoundingMode.HALF_UP);
    }

    /**
     * Records a single token usage event asynchronously or within transaction.
     */
    @Transactional
    public void recordUsage(ServiceType serviceType, String modelName, int promptTokens,
                            int completionTokens, RequestStatus status, User user, Appointment appointment) {
        try {
            AiTokenUsage usage = new AiTokenUsage();
            usage.setServiceType(serviceType);
            usage.setModelName(modelName != null && !modelName.isBlank() ? modelName : "gemini-3.6-flash");
            usage.setPromptTokens(promptTokens);
            usage.setCompletionTokens(completionTokens);
            usage.setTotalTokens(promptTokens + completionTokens);
            usage.setCostUsd(calculateCost(promptTokens, completionTokens));
            usage.setRequestStatus(status != null ? status : RequestStatus.SUCCESS);
            usage.setUser(user);
            usage.setAppointment(appointment);
            usage.setCreatedAt(LocalDateTime.now());

            aiTokenUsageRepository.save(usage);
            log.info("📊 [AI FINOPS] Recorded {} token usage: {} total tokens, ${} USD ({})",
                    serviceType, usage.getTotalTokens(), usage.getCostUsd(), usage.getRequestStatus());
        } catch (Exception ex) {
            log.warn("⚠️ Failed to record AI token usage: {}", ex.getMessage());
        }
    }

    /**
     * Aggregates usage statistics over the specified number of days.
     */
    @Transactional(readOnly = true)
    public AiUsageStatsDto getUsageStats(int days) {
        int windowDays = days > 0 ? days : 30;
        LocalDateTime from = LocalDateTime.now().minusDays(windowDays);
        LocalDateTime to = LocalDateTime.now();

        // 1. Aggregate totals
        Object[] aggregate = aiTokenUsageRepository.findAggregateStats(from, to);
        Long totalTokens = 0L;
        BigDecimal totalCostUsd = BigDecimal.ZERO;
        Long totalRequests = 0L;

        if (aggregate != null && aggregate.length > 0) {
            Object rowObj = aggregate[0];
            Object[] row = (rowObj instanceof Object[]) ? (Object[]) rowObj : aggregate;
            if (row.length >= 3) {
                if (row[0] != null) totalTokens = ((Number) row[0]).longValue();
                if (row[1] != null) totalCostUsd = new BigDecimal(row[1].toString()).setScale(6, RoundingMode.HALF_UP);
                if (row[2] != null) totalRequests = ((Number) row[2]).longValue();
            }
        }

        BigDecimal rate = vndPerUsdRate != null ? vndPerUsdRate : new BigDecimal("25000");
        BigDecimal totalCostVnd = totalCostUsd.multiply(rate).setScale(0, RoundingMode.HALF_UP);

        // 2. Daily Stats
        List<Object[]> dailyRows = aiTokenUsageRepository.findDailyStats(from);
        List<DailyStatDto> dailyStats = new ArrayList<>();
        if (dailyRows != null) {
            for (Object[] r : dailyRows) {
                String date = r[0] != null ? r[0].toString() : "";
                Long tokens = r[1] != null ? ((Number) r[1]).longValue() : 0L;
                BigDecimal cost = r[2] != null ? new BigDecimal(r[2].toString()).setScale(6, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                dailyStats.add(new DailyStatDto(date, tokens, cost));
            }
        }

        // 3. Service Type Stats
        List<Object[]> serviceRows = aiTokenUsageRepository.findStatsByServiceType(from);
        List<ServiceStatDto> serviceStats = new ArrayList<>();
        if (serviceRows != null) {
            for (Object[] r : serviceRows) {
                String service = r[0] != null ? r[0].toString() : "UNKNOWN";
                Long tokens = r[1] != null ? ((Number) r[1]).longValue() : 0L;
                BigDecimal cost = r[2] != null ? new BigDecimal(r[2].toString()).setScale(6, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                Long count = r[3] != null ? ((Number) r[3]).longValue() : 0L;
                serviceStats.add(new ServiceStatDto(service, tokens, cost, count));
            }
        }

        // 4. Error Rate
        List<Object[]> errorRows = aiTokenUsageRepository.findErrorRateStats(from);
        long errorCount = 0L;
        if (errorRows != null) {
            for (Object[] r : errorRows) {
                String statusStr = r[0] != null ? r[0].toString() : "";
                long count = r[1] != null ? ((Number) r[1]).longValue() : 0L;
                if ("ERROR".equalsIgnoreCase(statusStr) || "TIMEOUT".equalsIgnoreCase(statusStr)) {
                    errorCount += count;
                }
            }
        }

        Double errorRatePercent = 0.0;
        if (totalRequests > 0) {
            errorRatePercent = ((double) errorCount / totalRequests) * 100.0;
            errorRatePercent = Math.round(errorRatePercent * 10.0) / 10.0;
        }

        return new AiUsageStatsDto(
                totalRequests,
                totalTokens,
                totalCostUsd,
                totalCostVnd,
                errorRatePercent,
                dailyStats,
                serviceStats
        );
    }
}
