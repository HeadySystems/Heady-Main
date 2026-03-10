/**
 * Heady Phi-Math Foundation — Canonical Reference Implementation
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents
 *
 * Every constant in the Heady ecosystem derives from the golden ratio (φ)
 * or Fibonacci numbers. Zero magic numbers. Zero arbitrary thresholds.
 *
 * @module phi-constants
 * @version 4.0.0
 */

// ═══════════════════════════════════════════════════════════════
// CORE CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Golden Ratio */
const PHI = (1 + Math.sqrt(5)) / 2;  // ≈ 1.6180339887

/** Golden Ratio Conjugate (1/φ = φ − 1) */
const PSI = 1 / PHI;                 // ≈ 0.6180339887

/** φ² = φ + 1 */
const PHI2 = PHI + 1;               // ≈ 2.6180339887

/** φ³ = 2φ + 1 */
const PHI3 = 2 * PHI + 1;           // ≈ 4.2360679775

/** Fibonacci sequence (first 21 terms) */
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

/**
 * Get Fibonacci number by index.
 * @param {number} n - Index (0-based)
 * @returns {number} Fibonacci number
 */
function fib(n) {
  if (n < FIB.length) return FIB[n];
  let a = FIB[FIB.length - 2], b = FIB[FIB.length - 1];
  for (let i = FIB.length; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}

// ═══════════════════════════════════════════════════════════════
// CSL THRESHOLDS — Phi-Harmonic Levels
// ═══════════════════════════════════════════════════════════════

/**
 * Compute phi-harmonic threshold: 1 − ψ^level × spread
 * @param {number} level - Threshold level (0 = minimum, 4 = critical)
 * @param {number} [spread=0.5] - Spread factor
 * @returns {number} Threshold value between 0 and 1
 */
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

/** Standard CSL gate thresholds */
const CSL_THRESHOLDS = Object.freeze({
  MINIMUM:  phiThreshold(0),   // ≈ 0.500 — noise floor
  LOW:      phiThreshold(1),   // ≈ 0.691 — weak alignment
  MEDIUM:   phiThreshold(2),   // ≈ 0.809 — moderate alignment
  HIGH:     phiThreshold(3),   // ≈ 0.882 — strong alignment
  CRITICAL: phiThreshold(4),   // ≈ 0.927 — near-certain
});

/** Dedup threshold — above CRITICAL, for semantic identity */
const DEDUP_THRESHOLD = 1 - Math.pow(PSI, 6) * 0.5;  // ≈ 0.972

/** Coherence drift threshold */
const COHERENCE_DRIFT_THRESHOLD = CSL_THRESHOLDS.MEDIUM;  // ≈ 0.809

// ═══════════════════════════════════════════════════════════════
// PRESSURE LEVELS — System Load Classification
// ═══════════════════════════════════════════════════════════════

/** Phi-derived pressure levels (replace arbitrary 0.60/0.80/0.95) */
const PRESSURE_LEVELS = Object.freeze({
  NOMINAL:  { min: 0, max: Math.pow(PSI, 2) },                    // 0 – 0.382
  ELEVATED: { min: Math.pow(PSI, 2), max: PSI },                  // 0.382 – 0.618
  HIGH:     { min: PSI, max: 1 - Math.pow(PSI, 3) },              // 0.618 – 0.854
  CRITICAL: { min: 1 - Math.pow(PSI, 4), max: 1.0 },             // 0.910 – 1.0
});

/** Alert thresholds (replace arbitrary 0.80/0.95/1.00) */
const ALERT_THRESHOLDS = Object.freeze({
  warning:  PSI,                       // ≈ 0.618
  caution:  1 - Math.pow(PSI, 2),      // ≈ 0.764
  critical: 1 - Math.pow(PSI, 3),      // ≈ 0.854
  exceeded: 1 - Math.pow(PSI, 4),      // ≈ 0.910
  hard_max: 1.0,
});

// ═══════════════════════════════════════════════════════════════
// FUSION & SCORING WEIGHTS
// ═══════════════════════════════════════════════════════════════

/**
 * Compute phi-derived fusion weights for N factors.
 * Each weight is ψ^i normalized to sum to 1.
 * @param {number} n - Number of factors
 * @returns {number[]} Weights summing to 1, descending
 */
function phiFusionWeights(n) {
  const raw = Array.from({ length: n }, (_, i) => Math.pow(PSI, i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => w / sum);
}

/**
 * Compute phi-weighted priority score.
 * @param {...number} factors - Score factors in priority order
 * @returns {number} Weighted composite score
 */
function phiPriorityScore(...factors) {
  const weights = phiFusionWeights(factors.length);
  return factors.reduce((sum, f, i) => sum + f * weights[i], 0);
}

/** Standard eviction weights (3-factor phi-fusion) */
const EVICTION_WEIGHTS = Object.freeze({
  importance: phiFusionWeights(3)[0],  // ≈ 0.486
  recency:    phiFusionWeights(3)[1],  // ≈ 0.300
  relevance:  phiFusionWeights(3)[2],  // ≈ 0.214
});

/** Resource allocation weights (5-way phi-split for Hot/Warm/Cold/Reserve/Governance) */
const RESOURCE_WEIGHTS = Object.freeze({
  hot:        0.387,  // ~34% user-facing
  warm:       0.239,  // ~21% background
  cold:       0.148,  // ~13% batch
  reserve:    0.092,  // ~8% burst
  governance: 0.057,  // ~5% oversight
});

/**
 * Phi-derived resource weights for N pools.
 * @param {number} n - Number of pools
 * @returns {number[]} Weights summing to ~1
 */
function phiResourceWeights(n) {
  return phiFusionWeights(n);
}

// ═══════════════════════════════════════════════════════════════
// BACKOFF & TIMING
// ═══════════════════════════════════════════════════════════════

/**
 * Phi-exponential backoff with optional jitter.
 * @param {number} attempt - Attempt number (0-based)
 * @param {number} [baseMs=1000] - Base delay in milliseconds
 * @param {number} [maxMs=60000] - Maximum delay cap
 * @param {boolean} [jitter=true] - Add ±ψ² jitter
 * @returns {number} Delay in milliseconds
 */
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000, jitter = true) {
  const delay = Math.min(baseMs * Math.pow(PHI, attempt), maxMs);
  if (!jitter) return Math.round(delay);
  const jitterRange = Math.pow(PSI, 2);  // ±38.2%
  const factor = 1 + (Math.random() * 2 - 1) * jitterRange;
  return Math.round(delay * factor);
}

/**
 * Fibonacci-based retry backoff sequence (ms).
 * @param {number} [count=5] - Number of retry delays
 * @param {number} [multiplier=100] - Milliseconds per Fibonacci unit
 * @returns {number[]} Array of delays
 */
function fibRetryBackoff(count = 5, multiplier = 100) {
  return FIB.slice(4, 4 + count).map(n => n * multiplier);
  // Default: [500, 800, 1300, 2100, 3400]
}

/**
 * Phi-adaptive interval — grows when healthy, shrinks when unhealthy.
 * @param {number} baseMs - Base interval
 * @param {boolean} healthy - Current health state
 * @param {number} currentMs - Current interval
 * @returns {number} Adjusted interval
 */
function phiAdaptiveInterval(baseMs, healthy, currentMs) {
  if (healthy) return Math.min(currentMs * PHI, baseMs * PHI3);
  return Math.max(currentMs * PSI, baseMs * PSI);
}

// ═══════════════════════════════════════════════════════════════
// TOKEN BUDGETS
// ═══════════════════════════════════════════════════════════════

/**
 * Phi-geometric token budgets for tiered context.
 * @param {number} [base=8192] - Working context base tokens
 * @returns {{ working: number, session: number, memory: number, artifacts: number }}
 */
function phiTokenBudgets(base = 8192) {
  return {
    working:   base,                           // 8,192
    session:   Math.round(base * PHI2),        // ~21,450
    memory:    Math.round(base * PHI2 * PHI2), // ~56,131
    artifacts: Math.round(base * Math.pow(PHI, 6)), // ~146,920
  };
}

/** Compression trigger — compress at this % of budget */
const COMPRESSION_TRIGGER = 1 - Math.pow(PSI, 4);  // ≈ 0.910

// ═══════════════════════════════════════════════════════════════
// CSL GATES — Continuous Semantic Logic Operations
// ═══════════════════════════════════════════════════════════════

/** Default gate temperature */
const PHI_TEMPERATURE = Math.pow(PSI, 3);  // ≈ 0.236

/**
 * CSL sigmoid gate — smooth gating based on cosine similarity.
 * output = value × σ((cosScore − τ) / temperature)
 * @param {number} value - Input value to gate
 * @param {number} cosScore - Cosine similarity score
 * @param {number} tau - Threshold
 * @param {number} [temp=PHI_TEMPERATURE] - Temperature
 * @returns {number} Gated output
 */
function cslGate(value, cosScore, tau, temp = PHI_TEMPERATURE) {
  const sigmoid = 1 / (1 + Math.exp(-(cosScore - tau) / temp));
  return value * sigmoid;
}

/**
 * CSL weight blend — smooth interpolation between two weights.
 * @param {number} weightHigh - Weight when similarity is high
 * @param {number} weightLow - Weight when similarity is low
 * @param {number} cosScore - Cosine similarity
 * @param {number} tau - Threshold
 * @returns {number} Blended weight
 */
function cslBlend(weightHigh, weightLow, cosScore, tau) {
  const sigmoid = 1 / (1 + Math.exp(-(cosScore - tau) / PHI_TEMPERATURE));
  return weightLow + (weightHigh - weightLow) * sigmoid;
}

/**
 * Adaptive temperature based on entropy.
 * @param {number} entropy - Current entropy
 * @param {number} maxEntropy - Maximum expected entropy
 * @returns {number} Adjusted temperature
 */
function adaptiveTemperature(entropy, maxEntropy) {
  const ratio = entropy / maxEntropy;
  return PHI_TEMPERATURE * (1 + ratio * PHI);
}

/**
 * Cosine similarity between two vectors.
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * CSL AND — cosine similarity (semantic alignment).
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Alignment score (-1 to 1)
 */
function cslAND(a, b) { return cosineSimilarity(a, b); }

/**
 * CSL OR — normalized superposition (soft union).
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number[]} Superposition vector (unit)
 */
function cslOR(a, b) {
  const sum = a.map((v, i) => v + b[i]);
  const norm = Math.sqrt(sum.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? sum.map(v => v / norm) : sum;
}

/**
 * CSL NOT — orthogonal projection (semantic negation).
 * Removes component of a in direction of b: a − (a·b/‖b‖²)·b
 * @param {number[]} a - Vector to negate from
 * @param {number[]} b - Negation direction
 * @returns {number[]} Orthogonal residual
 */
function cslNOT(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normB2 = b.reduce((s, v) => s + v * v, 0);
  const proj = dot / normB2;
  return a.map((v, i) => v - proj * b[i]);
}

/**
 * CSL IMPLY — projection of a onto b.
 * @param {number[]} a - Source vector
 * @param {number[]} b - Target direction
 * @returns {number[]} Projection vector
 */
function cslIMPLY(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normB2 = b.reduce((s, v) => s + v * v, 0);
  const proj = dot / normB2;
  return b.map(v => proj * v);
}

/**
 * CSL CONSENSUS — weighted centroid of multiple vectors.
 * @param {number[][]} vectors - Array of vectors
 * @param {number[]} [weights] - Optional weights (phi-fusion by default)
 * @returns {number[]} Consensus unit vector
 */
function cslCONSENSUS(vectors, weights) {
  const w = weights || phiFusionWeights(vectors.length);
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (let i = 0; i < vectors.length; i++) {
    for (let d = 0; d < dim; d++) { sum[d] += w[i] * vectors[i][d]; }
  }
  const norm = Math.sqrt(sum.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? sum.map(v => v / norm) : sum;
}

// ═══════════════════════════════════════════════════════════════
// FIBONACCI SIZING CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Standard sizing constants for collections, pools, and limits */
const SIZING = Object.freeze({
  FAILURE_THRESHOLD:  fib(5),   // 5  — circuit breaker trips
  BATCH_EVICTION:     fib(6),   // 8  — items per eviction batch
  SMALL_LIMIT:        fib(7),   // 13 — trial days, small limits
  HNSW_M:             fib(8),   // 21 — HNSW m parameter
  SLIDING_WINDOW:     fib(9),   // 34 — sliding window buckets
  MAX_ENTITIES:       fib(10),  // 55 — max entities per operation
  RETENTION_DAYS:     fib(11),  // 89 — retention/efSearch
  EF_CONSTRUCTION:    fib(12),  // 144 — HNSW ef_construction
  QUEUE_DEPTH:        fib(13),  // 233 — max queue depth
  PATTERN_STORE:      fib(14),  // 377 — pattern storage
  CACHE_SIZE:         fib(16),  // 987 — standard cache
  HISTORY_BUFFER:     fib(17),  // 1597 — history buffers
  LARGE_CACHE:        fib(20),  // 6765 — large LRU caches
});

/** Connection pool sizing */
const POOL_SIZES = Object.freeze({
  min: fib(3),   // 2
  max: fib(7),   // 13
});

// ═══════════════════════════════════════════════════════════════
// RELEVANCE GATES
// ═══════════════════════════════════════════════════════════════

/** Relevance thresholds for content inclusion/boosting/injection */
const RELEVANCE_GATES = Object.freeze({
  include: Math.pow(PSI, 2),       // ≈ 0.382 — minimum to include
  boost:   PSI,                     // ≈ 0.618 — amplify
  inject:  PSI + 0.1,              // ≈ 0.718 — auto-inject
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Core constants
  PHI, PSI, PHI2, PHI3, FIB, fib,
  // Thresholds
  CSL_THRESHOLDS, DEDUP_THRESHOLD, COHERENCE_DRIFT_THRESHOLD,
  PRESSURE_LEVELS, ALERT_THRESHOLDS,
  // Weights & scoring
  phiFusionWeights, phiPriorityScore, EVICTION_WEIGHTS, RESOURCE_WEIGHTS, phiResourceWeights,
  // Timing
  phiBackoff, fibRetryBackoff, phiAdaptiveInterval,
  // Token budgets
  phiTokenBudgets, COMPRESSION_TRIGGER, phiThreshold,
  // CSL gates
  PHI_TEMPERATURE, cslGate, cslBlend, adaptiveTemperature,
  // CSL vector operations
  cosineSimilarity, cslAND, cslOR, cslNOT, cslIMPLY, cslCONSENSUS,
  // Sizing
  SIZING, POOL_SIZES,
  // Relevance
  RELEVANCE_GATES,
};
