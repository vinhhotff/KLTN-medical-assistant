package com.mediassist.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AiModelRouter {

    private static final Logger log = LoggerFactory.getLogger(AiModelRouter.class);

    private final OpenRouterAiProvider openRouterAiProvider;
    private final DeterministicFallbackAiProvider deterministicFallbackAiProvider;

    @Value("${app.ai.openrouter.models:google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free,deepseek/deepseek-r1:free,qwen/qwen-2.5-72b-instruct:free}")
    private String configuredModels;

    public AiModelRouter(OpenRouterAiProvider openRouterAiProvider,
                          DeterministicFallbackAiProvider deterministicFallbackAiProvider) {
        this.openRouterAiProvider = openRouterAiProvider;
        this.deterministicFallbackAiProvider = deterministicFallbackAiProvider;
    }

    public List<String> getModelRotationPool() {
        if (configuredModels == null || configuredModels.isBlank()) {
            return List.of("google/gemini-2.0-flash-exp:free", "meta-llama/llama-3.3-70b-instruct:free");
        }
        return Arrays.stream(configuredModels.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    public ClinicalAiResult routeClinicalAnalysis(String systemPrompt, String userPrompt) {
        List<String> pool = getModelRotationPool();

        if (openRouterAiProvider.isAvailable()) {
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
            log.info("OpenRouter API key not configured. Using Local Deterministic Safe Engine (0đ cost).");
        }

        return deterministicFallbackAiProvider.generateClinicalAnalysis(systemPrompt, userPrompt, "deterministic-offline");
    }

    public ClinicalAiResult routeTriageAnalysis(String systemPrompt, String userPrompt) {
        List<String> pool = getModelRotationPool();

        if (openRouterAiProvider.isAvailable()) {
            for (String modelId : pool) {
                try {
                    log.info("Routing Triage to model: '{}'...", modelId);
                    return openRouterAiProvider.generateTriageAnalysis(systemPrompt, userPrompt, modelId);
                } catch (Exception e) {
                    log.warn("Model '{}' failed in Triage: {}. Rotating...", modelId, e.getMessage());
                }
            }
        }

        return deterministicFallbackAiProvider.generateTriageAnalysis(systemPrompt, userPrompt, "deterministic-offline");
    }
}
