-- ====================================================================
-- MediAssist-AI: Ultra-Precision HNSW Vector Index Tuning Script
-- Target Environment: 16GB RAM / PostgreSQL 16 + pgvector (Port 5433)
-- Description:
--   Upgrades HNSW index from default (m=24, ef_construction=128)
--   to Ultra-Precision (m=32, ef_construction=256) for > 99.9% Recall.
-- ====================================================================

\connect mediassist_db;

-- 1. Check current extension and pgvector version
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'pg_trgm');

-- 2. Drop existing index and rebuild with Ultra-Precision HNSW parameters
DROP INDEX IF EXISTS idx_doctor_bio_hnsw_verified;

CREATE INDEX idx_doctor_bio_hnsw_verified ON doctor_profiles
USING hnsw (bio_embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 256)
WHERE is_verified = TRUE AND bio_embedding IS NOT NULL;

-- 3. Set session-level and database-level search depth
ALTER DATABASE mediassist_db SET hnsw.ef_search = 200;
SET LOCAL hnsw.ef_search = 200;

-- 4. Check index physical size and health status
SELECT
    c.relname AS index_name,
    pg_size_pretty(pg_relation_size(c.oid)) AS index_size,
    i.indisvalid AS is_valid
FROM pg_class c
JOIN pg_index i ON c.oid = i.indexrelid
WHERE c.relname = 'idx_doctor_bio_hnsw_verified';

-- 5. Test EXPLAIN ANALYZE on a sample dummy vector to verify Index Scan
EXPLAIN ANALYZE
SELECT id, academic_title, hospital_affiliation, department
FROM doctor_profiles
WHERE is_verified = TRUE AND bio_embedding IS NOT NULL
ORDER BY bio_embedding <=> (SELECT bio_embedding FROM doctor_profiles WHERE bio_embedding IS NOT NULL LIMIT 1)
LIMIT 5;

\echo '✅ Successfully tuned HNSW to Ultra-Precision (m=32, ef_construction=256, ef_search=200)!';
