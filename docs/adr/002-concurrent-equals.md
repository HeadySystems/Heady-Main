# ADR 002: Concurrent Equals (No Priorities or Rankings)

**Status:** Accepted

## Context

Traditional task scheduling and queue systems use priority queues to handle competing requests. High-priority tasks starve low-priority tasks, creating unpredictable latency SLAs and fairness issues. This is especially problematic for Heady's AI inference workloads where task priority is often unknowable until execution begins.

Heady processes tasks across:
- Semantic inference (embedding generation)
- Vector similarity search
- Content orchestration across 9 domains
- User request handling
- Background operations (indexing, cache refresh)

A priority-based system would require:
1. Upfront priority assignment (often wrong)
2. Priority inversion mitigation (complex)
3. SLA guarantees that break under load (priority queue doesn't guarantee fairness)

## Decision

All tasks execute concurrently without priorities or rankings. Instead of classical priority queues, tasks are gated through Confidence Signal Logic (CSL) layers that provide graduated response based on signal quality, not artificial priority.

Task execution model:
- **Immediate execution:** All tasks enter the execution pool simultaneously
- **CSL gating:** Tasks are categorized by confidence signal (SUPPRESS, CAUTION, INCLUDE, BOOST, INJECT, HIGH, CRITICAL)
- **Concurrent processing:** Tasks run in parallel; resource contention is resolved through capacity planning, not priority
- **No starvation:** Every task reaches execution unless explicitly suppressed by CSL gate decision
- **φ-weighted scoring:** Task ordering within execution window uses φ-derived weights (not priorities)

CSL Gate Decisions:
- **SUPPRESS** (confidence ≤ 0.5): Task queued with φ² delay, allowing higher-confidence tasks priority without blocking
- **CAUTION** (0.5 < confidence ≤ 0.691): Task queued with φ delay, monitored for retry
- **INCLUDE** (0.691 < confidence ≤ 0.809): Normal execution, no delays
- **BOOST** (0.809 < confidence ≤ 0.882): Executed within 89ms (FIB[10])
- **INJECT** (0.882 < confidence ≤ 0.927): Injected into fast path, 55ms (FIB[9])
- **HIGH** (0.927 < confidence ≤ 0.972): Critical fast path, 34ms (FIB[8])
- **CRITICAL** (confidence > 0.972): Immediate execution, sub-13ms (FIB[7])

Example: A user request and a background reindex operation both enter concurrently. CSL assigns:
- User request: HIGH confidence (0.95) → executes in fast path (~34ms)
- Background reindex: CAUTION confidence (0.60) → queued with φ delay (~1618ms)

Both execute; neither starves the other. The difference is response time, not whether execution occurs.

## Consequences

**Positive:**
- No starvation: every task eventually executes unless explicitly suppressed by CSL gate
- Predictable SLA behavior: response latency is correlated with confidence signal, not system load
- Fair under load: low-confidence tasks are delayed, not dropped (CSL SUPPRESS gate decision is explicit)
- No priority inversion: a high-confidence task cannot block a low-confidence task indefinitely
- Debugging is simpler: "why didn't my task run?" is answered by CSL confidence score, not priority queue state

**Negative:**
- Lower-confidence tasks experience higher latency (φ delays: 618ms, 1618ms)
- Requires confidence signal generation for all task types; weak signals may delay legitimate work
- Operators must understand CSL gate decision criteria to tune system behavior
- Cascade behavior differs from traditional priority queues: load increases latency for low-confidence tasks, not simply drops them

**Operational implications:**
- Monitoring must track CSL gate distribution (% SUPPRESS vs CRITICAL) not priority distribution
- Load testing must verify that low-confidence tasks eventually execute, not accumulate indefinitely
- SLA definition changes: "p95 latency" becomes "p95 latency for HIGH-confidence tasks" to reflect CSL gating

## Related Decisions
- [ADR 001: Phi-Scaled Architecture](./001-phi-scaled-architecture.md)
- [ADR 003: CSL Over Boolean](./003-csl-over-boolean.md)
