package com.mediassist;

import com.mediassist.config.TwoLayerCacheConfig;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.service.TwoLayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

    @Test
    void testRedisJsonSerializerHandlesDoctorArrayAndLocalDateTime() {
        GenericJackson2JsonRedisSerializer serializer = TwoLayerCacheConfig.createRedisJsonSerializer();

        DoctorDetailDto dto = new DoctorDetailDto();
        UUID userId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.of(2026, 11, 15, 10, 30, 0);
        dto.setId(userId);
        dto.setProfileId(UUID.randomUUID());
        dto.setFullName("BS. Nguyen Van Test");
        dto.setEmail("doctor.cache@mediassist.local");
        dto.setConsultationFee(new BigDecimal("250000"));
        dto.setYearsOfExperience(10);
        dto.setVerified(true);
        dto.setSpecialties(List.of("Tim mach"));
        dto.setCreatedAt(now);

        DoctorDetailDto[] input = new DoctorDetailDto[]{dto};
        byte[] serialized = serializer.serialize(input);
        assertNotNull(serialized);

        Object deserialized = serializer.deserialize(serialized);
        assertInstanceOf(DoctorDetailDto[].class, deserialized);
        DoctorDetailDto[] output = (DoctorDetailDto[]) deserialized;
        assertEquals(1, output.length);
        assertEquals(userId, output[0].getId());
        assertEquals(now, output[0].getCreatedAt());
        assertEquals("BS. Nguyen Van Test", output[0].getFullName());
        assertTrue(output[0].isVerified());
    }
}
