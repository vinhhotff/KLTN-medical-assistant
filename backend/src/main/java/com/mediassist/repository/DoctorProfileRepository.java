package com.mediassist.repository;

import com.mediassist.model.entity.DoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, UUID> {

    @Query("SELECT DISTINCT dp FROM DoctorProfile dp JOIN FETCH dp.user LEFT JOIN FETCH dp.specialties WHERE dp.isVerified = true")
    List<DoctorProfile> findAllVerifiedWithUserAndSpecialties();

    @Query("SELECT DISTINCT dp FROM DoctorProfile dp JOIN FETCH dp.user LEFT JOIN FETCH dp.specialties")
    List<DoctorProfile> findAllWithUserAndSpecialties();

    @Query("SELECT DISTINCT dp FROM DoctorProfile dp JOIN FETCH dp.user LEFT JOIN FETCH dp.specialties WHERE dp.isVerified = false")
    List<DoctorProfile> findPendingWithUserAndSpecialties();

    @Query("SELECT dp FROM DoctorProfile dp JOIN FETCH dp.user LEFT JOIN FETCH dp.specialties WHERE dp.user.id = :userId")
    Optional<DoctorProfile> findByUserIdWithDetails(@Param("userId") UUID userId);

    @Query("SELECT dp FROM DoctorProfile dp JOIN FETCH dp.user LEFT JOIN FETCH dp.specialties WHERE dp.id = :id")
    Optional<DoctorProfile> findByIdWithDetails(@Param("id") UUID id);

    Optional<DoctorProfile> findByUserId(UUID userId);
    Optional<DoctorProfile> findByLicenseNumber(String licenseNumber);
}
