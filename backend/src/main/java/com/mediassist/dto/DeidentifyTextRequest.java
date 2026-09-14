package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;

public class DeidentifyTextRequest {

    @NotBlank(message = "Văn bản y tế không được để trống")
    private String text;

    public DeidentifyTextRequest() {}

    public DeidentifyTextRequest(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
