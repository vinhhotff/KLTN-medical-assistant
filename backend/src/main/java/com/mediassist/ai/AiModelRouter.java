package com.mediassist.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AiModelRouter {

    private static final Logger log = LoggerFactory.getLogger(AiModelRouter.class);

    private final GeminiAiProvider geminiAiProvider;
    private final OpenRouterAiProvider openRouterAiProvider;
    private final DeterministicFallbackAiProvider deterministicFallbackAiProvider;

    @Value("${app.ai.openrouter.models:inclusionai/ling-3.0-flash-sante:free,nex-agi/nex-n2.5-mini:free,openrouter/free,liquid/lfm-2.5-2.6b:free,inclusionai/ling-3.0-flash-vl:free}")
    private String configuredModels;

    public AiModelRouter(GeminiAiProvider geminiAiProvider,
                         OpenRouterAiProvider openRouterAiProvider,
                         DeterministicFallbackAiProvider deterministicFallbackAiProvider) {
        this.geminiAiProvider = geminiAiProvider;
        this.openRouterAiProvider = openRouterAiProvider;
        this.deterministicFallbackAiProvider = deterministicFallbackAiProvider;
    }

    public List<String> getModelRotationPool() {
        if (configuredModels == null || configuredModels.isBlank()) {
            return List.of("inclusionai/ling-3.0-flash-sante:free", "nex-agi/nex-n2.5-mini:free", "openrouter/free");
        }
        return Arrays.stream(configuredModels.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    public boolean canProcessVision() {
        return (geminiAiProvider != null && geminiAiProvider.isAvailable())
                || (openRouterAiProvider != null && openRouterAiProvider.isAvailable());
    }

    public String extractTextWithVision(byte[] imageBytes, String contentType, String fileName) {
        // Priority 1: Google Gemini Flash Vision
        if (geminiAiProvider != null && geminiAiProvider.isAvailable()) {
            try {
                log.info("🌟 [PRIORITY 1 - VISION] Routing OCR to Google Gemini Flash...");
                String ocrResult = geminiAiProvider.extractTextWithVision(imageBytes, contentType, fileName);
                if (ocrResult != null && !ocrResult.isBlank()) {
                    return ocrResult;
                }
            } catch (Exception e) {
                log.warn("Gemini Vision failed for {}: {}. Falling back to OpenRouter vision models...", fileName, e.getMessage());
            }
        }

        // Priority 2: OpenRouter Vision Fallback Pool
        if (openRouterAiProvider != null && openRouterAiProvider.isAvailable()) {
            return openRouterAiProvider.extractTextWithVision(imageBytes, contentType, fileName);
        }

        return "";
    }

    public ClinicalAiResult routeClinicalAnalysis(String systemPrompt, String userPrompt) {
        // Priority 1: Google Gemini Flash (Direct REST, Vietnamese medical leader)
        if (geminiAiProvider != null && geminiAiProvider.isAvailable()) {
            try {
                log.info("🌟 [PRIORITY 1 - CLINICAL] Routing analysis to Google Gemini Flash...");
                ClinicalAiResult result = geminiAiProvider.generateClinicalAnalysis(systemPrompt, userPrompt, null);
                log.info("✅ Google Gemini successfully generated clinical analysis");
                return result;
            } catch (AiProviderOverloadedException e) {
                log.warn("Google Gemini 429 rate limit. Rotating to OpenRouter fallback pool...");
            } catch (Exception e) {
                log.warn("Google Gemini failed: {}. Rotating to OpenRouter fallback pool...", e.getMessage());
            }
        }

        // Priority 2: OpenRouter Free Models Pool
        List<String> pool = getModelRotationPool();
        if (openRouterAiProvider != null && openRouterAiProvider.isAvailable()) {
            for (String modelId : pool) {
                try {
                    log.info("Routing to OpenRouter free model: '{}'...", modelId);
                    ClinicalAiResult result = openRouterAiProvider.generateClinicalAnalysis(systemPrompt, userPrompt, modelId);
                    log.info("Successfully processed by model '{}'", modelId);
                    return result;
                } catch (AiProviderOverloadedException e) {
                    log.warn("Model '{}' rate limited (HTTP {}). Rotating to next model in pool...",
                            modelId, e.getStatusCode());
                } catch (Exception e) {
                    log.warn("Model '{}' error: {}. Rotating to next model in pool...",
                            modelId, e.getMessage());
                }
            }
            log.warn("All remote OpenRouter models exhausted or rate-limited. Falling back to safe offline engine.");
        } else {
            log.info("Remote AI providers not configured. Using Local Deterministic Safe Engine (0đ cost).");
        }

        // Priority 3: Local Deterministic Fallback
        return deterministicFallbackAiProvider.generateClinicalAnalysis(systemPrompt, userPrompt, "deterministic-offline");
    }

    public ClinicalAiResult routeTriageAnalysis(String systemPrompt, String userPrompt) {
        // Priority 1: Google Gemini Flash
        if (geminiAiProvider != null && geminiAiProvider.isAvailable()) {
            try {
                log.info("🌟 [PRIORITY 1 - TRIAGE] Routing triage to Google Gemini Flash...");
                return geminiAiProvider.generateTriageAnalysis(systemPrompt, userPrompt, null);
            } catch (Exception e) {
                log.warn("Google Gemini Triage failed: {}. Rotating to OpenRouter...", e.getMessage());
            }
        }

        // Priority 2: OpenRouter Free Models Pool
        List<String> pool = getModelRotationPool();
        if (openRouterAiProvider != null && openRouterAiProvider.isAvailable()) {
            for (String modelId : pool) {
                try {
                    log.info("Routing Triage to model: '{}'...", modelId);
                    return openRouterAiProvider.generateTriageAnalysis(systemPrompt, userPrompt, modelId);
                } catch (Exception e) {
                    log.warn("Model '{}' failed in Triage: {}. Rotating...", modelId, e.getMessage());
                }
            }
        }

        // Priority 3: Local Deterministic Fallback
        return deterministicFallbackAiProvider.generateTriageAnalysis(systemPrompt, userPrompt, "deterministic-offline");
    }
}
