# Heady™ — Maximum Potential Platform

> Sovereign AI Operating System built on Sacred Geometry, Continuous Semantic Logic, and φ-scaled architecture.

**Founder:** Eric Haywood — HeadySystems Inc. — 51+ Provisional Patents  
**Version:** 4.0.0 — Sacred Geometry v4.0  
**Architecture:** φ-scaled, CSL-gated, concurrent-equals, zero-trust

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/HeadyMe/heady-platform.git
cd heady-platform
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start all services
docker compose -f infra/docker/docker-compose.services.yml up -d

# 4. Verify health
curl http://localhost:3380/health  # Auth Session Server
curl http://localhost:3381/health  # Notification Service
curl http://localhost:3382/health  # Analytics Service

# 5. Open HeadyOS Portal
open http://localhost:8080/portal/
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    HeadyOS Portal                        │
│           (Command Center — Auth + Nav Hub)              │
├─────────────────────────────────────────────────────────┤
│   Topology    Swarm     Vector      Colab Runtime       │
│   Dashboard   Monitor   Explorer    Panel               │
├─────────────────────────────────────────────────────────┤
│                  LIQUID GATEWAY                          │
│   Provider Racing │ Health Monitor │ BYOK │ SSE/WS      │
├─────────────────────────────────────────────────────────┤
│   AutoContext │ Conductor │ HCFullPipeline │ Self-Heal   │
├─────────────────────────────────────────────────────────┤
│              CORE ENGINES                                │
│  Liquid Nodes │ Swarm Engine │ Async Engine │ Vector Ops│
│  Bee Registry │ Edge Runtime │ CSL Engine   │ HDC/VSA   │
├─────────────────────────────────────────────────────────┤
│              MICROSERVICES                               │
│  Auth   │ Notify │ Analytics │ Billing │ Scheduler      │
│  Search │ Migration │ Saga │ NATS Consumers │ gRPC      │
├─────────────────────────────────────────────────────────┤
│              INFRASTRUCTURE                              │
│  PostgreSQL+pgvector │ NATS JetStream │ Redis │ PGBounce│
│  Prometheus │ Grafana │ Docker Compose │ GitHub Actions  │
├─────────────────────────────────────────────────────────┤
│          3 × Colab Pro+ Runtimes (Latent Space Ops)     │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
heady-improvement/
├── core/                    # Core engines (10 modules)
│   ├── auto-context/        # HeadyAutoContext — mandatory context assembly
│   ├── self-healing/        # Drift detection + automated repair
│   ├── conductor/           # CSL-scored task routing to 17 swarms
│   ├── edge-runtime/        # Durable agent state, edge-origin routing
│   ├── liquid-gateway/      # Provider racing, BYOK, SSE/WS transport
│   ├── liquid-nodes/        # Node registry, topology, Colab runtime
│   ├── swarm-engine/        # Swarm manager, consensus, backpressure
│   ├── async-engine/        # Task decomposition, parallel execution
│   ├── bee-registry/        # 33 bee templates, lifecycle management
│   ├── pipeline/            # HCFullPipeline — 12-stage execution
│   ├── vector-ops/          # CSL engine, HDC/VSA, ternary logic, search
│   └── index.js             # Unified barrel export
├── services/                # Microservices (10 services)
│   ├── auth-session-server/ # Firebase Auth + session management
│   ├── notification-service/# WebSocket + SSE real-time notifications
│   ├── analytics-service/   # Event collection + DuckDB aggregation
│   ├── billing-service/     # Stripe integration + φ-metering
│   ├── scheduler-service/   # Cron + event-driven job scheduling
│   ├── search-service/      # Hybrid BM25 + vector search
│   ├── migration-service/   # PostgreSQL schema migrations
│   ├── saga-coordinator/    # Distributed transaction orchestration
│   ├── nats-consumers/      # NATS JetStream consumer groups
│   └── grpc-protos/         # Protocol Buffer definitions
├── packages/                # Shared NPM packages (4 packages)
│   ├── phi-math-foundation/ # φ-constants, Fibonacci, fusion weights
│   ├── structured-logger/   # JSON logging + correlation IDs
│   ├── health-probes/       # Kubernetes-compatible health checks
│   └── schema-registry/     # JSON Schema validation + registry
├── shared/                  # Shared middleware + config
│   ├── config/              # Environment, domains, feature flags
│   └── middleware/           # CORS, CSP, rate limiter, signing, guardrails
├── ui/                      # Frontend dashboards (5 UIs)
│   ├── portal/              # HeadyOS Command Center (auth + nav hub)
│   ├── topology-dashboard/  # Liquid node topology visualization
│   ├── swarm-monitor/       # Swarm health + bee lifecycle
│   ├── vector-explorer/     # 384D vector space explorer
│   └── colab-runtime-panel/ # 3 × Colab Pro+ runtime management
├── infra/                   # Infrastructure-as-code
│   ├── docker/              # Docker Compose (15 services)
│   ├── ci-cd/               # GitHub Actions + pre-commit hooks
│   ├── monitoring/          # Prometheus, Grafana, alerting rules
│   ├── k6-load-tests/       # Performance testing
│   ├── nats/                # NATS server configuration
│   └── pgbouncer/           # Connection pooling
├── tests/                   # Test suites (14 test files)
├── docs/                    # Documentation
│   ├── adr/                 # Architecture Decision Records (8 ADRs)
│   ├── runbooks/            # Operational runbooks (6 runbooks)
│   ├── security/            # Security model documentation
│   ├── onboarding/          # Developer onboarding guide
│   └── ERROR_CODES.md       # Error code reference
├── scripts/                 # Automation scripts
├── GAPS_FOUND.md            # All identified gaps + resolution status
├── IMPROVEMENTS.md          # All improvements made
├── CHANGES.md               # Complete changelog
└── package.json             # Root monorepo configuration
```

---

## 8 Unbreakable Laws

| # | Law | Enforcement |
|---|-----|-------------|
| 1 | Thoroughness over speed | Complete implementations only — no TODOs, no stubs |
| 2 | Complete implementation only | Every file is production-ready |
| 3 | φ-scaled everything | PHI=1.618, Fibonacci sizing, no magic numbers |
| 4 | CSL gates replace boolean | Continuous Semantic Logic, not if/else |
| 5 | HeadyAutoContext mandatory | Context assembled before every task |
| 6 | Zero-trust security | Validated inputs, encrypted transport, scoped secrets |
| 7 | Concurrent-equals | No priority rankings — semantic routing only |
| 8 | Sacred Geometry | Golden ratio topology, Fibonacci sequences |

---

## Key Constants

```javascript
const PHI   = 1.618033988749895;  // Golden Ratio
const PSI   = 1 / PHI;            // ≈ 0.618 (Conjugate)
const PSI2  = PSI * PSI;           // ≈ 0.382
const FIB   = [1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987];

// CSL Quality Gates
const PASS   = phiThreshold(3);    // ≈ 0.882
const REVIEW = phiThreshold(2);    // ≈ 0.809
const RETRY  = phiThreshold(1);    // ≈ 0.691
const FAIL   = phiThreshold(0);    // ≈ 0.500
```

---

## Services

| Service | Port | Purpose |
|---|---|---|
| auth-session-server | 3380 | Firebase Auth + session management |
| notification-service | 3381 | WebSocket + SSE notifications |
| analytics-service | 3382 | Event collection + metrics |
| billing-service | 3383 | Stripe billing + metering |
| scheduler-service | 3384 | Job scheduling |
| search-service | 8089 | Hybrid search (BM25 + vector) |
| migration-service | 4020 | Schema migrations |
| saga-coordinator | 4030 | Distributed transactions |
| nats-consumers | 4040 | Event stream processing |

---

## Documentation

- [Developer Onboarding](docs/onboarding/developer-onboarding.md)
- [Security Model](docs/security/security-model.md)
- [Error Codes](docs/ERROR_CODES.md)
- [Emergency Runbook](docs/runbooks/emergency-runbook.md)
- [Auth Runbook](docs/runbooks/auth-runbook.md)
- [Deployment Runbook](docs/runbooks/deployment-runbook.md)
- [Monitoring Runbook](docs/runbooks/monitoring-runbook.md)
- [HeadyBrain Runbook](docs/runbooks/heady-brain-runbook.md)
- [Service Debug Guide](docs/runbooks/service-debug-guide.md)
- [ADR-001: Microservice Architecture](docs/adr/ADR-001-microservice-architecture.md)
- [ADR-002: φ-Scaled Constants](docs/adr/ADR-002-phi-scaled-constants.md)
- [ADR-003: pgvector over Pinecone](docs/adr/ADR-003-pgvector-over-pinecone.md)
- [ADR-005: CSL over Boolean](docs/adr/ADR-005-csl-over-boolean.md)

---

## Links

- [HeadyAI](https://heady.ai) — Main platform
- [HeadyAPI](https://headyapi.com) — API gateway
- [HeadyMCP](https://headymcp.com) — Model Context Protocol
- [HeadyConnection](https://headyconnection.org) — Nonprofit arm
- [GitHub](https://github.com/HeadyMe) — Source code

---

© 2026 HeadySystems Inc. — Eric Haywood, Founder — 51+ Provisional Patents — Sacred Geometry v4.0
