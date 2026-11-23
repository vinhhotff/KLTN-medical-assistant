package com.mediassist.service;

import com.mediassist.dto.DoctorScheduleConfigDto;
import com.mediassist.dto.DoctorSlotDto;
import com.mediassist.model.entity.DoctorProfile;
import com.mediassist.model.entity.DoctorScheduleSlot;
import com.mediassist.model.entity.User;
import com.mediassist.repository.AppointmentRepository;
import com.mediassist.repository.DoctorProfileRepository;
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

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Regression tests for "a day the doctor turned off gets re-opened".
 * Before the fix, an empty day (or an all-off week) made DoctorService seed and persist the default
 * Mon–Sat hours, silently re-enabling days the doctor had disabled.
 */
@ExtendWith(MockitoExtension.class)
class DoctorServiceScheduleTest {

    @Mock private DoctorProfileRepository doctorProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private SpecialtyRepository specialtyRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private TwoLayerCacheService cacheService;
    @Mock private DoctorSemanticSearchService doctorSemanticSearchService;
    @Mock private DoctorScheduleSlotRepository doctorScheduleSlotRepository;
    @Mock private PatientProfileRepository patientProfileRepository;

    private DoctorService service;
    private final UUID doctorUserId = UUID.randomUUID();
    private final UUID profileId = UUID.randomUUID();
    private DoctorProfile profile;

    @BeforeEach
    void setUp() {
        service = new DoctorService(doctorProfileRepository, userRepository, specialtyRepository, appointmentRepository,
                cacheService, doctorSemanticSearchService, doctorScheduleSlotRepository, patientProfileRepository);
        User user = new User();
        user.setId(doctorUserId);
        profile = new DoctorProfile();
        profile.setId(profileId);
        profile.setUser(user);
        lenient().when(doctorProfileRepository.findByUserIdWithDetails(doctorUserId)).thenReturn(Optional.of(profile));
        lenient().when(appointmentRepository.findActiveAppointmentsByDoctorAndRange(any(), any(), any())).thenReturn(List.of());
    }

    private DoctorScheduleSlot slot(DayOfWeek day, int fromHour, int toHour, boolean active) {
        return new DoctorScheduleSlot(profile, day, LocalTime.of(fromHour, 0), LocalTime.of(toHour, 0), 30, active);
    }

    private LocalDate next(DayOfWeek day) {
        return LocalDate.now().with(TemporalAdjusters.next(day));
    }

    @Test
    @DisplayName("A weekday the doctor turned off has no bookable slots and no default hours are saved")
    void disabledDayStaysClosed() {
        // Doctor works Monday only; Tuesday was switched off in the editor
        lenient().when(doctorScheduleSlotRepository.existsByDoctorProfileId(profileId)).thenReturn(true);
        lenient().when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profileId))
                .thenReturn(List.of(slot(DayOfWeek.MONDAY, 8, 12, true)));
        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndDayOfWeekAndIsActiveTrue(profileId, DayOfWeek.TUESDAY))
                .thenReturn(List.of());

        List<DoctorSlotDto> slots = service.getAvailableSlots(doctorUserId, next(DayOfWeek.TUESDAY));

        assertTrue(slots.isEmpty(), "Tuesday is off, but " + slots.size() + " slots were offered");
        verify(doctorScheduleSlotRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("A week with every day turned off stays empty in the editor and is not re-seeded")
    void allDaysOffIsNotReseeded() {
        // Every row was deactivated by a previous save with zero active ranges
        lenient().when(doctorScheduleSlotRepository.existsByDoctorProfileId(profileId)).thenReturn(true);
        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndIsActiveTrue(profileId)).thenReturn(List.of());

        List<DoctorScheduleConfigDto> schedule = service.getDoctorSchedules(doctorUserId);

        assertTrue(schedule.isEmpty(), "All days are off, but " + schedule.size() + " rows came back");
        verify(doctorScheduleSlotRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("A doctor who never configured a schedule still gets the default weekday hours")
    void neverConfiguredGetsDefaults() {
        lenient().when(doctorScheduleSlotRepository.existsByDoctorProfileId(profileId)).thenReturn(false);
        when(doctorScheduleSlotRepository.findByDoctorProfileIdAndDayOfWeekAndIsActiveTrue(profileId, DayOfWeek.MONDAY))
                .thenReturn(List.of());
        when(doctorScheduleSlotRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<DoctorSlotDto> slots = service.getAvailableSlots(doctorUserId, next(DayOfWeek.MONDAY));

        // Default Monday: 08:00–12:00 and 13:30–17:00 in 30-minute slots = 8 + 7
        assertEquals(15, slots.size());
    }
}
