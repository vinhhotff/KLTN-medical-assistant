package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class TriageRequest {

    @NotBlank(message = "Mô tả triệu chứng không được để trống")
    @jakarta.validation.constraints.Size(min = 3, max = 2000, message = "Triệu chứng phải từ 3 đến 2000 ký tự")
    private String symptoms;

    private List<String> conversationHistory;

    // Optional patient location for Clinical-First Proximity Ranking
    private Double latitude;
    private Double longitude;
    private String location;

    public TriageRequest() {}

    public TriageRequest(String symptoms, List<String> conversationHistory) {
        this.symptoms = symptoms;
        this.conversationHistory = conversationHistory;
    }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public List<String> getConversationHistory() { return conversationHistory; }
    public void setConversationHistory(List<String> conversationHistory) { this.conversationHistory = conversationHistory; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
