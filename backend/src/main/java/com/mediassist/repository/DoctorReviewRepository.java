package com.mediassist.repository;

import com.mediassist.model.entity.DoctorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorReviewRepository extends JpaRepository<DoctorReview, UUID> {

    Optional<DoctorReview> findByAppointmentId(UUID appointmentId);

    boolean existsByAppointmentId(UUID appointmentId);

    @Query("SELECT r FROM DoctorReview r JOIN FETCH r.patient p WHERE r.doctor.id = :doctorId ORDER BY r.createdAt DESC")
    List<DoctorReview> findByDoctorIdWithPatient(@Param("doctorId") UUID doctorId);

    List<DoctorReview> findByDoctorIdOrderByCreatedAtDesc(UUID doctorId);

    List<DoctorReview> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    @Query("SELECT AVG(r.rating) FROM DoctorReview r WHERE r.doctor.id = :doctorId")
    Double calculateAverageRatingByDoctorId(@Param("doctorId") UUID doctorId);

    @Query("SELECT COUNT(r) FROM DoctorReview r WHERE r.doctor.id = :doctorId")
    long countByDoctorId(@Param("doctorId") UUID doctorId);
}
