# ADR 003: CSL (Confidence Signal Logic) Over Boolean Gates

**Status:** Accepted

## Context

Boolean conditional logic (if/then/else, accept/reject, pass/fail) forces all decisions into binary states. This creates:
1. **Information loss:** A signal with 0.71 confidence is treated identically to a signal with 0.51 confidence (both "false")
2. **Hard cutoffs:** Crossing a threshold causes sudden behavior change; no graceful degradation
3. **Cascading failures:** When a service fails to meet a boolean gate, there's no intermediate state to offer reduced functionality
4. **Debugging ambiguity:** Why was something rejected? Because it's "false" — no detail

Heady processes heterogeneous data from:
- User embeddings (high confidence, recent data)
- Cached semantic vectors (variable freshness, medium confidence)
- Third-party API responses (external latency, variable reliability)
- Generated content (inference-based, confidence varies by model)

Boolean gates would discard data falling below a hard threshold despite potentially useful signal.

## Decision

Replace boolean gates with Confidence Signal Logic (CSL), a 6-level graduated response system:

1. **SUPPRESS** (confidence ≤ 0.5): Data is enqueued for later processing; immediate execution blocked
2. **CAUTION** (0.5 < confidence ≤ 0.691): Data accepted but flagged; monitored for consistency issues
3. **INCLUDE** (0.691 < confidence ≤ 0.809): Standard processing; no special handling
4. **BOOST** (0.809 < confidence ≤ 0.882): Data prioritized; included in fast-path computations
5. **INJECT** (0.882 < confidence ≤ 0.927): Data injected into critical path; used for high-stakes decisions
6. **HIGH** (0.927 < confidence ≤ 0.972): Primary signal; preferred in multi-source fusion
7. **CRITICAL** (confidence > 0.972): Canonical truth; used to correct other signals

CSL thresholds (0.5, 0.691, 0.809, 0.882, 0.927, 0.972) derive from φ-golden ratio mathematics via phi-math-foundation.

Signal computation workflow:
```
Raw Signal → CSL Gates → Graduated Response
  ↓
Confidence Score (0.0-1.0)
  ↓
Match against CSL thresholds → decision ∈ {SUPPRESS, CAUTION, INCLUDE, BOOST, INJECT, HIGH, CRITICAL}
  ↓
Apply corresponding action (queue delay, flag, prioritize, or inject)
```

Example: Processing a user embedding query
- User provides explicit query: confidence = 0.97 → CSL_HIGH → Used in primary ranking
- Cache hit from 30min-old data: confidence = 0.72 → CSL_CAUTION → Used if primary unavailable
- Fallback inference (slow): confidence = 0.55 → CSL_SUPPRESS → Queued, only computed if primary fails

Result: System gracefully degrades rather than hard-failing.

## Consequences

**Positive:**
- Nuanced decision-making: confidence scores are preserved, not truncated to boolean
- Graceful degradation: low-confidence signals are suppressed, not rejected; they execute if higher-confidence sources unavailable
- Debuggability: CSL gate decision reveals exactly why a signal was treated as it was
- Cascade resilience: a rejected service doesn't break the pipeline; CSL routes around it
- Consistent scoring: CSL thresholds derived from φ; all 50+ microservices use identical criteria

**Negative:**
- Operational complexity: teams must understand 6 CSL levels, not simple pass/fail
- Monitoring and alerting must track CSL distribution; traditional boolean metrics insufficient
- Fallback paths are more complex; system must handle SUPPRESS→CAUTION→INCLUDE chains
- Performance tuning requires CSL threshold calibration; changing a threshold affects all gates

**Implementation details:**
- Signal confidence score computed as weighted average of factors: data age, source reliability, completeness, consistency
- Gate decision deterministic: given confidence score, CSL gate is always the same
- CSL decisions are auditable; every gate decision logged with signal ID, confidence score, and reasoning
- CSL metrics tracked: % of signals in each gate level, conversion rates (SUPPRESS→CAUTION execution), latency by gate level

## Related Decisions
- [ADR 001: Phi-Scaled Architecture](./001-phi-scaled-architecture.md)
- [ADR 002: Concurrent Equals](./002-concurrent-equals.md)
