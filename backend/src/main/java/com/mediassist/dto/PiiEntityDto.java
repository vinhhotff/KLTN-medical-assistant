package com.mediassist.dto;

public class PiiEntityDto {
    private PiiType type;
    private String originalValue;
    private String maskedToken;
    private String meddiesTag;
    private int startIndex;
    private int endIndex;

    public PiiEntityDto() {}

    public PiiEntityDto(PiiType type, String originalValue, String maskedToken, String meddiesTag, int startIndex, int endIndex) {
        this.type = type;
        this.originalValue = originalValue;
        this.maskedToken = maskedToken;
        this.meddiesTag = meddiesTag;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
    }

    public PiiType getType() {
        return type;
    }

    public void setType(PiiType type) {
        this.type = type;
    }

    public String getOriginalValue() {
        return originalValue;
    }

    public void setOriginalValue(String originalValue) {
        this.originalValue = originalValue;
    }

    public String getMaskedToken() {
        return maskedToken;
    }

    public void setMaskedToken(String maskedToken) {
        this.maskedToken = maskedToken;
    }

    public String getMeddiesTag() {
        return meddiesTag;
    }

    public void setMeddiesTag(String meddiesTag) {
        this.meddiesTag = meddiesTag;
    }

    public int getStartIndex() {
        return startIndex;
    }

    public void setStartIndex(int startIndex) {
        this.startIndex = startIndex;
    }

    public int getEndIndex() {
        return endIndex;
    }

    public void setEndIndex(int endIndex) {
        this.endIndex = endIndex;
    }
}
