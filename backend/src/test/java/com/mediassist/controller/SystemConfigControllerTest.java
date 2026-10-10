package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.EmbeddingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemConfigControllerTest {

    @Mock
    private EmbeddingService embeddingService;

    @Mock
    private DoctorSemanticSearchService doctorSemanticSearchService;

    private SystemConfigController controller;

    @BeforeEach
    void setUp() {
        controller = new SystemConfigController(embeddingService, doctorSemanticSearchService);
    }

    @Test
    @DisplayName("GET /api/v1/system/ai-mode returns current AI vector engine status")
    void testGetAiModeStatus() {
        when(embeddingService.isForceOfflineSimulation()).thenReturn(false);
        when(embeddingService.isOnlineNeuralActive()).thenReturn(true);
        when(embeddingService.getActiveEngineDescription()).thenReturn("Mạng Nơ-ron Transformer Trực Tuyến (text-embedding-3-small 1536-d)");

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.getAiModeStatus();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());

        Map<String, Object> data = response.getBody().getData();
        assertEquals(false, data.get("forcedOfflineSimulation"));
        assertEquals(true, data.get("onlineNeuralActive"));
        assertEquals(1536, data.get("vectorDimensions"));
    }

    @Test
    @DisplayName("POST /api/v1/system/ai-mode/toggle switches simulation mode and invalidates cache")
    void testToggleAiMode() {
        when(embeddingService.isForceOfflineSimulation()).thenReturn(false).thenReturn(true);
        when(embeddingService.isOnlineNeuralActive()).thenReturn(false);
        when(embeddingService.getActiveEngineDescription()).thenReturn("Giả Lập Tắt API Key (Unsupervised Character Hashing 1536-d)");

        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.toggleAiMode(null);

        verify(embeddingService).setForceOfflineSimulation(true);
        verify(doctorSemanticSearchService).invalidateCache();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().getData().get("message").toString().contains("TẮT API Key"));
    }

    @Test
    @DisplayName("POST /api/v1/system/ai-mode/sync-vectors triggers re-embedding of doctors")
    void testSyncDoctorVectors() {
        ResponseEntity<ApiResponse<Map<String, Object>>> response = controller.syncDoctorVectors();

        verify(doctorSemanticSearchService).syncAllDoctorEmbeddings();
        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().getData().get("message").toString().contains("thành công"));
    }
}
