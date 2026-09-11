package com.mediassist;

import com.mediassist.dto.PatientProfileDto;
import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.PatientProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientProfileServiceTest {

    @Mock
    private PatientProfileRepository patientProfileRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PatientProfileService patientProfileService;

    private User patientUser;
    private PatientProfile profile;

    @BeforeEach
    void setUp() {
        patientUser = User.builder()
                .id(UUID.randomUUID())
                .email("patient@mediassist.local")
                .fullName("Trần Thị Bình")
                .phone("0987654321")
                .role(Role.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        profile = new PatientProfile();
        profile.setId(UUID.randomUUID());
        profile.setUser(patientUser);
        profile.setPatientCode("BN-2026-08492");
        profile.setCitizenId("079188002931");
        profile.setHealthInsuranceNumber("DN4791234567890");
        profile.setBloodGroup("O+");
        profile.setDateOfBirth(LocalDate.of(1988, 10, 15));
        profile.setGender("FEMALE");
        profile.setAllergies("Dị ứng Penicillin");
        profile.setMedicalHistory("Tăng huyết áp");
    }

    @Test
    @DisplayName("Should get existing patient profile successfully")
    void testGetOrCreateProfileForUser_Existing() {
        when(userRepository.findByEmail("patient@mediassist.local")).thenReturn(Optional.of(patientUser));
        when(patientProfileRepository.findByUser(patientUser)).thenReturn(Optional.of(profile));

        PatientProfileDto result = patientProfileService.getOrCreateProfileForUser("patient@mediassist.local");

        assertNotNull(result);
        assertEquals("BN-2026-08492", result.getPatientCode());
        assertEquals("079188002931", result.getCitizenId());
        assertEquals("DN4791234567890", result.getHealthInsuranceNumber());
        assertEquals("O+", result.getBloodGroup());
        assertEquals("Dị ứng Penicillin", result.getAllergies());
    }

    @Test
    @DisplayName("Should update patient profile with allergies and insurance code")
    void testUpdateProfile_Success() {
        when(userRepository.findByEmail("patient@mediassist.local")).thenReturn(Optional.of(patientUser));
        when(patientProfileRepository.findByUser(patientUser)).thenReturn(Optional.of(profile));
        when(patientProfileRepository.save(any(PatientProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        PatientProfileDto updateReq = new PatientProfileDto();
        updateReq.setCitizenId("079188999999");
        updateReq.setHealthInsuranceNumber("DN4799999999999");
        updateReq.setBloodGroup("AB+");
        updateReq.setAllergies("Dị ứng Paracetamol và Penicillin");
        updateReq.setEmergencyContactName("Nguyễn Văn A");
        updateReq.setEmergencyContactPhone("0912345999");
        updateReq.setEmergencyContactRelationship("Anh trai");

        PatientProfileDto result = patientProfileService.updateProfile("patient@mediassist.local", updateReq);

        assertNotNull(result);
        assertEquals("079188999999", result.getCitizenId());
        assertEquals("DN4799999999999", result.getHealthInsuranceNumber());
        assertEquals("AB+", result.getBloodGroup());
        assertEquals("Dị ứng Paracetamol và Penicillin", result.getAllergies());
        assertEquals("Nguyễn Văn A", result.getEmergencyContactName());
        verify(patientProfileRepository, times(1)).save(any(PatientProfile.class));
    }
}
