package com.mediassist.repository;

import com.mediassist.model.entity.DoctorScheduleException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorScheduleExceptionRepository extends JpaRepository<DoctorScheduleException, UUID> {

    Optional<DoctorScheduleException> findByDoctorProfileIdAndExceptionDate(UUID doctorProfileId, LocalDate exceptionDate);

    List<DoctorScheduleException> findByDoctorProfileIdAndExceptionDateGreaterThanEqualOrderByExceptionDateAsc(UUID doctorProfileId, LocalDate fromDate);

    List<DoctorScheduleException> findByDoctorProfileIdOrderByExceptionDateAsc(UUID doctorProfileId);

    Optional<DoctorScheduleException> findByIdAndDoctorProfileId(UUID id, UUID doctorProfileId);
}
