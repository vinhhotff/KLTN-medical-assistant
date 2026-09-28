package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.*;
import com.mediassist.model.entity.*;
import com.mediassist.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DoctorService {

    private static final Logger log = LoggerFactory.getLogger(DoctorService.class);
    private static final String CACHE_VERIFIED_DOCTORS = "doctors:verified";

    private final DoctorProfileRepository doctorProfileRepository;
    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final AppointmentRepository appointmentRepository;
    private final TwoLayerCacheService cacheService;
    private final DoctorSemanticSearchService doctorSemanticSearchService;
    private final DoctorScheduleSlotRepository doctorScheduleSlotRepository;
    private final PatientProfileRepository patientProfileRepository;

    public DoctorService(DoctorProfileRepository doctorProfileRepository,
                         UserRepository userRepository,
                         SpecialtyRepository specialtyRepository,
                         AppointmentRepository appointmentRepository,
                         TwoLayerCacheService cacheService,
                         DoctorSemanticSearchService doctorSemanticSearchService,
                         DoctorScheduleSlotRepository doctorScheduleSlotRepository,
                         PatientProfileRepository patientProfileRepository) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.appointmentRepository = appointmentRepository;
        this.cacheService = cacheService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
        this.doctorScheduleSlotRepository = doctorScheduleSlotRepository;
        this.patientProfileRepository = patientProfileRepository;
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
        if (date.isBefore(LocalDate.now())) {
            return Collections.emptyList();
        }

        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorIdentifier)
                .or(() -> doctorProfileRepository.findByIdWithDetails(doctorIdentifier))
                .or(() -> doctorProfileRepository.findByUserId(doctorIdentifier))
                .or(() -> doctorProfileRepository.findById(doctorIdentifier))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bác sĩ không tồn tại"));

        UUID doctorUserId = profile.getUser() != null ? profile.getUser().getId() : doctorIdentifier;

        // Query active appointments on this day
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(23, 59, 59);
        List<Appointment> bookedAppointments = appointmentRepository.findActiveAppointmentsByDoctorAndRange(doctorUserId, dayStart, dayEnd);
        Set<LocalTime> bookedTimes = bookedAppointments.stream()
                .map(a -> a.getScheduledStart().toLocalTime())
                .collect(Collectors.toSet());

        DayOfWeek targetDow = date.getDayOfWeek();
        List<DoctorScheduleSlot> slotConfigs = doctorScheduleSlotRepository
                .findByDoctorProfileIdAndDayOfWeekAndIsActiveTrue(profile.getId(), targetDow);

        if (slotConfigs == null || slotConfigs.isEmpty()) {
            slotConfigs = initializeDefaultDoctorSchedules(profile).stream()
                    .filter(s -> s.getDayOfWeek() == targetDow && s.isActive())
                    .collect(Collectors.toList());
        }

        List<DoctorSlotDto> slots = new ArrayList<>();
        LocalTime nowTime = LocalTime.now();
        boolean isToday = date.isEqual(LocalDate.now());

        for (DoctorScheduleSlot slotConfig : slotConfigs) {
            int duration = slotConfig.getSlotDurationMinutes() > 0 ? slotConfig.getSlotDurationMinutes() : 30;
            addTimeSlots(date, slotConfig.getStartTime(), slotConfig.getEndTime(), duration, bookedTimes, slots, isToday, nowTime);
        }

        slots.sort(Comparator.comparing(DoctorSlotDto::getStartTime));
        return slots;
    }

    private void addTimeSlots(LocalDate date, LocalTime start, LocalTime end, int durationMinutes, Set<LocalTime> bookedTimes, List<DoctorSlotDto> slots, boolean isToday, LocalTime nowTime) {
        LocalTime current = start;
        while (current.plusMinutes(durationMinutes).isBefore(end) || current.plusMinutes(durationMinutes).equals(end)) {
            LocalTime slotEnd = current.plusMinutes(durationMinutes);
            boolean isBooked = bookedTimes.contains(current);
            boolean isPastToday = isToday && current.isBefore(nowTime);
            boolean available = !isBooked && !isPastToday;

            slots.add(new DoctorSlotDto(
                    current,
                    slotEnd,
                    date.atTime(current),
                    date.atTime(slotEnd),
                    available
            ));
            current = slotEnd;
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

        if (req.getBio() != null) profile.setBio(req.getBio());
        if (req.getLicenseNumber() != null) profile.setLicenseNumber(req.getLicenseNumber());
        if (req.getConsultationFee() != null) profile.setConsultationFee(req.getConsultationFee());
        if (req.getYearsOfExperience() != null) profile.setYearsOfExperience(req.getYearsOfExperience());
        if (req.getAcademicTitle() != null) profile.setAcademicTitle(req.getAcademicTitle());
        if (req.getHospitalAffiliation() != null) profile.setHospitalAffiliation(req.getHospitalAffiliation());
        if (req.getDepartment() != null) profile.setDepartment(req.getDepartment());
        if (req.getLicenseIssuedBy() != null) profile.setLicenseIssuedBy(req.getLicenseIssuedBy());

        if (req.getSpecialtySlugs() != null && !req.getSpecialtySlugs().isEmpty()) {
            Set<Specialty> specialties = new HashSet<>();
            for (String slug : req.getSpecialtySlugs()) {
                specialtyRepository.findBySlug(slug).ifPresent(specialties::add);
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

    private void syncDoctorVectorInternal(DoctorProfile profile) {
        try {
            String specNames = profile.getSpecialties() != null
                    ? profile.getSpecialties().stream()
                            .map(Specialty::getName)
                            .collect(Collectors.joining(", "))
                    : "";
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

        return new DoctorStatsDto(
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
        if (slots == null || slots.isEmpty()) {
            slots = initializeDefaultDoctorSchedules(profile);
        }

        return slots.stream()
                .sorted(Comparator.comparing(DoctorScheduleSlot::getDayOfWeek)
                        .thenComparing(DoctorScheduleSlot::getStartTime))
                .map(DoctorScheduleConfigDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<DoctorScheduleSlot> initializeDefaultDoctorSchedules(DoctorProfile profile) {
        List<DoctorScheduleSlot> defaultSlots = new ArrayList<>();
        DayOfWeek[] weekdays = {
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY
        };
        for (DayOfWeek day : weekdays) {
            defaultSlots.add(new DoctorScheduleSlot(profile, day, LocalTime.of(8, 0), LocalTime.of(12, 0), 30, true));
            if (day != DayOfWeek.SATURDAY) {
                defaultSlots.add(new DoctorScheduleSlot(profile, day, LocalTime.of(13, 30), LocalTime.of(17, 0), 30, true));
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
        DoctorProfile profile = doctorProfileRepository.findByUserIdWithDetails(doctorUserId)
                .or(() -> doctorProfileRepository.findByUserId(doctorUserId))
                .orElseThrow(() -> new com.mediassist.common.AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy hồ sơ bác sĩ"));

        if (req == null || req.getSlots() == null) {
            return getDoctorSchedules(doctorUserId);
        }

        List<DoctorScheduleSlot> existing = doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profile.getId());
        if (existing != null && !existing.isEmpty()) {
            for (DoctorScheduleSlot slot : existing) {
                slot.setActive(false);
            }
            doctorScheduleSlotRepository.saveAll(existing);
        }

        List<DoctorScheduleSlot> newSlots = new ArrayList<>();
        for (UpdateDoctorScheduleRequest.SlotItem item : req.getSlots()) {
            if (item.getDayOfWeek() != null && item.getStartTime() != null && item.getEndTime() != null) {
                newSlots.add(new DoctorScheduleSlot(
                        profile,
                        item.getDayOfWeek(),
                        item.getStartTime(),
                        item.getEndTime(),
                        item.getSlotDurationMinutes() > 0 ? item.getSlotDurationMinutes() : 30,
                        item.isActive()
                ));
            }
        }

        List<DoctorScheduleSlot> saved = doctorScheduleSlotRepository.saveAll(newSlots);
        return saved.stream()
                .sorted(Comparator.comparing(DoctorScheduleSlot::getDayOfWeek)
                        .thenComparing(DoctorScheduleSlot::getStartTime))
                .map(DoctorScheduleConfigDto::fromEntity)
                .collect(Collectors.toList());
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

        // Khóa bi quan và lấy ca SCHEDULED sớm nhất trong ngày
        List<Appointment> locked = appointmentRepository.findNextScheduledWithLock(
                doctorUserId, dayStart, dayEnd, org.springframework.data.domain.PageRequest.of(0, 1)
        );

        if (locked == null || locked.isEmpty()) {
            locked = todayAppointments.stream()
                    .filter(a -> a.getStatus() == AppointmentStatus.SCHEDULED)
                    .findFirst()
                    .map(List::of)
                    .orElse(Collections.emptyList());
        }

        if (locked.isEmpty()) {
            throw new AppException(HttpStatus.NOT_FOUND, "QUEUE_EMPTY", "Đã phục vụ hết tất cả bệnh nhân trong hàng đợi hôm nay.");
        }

        Appointment nextScheduled = locked.get(0);
        nextScheduled.setStatus(AppointmentStatus.IN_PROGRESS);
        Appointment saved = appointmentRepository.save(nextScheduled);
        log.info("🔔 Doctor {} called next patient: {} (Code: {})", doctorUserId, saved.getPatient().getFullName(), saved.getAppointmentCode());
        return AppointmentDto.fromEntity(saved);
    }
}
