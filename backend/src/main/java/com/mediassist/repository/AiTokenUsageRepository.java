package com.mediassist.repository;

import com.mediassist.model.entity.AiTokenUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AiTokenUsageRepository extends JpaRepository<AiTokenUsage, UUID> {

    // Tổng token + cost + requests theo khoảng thời gian
    @Query("SELECT COALESCE(SUM(a.totalTokens), 0), COALESCE(SUM(a.costUsd), 0), COUNT(a) " +
           "FROM AiTokenUsage a WHERE a.createdAt BETWEEN :from AND :to")
    Object[] findAggregateStats(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Theo ngày (cho line chart: date, totalTokens, totalCostUsd)
    @Query("SELECT FUNCTION('DATE', a.createdAt), COALESCE(SUM(a.totalTokens), 0), COALESCE(SUM(a.costUsd), 0) " +
           "FROM AiTokenUsage a WHERE a.createdAt >= :from " +
           "GROUP BY FUNCTION('DATE', a.createdAt) ORDER BY FUNCTION('DATE', a.createdAt)")
    List<Object[]> findDailyStats(@Param("from") LocalDateTime from);

    // Theo service type (serviceType, totalTokens, totalCostUsd, count)
    @Query("SELECT a.serviceType, COALESCE(SUM(a.totalTokens), 0), COALESCE(SUM(a.costUsd), 0), COUNT(a) " +
           "FROM AiTokenUsage a WHERE a.createdAt >= :from GROUP BY a.serviceType")
    List<Object[]> findStatsByServiceType(@Param("from") LocalDateTime from);

    // Error rate (requestStatus, count)
    @Query("SELECT a.requestStatus, COUNT(a) FROM AiTokenUsage a " +
           "WHERE a.createdAt >= :from GROUP BY a.requestStatus")
    List<Object[]> findErrorRateStats(@Param("from") LocalDateTime from);
}
