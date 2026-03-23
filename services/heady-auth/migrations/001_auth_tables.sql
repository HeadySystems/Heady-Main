-- ═══════════════════════════════════════════════════════════════
-- HEADY AUTH — Database Migration: Core Tables
-- ∞ Neon Postgres :: T1 Persistent Storage ∞
-- ═══════════════════════════════════════════════════════════════
-- Run: psql "$DATABASE_URL" -f 001_auth_tables.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid          TEXT UNIQUE NOT NULL,
  email                 TEXT,
  display_name          TEXT,
  avatar_url            TEXT,
  auth_provider         TEXT DEFAULT 'email',
  subscription_tier     TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'internal')),
  onboarding_completed  BOOLEAN DEFAULT FALSE,
  last_login_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- ── Sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token     TEXT UNIQUE NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  renew_after       TIMESTAMPTZ NOT NULL,
  absolute_expiry   TIMESTAMPTZ NOT NULL,
  origin_site       TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

-- ── Personal Storage (T1) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_storage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  value           TEXT NOT NULL,
  content_hash    TEXT NOT NULL,
  category        TEXT DEFAULT 'general',
  csl_score       REAL DEFAULT 0.618,
  access_count    INTEGER DEFAULT 0,
  last_accessed   TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_storage_user_key ON personal_storage(user_id, key);
CREATE INDEX IF NOT EXISTS idx_storage_category ON personal_storage(user_id, category);
CREATE INDEX IF NOT EXISTS idx_storage_expiry ON personal_storage(expires_at) WHERE expires_at IS NOT NULL;

-- Trigram index for fuzzy text search
CREATE INDEX IF NOT EXISTS idx_storage_trgm ON personal_storage USING gin (
  (key || ' ' || COALESCE(metadata->>'tags', '')) gin_trgm_ops
);

-- ── Memory T1 (for lead conversion data) ─────────────────────
CREATE TABLE IF NOT EXISTS memory_t1 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  node_id         TEXT NOT NULL,
  memory_type     TEXT NOT NULL,
  content         TEXT NOT NULL,
  content_hash    TEXT UNIQUE NOT NULL,
  csl_score       REAL DEFAULT 0.618,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_t1(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_node ON memory_t1(node_id);

-- ── Audit Log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id        UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at);

-- ── Storage Quotas ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS storage_quotas (
  tier            TEXT PRIMARY KEY,
  max_items       INTEGER NOT NULL,
  max_bytes       BIGINT NOT NULL,
  vector_dim      INTEGER DEFAULT 384,
  search_method   TEXT DEFAULT 'pg_trgm'
);

INSERT INTO storage_quotas (tier, max_items, max_bytes, vector_dim, search_method) VALUES
  ('free',       1000,    52428800,   384,  'pg_trgm'),
  ('pro',        13000,   524288000,  1536, 'pgvector'),
  ('enterprise', 999999,  5368709120, 1536, 'pgvector_qdrant')
ON CONFLICT (tier) DO NOTHING;

-- ── Cleanup job (auto-expire old sessions) ───────────────────
-- Run periodically: DELETE FROM sessions WHERE expires_at < NOW();
-- Run periodically: DELETE FROM personal_storage WHERE expires_at IS NOT NULL AND expires_at < NOW();
