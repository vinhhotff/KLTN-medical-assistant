package com.mediassist.dto;

import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.ConsultationType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ConsultationRoomDto {

    private UUID appointmentId;
    private String appointmentCode;
    private ConsultationType consultationType;
    private AppointmentStatus status;
    private String meetingRoomCode;
    private String meetingUrl;
    private UUID patientId;
    private String patientName;
    private UUID doctorId;
    private String doctorName;
    private LocalDateTime scheduledStart;
    private LocalDateTime scheduledEnd;
    private LocalDateTime checkedInAt;
    private boolean canJoinCall;
    private String wsEndpoint;
    private String sockJsEndpoint;
    private List<IceServerDto> iceServers;
    private List<ParticipantDto> activeParticipants;

    public ConsultationRoomDto() {}

    public UUID getAppointmentId() { return appointmentId; }
    public void setAppointmentId(UUID appointmentId) { this.appointmentId = appointmentId; }

    public String getAppointmentCode() { return appointmentCode; }
    public void setAppointmentCode(String appointmentCode) { this.appointmentCode = appointmentCode; }

    public ConsultationType getConsultationType() { return consultationType; }
    public void setConsultationType(ConsultationType consultationType) { this.consultationType = consultationType; }

    public AppointmentStatus getStatus() { return status; }
    public void setStatus(AppointmentStatus status) { this.status = status; }

    public String getMeetingRoomCode() { return meetingRoomCode; }
    public void setMeetingRoomCode(String meetingRoomCode) { this.meetingRoomCode = meetingRoomCode; }

    public String getMeetingUrl() { return meetingUrl; }
    public void setMeetingUrl(String meetingUrl) { this.meetingUrl = meetingUrl; }

    public UUID getPatientId() { return patientId; }
    public void setPatientId(UUID patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public UUID getDoctorId() { return doctorId; }
    public void setDoctorId(UUID doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public LocalDateTime getScheduledStart() { return scheduledStart; }
    public void setScheduledStart(LocalDateTime scheduledStart) { this.scheduledStart = scheduledStart; }

    public LocalDateTime getScheduledEnd() { return scheduledEnd; }
    public void setScheduledEnd(LocalDateTime scheduledEnd) { this.scheduledEnd = scheduledEnd; }

    public LocalDateTime getCheckedInAt() { return checkedInAt; }
    public void setCheckedInAt(LocalDateTime checkedInAt) { this.checkedInAt = checkedInAt; }

    public boolean isCanJoinCall() { return canJoinCall; }
    public void setCanJoinCall(boolean canJoinCall) { this.canJoinCall = canJoinCall; }

    public String getWsEndpoint() { return wsEndpoint; }
    public void setWsEndpoint(String wsEndpoint) { this.wsEndpoint = wsEndpoint; }

    public String getSockJsEndpoint() { return sockJsEndpoint; }
    public void setSockJsEndpoint(String sockJsEndpoint) { this.sockJsEndpoint = sockJsEndpoint; }

    public List<IceServerDto> getIceServers() { return iceServers; }
    public void setIceServers(List<IceServerDto> iceServers) { this.iceServers = iceServers; }

    public List<ParticipantDto> getActiveParticipants() { return activeParticipants; }
    public void setActiveParticipants(List<ParticipantDto> activeParticipants) { this.activeParticipants = activeParticipants; }

    public static class IceServerDto {
        private List<String> urls;

        public IceServerDto() {}
        public IceServerDto(List<String> urls) { this.urls = urls; }

        public List<String> getUrls() { return urls; }
        public void setUrls(List<String> urls) { this.urls = urls; }
    }

    public static class ParticipantDto {
        private UUID userId;
        private String fullName;
        private String role;
        private LocalDateTime joinedAt;

        public ParticipantDto() {}
        public ParticipantDto(UUID userId, String fullName, String role, LocalDateTime joinedAt) {
            this.userId = userId;
            this.fullName = fullName;
            this.role = role;
            this.joinedAt = joinedAt;
        }

        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public LocalDateTime getJoinedAt() { return joinedAt; }
        public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
    }
}
