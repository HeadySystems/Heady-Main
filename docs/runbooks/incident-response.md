# Incident Response Playbook

**Last Updated:** 2026-03-09
**Version:** 1.0

## Severity Levels & CSL Gate Mapping

Severity classification maps to CSL confidence gates for automated response.

### SEV1 (CRITICAL) - Immediate Action Required

**Conditions:**
- Complete service outage (0 instances healthy)
- Data loss or corruption (pgvector entries deleted)
- Security breach (unauthorized access detected)
- Cascading failures (>3 dependent services down)

**CSL Gate Mapping:** All signals blocked by CSL at SUPPRESS or lower (confidence < 0.5)

**Response Time SLA:** Incident commander engaged within 5 minutes

**Escalation:**
1. Page on-call engineer immediately (PagerDuty)
2. Notify VP Engineering (critical-incident@heady.ai)
3. Open Slack war room (#incidents)
4. Begin incident communications (see Communication Template)

**Example:** heady-brain service returns 500 errors for 100% of requests for >2 minutes
```
SEV1_CRITICAL: heady-brain inference returning 500 for 100% traffic [2026-03-09 10:30:45Z]
  Triggered by: alert rate(heady_brain_errors_total[1m]) > 0.99
  CSL Impact: All inference requests SUPPRESS (confidence 0.0)
  Action: Page on-call engineer + VP Engineering
```

### SEV2 (HIGH) - Urgent Action Required

**Conditions:**
- Significant service degradation (>10% error rate or >2000ms latency)
- Critical feature broken (search not returning results)
- Database connection pool warning (>90% utilization)
- Dependency service down but failover available

**CSL Gate Mapping:** High-confidence signals routed to INCLUDE, others suppressed (0.5-0.809)

**Response Time SLA:** Incident commander engaged within 15 minutes

**Escalation:**
1. Page on-call engineer (PagerDuty)
2. Open Slack war room (#incidents)
3. Begin incident communications

**Example:** Search service latency p95 > 2000ms due to Elasticsearch slow query
```
SEV2_HIGH: search-service p95 latency 2500ms [2026-03-09 10:35:22Z]
  Triggered by: alert histogram_quantile(0.95, ...) > 2000ms
  CSL Impact: Queries with HIGH confidence (>0.927) execute; others delayed
  Action: Page on-call engineer
```

### SEV3 (MEDIUM) - Elevated Attention Required

**Conditions:**
- Degraded performance (p95 latency 1500-2000ms)
- Single service recovering from transient error
- Warning-level alerts (>80% memory usage)
- Non-critical feature unavailable (forum down, but search works)

**CSL Gate Mapping:** Most signals pass at INCLUDE (0.809+), some caution-gated (0.691-0.809)

**Response Time SLA:** Incident commander responds within 30 minutes

**Escalation:**
1. Alert team lead (Slack direct message)
2. Create incident ticket (#incidents channel)
3. Document in #incidents

**Example:** Vector indexing is slow, but queries still fast
```
SEV3_MEDIUM: vector-indexer reindex taking 45min (normal: 20min) [2026-03-09 10:40:15Z]
  Triggered by: alert embedding_indexer_duration_seconds > 2700
  CSL Impact: Queries use cached embeddings; new writes delayed slightly
  Action: Monitor; investigate after higher-priority incidents
```

### SEV4 (LOW) - Information & Improvement

**Conditions:**
- Non-critical warnings (disk usage increasing)
- Documentation or process improvements needed
- Development-only issues (build failures)

**Response Time SLA:** Acknowledged within 1 business day

**Escalation:**
1. Log in #incidents-log
2. Create GitHub issue for tracking
3. No immediate escalation needed

## Incident Declaration Flow

```
Alert triggered by Prometheus/monitoring
  ↓
Alert sent to PagerDuty + #incidents Slack channel
  ↓
On-call engineer checks severity assessment
  ↓
If SEV1/SEV2: Engineer declares incident
  ├─ "INCIDENT: [SEV1|SEV2] {service} {issue}" in #incidents
  ├─ Start incident war room call (Zoom link in pinned message)
  └─ Post incident ID (INC-YYYYMMDD-NNN)
  ↓
If SEV3/SEV4: Engineer logs to #incidents-log (not full incident)
```

## Communication Templates

### Initial Incident Report

```
INCIDENT: [SEV{1-4}] {service_name} {symptom}
Incident ID: INC-20260309-001
Declared at: 2026-03-09 10:30:45Z

Service(s) Affected:
- heady-brain (100% error rate)
- semantic-search (dependent, degraded)

Symptoms:
- Inference requests returning 500 errors
- Latency: p95 > 5000ms
- CSL gate: all signals SUPPRESS

Root Cause (INVESTIGATING):
- heady-brain pod crashed; investigating logs

Current Impact:
- Users: ~2000 active users unable to search
- Features: search, recommendations down
- SLA: Missing p95 latency SLA by 3000ms

Actions in Progress:
1. Incident commander (Jane Doe) investigating pod crash logs
2. Scaling heady-brain from 3 to 8 replicas (ETA 2 min)
3. Database team checking pgvector connection pool

ETA for Resolution: 15 minutes
Next Update: 2026-03-09 10:45:45Z
```

### Status Update (Every 10-15 Minutes)

```
INCIDENT UPDATE: INC-20260309-001 [SEV1]
Last Updated: 2026-03-09 10:40:00Z

Status: INVESTIGATING → MITIGATION IN PROGRESS

Root Cause Identified:
- heady-brain OOM killed (Out of Memory)
- Model loading consumed 6GB, but limit is 4GB

Mitigation:
- Restarted pods with 8GB memory limit
- 4 of 5 replicas healthy; waiting for 5th
- Search is now returning results (p95 latency 1800ms)

Remaining Work:
- Confirm root cause (model size increased?)
- Permanent fix: increase memory limit in Kubernetes deployment
- Investigate why OOM wasn't caught by pre-deployment testing

Impact Status:
- Affected users: 2000 → 500 (reduced)
- Search latency: p95 from 5000ms → 1800ms
- Error rate: 100% → 5%

ETA for Resolution: 10 minutes
Next Update: 2026-03-09 10:55:00Z

Attendees:
- Incident Commander: Jane Doe (PagerDuty)
- heady-brain Team: Bob Smith, Alice Chen
- Database Team: Charlie Lee (standby)
- VP Engineering: Diana Prince (observer)
```

### Resolution & Closure

```
INCIDENT RESOLVED: INC-20260309-001 [SEV1]
Resolved at: 2026-03-09 11:02:15Z

Root Cause:
Model update (sentence-transformers v1.2.0) consumed 6GB memory, exceeding 4GB pod limit.
OOM killer terminated process; Kubernetes restarted pod, but new pod hit same issue.
Bug: deployment.yaml didn't update memory limit when model changed.

Impact Summary:
- Duration: 32 minutes
- Users affected: ~2000
- Requests failed: 45,000 (of 500K during incident)
- Data loss: None
- CSL gates: Suppressed all queries for 15 minutes; returned to INCLUDE after mitigation

Resolution:
1. Increased memory limit to 8Gi in deployment.yaml (FIB[7] scaling)
2. Redeployed heady-brain with new limits
3. All 5 replicas healthy; search latency back to p95 < 2000ms

Permanent Fix (Post-Incident):
1. Add memory requirement to model upgrade checklist
2. Add pre-deployment memory stress test to CI/CD
3. Implement memory monitoring dashboard for model-serving services

Post-Incident Review Scheduled:
- Date: 2026-03-10 14:00 UTC
- Attendees: heady-brain team, DevOps, VP Engineering
- Duration: 60 minutes
- Action items will be tracked in GitHub issue #12345

Lessons Learned:
1. Model size grows; need to monitor and communicate in upgrade notes
2. Pre-deployment testing didn't catch OOM; need test for actual inference load
3. CSL gates worked correctly; suppressed requests rather than dropping them

War Room Recording: [Zoom recording link]
Incident Postmortem: [GitHub issue link]
```

## Common Incidents & Response Procedures

### Incident 1: heady-brain Service Crashes (OOM)

**Detection:**
```
Alert fires: kube_pod_container_status_oom_killed > 0
OR
Alert fires: heady_brain_instances < 1
```

**Immediate Actions (0-5 min):**
1. Check memory limit
   ```bash
   kubectl get deployment heady-brain -n heady-services \
     -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}'
   ```
2. Increase memory by 2x (scaling)
   ```bash
   kubectl patch deployment heady-brain --type='json' \
     -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value":"8Gi"}]' \
     -n heady-services
   ```
3. Wait for rollout to complete
   ```bash
   kubectl rollout status deployment/heady-brain -n heady-services
   ```
4. Verify health
   ```bash
   curl http://api-gateway.heady-services.svc.cluster.local/health
   ```

**Root Cause Analysis (5-30 min):**
- Compare model size to previous version
- Check pod startup logs
- Review recent model deployments

**Permanent Fix:**
- Update memory limit in terraform/k8s manifest
- Add model size validation to pre-deployment checklist
- Implement memory profiling in CI/CD

### Incident 2: pgvector Connection Pool Exhaustion

**Detection:**
```
Alert fires: pg_pool_wait_queue > 5
OR
Alert fires: pg_pool_active == pg_pool_size (all connections in use)
```

**Immediate Actions (0-10 min):**
1. Check connection pool status
   ```bash
   curl http://pgvector-pool.heady-services.svc.cluster.local:3331/metrics | grep pg_pool
   ```
2. Scale heady-brain to distribute load
   ```bash
   kubectl scale deployment heady-brain --replicas=8 -n heady-services
   ```
3. Monitor queue depth
   ```bash
   watch 'curl -s http://pgvector-pool.heady-services.svc.cluster.local:3331/metrics | grep pg_pool_wait'
   ```

**Root Cause Analysis (10-30 min):**
- Check heady-brain logs for slow queries
- Profile pgvector queries
- Review schema and indexes

**Permanent Fix:**
- Increase connection pool size if consistently near limit
- Optimize slow queries (add indexes, improve WHERE clauses)
- Implement query timeout to prevent connection leaks

### Incident 3: Cascading Circuit Breaker Opens

**Detection:**
```
Alert fires: circuit_breaker_state == "OPEN" AND duration > 60s
OR
Alert fires: cascading failures (3+ services report circuit breaker open)
```

**Immediate Actions (0-5 min):**
1. Identify which service is failing
   ```bash
   kubectl logs -f -n heady-services --all-containers=true -l app=heady | grep -i "circuit"
   ```
2. Check health of dependency
   ```bash
   kubectl get deployment -n heady-services | grep -E "pgvector-pool|model-gateway|elasticsearch"
   ```
3. Restart if failing
   ```bash
   kubectl rollout restart deployment/pgvector-pool -n heady-services
   kubectl rollout status deployment/pgvector-pool -n heady-services
   ```
4. Monitor circuit breaker recovery
   ```bash
   curl http://heady-brain.heady-services.svc.cluster.local:3316/debug/circuit-breakers | jq .
   ```

**Root Cause Analysis (5-30 min):**
- Check logs of failing service for errors
- Verify no database connectivity issues
- Check resource usage (CPU, memory, disk)

**Permanent Fix:**
- Investigate why dependency failed
- Increase replica count if high-load conditions
- Implement graceful degradation (fallback to cached results)

### Incident 4: Authentication Service Unavailable

**Detection:**
```
Alert fires: auth_service_instances < 1
OR
Alert fires: login_errors_total > 100 in 1 minute
```

**Immediate Actions (0-5 min):**
1. Check service status
   ```bash
   kubectl get pods -n heady-services -l app=auth-service
   ```
2. Check logs for errors
   ```bash
   kubectl logs -f deployment/auth-service -n heady-services
   ```
3. If deployment issue, rollback
   ```bash
   kubectl rollout undo deployment/auth-service -n heady-services
   kubectl rollout status deployment/auth-service -n heady-services
   ```
4. If Firebase issue, check status
   ```bash
   curl https://status.firebase.google.com/
   ```

**Communication Note:**
- Users cannot log in; service is unavailable
- CSL gates cannot validate tokens; all requests SUPPRESS
- Post status update to #incidents and external status page

**Permanent Fix:**
- Ensure Firebase backup auth method exists
- Test Firebase OAuth flow in pre-deployment tests
- Implement local JWT fallback if Firebase unavailable

### Incident 5: Search Service Slow (Elasticsearch)

**Detection:**
```
Alert fires: elasticsearch_query_latency_p95 > 2000ms
OR
Alert fires: search_service_latency_p95 > 2000ms
```

**Immediate Actions (0-10 min):**
1. Check Elasticsearch cluster health
   ```bash
   curl http://elasticsearch.heady-services.svc.cluster.local:9200/_cluster/health | jq .
   ```
2. Identify slow queries
   ```bash
   curl http://elasticsearch.heady-services.svc.cluster.local:9200/_tasks?detailed=true | jq '.tasks | .[] | select(.running_time_in_nanos > 10000000000)'
   ```
3. If index is corrupted, force refresh
   ```bash
   curl -X POST http://elasticsearch.heady-services.svc.cluster.local:9200/content/_refresh
   ```
4. If high query volume, scale search-service
   ```bash
   kubectl scale deployment search-service --replicas=5 -n heady-services
   ```

**Root Cause Analysis (10-30 min):**
- Check Elasticsearch disk usage
- Check if reindexing is in progress
- Review slow query logs

**Permanent Fix:**
- Optimize slow queries (add better filters, use aggregations)
- Increase Elasticsearch shard count if consistently slow
- Implement query result caching

## Post-Incident Review Template

**Meeting:** [Date/Time], [Zoom link]
**Duration:** 60 minutes
**Attendees:** [List team members]

**Incident Summary:**
- Incident ID: INC-20260309-001
- Severity: SEV1
- Duration: 32 minutes
- Impact: 2000 users, 45K failed requests

**Timeline:**
- 10:30:45Z: Alert fired (heady_brain_errors_total > 99%)
- 10:30:52Z: On-call engineer paged
- 10:31:15Z: Incident declared in #incidents
- 10:35:22Z: Root cause identified (OOM)
- 10:40:00Z: Mitigation started (memory limit increased)
- 10:45:15Z: Service recovered
- 11:02:15Z: All replicas healthy; incident closed

**Root Cause:**
[Detailed explanation of why incident occurred]

**What Went Well:**
1. Incident detection fast (7 seconds from event to alert)
2. Team responded quickly; on-call engineer paged within 1 minute
3. CSL gates suppressed requests instead of dropping them
4. Fallback to cached results kept system partially functional

**What Didn't Go Well:**
1. Memory limit wasn't updated in deployment.yaml when model changed
2. Pre-deployment testing didn't simulate actual inference load
3. No memory monitoring dashboard for model-serving services

**Action Items:**
1. [Add memory requirement to model upgrade checklist] - Owner: Alice Chen, DUE: 2026-03-15
2. [Add pre-deployment memory stress test] - Owner: Bob Smith, DUE: 2026-03-20
3. [Create memory monitoring dashboard] - Owner: Charlie Lee, DUE: 2026-03-25

**Review of CSL Gates During Incident:**
- SUPPRESS gate correctly suppressed low-confidence queries (confidence < 0.5)
- Cached results returned via CAUTION gate (confidence 0.6-0.8)
- HIGH-confidence queries still processed from memory

## Related Documentation

- [DEBUG.md](../DEBUG.md)
- [ADR 002: Concurrent Equals](../adr/002-concurrent-equals.md)
- [ADR 003: CSL Over Boolean](../adr/003-csl-over-boolean.md)
- [Runbook: heady-brain](./heady-brain.md)
