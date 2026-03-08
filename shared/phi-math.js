'use strict';
/**
 * phi-math.js — Heady Sovereign AI Platform
 * Canonical phi-math foundation module.
 * Every other module imports from this.
 *
 * φ  = (1 + √5) / 2 ≈ 1.6180339887498948
 * ψ  = 1 / φ         ≈ 0.6180339887498948
 * φ² = φ + 1         ≈ 2.6180339887498948
 * φ³ = 2φ + 1        ≈ 4.23606797749979
 *
 * Key identities:
 *   φ² = φ + 1
 *   1/φ = φ - 1
 *   φⁿ = F(n)·φ + F(n-1)
 *   lim F(n+1)/F(n) = φ
 *   ψ  = φ - 1  ≈ 0.618  (also 1/φ)
 *   ψ² ≈ 0.382  (1 - ψ² = ψ due to golden identity)
 *   ψ³ ≈ 0.236  (1 - ψ³ ≈ 0.764)
 *   ψ⁴ ≈ 0.146  (1 - ψ⁴ ≈ 0.854)
 *   ψ⁵ ≈ 0.090  (1 - ψ⁵ ≈ 0.910)
 */

// ─── Core Constants ────────────────────────────────────────────────────────────

const PHI      = 1.6180339887498948;   // Golden ratio φ
const PSI      = 0.6180339887498948;   // Conjugate ψ = 1/φ
const PHI_SQ   = 2.6180339887498948;   // φ²
const PHI_CUBE = 4.23606797749979;     // φ³

const FIBONACCI = [
  1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
  89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765
];

// ─── CSL Thresholds ────────────────────────────────────────────────────────────

const CSL_THRESHOLDS = Object.freeze({
  MINIMUM:  0.500,   // phiThreshold(0) — noise floor
  LOW:      0.691,   // phiThreshold(1) — weak alignment
  MEDIUM:   0.809,   // phiThreshold(2) — moderate alignment
  HIGH:     0.882,   // phiThreshold(3) — strong alignment
  CRITICAL: 0.927,   // phiThreshold(4) — near-certain
  IDENTITY: 0.972    // above CRITICAL, semantic identity / dedup
});

// ─── Pressure Levels ───────────────────────────────────────────────────────────

const PRESSURE_LEVELS = Object.freeze({
  NOMINAL:  'NOMINAL',
  ELEVATED: 'ELEVATED',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL'
});

// ─── Alert Thresholds (φ-harmonic series) ─────────────────────────────────────
// warning:  ψ       ≈ 0.618
// caution:  1 - ψ³  ≈ 0.764
// critical: 1 - ψ⁴  ≈ 0.854
// exceeded: 1 - ψ⁵  ≈ 0.910
// hard_max: 1.0

const ALERT_THRESHOLDS = Object.freeze({
  warning:  PSI,                                    // ≈ 0.618
  caution:  1 - Math.pow(PSI, 3),                  // ≈ 0.764
  critical: 1 - Math.pow(PSI, 4),                  // ≈ 0.854
  exceeded: 1 - Math.pow(PSI, 5),                  // ≈ 0.910
  hard_max: 1.0
});

// ─── Fibonacci Memoization Cache ───────────────────────────────────────────────

const _fibCache = new Map(FIBONACCI.map((v, i) => [i + 1, v]));

/**
 * fib(n) — returns the nth Fibonacci number (1-indexed, memoized).
 * @param {number} n  — positive integer index
 * @returns {number}
 */
function fib(n) {
  if (n <= 0) throw new RangeError(`fib: n must be >= 1, got ${n}`);
  if (_fibCache.has(n)) return _fibCache.get(n);
  // Build iteratively from the highest cached value to avoid stack overflow
  let maxCached = Math.max(..._fibCache.keys());
  let a = _fibCache.get(maxCached - 1);
  let b = _fibCache.get(maxCached);
  for (let i = maxCached + 1; i <= n; i++) {
    const c = a + b;
    _fibCache.set(i, c);
    a = b;
    b = c;
  }
  return _fibCache.get(n);
}

/**
 * phiPower(n) — returns φ^n.
 * @param {number} n
 * @returns {number}
 */
function phiPower(n) {
  return Math.pow(PHI, n);
}

/**
 * phiBackoff(attempt, baseMs, maxMs) — phi-exponential backoff with ±ψ² jitter.
 * Formula: base × φ^attempt, capped at maxMs, jitter ±ψ²
 *
 * attempt 0 → 1000ms (base)
 * attempt 1 → 1618ms
 * attempt 2 → 2618ms
 * attempt 3 → 4236ms
 *
 * @param {number} attempt   — 0-based retry attempt count
 * @param {number} baseMs    — base delay in milliseconds (default 1000)
 * @param {number} maxMs     — maximum delay cap (default 60000)
 * @returns {number} milliseconds to wait
 */
function phiBackoff(attempt, baseMs = 1000, maxMs = 60000) {
  const PSI_SQ = PSI * PSI;                      // ≈ 0.38197
  const raw    = baseMs * Math.pow(PHI, attempt);
  const capped = Math.min(raw, maxMs);
  // jitter: uniformly random in range ±ψ² of the capped value
  const jitter = (Math.random() * 2 - 1) * PSI_SQ * capped;
  return Math.max(0, Math.round(capped + jitter));
}

/**
 * phiThreshold(level, spread) — smooth phi-harmonic threshold.
 * Returns 1 - ψ^level × spread
 *
 * level 0 → 0.500  (MINIMUM)
 * level 1 → 0.691  (LOW)
 * level 2 → 0.809  (MEDIUM)
 * level 3 → 0.882  (HIGH)
 * level 4 → 0.927  (CRITICAL)
 *
 * @param {number} level   — 0-4
 * @param {number} spread  — scaling factor (default 0.5)
 * @returns {number}
 */
function phiThreshold(level, spread = 0.5) {
  return 1 - Math.pow(PSI, level) * spread;
}

/**
 * phiFusionWeights(n) — array of n weights summing to 1 using ψ-geometric series.
 * weight[i] = ψ^i / Σψ^j
 *
 * n=2 → [0.618, 0.382]
 * n=3 → [0.500, 0.309, 0.191]
 *
 * @param {number} n — number of weights
 * @returns {number[]}
 */
function phiFusionWeights(n) {
  if (n <= 0) return [];
  if (n === 1) return [1.0];
  const raw = Array.from({ length: n }, (_, i) => Math.pow(PSI, i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => w / sum);
}

/**
 * phiResourceWeights(n) — array of n resource allocation %s using ψ-geometric series.
 * For n=5: [0.387, 0.239, 0.148, 0.092, 0.057]
 * Maps to: Hot:34%, Warm:21%, Cold:13%, Reserve:8%, Gov:5%
 *
 * Uses ψ^(i+1) series starting from i=1 to match Fibonacci percentages.
 *
 * @param {number} n — number of resource tiers
 * @returns {number[]}
 */
function phiResourceWeights(n) {
  if (n <= 0) return [];
  if (n === 1) return [1.0];
  // Start at ψ^1 so that n=5 yields [0.618,0.382,...] normalized to Fibonacci ratios
  const raw = Array.from({ length: n }, (_, i) => Math.pow(PSI, i + 1));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => parseFloat((w / sum).toFixed(3)));
}

/**
 * phiTokenBudgets(base) — phi-geometric token budget progression.
 *
 * base=8192:
 *   working:   8192         (base)
 *   session:   ~21447       (base × φ²)
 *   memory:    ~56149       (base × φ⁴)
 *   artifacts: ~146999      (base × φ⁶)
 *
 * @param {number} base — base token count (default 8192)
 * @returns {{working: number, session: number, memory: number, artifacts: number}}
 */
function phiTokenBudgets(base = 8192) {
  return {
    working:   Math.round(base),
    session:   Math.round(base * Math.pow(PHI, 2)),
    memory:    Math.round(base * Math.pow(PHI, 4)),
    artifacts: Math.round(base * Math.pow(PHI, 6))
  };
}

/**
 * phiTimeout(level) — returns φ^level × 1000 ms timeout.
 *
 * level 2 → 2618ms
 * level 3 → 4236ms
 * level 4 → 6854ms
 * level 5 → 11090ms
 * level 6 → 17944ms
 * level 7 → 29034ms
 * level 8 → 46979ms
 *
 * @param {number} level — exponent level (2-8 typical)
 * @returns {number} timeout in milliseconds
 */
function phiTimeout(level) {
  return Math.round(Math.pow(PHI, level) * 1000);
}

/**
 * cslGate(value, cosScore, tau, temp) — smooth sigmoid CSL gating.
 * output = value × sigmoid((cosScore - τ) / temperature)
 *
 * @param {number} value     — raw output value to gate
 * @param {number} cosScore  — cosine similarity score [0,1]
 * @param {number} tau       — gate threshold (default 0.618 = ψ)
 * @param {number} temp      — temperature for softness (default 0.1)
 * @returns {number}
 */
function cslGate(value, cosScore, tau = 0.618, temp = 0.1) {
  const z = (cosScore - tau) / temp;
  const sigmoid = 1 / (1 + Math.exp(-z));
  return value * sigmoid;
}

/**
 * pressureLevel(utilization) — maps resource utilization [0,1] to a named pressure level.
 *
 * 0        → ψ²    ≈ 0.382  → NOMINAL
 * ψ²       → ψ     ≈ 0.618  → ELEVATED
 * ψ        → 1-ψ³  ≈ 0.854  → HIGH
 * > 1-ψ⁴  ≈ 0.910            → CRITICAL
 *
 * @param {number} utilization — value between 0.0 and 1.0
 * @returns {string} one of PRESSURE_LEVELS
 */
function pressureLevel(utilization) {
  const PSI_SQ  = PSI * PSI;                // ≈ 0.38197  → NOMINAL boundary
  //   PSI         ≈ 0.61803  → ELEVATED boundary
  const HI_BNDRY = 1 - Math.pow(PSI, 4);   // ≈ 0.85410  → HIGH boundary
  const CR_BNDRY = 1 - Math.pow(PSI, 5);   // ≈ 0.90984  → CRITICAL threshold

  if (utilization <= PSI_SQ)   return PRESSURE_LEVELS.NOMINAL;
  if (utilization <= PSI)      return PRESSURE_LEVELS.ELEVATED;
  if (utilization <= HI_BNDRY) return PRESSURE_LEVELS.HIGH;
  return PRESSURE_LEVELS.CRITICAL;
}

/**
 * nearestFib(n) — returns the Fibonacci number nearest to n.
 * Searches the memoization cache; extends it as needed.
 *
 * @param {number} n — target value (>= 1)
 * @returns {number} nearest Fibonacci number
 */
function nearestFib(n) {
  if (n <= 1) return 1;
  // Extend cache until we bracket n: find first fib >= n
  let idx = 1;
  while (fib(idx) < n) idx++;
  // fib(idx) >= n and fib(idx-1) <= n
  const lo = fib(Math.max(1, idx - 1));
  const hi = fib(idx);
  return (n - lo) <= (hi - n) ? lo : hi;
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  PHI,
  PSI,
  PHI_SQ,
  PHI_CUBE,
  FIBONACCI,
  CSL_THRESHOLDS,
  PRESSURE_LEVELS,
  ALERT_THRESHOLDS,

  // Functions
  fib,
  phiPower,
  phiBackoff,
  phiThreshold,
  phiFusionWeights,
  phiResourceWeights,
  phiTokenBudgets,
  phiTimeout,
  cslGate,
  pressureLevel,
  nearestFib
};
