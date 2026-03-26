-- HeadySync: Neon Postgres migration for Linear ↔ Slack bi-directional sync
-- Run against your Neon database to create the required state tables.
-- © 2026 HeadySystems Inc.

-- ═══════════════════════════════════════════════════════════════════
-- Table 1: Issue ↔ Slack message mappings
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS issue_channel_map (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linear_issue_id   TEXT NOT NULL,
  linear_identifier TEXT,                           -- "HEA-123"
  slack_channel_id  TEXT NOT NULL,
  slack_message_ts  TEXT,                           -- Top-level message timestamp
  slack_thread_ts   TEXT,                           -- Thread parent TS
  sync_direction    TEXT NOT NULL DEFAULT 'bidirectional'
    CHECK (sync_direction IN ('linear_to_slack','slack_to_linear','bidirectional')),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_linear_issue_channel UNIQUE (linear_issue_id, slack_channel_id)
);

CREATE INDEX IF NOT EXISTS idx_icm_linear
  ON issue_channel_map(linear_issue_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_icm_slack
  ON issue_channel_map(slack_channel_id, slack_message_ts) WHERE is_active;

-- ═══════════════════════════════════════════════════════════════════
-- Table 2: Comment ↔ Slack thread reply mappings
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS comment_mappings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linear_comment_id TEXT NOT NULL UNIQUE,
  linear_issue_id   TEXT NOT NULL,
  slack_channel_id  TEXT NOT NULL,
  slack_message_ts  TEXT NOT NULL,
  slack_thread_ts   TEXT NOT NULL,
  direction         TEXT NOT NULL,                  -- 'linear→slack' or 'slack→linear'
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Table 3: Webhook event audit log (for debugging & replay)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id   TEXT,                               -- Linear-Delivery UUID or Slack event_id
  source        TEXT NOT NULL CHECK (source IN ('linear', 'slack')),
  event_type    TEXT NOT NULL,
  resource_id   TEXT,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed','skipped')),
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_we_dedup
  ON webhook_events(source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_we_status
  ON webhook_events(status, created_at);
