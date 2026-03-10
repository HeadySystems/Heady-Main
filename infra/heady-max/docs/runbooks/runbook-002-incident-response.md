# Runbook 002: Incident Response

## Author
Eric Haywood / HeadySystems Inc.

## Severity Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| S1 — Critical | System-wide outage, data loss risk | 8 minutes | Immediate page |
| S2 — Major | Multiple services degraded | 21 minutes | Within 34 min |
| S3 — Minor | Single service degraded | 55 minutes | Within 89 min |
| S4 — Low | Non-user-facing issue | 144 minutes | Best effort |

## Common Failure Modes

### 1. Database Connection Exhaustion
**Symptoms:** Multiple services returning 500, PgBouncer max_client_conn reached
**Resolution:**
1. Check PgBouncer stats: `docker exec pgbouncer pgbouncer -d`
2. Identify connection-heavy services
3. Scale PgBouncer pool_size (current: default_pool_size = 34)
4. Restart affected services

### 2. NATS JetStream Consumer Lag
**Symptoms:** Event processing delays, stale data
**Resolution:**
1. Check consumer lag: `nats consumer info`
2. Scale consumer replicas for lagging streams
3. If persistent: increase ack_wait to 55 seconds

### 3. Colab Runtime Disconnection
**Symptoms:** GPU workloads failing, embedding timeouts
**Resolution:**
1. Check gateway health: `curl colab-gateway:3360/health`
2. Reconnect runtime (φ-backoff will auto-retry)
3. If persistent: restart Colab notebook
4. Redirect workloads to remaining healthy runtimes

### 4. Coherence Score Degradation
**Symptoms:** CSL coherence below 0.618 (CSL_THRESHOLD)
**Resolution:**
1. Check system coherence: `curl analytics-service:3352/api/analytics/coherence`
2. Identify services with low coherence
3. Restart affected services
4. If persistent: investigate vector drift in memory service

## Post-Incident Review Template
1. Timeline of events
2. Root cause analysis
3. Impact assessment (users affected, duration)
4. Remediation steps taken
5. Prevention measures
6. Action items with owners
