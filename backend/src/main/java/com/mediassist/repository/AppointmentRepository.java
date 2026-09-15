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
}
