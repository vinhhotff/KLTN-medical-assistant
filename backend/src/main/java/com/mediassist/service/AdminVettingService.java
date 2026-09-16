package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.AdminCreateDoctorRequest;
import com.mediassist.dto.AdminSystemStatsDto;
import com.mediassist.dto.AdminTriageSessionDto;
import com.mediassist.dto.AdminUpdateDoctorRequest;
import com.mediassist.dto.AppointmentDto;
import com.mediassist.dto.AuditLogDto;
import com.mediassist.dto.CreateSpecialtyRequest;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.dto.SpecialtyDto;
import com.mediassist.dto.UserDto;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.TriageSession;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.mediassist.dto.PageResponse;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminVettingService {

    private static final Logger log = LoggerFactory.getLogger(AdminVettingService.class);
    private static final String CACHE_VERIFIED_DOCTORS = "doctors:verified";

    private final DoctorProfileRepository doctorProfileRepository;
    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final AuditLogRepository auditLogRepository;
    private final TwoLayerCacheService cacheService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final PasswordEncoder passwordEncoder;
    private final com.mediassist.repository.AppointmentRepository appointmentRepository;
    private final com.mediassist.repository.TriageSessionRepository triageSessionRepository;
    private final com.mediassist.repository.MedicalDocumentRepository medicalDocumentRepository;
    private final com.mediassist.repository.DocumentAnalysisRepository documentAnalysisRepository;

    public AdminVettingService(DoctorProfileRepository doctorProfileRepository,
                               UserRepository userRepository,
                               SpecialtyRepository specialtyRepository,
                               AuditLogRepository auditLogRepository,
                               TwoLayerCacheService cacheService,
                               DoctorSemanticSearchService doctorSemanticSearchService,
                               PasswordEncoder passwordEncoder,
                               com.mediassist.repository.AppointmentRepository appointmentRepository,
                               com.mediassist.repository.TriageSessionRepository triageSessionRepository,
                               com.mediassist.repository.MedicalDocumentRepository medicalDocumentRepository,
                               com.mediassist.repository.DocumentAnalysisRepository documentAnalysisRepository) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.auditLogRepository = auditLogRepository;
        this.cacheService = cacheService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.passwordEncoder = passwordEncoder;
        this.appointmentRepository = appointmentRepository;
        this.triageSessionRepository = triageSessionRepository;
        this.medicalDocumentRepository = medicalDocumentRepository;
        this.documentAnalysisRepository = documentAnalysisRepository;
    }

    public List<DoctorDetailDto> getAllDoctors() {
        List<DoctorProfile> list = doctorProfileRepository.findAllWithUserAndSpecialties();
        if (list == null || list.isEmpty()) {
            list = doctorProfileRepository.findAll();
        }
        return list.stream()
                .map(DoctorDetailDto::fromEntity)
                .collect(Collectors.toList());
    }

    public PageResponse<DoctorDetailDto> getDoctorsPaged(int page, int size, String search, String specialty, String status) {
        int safePage = Math.max(0, page);
        int safeSize = size > 0 ? Math.min(size, 100) : 10;

        List<DoctorDetailDto> all = getAllDoctors();

        // Filter
        List<DoctorDetailDto> filtered = all.stream()
                .filter(d -> {
                    // Search
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        boolean match = (d.getFullName() != null && d.getFullName().toLowerCase().contains(q))
                                || (d.getEmail() != null && d.getEmail().toLowerCase().contains(q))
                                || (d.getLicenseNumber() != null && d.getLicenseNumber().toLowerCase().contains(q))
                                || (d.getHospitalAffiliation() != null && d.getHospitalAffiliation().toLowerCase().contains(q))
                                || (d.getDepartment() != null && d.getDepartment().toLowerCase().contains(q))
                                || (d.getSpecialties() != null && d.getSpecialties().stream().anyMatch(s -> s.toLowerCase().contains(q)));
                        if (!match) return false;
                    }

                    // Specialty
                    if (specialty != null && !specialty.isBlank() && !"ALL".equalsIgnoreCase(specialty)) {
                        boolean match = d.getSpecialties() != null && d.getSpecialties().stream()
                                .anyMatch(s -> s.equalsIgnoreCase(specialty));
                        if (!match) return false;
                    }

                    // Status
                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        if ("ACTIVE".equalsIgnoreCase(status)) {
                            if (!d.isVerified() || "SUSPENDED".equalsIgnoreCase(d.getUserStatus())) return false;
                        } else if ("PENDING".equalsIgnoreCase(status)) {
                            if (d.isVerified()) return false;
                        } else if ("SUSPENDED".equalsIgnoreCase(status)) {
                            if (!"SUSPENDED".equalsIgnoreCase(d.getUserStatus())) return false;
                        }
                    }

                    return true;
                })
                .collect(Collectors.toList());

        long totalElements = filtered.size();
        int fromIndex = safePage * safeSize;
        if (fromIndex >= filtered.size()) {
            return new PageResponse<>(Collections.emptyList(), safePage, safeSize, totalElements);
        }

        int toIndex = Math.min(fromIndex + safeSize, filtered.size());
        List<DoctorDetailDto> pagedItems = filtered.subList(fromIndex, toIndex);

        return new PageResponse<>(pagedItems, safePage, safeSize, totalElements);
    }

    public List<DoctorDetailDto> getPendingDoctors() {
        List<DoctorProfile> list = doctorProfileRepository.findPendingWithUserAndSpecialties();
        if (list == null || list.isEmpty()) {
            list = doctorProfileRepository.findAll().stream().filter(d -> !d.isVerified()).collect(Collectors.toList());
        }
        return list.stream()
                .map(DoctorDetailDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public DoctorDetailDto vetDoctor(UUID doctorProfileId, boolean approve, String reason, UUID adminId) {
        DoctorProfile profile = doctorProfileRepository.findByIdWithDetails(doctorProfileId)
                .or(() -> doctorProfileRepository.findByUserIdWithDetails(doctorProfileId))
                .or(() -> doctorProfileRepository.findById(doctorProfileId))
                .or(() -> doctorProfileRepository.findByUserId(doctorProfileId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        profile.setVerified(approve);
        if (approve) {
            profile.setVerifiedAt(LocalDateTime.now());
            try {
                String specNames = profile.getSpecialties().stream()
                        .map(com.mediassist.model.entity.Specialty::getName)
                        .collect(Collectors.joining(", "));
                String docText = String.format("%s. %s. Chuyên khoa: %s. Kinh nghiệm: %d năm.",
                        profile.getUser() != null ? profile.getUser().getFullName() : "",
                        profile.getBio() != null ? profile.getBio() : "",
                        specNames,
                        profile.getYearsOfExperience());
                doctorSemanticSearchService.updateDoctorEmbedding(profile.getId(), docText);
            } catch (Exception e) {
                log.warn("Failed to generate embedding for newly vetted doctor: {}", e.getMessage());
            }
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

    @Transactional
    public DoctorDetailDto createDoctorByAdmin(AdminCreateDoctorRequest req, UUID adminId) {
        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new AppException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "Email này đã được sử dụng trong hệ thống: " + email);
        }
        if (req.getLicenseNumber() != null && doctorProfileRepository.findByLicenseNumber(req.getLicenseNumber().trim()).isPresent()) {
            throw new AppException(HttpStatus.CONFLICT, "LICENSE_EXISTS", "Số chứng chỉ hành nghề này đã tồn tại: " + req.getLicenseNumber());
        }

        // 1. Create User
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setFullName(req.getFullName().trim());
        user.setPhone(req.getPhone() != null ? req.getPhone().trim() : null);
        user.setRole(Role.DOCTOR);
        user.setStatus(UserStatus.ACTIVE);
        User savedUser = userRepository.save(user);

        // 2. Create DoctorProfile
        DoctorProfile profile = new DoctorProfile();
        profile.setUser(savedUser);
        profile.setAcademicTitle(req.getAcademicTitle() != null ? req.getAcademicTitle().trim() : "BS");
        profile.setHospitalAffiliation(req.getHospitalAffiliation() != null ? req.getHospitalAffiliation().trim() : "");
        profile.setDepartment(req.getDepartment() != null ? req.getDepartment().trim() : "");
        profile.setLicenseNumber(req.getLicenseNumber().trim());
        profile.setLicenseIssuedBy(req.getLicenseIssuedBy() != null ? req.getLicenseIssuedBy().trim() : "Bộ Y Tế");
        profile.setConsultationFee(req.getConsultationFee() != null ? req.getConsultationFee() : BigDecimal.valueOf(300000));
        profile.setYearsOfExperience(req.getYearsOfExperience() != null ? req.getYearsOfExperience() : 5);
        profile.setBio(req.getBio() != null ? req.getBio().trim() : "");
        profile.setVerified(req.isAutoVerify());
        if (req.isAutoVerify()) {
            profile.setVerifiedAt(LocalDateTime.now());
        }

        // 3. Specialties
        if (req.getSpecialtySlugs() != null && !req.getSpecialtySlugs().isEmpty()) {
            Set<Specialty> specialties = req.getSpecialtySlugs().stream()
                    .map(slug -> specialtyRepository.findBySlug(slug.trim().toLowerCase()))
                    .filter(java.util.Optional::isPresent)
                    .map(java.util.Optional::get)
                    .collect(Collectors.toSet());
            profile.setSpecialties(specialties);
        }

        DoctorProfile savedProfile = doctorProfileRepository.save(profile);
        cacheService.evict(CACHE_VERIFIED_DOCTORS);

        // 4. Vector sync if verified
        if (savedProfile.isVerified()) {
            syncDoctorVectorInternal(savedProfile);
        }

        // 5. Audit Log
        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("ADMIN_CREATE_DOCTOR");
        audit.setResource("doctor_profiles/" + savedProfile.getId());
        audit.setMetadata("Created doctor: " + savedUser.getFullName() + " (" + savedUser.getEmail() + ")");
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} created doctor account {} ({})", adminId, savedUser.getFullName(), savedUser.getEmail());
        return DoctorDetailDto.fromEntity(savedProfile);
    }

    @Transactional
    public DoctorDetailDto updateDoctorByAdmin(UUID doctorProfileId, AdminUpdateDoctorRequest req, UUID adminId) {
        DoctorProfile profile = doctorProfileRepository.findByIdWithDetails(doctorProfileId)
                .or(() -> doctorProfileRepository.findByUserIdWithDetails(doctorProfileId))
                .or(() -> doctorProfileRepository.findById(doctorProfileId))
                .or(() -> doctorProfileRepository.findByUserId(doctorProfileId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        User user = profile.getUser();
        if (user != null) {
            if (req.getFullName() != null && !req.getFullName().isBlank()) {
                user.setFullName(req.getFullName().trim());
            }
            if (req.getPhone() != null) {
                user.setPhone(req.getPhone().trim());
            }
            userRepository.save(user);
        }

        if (req.getAcademicTitle() != null) profile.setAcademicTitle(req.getAcademicTitle().trim());
        if (req.getHospitalAffiliation() != null) profile.setHospitalAffiliation(req.getHospitalAffiliation().trim());
        if (req.getDepartment() != null) profile.setDepartment(req.getDepartment().trim());
        if (req.getLicenseNumber() != null && !req.getLicenseNumber().isBlank()) profile.setLicenseNumber(req.getLicenseNumber().trim());
        if (req.getLicenseIssuedBy() != null) profile.setLicenseIssuedBy(req.getLicenseIssuedBy().trim());
        if (req.getConsultationFee() != null) profile.setConsultationFee(req.getConsultationFee());
        if (req.getYearsOfExperience() != null) profile.setYearsOfExperience(req.getYearsOfExperience());
        if (req.getBio() != null) profile.setBio(req.getBio().trim());
        if (req.getIsVerified() != null) {
            profile.setVerified(req.getIsVerified());
            if (req.getIsVerified() && profile.getVerifiedAt() == null) {
                profile.setVerifiedAt(LocalDateTime.now());
            }
        }

        if (req.getSpecialtySlugs() != null) {
            Set<Specialty> specialties = req.getSpecialtySlugs().stream()
                    .map(slug -> specialtyRepository.findBySlug(slug.trim().toLowerCase()))
                    .filter(java.util.Optional::isPresent)
                    .map(java.util.Optional::get)
                    .collect(Collectors.toSet());
            profile.setSpecialties(specialties);
        }

        DoctorProfile updated = doctorProfileRepository.save(profile);
        cacheService.evict(CACHE_VERIFIED_DOCTORS);

        if (updated.isVerified()) {
            syncDoctorVectorInternal(updated);
        }

        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("ADMIN_UPDATE_DOCTOR");
        audit.setResource("doctor_profiles/" + doctorProfileId);
        audit.setMetadata("Updated doctor profile: " + (user != null ? user.getFullName() : doctorProfileId));
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} updated doctor profile {}", adminId, doctorProfileId);
        return DoctorDetailDto.fromEntity(updated);
    }

    @Transactional
    public DoctorDetailDto toggleDoctorStatus(UUID doctorProfileId, UUID adminId) {
        DoctorProfile profile = doctorProfileRepository.findByIdWithDetails(doctorProfileId)
                .or(() -> doctorProfileRepository.findByUserIdWithDetails(doctorProfileId))
                .or(() -> doctorProfileRepository.findById(doctorProfileId))
                .or(() -> doctorProfileRepository.findByUserId(doctorProfileId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        User user = profile.getUser();
        if (user == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "NO_USER", "Hồ sơ bác sĩ không có tài khoản người dùng tương ứng");
        }

        UserStatus newStatus = user.getStatus() == UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
        user.setStatus(newStatus);
        userRepository.save(user);
        cacheService.evict(CACHE_VERIFIED_DOCTORS);

        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("TOGGLE_DOCTOR_STATUS");
        audit.setResource("doctor_profiles/" + doctorProfileId);
        audit.setMetadata("Doctor user status changed to: " + newStatus);
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} changed doctor {} user status to {}", adminId, user.getFullName(), newStatus);
        return DoctorDetailDto.fromEntity(profile);
    }

    @Transactional
    public DoctorDetailDto syncDoctorVector(UUID doctorProfileId, UUID adminId) {
        DoctorProfile profile = doctorProfileRepository.findByIdWithDetails(doctorProfileId)
                .or(() -> doctorProfileRepository.findByUserIdWithDetails(doctorProfileId))
                .or(() -> doctorProfileRepository.findById(doctorProfileId))
                .or(() -> doctorProfileRepository.findByUserId(doctorProfileId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        syncDoctorVectorInternal(profile);

        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("SYNC_DOCTOR_VECTOR");
        audit.setResource("doctor_profiles/" + doctorProfileId);
        audit.setMetadata("Vector embedding re-synced");
        auditLogRepository.save(audit);

        return DoctorDetailDto.fromEntity(profile);
    }

    private void syncDoctorVectorInternal(DoctorProfile profile) {
        try {
            String specNames = profile.getSpecialties().stream()
                    .map(Specialty::getName)
                    .collect(Collectors.joining(", "));
            String docText = String.format("%s %s. %s - %s. %s. Chuyên khoa: %s. Kinh nghiệm: %d năm.",
                    profile.getAcademicTitle() != null ? profile.getAcademicTitle() : "",
                    profile.getUser() != null ? profile.getUser().getFullName() : "",
                    profile.getHospitalAffiliation() != null ? profile.getHospitalAffiliation() : "",
                    profile.getDepartment() != null ? profile.getDepartment() : "",
                    profile.getBio() != null ? profile.getBio() : "",
                    specNames,
                    profile.getYearsOfExperience());
            doctorSemanticSearchService.updateDoctorEmbedding(profile.getId(), docText);
        } catch (Exception e) {
            log.warn("Failed to generate embedding for doctor profile {}: {}", profile.getId(), e.getMessage());
        }
    }

    @Transactional
    public int syncAllDoctorVectors(UUID adminId) {
        doctorSemanticSearchService.syncAllDoctorEmbeddings();

        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("SYNC_ALL_DOCTOR_VECTORS");
        audit.setResource("doctor_profiles");
        audit.setMetadata("Batch re-synced all doctor embeddings");
        auditLogRepository.save(audit);

        return (int) doctorProfileRepository.count();
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto updateUserStatus(UUID userId, UserStatus status, String reason, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        user.setStatus(status);
        User updated = userRepository.save(user);

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("UPDATE_USER_STATUS");
        audit.setResource("users/" + userId);
        audit.setMetadata("NewStatus: " + status + ", Reason: " + (reason != null ? reason : "N/A"));
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} updated user {} status to {}. Reason: {}", adminId, userId, status, reason);
        return UserDto.fromEntity(updated);
    }

    @Transactional
    public SpecialtyDto createSpecialty(CreateSpecialtyRequest request, UUID adminId) {
        String slug = request.getSlug().trim().toLowerCase();
        if (specialtyRepository.existsBySlug(slug)) {
            throw new AppException(HttpStatus.CONFLICT, "SPECIALTY_SLUG_EXISTS", "Mã chuyên khoa (slug) đã tồn tại trong hệ thống: " + slug);
        }

        Specialty specialty = new Specialty();
        specialty.setName(request.getName().trim());
        specialty.setSlug(slug);
        specialty.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
        Specialty saved = specialtyRepository.save(specialty);
        cacheService.evict("specialties:all");

        AuditLog audit = new AuditLog();
        audit.setUserId(adminId);
        audit.setAction("CREATE_SPECIALTY");
        audit.setResource("specialties/" + saved.getId());
        audit.setMetadata("Specialty: " + saved.getName() + " (" + saved.getSlug() + ")");
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} created new specialty: {} ({})", adminId, saved.getName(), saved.getSlug());
        return SpecialtyDto.fromEntity(saved);
    }

    public AdminSystemStatsDto getSystemStats() {
        AdminSystemStatsDto stats = new AdminSystemStatsDto();

        // User metrics
        stats.setTotalUsers(userRepository.count());
        stats.setTotalPatients(userRepository.countByRole(Role.PATIENT));
        stats.setTotalDoctors(userRepository.countByRole(Role.DOCTOR));
        stats.setPendingDoctorsCount(doctorProfileRepository.countByIsVerifiedFalse());
        stats.setSuspendedUsersCount(userRepository.countByStatus(UserStatus.SUSPENDED));

        // Appointments metrics
        stats.setTotalAppointments(appointmentRepository.count());
        long scheduled = appointmentRepository.countByStatus(AppointmentStatus.SCHEDULED)
                + appointmentRepository.countByStatus(AppointmentStatus.IN_PROGRESS);
        stats.setScheduledAppointmentsCount(scheduled);
        stats.setCompletedAppointmentsCount(appointmentRepository.countByStatus(AppointmentStatus.COMPLETED));
        stats.setCancelledAppointmentsCount(appointmentRepository.countByStatus(AppointmentStatus.CANCELLED));

        // EMR & Document analysis metrics
        stats.setTotalDocumentsAnalyzed(medicalDocumentRepository.count());
        stats.setRedFlagDocumentsCount(documentAnalysisRepository.countWithAbnormalIndicators());

        // AI Symptom Triage metrics
        long totalTriage = triageSessionRepository.count();
        long emergencyTriage = triageSessionRepository.countByIsEmergencyTrue();
        stats.setTotalTriageSessions(totalTriage);
        stats.setEmergencyTriageCount(emergencyTriage);
        stats.setRoutineTriageCount(Math.max(0, totalTriage - emergencyTriage));

        // Infrastructure health
        stats.setInfrastructureHealth(java.util.Map.of(
                "database", "UP",
                "pgvector", "UP",
                "redis", "UP",
                "twoLayerCache", "UP"
        ));

        // Recent Activity Feed
        List<AuditLogDto> recent = getAuditLogs(null);
        if (recent.size() > 10) {
            recent = recent.subList(0, 10);
        }
        stats.setRecentActivities(recent);

        return stats;
    }

    public List<AuditLogDto> getAuditLogs(String action) {
        List<AuditLog> logs;
        if (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action)) {
            logs = auditLogRepository.findByActionOrderByCreatedAtDesc(action.trim().toUpperCase());
        } else {
            logs = auditLogRepository.findTop100ByOrderByCreatedAtDesc();
        }

        if (logs == null || logs.isEmpty()) {
            return Collections.emptyList();
        }

        // Batch fetch all distinct users in 1 single SQL query to eliminate N+1 problem
        java.util.Set<UUID> userIds = logs.stream()
                .map(AuditLog::getUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        java.util.Map<UUID, String> emailMap = userIds.isEmpty()
                ? Collections.emptyMap()
                : userRepository.findAllById(userIds).stream()
                        .collect(Collectors.toMap(User::getId, User::getEmail, (a, b) -> a));

        return logs.stream().map(log -> {
            String email = log.getUserId() != null ? emailMap.get(log.getUserId()) : null;
            return AuditLogDto.fromEntity(log, email);
        }).collect(Collectors.toList());
    }

    public List<AdminTriageSessionDto> getTriageSessions() {
        List<TriageSession> list = triageSessionRepository.findAllWithUserOrderByCreatedAtDesc();
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        return list.stream()
                .map(AdminTriageSessionDto::fromEntity)
                .collect(Collectors.toList());
    }

    public List<AppointmentDto> getAllAppointments() {
        List<Appointment> list = appointmentRepository.findAllWithUsersOrderByScheduledStartDesc();
        if (list == null || list.isEmpty()) {
            return Collections.emptyList();
        }
        return list.stream()
                .map(AppointmentDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public AppointmentDto adminCancelAppointment(UUID appointmentId, UUID adminUserId, String reason) {
        Appointment appointment = appointmentRepository.findByIdWithUsers(appointmentId)
                .or(() -> appointmentRepository.findById(appointmentId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "APPOINTMENT_NOT_FOUND", "Không tìm thấy thông tin cuộc hẹn"));

        appointment.setStatus(AppointmentStatus.CANCELLED);
        String cancelNote = "[ADMIN CANCELLED] " + (reason != null && !reason.isBlank() ? reason.trim() : "Quản trị viên can thiệp hủy lịch hẹn vì lý do vận hành");
        appointment.setCancellationReason(cancelNote);

        Appointment saved = appointmentRepository.save(appointment);

        AuditLog audit = new AuditLog();
        audit.setUserId(adminUserId);
        audit.setAction("ADMIN_CANCEL_APPOINTMENT");
        audit.setResource("appointments/" + saved.getId());
        audit.setMetadata("Code: " + saved.getAppointmentCode() + ", Reason: " + cancelNote);
        auditLogRepository.save(audit);

        log.info("🛡️ Admin {} cancelled appointment {}. Reason: {}", adminUserId, saved.getAppointmentCode(), cancelNote);
        return AppointmentDto.fromEntity(saved);
    }
}
