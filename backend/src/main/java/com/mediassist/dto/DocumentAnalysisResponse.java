package com.mediassist.dto;

import java.util.List;
import java.util.UUID;

public class DocumentAnalysisResponse {

    private UUID documentId;
    private String fileName;
    private long fileSizeBytes;
    private String contentType;
    private String clinicalSummary;
    private String plainLanguageExplanation;
    private List<AbnormalIndicatorDto> indicators;
    private String recommendedSpecialtySlug;
    private String recommendedSpecialtyName;
    private List<String> suggestedQuestions;
    private List<DoctorMatchDto> matchedDoctors;
    private String storageUrl;
    private boolean cachedResult;
    private String modelUsed;
    private String doctorRecommendationReason;

    public DocumentAnalysisResponse() {}

    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getClinicalSummary() { return clinicalSummary; }
    public void setClinicalSummary(String clinicalSummary) { this.clinicalSummary = clinicalSummary; }

    public String getPlainLanguageExplanation() { return plainLanguageExplanation; }
    public void setPlainLanguageExplanation(String plainLanguageExplanation) { this.plainLanguageExplanation = plainLanguageExplanation; }

    public List<AbnormalIndicatorDto> getIndicators() { return indicators; }
    public void setIndicators(List<AbnormalIndicatorDto> indicators) { this.indicators = indicators; }

    public String getRecommendedSpecialtySlug() { return recommendedSpecialtySlug; }
    public void setRecommendedSpecialtySlug(String recommendedSpecialtySlug) { this.recommendedSpecialtySlug = recommendedSpecialtySlug; }

    public String getRecommendedSpecialtyName() { return recommendedSpecialtyName; }
    public void setRecommendedSpecialtyName(String recommendedSpecialtyName) { this.recommendedSpecialtyName = recommendedSpecialtyName; }

    public List<String> getSuggestedQuestions() { return suggestedQuestions; }
    public void setSuggestedQuestions(List<String> suggestedQuestions) { this.suggestedQuestions = suggestedQuestions; }

    public List<DoctorMatchDto> getMatchedDoctors() { return matchedDoctors; }
    public void setMatchedDoctors(List<DoctorMatchDto> matchedDoctors) { this.matchedDoctors = matchedDoctors; }

    public String getStorageUrl() { return storageUrl; }
    public void setStorageUrl(String storageUrl) { this.storageUrl = storageUrl; }

    public boolean isCachedResult() { return cachedResult; }
    public void setCachedResult(boolean cachedResult) { this.cachedResult = cachedResult; }

    public String getModelUsed() { return modelUsed; }
    public void setModelUsed(String modelUsed) { this.modelUsed = modelUsed; }

    public String getDoctorRecommendationReason() { return doctorRecommendationReason; }
    public void setDoctorRecommendationReason(String doctorRecommendationReason) { this.doctorRecommendationReason = doctorRecommendationReason; }
}
