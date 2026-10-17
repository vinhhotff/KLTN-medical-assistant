package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.common.ClientRequestInfo;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.Role;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * Rào chắn truy cập hồ sơ bệnh nhân (Nghị định 13/2023/NĐ-CP - dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm).
 * - PATIENT: chỉ xem dữ liệu của chính mình.
 * - DOCTOR: chỉ xem khi có quan hệ điều trị (ít nhất 1 lịch hẹn SCHEDULED / IN_PROGRESS / COMPLETED với bệnh nhân).
 * - ADMIN: được xem nhưng bắt buộc ghi audit.
 * Mỗi lần DOCTOR/ADMIN được cấp quyền mở hồ sơ đều ghi AuditLog VIEW_PATIENT_RECORD.
 */
@Service
public class PatientAccessGuard {

    public static final String ACTION_VIEW_PATIENT_RECORD = "VIEW_PATIENT_RECORD";
    public static final String ERROR_CODE = "FORBIDDEN_PATIENT_ACCESS";

    static final Set<AppointmentStatus> CARE_RELATIONSHIP_STATUSES =
            EnumSet.of(AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED);

    private static final Logger log = LoggerFactory.getLogger(PatientAccessGuard.class);

    private final AppointmentRepository appointmentRepository;
    private final AuditLogRepository auditLogRepository;

    public PatientAccessGuard(AppointmentRepository appointmentRepository, AuditLogRepository auditLogRepository) {
        this.appointmentRepository = appointmentRepository;
        this.auditLogRepository = auditLogRepository;
    }

    public void assertCanAccessPatient(UUID actorUserId, Role role, UUID patientId) {
        assertCanAccessPatient(actorUserId, role, patientId, "patients/" + patientId);
    }

    /**
     * @param resource tài nguyên cụ thể đang được mở (ví dụ "documents/{id}/file"), dùng cho audit trail.
     */
    public void assertCanAccessPatient(UUID actorUserId, Role role, UUID patientId, String resource) {
        if (actorUserId == null || role == null) {
            throw forbidden();
        }

        switch (role) {
            case PATIENT -> {
                if (patientId == null || !actorUserId.equals(patientId)) {
                    log.warn("🚫 Patient {} attempted to access records of patient {}", actorUserId, patientId);
                    throw forbidden();
                }
            }
            case DOCTOR -> {
                if (patientId == null || !appointmentRepository.existsByDoctorIdAndPatientIdAndStatusIn(
                        actorUserId, patientId, CARE_RELATIONSHIP_STATUSES)) {
                    log.warn("🚫 Doctor {} has no care relationship with patient {} (resource: {})", actorUserId, patientId, resource);
                    throw forbidden();
                }
                recordView(actorUserId, role, patientId, resource);
            }
            case ADMIN -> recordView(actorUserId, role, patientId, resource);
            default -> throw forbidden();
        }
    }

    private void recordView(UUID actorUserId, Role role, UUID patientId, String resource) {
        AuditLog audit = new AuditLog();
        audit.setUserId(actorUserId);
        audit.setAction(ACTION_VIEW_PATIENT_RECORD);
        audit.setResource(resource);
        HttpServletRequest request = ClientRequestInfo.currentRequest();
        if (request != null) {
            audit.setIpAddress(ClientRequestInfo.clientIp(request));
            audit.setUserAgent(ClientRequestInfo.userAgent(request));
        }
        audit.setMetadata("Role: " + role.name() + ", PatientId: " + patientId);
        auditLogRepository.save(audit);
    }

    private AppException forbidden() {
        return new AppException(HttpStatus.FORBIDDEN, ERROR_CODE,
                "Bạn không có quyền xem hồ sơ của bệnh nhân này. Chỉ bác sĩ có lịch hẹn điều trị với bệnh nhân mới được truy cập.");
    }
}
