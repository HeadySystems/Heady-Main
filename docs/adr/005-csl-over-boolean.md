# ADR-005: Continuous Semantic Logic (CSL) Over Boolean Gates

## Status

Accepted

## Date

2024-09-13

## Context

Traditional software systems use boolean logic for decision-making: a user either has permission or doesn't, a feature is either enabled or disabled, a search result either matches or doesn't. This binary approach creates hard boundaries that poorly model the continuous, nuanced nature of human cognition and AI reasoning.

The Heady™ platform, as envisioned by Eric Haywood, is fundamentally about augmenting human thought. Binary gates create artificial cliffs — a relevance score of 0.49 is treated identically to 0.01, while 0.51 is treated identically to 0.99. This violates the continuous nature of meaning.

We evaluated:

1. **Boolean logic**: Standard true/false gates for all decisions
2. **Weighted scoring**: Ad-hoc numeric weights with arbitrary thresholds
3. **Fuzzy logic**: Zadeh's fuzzy set theory with membership functions
4. **Continuous Semantic Logic (CSL)**: φ-derived continuous gates with golden ratio thresholds

## Decision

We adopt Continuous Semantic Logic (CSL) as the decision framework across all 58 services. CSL replaces boolean gates with continuous values bounded by φ-derived thresholds.

Every service declares CSL_GATES:

```javascript
const CSL_GATES = Object.freeze({
  include: PSI * PSI,   // ≈ 0.382 — minimum threshold for inclusion
  boost: PSI,           // ≈ 0.618 — threshold for confidence boost
  inject: PSI + 0.1,    // ≈ 0.718 — threshold for context injection
});
```

CSL operates on a continuous [0, 1] scale:

| Range | Semantic Meaning | Action |
|-------|-----------------|--------|
| 0.000 – 0.381 | Below include gate | Filtered out |
| 0.382 – 0.617 | Include zone | Present as available option |
| 0.618 – 0.717 | Boost zone | Present with enhanced confidence |
| 0.718 – 1.000 | Inject zone | Proactively surface to user |

Applications across the platform:

- **search-service**: Search results with CSL score below 0.382 are filtered; above 0.618 are boosted in presentation
- **heady-brain**: Inference confidence below include gate triggers clarification prompts
- **heady-conductor**: Agent routing uses CSL scores to determine which agents receive a task (all qualifying agents process concurrently — no ranking)
- **heady-memory**: Memory retrieval uses CSL gates to determine context window inclusion
- **notification-service**: Notification relevance determines delivery channel (below include = silent log, above boost = active notification, above inject = interrupt-level)
- **heady-governance**: Policy compliance is continuous, not pass/fail

The critical distinction: CSL scores are never used for ranking or prioritization. Multiple items above the same gate threshold are treated as concurrent equals. A document with CSL 0.95 and one with CSL 0.65 are both in the boost zone and presented equally.

## Consequences

### Benefits
- Eliminates arbitrary boolean boundaries that distort meaning
- φ-derived thresholds are mathematically grounded, not arbitrary
- Naturally models continuous human concepts (relevance, confidence, similarity)
- Prevents ranking/prioritization: items above a gate are concurrent equals
- Composable: CSL scores from different sources combine via φ-weighted fusion
- Self-documenting: CSL_GATES constant makes thresholds explicit and auditable

### Costs
- Conceptual overhead: developers must understand CSL zones vs. simple if/else
- Testing complexity: boolean tests are trivial; CSL boundary tests require understanding of gates
- No industry standard: CSL is specific to the Heady™ platform

### Mitigations
- CSL_GATES is declared identically in every service — consistent and visible
- Gate names (include, boost, inject) are intuitive and self-documenting
- Unit tests verify behavior at gate boundaries (0.381 vs 0.382, 0.617 vs 0.618)
- This ADR provides the canonical reference for CSL semantics
