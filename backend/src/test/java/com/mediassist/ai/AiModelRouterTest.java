package com.mediassist.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiModelRouterTest {

    @Mock
    private OpenRouterAiProvider openRouterAiProvider;

    @Mock
    private DeterministicFallbackAiProvider deterministicFallbackAiProvider;

    private AiModelRouter aiModelRouter;

    @BeforeEach
    void setUp() {
        aiModelRouter = new AiModelRouter(openRouterAiProvider, deterministicFallbackAiProvider);
        ReflectionTestUtils.setField(aiModelRouter, "configuredModels", "google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free");
    }

    @Test
    @DisplayName("Should use Deterministic fallback when OpenRouter is not available")
    void shouldUseFallbackWhenOpenRouterUnavailable() {
        when(openRouterAiProvider.isAvailable()).thenReturn(false);

        ClinicalAiResult fallbackResult = new ClinicalAiResult();
        fallbackResult.setClinicalSummary("Offline Clinical Summary");
        fallbackResult.setModelUsed("Deterministic-Clinical-Rule-Engine (Offline Safe)");
        when(deterministicFallbackAiProvider.generateClinicalAnalysis(anyString(), anyString(), eq("deterministic-offline")))
                .thenReturn(fallbackResult);

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis("sysPrompt", "userPrompt");

        assertThat(result).isNotNull();
        assertThat(result.getModelUsed()).contains("Deterministic");
        verify(openRouterAiProvider, never()).generateClinicalAnalysis(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Should rotate to second model when first model returns 429 Rate Limit")
    void shouldRotateOnRateLimit() {
        when(openRouterAiProvider.isAvailable()).thenReturn(true);
        when(openRouterAiProvider.generateClinicalAnalysis(anyString(), anyString(), eq("google/gemini-2.0-flash-exp:free")))
                .thenThrow(new AiProviderOverloadedException("OpenRouter", "google/gemini-2.0-flash-exp:free", 429, "Rate limit exceeded"));

        ClinicalAiResult secondModelResult = new ClinicalAiResult();
        secondModelResult.setClinicalSummary("Summary from Llama 3.3");
        secondModelResult.setModelUsed("meta-llama/llama-3.3-70b-instruct:free (OpenRouter)");
        when(openRouterAiProvider.generateClinicalAnalysis(anyString(), anyString(), eq("meta-llama/llama-3.3-70b-instruct:free")))
                .thenReturn(secondModelResult);

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis("sysPrompt", "userPrompt");

        assertThat(result).isNotNull();
        assertThat(result.getModelUsed()).contains("llama-3.3");
        verify(openRouterAiProvider).generateClinicalAnalysis(anyString(), anyString(), eq("google/gemini-2.0-flash-exp:free"));
        verify(openRouterAiProvider).generateClinicalAnalysis(anyString(), anyString(), eq("meta-llama/llama-3.3-70b-instruct:free"));
    }

    @Test
    @DisplayName("Should fall back to Deterministic engine when all remote models fail")
    void shouldFallbackWhenAllRemoteModelsFail() {
        when(openRouterAiProvider.isAvailable()).thenReturn(true);
        when(openRouterAiProvider.generateClinicalAnalysis(anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Connection timeout"));

        ClinicalAiResult fallbackResult = new ClinicalAiResult();
        fallbackResult.setClinicalSummary("Offline Fallback Summary");
        fallbackResult.setModelUsed("Deterministic-Clinical-Rule-Engine (Offline Safe)");
        when(deterministicFallbackAiProvider.generateClinicalAnalysis(anyString(), anyString(), eq("deterministic-offline")))
                .thenReturn(fallbackResult);

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis("sysPrompt", "userPrompt");

        assertThat(result).isNotNull();
        assertThat(result.getModelUsed()).contains("Deterministic");
        verify(deterministicFallbackAiProvider).generateClinicalAnalysis(anyString(), anyString(), eq("deterministic-offline"));
    }
}
