# ADR-001: Why Sacred Geometry Constants

## Status: Accepted

## Context
Every software system needs numeric constants for timeouts, thresholds, cache sizes, retry intervals, and resource allocation. Most systems use arbitrary "magic numbers" (100, 500, 0.7, 0.85) that have no mathematical relationship to each other and create inconsistency.

## Decision
All Heady constants derive from φ (golden ratio = 1.618) or the Fibonacci sequence. This includes:
- Timeouts: φⁿ × 1000ms
- Thresholds: 1 − ψⁿ × 0.5
- Cache sizes: fib(n)
- Pool allocation: Fibonacci-adjacent percentages
- Backoff: φ-exponential progression
- Batch sizes: Fibonacci numbers

The canonical source is `shared/phi-math.js`.

## Consequences
- **Positive**: All constants are mathematically related, creating harmonic scaling across the system
- **Positive**: Zero ambiguity about what constant to use — the derivation formula is the specification
- **Positive**: Self-similar fractal architecture — the same patterns appear at every scale
- **Positive**: 51 provisional patents covering these patterns
- **Negative**: Learning curve for new developers unfamiliar with φ-math
- **Negative**: Some constants are approximations (e.g., 34% instead of exactly 1/φ²)

## Patent Reference
Multiple provisional patents cover Sacred Geometry orchestration patterns.
