/**
 * Heady Phi-Math Foundation — Canonical Reference Implementation
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents
 *
 * Every constant in the Heady ecosystem derives from the golden ratio (φ)
 * or Fibonacci numbers. Zero magic numbers. Zero arbitrary thresholds.
 *
 * @module phi-constants
 * @version 4.1.0
 */

// ═══════════════════════════════════════════════════════════════
// CORE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PHI = (1 + Math.sqrt(5)) / 2;
const PSI = 1 / PHI;
const PHI2 = PHI + 1;
const PHI3 = 2 * PHI + 1;
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

function fib(n) {
  if (n < FIB.length) return FIB[n];
  let a = FIB[FIB.length - 2], b = FIB[FIB.length - 1];
  for (let i = FIB.length; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}

// ═══════════════════════════════════════════════════════════════
// CSL THRESHOLDS
// ═══════════════════════════════════════════════════════════════

function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM: phiThreshold(0),
  LOW: phiThreshold(1),
  MEDIUM: phiThreshold(2),
  HIGH: phiThreshold(3),
  CRITICAL: phiThreshold(4),
});

const DEDUP_THRESHOLD = 1 - Math.pow(PSI, 6) * 0.5;
const COHERENCE_DRIFT_THRESHOLD = CSL_THRESHOLDS.MEDIUM;

// ═══════════════════════════════════════════════════════════════
// PRESSURE & ALERTS
// ═══════════════════════════════════════════════════════════════

const PRESSURE_LEVELS = Object.freeze({
  NOMINAL: { min: 0, max: Math.pow(PSI, 2) },
  ELEVATED: { min: Math.pow(PSI, 2), max: PSI },
  HIGH: { min: PSI, max: 1 - Math.pow(PSI, 3) },
  CRITICAL: { min: 1 - Math.pow(PSI, 4), max: 1.0 },
});

const ALERT_THRESHOLDS = Object.freeze({
  warning: PSI,
  caution: 1 - Math.pow(PSI, 2),
  critical: 1 - Math.pow(PSI, 3),
  exceeded: 1 - Math.pow(PSI, 4),
  hard_max: 1.0,
});

// ═══════════════════════════════════════════════════════════════
// FUSION & SCORING
// ═══════════════════════════════════════════════════════════════

function phiFusionWeights(n) {
  const raw = Array.from({ length: n }, (_, i) => Math.pow(PSI, i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => w / sum);
}

function phiPriorityScore(...factors) {
  const weights = phiFusionWeights(factors.length);
  return factors.reduce((sum, f, i) => sum + f * weights[i], 0);
}

const EVICTION_WEIGHTS = Object.freeze({
  importance: phiFusionWeights(3)[0],
  recency: phiFusionWeights(3)[1],
  relevance: phiFusionWeights(3)[2],
});

const RESOURCE_WEIGHTS = Object.freeze({
  hot: 0.387,
  warm: 0.239,
  cold: 0.148,
  reserve: 0.092,
  governance: 0.057,
});

function phiResourceWeights(n) { return phiFusionWeights(n); }

// ═══════════════════════════════════════════════════════════════
// BACKOFF & TIMING
// ═══════════════════════════════════════════════════════════════

function phiBackoff(attempt, baseMs = 1000, maxMs = 60000, jitter = true) {
  const delay = Math.min(baseMs * Math.pow(PHI, attempt), maxMs);
  if (!jitter) return Math.round(delay);
  const jitterRange = Math.pow(PSI, 2);
  const factor = 1 + (Math.random() * 2 - 1) * jitterRange;
  return Math.round(delay * factor);
}

function fibRetryBackoff(count = 5, multiplier = 100) {
  return FIB.slice(4, 4 + count).map(n => n * multiplier);
}

function phiAdaptiveInterval(baseMs, healthy, currentMs) {
  if (healthy) return Math.min(currentMs * PHI, baseMs * PHI3);
  return Math.max(currentMs * PSI, baseMs * PSI);
}

// ═══════════════════════════════════════════════════════════════
// TOKEN BUDGETS
// ═══════════════════════════════════════════════════════════════

function phiTokenBudgets(base = 8192) {
  return {
    working: base,
    session: Math.round(base * PHI2),
    memory: Math.round(base * PHI2 * PHI2),
    artifacts: Math.round(base * Math.pow(PHI, 6)),
  };
}

const COMPRESSION_TRIGGER = 1 - Math.pow(PSI, 4);

// ═══════════════════════════════════════════════════════════════
// CSL GATES
// ═══════════════════════════════════════════════════════════════

const PHI_TEMPERATURE = Math.pow(PSI, 3);

function cslGate(value, cosScore, tau, temp = PHI_TEMPERATURE) {
  const sigmoid = 1 / (1 + Math.exp(-(cosScore - tau) / temp));
  return value * sigmoid;
}

function cslBlend(weightHigh, weightLow, cosScore, tau) {
  const sigmoid = 1 / (1 + Math.exp(-(cosScore - tau) / PHI_TEMPERATURE));
  return weightLow + (weightHigh - weightLow) * sigmoid;
}

function adaptiveTemperature(entropy, maxEntropy) {
  const ratio = entropy / maxEntropy;
  return PHI_TEMPERATURE * (1 + ratio * PHI);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function cslAND(a, b) { return cosineSimilarity(a, b); }

function cslOR(a, b) {
  const sum = a.map((v, i) => v + b[i]);
  const norm = Math.sqrt(sum.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? sum.map(v => v / norm) : sum;
}

function cslNOT(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normB2 = b.reduce((s, v) => s + v * v, 0);
  const proj = normB2 > 0 ? dot / normB2 : 0;
  return a.map((v, i) => v - proj * b[i]);
}

function cslIMPLY(a, b) {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const normB2 = b.reduce((s, v) => s + v * v, 0);
  const proj = normB2 > 0 ? dot / normB2 : 0;
  return b.map(v => proj * v);
}

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

function cslXOR(a, b) {
  const orVec = cslOR(a, b);
  const andScore = cslAND(a, b);
  const andProj = cslIMPLY(orVec, a).map((v, i) => v * andScore);
  return cslNOT(orVec, andProj);
}

// ═══════════════════════════════════════════════════════════════
// SIZING
// ═══════════════════════════════════════════════════════════════

const SIZING = Object.freeze({
  FAILURE_THRESHOLD: fib(5),
  BATCH_EVICTION: fib(6),
  MAX_CONCURRENT: fib(6),
  SMALL_LIMIT: fib(7),
  HNSW_M: fib(8),
  RERANK_TOP_K: fib(8),
  SLIDING_WINDOW: fib(9),
  MAX_ENTITIES: fib(10),
  RETENTION_DAYS: fib(11),
  EF_SEARCH: fib(11),
  EF_CONSTRUCTION: fib(12),
  QUEUE_DEPTH: fib(13),
  PATTERN_STORE: fib(14),
  CACHE_SIZE: fib(16),
  HISTORY_BUFFER: fib(17),
  LARGE_CACHE: fib(20),
});

const POOL_SIZES = Object.freeze({ min: fib(3), max: fib(7) });

const RELEVANCE_GATES = Object.freeze({
  include: Math.pow(PSI, 2),
  boost: PSI,
  inject: PSI + 0.1,
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  PHI, PSI, PHI2, PHI3, FIB, fib,
  CSL_THRESHOLDS, DEDUP_THRESHOLD, COHERENCE_DRIFT_THRESHOLD,
  PRESSURE_LEVELS, ALERT_THRESHOLDS,
  phiFusionWeights, phiPriorityScore, EVICTION_WEIGHTS, RESOURCE_WEIGHTS, phiResourceWeights,
  phiBackoff, fibRetryBackoff, phiAdaptiveInterval, phiThreshold,
  phiTokenBudgets, COMPRESSION_TRIGGER,
  PHI_TEMPERATURE, cslGate, cslBlend, adaptiveTemperature,
  cosineSimilarity, cslAND, cslOR, cslNOT, cslIMPLY, cslCONSENSUS, cslXOR,
  SIZING, POOL_SIZES, RELEVANCE_GATES,
};
