// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: packages/phi-math-foundation/index.js
// LAYER: packages/phi-math-foundation
// Load-bearing φ-Mathematics — ALL platform constants derive from here
// Patent: HS-014 Sacred Geometry Multi-Agent Orchestration
// HEADY_BRAND:END

'use strict';

// ═══════════════════════════════════════════════════════════════════
// §1 — CORE φ CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;  // ψ = 0.618033988749895
const PHI_SQ = PHI * PHI; // φ² = 2.618033988749895
const PHI_CUBE = PHI * PHI * PHI; // φ³ = 4.23606797749979
const SQRT5 = Math.sqrt(5); // √5 = 2.23606797749979

// ═══════════════════════════════════════════════════════════════════
// §2 — FIBONACCI SEQUENCE (first 21 numbers)
// ═══════════════════════════════════════════════════════════════════

const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

/**
 * Generate Fibonacci number at index n using Binet's formula
 * @param {number} n — Index (0-based)
 * @returns {number} Fibonacci[n]
 */
function fib(n) {
  if (n < FIB.length) return FIB[n];
  return Math.round((Math.pow(PHI, n) - Math.pow(-PHI_INV, n)) / SQRT5);
}

// ═══════════════════════════════════════════════════════════════════
// §3 — CSL CONFIDENCE GATES
// ═══════════════════════════════════════════════════════════════════

const CSL_GATES = {
  CORE:    0.718,    // High confidence — inject into active context
  INCLUDE: PHI_INV,  // 0.618 — Normal confidence — add to response
  RECALL:  0.382,    // Low confidence — available via search only
  VOID:    0.0,      // Below all thresholds — filtered out
};

const CSL_LEVELS = {
  CRITICAL: 0.95,
  HIGH:     0.809,   // 1/φ + φ/5 ≈ 0.809
  MEDIUM:   CSL_GATES.CORE,
  LOW:      CSL_GATES.INCLUDE,
  MINIMUM:  CSL_GATES.RECALL,
};

/**
 * Classify a cosine similarity score into CSL gate level
 * @param {number} score — Cosine similarity [0, 1]
 * @returns {{ gate: string, level: string, include: boolean }}
 */
function classifyCSL(score) {
  if (score >= CSL_GATES.CORE)    return { gate: 'CORE', level: 'HIGH', include: true };
  if (score >= CSL_GATES.INCLUDE) return { gate: 'INCLUDE', level: 'MEDIUM', include: true };
  if (score >= CSL_GATES.RECALL)  return { gate: 'RECALL', level: 'LOW', include: false };
  return { gate: 'VOID', level: 'NONE', include: false };
}

// ═══════════════════════════════════════════════════════════════════
// §4 — φ-SCALED TIMING
// ═══════════════════════════════════════════════════════════════════

/** φ-powers pre-computed for timeout/interval calculations */
const PHI_POWERS = {};
for (let i = 0; i <= 12; i++) {
  PHI_POWERS[i] = Math.pow(PHI, i);
}

/**
 * Calculate φ-scaled timeout in milliseconds
 * @param {number} power — Power of φ
 * @param {number} [baseMs=1000] — Base milliseconds
 * @returns {number} Timeout in milliseconds
 */
function phiTimeout(power, baseMs = 1000) {
  return Math.round(PHI_POWERS[power] * baseMs);
}

/**
 * Calculate φ-scaled retry backoff
 * @param {number} attempt — Retry attempt number (0-based)
 * @param {number} [baseMs=1000] — Base delay
 * @param {number} [maxMs=30000] — Maximum delay cap
 * @returns {number} Delay in milliseconds
 */
function phiBackoff(attempt, baseMs = 1000, maxMs = 30000) {
  const delay = Math.round(baseMs * Math.pow(PHI, attempt));
  return Math.min(delay, maxMs);
}

// ═══════════════════════════════════════════════════════════════════
// §5 — FIBONACCI RATE LIMITS
// ═══════════════════════════════════════════════════════════════════

const RATE_LIMITS = {
  TRIAL:    { rpm: FIB[6],  burst: FIB[7]  },  // 8 RPM, 13 burst
  PILOT:    { rpm: FIB[8],  burst: FIB[9]  },  // 21 RPM, 34 burst
  PUBLIC:   { rpm: FIB[9],  burst: FIB[10] },  // 34 RPM, 55 burst
  INTERNAL: { rpm: FIB[11], burst: FIB[12] },  // 89 RPM, 144 burst
};

// ═══════════════════════════════════════════════════════════════════
// §6 — VECTOR & MEMORY CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const VECTOR_DIM = 384;            // all-MiniLM-L6-v2 embedding dimension
const TOP_K_DEFAULT = FIB[8];       // 21 — default search results
const MAX_BEES = FIB[9];            // 34 — max swarm burst per task
const MAX_CONCURRENT_BEES = FIB[20]; // 6,765 — platform max
const HEARTBEAT_MS = Math.round(Math.pow(PHI, 7)); // ≈29,034ms → ~29s
const PIPELINE_TARGET_MS = Math.round(Math.pow(PHI, 5) * 1000); // ≈11,090ms

// ═══════════════════════════════════════════════════════════════════
// §7 — φ-CANARY DEPLOY STAGES
// ═══════════════════════════════════════════════════════════════════

const CANARY_STAGES = [
  { traffic: 0.0618, label: '6.18%',  delay: 0 },
  { traffic: 0.382,  label: '38.2%',  delay: PHI },       // φ hours
  { traffic: 0.618,  label: '61.8%',  delay: PHI_SQ },    // φ² hours
  { traffic: 1.0,    label: '100%',   delay: PHI_CUBE },  // φ³ hours
];

// ═══════════════════════════════════════════════════════════════════
// §8 — THOUGHT BILLING MULTIPLIERS
// ═══════════════════════════════════════════════════════════════════

const THOUGHT_MULTIPLIERS = {
  embed:          1.0,
  search:         PHI,
  memory_write:   PHI,
  enrichment:     PHI_SQ,
  pipeline_step:  PHI_CUBE,
  swarm_dispatch: Math.pow(PHI, 4),
  llm_inference:  Math.pow(PHI, 5),
  parse_990:      Math.pow(PHI, 4),
  design_gen:     Math.pow(PHI, 6),
};

const BASE_THOUGHT_COST = 0.0001; // $0.0001 per base thought

/**
 * Calculate cost for a thought operation
 * @param {string} type — Thought type
 * @returns {number} Cost in USD
 */
function thoughtCost(type) {
  const multiplier = THOUGHT_MULTIPLIERS[type] || 1.0;
  return BASE_THOUGHT_COST * multiplier;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  // Core constants
  PHI, PHI_INV, PHI_SQ, PHI_CUBE, SQRT5,
  FIB, fib,
  
  // CSL
  CSL_GATES, CSL_LEVELS, classifyCSL,
  
  // Timing
  PHI_POWERS, phiTimeout, phiBackoff,
  
  // Rate limits
  RATE_LIMITS,
  
  // Vector/Memory
  VECTOR_DIM, TOP_K_DEFAULT, MAX_BEES, MAX_CONCURRENT_BEES,
  HEARTBEAT_MS, PIPELINE_TARGET_MS,
  
  // Deploy
  CANARY_STAGES,
  
  // Billing
  THOUGHT_MULTIPLIERS, BASE_THOUGHT_COST, thoughtCost,
};
