# Heady Sacred Genesis v4.0.0

This bundle is a production-minded foundation rebuild for the Heady ecosystem, shaped from the constitutional context pack, the public Heady monorepo, and the architecture gaps surfaced by the audits. It focuses on the parts that materially unblock a clean v4 core:

- canonical phi-math foundation
- CSL vector logic primitives
- sacred-geometry topology and coherence tracking
- deterministic vector memory
- real circuit breakers, bulkheads, and saga orchestration
- 10,000-bee-aware worker factory
- 21-stage HCFullPipeline v4 runtime
- auto-success engine on a φ⁷ heartbeat
- Ed25519 receipt signing
- health and readiness snapshot service
- thin manager bootstrap

## Structure

- `shared/` — system-wide mathematical and geometric foundation
- `configs/` — canonical runtime configuration snapshots
- `src/core/` — logger and eventing primitives
- `src/memory/` — deterministic semantic memory store
- `src/resilience/` — circuit breaker, bulkhead, and saga orchestration
- `src/bees/` — bee lifecycle and worker factory
- `src/orchestration/` — liquid orchestrator, auto-success engine, and HCFullPipeline
- `src/crypto/` — Ed25519 receipt signing and verification
- `src/monitoring/` — health aggregation and coherence state
- `heady-manager.js` — single bootstrap entrypoint

## Run

```bash
npm test
npm start
```

## Design rules encoded here

- no hardcoded localhost references in runtime code
- phi-derived timing, thresholds, and allocation defaults
- zero external runtime dependencies
- reversible orchestration and explicit failure states
- modular foundation intended for projection into domain surfaces
