# Runbook: search-service (Port 3401)

> Heady™ Platform — Hybrid Search Service
> Domain: data | All services are concurrent equals.
> © 2024-2026 HeadySystems Inc. All Rights Reserved.

## Service Overview

search-service provides hybrid search combining full-text BM25 scoring with vector cosine similarity. Results are merged using Reciprocal Rank Fusion (RRF) with φ-weighted fusion: vector weight PSI (0.618), text weight PSI2 (0.382). All results above the CSL include gate (0.382) are returned as concurrent equals — no ranking.

- **Port**: 3401
- **Health**: `http://localhost:3401/health`
- **Readiness**: `http://localhost:3401/readiness`
- **Domain**: data
- **Dependencies**: PostgreSQL + pgvector (:5432), heady-embed (:3315) for query embedding
- **Vector dimensions**: 384 (VECTOR_DIM)
- **Index type**: HNSW (Hierarchical Navigable Small World)
- **Fusion weights**: vector=PSI (0.618), text=PSI2 (0.382)

---

## Search Architecture

```
Query → BM25 Full-Text Search → Text Results (ranked by ts_rank)
     → Query Embedding (384d) → Vector Cosine Similarity → Vector Results
                                                                ↓
                         RRF Fusion (vector×0.618 + text×0.382)
                                                                ↓
                         CSL Gate Filter (include ≥ 0.382)
                                                                ↓
                         Results (concurrent equals, no ranking)
```

---

## Symptom: Search Returns No Results

### Diagnosis

```bash
# 1. Check service health
curl -s http://localhost:3401/health | jq .

# 2. Check index stats
curl -s http://localhost:3401/health | jq '.indexStats'

# 3. Test a simple search
curl -s -X POST http://localhost:3401/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 10}' | jq .

# 4. Check if documents exist in the index
curl -s http://localhost:3401/health | jq '.totalDocuments'

# 5. Check PostgreSQL vector table
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT count(*) FROM heady_vectors;"

# 6. Check if HNSW index exists
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'heady_vectors';"
```

### Fix

```bash
# If index is empty — need to index documents first
curl -s -X POST http://localhost:3401/index \
  -H "Content-Type: application/json" \
  -d '{"id": "test-1", "content": "This is a test document", "metadata": {"source": "runbook"}}'

# If HNSW index is missing — run migrations
curl -s -X POST http://localhost:3403/migrate/up | jq .

# If heady-embed is down (cannot generate query embeddings)
curl -s http://localhost:3315/health | jq .
docker compose restart heady-embed

# If PostgreSQL is unreachable
docker compose exec postgres pg_isready -U heady
docker compose restart postgres
```

---

## Symptom: Search Quality is Poor

### Diagnosis

```bash
# 1. Check fusion weights
curl -s http://localhost:3401/health | jq '.fusionWeights'
# Expected: { vector: 0.618 (PSI), text: 0.382 (PSI2) }

# 2. Test vector-only search
curl -s -X POST http://localhost:3401/search \
  -H "Content-Type: application/json" \
  -d '{"query": "your query", "mode": "vector"}' | jq .

# 3. Test text-only search
curl -s -X POST http://localhost:3401/search \
  -H "Content-Type: application/json" \
  -d '{"query": "your query", "mode": "text"}' | jq .

# 4. Compare results to diagnose which component is weak

# 5. Check embedding quality
curl -s -X POST http://localhost:3315/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "your query"}' | jq '.embedding | length'
# Should be 384
```

### Fix

```bash
# If vector search is poor — embeddings may be stale
# Re-index documents with fresh embeddings
curl -s -X POST http://localhost:3401/index \
  -H "Content-Type: application/json" \
  -d '{"id": "doc-id", "content": "document content", "reembed": true}'

# If text search is poor — check PostgreSQL text search configuration
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SHOW default_text_search_config;"

# If HNSW index is degraded — reindex
docker compose exec postgres psql -U heady -d heady_vector \
  -c "REINDEX INDEX heady_vectors_embedding_idx;"

# If CSL include gate (0.382) is filtering too aggressively
# This is by design — results below 0.382 relevance are excluded
# Check if documents in the index are relevant to the queries being made
```

---

## Symptom: High Latency on Search

### Diagnosis

```bash
# Check response time
time curl -s -X POST http://localhost:3401/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' > /dev/null

# Check bulkhead saturation
curl -s http://localhost:3401/health | jq '.bulkhead'

# Check PostgreSQL query performance
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE datname='heady_vector' AND state='active' ORDER BY duration DESC LIMIT 5;"

# Check HNSW index scan performance
docker compose exec postgres psql -U heady -d heady_vector \
  -c "EXPLAIN ANALYZE SELECT id FROM heady_vectors ORDER BY embedding <=> '[0.1, 0.2, ...]' LIMIT 10;"
```

### Fix

```bash
# If PostgreSQL is slow — check if HNSW index is being used
docker compose exec postgres psql -U heady -d heady_vector \
  -c "SET enable_seqscan = off; EXPLAIN SELECT id FROM heady_vectors ORDER BY embedding <=> '[0.1]' LIMIT 10;"

# If connection pool exhausted
# Check PgBouncer stats or direct PostgreSQL connections
docker compose exec postgres psql -U heady \
  -c "SELECT count(*) FROM pg_stat_activity;"

# If embedding generation is slow
time curl -s -X POST http://localhost:3315/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "test query"}'

# Restart if necessary
docker compose restart search-service
```

---

## Symptom: Document Indexing Fails

### Diagnosis

```bash
# Test indexing
curl -s -X POST http://localhost:3401/index \
  -H "Content-Type: application/json" \
  -d '{"id": "test-doc", "content": "test content"}' | jq .

# Check for vector dimension errors
docker compose logs search-service --tail=89 | jq 'select(.message | contains("dimension"))'

# Check PostgreSQL disk space
docker compose exec postgres df -h /var/lib/postgresql/data
```

### Fix

```bash
# If dimension mismatch (not 384)
# Ensure heady-embed returns 384-dim vectors
curl -s -X POST http://localhost:3315/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}' | jq '.embedding | length'

# If disk full
docker system prune -f

# If table doesn't exist
curl -s -X POST http://localhost:3403/migrate/up | jq .
```

---

## Log Locations

```bash
# All search logs
docker compose logs search-service

# Search queries
docker compose logs search-service | jq 'select(.message | contains("Search executed"))'

# Indexing operations
docker compose logs search-service | jq 'select(.message | contains("Document indexed"))'

# Errors
docker compose logs search-service | jq 'select(.level == "error")'

# By correlation ID
docker compose logs search-service | jq 'select(.correlationId == "<id>")'
```

---

## Escalation Path

1. **On-call engineer**: Follow diagnosis steps, check PostgreSQL health
2. **Data team**: If search quality issues persist after re-indexing
3. **Platform team**: If pgvector performance degradation affects multiple services
4. **Eric Haywood (founder)**: If search quality fundamentally not meeting user expectations

---

## Known Issues

1. **HNSW recall vs. speed tradeoff**: HNSW is approximate — some relevant results may be missed
2. **Cold index**: After PostgreSQL restart, first queries may be slower until index is cached in memory
3. **Embedding model changes**: If heady-embed switches models, all existing embeddings become stale
4. **In-memory index**: The in-memory document store is lost on restart; PostgreSQL is the durable store
