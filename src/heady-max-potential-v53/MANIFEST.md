# Heady™ Latent OS v5.3.0 — File Manifest

> Complete inventory of all files in the system
> © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents

## Statistics

| Category | Count |
|----------|-------|
| Source modules | 32 |
| Services | 8 (with Dockerfiles) |
| Tests | 8 files (120+ assertions) |
| Documentation | 35 files |
| Infrastructure | 9 files |
| Configuration | 3 files |
| **Total** | **~140 files** |

## Shared Modules

| File | Purpose |
|------|---------|
| `shared/phi-math.js` | φ/Fibonacci constants, CSL thresholds, timing |
| `shared/heady-domains.js` | Canonical 9-domain registry, CORS origins, navigation |

## Core Source (src/)

### CSL Engine
| File | Purpose |
|------|---------|
| `src/csl/csl-engine.js` | Continuous Semantic Logic operations |
| `src/csl/csl-router.js` | CSL-based task routing |

### Resilience
| File | Purpose |
|------|---------|
| `src/resilience/circuit-breaker.js` | Circuit breaker with φ-backoff |
| `src/resilience/exponential-backoff.js` | φ-scaled retry timing |
| `src/resilience/drift-detector.js` | Cosine similarity drift detection |
| `src/resilience/self-healer.js` | Automatic recovery and respawn |

### Memory
| File | Purpose |
|------|---------|
| `src/memory/vector-memory.js` | 3D vector memory store |
| `src/memory/embedding-router.js` | Multi-provider embedding routing |
| `src/memory/context-window-manager.js` | Tiered context management |

### Orchestration
| File | Purpose |
|------|---------|
| `src/orchestration/heady-conductor.js` | Central task dispatch |
| `src/orchestration/liquid-scheduler.js` | Dynamic scheduling |
| `src/orchestration/pool-manager.js` | Hot/Warm/Cold pool management |

### Pipeline
| File | Purpose |
|------|---------|
| `src/pipeline/pipeline-core.js` | HCFullPipeline (HCFP) engine |
| `src/pipeline/pipeline-stages.js` | Stage definitions |

### Bees (Agents)
| File | Purpose |
|------|---------|
| `src/bees/bee-factory.js` | Dynamic agent factory |
| `src/bees/swarm-coordinator.js` | Multi-agent coordination |

### Governance
| File | Purpose |
|------|---------|
| `src/governance/budget-tracker.js` | Cost tracking |
| `src/governance/governance-gate.js` | Quality/compliance gates |
| `src/governance/semantic-backpressure.js` | SRE adaptive throttling |

### Core
| File | Purpose |
|------|---------|
| `src/core/event-bus.js` | In-process event system |
| `src/core/heady-logger.js` | Structured JSON logger |
| `src/core/health-probes.js` | Kubernetes-compatible health checks |

### Security (NEW in v5.3.0)
| File | Purpose |
|------|---------|
| `src/security/csrf-protection.js` | Double-submit cookie CSRF |
| `src/security/input-validator.js` | Schema-based input validation |
| `src/security/secret-manager.js` | Environment secret loading |
| `src/security/cross-domain-auth.js` | **NEW** — Relay codes, bridge, PKCE |
| `src/security/token-manager.js` | **NEW** — Token lifecycle management |
| `src/security/security-headers.js` | **NEW** — CSP, HSTS, security headers |
| `src/security/index.js` | Aggregated security exports |

### Middleware
| File | Purpose |
|------|---------|
| `src/middleware/auth-verify.js` | Token extraction & verification |
| `src/middleware/cors.js` | CORS with explicit origin whitelist |
| `src/middleware/error-handler.js` | Centralized error handling |
| `src/middleware/request-id.js` | Request tracing |
| `src/middleware/index.js` | Aggregated middleware exports |

### Liquid Nodes (Cloudflare Edge)
| File | Purpose |
|------|---------|
| `src/liquid-nodes/durable-agent-state.js` | Durable Object state |
| `src/liquid-nodes/edge-origin-router.js` | Edge↔Origin routing |
| `src/liquid-nodes/edge-worker.js` | Cloudflare Worker |
| `src/liquid-nodes/index.js` | Aggregated exports |

### Utils
| File | Purpose |
|------|---------|
| `src/utils/app-error.js` | Error classes |
| `src/utils/config-loader.js` | YAML/env config loading |
| `src/utils/retry-helper.js` | Generic retry with φ-backoff |

### Bootstrap & Auto-Success
| File | Purpose |
|------|---------|
| `src/bootstrap/bootstrap.js` | System initialization |
| `src/bootstrap/heady-manager.js` | HeadyManager HTTP/MCP server |
| `src/auto-success/auto-success-engine.js` | Auto-success pipeline |

## Services (8)

| Service | Port | New? |
|---------|------|------|
| `services/api-gateway/` | 3370 | v5.2.0 |
| `services/auth-session/` | 3360 | v5.1.0 |
| `services/domain-router/` | 3366 | **NEW v5.3.0** |
| `services/notification/` | 3361 | v5.1.0 |
| `services/analytics/` | 3362 | v5.1.0 |
| `services/scheduler/` | 3363 | v5.1.0 |
| `services/search/` | 3364 | v5.1.0 |
| `services/onboarding/` | 3365 | v5.2.0 |

Each service has: `index.js`, `package.json`, `Dockerfile`, `README.md`

## Tests (8 files, 120+ assertions)

| File | Type | Assertions |
|------|------|------------|
| `tests/unit/phi-math.test.js` | Unit | 19 |
| `tests/unit/csl-engine.test.js` | Unit | 15 |
| `tests/unit/auth-session.test.js` | Unit | 15 |
| `tests/unit/cross-domain-auth.test.js` | Unit | **NEW** — 17 |
| `tests/unit/token-manager.test.js` | Unit | **NEW** — 12 |
| `tests/unit/heady-domains.test.js` | Unit | **NEW** — 17 |
| `tests/integration/domain-router.test.js` | Integration | **NEW** — 10 |
| `tests/integration/security-headers.test.js` | Integration | **NEW** — 8 |
| `tests/integration/middleware.test.js` | Integration | 20 |
| `tests/integration/liquid-nodes.test.js` | Integration | 15 |

## Documentation (35 files)

### Hub & Guides
| File | Purpose |
|------|---------|
| `docs/README.md` | **NEW** — Documentation hub index |
| `docs/getting-started/README.md` | **NEW** — Developer quickstart |
| `docs/architecture/README.md` | **NEW** — System architecture guide |
| `docs/api-reference/README.md` | **NEW** — Complete API reference |
| `docs/security/README.md` | **NEW** — Security & auth guide |
| `docs/phi-compliance/README.md` | **NEW** — φ-math compliance rules |

### Service Documentation
| File | Purpose |
|------|---------|
| `docs/services/README.md` | **NEW** — Service index |
| `docs/services/api-gateway.md` | **NEW** |
| `docs/services/auth-session.md` | **NEW** |
| `docs/services/domain-router.md` | **NEW** |
| `docs/services/notification.md` | **NEW** |
| `docs/services/analytics.md` | **NEW** |
| `docs/services/scheduler.md` | **NEW** |
| `docs/services/search.md` | **NEW** |
| `docs/services/onboarding.md` | **NEW** |

### ADRs (6)
| File | Purpose |
|------|---------|
| `docs/adrs/README.md` | **NEW** — ADR index |
| `docs/adrs/001-why-sacred-geometry.md` | Sacred Geometry rationale |
| `docs/adrs/002-why-50-services.md` | Service count rationale |
| `docs/adrs/003-why-colab-as-latent-space.md` | Colab rationale |
| `docs/adrs/004-why-cross-domain-relay.md` | **NEW** — Cross-domain auth |
| `docs/adrs/005-why-csl-over-boolean.md` | **NEW** — CSL vs boolean |
| `docs/adrs/006-why-phi-derived-constants.md` | **NEW** — φ-math rationale |

### Runbooks (10)
| File | Purpose |
|------|---------|
| `docs/runbooks/README.md` | **NEW** — Runbook index |
| `docs/runbooks/auth-session-runbook.md` | Auth operations |
| `docs/runbooks/colab-gateway-runbook.md` | Colab operations |
| `docs/runbooks/api-gateway-runbook.md` | **NEW** |
| `docs/runbooks/domain-router-runbook.md` | **NEW** |
| `docs/runbooks/notification-runbook.md` | **NEW** |
| `docs/runbooks/analytics-runbook.md` | **NEW** |
| `docs/runbooks/scheduler-runbook.md` | **NEW** |
| `docs/runbooks/search-runbook.md` | **NEW** |
| `docs/runbooks/onboarding-runbook.md` | **NEW** |
| `docs/runbooks/incident-response-runbook.md` | **NEW** |

### Other Docs
| File | Purpose |
|------|---------|
| `docs/ERROR_CODES.md` | Error code reference |
| `ARCHITECTURE.md` | Root architecture overview |
| `CHANGES.md` | Changelog |
| `MANIFEST.md` | This file |
| `PHI-COMPLIANCE-SCORECARD.md` | Compliance scorecard |
| `GAPS_FOUND.md` | Known gaps |
| `IMPROVEMENTS.md` | Improvement tracker |
