package com.mediassist;

import com.mediassist.dto.AiUsageStatsDto;
import com.mediassist.model.entity.AiTokenUsage;
import com.mediassist.repository.AiTokenUsageRepository;
import com.mediassist.service.AiUsageAnalyticsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiUsageAnalyticsServiceTest {

    @Mock
    private AiTokenUsageRepository aiTokenUsageRepository;

    @InjectMocks
    private AiUsageAnalyticsService aiUsageAnalyticsService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiUsageAnalyticsService, "vndPerUsdRate", new BigDecimal("25000"));
    }

    @Test
    @DisplayName("calculateCost: accurately computes USD cost based on standard Gemini rates")
    void testCalculateCost() {
        // 1000 prompt tokens = $0.00125, 1000 completion tokens = $0.00500 => Total = $0.006250
        BigDecimal cost = aiUsageAnalyticsService.calculateCost(1000, 1000);
        assertEquals(new BigDecimal("0.006250"), cost);
    }

    @Test
    @DisplayName("recordUsage: successfully creates and saves an AiTokenUsage entity")
    void testRecordUsage() {
        when(aiTokenUsageRepository.save(any(AiTokenUsage.class))).thenAnswer(i -> i.getArgument(0));

        aiUsageAnalyticsService.recordUsage(
                AiTokenUsage.ServiceType.TRIAGE,
                "gemini-3.6-flash",
                500,
                200,
                AiTokenUsage.RequestStatus.SUCCESS,
                null,
                null
        );

        verify(aiTokenUsageRepository, times(1)).save(any(AiTokenUsage.class));
    }

    @Test
    @DisplayName("getUsageStats: aggregates metrics into DTO with USD/VND conversions and error rate")
    void testGetUsageStats() {
        Object[] aggregateMock = new Object[]{ 15000L, new BigDecimal("0.052500"), 40L };
        when(aiTokenUsageRepository.findAggregateStats(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(aggregateMock);

        List<Object[]> dailyMock = List.of(
                new Object[]{ "2026-10-01", 7000L, new BigDecimal("0.024500") },
                new Object[]{ "2026-10-02", 8000L, new BigDecimal("0.028000") }
        );
        when(aiTokenUsageRepository.findDailyStats(any(LocalDateTime.class))).thenReturn(dailyMock);

        List<Object[]> serviceMock = List.of(
                new Object[]{ "TRIAGE", 10000L, new BigDecimal("0.035000"), 30L },
                new Object[]{ "DOCUMENT_ANALYSIS", 5000L, new BigDecimal("0.017500"), 10L }
        );
        when(aiTokenUsageRepository.findStatsByServiceType(any(LocalDateTime.class))).thenReturn(serviceMock);

        List<Object[]> errorMock = List.of(
                new Object[]{ "SUCCESS", 38L },
                new Object[]{ "ERROR", 2L }
        );
        when(aiTokenUsageRepository.findErrorRateStats(any(LocalDateTime.class))).thenReturn(errorMock);

        AiUsageStatsDto stats = aiUsageAnalyticsService.getUsageStats(30);

        assertNotNull(stats);
        assertEquals(40L, stats.getTotalRequests());
        assertEquals(15000L, stats.getTotalTokens());
        assertEquals(new BigDecimal("0.052500"), stats.getTotalCostUsd());
        // 0.052500 * 25000 = 1312.5 => 1313 VND
        assertEquals(new BigDecimal("1313"), stats.getTotalCostVnd());
        assertEquals(5.0, stats.getErrorRatePercent()); // 2 / 40 = 5.0%

        assertEquals(2, stats.getDailyStats().size());
        assertEquals(2, stats.getServiceStats().size());
    }
}
