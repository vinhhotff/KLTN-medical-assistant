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

    // Dynamic Clinical Metadata extracted from document
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
    private List<String> piiMaskedTypes;

    // Multi-File Batch Metadata
    private int filesCount = 1;
    private List<String> fileNames = new java.util.ArrayList<>();

    public DocumentAnalysisResponse() {}

    public int getFilesCount() { return filesCount; }
    public void setFilesCount(int filesCount) { this.filesCount = filesCount; }

    public List<String> getFileNames() { return fileNames; }
    public void setFileNames(List<String> fileNames) { this.fileNames = fileNames != null ? fileNames : new java.util.ArrayList<>(); }

    public boolean isPiiProtected() { return piiProtected; }
    public void setPiiProtected(boolean piiProtected) { this.piiProtected = piiProtected; }

    public int getPiiEntitiesCount() { return piiEntitiesCount; }
    public void setPiiEntitiesCount(int piiEntitiesCount) { this.piiEntitiesCount = piiEntitiesCount; }

    public List<String> getPiiMaskedTypes() { return piiMaskedTypes; }
    public void setPiiMaskedTypes(List<String> piiMaskedTypes) { this.piiMaskedTypes = piiMaskedTypes; }

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
