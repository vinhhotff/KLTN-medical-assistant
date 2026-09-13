-- ===================================================================
-- MediAssist-AI Flyway Migration: V5__add_document_analysis_metadata.sql
-- Store dynamic clinical metadata (Hospital, Doctor, SID, Patient, Gender, Age)
-- ===================================================================

ALTER TABLE document_analyses
    ADD COLUMN IF NOT EXISTS metadata_json TEXT;
