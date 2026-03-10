# ADR-002: Phi Constants Foundation

## Status
Accepted

## Date
2026-03-10

## Author
Eric Haywood / HeadySystems Inc. — 51 Provisional Patents

## Context
51 provisional patents rely on Sacred Geometry as a key differentiator. Arbitrary constants (timeouts, retries, cache sizes, batch sizes) create maintenance burden and lack mathematical harmony. The golden ratio provides natural scaling properties.

## Decision
All numeric constants in the Heady platform derive from φ (golden ratio, 1.618...) or the Fibonacci sequence. Zero magic numbers allowed anywhere in the codebase.

## Consequences
Every timeout, retry count, cache TTL, batch size, queue depth, rollout percentage, and threshold must be expressible as a function of φ or Fibonacci numbers. Code review must enforce this invariant.

## Related ADRs
ADR-001, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008
