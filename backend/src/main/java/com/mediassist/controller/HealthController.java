package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.service.TwoLayerCacheService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/health", "/health"})
@Tag(name = "Health Probes", description = "Kiểm tra tình trạng sống (Liveness) và sẵn sàng (Readiness) của hệ thống")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final TwoLayerCacheService cacheService;

    public HealthController(JdbcTemplate jdbcTemplate, RedisTemplate<String, Object> redisTemplate, TwoLayerCacheService cacheService) {
        this.jdbcTemplate = jdbcTemplate;
        this.redisTemplate = redisTemplate;
        this.cacheService = cacheService;
    }

    @GetMapping({"", "/live"})
    @Operation(summary = "Kiểm tra tiến trình Java đang chạy (Liveness)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkLiveness() {
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        Map<String, Object> data = new HashMap<>();
        data.put("status", "UP");
        data.put("uptimeSeconds", uptimeMs / 1000);
        data.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/ready")
    @Operation(summary = "Kiểm tra kết nối DB, Redis và Cache 2 lớp (Readiness)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkReadiness() {
        boolean dbOk = false;
        boolean redisOk = false;

        // 1. Check PostgreSQL
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            dbOk = (result != null && result == 1);
        } catch (Exception ignored) {}

        // 2. Check Redis
        try {
            RedisConnection connection = redisTemplate.getConnectionFactory() != null
                    ? redisTemplate.getConnectionFactory().getConnection()
                    : null;
            if (connection != null) {
                String ping = connection.ping();
                redisOk = "PONG".equalsIgnoreCase(ping);
                connection.close();
            }
        } catch (Exception ignored) {}

        // 3. Test Two-Layer Cache L1+L2
        cacheService.set("healthcheck_ping", "pong", 30);
        String cacheVal = cacheService.get("healthcheck_ping", String.class);
        boolean cacheOk = "pong".equals(cacheVal);

        boolean allHealthy = dbOk && redisOk;
        HttpStatus status = allHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

        Map<String, Object> components = new HashMap<>();
        components.put("database", dbOk ? "UP" : "DOWN");
        components.put("redis", redisOk ? "UP" : "DOWN");
        components.put("twoLayerCache", cacheOk ? "UP" : "DEGRADED");

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("status", allHealthy ? "READY" : "DEGRADED");
        responseData.put("components", components);
        responseData.put("timestamp", Instant.now().toString());

        return ResponseEntity.status(status).body(ApiResponse.success(responseData));
    }
}
