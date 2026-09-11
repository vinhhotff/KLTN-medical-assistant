package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.dto.UserDto;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminVettingService {

    private static final Logger log = LoggerFactory.getLogger(AdminVettingService.class);
    private static final String CACHE_VERIFIED_DOCTORS = "doctors:verified";

    private final DoctorProfileRepository doctorProfileRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final TwoLayerCacheService cacheService;

    public AdminVettingService(DoctorProfileRepository doctorProfileRepository,
                               UserRepository userRepository,
                               AuditLogRepository auditLogRepository,
                               TwoLayerCacheService cacheService) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.cacheService = cacheService;
    }

    public List<DoctorDetailDto> getPendingDoctors() {
        return doctorProfileRepository.findAll().stream()
                .filter(d -> !d.isVerified())
                .map(DoctorDetailDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public DoctorDetailDto vetDoctor(UUID doctorProfileId, boolean approve, String reason, UUID adminId) {
        DoctorProfile profile = doctorProfileRepository.findById(doctorProfileId)
                .or(() -> doctorProfileRepository.findByUserId(doctorProfileId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        profile.setVerified(approve);
        if (approve) {
            profile.setVerifiedAt(LocalDateTime.now());
        }

        DoctorProfile updated = doctorProfileRepository.save(profile);
        cacheService.evict(CACHE_VERIFIED_DOCTORS);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction(approve ? "VET_DOCTOR_APPROVED" : "VET_DOCTOR_REJECTED");
        audit.setResource("doctor_profiles/" + doctorProfileId);
        audit.setMetadata("Decision: " + (approve ? "APPROVED" : "REJECTED") + ", Reason: " + reason);
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} vetted doctor profile {}: {}", adminId, doctorProfileId, approve ? "APPROVED" : "REJECTED");
        return DoctorDetailDto.fromEntity(updated);
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }
}
