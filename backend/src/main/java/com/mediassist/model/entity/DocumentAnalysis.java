package com.mediassist.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_analyses", indexes = {
        @Index(name = "idx_doc_analysis_doc", columnList = "document_id"),
        @Index(name = "idx_doc_analysis_created", columnList = "createdAt")
})
public class DocumentAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false, unique = true)
    private MedicalDocument document;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String clinicalSummary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String plainLanguageExplanation;

    @Column(columnDefinition = "TEXT")
    private String abnormalIndicatorsJson;

    @Column(nullable = false)
    private String recommendedSpecialtySlug;

    @Column(nullable = false)
    private String recommendedSpecialtyName;

    @Column(columnDefinition = "TEXT")
    private String suggestedQuestionsJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public DocumentAnalysis() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public MedicalDocument getDocument() { return document; }
    public void setDocument(MedicalDocument document) { this.document = document; }

    public String getClinicalSummary() { return clinicalSummary; }
    public void setClinicalSummary(String clinicalSummary) { this.clinicalSummary = clinicalSummary; }

    public String getPlainLanguageExplanation() { return plainLanguageExplanation; }
    public void setPlainLanguageExplanation(String plainLanguageExplanation) { this.plainLanguageExplanation = plainLanguageExplanation; }

    public String getAbnormalIndicatorsJson() { return abnormalIndicatorsJson; }
    public void setAbnormalIndicatorsJson(String abnormalIndicatorsJson) { this.abnormalIndicatorsJson = abnormalIndicatorsJson; }

    public String getRecommendedSpecialtySlug() { return recommendedSpecialtySlug; }
    public void setRecommendedSpecialtySlug(String recommendedSpecialtySlug) { this.recommendedSpecialtySlug = recommendedSpecialtySlug; }

    public String getRecommendedSpecialtyName() { return recommendedSpecialtyName; }
    public void setRecommendedSpecialtyName(String recommendedSpecialtyName) { this.recommendedSpecialtyName = recommendedSpecialtyName; }

    public String getSuggestedQuestionsJson() { return suggestedQuestionsJson; }
    public void setSuggestedQuestionsJson(String suggestedQuestionsJson) { this.suggestedQuestionsJson = suggestedQuestionsJson; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
