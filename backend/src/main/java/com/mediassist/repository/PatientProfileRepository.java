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
}
