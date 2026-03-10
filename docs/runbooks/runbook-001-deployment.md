# Runbook 001: Full Stack Deployment

## Author
Eric Haywood / HeadySystems Inc.

## Prerequisites
- Docker Engine 24+
- Docker Compose v2.20+
- Node.js 20+ (for local development)
- 3 Colab Pro+ subscriptions (for GPU layer)
- GCP credentials (project: gen-lang-client-0920560496)
- Cloudflare credentials (account: 8b1fa38f282c691423c6399247d53323)

## Deployment Order

### Phase 1: Infrastructure (ports 5432, 6379, 4222, 3310, 8500, 6432)
```bash
docker compose up -d postgres redis nats envoy-proxy consul pgbouncer
# Wait 34 seconds for health checks
sleep 34
docker compose ps  # Verify all healthy
```

### Phase 2: Core Intelligence (ports 3311-3325)
```bash
docker compose up -d heady-brain heady-brains heady-infer ai-router model-gateway \
  api-gateway domain-router heady-manager heady-conductor hcfullpipeline-executor \
  heady-embed heady-memory heady-vector heady-projection heady-cache search-service
sleep 21
```

### Phase 3: Orchestration (ports 3327-3337)
```bash
docker compose up -d heady-bee-factory heady-hive heady-federation heady-soul \
  auto-success-engine heady-chain prompt-manager heady-guard heady-security \
  heady-governance secret-gateway
sleep 21
```

### Phase 4: Auth & Quality (ports 3338-3345)
```bash
docker compose up -d auth-session-server heady-check heady-health heady-eval \
  heady-maintenance heady-testing observability-kernel notification-service
sleep 13
```

### Phase 5: Interface & Analytics (ports 3346-3365)
```bash
docker compose up -d heady-web heady-buddy heady-ui heady-onboarding \
  heady-pilot-onboarding heady-task-browser analytics-service billing-service \
  mcp-server scheduler-service migration-service asset-pipeline
sleep 13
```

### Phase 6: GPU Layer
```bash
docker compose up -d colab-gateway
# Then start Colab notebooks (embedding-worker, inference-worker, training-worker)
```

## Health Verification
```bash
# Check all services
for port in $(seq 3310 3365); do
  curl -sf http://localhost:$port/health | jq '.status'
done
```

## Rollback
```bash
docker compose down
docker compose up -d  # Restart from Phase 1
```

## φ-Based Monitoring Intervals
- Critical services: check every 8 seconds
- Standard services: check every 13 seconds  
- Background services: check every 21 seconds
