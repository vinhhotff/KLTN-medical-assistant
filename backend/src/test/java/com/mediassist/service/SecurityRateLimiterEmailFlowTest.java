package com.mediassist.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.*;

class SecurityRateLimiterEmailFlowTest {

    @SuppressWarnings("unchecked")
    private StringRedisTemplate redisWithCounter(String keyPrefix, Long... counts) {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(startsWith(keyPrefix))).thenReturn(counts[0], java.util.Arrays.copyOfRange(counts, 1, counts.length));
        return redisTemplate;
    }

    @Test
    @DisplayName("forgot-password theo IP: 5 lan / 15 phut")
    void forgotPasswordByIp() {
        SecurityRateLimiterService limiter = new SecurityRateLimiterService(
                redisWithCounter("ratelimit:forgot_ip:", 1L, 2L, 3L, 4L, 5L, 6L));
        for (int i = 0; i < 5; i++) assertTrue(limiter.allowForgotPasswordByIp("10.0.0.1"));
        assertFalse(limiter.allowForgotPasswordByIp("10.0.0.1"));
    }

    @Test
    @DisplayName("forgot-password theo email: 3 lan / gio, key Redis la hash (khong chua email dang ro)")
    void forgotPasswordByEmail_KeyIsHashed() {
        StringRedisTemplate redis = redisWithCounter("ratelimit:forgot_email:", 1L, 2L, 3L, 4L);
        SecurityRateLimiterService limiter = new SecurityRateLimiterService(redis);
        for (int i = 0; i < 3; i++) assertTrue(limiter.allowForgotPasswordByEmail("patient@example.com"));
        assertFalse(limiter.allowForgotPasswordByEmail("patient@example.com"));

        verify(redis.opsForValue(), never()).increment(org.mockito.ArgumentMatchers.contains("patient@example.com"));
    }

    @Test
    @DisplayName("Fallback in-memory (Redis sap) ton trong do dai cua so: gioi han 3 lan/gio khong bi reset moi phut")
    void inMemoryFallbackHonoursWindow() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("down"));
        when(redis.execute(org.mockito.ArgumentMatchers.<org.springframework.data.redis.core.script.RedisScript<Long>>any(),
                anyList(), anyString())).thenThrow(new RedisConnectionFailureException("down"));
        SecurityRateLimiterService limiter = new SecurityRateLimiterService(redis);

        for (int i = 0; i < 3; i++) assertTrue(limiter.allowForgotPasswordByEmail("patient@example.com"));
        assertFalse(limiter.allowForgotPasswordByEmail("patient@example.com"));
        // Email khac co bo dem rieng
        assertTrue(limiter.allowForgotPasswordByEmail("other@example.com"));
    }
}
