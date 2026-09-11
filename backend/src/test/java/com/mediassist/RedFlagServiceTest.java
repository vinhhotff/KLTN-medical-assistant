package com.mediassist;

import com.mediassist.service.RedFlagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class RedFlagServiceTest {

    private RedFlagService redFlagService;

    @BeforeEach
    void setUp() {
        redFlagService = new RedFlagService();
    }

    @Test
    @DisplayName("Should detect Acute Coronary Syndrome red-flag")
    void testDetectCoronarySyndrome() {
        String symptoms = "Tôi bị đau thắt ngực dữ dội, cảm giác đè nặng lồng ngực lan ra tay trái";
        Optional<String> alert = redFlagService.evaluateRedFlag(symptoms);

        assertTrue(alert.isPresent());
        assertTrue(alert.get().contains("Hội chứng Mạch vành"));
        assertTrue(alert.get().contains("115"));
    }

    @Test
    @DisplayName("Should detect Acute Stroke FAST signs")
    void testDetectStroke() {
        String symptoms = "Bố tôi tự nhiên bị méo miệng và nói ngọng khi vừa ngủ dậy";
        Optional<String> alert = redFlagService.evaluateRedFlag(symptoms);

        assertTrue(alert.isPresent());
        assertTrue(alert.get().contains("ĐỘT QUỴ KHẨN CẤP"));
        assertTrue(alert.get().contains("FAST"));
    }

    @Test
    @DisplayName("Should detect Anaphylaxis danger signs")
    void testDetectAnaphylaxis() {
        String symptoms = "Sau khi uống thuốc kháng sinh tôi bị sốc phản vệ và phù môi mắt";
        Optional<String> alert = redFlagService.evaluateRedFlag(symptoms);

        assertTrue(alert.isPresent());
        assertTrue(alert.get().contains("SỐC PHẢN VỆ"));
    }

    @Test
    @DisplayName("Should return empty for non-emergency routine symptoms")
    void testRoutineSymptomsSafe() {
        String symptoms = "Tôi bị mụn trứng cá và ngứa nhẹ ở vùng cằm vài ngày nay";
        Optional<String> alert = redFlagService.evaluateRedFlag(symptoms);

        assertTrue(alert.isEmpty());
    }

    @Test
    @DisplayName("Should handle empty or blank inputs gracefully")
    void testEmptyInput() {
        assertTrue(redFlagService.evaluateRedFlag(null).isEmpty());
        assertTrue(redFlagService.evaluateRedFlag("   ").isEmpty());
    }
}
