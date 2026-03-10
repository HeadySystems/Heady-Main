# ADR-002: φ-Scaling — No Magic Numbers

## Status

Accepted

## Date

2024-08-13

## Context

Software systems are littered with magic numbers: arbitrary timeouts (30s), retry counts (3), queue sizes (100), connection pools (20). These values have no mathematical foundation — they are guesses that often prove wrong under load.

Eric Haywood's vision for the Heady™ platform rejects arbitrary constants. Every numeric parameter in the system must be derived from the golden ratio (φ = 1.618033988749895) or the Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987...).

The golden ratio appears throughout nature — in nautilus shells, sunflower spirals, galaxy arms, and DNA structure. Systems that adopt φ-scaling naturally resist the accumulation of arbitrary technical debt that plagues conventional software.

We considered three approaches:

1. **Conventional magic numbers**: Use round numbers (10, 100, 1000) as is standard
2. **Configuration-driven**: Externalize all constants to config files
3. **φ-derived constants**: Derive all numerical parameters from PHI and Fibonacci

## Decision

All numeric constants in the Heady™ platform are derived from the golden ratio or Fibonacci sequence. Every service declares these constants at the top of its source:

```javascript
const PHI = 1.618033988749895;
const PSI = 1 / PHI;               // ≈ 0.618033988749895
const PSI2 = PSI * PSI;             // ≈ 0.381966011250105
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const VECTOR_DIM = 384;             // 256 × 1.5 (φ-adjacent)
const CSL_GATES = Object.freeze({
  include: PSI * PSI,               // ≈ 0.382
  boost: PSI,                       // ≈ 0.618
  inject: PSI + 0.1,                // ≈ 0.718
});
```

Specific applications:

| Parameter | Conventional | φ-Derived | Source |
|-----------|-------------|-----------|--------|
| Health check interval | 30s | 13s | FIB[6] |
| Health check timeout | 10s | 5s | FIB[4] |
| Health check retries | 3 | 5 | FIB[4] |
| Start period | 30s | 21s | FIB[7] |
| Circuit breaker threshold | 5 failures | 21 failures | FIB[7] |
| Circuit breaker reset | 60s | 89s | FIB[10] |
| Bulkhead max concurrent | 50 | 55 | FIB[9] |
| Bulkhead queue size | 100 | 89 | FIB[10] |
| Notification queue max | 100 | 233 | FIB[12] |
| Connection pool default | 20 | 34 | FIB[8] |
| Max connections | 200 | 233 | FIB[12] |
| Idle timeout | 60s | 89s | FIB[10] |
| Asset responsive widths | 320, 640, 1024 | 233, 377, 610, 987, 1597 | FIB[12-16] |
| Scheduler intervals | 5s, 10s, 30s, 60s | 5s, 8s, 13s, 21s, 34s | FIB[4-8] |
| Time buckets | 5m, 15m, 30m, 60m | 5m, 8m, 13m, 21m | FIB[4-7] |
| Search fusion weights | 0.5 / 0.5 | PSI / PSI2 (0.618/0.382) | Golden ratio |
| Pricing multiplier | 2x | PHI (1.618x) | Golden ratio |
| Consul deregister timeout | 90s | 89s | FIB[10] |
| DLQ retry limit | 3 | 4 | ⌈φ³⌉ |

## Consequences

### Benefits
- Zero magic numbers: every constant has a mathematical derivation
- Self-documenting: seeing `FIB[7]` tells you exactly where 21 came from
- Natural scaling: Fibonacci numbers grow logarithmically, matching system load patterns
- Aesthetic coherence: the platform exhibits mathematical harmony at every layer
- Debate elimination: "why 100?" is answered by "because FIB[12] = 233"

### Costs
- Unfamiliarity: new developers must learn the φ-constant system
- Non-standard values: operations teams expect round numbers in dashboards
- Occasional imperfect fit: sometimes 30s is genuinely better than 34s for a timeout

### Mitigations
- Every service has the constants defined at the top of index.js — visible and explicit
- This ADR documents the mapping from conventional to φ-derived values
- Comments in code reference the Fibonacci index: `// FIB[7] = 21`
- The CSL_GATES object provides named constants for common thresholds
