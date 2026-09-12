package com.mediassist.ai;

public interface AiProvider {

    String getProviderName();

    boolean isAvailable();

    ClinicalAiResult generateClinicalAnalysis(String systemPrompt, String userPrompt, String modelId);

    ClinicalAiResult generateTriageAnalysis(String systemPrompt, String userPrompt, String modelId);
}
