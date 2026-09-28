package com.mediassist.dto;

import com.mediassist.model.entity.DoctorReview;

import java.time.LocalDateTime;
import java.util.UUID;

public class DoctorReviewDto {

    private UUID id;
    private UUID appointmentId;
    private String appointmentCode;
    private UUID doctorId;
    private String doctorName;
    private UUID patientId;
    private String patientName;
    private Integer rating;
    private String comment;
    private String tags;
    private LocalDateTime createdAt;

    public DoctorReviewDto() {}

    public static DoctorReviewDto fromEntity(DoctorReview review) {
        DoctorReviewDto dto = new DoctorReviewDto();
        dto.setId(review.getId());
        if (review.getAppointment() != null) {
            dto.setAppointmentId(review.getAppointment().getId());
            dto.setAppointmentCode(review.getAppointment().getAppointmentCode());
        }
        if (review.getDoctor() != null) {
            dto.setDoctorId(review.getDoctor().getId());
            dto.setDoctorName(review.getDoctor().getFullName());
        }
        if (review.getPatient() != null) {
            dto.setPatientId(review.getPatient().getId());
            dto.setPatientName(anonymizePatientName(review.getPatient().getFullName()));
        }
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setTags(review.getTags());
        dto.setCreatedAt(review.getCreatedAt());
        return dto;
    }

    private static String anonymizePatientName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "Bệnh nhân ẩn danh";
        String[] parts = fullName.trim().split("\\s+");
        if (parts.length <= 1) return fullName;
        StringBuilder sb = new StringBuilder();
        sb.append(parts[0]); // Họ (e.g. "Nguyễn")
        for (int i = 1; i < parts.length - 1; i++) {
            sb.append(" ").append(parts[i].charAt(0)).append(".");
        }
        sb.append(" ").append(parts[parts.length - 1]); // Tên (e.g. "Bình" -> "Nguyễn V. Bình")
        return sb.toString();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getAppointmentId() { return appointmentId; }
    public void setAppointmentId(UUID appointmentId) { this.appointmentId = appointmentId; }

    public String getAppointmentCode() { return appointmentCode; }
    public void setAppointmentCode(String appointmentCode) { this.appointmentCode = appointmentCode; }

    public UUID getDoctorId() { return doctorId; }
    public void setDoctorId(UUID doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public UUID getPatientId() { return patientId; }
    public void setPatientId(UUID patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
