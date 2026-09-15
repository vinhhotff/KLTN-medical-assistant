package com.mediassist.service;

import com.mediassist.common.AppException;
import com.mediassist.dto.PatientProfileDto;
import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.User;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class PatientProfileService {

    private static final Logger log = LoggerFactory.getLogger(PatientProfileService.class);

    private final PatientProfileRepository patientProfileRepository;
    private final UserRepository userRepository;

    public PatientProfileService(PatientProfileRepository patientProfileRepository, UserRepository userRepository) {
        this.patientProfileRepository = patientProfileRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public PatientProfileDto getOrCreateProfileForUser(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        PatientProfile profile = findByUserInternal(user)
                .orElseGet(() -> createInitialProfile(user));

        return toDto(profile);
    }

    @Transactional
    public PatientProfileDto updateProfile(String userEmail, PatientProfileDto dto) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        PatientProfile profile = findByUserInternal(user)
                .orElseGet(() -> createInitialProfile(user));

        if (dto.getCitizenId() != null) profile.setCitizenId(dto.getCitizenId().trim());
        if (dto.getHealthInsuranceNumber() != null) profile.setHealthInsuranceNumber(dto.getHealthInsuranceNumber().trim());
        if (dto.getDateOfBirth() != null) profile.setDateOfBirth(dto.getDateOfBirth());
        if (dto.getGender() != null) profile.setGender(dto.getGender());
        if (dto.getBloodGroup() != null) profile.setBloodGroup(dto.getBloodGroup().trim());
        if (dto.getAddress() != null) profile.setAddress(dto.getAddress().trim());
        if (dto.getAllergies() != null) profile.setAllergies(dto.getAllergies().trim());
        if (dto.getMedicalHistory() != null) profile.setMedicalHistory(dto.getMedicalHistory().trim());
        if (dto.getEmergencyContactName() != null) profile.setEmergencyContactName(dto.getEmergencyContactName().trim());
        if (dto.getEmergencyContactPhone() != null) profile.setEmergencyContactPhone(dto.getEmergencyContactPhone().trim());
        if (dto.getEmergencyContactRelationship() != null) profile.setEmergencyContactRelationship(dto.getEmergencyContactRelationship().trim());

        // Update phone / name in User if provided
        if (dto.getFullName() != null && !dto.getFullName().isBlank()) {
            user.setFullName(dto.getFullName().trim());
        }
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            user.setPhone(dto.getPhone().trim());
        }
        userRepository.save(user);

        profile = patientProfileRepository.save(profile);
        log.info("🩺 Patient profile updated for code: {}", profile.getPatientCode());
        return toDto(profile);
    }

    @Transactional(readOnly = true)
    public PatientProfileDto getProfileByUserId(UUID userId) {
        PatientProfile profile = findByUserIdInternal(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "PROFILE_NOT_FOUND", "Chưa có hồ sơ bệnh án cho bệnh nhân này"));
        return toDto(profile);
    }

    private Optional<PatientProfile> findByUserInternal(User user) {
        try {
            Optional<PatientProfile> opt = patientProfileRepository.findByUserWithUser(user);
            if (opt != null && opt.isPresent()) return opt;
        } catch (Exception ignored) {}
        return patientProfileRepository.findByUser(user);
    }

    private Optional<PatientProfile> findByUserIdInternal(UUID userId) {
        try {
            Optional<PatientProfile> opt = patientProfileRepository.findByUserIdWithUser(userId);
            if (opt != null && opt.isPresent()) return opt;
        } catch (Exception ignored) {}
        return patientProfileRepository.findByUserId(userId);
    }

    private PatientProfile createInitialProfile(User user) {
        PatientProfile p = new PatientProfile();
        p.setUser(user);
        // Generate unique hospital code: BN-2026-XXXX
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        p.setPatientCode("BN-2026-" + uniqueSuffix);
        p.setBloodGroup("O+");
        p.setGender("OTHER");
        p.setAddress("TP. Hồ Chí Minh, Việt Nam");
        p.setAllergies("Chưa ghi nhận tiền sử dị ứng thuốc");
        p.setMedicalHistory("Chưa ghi nhận bệnh mạn tính");
        return patientProfileRepository.save(p);
    }

    private PatientProfileDto toDto(PatientProfile p) {
        PatientProfileDto dto = new PatientProfileDto();
        dto.setId(p.getId());
        dto.setPatientCode(p.getPatientCode());
        if (p.getUser() != null) {
            dto.setUserId(p.getUser().getId());
            dto.setFullName(p.getUser().getFullName());
            dto.setEmail(p.getUser().getEmail());
            dto.setPhone(p.getUser().getPhone());
        }
        dto.setCitizenId(p.getCitizenId());
        dto.setHealthInsuranceNumber(p.getHealthInsuranceNumber());
        dto.setDateOfBirth(p.getDateOfBirth());
        dto.setGender(p.getGender());
        dto.setBloodGroup(p.getBloodGroup());
        dto.setAddress(p.getAddress());
        dto.setAllergies(p.getAllergies());
        dto.setMedicalHistory(p.getMedicalHistory());
        dto.setEmergencyContactName(p.getEmergencyContactName());
        dto.setEmergencyContactPhone(p.getEmergencyContactPhone());
        dto.setEmergencyContactRelationship(p.getEmergencyContactRelationship());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        return dto;
    }
}
