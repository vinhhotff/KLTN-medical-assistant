package com.mediassist.service;

import com.mediassist.dto.AdminCreateDoctorRequest;
import com.mediassist.dto.AdminUpdateDoctorRequest;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.model.entity.AuditLog;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.Role;
import com.mediassist.model.entity.Specialty;
import com.mediassist.model.entity.User;
import com.mediassist.model.entity.UserStatus;
import com.mediassist.repository.AuditLogRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminVettingServiceTest {

    @Mock
    private DoctorProfileRepository doctorProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SpecialtyRepository specialtyRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private TwoLayerCacheService cacheService;

    @Mock
    private DoctorSemanticSearchService doctorSemanticSearchService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminVettingService adminVettingService;

    private User doctorUser;
    private DoctorProfile doctorProfile;
    private UUID adminId;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();

        doctorUser = new User();
        doctorUser.setId(UUID.randomUUID());
        doctorUser.setEmail("doctor.nguyen@mediassist.local");
        doctorUser.setFullName("TS.BS Nguyễn Văn An");
        doctorUser.setPhone("0901234567");
        doctorUser.setRole(Role.DOCTOR);
        doctorUser.setStatus(UserStatus.ACTIVE);

        doctorProfile = new DoctorProfile();
        doctorProfile.setId(UUID.randomUUID());
        doctorProfile.setUser(doctorUser);
        doctorProfile.setAcademicTitle("TS.BS");
        doctorProfile.setHospitalAffiliation("BV Chợ Rẫy");
        doctorProfile.setDepartment("Khoa Tim mạch");
        doctorProfile.setLicenseNumber("CCHN-00129");
        doctorProfile.setConsultationFee(BigDecimal.valueOf(400000));
        doctorProfile.setYearsOfExperience(15);
        doctorProfile.setVerified(true);
    }

    @Test
    @DisplayName("Should return all doctors with user status and details")
    void testGetAllDoctors() {
        when(doctorProfileRepository.findAll()).thenReturn(List.of(doctorProfile));

        List<DoctorDetailDto> result = adminVettingService.getAllDoctors();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TS.BS Nguyễn Văn An", result.get(0).getFullName());
        assertEquals("ACTIVE", result.get(0).getUserStatus());
        assertTrue(result.get(0).isVerified());
    }

    @Test
    @DisplayName("Should create new doctor account by admin with auto-verification and vector sync")
    void testCreateDoctorByAdmin() {
        AdminCreateDoctorRequest req = new AdminCreateDoctorRequest();
        req.setEmail("new.doctor@mediassist.local");
        req.setPassword("SecurePass2026!");
        req.setFullName("BS.CKI Trần Hoài Nam");
        req.setPhone("0918889999");
        req.setLicenseNumber("CCHN-99881");
        req.setAcademicTitle("BS.CKI");
        req.setHospitalAffiliation("BV Đại học Y Dược TP.HCM");
        req.setSpecialtySlugs(List.of("cardiology"));
        req.setAutoVerify(true);

        Specialty specialty = new Specialty();
        specialty.setId(UUID.randomUUID());
        specialty.setName("Tim mạch");
        specialty.setSlug("cardiology");

        when(userRepository.existsByEmail("new.doctor@mediassist.local")).thenReturn(false);
        when(doctorProfileRepository.findByLicenseNumber("CCHN-99881")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(specialtyRepository.findBySlug("cardiology")).thenReturn(Optional.of(specialty));
        when(doctorProfileRepository.save(any(DoctorProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorDetailDto created = adminVettingService.createDoctorByAdmin(req, adminId);

        assertNotNull(created);
        assertEquals("BS.CKI Trần Hoài Nam", created.getFullName());
        assertTrue(created.isVerified());
        verify(doctorSemanticSearchService).updateDoctorEmbedding(any(), anyString());
        verify(cacheService).evict("doctors:verified");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Should update doctor profile by admin and evict cache")
    void testUpdateDoctorByAdmin() {
        AdminUpdateDoctorRequest req = new AdminUpdateDoctorRequest();
        req.setFullName("PGS.TS Nguyễn Văn An");
        req.setAcademicTitle("PGS.TS");
        req.setConsultationFee(BigDecimal.valueOf(500000));
        req.setYearsOfExperience(18);

        when(doctorProfileRepository.findById(doctorProfile.getId())).thenReturn(Optional.of(doctorProfile));
        when(doctorProfileRepository.save(any(DoctorProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorDetailDto updated = adminVettingService.updateDoctorByAdmin(doctorProfile.getId(), req, adminId);

        assertNotNull(updated);
        assertEquals("PGS.TS Nguyễn Văn An", updated.getFullName());
        assertEquals("PGS.TS", updated.getAcademicTitle());
        assertEquals(BigDecimal.valueOf(500000), updated.getConsultationFee());
        verify(cacheService).evict("doctors:verified");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Should toggle doctor status between ACTIVE and SUSPENDED")
    void testToggleDoctorStatus() {
        when(doctorProfileRepository.findById(doctorProfile.getId())).thenReturn(Optional.of(doctorProfile));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        DoctorDetailDto result = adminVettingService.toggleDoctorStatus(doctorProfile.getId(), adminId);

        assertNotNull(result);
        assertEquals(UserStatus.SUSPENDED, doctorUser.getStatus());
        verify(cacheService).evict("doctors:verified");
        verify(auditLogRepository).save(any(AuditLog.class));

        // Toggle back
        adminVettingService.toggleDoctorStatus(doctorProfile.getId(), adminId);
        assertEquals(UserStatus.ACTIVE, doctorUser.getStatus());
    }

    @Test
    @DisplayName("Should sync vector embedding for a single doctor")
    void testSyncDoctorVector() {
        when(doctorProfileRepository.findById(doctorProfile.getId())).thenReturn(Optional.of(doctorProfile));

        DoctorDetailDto result = adminVettingService.syncDoctorVector(doctorProfile.getId(), adminId);

        assertNotNull(result);
        verify(doctorSemanticSearchService).updateDoctorEmbedding(eq(doctorProfile.getId()), anyString());
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Should batch sync all doctor vector embeddings")
    void testSyncAllDoctorVectors() {
        when(doctorProfileRepository.count()).thenReturn(12L);

        int count = adminVettingService.syncAllDoctorVectors(adminId);

        assertEquals(12, count);
        verify(doctorSemanticSearchService).syncAllDoctorEmbeddings();
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Should return paged doctors correctly with limit and offset")
    void testGetDoctorsPaged() {
        when(doctorProfileRepository.findAll()).thenReturn(List.of(doctorProfile));

        com.mediassist.dto.PageResponse<DoctorDetailDto> page0 = adminVettingService.getDoctorsPaged(0, 5, null, null, null);
        assertNotNull(page0);
        assertEquals(1, page0.getTotalElements());
        assertEquals(1, page0.getItems().size());
        assertEquals(1, page0.getTotalPages());
        assertFalse(page0.isHasNext());
        assertFalse(page0.isHasPrevious());

        // Test page out of bounds
        com.mediassist.dto.PageResponse<DoctorDetailDto> page1 = adminVettingService.getDoctorsPaged(1, 5, null, null, null);
        assertNotNull(page1);
        assertEquals(1, page1.getTotalElements());
        assertTrue(page1.getItems().isEmpty());
    }

    @Test
    @DisplayName("Should filter paged doctors by search keyword, specialty, and status")
    void testGetDoctorsPagedWithFilter() {
        Specialty cardio = new Specialty();
        cardio.setName("Tim mạch");
        cardio.setSlug("tim-mach");
        doctorProfile.setSpecialties(Set.of(cardio));

        when(doctorProfileRepository.findAll()).thenReturn(List.of(doctorProfile));

        // Matching search
        var resMatch = adminVettingService.getDoctorsPaged(0, 10, "Nguyễn Văn An", "Tim mạch", "ACTIVE");
        assertEquals(1, resMatch.getTotalElements());
        assertEquals(1, resMatch.getItems().size());

        // Non-matching search
        var resNoMatch = adminVettingService.getDoctorsPaged(0, 10, "NonExistentName", null, null);
        assertEquals(0, resNoMatch.getTotalElements());
        assertTrue(resNoMatch.getItems().isEmpty());
    }
}
