CREATE TABLE IF NOT EXISTS graph_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  entity_type TEXT,
  description TEXT,
  embedding vector(384),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL,
  source_entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0.618,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL,
  level INTEGER NOT NULL,
  summary TEXT,
  entity_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
