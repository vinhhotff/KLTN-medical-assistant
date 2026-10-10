package com.mediassist.controller;

import com.mediassist.common.ApiResponse;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.EmbeddingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * System Configuration & AI Engine Interactive Control API.
 * Provides live runtime toggle between:
 * 1. Online Neural AI Embedding Mode (OpenAI / OpenRouter text-embedding-3-small 1536-d).
 * 2. Simulated Offline Testing Mode (Unsupervised Feature Hashing 1536-d, Zero-Hardcode).
 * Designed for thesis defense live demonstration of system resilience and fault tolerance.
 */
@RestController
@RequestMapping("/api/v1/system")
@Tag(name = "System Configuration & AI Testing", description = "Endpoints for live AI Engine status & interactive offline simulation toggle")
public class SystemConfigController {

    private static final Logger log = LoggerFactory.getLogger(SystemConfigController.class);

    private final EmbeddingService embeddingService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;

    public SystemConfigController(EmbeddingService embeddingService,
                                  DoctorSemanticSearchService doctorSemanticSearchService) {
        this.embeddingService = embeddingService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
    }

    @GetMapping("/ai-mode")
    @Operation(summary = "Lấy trạng thái hiện tại của động cơ Vector AI Embedding")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAiModeStatus() {
        Map<String, Object> status = buildStatusPayload();
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @PostMapping("/ai-mode/toggle")
    @Operation(summary = "Bật/Tắt giả lập ngắt kết nối API Key để kiểm thử chế độ Offline vs Online trực tiếp trên UI")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleAiMode(
            @RequestParam(name = "forceOffline", required = false) Boolean forceOffline) {

        boolean targetState = (forceOffline != null)
                ? forceOffline
                : !embeddingService.isForceOfflineSimulation();

        embeddingService.setForceOfflineSimulation(targetState);
        doctorSemanticSearchService.invalidateCache();

        log.info("🔀 [AI ENGINE TOGGLE] Mode switched: forceOffline = {}", targetState);

        Map<String, Object> status = buildStatusPayload();
        status.put("message", targetState
                ? "Đã giả lập TẮT API Key thành công! Hệ thống chuyển sang Unsupervised Feature Hashing (Không phụ thuộc mạng)."
                : "Đã BẬT lại chế độ Neural AI thành công! Hệ thống kết nối Mạng nơ-ron Transformer trực tuyến.");

        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @PostMapping("/ai-mode/sync-vectors")
    @Operation(summary = "Đồng bộ hóa lại vector embedding cho toàn bộ bác sĩ với động cơ AI hiện tại")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncDoctorVectors() {
        doctorSemanticSearchService.syncAllDoctorEmbeddings();
        Map<String, Object> status = buildStatusPayload();
        status.put("message", "Đã đồng bộ hóa vector thành công cho toàn bộ bác sĩ từ CSDL.");
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    private Map<String, Object> buildStatusPayload() {
        Map<String, Object> status = new LinkedHashMap<>();
        boolean isForcedOffline = embeddingService.isForceOfflineSimulation();
        boolean isOnlineNeural = embeddingService.isOnlineNeuralActive();

        status.put("forcedOfflineSimulation", isForcedOffline);
        status.put("onlineNeuralActive", isOnlineNeural);
        status.put("activeEngineDescription", embeddingService.getActiveEngineDescription());
        status.put("vectorDimensions", EmbeddingService.EMBEDDING_DIM);
        status.put("modelName", isOnlineNeural ? "openai/text-embedding-3-small" : "unsupervised-feature-hashing");
        status.put("statusLabel", isForcedOffline
                ? "Chế Độ Test Offline (Tắt API Key)"
                : (isOnlineNeural ? "Neural AI Trực Tuyến (Online Mode)" : "Cục Bộ Unsupervised Hashing"));
        return status;
    }
}
