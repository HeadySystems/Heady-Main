# Global Debugging Guide for Heady Platform

This guide covers debugging techniques for the 50+ microservices architecture.

## Prerequisites

Required tools:
- kubectl (>= 1.24)
- docker
- Prometheus/Grafana access (http://grafana.heady-services.svc.cluster.local:3000)
- Elasticsearch access (http://elasticsearch.heady-services.svc.cluster.local:9200)
- Redis CLI (`redis-cli -h redis.heady-services.svc.cluster.local`)

## Enabling Debug Logging Across Services

### Method 1: Per-Service Debug Enable

```bash
# Enable debug logging for a single service
kubectl set env deployment/{SERVICE_NAME} \
  LOG_LEVEL=debug \
  -n heady-services

# Example: enable debug for heady-brain
kubectl set env deployment/heady-brain \
  LOG_LEVEL=debug \
  -n heady-services

# Verify env var was set
kubectl get deployment heady-brain -n heady-services -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="LOG_LEVEL")].value}'
# Output: debug

# Watch logs
kubectl logs -f deployment/heady-brain -n heady-services
```

### Method 2: Global Debug Enable (All Services)

```bash
# This applies debug logging to all heady services
kubectl patch configmap heady-global-config -n heady-services \
  --type merge \
  -p '{"data": {"LOG_LEVEL": "debug"}}'

# Restart all deployments to pick up new config
kubectl rollout restart deployment -n heady-services

# Watch all logs
kubectl logs -f -n heady-services --all-containers=true -l app=heady
```

### Method 3: Runtime Debugging (No Restart)

```bash
# Connect to a running pod and temporarily increase logging
POD=$(kubectl get pods -n heady-services -l app=heady-brain -o name | head -1)

kubectl exec -it $POD -n heady-services -- \
  curl -X POST http://localhost:3316/debug/log-level \
  -d '{"level":"debug"}' \
  -H "Content-Type: application/json"

# Log level change is in-memory only; lost on pod restart
# Useful for quick debugging without redeployment
```

### Verify Debug Logging is Active

```bash
# Check log level is set
kubectl get deployment heady-brain -n heady-services \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="LOG_LEVEL")]}' | jq .

# Watch for debug-level output
kubectl logs -f deployment/heady-brain -n heady-services | grep -i debug
```

## Tracing Requests Across Services Using Correlation ID

Every request automatically includes an X-Request-ID (correlation ID) header for end-to-end tracing.

### Generate and Track a Request

```bash
# 1. Make a request with a known correlation ID
CORRELATION_ID="debug-$(date +%s)"

curl -v \
  -H "X-Request-ID: $CORRELATION_ID" \
  -H "X-Correlation-ID: $CORRELATION_ID" \
  http://api-gateway.heady-services.svc.cluster.local/search \
  -d '{"q": "kubernetes"}' \
  2>&1 | tee /tmp/request.log

# 2. Extract correlation ID from response header if not provided
CORRELATION_ID=$(grep -i "x-request-id" /tmp/request.log | awk '{print $2}')
echo "Correlation ID: $CORRELATION_ID"
```

### Trace Across All Services

```bash
CORRELATION_ID="debug-1741503045"

# Search logs in all services for this correlation ID
kubectl logs -n heady-services -l app=heady \
  --all-containers=true \
  --timestamps=true \
  | grep -i "$CORRELATION_ID"

# Output shows all log entries for this request across services:
# [2026-03-09T10:30:45Z] heady-brain [DEBUG] [debug-1741503045] Inference started
# [2026-03-09T10:30:46Z] pgvector-pool [DEBUG] [debug-1741503045] Query: SELECT ... LIMIT 21
# [2026-03-09T10:30:46Z] semantic-search [DEBUG] [debug-1741503045] Reranking 21 results
```

### Visualize Request Trace in Jaeger/Grafana

```bash
# Forward Grafana locally
kubectl port-forward -n heady-services deployment/grafana 3000:3000

# Open http://localhost:3000 → Explore → Loki
# Query for correlation ID:
# {job="heady"} | "debug-1741503045"

# Or use Jaeger for distributed traces
kubectl port-forward -n heady-services deployment/jaeger-collector 16686:16686
# Open http://localhost:16686
# Search for Trace ID or correlation ID
```

## Inspecting pgvector Queries

### Monitor pgvector Query Performance

```bash
# Connect to PostgreSQL
kubectl port-forward -n heady-services svc/postgres 5432:5432
psql -h localhost -U heady_user -d heady_prod

# View slowest queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%vector%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analyze pgvector Index

```sql
-- Check HNSW index status
SELECT
  schemaname, tablename, indexname,
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE '%vector%'
ORDER BY idx_scan DESC;

-- Check index size
SELECT
  schemaname, tablename, indexname,
  pg_size_pretty(pg_relation_size(indexrelname::regclass)) AS size
FROM pg_stat_user_indexes
WHERE indexname LIKE '%vector%'
ORDER BY pg_relation_size(indexrelname::regclass) DESC;

-- Reindex if fragmented (index ratio > 20%)
REINDEX INDEX CONCURRENTLY embeddings_vector_idx;
```

### Test pgvector Query Directly

```sql
-- Test vector similarity search
SELECT
  content_id,
  1 - (embedding <=> query_embedding) AS similarity
FROM embeddings
WHERE 1 - (embedding <=> query_embedding) > 0.809  -- CSL INCLUDE threshold
ORDER BY similarity DESC
LIMIT 21;  -- FIB[8]

-- Explain plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT content_id, 1 - (embedding <=> query_embedding) AS similarity
FROM embeddings
WHERE 1 - (embedding <=> query_embedding) > 0.809
ORDER BY similarity DESC
LIMIT 21;
```

### Monitor pgvector Connection Pool

```bash
# Check connection pool status
curl http://pgvector-pool.heady-services.svc.cluster.local:3331/metrics | grep pg_pool

# Output:
# pg_pool_size 21          # Total pool size
# pg_pool_active 18        # Active connections
# pg_pool_idle 3           # Idle connections
# pg_pool_wait_queue 0     # Requests waiting for connection

# If pg_pool_wait_queue > 0, pool is exhausted; scale service
```

## Testing Circuit Breakers

### Find Circuit Breaker Implementation

```bash
# Search for circuit breaker code
kubectl exec -it deployment/heady-brain -n heady-services -- \
  grep -r "circuit.*breaker" /app/src/

# Check configured thresholds
kubectl get configmap heady-circuit-breaker-config -n heady-services -o yaml
```

### Trigger Circuit Breaker Manually

```bash
# 1. Simulate downstream service failure
# Scale down pgvector-pool to 0 to trigger circuit breaker
kubectl scale deployment pgvector-pool --replicas=0 -n heady-services

# 2. Make requests to heady-brain
curl -H "X-Request-ID: circuit-test-1" \
  http://api-gateway.heady-services.svc.cluster.local/inference \
  -d '{"text": "hello"}' 2>&1

# 3. Watch circuit breaker state
kubectl logs -f deployment/heady-brain -n heady-services | grep -i "circuit"

# Output:
# [WARN] Circuit breaker OPEN: pgvector-pool unavailable (5 failures in 10s)
# [INFO] Returning fallback response (cached result)

# 4. Restore service
kubectl scale deployment pgvector-pool --replicas=3 -n heady-services

# 5. Verify circuit breaker closes
kubectl logs -f deployment/heady-brain -n heady-services | grep -i "circuit"
# Output:
# [INFO] Circuit breaker CLOSED: pgvector-pool recovered
```

### Inspect Circuit Breaker State

```bash
# Query service for circuit breaker metrics
curl http://heady-brain.heady-services.svc.cluster.local:3316/debug/circuit-breakers | jq .

# Output:
# {
#   "circuit_breakers": {
#     "pgvector-pool": {
#       "state": "CLOSED",
#       "failures": 0,
#       "successes": 143,
#       "last_failure_time": null,
#       "failure_threshold": 5,
#       "timeout": 3400
#     },
#     "model-gateway": {
#       "state": "HALF_OPEN",
#       "failures": 2,
#       "successes": 89,
#       "last_failure_time": "2026-03-09T10:30:45Z",
#       "timeout": 1618
#     }
#   }
# }
```

## Validating CSL Gates

### Inspect CSL Signal for a Request

```bash
# Enable CSL debug output
kubectl set env deployment/heady-brain \
  CSL_DEBUG=true \
  -n heady-services

# Make request and check CSL decision
CORRELATION_ID="csl-test-$(date +%s)"

curl -H "X-Request-ID: $CORRELATION_ID" \
  http://api-gateway.heady-services.svc.cluster.local/inference \
  -d '{"text": "hello"}'

# Find CSL decision in logs
kubectl logs deployment/heady-brain -n heady-services | grep "$CORRELATION_ID" | grep -i "csl\|gate"

# Output:
# [DEBUG] [csl-test-1741503045] CSL Signal generated: confidence=0.92 → gate=HIGH
# [DEBUG] [csl-test-1741503045] CSL Decision: proceed (confidence 0.92 > threshold 0.882)
```

### Monitor CSL Gate Distribution

```bash
# In Prometheus/Grafana
# Query for CSL gate distribution

# Metric: csl_gate_decision_total{gate_decision="..."}
# Shows count of decisions by gate level: SUPPRESS, CAUTION, INCLUDE, BOOST, INJECT, HIGH, CRITICAL

# Query:
sum(rate(csl_gate_decision_total[5m])) by (gate_decision)

# Or in Grafana, create a pie chart:
# SELECT rate(csl_gate_decision_total[5m]) GROUP BY gate_decision
```

### Test CSL Gate Threshold

```bash
# Query CSL gate thresholds
curl http://api-gateway.heady-services.svc.cluster.local/debug/csl-thresholds | jq .

# Output:
# {
#   "thresholds": {
#     "SUPPRESS": 0.5,
#     "CAUTION": 0.691,
#     "INCLUDE": 0.809,
#     "BOOST": 0.882,
#     "INJECT": 0.927,
#     "HIGH": 0.972,
#     "CRITICAL": 1.0
#   }
# }

# Test a signal against CSL gates
curl -X POST http://api-gateway.heady-services.svc.cluster.local/debug/csl-evaluate \
  -d '{"confidence_score": 0.85}' \
  -H "Content-Type: application/json"

# Output:
# { "gate": "BOOST", "decision": "BOOST", "delay_ms": 89 }
```

## Debugging Specific Service Issues

### heady-brain Inference Errors

```bash
# Check model loading
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl http://localhost:3316/debug/models | jq '.models | .[] | {name, loaded, loading_time_ms}'

# Check inference batch queue
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl http://localhost:3316/debug/queue | jq '.queue | {size, pending, processing}'

# Trace a single inference
TRACE_ID="inference-test-$(date +%s)"
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl -H "X-Request-ID: $TRACE_ID" \
  http://localhost:3316/api/inference \
  -d '{"text": "hello"}' | jq .

# Check logs with trace ID
kubectl logs deployment/heady-brain -n heady-services | grep "$TRACE_ID"
```

### Search Service Latency

```bash
# Check Elasticsearch performance
curl http://elasticsearch.heady-services.svc.cluster.local:9200/_stats | jq '.indices | .[] | {name: .uuid, docs: .primaries.docs.count, store: .primaries.store.size_in_bytes}'

# Check search query latency
curl -X POST http://elasticsearch.heady-services.svc.cluster.local:9200/_search?pretty \
  -d '{
    "query": {"match": {"content": "kubernetes"}},
    "size": 21,
    "explain": true
  }' | jq '.hits | .[] | {_id, _score, _explanation}'

# Profile slow queries
curl -X POST http://elasticsearch.heady-services.svc.cluster.local:9200/_search?pretty \
  -d '{
    "profile": true,
    "query": {"match": {"content": "kubernetes"}}
  }' | jq '.profile.shards | .[] | .searches | .[] | {query_time_in_millis, breakdown}'
```

## Debugging Common Issues

### Out of Memory (OOM) in Service

```bash
# Check memory usage
kubectl top pods -n heady-services -l app=heady-brain

# Check memory limits
kubectl get pods -n heady-services -l app=heady-brain \
  -o jsonpath='{.items[].spec.containers[].resources.limits.memory}' | sort | uniq -c

# If OOM, increase memory limit
kubectl patch deployment heady-brain --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value":"8Gi"}]' \
  -n heady-services

# Monitor heap usage
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl http://localhost:3316/metrics | grep -i "memory\|heap\|gc"
```

### High CPU Usage

```bash
# Identify hot code path
kubectl top pods -n heady-services --containers -l app=heady-brain

# If high CPU, check if indexing/REINDEX is running
kubectl logs deployment/vector-cleanup -n heady-services | tail -20

# Disable expensive operations
kubectl set env deployment/vector-cleanup \
  REINDEX_ENABLED=false \
  -n heady-services

# Monitor CPU during peak hours
kubectl logs -f deployment/heady-brain -n heady-services | grep "cpu_usage"
```

### Database Connection Pool Exhaustion

```bash
# Check active connections
psql -h postgres.heady.ai -U heady_user -d heady_prod
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

# Check connection wait queue
curl http://pgvector-pool.heady-services.svc.cluster.local:3331/metrics | grep pg_pool_wait_queue

# If exhausted, scale service
kubectl scale deployment heady-brain --replicas=5 -n heady-services

# Or increase pool size (requires restart)
kubectl set env deployment/pgvector-pool \
  PGVECTOR_POOL_SIZE=34 \
  -n heady-services
```

## Performance Profiling

### Profile a Service with CPU Profiler

```bash
# Start CPU profiling (30 seconds)
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl -X POST http://localhost:3316/debug/profile/cpu?duration=30s

# Download profile
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl http://localhost:3316/debug/profile/cpu.pprof > heady-brain-cpu.prof

# Analyze with pprof
go tool pprof heady-brain-cpu.prof
# In pprof: top, list {function_name}, etc.
```

### Memory Profiling

```bash
# Heap snapshot
kubectl exec -it deployment/heady-brain -n heady-services -- \
  curl http://localhost:3316/debug/profile/heap > heady-brain-heap.prof

# Analyze with pprof
go tool pprof heady-brain-heap.prof
# In pprof: top --cum (by cumulative allocation)
```

## Related Documentation

- [ADR 001: Phi-Scaled Architecture](./adr/001-phi-scaled-architecture.md)
- [ADR 003: CSL Over Boolean](./adr/003-csl-over-boolean.md)
- [Runbook: heady-brain](./runbooks/heady-brain.md)
- [Runbook: Auth Flow](./runbooks/auth-flow.md)
