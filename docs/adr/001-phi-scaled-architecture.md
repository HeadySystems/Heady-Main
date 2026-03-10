# ADR 001: Phi-Scaled Architecture

**Status:** Accepted

## Context

Heady's distributed system spans 50+ microservices managing inference, vector storage, authentication, and orchestration across 9 content domains. Traditional magic numbers (timeouts, pool sizes, retry counts) create inconsistent behavior across the platform and make system tuning difficult.

The system required a unified approach to numerical constants that would:
1. Eliminate arbitrary magic numbers throughout the codebase
2. Create self-similar scaling behavior across different subsystems
3. Enable deterministic, reproducible system behavior
4. Make the relationship between system parameters mathematically evident

## Decision

All system constants derive from φ (golden ratio = 1.618033988749895) and Fibonacci sequences via the `@heady-ai/phi-math-foundation` package.

Core constants are established as:
- **PHI** = 1.618033988749895 (golden ratio)
- **PSI** = 1 / PHI = 0.618033988749895 (reciprocal)
- **PHI²** = 2.618033988749895
- **PHI³** = 4.236067977499790
- **FIB** = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765]

These constants are applied to:
- **Timeouts**: FIB[n] milliseconds for circuit breaker, connection, and request timeouts
- **Pool Sizes**: FIB[n] for database connection pools, worker thread pools, and queue capacities
- **Thresholds**: φ-derived percentiles (0.618, 0.691, 0.809, 0.882, 0.927, 0.972) for confidence gates
- **Backoff**: Exponential backoff uses PHI as multiplier instead of arbitrary values like 2

Example pool configurations:
- Redis connection pool: 13 (FIB[7]) connections
- PgVector query pool: 21 (FIB[8]) connections
- Cloud Run min instances: 1, max instances: 13 (FIB[7])
- In-memory cache entry limit: 1597 (FIB[16])

## Consequences

**Positive:**
- All system constants are mathematically justified and traceable to phi-math-foundation
- Self-similar scaling: if you understand one subsystem's tuning, others follow the same pattern
- Fibonacci sequences naturally model growth and capacity allocation
- CSL confidence thresholds (0.691, 0.809, 0.882, etc.) emerge from PHI, not arbitrary decimal values
- Deterministic: identical configuration across development, staging, production

**Negative:**
- Developers must understand phi-math-foundation conventions (learning curve)
- Some business-critical timeouts may not align perfectly with FIB values; documented deviations exist
- Onboarding new team members requires explanation of the phi-scaling philosophy
- Microservice configuration becomes opaque to those unfamiliar with Fibonacci sequences

**Maintenance:**
- All numeric constants must reference phi-math-foundation exports, never hardcoded values
- Pull requests violating this pattern are rejected by linting rules
- Configuration documentation always shows the FIB[n] or PHI power calculation alongside the final number
- Performance tuning discussions document the trade-off rationale when deviating from phi-scaling

## Related Decisions
- [ADR 002: Concurrent Equals (No Priorities)](./002-concurrent-equals.md)
- [ADR 003: CSL Over Boolean](./003-csl-over-boolean.md)
