/**
 * @fileoverview Phi-Math Library - Golden Ratio Mathematics for Heady™ Platform
 * All system parameters derived from φ = (1 + √5) / 2 ≈ 1.618033988749895
 */

export const PHI = (1 + Math.sqrt(5)) / 2;  // Golden ratio
export const PSI = PHI - 1;                   // Reciprocal: 1/φ ≈ 0.618
export const PHI_SQ = PHI * PHI;              // φ² ≈ 2.618

/**
 * Fibonacci sequence generator
 * @param {number} n - Generate F(0) through F(n)
 * @returns {number[]} Fibonacci sequence
 */
export function fibSequence(n) {
  if (n < 0) return [];
  if (n === 0) return [0];
  const seq = [0, 1];
  for (let i = 2; i <= n; i++) {
    seq.push(seq[i-1] + seq[i-2]);
  }
  return seq;
}

/**
 * Single Fibonacci number
 * @param {number} n - Index
 * @returns {number} F(n)
 */
export function fib(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/**
 * CSL threshold levels derived from phi-harmonic series
 * Formula: threshold(n) = 1 - ψⁿ × 0.5
 */
export const CSL_THRESHOLDS = {
  HIGH:   1 - Math.pow(PSI, 3) * 0.5,  // ≈ 0.882
  MEDIUM: 1 - Math.pow(PSI, 2) * 0.5,  // ≈ 0.809
  LOW:    1 - Math.pow(PSI, 1) * 0.5,  // ≈ 0.691
};

/**
 * CSL gate decision
 * @param {number} score - Cosine similarity score
 * @param {number} threshold - Minimum threshold
 * @returns {boolean} Whether to route
 */
export function cslGate(score, threshold) {
  return score >= threshold;
}

/**
 * Phi-weighted resource allocation
 * @param {number} count - Number of entities
 * @returns {number[]} Normalized weights (sum = 1)
 */
export function phiResourceWeights(count) {
  const fib_seq = fibSequence(count + 1).slice(2); // F(2)...F(count+1)
  const total = fib_seq.reduce((a, b) => a + b, 0);
  return fib_seq.map(f => f / total).reverse(); // Highest weight first
}

/**
 * Exponential backoff with phi jitter
 * @param {number} attempt - Retry attempt number
 * @param {number} baseMs - Base delay
 * @returns {number} Delay in milliseconds
 */
export function phiBackoff(attempt, baseMs = 100) {
  const exp = Math.min(attempt, 10);
  const base = baseMs * Math.pow(2, exp);
  const jitter = Math.random() * base * Math.pow(PSI, 2); // ψ² ≈ 0.382
  return Math.min(base + jitter, 30000);
}

/**
 * Adaptive interval scaling
 * @param {number} current - Current interval
 * @param {boolean} healthy - Whether entity is healthy
 * @returns {number} New interval
 */
export function phiAdaptiveInterval(current, healthy) {
  const factor = healthy ? PHI : PSI;
  const next = current * factor;
  return Math.max(1000, Math.min(next, 60000)); // [1s, 60s]
}

/**
 * Deduplication threshold
 */
export const DEDUP_THRESHOLD = 1 - Math.pow(PSI, 4) * 0.5; // ≈ 0.927

/**
 * Pressure level classification
 */
export const PRESSURE_LEVELS = {
  NORMAL:   { max: 0.382, factor: 1.0 },     // < ψ²
  ELEVATED: { max: 0.618, factor: PHI },     // < ψ
  HIGH:     { max: 0.809, factor: PHI_SQ },  // < CSL_MED
  CRITICAL: { max: 1.0,   factor: PHI_SQ * PHI }
};

export function classifyPressure(ratio) {
  for (const [level, spec] of Object.entries(PRESSURE_LEVELS)) {
    if (ratio <= spec.max) return { level, factor: spec.factor };
  }
  return { level: 'CRITICAL', factor: PRESSURE_LEVELS.CRITICAL.factor };
}

/**
 * Cosine similarity blend with phi weighting
 */
export function cslBlend(scores, weights = null) {
  if (!weights) weights = phiResourceWeights(scores.length);
  return scores.reduce((sum, score, i) => sum + score * weights[i], 0);
}

/**
 * Phi-fusion weights for multi-source consensus
 */
export function phiFusionWeights(sourceCount) {
  return phiResourceWeights(sourceCount);
}
