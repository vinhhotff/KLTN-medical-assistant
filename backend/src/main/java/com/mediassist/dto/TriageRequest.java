package com.mediassist.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class TriageRequest {

    @NotBlank(message = "Mô tả triệu chứng không được để trống")
    @jakarta.validation.constraints.Size(min = 3, max = 2000, message = "Triệu chứng phải từ 3 đến 2000 ký tự")
    private String symptoms;

    private List<String> conversationHistory;

    public TriageRequest() {}

    public TriageRequest(String symptoms, List<String> conversationHistory) {
        this.symptoms = symptoms;
        this.conversationHistory = conversationHistory;
    }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public List<String> getConversationHistory() { return conversationHistory; }
    public void setConversationHistory(List<String> conversationHistory) { this.conversationHistory = conversationHistory; }
}
