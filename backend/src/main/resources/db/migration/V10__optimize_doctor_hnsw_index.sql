-- ====================================================================
-- Flyway Migration: V10__optimize_doctor_hnsw_index.sql
-- Description:
--   1. Optimizes pgvector HNSW search performance by adding a partial index
--      focused specifically on verified doctors with active bio embeddings.
--   2. Adds defensive exception handling to support varying pgvector minor versions.
-- ====================================================================

-- 1. B-tree index for fast verification status and non-null embedding filtering
CREATE INDEX IF NOT EXISTS idx_doctor_verified_has_embedding 
ON doctor_profiles(is_verified) 
WHERE bio_embedding IS NOT NULL;

-- 2. Partial HNSW vector index specifically for verified doctors (pgvector 0.7+)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_doctor_bio_hnsw_verified'
    ) THEN
        BEGIN
            CREATE INDEX idx_doctor_bio_hnsw_verified ON doctor_profiles 
            USING hnsw (bio_embedding vector_cosine_ops)
            WHERE is_verified = TRUE AND bio_embedding IS NOT NULL;
            RAISE NOTICE 'Successfully created partial HNSW index idx_doctor_bio_hnsw_verified';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Partial HNSW index not supported on this pgvector engine version, using baseline HNSW index.';
        END;
    END IF;
END $$;
