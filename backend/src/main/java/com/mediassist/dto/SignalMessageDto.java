package com.mediassist.dto;

import java.util.UUID;

public class SignalMessageDto {

    private String id;
    private UUID appointmentId;
    private String type; // JOIN, LEAVE, OFFER, ANSWER, ICE_CANDIDATE, MEDIA_STATE, CALL_END, ROOM_STATUS
    private UUID senderId;
    private String senderRole;
    private String senderName;
    private String sdp;
    private Object candidate;
    private Object payload;
    private Boolean audioEnabled;
    private Boolean videoEnabled;
    private Long timestamp;

    public SignalMessageDto() {}

    public SignalMessageDto(String id, UUID appointmentId, String type, UUID senderId, String senderRole,
                            String senderName, String sdp, Object candidate, Object payload,
                            Boolean audioEnabled, Boolean videoEnabled, Long timestamp) {
        this.id = id;
        this.appointmentId = appointmentId;
        this.type = type;
        this.senderId = senderId;
        this.senderRole = senderRole;
        this.senderName = senderName;
        this.sdp = sdp;
        this.candidate = candidate;
        this.payload = payload;
        this.audioEnabled = audioEnabled;
        this.videoEnabled = videoEnabled;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public UUID getAppointmentId() { return appointmentId; }
    public void setAppointmentId(UUID appointmentId) { this.appointmentId = appointmentId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }

    public String getSenderRole() { return senderRole; }
    public void setSenderRole(String senderRole) { this.senderRole = senderRole; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSdp() { return sdp; }
    public void setSdp(String sdp) { this.sdp = sdp; }

    public Object getCandidate() { return candidate; }
    public void setCandidate(Object candidate) { this.candidate = candidate; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }

    public Boolean getAudioEnabled() { return audioEnabled; }
    public void setAudioEnabled(Boolean audioEnabled) { this.audioEnabled = audioEnabled; }

    public Boolean getVideoEnabled() { return videoEnabled; }
    public void setVideoEnabled(Boolean videoEnabled) { this.videoEnabled = videoEnabled; }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
