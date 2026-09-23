package com.mediassist.repository;

import com.mediassist.model.entity.Appointment;
import com.mediassist.model.entity.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    Optional<Appointment> findByAppointmentCode(String appointmentCode);
    boolean existsByAppointmentCode(String appointmentCode);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.patient.id = :patientId ORDER BY a.scheduledStart DESC")
    List<Appointment> findByPatientIdWithUsersOrderByScheduledStartDesc(@Param("patientId") UUID patientId);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.doctor.id = :doctorId ORDER BY a.scheduledStart DESC")
    List<Appointment> findByDoctorIdWithUsersOrderByScheduledStartDesc(@Param("doctorId") UUID doctorId);

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.id = :id")
    Optional<Appointment> findByIdWithUsers(@Param("id") UUID id);

    List<Appointment> findByPatientIdOrderByScheduledStartDesc(UUID patientId);

    List<Appointment> findByDoctorIdOrderByScheduledStartDesc(UUID doctorId);

    @Query("SELECT a FROM Appointment a WHERE a.doctor.id = :doctorId AND a.scheduledStart >= :start AND a.scheduledEnd <= :end AND a.status != com.mediassist.model.entity.AppointmentStatus.CANCELLED")
    List<Appointment> findActiveAppointmentsByDoctorAndRange(
            @Param("doctorId") UUID doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.doctor.id = :doctorId AND a.scheduledStart = :scheduledStart AND a.status != com.mediassist.model.entity.AppointmentStatus.CANCELLED")
    boolean existsConflict(
            @Param("doctorId") UUID doctorId,
            @Param("scheduledStart") LocalDateTime scheduledStart
    );

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.doctor.id = :doctorId AND a.scheduledStart >= :start AND a.scheduledStart <= :end ORDER BY a.scheduledStart ASC")
    List<Appointment> findTodayAppointmentsByDoctorWithUsers(
            @Param("doctorId") UUID doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor ORDER BY a.scheduledStart DESC")
    List<Appointment> findAllWithUsersOrderByScheduledStartDesc();

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.scheduledStart BETWEEN :start AND :end AND a.status != com.mediassist.model.entity.AppointmentStatus.CANCELLED")
    long countActiveAppointmentsByDoctorAndDateRange(
            @Param("doctorId") UUID doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.doctor.id = :doctorId AND a.scheduledStart = :scheduledStart AND a.id != :excludeId AND a.status != com.mediassist.model.entity.AppointmentStatus.CANCELLED")
    boolean existsConflictExcluding(
            @Param("doctorId") UUID doctorId,
            @Param("scheduledStart") LocalDateTime scheduledStart,
            @Param("excludeId") UUID excludeId
    );

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.status = :status AND a.scheduledStart BETWEEN :start AND :end")
    long countByDoctorStatusAndRange(
            @Param("doctorId") UUID doctorId,
            @Param("status") AppointmentStatus status,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COALESCE(SUM(a.feeAmount), 0) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.status = com.mediassist.model.entity.AppointmentStatus.COMPLETED AND a.scheduledStart BETWEEN :start AND :end")
    java.math.BigDecimal sumTodayRevenue(
            @Param("doctorId") UUID doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Query("SELECT COALESCE(SUM(a.feeAmount), 0) FROM Appointment a WHERE a.doctor.id = :doctorId AND a.status = com.mediassist.model.entity.AppointmentStatus.COMPLETED")
    java.math.BigDecimal sumLifetimeRevenue(
            @Param("doctorId") UUID doctorId
    );

    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.scheduledStart BETWEEN :start AND :end AND a.status = com.mediassist.model.entity.AppointmentStatus.SCHEDULED")
    List<Appointment> findScheduledBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Appointment a JOIN FETCH a.patient JOIN FETCH a.doctor WHERE a.doctor.id = :doctorId AND a.status = com.mediassist.model.entity.AppointmentStatus.SCHEDULED AND a.scheduledStart BETWEEN :start AND :end ORDER BY a.scheduledStart ASC")
    List<Appointment> findNextScheduledWithLock(
            @Param("doctorId") UUID doctorId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            org.springframework.data.domain.Pageable pageable
    );

    long countByDoctorId(UUID doctorId);

    long countByDoctorIdAndStatus(UUID doctorId, AppointmentStatus status);

    long countByStatus(AppointmentStatus status);
}
