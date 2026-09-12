package com.mediassist.dto;

import com.mediassist.model.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateUserStatusRequest {

    @NotNull(message = "Trạng thái người dùng không được để trống")
    private UserStatus status;

    private String reason;

    public UpdateUserStatusRequest() {}

    public UpdateUserStatusRequest(UserStatus status, String reason) {
        this.status = status;
        this.reason = reason;
    }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
