# ADR-007: Concurrent Equals — No Priority/Ranking System

## Status

Accepted

## Date

2024-10-01

## Context

Conventional software architectures embed priority and ranking systems everywhere: task queues have priority levels, search results are ranked, services have tiers (critical vs. non-critical), users have roles with hierarchical permissions, and features are prioritized in backlogs.

Eric Haywood's philosophy for the Heady™ platform rejects hierarchical ranking as a design pattern. The platform models human cognition, and human thought does not prioritize one memory over another — it activates relevant memories concurrently. A bee swarm does not rank its workers — each bee contributes equally to the colony's intelligence.

The platform must:
- Process all qualifying tasks concurrently, not sequentially by priority
- Treat all services as equals in the mesh (no "critical" vs. "non-critical")
- Present all search results above the CSL include gate as concurrent options, not ranked lists
- Route requests to all qualifying agents simultaneously, not to the "best" one
- Avoid language like "priority", "rank", "tier", "level", "primary", "secondary", "fallback"

We evaluated:

1. **Priority queues**: Standard approach with P0/P1/P2/P3 levels
2. **Weighted round-robin**: Services receive traffic proportional to assigned weights
3. **Concurrent equals**: All qualifying participants process simultaneously

## Decision

The Heady™ platform operates on a concurrent-equals model. There is no priority, ranking, or hierarchical ordering between services, tasks, agents, search results, or any other entity.

Specific implementations:

**Service mesh**: All 58 services have identical Docker Compose configuration (using `x-heady-service` YAML anchor). No service has `priority` or `weight` attributes. Health checks use identical Fibonacci intervals (interval=13s, timeout=5s, retries=5).

**Agent orchestration**: When heady-conductor dispatches a task, all agents whose CSL score exceeds the include gate (0.382) receive the task concurrently. Results are merged, not selected from a "winner."

**Search results**: search-service returns all documents above the CSL include threshold. The application layer presents them as equally relevant options. There is no `sort_by_relevance` or `rank` field.

**Notifications**: notification-service delivers to all qualifying channels simultaneously (WebSocket, SSE, webhook). No channel is "preferred" over another.

**Load balancing**: The mesh distributes requests via round-robin (not weighted). All service instances of the same type receive equal traffic.

**Code review**: PR reviews check for banned language:
- "priority" → use "concurrent"
- "rank" / "ranking" → use "qualifying" or "concurrent-equals"
- "primary" / "secondary" → use specific service names
- "fallback" → use "alternative path"
- "tier" → use "domain" or "category"
- "level" → use "gate" or "threshold"
- "best" / "top" / "first" → use "qualifying" or "above-gate"

## Consequences

### Benefits
- Eliminates single points of failure: no "primary" service whose failure triggers "fallback"
- Richer results: concurrent processing surfaces diverse perspectives, not just the "top" one
- Fairness: all services, agents, and results receive equal treatment
- Simplicity: no priority queue logic, no weight tuning, no tier management
- Philosophical coherence: matches the platform's model of distributed cognition

### Costs
- Resource usage: concurrent processing uses more compute than priority-based filtering
- Result volume: presenting all qualifying results may overwhelm users
- Conventional assumptions: monitoring tools, SLO frameworks, and incident response assume priority levels
- Communication: explaining "no ranking" to stakeholders accustomed to P0/P1/P2

### Mitigations
- CSL gates (0.382 include threshold) naturally filter low-quality results without ranking
- Bulkhead patterns (max concurrent=55) prevent resource exhaustion from concurrent processing
- Monitoring uses "domain" labels instead of "tier" labels for dashboarding
- Incident response uses "scope" (single service, domain, platform-wide) instead of "severity levels"
- This ADR is the canonical reference for the concurrent-equals philosophy
