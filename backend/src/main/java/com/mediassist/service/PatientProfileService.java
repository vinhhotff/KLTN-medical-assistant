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

        if (dto.getCitizenId() != null && !dto.getCitizenId().isBlank()) {
            String cccd = dto.getCitizenId().trim();
            if (!cccd.matches("^\\d{12}$")) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_CITIZEN_ID", "Số CCCD phải bao gồm đúng 12 chữ số.");
            }
            profile.setCitizenId(cccd);
        }
        if (dto.getHealthInsuranceNumber() != null && !dto.getHealthInsuranceNumber().isBlank()) {
            String bhyt = dto.getHealthInsuranceNumber().trim().toUpperCase();
            if (!bhyt.matches("^[A-Z]{2}[A-Z0-9]{10,14}$")) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_BHYT", "Số thẻ BHYT không đúng định dạng (VD: GD1234567890123).");
            }
            profile.setHealthInsuranceNumber(bhyt);
        }
        if (dto.getDateOfBirth() != null) profile.setDateOfBirth(dto.getDateOfBirth());
        if (dto.getGender() != null) profile.setGender(dto.getGender());
        if (dto.getBloodGroup() != null) profile.setBloodGroup(dto.getBloodGroup().trim());
        if (dto.getAddress() != null) profile.setAddress(dto.getAddress().trim());
        if (dto.getAllergies() != null) profile.setAllergies(dto.getAllergies().trim());
        if (dto.getMedicalHistory() != null) profile.setMedicalHistory(dto.getMedicalHistory().trim());
        if (dto.getEmergencyContactName() != null) profile.setEmergencyContactName(dto.getEmergencyContactName().trim());
        if (dto.getEmergencyContactPhone() != null) profile.setEmergencyContactPhone(dto.getEmergencyContactPhone().trim());
        if (dto.getEmergencyContactRelationship() != null) profile.setEmergencyContactRelationship(dto.getEmergencyContactRelationship().trim());

        // Update phone / name in User if provided with validation
        if (dto.getFullName() != null && !dto.getFullName().isBlank()) {
            user.setFullName(dto.getFullName().trim());
        }
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            String phone = dto.getPhone().trim().replaceAll("[\\s\\-\\.]", "");
            if (!phone.matches("^(0|\\+84)(3[2-9]|5[6-9]|7[0-9]|8[1-9]|9[0-9])\\d{7}$")) {
                throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_PHONE", "Số điện thoại không đúng định dạng Việt Nam (VD: 0901234567).");
            }
            user.setPhone(phone);
        }
        userRepository.save(user);

        profile = patientProfileRepository.save(profile);
        log.info("🩺 Patient profile updated for code: {}", profile.getPatientCode());
        return toDto(profile);
    }

    @Transactional
    public PatientProfileDto getProfileByUserId(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        PatientProfile profile = findByUserInternal(user)
                .orElseGet(() -> createInitialProfile(user));

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
        // Generate collision-resistant unique hospital code: BN-2026-XXXXXXXX
        String patientCode;
        int attempts = 0;
        do {
            String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
            patientCode = "BN-2026-" + suffix;
            attempts++;
            if (attempts > 15) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "CODE_GEN_FAILED", "Không thể tạo mã hồ sơ bệnh nhân.");
            }
        } while (patientProfileRepository.existsByPatientCode(patientCode));

        p.setPatientCode(patientCode);
        p.setBloodGroup(null);
        p.setGender(null);
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
