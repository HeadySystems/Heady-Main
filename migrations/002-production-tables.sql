-- Migration 002: Production tables for HeadySystems launch
-- Required: pgvector extension for T1 semantic memory
-- Run: psql $DATABASE_URL < migrations/002-production-tables.sql

CREATE EXTENSION IF NOT EXISTS vector;

-- T1 Persistent Memory (Neon pgvector)
CREATE TABLE IF NOT EXISTS memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384),  -- all-MiniLM-L6-v2
  csl_score FLOAT DEFAULT 0.618,  -- PSI threshold
  metadata JSONB DEFAULT '{}',
  source_node VARCHAR(50),  -- Attribution: JULES, SENTINEL, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_vectors_embedding
  ON memory_vectors USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_tenant ON memory_vectors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_csl ON memory_vectors(csl_score);

-- API Key Management (Tiered)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  prefix VARCHAR(20) NOT NULL,  -- hdy_int_, hdy_plt_, hdy_pub_, hdy_trl_
  tier VARCHAR(30) NOT NULL CHECK (tier IN
    ('internal','pilot','public','trial','free','pro','enterprise')),
  rpm_limit INTEGER NOT NULL DEFAULT 34,  -- FIB[8]
  daily_limit INTEGER DEFAULT 1000,
  scopes JSONB DEFAULT '["read"]',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);

-- Pilot Onboarding State Machine
CREATE TABLE IF NOT EXISTS onboarding_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  current_stage INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 5),
  stage_1_identity JSONB DEFAULT '{}',
  stage_2_logic JSONB DEFAULT '{}',
  stage_3_data JSONB DEFAULT '{}',
  stage_4_keys JSONB DEFAULT '{}',
  stage_5_deploy JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Run History
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'running',
  stages_completed INTEGER DEFAULT 0,
  config_hash VARCHAR(64),
  ors_score FLOAT,  -- Operational Readiness Score 0-100
  duration_ms INTEGER,
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_run_id ON pipeline_runs(run_id);
