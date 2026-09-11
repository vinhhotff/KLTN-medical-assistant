package com.mediassist.repository;

import com.mediassist.model.entity.TriageSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TriageSessionRepository extends JpaRepository<TriageSession, UUID> {
    List<TriageSession> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
