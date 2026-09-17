package com.mediassist.dto;

import java.util.ArrayList;
import java.util.List;

public class DocumentPatientAnalysisDto {

    private String sourceFileName;
    private String patientName;
    private String patientAge;
    private String patientGender;
    private String hospitalName;
    private String departmentName;
    private String orderingDoctor;
    private String testDate;
    private String sidCode;
    private String deviceModel;

    private String clinicalSummary;
    private String plainLanguageExplanation;
    private List<AbnormalIndicatorDto> indicators = new ArrayList<>();
    private String recommendedSpecialtySlug;
    private String recommendedSpecialtyName;
    private String doctorRecommendationReason;
    private List<DoctorMatchDto> matchedDoctors = new ArrayList<>();
    private List<String> suggestedQuestions = new ArrayList<>();

    public DocumentPatientAnalysisDto() {}

    public String getSourceFileName() { return sourceFileName; }
    public void setSourceFileName(String sourceFileName) { this.sourceFileName = sourceFileName; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientAge() { return patientAge; }
    public void setPatientAge(String patientAge) { this.patientAge = patientAge; }

    public String getPatientGender() { return patientGender; }
    public void setPatientGender(String patientGender) { this.patientGender = patientGender; }

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

    public String getDeviceModel() { return deviceModel; }
    public void setDeviceModel(String deviceModel) { this.deviceModel = deviceModel; }

    public String getClinicalSummary() { return clinicalSummary; }
    public void setClinicalSummary(String clinicalSummary) { this.clinicalSummary = clinicalSummary; }

    public String getPlainLanguageExplanation() { return plainLanguageExplanation; }
    public void setPlainLanguageExplanation(String plainLanguageExplanation) { this.plainLanguageExplanation = plainLanguageExplanation; }

    public List<AbnormalIndicatorDto> getIndicators() { return indicators; }
    public void setIndicators(List<AbnormalIndicatorDto> indicators) {
        this.indicators = indicators != null ? indicators : new ArrayList<>();
    }

    public String getRecommendedSpecialtySlug() { return recommendedSpecialtySlug; }
    public void setRecommendedSpecialtySlug(String recommendedSpecialtySlug) { this.recommendedSpecialtySlug = recommendedSpecialtySlug; }

    public String getRecommendedSpecialtyName() { return recommendedSpecialtyName; }
    public void setRecommendedSpecialtyName(String recommendedSpecialtyName) { this.recommendedSpecialtyName = recommendedSpecialtyName; }

    public String getDoctorRecommendationReason() { return doctorRecommendationReason; }
    public void setDoctorRecommendationReason(String doctorRecommendationReason) { this.doctorRecommendationReason = doctorRecommendationReason; }

    public List<DoctorMatchDto> getMatchedDoctors() { return matchedDoctors; }
    public void setMatchedDoctors(List<DoctorMatchDto> matchedDoctors) {
        this.matchedDoctors = matchedDoctors != null ? matchedDoctors : new ArrayList<>();
    }

    public List<String> getSuggestedQuestions() { return suggestedQuestions; }
    public void setSuggestedQuestions(List<String> suggestedQuestions) {
        this.suggestedQuestions = suggestedQuestions != null ? suggestedQuestions : new ArrayList<>();
    }
}
