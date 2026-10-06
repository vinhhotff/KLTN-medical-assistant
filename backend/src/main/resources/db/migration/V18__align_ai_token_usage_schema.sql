-- ===================================================================
-- MediAssist-AI Flyway Migration: V18__align_ai_token_usage_schema.sql
-- Align ai_token_usage table with FinOps analytics requirements
-- ===================================================================

-- Add service_type column if not exists
ALTER TABLE ai_token_usage 
    ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'TRIAGE';

-- Add request_status column if not exists
ALTER TABLE ai_token_usage 
    ADD COLUMN IF NOT EXISTS request_status VARCHAR(30) DEFAULT 'SUCCESS';

-- Add cost_usd column if not exists, and backfill from estimated_cost_usd
ALTER TABLE ai_token_usage 
    ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 6) DEFAULT 0.000000;

UPDATE ai_token_usage 
SET cost_usd = estimated_cost_usd 
WHERE cost_usd IS NULL OR cost_usd = 0;

-- Add appointment_id column if not exists
ALTER TABLE ai_token_usage 
    ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_ai_token_created_at ON ai_token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_token_service_type ON ai_token_usage(service_type);
CREATE INDEX IF NOT EXISTS idx_ai_token_request_status ON ai_token_usage(request_status);
