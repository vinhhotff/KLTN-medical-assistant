package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DeidentifyTextRequest {

    @NotBlank(message = "Văn bản y tế không được để trống")
    @Size(max = 20000, message = "Văn bản y tế không được vượt quá 20.000 ký tự")
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
