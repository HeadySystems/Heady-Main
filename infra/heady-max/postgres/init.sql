-- Heady PostgreSQL Initialization
-- Author: Eric Haywood / HeadySystems Inc.
-- All numeric constants derived from φ (1.618) or Fibonacci sequence:
-- [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS heady;
SET search_path TO heady, public;

-- ============================================================================
-- Embeddings — primary vector storage (384-dimensional, all-MiniLM-L6-v2)
-- ============================================================================

CREATE TABLE heady.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    embedding vector(384) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    projected_3d vector(3),
    source_service TEXT NOT NULL DEFAULT 'heady-embed',
    similarity_cluster INTEGER,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_hnsw ON heady.embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 32, ef_construction = 200);

CREATE INDEX idx_embeddings_key ON heady.embeddings (key);
CREATE INDEX idx_embeddings_source ON heady.embeddings (source_service);
CREATE INDEX idx_embeddings_metadata ON heady.embeddings USING gin (metadata);
CREATE INDEX idx_embeddings_created ON heady.embeddings (created_at DESC);
CREATE INDEX idx_embeddings_3d_hnsw ON heady.embeddings
    USING hnsw (projected_3d vector_cosine_ops)
    WITH (m = 16, ef_construction = 89);

-- ============================================================================
-- Sessions — user session tracking with Firebase auth
-- ============================================================================

CREATE TABLE heady.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    firebase_uid TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2584 seconds'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON heady.sessions (user_id);
CREATE INDEX idx_sessions_firebase ON heady.sessions (firebase_uid);
CREATE INDEX idx_sessions_token ON heady.sessions (session_token) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_expires ON heady.sessions (expires_at) WHERE is_active = TRUE;

-- ============================================================================
-- Audit Log — system-wide audit trail
-- Fibonacci-partitioned by month for efficient retention
-- ============================================================================

CREATE TABLE heady.audit_log (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    actor_id TEXT,
    actor_type TEXT NOT NULL DEFAULT 'system',
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    service_name TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    correlation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE heady.audit_log_y2026_q1 PARTITION OF heady.audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE heady.audit_log_y2026_q2 PARTITION OF heady.audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE heady.audit_log_y2026_q3 PARTITION OF heady.audit_log
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE heady.audit_log_y2026_q4 PARTITION OF heady.audit_log
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE heady.audit_log_y2027_q1 PARTITION OF heady.audit_log
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

CREATE INDEX idx_audit_event_type ON heady.audit_log (event_type, created_at DESC);
CREATE INDEX idx_audit_actor ON heady.audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON heady.audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_service ON heady.audit_log (service_name, created_at DESC);
CREATE INDEX idx_audit_correlation ON heady.audit_log (correlation_id);
CREATE INDEX idx_audit_details ON heady.audit_log USING gin (details);

-- ============================================================================
-- Wisdom Cache — φ-scaled cached inference results
-- ============================================================================

CREATE TABLE heady.wisdom_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE,
    query_hash TEXT NOT NULL,
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    response_metadata JSONB NOT NULL DEFAULT '{}',
    model_id TEXT NOT NULL,
    token_count_input INTEGER NOT NULL DEFAULT 0,
    token_count_output INTEGER NOT NULL DEFAULT 0,
    quality_score NUMERIC(5, 3) NOT NULL DEFAULT 0.618,
    phi_decay_factor NUMERIC(8, 5) NOT NULL DEFAULT 1.618,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_seconds INTEGER NOT NULL DEFAULT 4181,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4181 seconds'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wisdom_cache_key ON heady.wisdom_cache (cache_key);
CREATE INDEX idx_wisdom_query_hash ON heady.wisdom_cache (query_hash);
CREATE INDEX idx_wisdom_model ON heady.wisdom_cache (model_id);
CREATE INDEX idx_wisdom_quality ON heady.wisdom_cache (quality_score DESC);
CREATE INDEX idx_wisdom_expires ON heady.wisdom_cache (expires_at);
CREATE INDEX idx_wisdom_metadata ON heady.wisdom_cache USING gin (response_metadata);

-- ============================================================================
-- Pipeline Runs — 21-stage HCFullPipeline execution tracking
-- ============================================================================

CREATE TABLE heady.pipeline_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_name TEXT NOT NULL DEFAULT 'hcfullpipeline',
    trigger_source TEXT NOT NULL,
    trigger_id TEXT,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    current_stage INTEGER NOT NULL DEFAULT 0,
    total_stages INTEGER NOT NULL DEFAULT 21,
    stage_results JSONB NOT NULL DEFAULT '[]',
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB,
    error_details JSONB,
    phi_score NUMERIC(8, 5),
    duration_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE heady.pipeline_runs_y2026_q1 PARTITION OF heady.pipeline_runs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE heady.pipeline_runs_y2026_q2 PARTITION OF heady.pipeline_runs
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE heady.pipeline_runs_y2026_q3 PARTITION OF heady.pipeline_runs
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE heady.pipeline_runs_y2026_q4 PARTITION OF heady.pipeline_runs
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE heady.pipeline_runs_y2027_q1 PARTITION OF heady.pipeline_runs
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

CREATE INDEX idx_pipeline_status ON heady.pipeline_runs (status, created_at DESC);
CREATE INDEX idx_pipeline_user ON heady.pipeline_runs (user_id, created_at DESC);
CREATE INDEX idx_pipeline_trigger ON heady.pipeline_runs (trigger_source, trigger_id);
CREATE INDEX idx_pipeline_results ON heady.pipeline_runs USING gin (stage_results);

-- ============================================================================
-- Bee Registry — worker bee lifecycle management (max 6765 = fib(20))
-- ============================================================================

CREATE TABLE heady.bee_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bee_id TEXT NOT NULL UNIQUE,
    swarm_id TEXT NOT NULL,
    bee_type TEXT NOT NULL DEFAULT 'worker',
    status TEXT NOT NULL DEFAULT 'idle',
    assigned_task_id TEXT,
    capabilities JSONB NOT NULL DEFAULT '[]',
    performance_score NUMERIC(5, 3) NOT NULL DEFAULT 0.618,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    tasks_failed INTEGER NOT NULL DEFAULT 0,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2584 seconds'),
    spawned_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retired_at TIMESTAMPTZ
);

CREATE INDEX idx_bee_swarm ON heady.bee_registry (swarm_id, status);
CREATE INDEX idx_bee_status ON heady.bee_registry (status) WHERE status IN ('idle', 'working', 'spawning');
CREATE INDEX idx_bee_heartbeat ON heady.bee_registry (last_heartbeat_at) WHERE status != 'retired';
CREATE INDEX idx_bee_ttl ON heady.bee_registry (ttl_expires_at) WHERE retired_at IS NULL;
CREATE INDEX idx_bee_performance ON heady.bee_registry (performance_score DESC);
CREATE INDEX idx_bee_capabilities ON heady.bee_registry USING gin (capabilities);

-- ============================================================================
-- Learning Events — continuous learning and adaptation records
-- ============================================================================

CREATE TABLE heady.learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    source_service TEXT NOT NULL,
    user_id TEXT,
    context_key TEXT,
    input_summary TEXT,
    outcome TEXT NOT NULL,
    outcome_score NUMERIC(5, 3),
    feedback_type TEXT,
    feedback_value JSONB,
    embedding_id UUID REFERENCES heady.embeddings(id) ON DELETE SET NULL,
    pattern_tags TEXT[] NOT NULL DEFAULT '{}',
    phi_weight NUMERIC(8, 5) NOT NULL DEFAULT 1.618,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE heady.learning_events_y2026_q1 PARTITION OF heady.learning_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE heady.learning_events_y2026_q2 PARTITION OF heady.learning_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE heady.learning_events_y2026_q3 PARTITION OF heady.learning_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE heady.learning_events_y2026_q4 PARTITION OF heady.learning_events
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE heady.learning_events_y2027_q1 PARTITION OF heady.learning_events
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

CREATE INDEX idx_learning_type ON heady.learning_events (event_type, created_at DESC);
CREATE INDEX idx_learning_source ON heady.learning_events (source_service, created_at DESC);
CREATE INDEX idx_learning_user ON heady.learning_events (user_id, created_at DESC);
CREATE INDEX idx_learning_outcome ON heady.learning_events (outcome_score DESC);
CREATE INDEX idx_learning_tags ON heady.learning_events USING gin (pattern_tags);
CREATE INDEX idx_learning_feedback ON heady.learning_events USING gin (feedback_value);

-- ============================================================================
-- Prompt Catalogue — versioned prompt templates
-- ============================================================================

CREATE TABLE heady.prompt_catalogue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_key TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL,
    template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    quality_score NUMERIC(5, 3) NOT NULL DEFAULT 0.618,
    usage_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (prompt_key, version)
);

CREATE INDEX idx_prompt_key ON heady.prompt_catalogue (prompt_key, version DESC);
CREATE INDEX idx_prompt_category ON heady.prompt_catalogue (category) WHERE is_active = TRUE;
CREATE INDEX idx_prompt_quality ON heady.prompt_catalogue (quality_score DESC) WHERE is_active = TRUE;

-- ============================================================================
-- Scheduled Jobs — φ-scaled cron job registry
-- ============================================================================

CREATE TABLE heady.scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    handler_service TEXT NOT NULL,
    handler_endpoint TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    last_status TEXT,
    last_duration_ms INTEGER,
    run_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    phi_interval_scale NUMERIC(8, 5) NOT NULL DEFAULT 1.618,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_next_run ON heady.scheduled_jobs (next_run_at) WHERE is_enabled = TRUE;
CREATE INDEX idx_jobs_handler ON heady.scheduled_jobs (handler_service);

-- ============================================================================
-- Budget Tracking — AI provider cost aggregation
-- ============================================================================

CREATE TABLE heady.budget_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    tokens_input INTEGER NOT NULL DEFAULT 0,
    tokens_output INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(12, 8) NOT NULL DEFAULT 0,
    request_count INTEGER NOT NULL DEFAULT 1,
    user_id TEXT,
    service_name TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (period_start);

CREATE TABLE heady.budget_tracking_y2026_m03 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE heady.budget_tracking_y2026_m04 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE heady.budget_tracking_y2026_m05 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE heady.budget_tracking_y2026_m06 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE heady.budget_tracking_y2026_m07 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE heady.budget_tracking_y2026_m08 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE heady.budget_tracking_y2026_m09 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE heady.budget_tracking_y2026_m10 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE heady.budget_tracking_y2026_m11 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE heady.budget_tracking_y2026_m12 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE heady.budget_tracking_y2027_m01 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE heady.budget_tracking_y2027_m02 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE heady.budget_tracking_y2027_m03 PARTITION OF heady.budget_tracking
    FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');

CREATE INDEX idx_budget_provider ON heady.budget_tracking (provider, model_id, period_start DESC);
CREATE INDEX idx_budget_service ON heady.budget_tracking (service_name, period_start DESC);
CREATE INDEX idx_budget_user ON heady.budget_tracking (user_id, period_start DESC);

-- ============================================================================
-- Billing — Stripe integration tables
-- ============================================================================

CREATE TABLE heady.billing_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    plan_id TEXT NOT NULL DEFAULT 'free',
    plan_status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_user ON heady.billing_customers (user_id);
CREATE INDEX idx_billing_stripe ON heady.billing_customers (stripe_customer_id);
CREATE INDEX idx_billing_plan ON heady.billing_customers (plan_id, plan_status);

CREATE TABLE heady.billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    customer_id UUID REFERENCES heady.billing_customers(id),
    payload JSONB NOT NULL DEFAULT '{}',
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_events_type ON heady.billing_events (event_type, created_at DESC);
CREATE INDEX idx_billing_events_customer ON heady.billing_events (customer_id, created_at DESC);
CREATE INDEX idx_billing_events_unprocessed ON heady.billing_events (created_at) WHERE processed = FALSE;

-- ============================================================================
-- Soul Archetypes — 7-archetype awareness layer
-- ============================================================================

CREATE TABLE heady.soul_archetypes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archetype_name TEXT NOT NULL UNIQUE,
    archetype_index INTEGER NOT NULL CHECK (archetype_index >= 1 AND archetype_index <= 7),
    description TEXT NOT NULL,
    traits JSONB NOT NULL DEFAULT '[]',
    activation_threshold NUMERIC(5, 3) NOT NULL DEFAULT 0.618,
    phi_resonance NUMERIC(8, 5) NOT NULL DEFAULT 1.618,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Service Health — health matrix snapshots
-- ============================================================================

CREATE TABLE heady.service_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    response_time_ms INTEGER,
    error_rate NUMERIC(5, 3) NOT NULL DEFAULT 0,
    uptime_percent NUMERIC(6, 3) NOT NULL DEFAULT 100.000,
    last_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (checked_at);

CREATE TABLE heady.service_health_y2026_q1 PARTITION OF heady.service_health
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE heady.service_health_y2026_q2 PARTITION OF heady.service_health
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE heady.service_health_y2026_q3 PARTITION OF heady.service_health
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE heady.service_health_y2026_q4 PARTITION OF heady.service_health
    FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');
CREATE TABLE heady.service_health_y2027_q1 PARTITION OF heady.service_health
    FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');

CREATE INDEX idx_health_service ON heady.service_health (service_name, checked_at DESC);
CREATE INDEX idx_health_status ON heady.service_health (status, checked_at DESC);

-- ============================================================================
-- Migration Tracking
-- ============================================================================

CREATE TABLE heady.migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    applied_by TEXT NOT NULL DEFAULT 'migration-service',
    checksum TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Narrative Events — autobiographer event store
-- ============================================================================

CREATE TABLE heady.narrative_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    narrative_text TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    emotional_valence NUMERIC(5, 3),
    significance_score NUMERIC(5, 3) NOT NULL DEFAULT 0.618,
    related_embedding_id UUID REFERENCES heady.embeddings(id) ON DELETE SET NULL,
    chapter_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narrative_user ON heady.narrative_events (user_id, created_at DESC);
CREATE INDEX idx_narrative_chapter ON heady.narrative_events (chapter_id, created_at DESC);
CREATE INDEX idx_narrative_significance ON heady.narrative_events (significance_score DESC);
CREATE INDEX idx_narrative_context ON heady.narrative_events USING gin (context);

-- ============================================================================
-- Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION heady.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_embeddings_updated
    BEFORE UPDATE ON heady.embeddings
    FOR EACH ROW EXECUTE FUNCTION heady.update_updated_at();

CREATE TRIGGER trg_wisdom_cache_updated
    BEFORE UPDATE ON heady.wisdom_cache
    FOR EACH ROW EXECUTE FUNCTION heady.update_updated_at();

CREATE TRIGGER trg_prompt_catalogue_updated
    BEFORE UPDATE ON heady.prompt_catalogue
    FOR EACH ROW EXECUTE FUNCTION heady.update_updated_at();

CREATE TRIGGER trg_scheduled_jobs_updated
    BEFORE UPDATE ON heady.scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION heady.update_updated_at();

CREATE TRIGGER trg_billing_customers_updated
    BEFORE UPDATE ON heady.billing_customers
    FOR EACH ROW EXECUTE FUNCTION heady.update_updated_at();

CREATE TRIGGER trg_soul_archetypes_updated
    BEFORE UPDATE ON heady.soul_archetypes
    FOR EACH ROW EXECUTE FUNCTION heady.update_updated_at();

CREATE OR REPLACE FUNCTION heady.cosine_similarity_search(
    query_embedding vector(384),
    match_threshold NUMERIC DEFAULT 0.618,
    match_count INTEGER DEFAULT 13
)
RETURNS TABLE (
    id UUID,
    key TEXT,
    metadata JSONB,
    similarity NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.key,
        e.metadata,
        (1 - (e.embedding <=> query_embedding))::NUMERIC AS similarity
    FROM heady.embeddings e
    WHERE (1 - (e.embedding <=> query_embedding)) >= match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION heady.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM heady.wisdom_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION heady.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    UPDATE heady.sessions
    SET is_active = FALSE
    WHERE is_active = TRUE AND expires_at < NOW();

    GET DIAGNOSTICS deactivated_count = ROW_COUNT;
    RETURN deactivated_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION heady.retire_expired_bees()
RETURNS INTEGER AS $$
DECLARE
    retired_count INTEGER;
BEGIN
    UPDATE heady.bee_registry
    SET status = 'retired', retired_at = NOW()
    WHERE retired_at IS NULL AND ttl_expires_at < NOW();

    GET DIAGNOSTICS retired_count = ROW_COUNT;
    RETURN retired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Seed Data: 7 Soul Archetypes
-- ============================================================================

INSERT INTO heady.soul_archetypes (archetype_name, archetype_index, description, traits, activation_threshold, phi_resonance) VALUES
('The Observer', 1, 'Watches patterns emerge without judgment, collecting data before forming conclusions', '["analytical", "patient", "perceptive", "detached"]', 0.382, 1.618),
('The Builder', 2, 'Constructs solutions methodically, turning abstract ideas into concrete implementations', '["practical", "systematic", "persistent", "grounded"]', 0.618, 2.618),
('The Connector', 3, 'Links disparate concepts and people, finding hidden relationships and synergies', '["intuitive", "social", "creative", "bridging"]', 0.618, 4.236),
('The Guardian', 4, 'Protects system integrity and user trust through vigilant security and governance', '["protective", "vigilant", "principled", "thorough"]', 0.382, 2.618),
('The Explorer', 5, 'Ventures into unknown territory, testing boundaries and discovering new possibilities', '["curious", "adventurous", "experimental", "resilient"]', 0.618, 6.854),
('The Teacher', 6, 'Translates complex knowledge into accessible understanding, adapting to each learner', '["empathetic", "clear", "adaptive", "nurturing"]', 0.618, 4.236),
('The Harmonizer', 7, 'Balances competing forces using φ-proportioned weighting for optimal equilibrium', '["balanced", "diplomatic", "integrative", "phi-attuned"]', 0.382, 11.090);

-- ============================================================================
-- Record initial migration
-- ============================================================================

INSERT INTO heady.migrations (version, name, checksum)
VALUES ('001', 'initial_schema', md5('heady-init-v1-phi-1.618'));
