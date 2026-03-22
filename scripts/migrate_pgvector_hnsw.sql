-- HEADY SYSTEMS :: SACRED GEOMETRY
-- pgvector Index Migration: IVFFlat → HNSW
-- Ref: Deep Research §2.1 — Vector Layer Upgrade
--
-- HNSW gives ~38% better query latency at higher recall than IVFFlat.
-- For the CSL engine where cosine similarity is on the critical path,
-- HNSW's consistent sub-2ms latency is the correct choice.
--
-- Run against your Neon Postgres instance.
-- ⚠️  HNSW index build is slower (~25 min for medium datasets).
--     Schedule during a maintenance window.

-- Step 1: Drop existing IVFFlat index (if any)
DROP INDEX IF EXISTS idx_embeddings_ivfflat;

-- Step 2: Create HNSW index with cosine_ops
-- M = 16 (default, controls connectivity — higher = better recall, more memory)
-- ef_construction = 200 (controls build quality — higher = better recall, slower build)
CREATE INDEX CONCURRENTLY idx_embeddings_hnsw
ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Step 3: Set ef_search for query-time recall tuning
-- Start at 100, benchmark and adjust based on CSL query distributions
SET hnsw.ef_search = 100;

-- Step 4: (Optional) Migrate to halfvec for 50% storage reduction
-- Only run this after validating that recall quality is acceptable.
-- 384D float16 fits 4,096 dims per 8KB page vs. float32's 2,048 ceiling.
--
-- ALTER TABLE embeddings ALTER COLUMN embedding TYPE halfvec(384);
-- DROP INDEX idx_embeddings_hnsw;
-- CREATE INDEX CONCURRENTLY idx_embeddings_hnsw_halfvec
-- ON embeddings USING hnsw (embedding halfvec_cosine_ops)
-- WITH (m = 16, ef_construction = 200);

-- Step 5: Analyze to update query planner statistics
ANALYZE embeddings;
