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
    private GeminiAiProvider geminiAiProvider;

    @Mock
    private OpenRouterAiProvider openRouterAiProvider;

    @Mock
    private DeterministicFallbackAiProvider deterministicFallbackAiProvider;

    private AiModelRouter aiModelRouter;

    @BeforeEach
    void setUp() {
        aiModelRouter = new AiModelRouter(geminiAiProvider, openRouterAiProvider, deterministicFallbackAiProvider);
        ReflectionTestUtils.setField(aiModelRouter, "configuredModels", "google/gemini-2.0-flash-exp:free,meta-llama/llama-3.3-70b-instruct:free");
    }

    @Test
    @DisplayName("Should prioritize Gemini Flash when available (Priority 1)")
    void shouldPrioritizeGeminiFlashWhenAvailable() {
        when(geminiAiProvider.isAvailable()).thenReturn(true);

        ClinicalAiResult geminiResult = new ClinicalAiResult();
        geminiResult.setClinicalSummary("Gemini 1.5 Flash Summary");
        geminiResult.setModelUsed("gemini-1.5-flash (Google Direct)");
        when(geminiAiProvider.generateClinicalAnalysis(anyString(), anyString(), isNull()))
                .thenReturn(geminiResult);

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis("sysPrompt", "userPrompt");

        assertThat(result).isNotNull();
        assertThat(result.getModelUsed()).contains("Google Direct");
        verify(geminiAiProvider).generateClinicalAnalysis(anyString(), anyString(), isNull());
        verify(openRouterAiProvider, never()).generateClinicalAnalysis(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Should use Deterministic fallback when OpenRouter and Gemini are not available")
    void shouldUseFallbackWhenOpenRouterUnavailable() {
        when(geminiAiProvider.isAvailable()).thenReturn(false);
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
    @DisplayName("Should rotate to OpenRouter when Gemini Flash returns 429 Rate Limit")
    void shouldRotateFromGeminiToOpenRouterOnRateLimit() {
        when(geminiAiProvider.isAvailable()).thenReturn(true);
        when(geminiAiProvider.generateClinicalAnalysis(anyString(), anyString(), isNull()))
                .thenThrow(new AiProviderOverloadedException("Google Gemini", "gemini-1.5-flash", 429, "Rate limit"));

        when(openRouterAiProvider.isAvailable()).thenReturn(true);
        ClinicalAiResult openRouterResult = new ClinicalAiResult();
        openRouterResult.setClinicalSummary("Summary from OpenRouter fallback");
        openRouterResult.setModelUsed("google/gemini-2.0-flash-exp:free (OpenRouter)");
        when(openRouterAiProvider.generateClinicalAnalysis(anyString(), anyString(), eq("google/gemini-2.0-flash-exp:free")))
                .thenReturn(openRouterResult);

        ClinicalAiResult result = aiModelRouter.routeClinicalAnalysis("sysPrompt", "userPrompt");

        assertThat(result).isNotNull();
        assertThat(result.getModelUsed()).contains("OpenRouter");
        verify(geminiAiProvider).generateClinicalAnalysis(anyString(), anyString(), isNull());
        verify(openRouterAiProvider).generateClinicalAnalysis(anyString(), anyString(), eq("google/gemini-2.0-flash-exp:free"));
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
