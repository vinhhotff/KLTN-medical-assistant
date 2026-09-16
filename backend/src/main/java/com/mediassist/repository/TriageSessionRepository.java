package com.mediassist.repository;

import com.mediassist.model.entity.TriageSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TriageSessionRepository extends JpaRepository<TriageSession, UUID> {
    List<TriageSession> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<TriageSession> findAllByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query("SELECT s FROM TriageSession s LEFT JOIN FETCH s.user ORDER BY s.createdAt DESC")
    List<TriageSession> findAllWithUserOrderByCreatedAtDesc();

    long countByIsEmergencyTrue();
}
