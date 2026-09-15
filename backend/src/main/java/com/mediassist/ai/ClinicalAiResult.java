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
    private String urgencyLevel;
    private List<String> clarifyingQuestions = new ArrayList<>();

    // Dynamic Clinical Metadata
    private String hospitalName;
    private String departmentName;
    private String orderingDoctor;
    private String testDate;
    private String sidCode;
    private String patientName;
    private String patientAge;
    private String patientGender;
    private String deviceModel;

    // PII Privacy Safeguard Metadata (Decree 13/2023/ND-CP & HIPAA)
    private boolean piiProtected;
    private int piiEntitiesCount;
    private List<String> piiMaskedTypes = new ArrayList<>();

    // Clinical Scope / Relevance Guard
    private boolean medicalRelated = true;

    public ClinicalAiResult() {}

    public boolean isMedicalRelated() { return medicalRelated; }
    public void setMedicalRelated(boolean medicalRelated) { this.medicalRelated = medicalRelated; }

    public boolean isPiiProtected() { return piiProtected; }
    public void setPiiProtected(boolean piiProtected) { this.piiProtected = piiProtected; }

    public int getPiiEntitiesCount() { return piiEntitiesCount; }
    public void setPiiEntitiesCount(int piiEntitiesCount) { this.piiEntitiesCount = piiEntitiesCount; }

    public List<String> getPiiMaskedTypes() { return piiMaskedTypes; }
    public void setPiiMaskedTypes(List<String> piiMaskedTypes) { this.piiMaskedTypes = piiMaskedTypes != null ? piiMaskedTypes : new ArrayList<>(); }

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

    public String getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(String urgencyLevel) { this.urgencyLevel = urgencyLevel; }

    public List<String> getClarifyingQuestions() { return clarifyingQuestions; }
    public void setClarifyingQuestions(List<String> clarifyingQuestions) { this.clarifyingQuestions = clarifyingQuestions != null ? clarifyingQuestions : new ArrayList<>(); }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public String getOrderingDoctor() { return orderingDoctor; }
    public void setOrderingDoctor(String orderingDoctor) { this.orderingDoctor = orderingDoctor; }

    public String getTestDate() { return testDate; }
    public void setTestDate(String testDate) { this.testDate = testDate; }

    public String getSidCode() { return sidCode; }
    public void setSidCode(String sidCode) { this.sidCode = sidCode; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientAge() { return patientAge; }
    public void setPatientAge(String patientAge) { this.patientAge = patientAge; }

    public String getPatientGender() { return patientGender; }
    public void setPatientGender(String patientGender) { this.patientGender = patientGender; }

    public String getDeviceModel() { return deviceModel; }
    public void setDeviceModel(String deviceModel) { this.deviceModel = deviceModel; }
}
