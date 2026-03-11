# Runbook: Deployment Procedures

## Overview
All code changes flow through LiquidDeploy's latent-to-physical projection pipeline. This runbook covers manual deployment procedures for cases where the automated pipeline needs human intervention.

## Pre-Deployment Checklist

1. **All tests pass**: `npm test` (phi-math + security tests)
2. **HeadyCheck passes**: All quality gate rules pass at pool-appropriate threshold
3. **HeadyAssure certifies**: Composite score ≥ CSL HIGH (≈ 0.882)
4. **No active SEV-1/SEV-2 incidents**: Check HeadyPatterns trend
5. **Deployment cooldown elapsed**: fib(7) × 1000 = 13s since last deploy

## Standard Deployment (Docker Compose)

```bash
# 1. Pull latest images
docker compose pull

# 2. Run database migrations
docker compose run --rm heady-app node migrations/migrate.js

# 3. Deploy with rolling update
docker compose up -d --remove-orphans

# 4. Verify health
sleep 13  # Deployment cooldown (fib(7) seconds)
curl -s http://localhost:3310/health | jq .
```

## Kubernetes Deployment (Helm)

```bash
# 1. Update Helm values if needed
vim infrastructure/kubernetes/values.yaml

# 2. Deploy
helm upgrade heady-system ./infrastructure/kubernetes \
  --namespace heady \
  --set image.tag=NEW_TAG \
  --wait --timeout=5m

# 3. Verify rollout
kubectl rollout status deployment/heady-app -n heady

# 4. Check HPA
kubectl get hpa -n heady
```

## Cloudflare Edge Worker Deployment

```bash
# 1. Update wrangler.toml if needed
vim infrastructure/cloudflare/wrangler.toml

# 2. Deploy worker
npx wrangler deploy src/edge/worker.js

# 3. Verify
curl -s https://edge.headysystems.com/health | jq .
```

## Rollback Procedures

### Docker Rollback
```bash
# Rollback to previous image
docker compose down
git checkout HEAD~1
docker compose up -d
```

### Kubernetes Rollback
```bash
# Rollback to previous revision
kubectl rollout undo deployment/heady-app -n heady

# Or rollback to specific revision
kubectl rollout undo deployment/heady-app -n heady --to-revision=N
```

### LiquidDeploy Rollback
```bash
# Via API (within rollback window: fib(14) × 60s ≈ 6.28 hours)
curl -X POST http://localhost:3310/api/liquid-deploy/rollback \
  -H "Content-Type: application/json" \
  -d '{"manifestId": "MANIFEST_ID"}'
```

## Post-Deployment Verification

```bash
# 1. Health check all services
curl -s http://localhost:3310/health | jq .

# 2. Check HeadyPatterns for drift
curl -s http://localhost:3310/api/patterns/trend | jq .trend

# 3. Verify websites
for port in 3371 3372 3373 3374 3375 3376 3377 3378 3379; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health)
  echo "Port $port: $STATUS"
done

# 4. Check HeadyAssure certification
curl -s http://localhost:3310/api/assure/recent | jq '.[0].certified'
```

## Contacts
- **Founder/Chief Architect**: Eric Haywood (eric@headyconnection.org)
