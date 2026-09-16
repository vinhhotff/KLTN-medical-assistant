-- ===================================================================
-- MediAssist-AI Flyway Migration: V12__supervision_and_realtime_performance_indexes.sql
-- Performance indexes for hospital-wide supervision, sorting, and realtime polling
-- ===================================================================

-- 1. Index for hospital-wide appointment chronological sorting
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_start_desc
ON appointments(scheduled_start DESC);

-- 2. Index for hospital-wide triage consultation chronological sorting
CREATE INDEX IF NOT EXISTS idx_triage_sessions_created_desc
ON triage_sessions(created_at DESC);

-- 3. Partial index for instant O(1) emergency triage counting in Executive Dashboard
CREATE INDEX IF NOT EXISTS idx_triage_emergency_partial
ON triage_sessions(is_emergency)
WHERE is_emergency = true;

-- 4. Partial index for instant O(1) abnormal EMR documents counting in Executive Dashboard
CREATE INDEX IF NOT EXISTS idx_doc_analysis_abnormal_partial
ON document_analyses(id)
WHERE abnormal_indicators_json IS NOT NULL 
  AND abnormal_indicators_json != '[]' 
  AND abnormal_indicators_json != '';

-- 5. Index for chronological sorting of document analyses
CREATE INDEX IF NOT EXISTS idx_doc_analyses_created_desc
ON document_analyses(created_at DESC);
