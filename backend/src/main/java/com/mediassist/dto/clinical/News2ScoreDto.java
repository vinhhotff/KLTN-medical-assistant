package com.mediassist.dto.clinical;

import java.util.Map;

/**
 * Standardized Royal College of Physicians (RCP) National Early Warning Score 2 (NEWS-2) Result.
 * Scores physiological parameters to detect acutely ill and deteriorating patients.
 */
public class News2ScoreDto {

    private int totalScore;
    private String riskLevel; // "LOW", "MEDIUM", "HIGH"
    private String clinicalGuidance;
    private boolean singleParameterScoreThree;
    private Map<String, Integer> subScores;

    public News2ScoreDto() {}

    public News2ScoreDto(int totalScore, String riskLevel, String clinicalGuidance,
                         boolean singleParameterScoreThree, Map<String, Integer> subScores) {
        this.totalScore = totalScore;
        this.riskLevel = riskLevel;
        this.clinicalGuidance = clinicalGuidance;
        this.singleParameterScoreThree = singleParameterScoreThree;
        this.subScores = subScores;
    }

    public int getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(int totalScore) {
        this.totalScore = totalScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getClinicalGuidance() {
        return clinicalGuidance;
    }

    public void setClinicalGuidance(String clinicalGuidance) {
        this.clinicalGuidance = clinicalGuidance;
    }

    public boolean isSingleParameterScoreThree() {
        return singleParameterScoreThree;
    }

    public void setSingleParameterScoreThree(boolean singleParameterScoreThree) {
        this.singleParameterScoreThree = singleParameterScoreThree;
    }

    public Map<String, Integer> getSubScores() {
        return subScores;
    }

    public void setSubScores(Map<String, Integer> subScores) {
        this.subScores = subScores;
    }
}
