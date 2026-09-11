package com.mediassist.dto;

import jakarta.validation.constraints.NotNull;

public class VetDoctorRequest {

    @NotNull(message = "Approval decision is required")
    private Boolean approve;

    private String rejectionReason;

    public VetDoctorRequest() {}

    public VetDoctorRequest(Boolean approve, String rejectionReason) {
        this.approve = approve;
        this.rejectionReason = rejectionReason;
    }

    public Boolean getApprove() { return approve; }
    public void setApprove(Boolean approve) { this.approve = approve; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
}
