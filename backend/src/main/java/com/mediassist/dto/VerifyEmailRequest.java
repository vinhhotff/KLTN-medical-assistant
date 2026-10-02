package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;

public class VerifyEmailRequest {

    @NotBlank(message = "Mã xác thực không được để trống")
    private String token;

    public VerifyEmailRequest() {}

    public VerifyEmailRequest(String token) {
        this.token = token;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
