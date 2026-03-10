# ADR-001: 58 Microservices Architecture

## Status

Accepted

## Date

2024-08-13

## Context

The Heady™ platform, founded by Eric Haywood, is an AI-powered ecosystem that spans multiple domains: intelligence processing, agent orchestration, vector operations, user-facing applications, external integrations, security, monitoring, and content management. The platform serves 9 distinct sites (headysystems.com, headyme.com, headyfinance.com, headyos.com, headyex.com, headyconnection.com, headyconnection.org, heady-ai, and admin).

We evaluated three architectural approaches:

1. **Monolith**: Single deployable with all functionality in one codebase
2. **Modular monolith**: Single deployable with internal module boundaries
3. **Microservices**: Independent services with discrete responsibilities

The platform requires:
- Independent scaling of AI inference (heady-infer, model-gateway) vs. web-facing services (heady-web, heady-ui)
- Isolation of security-critical components (heady-guard, heady-security, auth-session-server, secret-gateway) from general application code
- Independent deployment of 9 distinct sites without cross-site regression risk
- Multiple AI model integrations (Google MCP, HuggingFace, Perplexity, Jules, Colab, Silicon) each with different scaling characteristics and failure modes
- Real-time agent orchestration (heady-bee-factory, heady-hive, heady-orchestration) with sub-second latency requirements
- pgvector operations (heady-vector, heady-embed, heady-memory, search-service) with GPU-adjacent compute requirements

## Decision

We adopt a microservices architecture with 58 independent services organized into functional domains:

- **Core Intelligence** (9 services, ports 3310-3318): heady-brain, heady-brains, heady-soul, heady-conductor, heady-infer, heady-embed, heady-memory, heady-vector, heady-projection
- **Agent & Bee** (4 services, ports 3319-3322): heady-bee-factory, heady-hive, heady-orchestration, heady-federation
- **Security & Governance** (3 services, ports 3323-3325): heady-guard, heady-security, heady-governance
- **Monitoring & Health** (4 services, ports 3326-3329): heady-health, heady-eval, heady-maintenance, heady-testing
- **User-Facing** (6 services, ports 3330-3335): heady-web, heady-buddy, heady-ui, heady-onboarding, heady-pilot-onboarding, heady-task-browser
- **Pipeline & Workflow** (4 services, ports 3340-3343): auto-success-engine, hcfullpipeline-executor, heady-chain, heady-cache
- **AI Routing & Gateway** (4 services, ports 3350-3353): ai-router, api-gateway, model-gateway, domain-router
- **External Integrations** (9 services, ports 3360-3368): mcp-server, google-mcp, memory-mcp, perplexity-mcp, jules-mcp, huggingface-gateway, colab-gateway, silicon-bridge, discord-bot
- **Specialized** (7 services, ports 3380-3393): heady-vinci, heady-autobiographer, heady-midi, budget-tracker, cli-service, prompt-manager, secret-gateway
- **New Platform** (8 services, ports 3397-3404): auth-session-server, notification-service, analytics-service, billing-service, search-service, scheduler-service, migration-service, asset-pipeline

All services share:
- Express.js runtime on Node.js 22
- φ-math constants (PHI, PSI, PSI2, FIB, VECTOR_DIM=384, CSL_GATES)
- HeadyAutoContext middleware on every endpoint
- Structured JSON logging (structuredLog function)
- Fibonacci-based circuit breakers and bulkhead patterns
- OpenTelemetry distributed tracing
- Consul service discovery
- Multi-stage Docker builds (node:22-alpine + tini)
- Health checks at /health, /healthz, /readiness

All services operate as concurrent equals. There is no priority or ranking between services. Each service has equal standing in the mesh.

## Consequences

### Benefits
- Independent deployability: any service can be updated without affecting others
- Fault isolation: a failure in heady-midi does not cascade to heady-brain
- Per-service scaling: heady-infer can scale to 8 instances while heady-midi stays at 1
- Team autonomy: different contributors can own different service domains
- Technology flexibility: services could migrate to different runtimes if needed

### Costs
- Operational complexity: 58 services require robust CI/CD, monitoring, and health checking
- Network latency: inter-service calls add milliseconds vs. in-process function calls
- Data consistency: distributed transactions require saga patterns or eventual consistency
- Developer onboarding: new contributors must understand the service topology

### Mitigations
- Docker Compose for local development boots all 58 services with one command
- Consul service discovery eliminates hard-coded service addresses
- OpenTelemetry tracing provides cross-service request visibility
- Shared patterns (HeadyAutoContext, structuredLog, circuit breakers) ensure consistency
- Comprehensive health checks with Fibonacci-timed intervals
- scripts/health-check-all.sh validates the entire fleet in seconds
