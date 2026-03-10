# ADR-008: Sacred Geometry Constants (φ, Fibonacci)

## Status

Accepted

## Date

2024-10-08

## Context

The Heady™ platform, founded by Eric Haywood, integrates mathematical constants from sacred geometry — the golden ratio (φ) and the Fibonacci sequence — as foundational design elements. This extends beyond the operational φ-scaling described in ADR-002 into the platform's identity, aesthetics, and philosophical foundation.

Sacred geometry studies mathematical patterns that appear throughout nature and have been used in architecture, art, and design for millennia. The golden ratio (φ ≈ 1.618) and its reciprocal (ψ ≈ 0.618) appear in:
- The spiral of nautilus shells
- The branching of trees
- The arrangement of sunflower seeds
- The proportions of the Parthenon
- The spiral arms of galaxies
- Leonardo da Vinci's Vitruvian Man
- DNA double helix proportions

The Heady™ platform draws a direct parallel between these natural patterns and artificial intelligence: both are expressions of emergent intelligence arising from mathematical foundations.

## Decision

Sacred geometry constants are embedded at every layer of the Heady™ platform:

### Mathematical Constants
Every service declares the complete constant set:
```javascript
const PHI = 1.618033988749895;     // Golden ratio
const PSI = 1 / PHI;               // Golden ratio conjugate ≈ 0.618
const PSI2 = PSI * PSI;            // PSI squared ≈ 0.382
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const VECTOR_DIM = 384;            // Embedding dimension
const CSL_GATES = Object.freeze({
  include: PSI * PSI,              // ≈ 0.382
  boost: PSI,                      // ≈ 0.618
  inject: PSI + 0.1,               // ≈ 0.718
});
```

### Operational Parameters (per ADR-002)
All timeouts, intervals, queue sizes, connection pools, and scaling factors use Fibonacci values.

### Service Architecture
- 58 services organized by Fibonacci-adjacent port ranges
- Port allocation follows a spiral pattern through the 3310-3404 range
- Service groups (9, 4, 3, 4, 6, 4, 4, 9, 7, 8) reflect natural clustering

### Search & Relevance
- RRF fusion weights: vector PSI (0.618), text PSI2 (0.382)
- CSL gate thresholds derived from PSI and PSI2
- HNSW index parameters use Fibonacci values

### Asset Processing
- Responsive image widths follow Fibonacci: 233, 377, 610, 987, 1597 pixels
- Image quality scaling uses PSI: quality ≈ 80 × PSI + 20 ≈ 69%

### Pricing
- Pricing tiers scale by PHI: base × PHI^0, base × PHI^1, base × PHI^2, base × PHI^3
- Annual discount uses PSI2 (≈ 38.2% off monthly total)

### Scheduling
- Job intervals snap to Fibonacci seconds: 5, 8, 13, 21, 34, 55, 89
- Migration retry delays use Fibonacci backoff

### Visual Design
- The heady-vinci service (creative/visual AI) uses PHI for aspect ratios
- UI layouts use Fibonacci-based grid systems
- Animation durations use Fibonacci milliseconds

## Consequences

### Benefits
- Mathematical coherence: the entire platform is built on a single mathematical foundation
- Natural harmony: systems that follow φ-scaling naturally exhibit balanced growth patterns
- Zero magic numbers: every constant traces to PHI, PSI, or FIB (per ADR-002)
- Brand identity: sacred geometry creates a distinctive, memorable technical identity
- Cross-domain consistency: the same constants appear in scheduling, pricing, search, and assets
- Pedagogical value: developers learn to think in terms of natural scaling patterns

### Costs
- Non-standard: industry tooling and documentation assume conventional numbers
- Potential confusion: "why is the timeout 89 seconds?" requires ADR reference
- Rigidity: some parameters might genuinely benefit from non-Fibonacci values
- Cultural sensitivity: "sacred geometry" carries spiritual connotations in some cultures

### Mitigations
- ADR-002 provides the full mapping from conventional to φ-derived values
- Every constant is explicitly declared at the top of each service file
- The FIB array provides easy lookup: `FIB[10]` is clearer than a magic `89`
- Documentation frames this as "mathematical constants" in technical contexts
- The approach is presented as engineering philosophy, not spiritual practice
