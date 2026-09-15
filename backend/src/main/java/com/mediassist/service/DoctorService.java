package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.dto.DoctorSlotDto;
import com.mediassist.dto.UpdateDoctorProfileRequest;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Specialty;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public DoctorService(DoctorProfileRepository doctorProfileRepository,
                         UserRepository userRepository,
                         SpecialtyRepository specialtyRepository,
                         AppointmentRepository appointmentRepository,
                         TwoLayerCacheService cacheService,
                         DoctorSemanticSearchService doctorSemanticSearchService) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.appointmentRepository = appointmentRepository;
        this.cacheService = cacheService;
        this.doctorSemanticSearchService = doctorSemanticSearchService;
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

        // Standard consultation hours: 08:00 to 12:00 and 13:30 to 17:00 (30 min slots)
        List<DoctorSlotDto> slots = new ArrayList<>();
        LocalTime nowTime = LocalTime.now();
        boolean isToday = date.isEqual(LocalDate.now());

        // Morning slots: 08:00 - 11:30
        addTimeSlots(date, LocalTime.of(8, 0), LocalTime.of(12, 0), bookedTimes, slots, isToday, nowTime);
        // Afternoon slots: 13:30 - 17:00
        addTimeSlots(date, LocalTime.of(13, 30), LocalTime.of(17, 0), bookedTimes, slots, isToday, nowTime);

        return slots;
    }

    private void addTimeSlots(LocalDate date, LocalTime start, LocalTime end, Set<LocalTime> bookedTimes, List<DoctorSlotDto> slots, boolean isToday, LocalTime nowTime) {
        LocalTime current = start;
        while (current.plusMinutes(30).isBefore(end) || current.plusMinutes(30).equals(end)) {
            LocalTime slotEnd = current.plusMinutes(30);
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
}
