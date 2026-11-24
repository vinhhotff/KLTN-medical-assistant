package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.*;
import com.mediassist.model.entity.*;
import com.mediassist.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class DoctorService {

    private static final Logger log = LoggerFactory.getLogger(DoctorService.class);
    private static final String CACHE_VERIFIED_DOCTORS = "doctors:verified";
    private static final String CACHE_SCHEDULE_META_PREFIX = "doctor:schedule:meta:";
    private static final long SCHEDULE_META_TTL_SECONDS = 300;
    private static final Set<Integer> ALLOWED_SLOT_DURATIONS = Set.of(15, 20, 30, 45, 60);
    private static final Set<Integer> ALLOWED_BUFFER_MINUTES = Set.of(0, 5, 10, 15, 20, 30);
    private static final List<AppointmentStatus> ACTIVE_BOOKING_STATUSES = List.of(
            AppointmentStatus.SCHEDULED, AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS
    );

    private final DoctorProfileRepository doctorProfileRepository;
    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final AppointmentRepository appointmentRepository;
    private final TwoLayerCacheService cacheService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final DoctorScheduleSlotRepository doctorScheduleSlotRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final StorageService storageService;
    private final AuditLogRepository auditLogRepository;
    private final DoctorScheduleExceptionRepository doctorScheduleExceptionRepository;
    private final ObjectMapper jsonMapper;

    @Autowired
    public DoctorService(DoctorProfileRepository doctorProfileRepository,
                         UserRepository userRepository,
                         SpecialtyRepository specialtyRepository,
                         AppointmentRepository appointmentRepository,
                         TwoLayerCacheService cacheService,
                         DoctorSemanticSearchService doctorSemanticSearchService,
                         DoctorScheduleSlotRepository doctorScheduleSlotRepository,
                         PatientProfileRepository patientProfileRepository,
                         @Autowired(required = false) StorageService storageService,
                         @Autowired(required = false) AuditLogRepository auditLogRepository,
                         @Autowired(required = false) DoctorScheduleExceptionRepository doctorScheduleExceptionRepository,
                         @Autowired(required = false) ObjectMapper objectMapper) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.appointmentRepository = appointmentRepository;
        this.cacheService = cacheService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.doctorScheduleSlotRepository = doctorScheduleSlotRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.storageService = storageService;
        this.auditLogRepository = auditLogRepository;
        this.doctorScheduleExceptionRepository = doctorScheduleExceptionRepository;
        this.jsonMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public DoctorService(DoctorProfileRepository doctorProfileRepository,
                         UserRepository userRepository,
                         SpecialtyRepository specialtyRepository,
                         AppointmentRepository appointmentRepository,
                         TwoLayerCacheService cacheService,
                         DoctorSemanticSearchService doctorSemanticSearchService,
                         DoctorScheduleSlotRepository doctorScheduleSlotRepository,
                         PatientProfileRepository patientProfileRepository,
                         StorageService storageService,
                         AuditLogRepository auditLogRepository) {
        this(doctorProfileRepository, userRepository, specialtyRepository, appointmentRepository,
             cacheService, doctorSemanticSearchService, doctorScheduleSlotRepository,
             patientProfileRepository, storageService, auditLogRepository, null, null);
    }

    public DoctorService(DoctorProfileRepository doctorProfileRepository,
                         UserRepository userRepository,
                         SpecialtyRepository specialtyRepository,
                         AppointmentRepository appointmentRepository,
                         TwoLayerCacheService cacheService,
                         DoctorSemanticSearchService doctorSemanticSearchService,
                         DoctorScheduleSlotRepository doctorScheduleSlotRepository,
                         PatientProfileRepository patientProfileRepository) {
        this(doctorProfileRepository, userRepository, specialtyRepository, appointmentRepository,
             cacheService, doctorSemanticSearchService, doctorScheduleSlotRepository,
             patientProfileRepository, null, null, null, null);
    }

    public List<DoctorDetailDto> getVerifiedDoctors() {
        DoctorDetailDto[] cached = cacheService.get(CACHE_VERIFIED_DOCTORS, DoctorDetailDto[].class);
        if (cached != null && cached.length > 0) {
            log.debug("⚡ [CACHE HIT] Returning {} verified doctors from cache", cached.length);
            return Arrays.asList(cached);
        }

        List<DoctorProfile> profiles = doctorProfileRepository.findAllVerifiedWithUserAndSpecialties();
        if (profiles == null || profiles.isEmpty()) {
            profiles = doctorProfileRepository.findAll().stream()
                    .filter(DoctorProfile::isVerified)
                    .filter(dp -> dp.getUser() == null || dp.getUser().getStatus() == UserStatus.ACTIVE)
                    .collect(Collectors.toList());
        }
        List<DoctorDetailDto> dtos = profiles.stream()
                .map(DoctorDetailDto::fromEntity)
                .collect(Collectors.toList());

        if (!dtos.isEmpty()) {
            cacheService.set(CACHE_VERIFIED_DOCTORS, dtos.toArray(new DoctorDetailDto[0]), 600); // 10 min TTL
        }
        return dtos;
    }

    public DoctorDetailDto getDoctorById(UUID doctorIdentifier) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorIdentifier)
                .or(() -> doctorProfileRepository.findByIdWithDetails(doctorIdentifier))
                .or(() -> doctorProfileRepository.findByUserId(doctorIdentifier))
                .or(() -> doctorProfileRepository.findById(doctorIdentifier))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy thông tin bác sĩ"));
        return DoctorDetailDto.fromEntity(profile);
    }

    public List<DoctorSlotDto> getAvailableSlots(UUID doctorIdentifier, LocalDate date) {
        if (date == null || date.isBefore(LocalDate.now())) {
            return Collections.emptyList();
        }

        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorIdentifier)
                .or(() -> doctorProfileRepository.findByIdWithDetails(doctorIdentifier))
                .or(() -> doctorProfileRepository.findByUserId(doctorIdentifier))
                .or(() -> doctorProfileRepository.findById(doctorIdentifier))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bác sĩ không tồn tại"));

        UUID doctorUserId = profile.getUser() != null ? profile.getUser().getId() : doctorIdentifier;

        // Query active appointments fresh so booked slots are always up to date
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(23, 59, 59);
        List<Appointment> bookedAppointments = appointmentRepository.findActiveAppointmentsByDoctorAndRange(doctorUserId, dayStart, dayEnd);

        int duration = profile.getSlotDurationMinutes();
        int buffer = profile.getBufferTimeMinutes();
        List<ShiftWindow> dayShifts;

        if (doctorScheduleExceptionRepository != null) {
            CachedScheduleMeta meta = getOrLoadScheduleMeta(profile);
            final int effectiveDuration = meta.getSlotDurationMinutes() > 0 ? meta.getSlotDurationMinutes() : duration;
            duration = effectiveDuration;
            buffer = Math.max(0, meta.getBufferTimeMinutes());

            String dateStr = date.toString();
            CachedException matchedException = meta.getExceptions().stream()
                    .filter(ex -> dateStr.equals(ex.getExceptionDate()))
                    .findFirst()
                    .orElse(null);

            if (matchedException != null) {
                if (matchedException.isDayOff()) {
                    return Collections.emptyList();
                }
                dayShifts = matchedException.getShifts().stream()
                        .map(s -> new ShiftWindow(LocalTime.parse(s.getStartTime()), LocalTime.parse(s.getEndTime()), effectiveDuration))
                        .collect(Collectors.toList());
            } else {
                DayOfWeek targetDow = date.getDayOfWeek();
                dayShifts = meta.getWeeklySlots().stream()
                        .filter(w -> targetDow.name().equals(w.getDayOfWeek()))
                        .map(w -> new ShiftWindow(
                                LocalTime.parse(w.getStartTime()),
                                LocalTime.parse(w.getEndTime()),
                                w.getSlotDurationMinutes() > 0 ? w.getSlotDurationMinutes() : effectiveDuration))
                        .collect(Collectors.toList());
            }
        } else {
            DayOfWeek targetDow = date.getDayOfWeek();
            List<DoctorScheduleSlot> slotConfigs = doctorScheduleSlotRepository
                    .findByDoctorProfileIdAndDayOfWeekAndIsActiveTrue(profile.getId(), targetDow);

            // An empty day means "closed" once the doctor has saved a schedule.
            if ((slotConfigs == null || slotConfigs.isEmpty()) && !doctorScheduleSlotRepository.existsByDoctorProfileId(profile.getId())) {
                slotConfigs = initializeDefaultDoctorSchedules(profile).stream()
                        .filter(s -> s.getDayOfWeek() == targetDow && s.isActive())
                        .collect(Collectors.toList());
            }
            dayShifts = (slotConfigs == null ? Collections.<DoctorScheduleSlot>emptyList() : slotConfigs).stream()
                    .map(s -> new ShiftWindow(s.getStartTime(), s.getEndTime(), s.getSlotDurationMinutes() > 0 ? s.getSlotDurationMinutes() : 30))
                    .collect(Collectors.toList());
        }

        if (dayShifts.isEmpty()) {
            return Collections.emptyList();
        }

        Map<LocalTime, DoctorSlotDto> uniqueSlotsMap = new TreeMap<>();
        LocalTime nowTime = LocalTime.now();
        boolean isToday = date.isEqual(LocalDate.now());

        for (ShiftWindow shift : dayShifts) {
            int shiftDuration = shift.slotDurationMinutes > 0 ? shift.slotDurationMinutes : 30;
            List<DoctorSlotDto> generated = new ArrayList<>();
            addTimeSlots(date, shift.startTime, shift.endTime, shiftDuration, buffer, bookedAppointments, generated, isToday, nowTime);
            for (DoctorSlotDto s : generated) {
                uniqueSlotsMap.merge(s.getStartTime(), s, (existing, incoming) -> {
                    boolean isAvail = existing.isAvailable() && incoming.isAvailable();
                    return new DoctorSlotDto(
                            existing.getStartTime(),
                            existing.getEndTime(),
                            existing.getStartDateTime(),
                            existing.getEndDateTime(),
                            isAvail
                    );
                });
            }
        }

        return new ArrayList<>(uniqueSlotsMap.values());
    }

    public boolean isSlotWithinWorkingHours(UUID doctorIdentifier, LocalDateTime scheduledStart, int fallbackDurationMinutes) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorIdentifier)
                .or(() -> doctorProfileRepository.findByIdWithDetails(doctorIdentifier))
                .or(() -> doctorProfileRepository.findByUserId(doctorIdentifier))
                .or(() -> doctorProfileRepository.findById(doctorIdentifier))
                .orElse(null);
        if (profile == null || scheduledStart == null) {
            return false;
        }
        LocalDate date = scheduledStart.toLocalDate();
        LocalTime startTime = scheduledStart.toLocalTime();
        int duration = profile.getSlotDurationMinutes() > 0 ? profile.getSlotDurationMinutes() : fallbackDurationMinutes;
        LocalTime endTime = startTime.plusMinutes(duration);

        List<ShiftWindow> dayShifts;
        if (doctorScheduleExceptionRepository != null) {
            CachedScheduleMeta meta = getOrLoadScheduleMeta(profile);
            String dateStr = date.toString();
            CachedException matchedException = meta.getExceptions().stream()
                    .filter(ex -> dateStr.equals(ex.getExceptionDate()))
                    .findFirst()
                    .orElse(null);
            if (matchedException != null) {
                if (matchedException.isDayOff()) return false;
                dayShifts = matchedException.getShifts().stream()
                        .map(s -> new ShiftWindow(LocalTime.parse(s.getStartTime()), LocalTime.parse(s.getEndTime()), meta.getSlotDurationMinutes()))
                        .collect(Collectors.toList());
            } else {
                DayOfWeek dow = date.getDayOfWeek();
                dayShifts = meta.getWeeklySlots().stream()
                        .filter(w -> dow.name().equals(w.getDayOfWeek()))
                        .map(w -> new ShiftWindow(LocalTime.parse(w.getStartTime()), LocalTime.parse(w.getEndTime()), w.getSlotDurationMinutes()))
                        .collect(Collectors.toList());
            }
        } else {
            DayOfWeek dow = date.getDayOfWeek();
            List<DoctorScheduleSlot> slotConfigs = doctorScheduleSlotRepository
                    .findByDoctorProfileIdAndDayOfWeekAndIsActiveTrue(profile.getId(), dow);
            if ((slotConfigs == null || slotConfigs.isEmpty()) && !doctorScheduleSlotRepository.existsByDoctorProfileId(profile.getId())) {
                slotConfigs = initializeDefaultDoctorSchedules(profile).stream()
                        .filter(s -> s.getDayOfWeek() == dow && s.isActive())
                        .collect(Collectors.toList());
            }
            dayShifts = (slotConfigs == null ? Collections.<DoctorScheduleSlot>emptyList() : slotConfigs).stream()
                    .map(s -> new ShiftWindow(s.getStartTime(), s.getEndTime(), s.getSlotDurationMinutes()))
                    .collect(Collectors.toList());
        }
        return dayShifts.stream().anyMatch(shift ->
                !startTime.isBefore(shift.startTime) && !endTime.isAfter(shift.endTime)
        );
    }

    private void addTimeSlots(LocalDate date, LocalTime start, LocalTime end, int durationMinutes, int bufferMinutes,
                              List<Appointment> bookedAppointments, List<DoctorSlotDto> slots, boolean isToday, LocalTime nowTime) {
        int currentMin = start.getHour() * 60 + start.getMinute();
        int endMin = end.getHour() * 60 + end.getMinute();
        int safeDuration = Math.max(5, durationMinutes);
        int safeBuffer = Math.max(0, bufferMinutes);

        while (currentMin + safeDuration <= endMin) {
            LocalTime slotStart = LocalTime.of(currentMin / 60, currentMin % 60);
            int slotEndTotalMin = currentMin + safeDuration;
            LocalTime slotEnd = LocalTime.of(slotEndTotalMin / 60, slotEndTotalMin % 60);
            LocalDateTime slotStartDt = date.atTime(slotStart);
            LocalDateTime slotEndDt = date.atTime(slotEnd);

            boolean isBooked = bookedAppointments != null && bookedAppointments.stream().anyMatch(a -> {
                LocalDateTime apptStart = a.getScheduledStart();
                LocalDateTime apptEnd = a.getScheduledEnd() != null ? a.getScheduledEnd() : apptStart.plusMinutes(safeDuration);
                return slotStartDt.isBefore(apptEnd.plusMinutes(safeBuffer))
                        && slotEndDt.plusMinutes(safeBuffer).isAfter(apptStart);
            });
            boolean isPastToday = isToday && slotStart.isBefore(nowTime);
            boolean available = !isBooked && !isPastToday;

            slots.add(new DoctorSlotDto(
                    slotStart,
                    slotEnd,
                    slotStartDt,
                    slotEndDt,
                    available
            ));
            currentMin += safeDuration + safeBuffer;
        }
    }

    @Transactional
    public DoctorDetailDto updateDoctorProfile(UUID doctorUserId, UpdateDoctorProfileRequest req) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseGet(() -> {
                    var user = userRepository.findById(doctorUserId)
                            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Người dùng không tồn tại"));
                    DoctorProfile newProfile = new DoctorProfile();
                    newProfile.setUser(user);
                    return newProfile;
                });

        User user = profile.getUser();
        if (user != null) {
            boolean userModified = false;
            if (req.getFullName() != null && !req.getFullName().isBlank()) {
                user.setFullName(req.getFullName().trim());
                userModified = true;
            }
            if (req.getPhone() != null && !req.getPhone().isBlank()) {
                String normalizedPhone = req.getPhone().trim();
                if (!normalizedPhone.equals(user.getPhone()) && userRepository.existsByPhone(normalizedPhone)) {
                    throw new AppException(HttpStatus.CONFLICT, "PHONE_ALREADY_EXISTS",
                            "Số điện thoại '" + normalizedPhone + "' đã được sử dụng trên hệ thống.");
                }
                user.setPhone(normalizedPhone);
                userModified = true;
            }
            if (req.getAvatarUrl() != null) {
                user.setAvatarUrl(req.getAvatarUrl().isBlank() ? null : req.getAvatarUrl().trim());
                userModified = true;
            }
            if (userModified) {
                userRepository.save(user);
            }
        }

        if (req.getBio() != null) profile.setBio(req.getBio().trim());
        if (req.getLicenseNumber() != null) {
            String trimmedLicense = req.getLicenseNumber().isBlank() ? null : req.getLicenseNumber().trim();
            if (trimmedLicense != null) {
                doctorProfileRepository.findByLicenseNumber(trimmedLicense).ifPresent(existing -> {
                    if (profile.getId() == null || !existing.getId().equals(profile.getId())) {
                        throw new AppException(HttpStatus.CONFLICT, "LICENSE_ALREADY_EXISTS",
                                "Số chứng chỉ hành nghề '" + trimmedLicense + "' đã được đăng ký bởi bác sĩ khác trên hệ thống.");
                    }
                });
            }
            profile.setLicenseNumber(trimmedLicense);
        }
        if (req.getLicenseDocumentUrl() != null) {
            profile.setLicenseDocumentUrl(req.getLicenseDocumentUrl().isBlank() ? null : req.getLicenseDocumentUrl().trim());
        }
        if (req.getConsultationFee() != null) profile.setConsultationFee(req.getConsultationFee());
        if (req.getYearsOfExperience() != null) profile.setYearsOfExperience(req.getYearsOfExperience());
        if (req.getAcademicTitle() != null) profile.setAcademicTitle(req.getAcademicTitle().trim());
        if (req.getHospitalAffiliation() != null) profile.setHospitalAffiliation(req.getHospitalAffiliation().trim());
        if (req.getClinicAddress() != null) profile.setClinicAddress(req.getClinicAddress().isBlank() ? null : req.getClinicAddress().trim());
        if (req.getDepartment() != null) profile.setDepartment(req.getDepartment().trim());
        if (req.getLicenseIssuedBy() != null) profile.setLicenseIssuedBy(req.getLicenseIssuedBy().trim());
        if (req.getLicenseIssuedDate() != null) profile.setLicenseIssuedDate(req.getLicenseIssuedDate());
        if (req.getScopeOfPractice() != null) profile.setScopeOfPractice(req.getScopeOfPractice().isBlank() ? null : req.getScopeOfPractice().trim());

        if (Boolean.TRUE.equals(req.getSubmitForVerification())) {
            if (profile.getLicenseNumber() == null || profile.getLicenseNumber().isBlank()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "MISSING_LICENSE_NUMBER",
                        "Vui lòng nhập Số chứng chỉ hành nghề (CCHN) hợp lệ trước khi gửi hồ sơ thẩm định.");
            }
            if (!profile.isVerified()) {
                profile.setVerificationStatus(VerificationStatus.PENDING_VERIFICATION);
                profile.setRejectionReason(null);
                profile.setRejectionAt(null);
            }
        }

        if (req.getSpecialtySlugs() != null && !req.getSpecialtySlugs().isEmpty()) {
            Set<Specialty> specialties = new HashSet<>();
            for (String slug : req.getSpecialtySlugs()) {
                if (slug != null && !slug.isBlank()) {
                    specialtyRepository.findBySlug(slug.trim().toLowerCase()).ifPresent(specialties::add);
                }
            }
            profile.setSpecialties(specialties);
        }

        DoctorProfile saved = doctorProfileRepository.save(profile);
        cacheService.evict(CACHE_VERIFIED_DOCTORS);

        if (saved.isVerified()) {
            syncDoctorVectorInternal(saved);
        }

        return DoctorDetailDto.fromEntity(saved);
    }

    public DoctorDetailDto getMyProfile(UUID doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseGet(() -> {
                    var user = userRepository.findById(doctorUserId)
                            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Người dùng không tồn tại"));
                    DoctorProfile newProfile = new DoctorProfile();
                    newProfile.setUser(user);
                    return doctorProfileRepository.save(newProfile);
                });
        return DoctorDetailDto.fromEntity(profile);
    }

    @Transactional
    public DoctorLicenseUploadResponseDto uploadDoctorLicense(UUID doctorUserId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Vui lòng chọn tệp bản scan Chứng chỉ hành nghề (CCHN).");
        }
        if (file.getSize() > 10 * 1024 * 1024) { // 10MB
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE", "Kích thước tệp không được vượt quá 10MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equalsIgnoreCase("application/pdf")
                && !contentType.equalsIgnoreCase("image/jpeg")
                && !contentType.equalsIgnoreCase("image/png")
                && !contentType.equalsIgnoreCase("image/webp"))) {
            throw new AppException(HttpStatus.BAD_REQUEST, "UNSUPPORTED_MEDIA_TYPE",
                    "Định dạng tệp không được hỗ trợ. Vui lòng tải lên file PDF, JPEG, PNG hoặc WEBP.");
        }

        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        if (storageService == null) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "Hệ thống lưu trữ chưa sẵn sàng.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_READ_ERROR", "Không thể đọc dữ liệu tệp tải lên.");
        }

        String originalFilename = file.getOriginalFilename();
        String storagePath = storageService.uploadDoctorLicense(bytes, originalFilename, contentType, profile.getId());
        if (storagePath == null || storagePath.isBlank()) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Lưu trữ tệp thất bại. Vui lòng thử lại sau.");
        }

        profile.setLicenseDocumentStoragePath(storagePath);
        profile.setLicenseDocumentUrl("/api/v1/doctors/me/license-document/file");
        if (!profile.isVerified() && profile.getLicenseNumber() != null && !profile.getLicenseNumber().isBlank()) {
            profile.setVerificationStatus(VerificationStatus.PENDING_VERIFICATION);
            profile.setRejectionReason(null);
            profile.setRejectionAt(null);
        }
        doctorProfileRepository.save(profile);

        String viewUrl;
        Instant expiresAt = Instant.now().plusSeconds(storageService.getSignedUrlTtlSeconds());
        if (!storagePath.startsWith("/uploads/")) {
            try {
                StorageService.SignedUrl signedUrl = storageService.createSignedUrl(storagePath, false, null);
                viewUrl = signedUrl.url();
                expiresAt = signedUrl.expiresAt();
            } catch (Exception e) {
                viewUrl = "/api/v1/doctors/me/license-document/file";
            }
        } else {
            viewUrl = "/api/v1/doctors/me/license-document/file";
        }

        if (auditLogRepository != null) {
            try {
                AuditLog audit = new AuditLog();
                audit.setUserId(doctorUserId);
                audit.setAction("UPLOAD_DOCTOR_LICENSE_DOCUMENT");
                audit.setResource("doctor_profiles/" + profile.getId());
                audit.setMetadata("FileName: " + originalFilename + ", Size: " + file.getSize() + ", Storage: " + (storagePath.startsWith("/uploads/") ? "LOCAL" : "SUPABASE"));
                auditLogRepository.save(audit);
            } catch (Exception e) {
                log.warn("Failed to write audit log for doctor license upload: {}", e.getMessage());
            }
        }

        log.info("🩺 Doctor {} uploaded CCHN document: {} -> {}", doctorUserId, originalFilename, storagePath);

        return new DoctorLicenseUploadResponseDto(
                storagePath,
                viewUrl,
                originalFilename,
                contentType,
                file.getSize(),
                expiresAt,
                storageService.getSignedUrlTtlSeconds(),
                profile.getVerificationStatus() != null ? profile.getVerificationStatus().name() : "PENDING_VERIFICATION"
        );
    }

    public DocumentFileAccessDto getDoctorLicenseAccess(UUID doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        String storagePath = profile.getLicenseDocumentStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            if (profile.getLicenseDocumentUrl() != null && !profile.getLicenseDocumentUrl().isBlank()) {
                return new DocumentFileAccessDto(profile.getLicenseDocumentUrl(), Instant.now().plusSeconds(900), 900, "URL");
            }
            throw new AppException(HttpStatus.NOT_FOUND, StorageService.ERROR_FILE_NOT_AVAILABLE, "Bác sĩ chưa tải lên bản scan chứng chỉ hành nghề.");
        }

        if (storagePath.startsWith("/uploads/")) {
            return new DocumentFileAccessDto("/api/v1/doctors/me/license-document/file", Instant.now().plusSeconds(900), 900, "LOCAL");
        }

        if (storageService == null) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "Hệ thống lưu trữ chưa sẵn sàng.");
        }

        StorageService.SignedUrl signed = storageService.createSignedUrl(storagePath, false, null);
        return new DocumentFileAccessDto(signed.url(), signed.expiresAt(), signed.expiresInSeconds(), "SUPABASE_SIGNED");
    }

    public byte[] readDoctorLicenseLocalFile(UUID doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        String storagePath = profile.getLicenseDocumentStoragePath();
        if (storagePath == null || !storagePath.startsWith("/uploads/")) {
            return null;
        }

        try {
            Path localPath = Paths.get(storagePath.substring(1)).toAbsolutePath().normalize();
            Path baseUploadDir = Paths.get("uploads").toAbsolutePath().normalize();
            if (localPath.startsWith(baseUploadDir) && Files.exists(localPath)) {
                return Files.readAllBytes(localPath);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void syncDoctorVectorInternal(DoctorProfile profile) {
        try {
            String specNames = profile.getSpecialties() != null
                    ? profile.getSpecialties().stream()
                            .map(Specialty::getName)
                            .collect(Collectors.joining(", "))
                    : "";
            String docText = String.format("%s %s. %s - %s. %s %s. Chuyên khoa: %s. Kinh nghiệm: %d năm.",
                    profile.getAcademicTitle() != null ? profile.getAcademicTitle() : "",
                    profile.getUser() != null ? profile.getUser().getFullName() : "",
                    profile.getHospitalAffiliation() != null ? profile.getHospitalAffiliation() : "",
                    profile.getDepartment() != null ? profile.getDepartment() : "",
                    profile.getClinicAddress() != null ? "Địa chỉ: " + profile.getClinicAddress() + "." : "",
                    profile.getBio() != null ? profile.getBio() : "",
                    specNames,
                    profile.getYearsOfExperience());
            doctorSemanticSearchService.updateDoctorEmbedding(profile.getId(), docText);
        } catch (Exception e) {
            log.warn("Failed to sync vector embedding for doctor profile {}: {}", profile.getId(), e.getMessage());
        }
    }

    /**
     * Computes real-time workstation KPIs and metrics for the authenticated doctor.
     */
    public DoctorStatsDto getDoctorStats(UUID doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElse(null);

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(23, 59, 59);

        long todayAppointmentsCount = appointmentRepository.countActiveAppointmentsByDoctorAndDateRange(doctorUserId, todayStart, todayEnd);
        long todayWaitingCount = appointmentRepository.countByDoctorStatusAndRange(doctorUserId, AppointmentStatus.SCHEDULED, todayStart, todayEnd);
        long todayInProgressCount = appointmentRepository.countByDoctorStatusAndRange(doctorUserId, AppointmentStatus.IN_PROGRESS, todayStart, todayEnd);
        long todayCompletedCount = appointmentRepository.countByDoctorStatusAndRange(doctorUserId, AppointmentStatus.COMPLETED, todayStart, todayEnd);
        long totalCompletedCount = appointmentRepository.countByDoctorIdAndStatus(doctorUserId, AppointmentStatus.COMPLETED);
        long totalAppointments = appointmentRepository.countByDoctorId(doctorUserId);
        BigDecimal todayRevenue = appointmentRepository.sumTodayRevenue(doctorUserId, todayStart, todayEnd);
        BigDecimal lifetimeRevenue = appointmentRepository.sumLifetimeRevenue(doctorUserId);

        double rating = (profile != null && profile.getRating() != null) ? profile.getRating() : 4.9;
        int consultations = (profile != null && profile.getTotalConsultations() != null)
                ? profile.getTotalConsultations()
                : (int) totalCompletedCount;
        int reviewCount = (profile != null && profile.getReviewCount() != null)
                ? profile.getReviewCount()
                : 0;

        DoctorStatsDto dto = new DoctorStatsDto(
                todayAppointmentsCount,
                todayWaitingCount,
                todayInProgressCount,
                todayCompletedCount,
                totalCompletedCount,
                (int) totalAppointments,
                todayRevenue != null ? todayRevenue : BigDecimal.ZERO,
                lifetimeRevenue != null ? lifetimeRevenue : BigDecimal.ZERO,
                rating,
                consultations
        );
        dto.setReviewCount(reviewCount);
        return dto;
    }

    /**
     * Gets the weekly schedule slots configured for the doctor.
     * Seeds standard clinical hours if none are configured yet.
     */
    public List<DoctorScheduleConfigDto> getDoctorSchedules(UUID doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new com.mediassist.common.AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        List<DoctorScheduleSlot> slots = doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profile.getId());
        // Seed defaults only for a doctor who never saved a schedule; an all-off week must stay all-off.
        if ((slots == null || slots.isEmpty()) && !doctorScheduleSlotRepository.existsByDoctorProfileId(profile.getId())) {
            slots = initializeDefaultDoctorSchedules(profile);
        }
        if (slots == null) {
            slots = Collections.emptyList();
        }

        int bufferMinutes = profile.getBufferTimeMinutes();
        return slots.stream()
                .sorted(Comparator.comparing(DoctorScheduleSlot::getDayOfWeek)
                        .thenComparing(DoctorScheduleSlot::getStartTime))
                .map(slot -> DoctorScheduleConfigDto.fromEntity(slot, bufferMinutes))
                .collect(Collectors.toList());
    }

    public DoctorScheduleBundleDto getDoctorScheduleBundle(UUID doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        List<DoctorScheduleConfigDto> weeklySlots = getDoctorSchedules(doctorUserId);
        List<ScheduleExceptionDto> exceptions = getDoctorScheduleExceptions(doctorUserId, false);
        return new DoctorScheduleBundleDto(
                profile.getSlotDurationMinutes(),
                profile.getBufferTimeMinutes(),
                weeklySlots,
                exceptions,
                Collections.emptyList()
        );
    }

    @Transactional
    public List<DoctorScheduleSlot> initializeDefaultDoctorSchedules(DoctorProfile profile) {
        List<DoctorScheduleSlot> existing = doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profile.getId());
        if (existing != null && !existing.isEmpty()) {
            return existing;
        }

        int duration = profile.getSlotDurationMinutes();
        List<DoctorScheduleSlot> defaultSlots = new ArrayList<>();
        DayOfWeek[] weekdays = {
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY
        };
        for (DayOfWeek day : weekdays) {
            defaultSlots.add(new DoctorScheduleSlot(profile, day, LocalTime.of(8, 0), LocalTime.of(12, 0), duration, true));
            if (day != DayOfWeek.SATURDAY) {
                defaultSlots.add(new DoctorScheduleSlot(profile, day, LocalTime.of(13, 30), LocalTime.of(17, 0), duration, true));
            }
        }
        List<DoctorScheduleSlot> saved = doctorScheduleSlotRepository.saveAll(defaultSlots);
        return (saved != null && !saved.isEmpty()) ? saved : defaultSlots;
    }

    /**
     * Updates doctor weekly working hours and schedule slots.
     */
    @Transactional
    public List<DoctorScheduleConfigDto> updateDoctorSchedules(UUID doctorUserId, UpdateDoctorScheduleRequest req) {
        if (req == null || req.getSlots() == null) {
            return getDoctorSchedules(doctorUserId);
        }
        return updateDoctorScheduleBundle(doctorUserId, req).getWeeklySlots();
    }

    @Transactional
    public DoctorScheduleBundleDto updateDoctorScheduleBundle(UUID doctorUserId, UpdateDoctorScheduleRequest req) {
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        if (req == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT", "Dữ liệu cập nhật lịch không được để trống.");
        }

        List<UpdateDoctorScheduleRequest.SlotItem> rawItems = req.getSlots() != null ? req.getSlots() : Collections.emptyList();

        int resolvedDuration = resolveAndValidateDuration(req.getSlotDurationMinutes(), rawItems, profile.getSlotDurationMinutes());
        int resolvedBuffer = resolveAndValidateBuffer(req.getBufferTimeMinutes(), profile.getBufferTimeMinutes());

        Map<DayOfWeek, List<ShiftWindow>> activeByDay = new EnumMap<>(DayOfWeek.class);
        for (UpdateDoctorScheduleRequest.SlotItem item : rawItems) {
            if (item == null || !item.isActive()) {
                continue;
            }
            if (item.getDayOfWeek() == null || item.getStartTime() == null || item.getEndTime() == null) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_TIME", "Vui lòng nhập đầy đủ thứ và thời gian bắt đầu/kết thúc cho mọi ca làm việc.");
            }
            activeByDay.computeIfAbsent(item.getDayOfWeek(), k -> new ArrayList<>())
                    .add(new ShiftWindow(item.getStartTime(), item.getEndTime(), resolvedDuration));
        }

        for (Map.Entry<DayOfWeek, List<ShiftWindow>> entry : activeByDay.entrySet()) {
            validateDayShifts(formatDayLabel(entry.getKey()), entry.getValue(), resolvedDuration);
        }

        List<ScheduleConflictDto> conflicts = findWeeklyConflicts(doctorUserId, profile.getId(), activeByDay, resolvedDuration);
        if (!conflicts.isEmpty() && !req.isForce()) {
            throw new AppException(
                    HttpStatus.CONFLICT,
                    "SCHEDULE_CONFLICT_WARNING",
                    "Thay đổi lịch làm việc này ảnh hưởng đến " + conflicts.size() + " lịch hẹn đã được bệnh nhân đặt trước.",
                    buildConflictDetails(conflicts)
            );
        }

        profile.setSlotDurationMinutes(resolvedDuration);
        profile.setBufferTimeMinutes(resolvedBuffer);
        doctorProfileRepository.save(profile);

        List<DoctorScheduleSlot> existing = doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profile.getId());
        if (existing != null && !existing.isEmpty()) {
            for (DoctorScheduleSlot slot : existing) {
                slot.setActive(false);
            }
            doctorScheduleSlotRepository.saveAll(existing);
        }

        List<DoctorScheduleSlot> newSlots = new ArrayList<>();
        for (Map.Entry<DayOfWeek, List<ShiftWindow>> entry : activeByDay.entrySet()) {
            for (ShiftWindow win : entry.getValue()) {
                newSlots.add(new DoctorScheduleSlot(
                        profile,
                        entry.getKey(),
                        win.startTime,
                        win.endTime,
                        resolvedDuration,
                        true
                ));
            }
        }

        List<DoctorScheduleSlot> saved = newSlots.isEmpty()
                ? Collections.emptyList()
                : doctorScheduleSlotRepository.saveAll(newSlots);
        evictScheduleCache(profile.getId());

        List<DoctorScheduleConfigDto> weeklyDtos = saved.stream()
                .sorted(Comparator.comparing(DoctorScheduleSlot::getDayOfWeek)
                        .thenComparing(DoctorScheduleSlot::getStartTime))
                .map(slot -> DoctorScheduleConfigDto.fromEntity(slot, resolvedBuffer))
                .collect(Collectors.toList());

        List<ScheduleExceptionDto> exceptions = getDoctorScheduleExceptions(doctorUserId, false);
        return new DoctorScheduleBundleDto(resolvedDuration, resolvedBuffer, weeklyDtos, exceptions, conflicts);
    }

    @Transactional(readOnly = true)
    public List<ScheduleExceptionDto> getDoctorScheduleExceptions(UUID doctorUserId, boolean includePast) {
        if (doctorScheduleExceptionRepository == null) {
            return Collections.emptyList();
        }
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        List<DoctorScheduleException> rows = includePast
                ? doctorScheduleExceptionRepository.findByDoctorProfileIdOrderByExceptionDateAsc(profile.getId())
                : doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(profile.getId(), LocalDate.now());

        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }
        return rows.stream().map(this::toExceptionDto).collect(Collectors.toList());
    }

    @Transactional
    public ScheduleExceptionDto upsertScheduleException(UUID doctorUserId, UpsertScheduleExceptionRequest req) {
        if (doctorScheduleExceptionRepository == null) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "SCHEDULE_EXCEPTION_UNAVAILABLE", "Chức năng ngoại lệ lịch chưa sẵn sàng.");
        }
        if (req == null || req.getExceptionDate() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_ARGUMENT", "Vui lòng chọn ngày ngoại lệ hợp lệ.");
        }
        LocalDate date = req.getExceptionDate();
        if (date.isBefore(LocalDate.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PAST_DATE", "Không thể thiết lập ngoại lệ cho ngày trong quá khứ.");
        }

        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        int duration = profile.getSlotDurationMinutes();
        List<ShiftWindow> parsedShifts = new ArrayList<>();
        if (!req.isDayOff()) {
            List<ScheduleShiftDto> rawShifts = req.getCustomShifts() != null ? req.getCustomShifts() : Collections.emptyList();
            if (rawShifts.isEmpty()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_TIME", "Vui lòng thêm ít nhất một khung giờ làm việc cho ngày chỉnh giờ riêng.");
            }
            for (ScheduleShiftDto item : rawShifts) {
                LocalTime start = parseShiftTime(item != null ? item.getStartTime() : null);
                LocalTime end = parseShiftTime(item != null ? item.getEndTime() : null);
                parsedShifts.add(new ShiftWindow(start, end, duration));
            }
            validateDayShifts("ngày " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), parsedShifts, duration);
        }

        List<ScheduleConflictDto> conflicts = findExceptionConflicts(doctorUserId, date, req.isDayOff(), parsedShifts, duration);
        if (!conflicts.isEmpty() && !req.isForce()) {
            throw new AppException(
                    HttpStatus.CONFLICT,
                    "SCHEDULE_CONFLICT_WARNING",
                    "Thay đổi ngày " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " ảnh hưởng đến " + conflicts.size() + " lịch hẹn đã được bệnh nhân đặt trước.",
                    buildConflictDetails(conflicts)
            );
        }

        List<ScheduleShiftDto> normalizedShiftDtos = parsedShifts.stream()
                .map(w -> new ScheduleShiftDto(formatHm(w.startTime), formatHm(w.endTime)))
                .collect(Collectors.toList());

        DoctorScheduleException entity = doctorScheduleExceptionRepository
                .findByDoctorProfileIdAndExceptionDate(profile.getId(), date)
                .orElseGet(() -> {
                    DoctorScheduleException created = new DoctorScheduleException();
                    created.setDoctorProfile(profile);
                    created.setExceptionDate(date);
                    return created;
                });

        entity.setDayOff(req.isDayOff());
        entity.setCustomShiftsJson(serializeShifts(normalizedShiftDtos));
        entity.setReason(req.getReason() != null && !req.getReason().isBlank() ? req.getReason().trim() : null);

        DoctorScheduleException saved = doctorScheduleExceptionRepository.save(entity);
        evictScheduleCache(profile.getId());
        return toExceptionDto(saved);
    }

    @Transactional
    public void deleteScheduleException(UUID doctorUserId, UUID exceptionId) {
        if (doctorScheduleExceptionRepository == null) {
            return;
        }
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        DoctorScheduleException ex = doctorScheduleExceptionRepository
                .findByIdAndDoctorProfileId(exceptionId, profile.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy ngày ngoại lệ cần xóa."));
        doctorScheduleExceptionRepository.delete(ex);
        evictScheduleCache(profile.getId());
    }

    private int resolveAndValidateDuration(Integer requested, List<UpdateDoctorScheduleRequest.SlotItem> items, int currentDefault) {
        Integer candidate = requested;
        if (candidate == null && items != null) {
            candidate = items.stream()
                    .filter(i -> i != null && i.isActive() && i.getSlotDurationMinutes() > 0)
                    .map(UpdateDoctorScheduleRequest.SlotItem::getSlotDurationMinutes)
                    .findFirst()
                    .orElse(null);
        }
        int resolved = candidate != null ? candidate : (currentDefault > 0 ? currentDefault : 30);
        if (!ALLOWED_SLOT_DURATIONS.contains(resolved)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_CONFIG",
                    "Thời lượng mỗi ca chỉ hỗ trợ 15, 20, 30, 45 hoặc 60 phút.");
        }
        return resolved;
    }

    private int resolveAndValidateBuffer(Integer requested, int currentDefault) {
        int resolved = requested != null ? requested : Math.max(0, currentDefault);
        if (!ALLOWED_BUFFER_MINUTES.contains(resolved)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_CONFIG",
                    "Thời gian nghỉ giữa ca chỉ hỗ trợ 0, 5, 10, 15, 20 hoặc 30 phút.");
        }
        return resolved;
    }

    private void validateDayShifts(String dayLabel, List<ShiftWindow> shifts, int durationMinutes) {
        if (shifts == null || shifts.isEmpty()) return;
        shifts.sort(Comparator.comparing(s -> s.startTime));
        for (int i = 0; i < shifts.size(); i++) {
            ShiftWindow curr = shifts.get(i);
            if (curr.startTime == null || curr.endTime == null || !curr.endTime.isAfter(curr.startTime)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_TIME",
                        "Giờ kết thúc phải lớn hơn giờ bắt đầu tại " + dayLabel + ".");
            }
            if (Duration.between(curr.startTime, curr.endTime).toMinutes() < durationMinutes) {
                throw new AppException(HttpStatus.BAD_REQUEST, "SHIFT_TOO_SHORT",
                        "Khung giờ " + formatHm(curr.startTime) + "–" + formatHm(curr.endTime)
                                + " tại " + dayLabel + " ngắn hơn thời lượng một ca (" + durationMinutes + " phút).");
            }
            if (i > 0) {
                ShiftWindow prev = shifts.get(i - 1);
                if (curr.startTime.isBefore(prev.endTime)) {
                    throw new AppException(HttpStatus.BAD_REQUEST, "SHIFT_OVERLAP",
                            "Các khung giờ tại " + dayLabel + " đang bị chồng chéo ("
                                    + formatHm(prev.startTime) + "–" + formatHm(prev.endTime)
                                    + " và " + formatHm(curr.startTime) + "–" + formatHm(curr.endTime) + ").");
                }
            }
        }
    }

    private List<ScheduleConflictDto> findWeeklyConflicts(UUID doctorUserId, UUID profileId,
                                                            Map<DayOfWeek, List<ShiftWindow>> activeByDay, int fallbackDuration) {
        List<Appointment> upcoming = appointmentRepository.findUpcomingActiveAppointmentsByDoctor(doctorUserId, LocalDateTime.now());
        if (upcoming == null || upcoming.isEmpty()) {
            return Collections.emptyList();
        }
        Map<LocalDate, DoctorScheduleException> exceptionByDate = new HashMap<>();
        if (doctorScheduleExceptionRepository != null) {
            List<DoctorScheduleException> exList = doctorScheduleExceptionRepository
                    .findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(profileId, LocalDate.now());
            if (exList != null) {
                for (DoctorScheduleException ex : exList) {
                    exceptionByDate.put(ex.getExceptionDate(), ex);
                }
            }
        }

        List<ScheduleConflictDto> conflicts = new ArrayList<>();
        for (Appointment appt : upcoming) {
            if (appt.getStatus() != null && !ACTIVE_BOOKING_STATUSES.contains(appt.getStatus())) continue;
            LocalDateTime start = appt.getScheduledStart();
            if (start == null) continue;
            LocalDate apptDate = start.toLocalDate();
            if (exceptionByDate.containsKey(apptDate)) {
                continue; // governed by Date Override exception rather than weekly template
            }
            List<ShiftWindow> dayShifts = activeByDay.getOrDefault(apptDate.getDayOfWeek(), Collections.emptyList());
            LocalDateTime end = appt.getScheduledEnd() != null ? appt.getScheduledEnd() : start.plusMinutes(fallbackDuration);
            boolean covered = isCoveredByShifts(start, end, dayShifts);
            if (!covered) {
                conflicts.add(new ScheduleConflictDto(
                        appt.getId(),
                        appt.getAppointmentCode(),
                        appt.getPatient() != null ? appt.getPatient().getFullName() : "Bệnh nhân",
                        start,
                        end,
                        appt.getStatus() != null ? appt.getStatus().name() : "SCHEDULED",
                        dayShifts.isEmpty()
                                ? "Ngày " + formatDayLabel(apptDate.getDayOfWeek()) + " được chuyển sang Nghỉ"
                                : "Nằm ngoài khung giờ mới của " + formatDayLabel(apptDate.getDayOfWeek())
                ));
            }
        }
        return conflicts;
    }

    private List<ScheduleConflictDto> findExceptionConflicts(UUID doctorUserId, LocalDate date, boolean dayOff,
                                                               List<ShiftWindow> customShifts, int fallbackDuration) {
        List<Appointment> dayAppts = appointmentRepository.findActiveAppointmentsByDoctorWithPatientInRange(
                doctorUserId, date.atStartOfDay(), date.atTime(23, 59, 59));
        if (dayAppts == null || dayAppts.isEmpty()) {
            return Collections.emptyList();
        }
        List<ScheduleConflictDto> conflicts = new ArrayList<>();
        String formattedDate = date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        for (Appointment appt : dayAppts) {
            if (appt.getStatus() != null && !ACTIVE_BOOKING_STATUSES.contains(appt.getStatus())) continue;
            LocalDateTime start = appt.getScheduledStart();
            if (start == null) continue;
            LocalDateTime end = appt.getScheduledEnd() != null ? appt.getScheduledEnd() : start.plusMinutes(fallbackDuration);
            boolean covered = !dayOff && isCoveredByShifts(start, end, customShifts);
            if (!covered) {
                conflicts.add(new ScheduleConflictDto(
                        appt.getId(),
                        appt.getAppointmentCode(),
                        appt.getPatient() != null ? appt.getPatient().getFullName() : "Bệnh nhân",
                        start,
                        end,
                        appt.getStatus() != null ? appt.getStatus().name() : "SCHEDULED",
                        dayOff ? "Bác sĩ đánh dấu nghỉ ngày " + formattedDate : "Nằm ngoài giờ làm việc riêng ngày " + formattedDate
                ));
            }
        }
        return conflicts;
    }

    private boolean isCoveredByShifts(LocalDateTime start, LocalDateTime end, List<ShiftWindow> shifts) {
        if (shifts == null || shifts.isEmpty() || start == null || end == null) {
            return false;
        }
        if (!end.toLocalDate().equals(start.toLocalDate())) {
            return false;
        }
        LocalTime startTime = start.toLocalTime();
        LocalTime endTime = end.toLocalTime();
        return shifts.stream().anyMatch(shift ->
                !startTime.isBefore(shift.startTime) && !endTime.isAfter(shift.endTime)
        );
    }

    private Map<String, Object> buildConflictDetails(List<ScheduleConflictDto> conflicts) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("conflictCount", conflicts.size());
        details.put("conflicts", conflicts);
        return details;
    }

    private CachedScheduleMeta getOrLoadScheduleMeta(DoctorProfile profile) {
        String key = CACHE_SCHEDULE_META_PREFIX + profile.getId();
        if (cacheService != null) {
            CachedScheduleMeta cached = cacheService.get(key, CachedScheduleMeta.class);
            if (cached != null) {
                return cached;
            }
        }

        List<DoctorScheduleSlot> weekly = doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profile.getId());
        if ((weekly == null || weekly.isEmpty()) && !doctorScheduleSlotRepository.existsByDoctorProfileId(profile.getId())) {
            weekly = initializeDefaultDoctorSchedules(profile);
        }
        if (weekly == null) weekly = Collections.emptyList();

        List<DoctorScheduleException> exceptions = doctorScheduleExceptionRepository != null
                ? doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(profile.getId(), LocalDate.now())
                : Collections.emptyList();
        if (exceptions == null) exceptions = Collections.emptyList();

        CachedScheduleMeta meta = new CachedScheduleMeta();
        meta.setSlotDurationMinutes(profile.getSlotDurationMinutes());
        meta.setBufferTimeMinutes(profile.getBufferTimeMinutes());
        meta.setWeeklySlots(weekly.stream().map(slot -> new CachedWeeklySlot(
                slot.getDayOfWeek().name(),
                formatHm(slot.getStartTime()),
                formatHm(slot.getEndTime()),
                slot.getSlotDurationMinutes()
        )).collect(Collectors.toList()));
        meta.setExceptions(exceptions.stream().map(ex -> new CachedException(
                ex.getExceptionDate().toString(),
                ex.isDayOff(),
                parseShiftsJson(ex.getCustomShiftsJson())
        )).collect(Collectors.toList()));

        if (cacheService != null) {
            cacheService.set(key, meta, SCHEDULE_META_TTL_SECONDS);
        }
        return meta;
    }

    private void evictScheduleCache(UUID profileId) {
        if (cacheService != null && profileId != null) {
            cacheService.evict(CACHE_SCHEDULE_META_PREFIX + profileId);
        }
    }

    private ScheduleExceptionDto toExceptionDto(DoctorScheduleException ex) {
        return new ScheduleExceptionDto(
                ex.getId(),
                ex.getExceptionDate(),
                ex.isDayOff(),
                ex.isDayOff() ? Collections.emptyList() : parseShiftsJson(ex.getCustomShiftsJson()),
                ex.getReason(),
                ex.getCreatedAt()
        );
    }

    private List<ScheduleShiftDto> parseShiftsJson(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            List<ScheduleShiftDto> list = jsonMapper.readValue(json, new TypeReference<List<ScheduleShiftDto>>() {});
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String serializeShifts(List<ScheduleShiftDto> shifts) {
        if (shifts == null || shifts.isEmpty()) return "[]";
        try {
            return jsonMapper.writeValueAsString(shifts);
        } catch (Exception e) {
            return "[]";
        }
    }

    private LocalTime parseShiftTime(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_TIME", "Khung giờ làm việc không được để trống.");
        }
        try {
            String trimmed = raw.trim();
            return LocalTime.parse(trimmed.length() == 5 ? trimmed : trimmed.substring(0, Math.min(8, trimmed.length())));
        } catch (Exception e) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_SCHEDULE_TIME", "Định dạng giờ không hợp lệ: " + raw);
        }
    }

    private static String formatHm(LocalTime t) {
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    private static String formatDayLabel(DayOfWeek day) {
        if (day == null) return "";
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }

    private static class ShiftWindow {
        final LocalTime startTime;
        final LocalTime endTime;
        final int slotDurationMinutes;

        ShiftWindow(LocalTime startTime, LocalTime endTime, int slotDurationMinutes) {
            this.startTime = startTime;
            this.endTime = endTime;
            this.slotDurationMinutes = slotDurationMinutes;
        }
    }

    public static class CachedScheduleMeta {
        private int slotDurationMinutes = 30;
        private int bufferTimeMinutes = 0;
        private List<CachedWeeklySlot> weeklySlots = new ArrayList<>();
        private List<CachedException> exceptions = new ArrayList<>();

        public CachedScheduleMeta() {}

        public int getSlotDurationMinutes() { return slotDurationMinutes; }
        public void setSlotDurationMinutes(int slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }

        public int getBufferTimeMinutes() { return bufferTimeMinutes; }
        public void setBufferTimeMinutes(int bufferTimeMinutes) { this.bufferTimeMinutes = bufferTimeMinutes; }

        public List<CachedWeeklySlot> getWeeklySlots() { return weeklySlots; }
        public void setWeeklySlots(List<CachedWeeklySlot> weeklySlots) { this.weeklySlots = weeklySlots != null ? weeklySlots : new ArrayList<>(); }

        public List<CachedException> getExceptions() { return exceptions; }
        public void setExceptions(List<CachedException> exceptions) { this.exceptions = exceptions != null ? exceptions : new ArrayList<>(); }
    }

    public static class CachedWeeklySlot {
        private String dayOfWeek;
        private String startTime;
        private String endTime;
        private int slotDurationMinutes;

        public CachedWeeklySlot() {}

        public CachedWeeklySlot(String dayOfWeek, String startTime, String endTime, int slotDurationMinutes) {
            this.dayOfWeek = dayOfWeek;
            this.startTime = startTime;
            this.endTime = endTime;
            this.slotDurationMinutes = slotDurationMinutes;
        }

        public String getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }

        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }

        public int getSlotDurationMinutes() { return slotDurationMinutes; }
        public void setSlotDurationMinutes(int slotDurationMinutes) { this.slotDurationMinutes = slotDurationMinutes; }
    }

    public static class CachedException {
        private String exceptionDate;
        private boolean dayOff;
        private List<ScheduleShiftDto> shifts = new ArrayList<>();

        public CachedException() {}

        public CachedException(String exceptionDate, boolean dayOff, List<ScheduleShiftDto> shifts) {
            this.exceptionDate = exceptionDate;
            this.dayOff = dayOff;
            this.shifts = shifts != null ? shifts : new ArrayList<>();
        }

        public String getExceptionDate() { return exceptionDate; }
        public void setExceptionDate(String exceptionDate) { this.exceptionDate = exceptionDate; }

        public boolean isDayOff() { return dayOff; }
        public void setDayOff(boolean dayOff) { this.dayOff = dayOff; }

        public List<ScheduleShiftDto> getShifts() { return shifts; }
        public void setShifts(List<ScheduleShiftDto> shifts) { this.shifts = shifts != null ? shifts : new ArrayList<>(); }
    }

    /**
     * Lấy danh bạ người bệnh mà bác sĩ từng khám hoặc có lịch hẹn, kèm hồ sơ lâm sàng tóm tắt.
     */
    @Transactional(readOnly = true)
    public List<DoctorPatientItemDto> getDoctorPatients(UUID doctorUserId) {
        List<Appointment> appointments = appointmentRepository.findByDoctorIdWithUsersOrderByScheduledStartDesc(doctorUserId);
        if (appointments == null || appointments.isEmpty()) {
            return Collections.emptyList();
        }

        // Group appointments by patient ID preserving order
        Map<UUID, List<Appointment>> byPatient = appointments.stream()
                .filter(a -> a.getPatient() != null)
                .collect(Collectors.groupingBy(a -> a.getPatient().getId(), LinkedHashMap::new, Collectors.toList()));

        List<DoctorPatientItemDto> result = new ArrayList<>();
        for (Map.Entry<UUID, List<Appointment>> entry : byPatient.entrySet()) {
            UUID patientId = entry.getKey();
            List<Appointment> patientAppts = entry.getValue();
            Appointment latestAppt = patientAppts.get(0); // Ordered by scheduledStart DESC
            User patientUser = latestAppt.getPatient();

            DoctorPatientItemDto dto = new DoctorPatientItemDto();
            dto.setPatientId(patientId);
            dto.setFullName(patientUser.getFullName());
            dto.setEmail(patientUser.getEmail());
            dto.setPhone(patientUser.getPhone());
            dto.setTotalVisits(patientAppts.size());
            dto.setLastVisitDate(latestAppt.getScheduledStart());
            dto.setLastStatus(latestAppt.getStatus() != null ? latestAppt.getStatus().name() : "SCHEDULED");
            dto.setLastIcd10Code(latestAppt.getIcd10Code());
            dto.setLastIcdCode(latestAppt.getIcdCode());
            dto.setLastIcdVersion(latestAppt.getIcdVersion());
            dto.setLastIcd10Name(latestAppt.getIcd10Name());
            dto.setLastChiefComplaint(latestAppt.getChiefComplaint());

            // Fetch patient profile if exists
            Optional<PatientProfile> profileOpt = patientProfileRepository.findByUserId(patientId);
            if (profileOpt.isPresent()) {
                PatientProfile p = profileOpt.get();
                dto.setPatientCode(p.getPatientCode());
                dto.setGender(p.getGender());
                dto.setBloodGroup(p.getBloodGroup());
                dto.setDateOfBirth(p.getDateOfBirth());
                dto.setAllergies(p.getAllergies());
                dto.setMedicalHistory(p.getMedicalHistory());
            } else {
                dto.setPatientCode("BN-" + patientId.toString().substring(0, 8).toUpperCase());
                dto.setGender("OTHER");
                dto.setBloodGroup("O+");
                dto.setAllergies("Chưa ghi nhận tiền sử dị ứng thuốc");
                dto.setMedicalHistory("Chưa ghi nhận bệnh lý mãn tính");
            }
            result.add(dto);
        }
        return result;
    }

    /**
     * Bác sĩ bấm Gọi Bệnh Nhân Kế Tiếp: Tự động tiếp nhận ca SCHEDULED sớm nhất hôm nay sang IN_PROGRESS.
     */
    @Transactional
    public AppointmentDto callNextPatient(UUID doctorUserId) {
        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.atTime(23, 59, 59);

        List<Appointment> todayAppointments = appointmentRepository.findTodayAppointmentsByDoctorWithUsers(
                doctorUserId, dayStart, dayEnd
        );

        if (todayAppointments == null || todayAppointments.isEmpty()) {
            throw new AppException(HttpStatus.NOT_FOUND, "NO_PATIENTS_TODAY", "Không có bệnh nhân nào trong danh sách khám hôm nay.");
        }

        // Nếu đã có ca IN_PROGRESS đang khám dở, tiếp tục trả về ca đó để bác sĩ không mất dấu
        Optional<Appointment> inProgressOpt = todayAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.IN_PROGRESS)
                .findFirst();

        if (inProgressOpt.isPresent()) {
            return AppointmentDto.fromEntity(inProgressOpt.get());
        }

        // 1. Ưu tiên lấy ca CHECKED_IN sớm nhất trước bằng khóa bi quan
        List<Appointment> locked = appointmentRepository.findNextByStatusWithLock(
                doctorUserId, AppointmentStatus.CHECKED_IN, dayStart, dayEnd, org.springframework.data.domain.PageRequest.of(0, 1)
        );

        if (locked == null || locked.isEmpty()) {
            locked = todayAppointments.stream()
                    .filter(a -> a.getStatus() == AppointmentStatus.CHECKED_IN)
                    .findFirst()
                    .map(List::of)
                    .orElse(Collections.emptyList());
        }

        // 2. Nếu không có ca CHECKED_IN nào trong ngày mới lấy ca SCHEDULED
        if (locked.isEmpty()) {
            locked = appointmentRepository.findNextScheduledWithLock(
                    doctorUserId, dayStart, dayEnd, org.springframework.data.domain.PageRequest.of(0, 1)
            );

            if (locked == null || locked.isEmpty()) {
                locked = todayAppointments.stream()
                        .filter(a -> a.getStatus() == AppointmentStatus.SCHEDULED)
                        .findFirst()
                        .map(List::of)
                        .orElse(Collections.emptyList());
            }
        }

        if (locked.isEmpty()) {
            throw new AppException(HttpStatus.NOT_FOUND, "QUEUE_EMPTY", "Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay.");
        }

        Appointment nextAppointment = locked.get(0);
        nextAppointment.setStatus(AppointmentStatus.IN_PROGRESS);
        Appointment saved = appointmentRepository.save(nextAppointment);
        log.info("🔔 Doctor {} called next patient: {} (Code: {}, PrevStatus: {})",
                doctorUserId, saved.getPatient().getFullName(), saved.getAppointmentCode(), nextAppointment.getStatus());
        return AppointmentDto.fromEntity(saved);
    }
}
