package com.mediassist.dto;

public enum PiiType {
    HUMAN_NAME("human_name", "[BỆNH_NHÂN_%d]"),
    ID_NUMBER("id_number", "[SỐ_ĐỊNH_DANH_%d]"),
    PHONE_NUMBER("phone_number", "[SĐT_%d]"),
    ADDRESS("address", "[ĐỊA_CHỈ_%d]"),
    DATE_OF_BIRTH("date", "[NGÀY_SINH_%d]"),
    EMAIL("email", "[EMAIL_%d]");

    private final String meddiesLabel;
    private final String tokenPattern;

    PiiType(String meddiesLabel, String tokenPattern) {
        this.meddiesLabel = meddiesLabel;
        this.tokenPattern = tokenPattern;
    }

    public String getMeddiesLabel() {
        return meddiesLabel;
    }

    public String formatToken(int index) {
        return String.format(tokenPattern, index);
    }
}
