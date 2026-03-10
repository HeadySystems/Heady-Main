CREATE TABLE IF NOT EXISTS memory_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  projection_x DOUBLE PRECISION,
  projection_y DOUBLE PRECISION,
  projection_z DOUBLE PRECISION,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memory_documents_embedding_idx
  ON memory_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS memory_documents_namespace_idx
  ON memory_documents (namespace);
