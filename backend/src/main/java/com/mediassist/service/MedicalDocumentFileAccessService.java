package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.common.ClientRequestInfo;
import com.mediassist.dto.DocumentFileAccessDto;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.MedicalDocument;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.MedicalDocumentRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Cấp quyền xem tệp y tế gốc (UC-28): kiểm tra quyền theo chủ sở hữu tài liệu → ký signed URL ngắn hạn
 * → ghi AuditLog DOCUMENT_SIGNED_URL_ISSUED cho MỌI role (kể cả bệnh nhân tự xem).
 * Audit chỉ được ghi SAU KHI đã cấp được URL.
 */
@Service
public class MedicalDocumentFileAccessService {

    public static final String ACTION_DOCUMENT_SIGNED_URL_ISSUED = "DOCUMENT_SIGNED_URL_ISSUED";

    private final MedicalDocumentRepository medicalDocumentRepository;
    private final PatientAccessGuard patientAccessGuard;
    private final StorageService storageService;
    private final AuditLogRepository auditLogRepository;

    public MedicalDocumentFileAccessService(MedicalDocumentRepository medicalDocumentRepository,
                                            PatientAccessGuard patientAccessGuard,
                                            StorageService storageService,
                                            AuditLogRepository auditLogRepository) {
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.patientAccessGuard = patientAccessGuard;
        this.storageService = storageService;
        this.auditLogRepository = auditLogRepository;
    }

    /** Tìm tài liệu (404) và kiểm tra quyền theo chủ sở hữu (403 FORBIDDEN_PATIENT_ACCESS). */
    public MedicalDocument loadAuthorizedDocument(User actor, UUID documentId, String resource) {
        MedicalDocument doc = medicalDocumentRepository.findById(documentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy tài liệu y tế."));
        UUID ownerId = doc.getUser() != null ? doc.getUser().getId() : null;
        patientAccessGuard.assertCanAccessPatient(actor.getId(), actor.getRole(), ownerId, resource);
        if (!doc.hasStoredFile()) {
            throw new AppException(HttpStatus.NOT_FOUND, StorageService.ERROR_FILE_NOT_AVAILABLE,
                    "Tài liệu này không có tệp gốc được lưu trữ.");
        }
        return doc;
    }

    /** GET /api/v1/documents/{id}/signed-url */
    public DocumentFileAccessDto issueAccess(User actor, UUID documentId, boolean download) {
        MedicalDocument doc = loadAuthorizedDocument(actor, documentId, "medical_documents/" + documentId + "/signed-url");
        if (doc.isLocalFile()) {
            String url = "/api/v1/documents/" + doc.getId() + "/file" + (download ? "?download=true" : "");
            recordIssued(actor, doc, download, 0, "LOCAL");
            return new DocumentFileAccessDto(url, null, null, doc.getFileName(), doc.getContentType());
        }
        return issueSignedAccess(actor, doc, download);
    }

    /** Ký signed URL cho tài liệu đã được kiểm tra quyền (dùng cho cả /signed-url và redirect /file). */
    public DocumentFileAccessDto issueSignedAccess(User actor, MedicalDocument doc, boolean download) {
        StorageService.SignedUrl signed = storageService.createSignedUrl(doc.getStoragePath(), download, doc.getFileName());
        recordIssued(actor, doc, download, signed.expiresInSeconds(), "SUPABASE");
        return new DocumentFileAccessDto(signed.url(), signed.expiresAt(), signed.expiresInSeconds(),
                doc.getFileName(), doc.getContentType());
    }

    private void recordIssued(User actor, MedicalDocument doc, boolean download, int ttlSeconds, String storage) {
        UUID patientId = doc.getUser() != null ? doc.getUser().getId() : null;
        AuditLog audit = new AuditLog();
        audit.setUserId(actor.getId());
        audit.setAction(ACTION_DOCUMENT_SIGNED_URL_ISSUED);
        audit.setResource("medical_documents/" + doc.getId());
        HttpServletRequest request = ClientRequestInfo.currentRequest();
        if (request != null) {
            audit.setIpAddress(ClientRequestInfo.clientIp(request));
            audit.setUserAgent(ClientRequestInfo.userAgent(request));
        }
        audit.setMetadata("Role: " + (actor.getRole() != null ? actor.getRole().name() : "UNKNOWN")
                + ", PatientId: " + patientId
                + ", Download: " + download
                + ", TtlSeconds: " + ttlSeconds
                + ", Storage: " + storage);
        auditLogRepository.save(audit);
    }
}
