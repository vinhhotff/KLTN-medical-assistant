package com.mediassist;

import com.mediassist.service.TwoLayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TwoLayerCacheServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    private TwoLayerCacheService cacheService;

    @BeforeEach
    void setUp() {
        cacheService = new TwoLayerCacheService(redisTemplate);
        cacheService.clearL1();
    }

    @Test
    void testL1CacheHit() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        String key = "test_key";
        String value = "cached_data_123";

        // Write to cache
        cacheService.set(key, value, 60);

        // Read from cache (should hit L1 without calling Redis get)
        String cached = cacheService.get(key, String.class);
        assertEquals(value, cached);

        // Verify Redis get was never called because L1 hit
        verify(valueOperations, never()).get(key);
    }

    @Test
    void testCacheMissReturnsNull() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("non_existent")).thenReturn(null);

        String result = cacheService.get("non_existent", String.class);
        assertNull(result);
    }

    @Test
    void testEvictRemovesFromL1() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        String key = "evict_key";
        cacheService.set(key, "temp_val", 60);

        cacheService.evict(key);

        when(valueOperations.get(key)).thenReturn(null);
        String result = cacheService.get(key, String.class);
        assertNull(result);
    }
}
