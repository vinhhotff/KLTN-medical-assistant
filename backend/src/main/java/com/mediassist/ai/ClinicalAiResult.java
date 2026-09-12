package com.mediassist.ai;

import com.mediassist.dto.AbnormalIndicatorDto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ClinicalAiResult {

    private String modelUsed;
    private String provider;
    private String clinicalSummary;
    private String plainLanguageExplanation;
    private List<AbnormalIndicatorDto> indicators = new ArrayList<>();
    private String recommendedSpecialtySlug;
    private String recommendedSpecialtyName;
    private UUID recommendedDoctorId;
    private String doctorRecommendationReason;
    private List<String> suggestedQuestions = new ArrayList<>();
    private String sbarSummary;
    private String aiAdvice;

    public ClinicalAiResult() {}

    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getClinicalSummary() { return clinicalSummary; }
    public void setClinicalSummary(String clinicalSummary) { this.clinicalSummary = clinicalSummary; }

    public String getPlainLanguageExplanation() { return plainLanguageExplanation; }
    public void setPlainLanguageExplanation(String plainLanguageExplanation) { this.plainLanguageExplanation = plainLanguageExplanation; }

    public List<AbnormalIndicatorDto> getIndicators() { return indicators; }
    public void setIndicators(List<AbnormalIndicatorDto> indicators) { this.indicators = indicators != null ? indicators : new ArrayList<>(); }

    public String getRecommendedSpecialtySlug() { return recommendedSpecialtySlug; }
    public void setRecommendedSpecialtySlug(String recommendedSpecialtySlug) { this.recommendedSpecialtySlug = recommendedSpecialtySlug; }

    public String getRecommendedSpecialtyName() { return recommendedSpecialtyName; }
    public void setRecommendedSpecialtyName(String recommendedSpecialtyName) { this.recommendedSpecialtyName = recommendedSpecialtyName; }

    public UUID getRecommendedDoctorId() { return recommendedDoctorId; }
    public void setRecommendedDoctorId(UUID recommendedDoctorId) { this.recommendedDoctorId = recommendedDoctorId; }

    public String getDoctorRecommendationReason() { return doctorRecommendationReason; }
    public void setDoctorRecommendationReason(String doctorRecommendationReason) { this.doctorRecommendationReason = doctorRecommendationReason; }

    public List<String> getSuggestedQuestions() { return suggestedQuestions; }
    public void setSuggestedQuestions(List<String> suggestedQuestions) { this.suggestedQuestions = suggestedQuestions != null ? suggestedQuestions : new ArrayList<>(); }

    public String getSbarSummary() { return sbarSummary; }
    public void setSbarSummary(String sbarSummary) { this.sbarSummary = sbarSummary; }

    public String getAiAdvice() { return aiAdvice; }
    public void setAiAdvice(String aiAdvice) { this.aiAdvice = aiAdvice; }
}
