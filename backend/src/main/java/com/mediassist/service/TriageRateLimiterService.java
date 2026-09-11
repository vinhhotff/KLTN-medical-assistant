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
public class TriageRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(TriageRateLimiterService.class);
    private static final int MAX_REQUESTS_PER_MINUTE = 15;

    private final StringRedisTemplate redisTemplate;
    // In-memory fallback
    private final Map<String, WindowCounter> fallbackMap = new ConcurrentHashMap<>();

    public TriageRateLimiterService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean allowRequest(String clientIdentifier) {
        String key = "ratelimit:triage:" + clientIdentifier;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(1));
            }
            return count != null && count <= MAX_REQUESTS_PER_MINUTE;
        } catch (Exception e) {
            log.warn("Redis unavailable for rate limiter, using in-memory fallback: {}", e.getMessage());
            return allowInMemory(clientIdentifier);
        }
    }

    private boolean allowInMemory(String clientIdentifier) {
        long currentMinute = System.currentTimeMillis() / 60000;
        WindowCounter counter = fallbackMap.compute(clientIdentifier, (k, existing) -> {
            if (existing == null || existing.minute != currentMinute) {
                return new WindowCounter(currentMinute, new AtomicInteger(1));
            }
            existing.counter.incrementAndGet();
            return existing;
        });
        return counter.counter.get() <= MAX_REQUESTS_PER_MINUTE;
    }

    private record WindowCounter(long minute, AtomicInteger counter) {}
}
