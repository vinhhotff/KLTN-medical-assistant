package com.mediassist.repository;

import com.mediassist.model.entity.PatientProfile;
import com.mediassist.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientProfileRepository extends JpaRepository<PatientProfile, UUID> {
    Optional<PatientProfile> findByUser(User user);
    Optional<PatientProfile> findByUserId(UUID userId);
    Optional<PatientProfile> findByPatientCode(String patientCode);
    Optional<PatientProfile> findByCitizenId(String citizenId);
    boolean existsByPatientCode(String patientCode);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM PatientProfile p JOIN FETCH p.user WHERE p.user = :user")
    Optional<PatientProfile> findByUserWithUser(@org.springframework.data.repository.query.Param("user") User user);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM PatientProfile p JOIN FETCH p.user WHERE p.user.id = :userId")
    Optional<PatientProfile> findByUserIdWithUser(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
