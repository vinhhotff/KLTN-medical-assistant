package com.mediassist.repository;

import com.mediassist.model.entity.DocumentAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentAnalysisRepository extends JpaRepository<DocumentAnalysis, UUID> {
    Optional<DocumentAnalysis> findByDocumentId(UUID documentId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(d) FROM DocumentAnalysis d WHERE d.abnormalIndicatorsJson IS NOT NULL AND d.abnormalIndicatorsJson != '[]' AND d.abnormalIndicatorsJson != ''")
    long countWithAbnormalIndicators();
}
