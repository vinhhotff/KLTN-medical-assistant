package com.mediassist.dto;

/**
 * Ket qua kiem tra lien ket mot lan (dat lai mat khau) con hieu luc hay khong.
 */
public class TokenValidationResponse {

    private boolean valid;

    public TokenValidationResponse() {}

    public TokenValidationResponse(boolean valid) {
        this.valid = valid;
    }

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
}
