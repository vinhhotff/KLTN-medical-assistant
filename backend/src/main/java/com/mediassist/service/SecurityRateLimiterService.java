package com.mediassist.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class SecurityRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(SecurityRateLimiterService.class);

    private final StringRedisTemplate redisTemplate;
    private final Map<String, WindowCounter> fallbackMap = new ConcurrentHashMap<>();

    public SecurityRateLimiterService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Rate limiter for Login attempts (Anti-Brute Force / DDoS)
     * Limit: 5 attempts per minute per IP address
     */
    public boolean allowLoginAttempt(String ipAddress) {
        return checkLimit("login:" + ipAddress, 5, 1);
    }

    /**
     * Rate limiter for AI Symptom Triage requests
     * Limit: 10 requests per minute per user
     */
    public boolean allowTriage(String userKey) {
        return checkLimit("triage:" + userKey, 10, 1);
    }

    /**
     * Rate limiter for Multimodal Medical Document Uploads & OCR
     * Limit: 5 uploads per minute per user (Max 15MB each)
     */
    public boolean allowDocumentUpload(String userKey) {
        return checkLimit("doc_upload:" + userKey, 5, 1);
    }

    private boolean checkLimit(String key, int maxRequests, int windowMinutes) {
        String redisKey = "ratelimit:" + key;
        try {
            Long count = redisTemplate.opsForValue().increment(redisKey);
            if (count != null && count == 1) {
                redisTemplate.expire(redisKey, Duration.ofMinutes(windowMinutes));
            }
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            log.warn("Redis unavailable for rate limiter (key: {}), using in-memory fallback: {}", key, e.getMessage());
            return allowInMemory(key, maxRequests);
        }
    }

    private boolean allowInMemory(String key, int maxRequests) {
        long currentMinute = System.currentTimeMillis() / 60000;
        WindowCounter counter = fallbackMap.compute(key, (k, existing) -> {
            if (existing == null || existing.minute != currentMinute) {
                return new WindowCounter(currentMinute, new AtomicInteger(1));
            }
            existing.counter.incrementAndGet();
            return existing;
        });
        return counter.counter.get() <= maxRequests;
    }

    private record WindowCounter(long minute, AtomicInteger counter) {}

    private final Map<String, Long> fallbackPenaltyMap = new ConcurrentHashMap<>();
    private final Map<String, AtomicInteger> fallbackFailCountMap = new ConcurrentHashMap<>();

    /**
     * Checks if user is in upload cooldown penalty due to consecutive invalid/malicious files.
     */
    public boolean isUploadPenalized(String userKey) {
        String penaltyKey = "penalty:doc_upload:" + userKey;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(penaltyKey));
        } catch (Exception e) {
            Long expireAt = fallbackPenaltyMap.get(userKey);
            return expireAt != null && expireAt > System.currentTimeMillis();
        }
    }

    /**
     * Records a failed upload (e.g. rejected by gatekeeper or corrupted).
     * If failed 3 consecutive times in 5 minutes, triggers a 10-minute cooldown penalty.
     */
    public void recordFailedUpload(String userKey) {
        String failureKey = "fail:doc_upload:" + userKey;
        try {
            Long failures = redisTemplate.opsForValue().increment(failureKey);
            if (failures != null && failures == 1) {
                redisTemplate.expire(failureKey, Duration.ofMinutes(5));
            }
            if (failures != null && failures >= 3) {
                String penaltyKey = "penalty:doc_upload:" + userKey;
                redisTemplate.opsForValue().set(penaltyKey, "BLOCKED", Duration.ofMinutes(10));
                log.warn("🚨 [UPLOAD CIRCUIT BREAKER] User {} triggered 3 consecutive invalid upload failures. Imposing 10-minute upload penalty.", userKey);
            }
        } catch (Exception e) {
            AtomicInteger count = fallbackFailCountMap.computeIfAbsent(userKey, k -> new AtomicInteger(0));
            if (count.incrementAndGet() >= 3) {
                fallbackPenaltyMap.put(userKey, System.currentTimeMillis() + 10 * 60 * 1000);
                log.warn("🚨 [UPLOAD CIRCUIT BREAKER - IN-MEMORY] User {} blocked for 10 minutes", userKey);
            }
        }
    }

    /**
     * Resets failure counter upon a successful upload.
     */
    public void recordSuccessfulUpload(String userKey) {
        try {
            redisTemplate.delete("fail:doc_upload:" + userKey);
        } catch (Exception ignored) {}
        fallbackFailCountMap.remove(userKey);
    }
}
