# ADR-003: pgvector Over Pinecone/Weaviate

## Status

Accepted

## Date

2024-08-21

## Context

The Heady™ platform performs extensive vector operations: semantic search across documents, embedding storage for AI memory, similarity computations for agent coordination, and hybrid search combining full-text BM25 with vector cosine similarity. Multiple services depend on vector storage: heady-vector, heady-embed, heady-memory, heady-projection, search-service, and analytics-service.

We evaluated three vector database approaches:

1. **Pinecone**: Managed vector database as a service
2. **Weaviate**: Self-hosted or cloud vector database with GraphQL API
3. **pgvector**: PostgreSQL extension adding vector similarity search to existing Postgres

Key requirements:
- 384-dimensional vectors (VECTOR_DIM constant across all services)
- HNSW index for approximate nearest neighbor search
- Hybrid search: combine vector similarity with full-text search in a single query
- Co-location with relational data (sessions, users, migrations, analytics)
- Sub-100ms query latency for p99
- Self-hosted option for data sovereignty
- Fibonacci-bounded connection pools (34 default, 233 max)

## Decision

We use pgvector (pgvector/pgvector:pg16) as the sole vector storage engine for the Heady™ platform.

Configuration:
- PostgreSQL 16 with pgvector extension
- HNSW indexes on 384-dimensional vector columns
- `CREATE EXTENSION vector` in the initial migration
- `heady_vectors` table with `embedding vector(384)` column
- Connection pooling via PgBouncer: pool_size=34, max_conn=233 (Fibonacci)
- Co-located with relational tables: sessions, users, analytics events, migrations

The search-service implements hybrid search using Reciprocal Rank Fusion (RRF) with φ-weighted fusion:
- Vector similarity weight: PSI (0.618)
- Full-text BM25 weight: PSI2 (0.382)
- Combined via `1 / (k + rank)` where k is φ-derived

## Consequences

### Benefits
- Single database: no additional infrastructure to manage, monitor, or pay for
- ACID transactions: vector operations participate in PostgreSQL transactions
- Hybrid queries: `SELECT ... ORDER BY embedding <=> $1` combined with `ts_rank` in one query
- Existing tooling: pg_dump, pg_restore, pgAdmin, standard Postgres monitoring
- Cost: zero additional vendor cost — pgvector is open source and free
- Data co-location: joins between vector data and relational data without cross-service calls
- Self-hosted: full data sovereignty, no third-party data processing

### Costs
- Scale ceiling: pgvector on a single Postgres instance tops out around 10M vectors with acceptable latency
- No managed scaling: we handle replication, backups, and failover ourselves
- Feature gap: Pinecone offers metadata filtering natively; pgvector requires manual WHERE clauses
- HNSW memory: the index must fit in memory for optimal performance

### Mitigations
- 10M vector ceiling is sufficient for current and projected load (Fibonacci growth model)
- Docker volume persistence with automated pg_dump backups
- migration-service provides up/down schema management with rollback
- PgBouncer connection pooling prevents connection exhaustion under load
- PostgreSQL 16's improved parallel query execution helps with large scans
