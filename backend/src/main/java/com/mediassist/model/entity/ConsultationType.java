package com.mediassist.model.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ConsultationType {
    IN_PERSON,
    ONLINE;

    @JsonCreator
    public static ConsultationType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if ("OFFLINE".equals(normalized) || "IN-PERSON".equals(normalized)) {
            return IN_PERSON;
        }
        return ConsultationType.valueOf(normalized);
    }
}
