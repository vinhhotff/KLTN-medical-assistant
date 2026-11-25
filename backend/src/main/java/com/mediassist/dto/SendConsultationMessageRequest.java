package com.mediassist.dto;

import com.mediassist.model.entity.ConsultationMessageType;
import jakarta.validation.constraints.Size;

public class SendConsultationMessageRequest {

    private ConsultationMessageType messageType = ConsultationMessageType.TEXT;

    @Size(max = 4000, message = "Nội dung tin nhắn không được vượt quá 4000 ký tự")
    private String content;

    @Size(max = 1000, message = "Đường dẫn đính kèm không được vượt quá 1000 ký tự")
    private String attachmentUrl;

    public SendConsultationMessageRequest() {}

    public SendConsultationMessageRequest(ConsultationMessageType messageType, String content, String attachmentUrl) {
        this.messageType = messageType != null ? messageType : ConsultationMessageType.TEXT;
        this.content = content;
        this.attachmentUrl = attachmentUrl;
    }

    public ConsultationMessageType getMessageType() {
        return messageType != null ? messageType : ConsultationMessageType.TEXT;
    }
    public void setMessageType(ConsultationMessageType messageType) {
        this.messageType = messageType != null ? messageType : ConsultationMessageType.TEXT;
    }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
}
