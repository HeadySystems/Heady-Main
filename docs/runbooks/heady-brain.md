# Runbook: heady-brain (Port 3310)

> Heady™ Platform — Core Intelligence Service
> Domain: intelligence | All services are concurrent equals.
> © 2024-2026 HeadySystems Inc. All Rights Reserved.

## Service Overview

heady-brain is the core intelligence service responsible for AI inference orchestration, prompt processing, and context enrichment. It connects to model-gateway, ai-router, and heady-memory for intelligent response generation.

- **Port**: 3310
- **Health**: `http://localhost:3310/health`
- **Readiness**: `http://localhost:3310/readiness`
- **Domain**: intelligence
- **Dependencies**: model-gateway (:3352), ai-router (:3350), heady-memory (:3316), PostgreSQL (:5432)

---

## Symptom: Service Not Responding

### Diagnosis

```bash
# 1. Check if container is running
docker compose ps heady-brain

# 2. Check health endpoint
curl -s http://localhost:3310/health | jq .

# 3. Check container logs (last 89 lines — Fibonacci)
docker compose logs heady-brain --tail=89

# 4. Check if port is bound
ss -tlnp | grep 3310

# 5. Check resource usage
docker stats heady-brain --no-stream
```

### Fix

```bash
# If container is stopped
docker compose up -d heady-brain

# If container is crash-looping
docker compose logs heady-brain --tail=233 | grep -i "error\|fatal\|panic"

# If port conflict
lsof -i :3310

# Force restart
docker compose restart heady-brain

# Nuclear option — rebuild and restart
docker compose build heady-brain && docker compose up -d heady-brain
```

---

## Symptom: Circuit Breaker Open

The circuit breaker opens after 21 failures (FIB[7]) and resets after 89 seconds (FIB[10]).

### Diagnosis

```bash
# Check circuit breaker state in health response
curl -s http://localhost:3310/health | jq '.circuitBreaker'
# Expected: "closed" | Problematic: "open" or "half-open"

# Check upstream dependencies
curl -s http://localhost:3352/health | jq '.status'  # model-gateway
curl -s http://localhost:3350/health | jq '.status'  # ai-router
curl -s http://localhost:3316/health | jq '.status'  # heady-memory
```

### Fix

```bash
# If model-gateway is down
docker compose restart model-gateway

# If ai-router is down
docker compose restart ai-router

# Wait for circuit breaker reset (89 seconds)
# Monitor: the breaker transitions to half-open automatically

# Check if breaker has recovered
watch -n 5 'curl -s http://localhost:3310/health | jq .circuitBreaker'
```

---

## Symptom: High Latency (>1s per request)

### Diagnosis

```bash
# Check response time
time curl -s http://localhost:3310/health > /dev/null

# Check bulkhead saturation
curl -s http://localhost:3310/health | jq '.bulkhead'
# If active >= 55 (maxConcurrent), requests are queuing

# Check PostgreSQL connection pool
docker compose exec postgres psql -U heady -c "SELECT count(*) FROM pg_stat_activity WHERE datname='heady_vector';"

# Check OTel traces for slow spans
curl -s http://localhost:4318/v1/traces | jq '.resourceSpans[].scopeSpans[].spans[] | select(.name | contains("heady-brain"))'
```

### Fix

```bash
# If bulkhead saturated — too many concurrent requests
# The bulkhead max is 55 (Fibonacci) — check if legitimate load or leak

# Check for connection leaks
docker compose logs heady-brain --tail=233 | grep -i "pool\|connection\|timeout"

# If PostgreSQL is slow
docker compose exec postgres psql -U heady -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"

# Restart to reset connections
docker compose restart heady-brain
```

---

## Symptom: Authentication Errors (401)

### Diagnosis

```bash
# Verify auth-session-server is running
curl -s http://localhost:3397/health | jq .

# Test session verification
curl -s -X POST http://localhost:3397/session/verify \
  -H "Content-Type: application/json" \
  -b "__Host-heady_session=<session_value>"

# Check Firebase project configuration
echo $FIREBASE_PROJECT_ID  # Should be: gen-lang-client-0920560496
```

### Fix

```bash
# If auth-session-server is down
docker compose restart auth-session-server

# If Firebase config is wrong
# Check .env file for FIREBASE_PROJECT_ID
grep FIREBASE .env

# Re-create session
curl -s -X POST http://localhost:3397/session/create \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<firebase_id_token>"}'
```

---

## Symptom: Out of Memory

### Diagnosis

```bash
# Check memory usage
docker stats heady-brain --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check Node.js heap
docker compose exec heady-brain node -e "console.log(JSON.stringify(process.memoryUsage()))"

# Check for memory leaks in logs
docker compose logs heady-brain --tail=233 | grep -i "heap\|memory\|allocation"
```

### Fix

```bash
# Restart to reclaim memory
docker compose restart heady-brain

# If recurring, increase memory limit in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 512M

# Profile memory usage
docker compose exec heady-brain node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"
```

---

## Log Locations

```bash
# Container logs
docker compose logs heady-brain

# Structured JSON logs (stdout)
docker compose logs heady-brain --tail=89 | jq .

# Filter by log level
docker compose logs heady-brain | jq 'select(.level == "error")'

# Filter by correlation ID
docker compose logs heady-brain | jq 'select(.correlationId == "<correlation_id>")'

# OpenTelemetry traces
# Access via OTel Collector: http://localhost:4318
```

---

## Escalation Path

1. **On-call engineer**: Check this runbook, attempt fixes
2. **Platform team**: If multiple services affected, check shared infrastructure (PostgreSQL, Consul, OTel)
3. **Eric Haywood (founder)**: If platform-wide outage affecting all 9 sites
4. **External escalation**: If caused by upstream provider (Google Cloud, Firebase)

---

## Known Issues

1. **Cold start latency**: First request after container start takes 3-5s due to module loading and Consul registration
2. **Correlation ID propagation**: If X-Correlation-Id header is missing, a new UUID is generated — cross-service tracing breaks
3. **Fibonacci timeout mismatch**: If model-gateway timeout (89s) exceeds heady-brain client timeout, responses may be dropped
