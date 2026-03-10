# ADR 004: pgvector Over Pinecone/Weaviate

**Status:** Accepted

## Context

Heady performs semantic search across 9 content domains with diverse data types:
- User profiles and behavioral embeddings
- Content vectors (articles, images, metadata)
- Semantic relationships (entity graphs)
- Temporal vectors (time-series content)

Vector similarity search required:
- **Transactional guarantees:** Consistency between embedding and content metadata
- **Schema flexibility:** Different content types require different embedding dimensions and metadata
- **Cost predictability:** Avoid per-query pricing or surprise vendor lock-in
- **Operational simplicity:** Single database, single backup strategy, single access pattern

Evaluated alternatives:
1. **Pinecone:** Managed vector DB, high cost (~$100+/month per project), limited transactional consistency
2. **Weaviate:** Self-hosted, GraphQL API (adds latency), replication complexity
3. **pgvector:** PostgreSQL extension, ACID compliance, built-in replication, existing ecosystem

## Decision

Use **pgvector** (PostgreSQL extension) for all vector similarity operations:

Infrastructure:
- Neon PostgreSQL (serverless, auto-scaling, branch isolation)
- pgvector extension enabled on all instances
- HNSW indexing (Hierarchical Navigable Small World) for O(log N) similarity search
- Connection pooling: 21 (FIB[8]) concurrent queries

Vector storage schema:
```sql
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  content_id UUID NOT NULL,
  embedding vector(1597),  -- FIB[16] dimensions
  embedding_metadata jsonb,
  confidence FLOAT NOT NULL,
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

Queries use cosine similarity:
```sql
SELECT content_id, 1 - (embedding <=> query_embedding) AS similarity
FROM embeddings
WHERE 1 - (embedding <=> query_embedding) > 0.809  -- CSL INCLUDE threshold
ORDER BY similarity DESC
LIMIT 21;  -- FIB[8]
```

Integration points:
- heady-brain (inference service) writes embeddings to pgvector after model inference
- search-service queries pgvector for similarity results
- Vector purge job removes stale embeddings via scheduled tasks
- Replication: Neon read replicas for geographic distribution

## Consequences

**Positive:**
- Single source of truth: embedding + metadata in same ACID transaction
- Cost predictable: pay for PostgreSQL compute/storage, not per-query charges
- No vendor lock-in: pgvector is open source; data is pure PostgreSQL
- Operational simplicity: leverage existing PostgreSQL expertise, monitoring, backup tools
- Semantic consistency: transactions guarantee embedding and content metadata stay synchronized
- Scale flexibility: add read replicas without changing application code

**Negative:**
- Vector search slower than specialized engines (Pinecone, Milvus) on 100M+ vectors
- HNSW indexing requires tuning (ef_construction, ef parameter) for performance
- No built-in multi-region sharding (rely on PostgreSQL replication + read replicas)
- Embedding import requires custom batch pipeline (no Pinecone-like bulk API)
- PgVector query latency sensitivity to index quality; must monitor VACUUM and REINDEX operations

**Performance characteristics:**
- Embedding write: ~50ms (PostgreSQL + HNSW insert)
- Similarity search (k=21): ~15-50ms depending on index quality and vector dimension
- Batch embedding write (1000 vectors): ~500ms (connection pool + batch insert)
- Timeout (CSL gate): 3400ms (FIB[10] × φ, allows index refresh before timeout)

**Operational requirements:**
- Monitor pgvector HNSW index fragmentation; REINDEX monthly
- Tune ef_construction=144 (FIB[11]) for optimal insertion speed
- Monitor table bloat; VACUUM pgvector tables weekly
- Connection pool exhaustion watch: trigger scale-out at >18 (FIB[8] - 3) concurrent queries
- Backup: automated Neon snapshots, cross-region replica maintained

## Related Decisions
- [ADR 001: Phi-Scaled Architecture](./001-phi-scaled-architecture.md)
