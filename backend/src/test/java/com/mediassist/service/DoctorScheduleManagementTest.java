package com.mediassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediassist.common.AppException;
import com.mediassist.dto.DoctorScheduleBundleDto;
import com.mediassist.dto.DoctorSlotDto;
import com.mediassist.dto.ScheduleExceptionDto;
import com.mediassist.dto.ScheduleShiftDto;
import com.mediassist.dto.UpdateDoctorScheduleRequest;
import com.mediassist.dto.UpsertScheduleExceptionRequest;
import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.DoctorScheduleException;
import com.mediassist.model.entity.DoctorScheduleSlot;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.DoctorProfileRepository;
import com.mediassist.repository.DoctorScheduleExceptionRepository;
import com.mediassist.repository.DoctorScheduleSlotRepository;
import com.mediassist.repository.PatientProfileRepository;
import com.mediassist.repository.SpecialtyRepository;
import com.mediassist.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DoctorScheduleManagementTest {

    @Mock private DoctorProfileRepository doctorProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private SpecialtyRepository specialtyRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private TwoLayerCacheService cacheService;
    @Mock private DoctorSemanticSearchService doctorSemanticSearchService;
    @Mock private DoctorScheduleSlotRepository doctorScheduleSlotRepository;
    @Mock private PatientProfileRepository patientProfileRepository;
    @Mock private StorageService storageService;
    @Mock private AuditLogRepositoryFactoryDummy ignored; // avoid unused imports
    @Mock private DoctorScheduleExceptionRepository doctorScheduleExceptionRepository;

    private DoctorService service;
    private UUID doctorUserId;
    private UUID profileId;
    private User doctorUser;
    private DoctorProfile profile;

    interface AuditLogRepositoryFactoryDummy {}

    @BeforeEach
    void setUp() {
        service = new DoctorService(
                doctorProfileRepository,
                userRepository,
                specialtyRepository,
                appointmentRepository,
                cacheService,
                doctorSemanticSearchService,
                doctorScheduleSlotRepository,
                patientProfileRepository,
                storageService,
                null,
                doctorScheduleExceptionRepository,
                new ObjectMapper()
        );
        doctorUserId = UUID.randomUUID();
        profileId = UUID.randomUUID();

        doctorUser = new User();
        doctorUser.setId(doctorUserId);
        doctorUser.setFullName("BS. Phạm Quốc Tuấn");

        profile = new DoctorProfile();
        profile.setId(profileId);
        profile.setUser(doctorUser);
        profile.setSlotDurationMinutes(30);
        profile.setBufferTimeMinutes(0);

        lenient().when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId)).thenReturn(Optional.of(profile));
        lenient().when(doctorProfileRepository.findByUserId(doctorUserId)).thenReturn(Optional.of(profile));
        lenient().when(doctorScheduleSlotRepository.existsByDoctorProfileId(profileId)).thenReturn(true);
    }

    private LocalDate next(DayOfWeek dow) {
        return LocalDate.now().with(TemporalAdjusters.next(dow));
    }

    @Test
    @DisplayName("getAvailableSlots applies buffer_time_minutes between generated slots and booking clearance")
    void bufferTimeSpacingAndClearance() {
        profile.setSlotDurationMinutes(30);
        profile.setBufferTimeMinutes(10);

        LocalDate monday = next(DayOfWeek.MONDAY);
        DoctorScheduleSlot morning = new DoctorScheduleSlot(profile, DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(10, 0), 30, true);
        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profileId)).thenReturn(List.of(morning));
        when(doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(eq(profileId), any()))
                .thenReturn(List.of());

        // Booking at 08:40 - 09:10 occupies [08:30..09:20] with 10m buffer: 08:00..08:30 stays free, 08:40 and 09:20 checks cleanly
        Appointment mid = Appointment.builder()
                .patient(doctorUser)
                .doctor(doctorUser)
                .scheduledStart(monday.atTime(8, 40))
                .scheduledEnd(monday.atTime(9, 10))
                .status(AppointmentStatus.SCHEDULED)
                .build();
        when(appointmentRepository.findActiveAppointmentsByDoctorAndRange(eq(doctorUserId), any(), any()))
                .thenReturn(List.of(mid));

        List<DoctorSlotDto> slots = service.getAvailableSlots(doctorUserId, monday);

        // 08:00-08:30, 08:40-09:10, 09:20-09:50
        assertEquals(3, slots.size());
        assertEquals(LocalTime.of(8, 0), slots.get(0).getStartTime());
        assertTrue(slots.get(0).isAvailable());
        assertEquals(LocalTime.of(8, 40), slots.get(1).getStartTime());
        assertFalse(slots.get(1).isAvailable());
        assertEquals(LocalTime.of(9, 20), slots.get(2).getStartTime());
        assertTrue(slots.get(2).isAvailable());
    }

    @Test
    @DisplayName("ScheduleException Day-Off overrides active weekly hours and returns empty list")
    void scheduleExceptionDayOffReturnsNoSlots() {
        LocalDate monday = next(DayOfWeek.MONDAY);
        DoctorScheduleSlot mondayWeekly = new DoctorScheduleSlot(profile, DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 30, true);
        DoctorScheduleException dayOff = new DoctorScheduleException(profile, monday, true, "[]", "Nghỉ hội thảo");

        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profileId)).thenReturn(List.of(mondayWeekly));
        when(doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(eq(profileId), any()))
                .thenReturn(List.of(dayOff));

        List<DoctorSlotDto> slots = service.getAvailableSlots(doctorUserId, monday);
        assertTrue(slots.isEmpty());
    }

    @Test
    @DisplayName("ScheduleException Custom Shifts override weekly hours for that specific date")
    void scheduleExceptionCustomShiftsOverridesWeekly() {
        LocalDate tuesday = next(DayOfWeek.TUESDAY);
        DoctorScheduleSlot tuesdayWeekly = new DoctorScheduleSlot(profile, DayOfWeek.TUESDAY, LocalTime.of(8, 0), LocalTime.of(12, 0), 30, true);
        DoctorScheduleException custom = new DoctorScheduleException(profile, tuesday, false,
                "[{\"startTime\":\"18:00\",\"endTime\":\"19:30\"}]", "Khám tăng cường tối");

        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profileId)).thenReturn(List.of(tuesdayWeekly));
        when(doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(eq(profileId), any()))
                .thenReturn(List.of(custom));
        when(appointmentRepository.findActiveAppointmentsByDoctorAndRange(eq(doctorUserId), any(), any())).thenReturn(List.of());

        List<DoctorSlotDto> slots = service.getAvailableSlots(doctorUserId, tuesday);
        assertEquals(3, slots.size());
        assertEquals(LocalTime.of(18, 0), slots.get(0).getStartTime());
        assertEquals(LocalTime.of(19, 0), slots.get(2).getStartTime());
    }

    @Test
    @DisplayName("updateDoctorScheduleBundle rejects overlapping shifts in the same weekday")
    void rejectsOverlappingWeeklyShifts() {
        UpdateDoctorScheduleRequest req = new UpdateDoctorScheduleRequest(
                List.of(
                        new UpdateDoctorScheduleRequest.SlotItem(DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(11, 0), 30, true),
                        new UpdateDoctorScheduleRequest.SlotItem(DayOfWeek.MONDAY, LocalTime.of(10, 30), LocalTime.of(13, 0), 30, true)
                ),
                30, 0, false
        );

        AppException ex = assertThrows(AppException.class, () -> service.updateDoctorScheduleBundle(doctorUserId, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("SHIFT_OVERLAP", ex.getCode());
        verify(doctorScheduleSlotRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("upsertScheduleException rejects overlapping custom shifts")
    void rejectsOverlappingExceptionShifts() {
        LocalDate target = LocalDate.now().plusDays(5);
        UpsertScheduleExceptionRequest req = new UpsertScheduleExceptionRequest(
                target,
                false,
                List.of(
                        new ScheduleShiftDto("08:00", "10:00"),
                        new ScheduleShiftDto("09:45", "11:30")
                ),
                "Lịch riêng",
                false
        );

        AppException ex = assertThrows(AppException.class, () -> service.upsertScheduleException(doctorUserId, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertEquals("SHIFT_OVERLAP", ex.getCode());
    }

    @Test
    @DisplayName("updateDoctorScheduleBundle detects appointment conflicts and saves on force=true while evicting cache")
    @SuppressWarnings("unchecked")
    void weeklyUpdateConflictWarningThenForceSave() {
        LocalDate monday = next(DayOfWeek.MONDAY);
        User patient = new User();
        patient.setFullName("Lê Thị Hoa");
        Appointment existingAppt = Appointment.builder()
                .id(UUID.randomUUID())
                .appointmentCode("AP-20261130-ABC123")
                .patient(patient)
                .doctor(doctorUser)
                .scheduledStart(LocalDateTime.of(monday, LocalTime.of(14, 0)))
                .scheduledEnd(LocalDateTime.of(monday, LocalTime.of(14, 30)))
                .status(AppointmentStatus.SCHEDULED)
                .build();

        when(appointmentRepository.findUpcomingActiveAppointmentsByDoctor(eq(doctorUserId), any()))
                .thenReturn(List.of(existingAppt));
        when(doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(eq(profileId), any()))
                .thenReturn(List.of());

        UpdateDoctorScheduleRequest reqNoForce = new UpdateDoctorScheduleRequest(
                List.of(new UpdateDoctorScheduleRequest.SlotItem(DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(11, 30), 30, true)),
                30, 5, false
        );

        AppException conflictEx = assertThrows(AppException.class, () -> service.updateDoctorScheduleBundle(doctorUserId, reqNoForce));
        assertEquals(HttpStatus.CONFLICT, conflictEx.getStatus());
        assertEquals("SCHEDULE_CONFLICT_WARNING", conflictEx.getCode());
        Map<String, Object> details = (Map<String, Object>) conflictEx.getDetails();
        assertEquals(1, details.get("conflictCount"));

        // Retry with force = true
        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profileId)).thenReturn(List.of());
        when(doctorScheduleSlotRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(doctorProfileRepository.save(any(DoctorProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateDoctorScheduleRequest reqForce = new UpdateDoctorScheduleRequest(
                List.of(new UpdateDoctorScheduleRequest.SlotItem(DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(11, 30), 30, true)),
                30, 5, true
        );
        DoctorScheduleBundleDto savedBundle = service.updateDoctorScheduleBundle(doctorUserId, reqForce);
        assertEquals(5, savedBundle.getBufferTimeMinutes());
        assertEquals(1, savedBundle.getWarnings().size());
        verify(cacheService, times(1)).evict("doctor:schedule:meta:" + profileId);
    }

    @Test
    @DisplayName("upsertScheduleException warns when active appointment falls on day-off and forces save + evicts cache")
    void exceptionDayOffConflictThenForce() {
        LocalDate date = LocalDate.now().plusDays(4);
        User patient = new User();
        patient.setFullName("Võ Văn Bình");
        Appointment activeAppt = Appointment.builder()
                .id(UUID.randomUUID())
                .appointmentCode("AP-20261128-XYZ999")
                .patient(patient)
                .doctor(doctorUser)
                .scheduledStart(date.atTime(9, 0))
                .scheduledEnd(date.atTime(9, 30))
                .status(AppointmentStatus.CHECKED_IN)
                .build();

        when(appointmentRepository.findActiveAppointmentsByDoctorWithPatientInRange(eq(doctorUserId), any(), any()))
                .thenReturn(List.of(activeAppt));

        UpsertScheduleExceptionRequest noForce = new UpsertScheduleExceptionRequest(date, true, null, "Công tác", false);
        AppException conflict = assertThrows(AppException.class, () -> service.upsertScheduleException(doctorUserId, noForce));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());
        assertEquals("SCHEDULE_CONFLICT_WARNING", conflict.getCode());

        when(doctorScheduleExceptionRepository.findByDoctorProfileIdAndExceptionDate(profileId, date)).thenReturn(Optional.empty());
        when(doctorScheduleExceptionRepository.save(any(DoctorScheduleException.class))).thenAnswer(inv -> {
            DoctorScheduleException e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        UpsertScheduleExceptionRequest withForce = new UpsertScheduleExceptionRequest(date, true, null, "Công tác", true);
        ScheduleExceptionDto dto = service.upsertScheduleException(doctorUserId, withForce);
        assertTrue(dto.isDayOff());
        assertEquals("Công tác", dto.getReason());
        verify(cacheService, times(1)).evict("doctor:schedule:meta:" + profileId);
    }
}
