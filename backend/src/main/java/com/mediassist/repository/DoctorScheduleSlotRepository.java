package com.mediassist.repository;

import com.mediassist.model.entity.DoctorScheduleSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorScheduleSlotRepository extends JpaRepository<DoctorScheduleSlot, UUID> {

    List<DoctorScheduleSlot> findByDoctorProfileIdAndIsActiveTrue(UUID doctorProfileId);

    List<DoctorScheduleSlot> findByDoctorProfileIdAndDayOfWeekAndIsActiveTrue(UUID doctorProfileId, DayOfWeek dayOfWeek);
}
