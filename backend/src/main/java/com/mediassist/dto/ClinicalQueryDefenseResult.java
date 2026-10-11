package com.mediassist.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Encapsulates the multi-stage analysis performed by ClinicalQueryDefenseEngine.
 * Contains sanitized query text, detected negations, red-flag emergency status,
 * and out-of-domain classification.
 */
public class ClinicalQueryDefenseResult {

    private String rawQuery;
    private String sanitizedQuery;
    private String optimizedClinicalQuery;

    private boolean emergencyRedFlag;
    private String emergencyWarning;

    private boolean outOfDomain;
    private String oodGuidance;

    private List<String> affirmedSymptoms = new ArrayList<>();
    private List<String> negatedSymptoms = new ArrayList<>();
    private List<String> subQueries = new ArrayList<>();

    public ClinicalQueryDefenseResult() {}

    public ClinicalQueryDefenseResult(String rawQuery) {
        this.rawQuery = rawQuery;
        this.sanitizedQuery = rawQuery != null ? rawQuery.trim() : "";
        this.optimizedClinicalQuery = this.sanitizedQuery;
    }

    public String getRawQuery() { return rawQuery; }
    public void setRawQuery(String rawQuery) { this.rawQuery = rawQuery; }

    public String getSanitizedQuery() { return sanitizedQuery; }
    public void setSanitizedQuery(String sanitizedQuery) { this.sanitizedQuery = sanitizedQuery; }

    public String getOptimizedClinicalQuery() { return optimizedClinicalQuery; }
    public void setOptimizedClinicalQuery(String optimizedClinicalQuery) { this.optimizedClinicalQuery = optimizedClinicalQuery; }

    public boolean isEmergencyRedFlag() { return emergencyRedFlag; }
    public void setEmergencyRedFlag(boolean emergencyRedFlag) { this.emergencyRedFlag = emergencyRedFlag; }

    public String getEmergencyWarning() { return emergencyWarning; }
    public void setEmergencyWarning(String emergencyWarning) { this.emergencyWarning = emergencyWarning; }

    public boolean isOutOfDomain() { return outOfDomain; }
    public void setOutOfDomain(boolean outOfDomain) { this.outOfDomain = outOfDomain; }

    public String getOodGuidance() { return oodGuidance; }
    public void setOodGuidance(String oodGuidance) { this.oodGuidance = oodGuidance; }

    public List<String> getAffirmedSymptoms() { return affirmedSymptoms; }
    public void setAffirmedSymptoms(List<String> affirmedSymptoms) { this.affirmedSymptoms = affirmedSymptoms; }

    public List<String> getNegatedSymptoms() { return negatedSymptoms; }
    public void setNegatedSymptoms(List<String> negatedSymptoms) { this.negatedSymptoms = negatedSymptoms; }

    public List<String> getSubQueries() { return subQueries; }
    public void setSubQueries(List<String> subQueries) { this.subQueries = subQueries; }
}
