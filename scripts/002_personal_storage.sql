-- ============================================================================
-- HEADY™ PERSONAL STORAGE SCHEMA v1.0
-- Migration: 002_personal_storage.sql
-- Target: Neon Postgres (ep-cold-snow-aesmiwt9.c-2.us-east-2.aws.neon.tech)
-- Depends: 001_foundation.sql (users table, pgvector, uuid-ossp, pg_trgm)
--
-- Per-user persistent key-value + vector storage (T1 warm tier)
-- Read: T0 Redis → T1 Neon → T2 Qdrant (promote on access)
-- Write: T0 + T1 simultaneously, T2 via async consolidation
--
-- © 2026 HeadySystems Inc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS personal_storage (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Hierarchical key: "preferences/theme", "buddy/history/2026-03-22"
    key             TEXT NOT NULL,
    value           TEXT NOT NULL,                 -- JSON-encoded
    content_hash    TEXT NOT NULL,                  -- SHA-256 of value

    category        TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
        'general', 'preferences', 'buddy_history', 'documents', 'bookmarks',
        'notes', 'projects', 'credentials', 'analytics', 'finance',
        'learning', 'creative'
    )),

    csl_score       REAL NOT NULL DEFAULT 0.618 CHECK (csl_score >= 0.0 AND csl_score <= 1.0),

    -- Vector embedding for semantic search (populated async by embedding pipeline)
    embedding       halfvec(1536),

    -- Access tracking (drives T0 promotion + T2 consolidation)
    access_count    INTEGER NOT NULL DEFAULT 0,
    last_accessed   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- NULL = persistent forever, otherwise auto-expires
    expires_at      TIMESTAMPTZ,

    -- Arbitrary user metadata (tags, source site, buddy context)
    metadata        JSONB NOT NULL DEFAULT '{}',

    size_bytes      INTEGER GENERATED ALWAYS AS (LENGTH(value)) STORED,

    -- T2 consolidation tracking
    consolidated_to_t2  BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, key)
);

-- ── INDEXES ────────────────────────────────────────────────────
CREATE INDEX idx_ps_user_key      ON personal_storage (user_id, key);
CREATE INDEX idx_ps_category      ON personal_storage (user_id, category);
CREATE INDEX idx_ps_last_accessed ON personal_storage (user_id, last_accessed DESC);
CREATE INDEX idx_ps_csl           ON personal_storage (csl_score) WHERE csl_score >= 0.618;
CREATE INDEX idx_ps_expiry        ON personal_storage (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_ps_hash          ON personal_storage (content_hash);
CREATE INDEX idx_ps_trgm          ON personal_storage USING gin ((key || ' ' || COALESCE(metadata->>'tags', '')) gin_trgm_ops);

-- Vector HNSW for semantic search (only on rows that have embeddings)
CREATE INDEX idx_ps_embedding ON personal_storage
    USING hnsw (embedding halfvec_cosine_ops) WITH (m = 16, ef_construction = 200)
    WHERE embedding IS NOT NULL;

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE personal_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_user_isolation ON personal_storage
    USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY ps_user_insert ON personal_storage
    FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::UUID);

-- ── STORAGE QUOTAS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS storage_quotas (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    max_items       INTEGER NOT NULL DEFAULT 1000,      -- free tier
    max_bytes       BIGINT NOT NULL DEFAULT 52428800,    -- 50 MB free tier
    current_items   INTEGER NOT NULL DEFAULT 0,
    current_bytes   BIGINT NOT NULL DEFAULT 0,
    tier            TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quota limits by tier (used by application logic):
-- free:       1,000 items / 50 MB    / 384D vectors
-- pro:       13,000 items / 500 MB   / 1536D vectors
-- enterprise: unlimited   / unlimited / 1536D + custom dimensions

-- ── TRIGGER: auto-update quotas on insert/delete ──────────────
CREATE OR REPLACE FUNCTION update_storage_quotas() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO storage_quotas (user_id)
        VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO UPDATE SET
            current_items = storage_quotas.current_items + 1,
            current_bytes = storage_quotas.current_bytes + LENGTH(NEW.value),
            updated_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE storage_quotas SET
            current_items = GREATEST(0, current_items - 1),
            current_bytes = GREATEST(0, current_bytes - LENGTH(OLD.value)),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE storage_quotas SET
            current_bytes = current_bytes - LENGTH(OLD.value) + LENGTH(NEW.value),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_storage_quota
    AFTER INSERT OR UPDATE OR DELETE ON personal_storage
    FOR EACH ROW EXECUTE FUNCTION update_storage_quotas();

-- ── TRIGGER: auto-update updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION ps_touch_updated() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ps_updated
    BEFORE UPDATE ON personal_storage
    FOR EACH ROW EXECUTE FUNCTION ps_touch_updated();

-- ── CONSOLIDATION JOB HELPER ──────────────────────────────────
-- Finds items eligible for T2 consolidation:
-- accessed >= fib(5) = 5 times, older than fib(9) = 34 days, not yet consolidated
CREATE OR REPLACE FUNCTION find_consolidation_candidates(batch_limit INTEGER DEFAULT 34)
RETURNS TABLE(item_id UUID, item_user_id UUID, item_key TEXT, item_value TEXT, item_csl REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT id, user_id, key, value, csl_score
    FROM personal_storage
    WHERE consolidated_to_t2 = FALSE
      AND access_count >= 5
      AND created_at < NOW() - INTERVAL '34 days'
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY csl_score DESC, access_count DESC
    LIMIT batch_limit;
END;
$$ LANGUAGE plpgsql;

-- ── CLEANUP: expired storage items ────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_storage() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM personal_storage
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ── MIGRATION RECORD ──────────────────────────────────────────
INSERT INTO audit_log (actor_id, action, resource_type, resource_id, details)
VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'migration.apply',
    'schema',
    '002_personal_storage',
    '{"version": "1.0.0", "tables": ["personal_storage", "storage_quotas"]}'::JSONB
);
