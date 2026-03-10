# Runbook: General Incident Response

> Heady™ Platform — Incident Response Template
> All services are concurrent equals — no "critical" vs "non-critical" classification.
> © 2024-2026 HeadySystems Inc. All Rights Reserved.

## Incident Classification

The Heady™ platform does not use priority levels (P0/P1/P2/P3). Instead, incidents are classified by **scope**:

| Scope | Description | Example |
|-------|-------------|---------|
| **Single-service** | One service affected, others operational | heady-midi returns 503 |
| **Domain** | Multiple services in a domain affected | All External Integration services (3360-3368) down |
| **Cross-domain** | Services across multiple domains affected | PostgreSQL outage affecting intelligence + data domains |
| **Platform-wide** | All or most services affected | Network partition, Consul failure, complete outage |

---

## Phase 1: Detection (First 5 minutes — Fibonacci)

### Automated Detection

```bash
# Run health check on all 58 services
bash scripts/health-check-all.sh

# Quick health check on infrastructure
curl -s http://localhost:5432 2>&1 | head -1          # PostgreSQL
curl -s http://localhost:8500/v1/status/leader | jq .  # Consul
curl -s http://localhost:4317 2>&1 | head -1           # OTel Collector
curl -s http://localhost:8080 2>&1 | head -5           # Drupal
```

### Manual Detection Checklist

```bash
# Check all container states
docker compose ps --format "table {{.Name}}\t{{.Status}}" | sort

# Check for containers that restarted recently
docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep -i "restarting\|exited\|dead"

# Check Docker resource usage
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

---

## Phase 2: Assessment (5-13 minutes — Fibonacci)

### Determine Scope

```bash
# Count healthy vs unhealthy services
bash scripts/health-check-all.sh 2>&1 | tail -3

# If > 50% services affected → likely infrastructure issue
# If < 5 services affected → likely service-specific issue
# If all services in one port range affected → likely domain issue
```

### Check Infrastructure Dependencies

```bash
# PostgreSQL (most services depend on this)
docker compose exec postgres pg_isready -U heady
docker compose exec postgres psql -U heady -c "SELECT count(*) FROM pg_stat_activity;"

# Consul (service discovery)
curl -s http://localhost:8500/v1/agent/services | jq 'keys | length'

# OTel Collector (tracing — non-critical for service operation)
curl -s http://localhost:8888/metrics | head -5

# Docker network
docker network inspect heady-platform_heady-mesh | jq '.[0].Containers | keys | length'
```

### Check for Common Causes

```bash
# Disk space
df -h /var/lib/docker

# Memory
free -h

# Docker daemon
systemctl status docker

# DNS resolution inside containers
docker compose exec heady-brain nslookup postgres
```

---

## Phase 3: Mitigation (13-34 minutes — Fibonacci)

### Single-Service Recovery

```bash
# Restart the affected service
docker compose restart <service-name>

# Check logs for root cause
docker compose logs <service-name> --tail=89 | jq 'select(.level == "error")'

# If crash-looping, rebuild
docker compose build <service-name> && docker compose up -d <service-name>
```

### Domain Recovery

```bash
# Restart all services in a port range
# Core Intelligence (3310-3318)
for port in 3310 3311 3312 3313 3314 3315 3316 3317 3318; do
  svc=$(docker compose ps --format '{{.Name}}' | grep -E "$port" | head -1)
  [ -n "$svc" ] && docker compose restart "$svc"
done

# Or restart by service names
docker compose restart heady-brain heady-brains heady-soul heady-conductor heady-infer heady-embed heady-memory heady-vector heady-projection
```

### Infrastructure Recovery

```bash
# PostgreSQL recovery
docker compose restart postgres
# Wait for health check
sleep 8  # Fibonacci
docker compose exec postgres pg_isready -U heady

# Consul recovery
docker compose restart consul
sleep 5  # Fibonacci

# If Docker daemon issues
sudo systemctl restart docker
sleep 13  # Fibonacci
docker compose up -d
```

### Platform-Wide Recovery

```bash
# Full restart (last resort)
docker compose down
sleep 8  # Fibonacci
docker compose up -d

# Verify recovery
sleep 21  # Fibonacci — allow services to start
bash scripts/health-check-all.sh
```

---

## Phase 4: Communication

### Internal Communication Template

```
INCIDENT: [Scope] — [Brief description]
DETECTED: [Timestamp]
SCOPE: [Single-service / Domain / Cross-domain / Platform-wide]
AFFECTED: [List of services or domains]
STATUS: [Investigating / Mitigating / Resolved]
NEXT UPDATE: [Time — use Fibonacci intervals: 5min, 8min, 13min]
```

### Status Page Update Template

```
[Timestamp] — Investigating: We are aware of issues affecting [affected services/sites].
[Timestamp] — Identified: The issue has been identified as [root cause].
[Timestamp] — Mitigating: We are applying a fix for [description].
[Timestamp] — Resolved: The issue has been resolved. All services operational.
```

---

## Phase 5: Resolution & Post-Mortem

### Verify Resolution

```bash
# Full health check
bash scripts/health-check-all.sh

# Check that all services are responding with correct data
curl -s http://localhost:3310/health | jq '.status'  # Should be "operational"

# Check circuit breakers have reset
for port in 3310 3311 3312 3313 3314 3315 3316 3317 3318 3319 3320 3321 3322; do
  state=$(curl -s "http://localhost:$port/health" 2>/dev/null | jq -r '.circuitBreaker' 2>/dev/null || echo "N/A")
  echo "Port $port: $state"
done
```

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

## Summary
- **Duration**: [start] to [end]
- **Scope**: [Single-service / Domain / Cross-domain / Platform-wide]
- **Affected services**: [list]
- **Affected sites**: [list]

## Timeline
- [time] — Incident detected by [method]
- [time] — [action taken]
- [time] — Root cause identified
- [time] — Fix applied
- [time] — Verified resolved

## Root Cause
[description]

## Resolution
[description]

## Lessons Learned
[what we learned]

## Action Items
- [ ] [specific action]
- [ ] [specific action]
```

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Platform Team | [Slack/on-call system] |
| Founder (Eric Haywood) | [Contact method for platform-wide outages] |
| Google Cloud Support | [GCP support case for Cloud Run issues] |
| Firebase Support | [Firebase support for auth issues] |

---

## Quick Reference: All Service Ports

| Port Range | Domain | Services |
|-----------|--------|----------|
| 3310-3318 | Core Intelligence | brain, brains, soul, conductor, infer, embed, memory, vector, projection |
| 3319-3322 | Agent & Bee | bee-factory, hive, orchestration, federation |
| 3323-3325 | Security & Governance | guard, security, governance |
| 3326-3329 | Monitoring & Health | health, eval, maintenance, testing |
| 3330-3335 | User-Facing | web, buddy, ui, onboarding, pilot-onboarding, task-browser |
| 3340-3343 | Pipeline & Workflow | auto-success-engine, hcfullpipeline-executor, chain, cache |
| 3350-3353 | AI Routing & Gateway | ai-router, api-gateway, model-gateway, domain-router |
| 3360-3368 | External Integrations | mcp-server, google-mcp, memory-mcp, perplexity-mcp, jules-mcp, huggingface-gw, colab-gw, silicon-bridge, discord-bot |
| 3380-3393 | Specialized | vinci, autobiographer, midi, budget-tracker, cli-service, prompt-manager, secret-gateway |
| 3397-3404 | New Platform | auth-session-server, notification, analytics, billing, search, scheduler, migration, asset-pipeline |
