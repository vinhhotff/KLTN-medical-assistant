package com.mediassist.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class TwoLayerCacheService {

    private static final Logger log = LoggerFactory.getLogger(TwoLayerCacheService.class);

    private final RedisTemplate<String, Object> redisTemplate;

    // L1: In-Memory Caffeine Cache
    private final Cache<String, Object> l1Cache = Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .build();

    public TwoLayerCacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Retrieve item: checks L1 (Caffeine) first, then L2 (Redis).
     */
    @SuppressWarnings("unchecked")
    public <T> T get(String key, Class<T> clazz) {
        // 1. Check L1 Caffeine
        Object l1Value = l1Cache.getIfPresent(key);
        if (l1Value != null) {
            log.debug("Cache HIT [L1 Caffeine] for key: {}", key);
            return (T) l1Value;
        }

        // 2. Check L2 Redis
        try {
            Object l2Value = redisTemplate.opsForValue().get(key);
            if (l2Value != null) {
                log.debug("Cache HIT [L2 Redis] for key: {}", key);
                // Backfill L1
                l1Cache.put(key, l2Value);
                return (T) l2Value;
            }
        } catch (Exception ex) {
            log.warn("Redis read failed for key [{}], bypassing L2: {}", key, ex.getMessage());
        }

        log.debug("Cache MISS [L1 & L2] for key: {}", key);
        return null;
    }

    /**
     * Store item in both L1 (Memory) and L2 (Redis).
     */
    public void set(String key, Object value, long ttlSeconds) {
        // 1. Put into L1
        l1Cache.put(key, value);

        // 2. Put into L2 Redis
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception ex) {
            log.warn("Redis write failed for key [{}]: {}", key, ex.getMessage());
        }
    }

    /**
     * Evict item from both cache layers.
     */
    public void evict(String key) {
        l1Cache.invalidate(key);
        try {
            redisTemplate.delete(key);
        } catch (Exception ex) {
            log.warn("Redis delete failed for key [{}]: {}", key, ex.getMessage());
        }
    }

    public void clearL1() {
        l1Cache.invalidateAll();
    }
}
