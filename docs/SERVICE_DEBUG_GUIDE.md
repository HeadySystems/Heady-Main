# Heady™ Platform — Service Debug Guide (All 58 Services)

> All services operate as concurrent equals — NO priority/ranking.
> Founded by Eric Haywood. φ-scaled constants throughout.
> © 2024-2026 HeadySystems Inc. All Rights Reserved.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `bash scripts/health-check-all.sh` | Health check all 58 services |
| `docker compose ps` | Show container status |
| `docker compose logs <service> --tail=89` | View last 89 (Fibonacci) log lines |
| `docker compose restart <service>` | Restart a single service |
| `make health` | Run health checks via Makefile |

---

## Core Intelligence Services (Ports 3310-3318)

### heady-brain — Port 3310
- **Health**: `curl localhost:3310/health`
- **Common failures**: Circuit breaker open (model-gateway down), OOM on large prompts
- **Log filter**: `docker compose logs heady-brain | jq 'select(.level == "error")'`
- **Known issues**: Cold start 3-5s; correlation ID must be in X-Correlation-Id header
- **Local test**: `curl -X POST localhost:3310/infer -H "Content-Type: application/json" -d '{"prompt":"test"}'`

### heady-brains — Port 3311
- **Health**: `curl localhost:3311/health`
- **Common failures**: Coordination timeout when heady-brain instances are overloaded
- **Log filter**: `docker compose logs heady-brains | jq 'select(.level == "error")'`
- **Known issues**: Multi-brain fusion can produce unexpected results with divergent models
- **Local test**: `curl localhost:3311/health`

### heady-soul — Port 3312
- **Health**: `curl localhost:3312/health`
- **Common failures**: Deep context chains exceeding max depth (FIB[7] = 21)
- **Log filter**: `docker compose logs heady-soul | jq 'select(.level == "error")'`
- **Known issues**: Context depth limit is hard-capped at 21 levels
- **Local test**: `curl localhost:3312/health`

### heady-conductor — Port 3313
- **Health**: `curl localhost:3313/health`
- **Common failures**: No qualifying agents (all CSL scores below 0.382 include gate)
- **Log filter**: `docker compose logs heady-conductor | jq 'select(.level == "error")'`
- **Known issues**: Agent dispatch timeout 89s; all qualifying agents receive tasks concurrently
- **Local test**: `curl localhost:3313/health`

### heady-infer — Port 3314
- **Health**: `curl localhost:3314/health`
- **Common failures**: Model gateway unreachable, input too large (> FIB[12] * 1024 bytes)
- **Log filter**: `docker compose logs heady-infer | jq 'select(.level == "error")'`
- **Known issues**: Fibonacci timeout at 89s may not be enough for large inference requests
- **Local test**: `curl localhost:3314/health`

### heady-embed — Port 3315
- **Health**: `curl localhost:3315/health`
- **Common failures**: Embedding dimension mismatch (must be 384), HuggingFace rate limits
- **Log filter**: `docker compose logs heady-embed | jq 'select(.level == "error")'`
- **Known issues**: First embedding request may be slow due to model loading on HuggingFace
- **Local test**: `curl -X POST localhost:3315/embed -H "Content-Type: application/json" -d '{"text":"test"}'`

### heady-memory — Port 3316
- **Health**: `curl localhost:3316/health`
- **Common failures**: pgvector unreachable, vector dimension invalid (not 384)
- **Log filter**: `docker compose logs heady-memory | jq 'select(.level == "error")'`
- **Known issues**: In-memory cache lost on restart; PostgreSQL is durable store
- **Local test**: `curl localhost:3316/health`

### heady-vector — Port 3317
- **Health**: `curl localhost:3317/health`
- **Common failures**: pgvector unreachable, HNSW index missing, dimension mismatch
- **Log filter**: `docker compose logs heady-vector | jq 'select(.level == "error")'`
- **Known issues**: HNSW index must be in memory for optimal performance
- **Local test**: `curl localhost:3317/health`

### heady-projection — Port 3318
- **Health**: `curl localhost:3318/health`
- **Common failures**: Source dimension incompatible with 384-dim target
- **Log filter**: `docker compose logs heady-projection | jq 'select(.level == "error")'`
- **Known issues**: Projection from very high dimensions may lose semantic information
- **Local test**: `curl localhost:3318/health`

---

## Agent & Bee Services (Ports 3319-3322)

### heady-bee-factory — Port 3319
- **Health**: `curl localhost:3319/health`
- **Common failures**: Bee template invalid, hive at capacity
- **Log filter**: `docker compose logs heady-bee-factory | jq 'select(.level == "error")'`
- **Known issues**: Bee spawn rate limited by bulkhead (max concurrent: 55)
- **Local test**: `curl localhost:3319/health`

### heady-hive — Port 3320
- **Health**: `curl localhost:3320/health`
- **Common failures**: Max bees reached (FIB[12] = 233), coordination conflicts
- **Log filter**: `docker compose logs heady-hive | jq 'select(.level == "error")'`
- **Known issues**: All bees operate as concurrent equals — no "queen" or "worker" distinction
- **Local test**: `curl localhost:3320/health`

### heady-orchestration — Port 3321
- **Health**: `curl localhost:3321/health`
- **Common failures**: Orchestration timeout (89s), agent dependency failures
- **Log filter**: `docker compose logs heady-orchestration | jq 'select(.level == "error")'`
- **Known issues**: Timeout at 89s (Fibonacci); complex orchestrations may need longer
- **Local test**: `curl localhost:3321/health`

### heady-federation — Port 3322
- **Health**: `curl localhost:3322/health`
- **Common failures**: Federation peer rejected, external connectivity issues
- **Log filter**: `docker compose logs heady-federation | jq 'select(.level == "error")'`
- **Known issues**: External federation requires outbound network access
- **Local test**: `curl localhost:3322/health`

---

## Security & Governance (Ports 3323-3325)

### heady-guard — Port 3323
- **Health**: `curl localhost:3323/health`
- **Common failures**: Access denied by policy (CSL score below include gate)
- **Log filter**: `docker compose logs heady-guard | jq 'select(.level == "error")'`
- **Known issues**: Policy evaluation is continuous (CSL), not boolean
- **Local test**: `curl localhost:3323/health`

### heady-security — Port 3324
- **Health**: `curl localhost:3324/health`
- **Common failures**: Threat detection false positives, upstream dependency failures
- **Log filter**: `docker compose logs heady-security | jq 'select(.level == "error")'`
- **Known issues**: Security scans add latency to requests
- **Local test**: `curl localhost:3324/health`

### heady-governance — Port 3325
- **Health**: `curl localhost:3325/health`
- **Common failures**: Policy violation on content, governance check timeout
- **Log filter**: `docker compose logs heady-governance | jq 'select(.level == "error")'`
- **Known issues**: Governance is continuous (CSL scale), not pass/fail
- **Local test**: `curl localhost:3325/health`

---

## Monitoring & Health (Ports 3326-3329)

### heady-health — Port 3326
- **Health**: `curl localhost:3326/health`
- **Common failures**: Partial health data when some services unreachable
- **Log filter**: `docker compose logs heady-health | jq 'select(.level == "error")'`
- **Known issues**: Aggregation may return HTTP 207 (multi-status) if some services fail
- **Local test**: `curl localhost:3326/health`

### heady-eval — Port 3327
- **Health**: `curl localhost:3327/health`
- **Common failures**: Evaluation criteria invalid, model service dependency failures
- **Log filter**: `docker compose logs heady-eval | jq 'select(.level == "error")'`
- **Known issues**: Evaluation criteria must use CSL-compatible scoring
- **Local test**: `curl localhost:3327/health`

### heady-maintenance — Port 3328
- **Health**: `curl localhost:3328/health`
- **Common failures**: Maintenance window conflict (another operation active)
- **Log filter**: `docker compose logs heady-maintenance | jq 'select(.level == "error")'`
- **Known issues**: Only one maintenance operation can run at a time per service
- **Local test**: `curl localhost:3328/health`

### heady-testing — Port 3329
- **Health**: `curl localhost:3329/health`
- **Common failures**: Test suite not found, target service under test is down
- **Log filter**: `docker compose logs heady-testing | jq 'select(.level == "error")'`
- **Known issues**: Test execution requires target services to be healthy
- **Local test**: `curl localhost:3329/health`

---

## User-Facing Services (Ports 3330-3335)

### heady-web — Port 3330
- **Health**: `curl localhost:3330/health`
- **Common failures**: API gateway unreachable, static asset serving errors
- **Log filter**: `docker compose logs heady-web | jq 'select(.level == "error")'`
- **Known issues**: Serves as the primary entry point for web traffic
- **Local test**: `curl localhost:3330/health`

### heady-buddy — Port 3331
- **Health**: `curl localhost:3331/health`
- **Common failures**: Conversation context overflow, brain service timeout
- **Log filter**: `docker compose logs heady-buddy | jq 'select(.level == "error")'`
- **Known issues**: Context window management critical for conversation quality
- **Local test**: `curl localhost:3331/health`

### heady-ui — Port 3332
- **Health**: `curl localhost:3332/health`
- **Common failures**: Component rendering errors, API gateway unreachable
- **Log filter**: `docker compose logs heady-ui | jq 'select(.level == "error")'`
- **Known issues**: UI components are server-rendered
- **Local test**: `curl localhost:3332/health`

### heady-onboarding — Port 3333
- **Health**: `curl localhost:3333/health`
- **Common failures**: Auth service unreachable, onboarding step validation errors
- **Log filter**: `docker compose logs heady-onboarding | jq 'select(.level == "error")'`
- **Known issues**: Onboarding flow is stateful — interruptions require restart
- **Local test**: `curl localhost:3333/health`

### heady-pilot-onboarding — Port 3334
- **Health**: `curl localhost:3334/health`
- **Common failures**: Pilot program enrollment issues, capacity limits
- **Log filter**: `docker compose logs heady-pilot-onboarding | jq 'select(.level == "error")'`
- **Known issues**: Pilot enrollment may be closed (HTTP 403)
- **Local test**: `curl localhost:3334/health`

### heady-task-browser — Port 3335
- **Health**: `curl localhost:3335/health`
- **Common failures**: Task not found, orchestration service unreachable
- **Log filter**: `docker compose logs heady-task-browser | jq 'select(.level == "error")'`
- **Known issues**: Task listing depends on orchestration and conductor services
- **Local test**: `curl localhost:3335/health`

---

## Pipeline & Workflow (Ports 3340-3343)

### auto-success-engine — Port 3340
- **Health**: `curl localhost:3340/health`
- **Common failures**: Success criteria undefined, pipeline dependency failures
- **Log filter**: `docker compose logs auto-success-engine | jq 'select(.level == "error")'`
- **Known issues**: Requires pipeline to define explicit success metrics
- **Local test**: `curl localhost:3340/health`

### hcfullpipeline-executor — Port 3341
- **Health**: `curl localhost:3341/health`
- **Common failures**: Pipeline stage failure, execution timeout (89s Fibonacci)
- **Log filter**: `docker compose logs hcfullpipeline-executor | jq 'select(.level == "error")'`
- **Known issues**: Pipeline stages are concurrent equals — no sequential ordering by default
- **Local test**: `curl localhost:3341/health`

### heady-chain — Port 3342
- **Health**: `curl localhost:3342/health`
- **Common failures**: Chain step failure, step service unreachable
- **Log filter**: `docker compose logs heady-chain | jq 'select(.level == "error")'`
- **Known issues**: Chain steps execute in defined order (exception to concurrent-equals for data flow)
- **Local test**: `curl localhost:3342/health`

### heady-cache — Port 3343
- **Health**: `curl localhost:3343/health`
- **Common failures**: Cache miss (404), entry too large, memory pressure
- **Log filter**: `docker compose logs heady-cache | jq 'select(.level == "error")'`
- **Known issues**: In-memory cache lost on restart; no persistence layer
- **Local test**: `curl localhost:3343/health`

---

## AI Routing & Gateway (Ports 3350-3353)

### ai-router — Port 3350
- **Health**: `curl localhost:3350/health`
- **Common failures**: All model gateways unavailable, no qualifying models for task type
- **Log filter**: `docker compose logs ai-router | jq 'select(.level == "error")'`
- **Known issues**: Routes to all qualifying gateways concurrently (not "best" gateway)
- **Local test**: `curl localhost:3350/health`

### api-gateway — Port 3351
- **Health**: `curl localhost:3351/health`
- **Common failures**: Route not found (404), upstream service failed, rate limiting
- **Log filter**: `docker compose logs api-gateway | jq 'select(.level == "error")'`
- **Known issues**: Entry point for external API traffic; all routes must be registered
- **Local test**: `curl localhost:3351/health`

### model-gateway — Port 3352
- **Health**: `curl localhost:3352/health`
- **Common failures**: Provider unreachable, model not registered, API key invalid
- **Log filter**: `docker compose logs model-gateway | jq 'select(.level == "error")'`
- **Known issues**: Each provider has its own circuit breaker — one provider down doesn't affect others
- **Local test**: `curl localhost:3352/health`

### domain-router — Port 3353
- **Health**: `curl localhost:3353/health`
- **Common failures**: Domain not found in routing table, target domain service failed
- **Log filter**: `docker compose logs domain-router | jq 'select(.level == "error")'`
- **Known issues**: Domain routing table loaded from domain-aliases.json
- **Local test**: `curl localhost:3353/health`

---

## External Integrations (Ports 3360-3368)

### mcp-server — Port 3360
- **Health**: `curl localhost:3360/health`
- **Common failures**: MCP protocol errors, provider connectivity issues
- **Log filter**: `docker compose logs mcp-server | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3360/health`

### google-mcp — Port 3361
- **Health**: `curl localhost:3361/health`
- **Common failures**: Google API unreachable, quota exceeded, API key invalid
- **Log filter**: `docker compose logs google-mcp | jq 'select(.level == "error")'`
- **Known issues**: Google API rate limits vary by endpoint; check Cloud Console quotas
- **Local test**: `curl localhost:3361/health`

### memory-mcp — Port 3362
- **Health**: `curl localhost:3362/health`
- **Common failures**: Memory backend (pgvector) unreachable, context not found
- **Log filter**: `docker compose logs memory-mcp | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3362/health`

### perplexity-mcp — Port 3363
- **Health**: `curl localhost:3363/health`
- **Common failures**: Perplexity API rate limit, query too complex
- **Log filter**: `docker compose logs perplexity-mcp | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3363/health`

### jules-mcp — Port 3364
- **Health**: `curl localhost:3364/health`
- **Common failures**: Jules API unreachable, code analysis parsing failure
- **Log filter**: `docker compose logs jules-mcp | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3364/health`

### huggingface-gateway — Port 3365
- **Health**: `curl localhost:3365/health`
- **Common failures**: HF rate limit, model loading (retry after 13s), API token invalid
- **Log filter**: `docker compose logs huggingface-gateway | jq 'select(.level == "error")'`
- **Known issues**: Models may need cold-start loading time on HuggingFace servers
- **Local test**: `curl localhost:3365/health`

### colab-gateway — Port 3366
- **Health**: `curl localhost:3366/health`
- **Common failures**: Colab runtime unreachable, compute quota exceeded, notebook timeout
- **Log filter**: `docker compose logs colab-gateway | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3366/health`

### silicon-bridge — Port 3367
- **Health**: `curl localhost:3367/health`
- **Common failures**: Silicon provider connectivity, unsupported compute format
- **Log filter**: `docker compose logs silicon-bridge | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3367/health`

### discord-bot — Port 3368
- **Health**: `curl localhost:3368/health`
- **Common failures**: Discord API rate limit, bot token invalid, missing permissions
- **Log filter**: `docker compose logs discord-bot | jq 'select(.level == "error")'`
- **Known issues**: Discord rate limits have specific retry-after headers
- **Local test**: `curl localhost:3368/health`

---

## Specialized Services (Ports 3380-3393)

### heady-vinci — Port 3380
- **Health**: `curl localhost:3380/health`
- **Common failures**: Image generation backend failed, content policy violation
- **Log filter**: `docker compose logs heady-vinci | jq 'select(.level == "error")'`
- **Known issues**: Uses PHI for aspect ratios in generated images
- **Local test**: `curl localhost:3380/health`

### heady-autobiographer — Port 3381
- **Health**: `curl localhost:3381/health`
- **Common failures**: Insufficient memory data for generation, brain service timeout
- **Log filter**: `docker compose logs heady-autobiographer | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3381/health`

### heady-midi — Port 3382
- **Health**: `curl localhost:3382/health`
- **Common failures**: Invalid MIDI parameters, generation backend failure
- **Log filter**: `docker compose logs heady-midi | jq 'select(.level == "error")'`
- **Known issues**: MIDI generation uses Fibonacci-based timing patterns
- **Local test**: `curl localhost:3382/health`

### budget-tracker — Port 3390
- **Health**: `curl localhost:3390/health`
- **Common failures**: Budget exceeded, billing service unreachable
- **Log filter**: `docker compose logs budget-tracker | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3390/health`

### cli-service — Port 3391
- **Health**: `curl localhost:3391/health`
- **Common failures**: Unknown command, target service unreachable
- **Log filter**: `docker compose logs cli-service | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3391/health`

### prompt-manager — Port 3392
- **Health**: `curl localhost:3392/health`
- **Common failures**: Prompt template not found, heady-brain dependency failure
- **Log filter**: `docker compose logs prompt-manager | jq 'select(.level == "error")'`
- **Local test**: `curl localhost:3392/health`

### secret-gateway — Port 3393
- **Health**: `curl localhost:3393/health`
- **Common failures**: Secret access denied (403), secret not found (404), backend unreachable
- **Log filter**: `docker compose logs secret-gateway | jq 'select(.level == "error")'`
- **Known issues**: Secret access requires proper authentication
- **Local test**: `curl localhost:3393/health`

---

## New Platform Services (Ports 3397-3404)

### auth-session-server — Port 3397
- **Health**: `curl localhost:3397/health`
- **Common failures**: Firebase ID token invalid, session replay detected, cookie creation failed
- **Log filter**: `docker compose logs auth-session-server | jq 'select(.level == "error")'`
- **Known issues**: In-memory sessions lost on restart; __Host- prefix requires HTTPS/localhost
- **Local test**: `curl -X POST localhost:3397/session/create -H "Content-Type: application/json" -d '{"idToken":"test"}'`

### notification-service — Port 3398
- **Health**: `curl localhost:3398/health`
- **Common failures**: Queue full (max 233 — Fibonacci), WebSocket auth failure, delivery channel down
- **Log filter**: `docker compose logs notification-service | jq 'select(.level == "error")'`
- **Known issues**: Re-validates auth on every WebSocket frame; queue is bounded at FIB[12]
- **Local test**: `curl -X POST localhost:3398/notify -H "Content-Type: application/json" -d '{"userId":"test","message":"hello"}'`

### analytics-service — Port 3399
- **Health**: `curl localhost:3399/health`
- **Common failures**: PII detected in event (rejected), pgvector metadata store failure
- **Log filter**: `docker compose logs analytics-service | jq 'select(.level == "error")'`
- **Known issues**: Privacy-first — events with PII are rejected; Fibonacci time buckets
- **Local test**: `curl -X POST localhost:3399/event -H "Content-Type: application/json" -d '{"event":"page_view","domain":"test"}'`

### billing-service — Port 3400
- **Health**: `curl localhost:3400/health`
- **Common failures**: Stripe API unreachable, webhook signature invalid, invalid plan ID
- **Log filter**: `docker compose logs billing-service | jq 'select(.level == "error")'`
- **Known issues**: φ-scaled pricing tiers (base × PHI^n); Stripe webhook needs valid signature
- **Local test**: `curl localhost:3400/plans`

### search-service — Port 3401
- **Health**: `curl localhost:3401/health`
- **Common failures**: pgvector unreachable, dimension mismatch (not 384), HNSW index missing
- **Log filter**: `docker compose logs search-service | jq 'select(.level == "error")'`
- **Known issues**: RRF fusion vector=PSI(0.618), text=PSI2(0.382); in-memory index lost on restart
- **Local test**: `curl -X POST localhost:3401/search -H "Content-Type: application/json" -d '{"query":"test"}'`

### scheduler-service — Port 3402
- **Health**: `curl localhost:3402/health`
- **Common failures**: Invalid Fibonacci interval, job registry full (max 233), webhook delivery fail
- **Log filter**: `docker compose logs scheduler-service | jq 'select(.level == "error")'`
- **Known issues**: Intervals must be Fibonacci seconds (5,8,13,21,34,55,89...); in-memory registry
- **Local test**: `curl localhost:3402/jobs`

### migration-service — Port 3403
- **Health**: `curl localhost:3403/health`
- **Common failures**: PostgreSQL unreachable, migration already applied, rollback failed
- **Log filter**: `docker compose logs migration-service | jq 'select(.level == "error")'`
- **Known issues**: Includes 6 built-in migrations (pgvector, heady_vectors, sessions, etc.)
- **Local test**: `curl localhost:3403/migrate/status`

### asset-pipeline — Port 3404
- **Health**: `curl localhost:3404/health`
- **Common failures**: File too large, unsupported format, CDN upload failed
- **Log filter**: `docker compose logs asset-pipeline | jq 'select(.level == "error")'`
- **Known issues**: Fibonacci responsive widths (233,377,610,987,1597px); max size FIB[12]² × 100 bytes
- **Local test**: `curl localhost:3404/health`

---

## Universal Debug Commands

```bash
# Health check a specific service
curl -s localhost:<port>/health | jq .

# Check readiness
curl -s localhost:<port>/readiness | jq .

# Check circuit breaker state
curl -s localhost:<port>/health | jq '.circuitBreaker'

# View structured logs (error level)
docker compose logs <service> | jq 'select(.level == "error")'

# Filter logs by correlation ID
docker compose logs <service> | jq 'select(.correlationId == "<id>")'

# Check bulkhead saturation
curl -s localhost:<port>/health | jq '.bulkhead'

# Restart service
docker compose restart <service>

# Rebuild and restart
docker compose build <service> && docker compose up -d <service>

# Full stack health
bash scripts/health-check-all.sh
```
