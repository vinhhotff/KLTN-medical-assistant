package com.mediassist.dto;

import java.util.*;

public class DeidentificationResult {
    private String originalText;
    private String maskedText;
    private String meddiesTaggedText;
    private List<PiiEntityDto> entities = new ArrayList<>();
    private Map<String, String> tokenToOriginalMap = new LinkedHashMap<>();
    private List<String> maskedTypes = new ArrayList<>();

    public DeidentificationResult() {}

    public DeidentificationResult(String originalText, String maskedText, String meddiesTaggedText,
                                  List<PiiEntityDto> entities, Map<String, String> tokenToOriginalMap) {
        this.originalText = originalText;
        this.maskedText = maskedText;
        this.meddiesTaggedText = meddiesTaggedText;
        this.entities = entities != null ? entities : new ArrayList<>();
        this.tokenToOriginalMap = tokenToOriginalMap != null ? tokenToOriginalMap : new LinkedHashMap<>();
        if (this.entities != null) {
            this.maskedTypes = this.entities.stream()
                    .map(e -> e.getType().name())
                    .distinct()
                    .toList();
        }
    }

    public int getPiiEntitiesCount() {
        return entities != null ? entities.size() : 0;
    }

    public boolean isPiiProtected() {
        return entities != null && !entities.isEmpty();
    }

    public String reidentify(String textWithTokens) {
        if (textWithTokens == null || tokenToOriginalMap == null || tokenToOriginalMap.isEmpty()) {
            return textWithTokens;
        }
        String result = textWithTokens;
        for (Map.Entry<String, String> entry : tokenToOriginalMap.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        return result;
    }

    public String getOriginalText() {
        return originalText;
    }

    public void setOriginalText(String originalText) {
        this.originalText = originalText;
    }

    public String getMaskedText() {
        return maskedText;
    }

    public void setMaskedText(String maskedText) {
        this.maskedText = maskedText;
    }

    public String getMeddiesTaggedText() {
        return meddiesTaggedText;
    }

    public void setMeddiesTaggedText(String meddiesTaggedText) {
        this.meddiesTaggedText = meddiesTaggedText;
    }

    public List<PiiEntityDto> getEntities() {
        return entities;
    }

    public void setEntities(List<PiiEntityDto> entities) {
        this.entities = entities;
    }

    public Map<String, String> getTokenToOriginalMap() {
        return tokenToOriginalMap;
    }

    public void setTokenToOriginalMap(Map<String, String> tokenToOriginalMap) {
        this.tokenToOriginalMap = tokenToOriginalMap;
    }

    public List<String> getMaskedTypes() {
        return maskedTypes;
    }

    public void setMaskedTypes(List<String> maskedTypes) {
        this.maskedTypes = maskedTypes;
    }
}
