package com.mediassist.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class SecurityRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(SecurityRateLimiterService.class);

    private static final String RATE_LIMIT_LUA =
            "local current = redis.call('INCR', KEYS[1])\n" +
            "if current == 1 then\n" +
            "    redis.call('EXPIRE', KEYS[1], ARGV[1])\n" +
            "end\n" +
            "return current";
    private static final RedisScript<Long> RATE_LIMIT_SCRIPT = RedisScript.of(RATE_LIMIT_LUA, Long.class);

    private final StringRedisTemplate redisTemplate;

    // Layer 1 In-Memory Fallbacks with Bounded Capacity and Auto-Eviction (No Memory Leaks)
    private final Cache<String, WindowCounter> fallbackCache = Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    private final Cache<String, Long> fallbackPenaltyCache = Caffeine.newBuilder()
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

    private final Cache<String, AtomicInteger> fallbackFailCountCache = Caffeine.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .maximumSize(10_000)
            .build();

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
     * Rate limiter for Multimodal Medical Document Uploads & OCR (Authenticated)
     * Limit: 5 uploads per minute per user
     */
    public boolean allowDocumentUpload(String userKey) {
        return checkLimit("doc_upload:" + userKey, 5, 1);
    }

    /**
     * Rate limiter for unauthenticated preview document analysis (Public Homepage Demo)
     * Limit: 3 requests per 10 minutes per IP address (Anti-LLM Token Drain)
     */
    public boolean allowPreviewUpload(String ipAddress) {
        return checkLimit("preview:" + ipAddress, 3, 10);
    }

    /**
     * Rate limiter for new patient account registration (Anti-Bot Spam / BCrypt DoS)
     * Limit: 5 registrations per 10 minutes per IP address
     */
    public boolean allowRegistrationAttempt(String ipAddress) {
        return checkLimit("register:" + ipAddress, 5, 10);
    }

    /**
     * Rate limiter for sample PDF generation from Hugging Face / Meddies dataset
     * Limit: 10 requests per minute per IP address (Anti-DoS & CPU/Network protection)
     */
    public boolean allowSamplePdfDownload(String ipAddress) {
        return checkLimit("sample_pdf:" + ipAddress, 10, 1);
    }

    private boolean checkLimit(String key, int maxRequests, int windowMinutes) {
        String redisKey = "ratelimit:" + key;
        try {
            Long count = null;
            try {
                count = redisTemplate.execute(
                        RATE_LIMIT_SCRIPT,
                        Collections.singletonList(redisKey),
                        String.valueOf(windowMinutes * 60)
                );
            } catch (Exception ignoredScriptEx) {}

            if (count == null) {
                count = redisTemplate.opsForValue().increment(redisKey);
                if (count != null && count == 1) {
                    redisTemplate.expire(redisKey, Duration.ofMinutes(windowMinutes));
                }
            }
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            log.warn("Redis unavailable for rate limiter (key: {}), using bounded in-memory fallback: {}", key, e.getMessage());
            return allowInMemory(key, maxRequests);
        }
    }

    private boolean allowInMemory(String key, int maxRequests) {
        long currentMinute = System.currentTimeMillis() / 60000;
        WindowCounter counter = fallbackCache.asMap().compute(key, (k, existing) -> {
            if (existing == null || existing.minute != currentMinute) {
                return new WindowCounter(currentMinute, new AtomicInteger(1));
            }
            existing.counter.incrementAndGet();
            return existing;
        });
        return counter != null && counter.counter.get() <= maxRequests;
    }

    private record WindowCounter(long minute, AtomicInteger counter) {}

    /**
     * Checks if user is in upload cooldown penalty due to consecutive invalid/malicious files.
     */
    public boolean isUploadPenalized(String userKey) {
        String penaltyKey = "penalty:doc_upload:" + userKey;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(penaltyKey));
        } catch (Exception e) {
            Long expireAt = fallbackPenaltyCache.getIfPresent(userKey);
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
            Long failures = null;
            try {
                failures = redisTemplate.execute(
                        RATE_LIMIT_SCRIPT,
                        Collections.singletonList(failureKey),
                        "300" // 5 minutes
                );
            } catch (Exception ignoredScriptEx) {}

            if (failures == null) {
                failures = redisTemplate.opsForValue().increment(failureKey);
                if (failures != null && failures == 1) {
                    redisTemplate.expire(failureKey, Duration.ofMinutes(5));
                }
            }
            if (failures != null && failures >= 3) {
                String penaltyKey = "penalty:doc_upload:" + userKey;
                redisTemplate.opsForValue().set(penaltyKey, "BLOCKED", Duration.ofMinutes(10));
                log.warn("🚨 [UPLOAD CIRCUIT BREAKER] User {} triggered 3 consecutive invalid upload failures. Imposing 10-minute upload penalty.", userKey);
            }
        } catch (Exception e) {
            AtomicInteger count = fallbackFailCountCache.asMap().computeIfAbsent(userKey, k -> new AtomicInteger(0));
            if (count.incrementAndGet() >= 3) {
                fallbackPenaltyCache.put(userKey, System.currentTimeMillis() + 10 * 60 * 1000);
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
        fallbackFailCountCache.invalidate(userKey);
    }
}
