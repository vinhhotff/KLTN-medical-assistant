package com.mediassist;

import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorDetailDto;
import com.mediassist.dto.DoctorSlotDto;
import com.mediassist.dto.UpdateDoctorProfileRequest;
import com.mediassist.model.entity.*;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import com.mediassist.service.DoctorSemanticSearchService;
import com.mediassist.service.DoctorService;
import com.mediassist.service.TwoLayerCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorServiceTest {

    @Mock
    private DoctorProfileRepository doctorProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SpecialtyRepository specialtyRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private TwoLayerCacheService cacheService;

    @Mock
    private DoctorSemanticSearchService doctorSemanticSearchService;

    @Mock
    private com.mediassist.repository.DoctorScheduleSlotRepository doctorScheduleSlotRepository;

    @Mock
    private com.mediassist.repository.PatientProfileRepository patientProfileRepository;

    private DoctorService doctorService;

    private UUID doctorUserId;
    private UUID doctorProfileId;
    private User doctorUser;
    private DoctorProfile doctorProfile;
    private Specialty cardiologySpecialty;

    @BeforeEach
    void setUp() {
        doctorService = new DoctorService(
                doctorProfileRepository,
                userRepository,
                specialtyRepository,
                appointmentRepository,
                cacheService,
                doctorSemanticSearchService,
                doctorScheduleSlotRepository,
                patientProfileRepository
        );

        doctorUserId = UUID.randomUUID();
        doctorProfileId = UUID.randomUUID();

        doctorUser = User.builder()
                .id(doctorUserId)
                .email("dr.an@mediassist.local")
                .fullName("TS.BS Nguyễn Văn An")
                .phone("0912345678")
                .role(Role.DOCTOR)
                .status(UserStatus.ACTIVE)
                .build();

        cardiologySpecialty = new Specialty();
        cardiologySpecialty.setId(UUID.randomUUID());
        cardiologySpecialty.setName("Tim Mạch");
        cardiologySpecialty.setSlug("cardiology");

        doctorProfile = new DoctorProfile();
        doctorProfile.setId(doctorProfileId);
        doctorProfile.setUser(doctorUser);
        doctorProfile.setBio("Chuyên gia tim mạch hàng đầu");
        doctorProfile.setLicenseNumber("CCHN-001");
        doctorProfile.setConsultationFee(BigDecimal.valueOf(350000));
        doctorProfile.setYearsOfExperience(15);
        doctorProfile.setVerified(true);
        doctorProfile.setSpecialties(new HashSet<>(List.of(cardiologySpecialty)));
    }

    @Test
    @DisplayName("getVerifiedDoctors returns cached doctors on L1/L2 cache hit without querying DB")
    void testGetVerifiedDoctors_CacheHit() {
        DoctorDetailDto cachedDto = DoctorDetailDto.fromEntity(doctorProfile);
        when(cacheService.get(eq("doctors:verified"), eq(DoctorDetailDto[].class)))
                .thenReturn(new DoctorDetailDto[]{cachedDto});

        List<DoctorDetailDto> result = doctorService.getVerifiedDoctors();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TS.BS Nguyễn Văn An", result.get(0).getFullName());
        verifyNoInteractions(doctorProfileRepository);
    }

    @Test
    @DisplayName("getVerifiedDoctors queries DB with JOIN FETCH and stores into Two-Layer Cache on cache miss")
    void testGetVerifiedDoctors_CacheMiss() {
        when(cacheService.get(eq("doctors:verified"), eq(DoctorDetailDto[].class))).thenReturn(null);
        when(doctorProfileRepository.findAllVerifiedWithUserAndSpecialties())
                .thenReturn(List.of(doctorProfile));

        List<DoctorDetailDto> result = doctorService.getVerifiedDoctors();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TS.BS Nguyễn Văn An", result.get(0).getFullName());

        verify(doctorProfileRepository, times(1)).findAllVerifiedWithUserAndSpecialties();
        verify(cacheService, times(1)).set(eq("doctors:verified"), any(DoctorDetailDto[].class), eq(600L));
    }

    @Test
    @DisplayName("getDoctorById returns doctor detail DTO when profile exists")
    void testGetDoctorById_Success() {
        when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId))
                .thenReturn(Optional.of(doctorProfile));

        DoctorDetailDto dto = doctorService.getDoctorById(doctorUserId);

        assertNotNull(dto);
        assertEquals("TS.BS Nguyễn Văn An", dto.getFullName());
        assertEquals("Chuyên gia tim mạch hàng đầu", dto.getBio());
    }

    @Test
    @DisplayName("getDoctorById throws 404 when doctor does not exist")
    void testGetDoctorById_NotFound() {
        when(doctorProfileRepository.findByUserIdWithDetails(any())).thenReturn(Optional.empty());
        when(doctorProfileRepository.findByIdWithDetails(any())).thenReturn(Optional.empty());
        when(doctorProfileRepository.findByUserId(any())).thenReturn(Optional.empty());
        when(doctorProfileRepository.findById(any())).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () -> doctorService.getDoctorById(UUID.randomUUID()));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    @DisplayName("getAvailableSlots excludes booked appointment slots and marks available slots")
    void testGetAvailableSlots() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId)).thenReturn(Optional.of(doctorProfile));

        Appointment bookedAppt = Appointment.builder()
                .patient(doctorUser)
                .doctor(doctorUser)
                .scheduledStart(tomorrow.atTime(8, 0))
                .scheduledEnd(tomorrow.atTime(8, 30))
                .status(AppointmentStatus.SCHEDULED)
                .build();

        when(appointmentRepository.findActiveAppointmentsByDoctorAndRange(eq(doctorUserId), any(), any()))
                .thenReturn(List.of(bookedAppt));

        List<DoctorSlotDto> slots = doctorService.getAvailableSlots(doctorUserId, tomorrow);

        assertNotNull(slots);
        assertFalse(slots.isEmpty());

        DoctorSlotDto firstSlot = slots.stream()
                .filter(s -> s.getStartTime().equals(LocalTime.of(8, 0)))
                .findFirst()
                .orElse(null);
        assertNotNull(firstSlot);
        assertFalse(firstSlot.isAvailable());

        DoctorSlotDto secondSlot = slots.stream()
                .filter(s -> s.getStartTime().equals(LocalTime.of(8, 30)))
                .findFirst()
                .orElse(null);
        assertNotNull(secondSlot);
        assertTrue(secondSlot.isAvailable());
    }

    @Test
    @DisplayName("updateDoctorProfile updates details, evicts verified cache, and syncs vector embedding")
    void testUpdateDoctorProfile_VerifiedDoctorSyncsVector() {
        when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId)).thenReturn(Optional.of(doctorProfile));
        when(doctorProfileRepository.save(any(DoctorProfile.class))).thenAnswer(i -> i.getArgument(0));

        UpdateDoctorProfileRequest req = new UpdateDoctorProfileRequest();
        req.setBio("Chuyên gia tim mạch và can thiệp mạch vành 20 năm kinh nghiệm");
        req.setConsultationFee(BigDecimal.valueOf(400000));
        req.setYearsOfExperience(20);

        DoctorDetailDto updatedDto = doctorService.updateDoctorProfile(doctorUserId, req);

        assertNotNull(updatedDto);
        assertEquals(BigDecimal.valueOf(400000), updatedDto.getConsultationFee());
        assertEquals(20, updatedDto.getYearsOfExperience());

        verify(cacheService, times(1)).evict("doctors:verified");
        verify(doctorSemanticSearchService, times(1)).updateDoctorEmbedding(eq(doctorProfileId), anyString());
    }

    @Test
    @DisplayName("getDoctorStats calculates today and lifetime clinical metrics correctly")
    void testGetDoctorStats_ComputesRealTimeMetricsCorrectly() {
        when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId)).thenReturn(Optional.of(doctorProfile));

        // Create appointments: 1 completed today (350k), 1 scheduled today, 1 in-progress today, 1 completed in past (300k)
        Appointment apt1 = Appointment.builder()
                .id(UUID.randomUUID())
                .doctor(doctorUser)
                .status(AppointmentStatus.COMPLETED)
                .feeAmount(BigDecimal.valueOf(350000))
                .scheduledStart(java.time.LocalDateTime.now())
                .scheduledEnd(java.time.LocalDateTime.now().plusMinutes(30))
                .build();

        Appointment apt2 = Appointment.builder()
                .id(UUID.randomUUID())
                .doctor(doctorUser)
                .status(AppointmentStatus.SCHEDULED)
                .feeAmount(BigDecimal.valueOf(350000))
                .scheduledStart(java.time.LocalDateTime.now().plusHours(1))
                .scheduledEnd(java.time.LocalDateTime.now().plusHours(1).plusMinutes(30))
                .build();

        Appointment apt3 = Appointment.builder()
                .id(UUID.randomUUID())
                .doctor(doctorUser)
                .status(AppointmentStatus.IN_PROGRESS)
                .feeAmount(BigDecimal.valueOf(350000))
                .scheduledStart(java.time.LocalDateTime.now())
                .scheduledEnd(java.time.LocalDateTime.now().plusMinutes(30))
                .build();

        Appointment apt4 = Appointment.builder()
                .id(UUID.randomUUID())
                .doctor(doctorUser)
                .status(AppointmentStatus.COMPLETED)
                .feeAmount(BigDecimal.valueOf(300000))
                .scheduledStart(java.time.LocalDateTime.now().minusDays(5))
                .scheduledEnd(java.time.LocalDateTime.now().minusDays(5).plusMinutes(30))
                .build();

        when(appointmentRepository.findByDoctorIdOrderByScheduledStartDesc(doctorUserId))
                .thenReturn(List.of(apt1, apt2, apt3, apt4));

        com.mediassist.dto.DoctorStatsDto stats = doctorService.getDoctorStats(doctorUserId);

        assertNotNull(stats);
        assertEquals(3, stats.getTodayAppointmentsCount());
        assertEquals(1, stats.getTodayWaitingCount());
        assertEquals(1, stats.getTodayInProgressCount());
        assertEquals(1, stats.getTodayCompletedCount());
        assertEquals(2, stats.getTotalCompletedCount());
        assertEquals(4, stats.getTotalAppointmentsCount());
        assertEquals(BigDecimal.valueOf(350000), stats.getTodayRevenue());
        assertEquals(BigDecimal.valueOf(650000), stats.getLifetimeRevenue());
        assertEquals(4.9, stats.getDoctorRating());
    }

    @Test
    @DisplayName("getDoctorSchedules initializes default schedule slots when none exist")
    void testGetDoctorSchedules_InitializesDefaultsWhenEmpty() {
        when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId)).thenReturn(Optional.of(doctorProfile));
        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(doctorProfileId)).thenReturn(Collections.emptyList());
        when(doctorScheduleSlotRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        List<com.mediassist.dto.DoctorScheduleConfigDto> schedules = doctorService.getDoctorSchedules(doctorUserId);

        assertNotNull(schedules);
        assertFalse(schedules.isEmpty());
        verify(doctorScheduleSlotRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("getDoctorPatients groups appointments by patient and attaches profile data")
    void testGetDoctorPatients() {
        UUID patientId = UUID.randomUUID();
        User patientUser = User.builder()
                .id(patientId)
                .fullName("Trần Thị Bình")
                .email("binh@gmail.com")
                .phone("0988776655")
                .role(Role.PATIENT)
                .build();

        Appointment apt = Appointment.builder()
                .id(UUID.randomUUID())
                .patient(patientUser)
                .doctor(doctorUser)
                .status(AppointmentStatus.COMPLETED)
                .scheduledStart(java.time.LocalDateTime.now().minusDays(1))
                .scheduledEnd(java.time.LocalDateTime.now().minusDays(1).plusMinutes(30))
                .build();
        apt.setIcd10Code("I10");
        apt.setIcd10Name("Tăng huyết áp");

        when(appointmentRepository.findByDoctorIdWithUsersOrderByScheduledStartDesc(doctorUserId))
                .thenReturn(List.of(apt));

        PatientProfile pp = new PatientProfile();
        pp.setPatientCode("BN-2026-0001");
        pp.setBloodGroup("A+");
        pp.setGender("FEMALE");
        pp.setAllergies("Dị ứng Penicillin");
        when(patientProfileRepository.findByUserId(patientId)).thenReturn(Optional.of(pp));

        List<com.mediassist.dto.DoctorPatientItemDto> result = doctorService.getDoctorPatients(doctorUserId);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Trần Thị Bình", result.get(0).getFullName());
        assertEquals("BN-2026-0001", result.get(0).getPatientCode());
        assertEquals("Dị ứng Penicillin", result.get(0).getAllergies());
        assertEquals("I10", result.get(0).getLastIcd10Code());
    }

    @Test
    @DisplayName("callNextPatient advances earliest SCHEDULED appointment to IN_PROGRESS")
    void testCallNextPatient_AdvancesScheduled() {
        UUID patientId = UUID.randomUUID();
        User patientUser = User.builder()
                .id(patientId)
                .fullName("Lê Văn Cường")
                .email("cuong@gmail.com")
                .role(Role.PATIENT)
                .build();

        Appointment apt = Appointment.builder()
                .id(UUID.randomUUID())
                .appointmentCode("AP-2026-01")
                .patient(patientUser)
                .doctor(doctorUser)
                .status(AppointmentStatus.SCHEDULED)
                .scheduledStart(java.time.LocalDateTime.now())
                .scheduledEnd(java.time.LocalDateTime.now().plusMinutes(30))
                .build();

        when(appointmentRepository.findTodayAppointmentsByDoctorWithUsers(eq(doctorUserId), any(), any()))
                .thenReturn(List.of(apt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(i -> i.getArgument(0));

        com.mediassist.dto.AppointmentDto result = doctorService.callNextPatient(doctorUserId);

        assertNotNull(result);
        assertEquals(AppointmentStatus.IN_PROGRESS, result.getStatus());
        assertEquals("Lê Văn Cường", result.getPatientName());
        verify(appointmentRepository, times(1)).save(any(Appointment.class));
    }
}
