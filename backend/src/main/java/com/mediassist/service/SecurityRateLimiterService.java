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
}
