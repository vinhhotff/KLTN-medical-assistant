package com.mediassist.model.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ConsultationMessageType {
    TEXT,
    IMAGE,
    PRESCRIPTION_NOTE;

    @JsonCreator
    public static ConsultationMessageType fromValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return ConsultationMessageType.valueOf(value.trim().toUpperCase());
    }
}
