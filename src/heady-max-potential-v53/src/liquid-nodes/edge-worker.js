/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { PHI, PSI, fib, phiMs, PHI_TIMING, CSL_THRESHOLDS, cosineSimilarity } = require('../../shared/phi-math');

/**
 * Heady™ Edge Worker — Cloudflare Workers-compatible edge inference handler.
 * Routes between edge-local AI (Workers AI) and origin (Cloud Run) based on
 * φ-scored complexity. Simple queries stay at the edge. Complex queries
 * go to origin for full-power models.
 *
 * Architecture:
 *   Client → CF Worker (this) → Workers AI (simple) / Cloud Run (complex)
 *                             → Vectorize (edge search) / pgvector (origin search)
 *
 * Complexity Scoring (CSL-based):
 *   score < ψ² ≈ 0.382 → edge-only (embeddings, classification, simple lookups)
 *   ψ² ≤ score < ψ ≈ 0.618 → edge-preferred (moderate queries, edge fallback)
 *   score ≥ ψ ≈ 0.618 → origin-required (reasoning, code gen, multi-step)
 */

/** Edge complexity thresholds (φ-derived) */
const COMPLEXITY = Object.freeze({
  EDGE_ONLY:      PSI * PSI,    // ≈ 0.382
  EDGE_PREFERRED: PSI,          // ≈ 0.618
  ORIGIN_REQUIRED: 1 - PSI * PSI, // ≈ 0.618 (same as PSI by identity)
});

/** Resource allocation between edge and origin (Fibonacci ratios) */
const RESOURCE_SPLIT = Object.freeze({
  edge:     fib(10) / (fib(10) + fib(9) + fib(6) + fib(4)),  // 55/(55+34+8+3) = 0.55
  origin:   fib(9)  / (fib(10) + fib(9) + fib(6) + fib(4)),  // 34/100 = 0.34
  hybrid:   fib(6)  / (fib(10) + fib(9) + fib(6) + fib(4)),  // 8/100  = 0.08
  reserved: fib(4)  / (fib(10) + fib(9) + fib(6) + fib(4)),  // 3/100  = 0.03
});

/** Compression triggers at Fibonacci message counts */
const COMPRESSION_TRIGGERS = [fib(6), fib(7), fib(8), fib(9), fib(10), fib(11)];
// [8, 13, 21, 34, 55, 89]

/**
 * Score the complexity of an incoming request.
 * Uses heuristics based on token count, tool-use flags, and conversation depth.
 *
 * @param {Object} request — Parsed request body
 * @returns {number} Complexity score 0–1
 */
function scoreComplexity(request) {
  let score = 0;
  const factors = [];

  // Token count factor (normalized to fib(17)=1597 max expected)
  const tokenEstimate = (request.messages || [])
    .reduce((sum, m) => sum + (m.content || '').length / 4, 0);
  const tokenFactor = Math.min(1, tokenEstimate / fib(17));
  factors.push(tokenFactor * PSI);  // weight by ψ

  // Multi-turn depth factor
  const turns = (request.messages || []).length;
  const turnFactor = Math.min(1, turns / fib(8));  // normalize to 21 turns
  factors.push(turnFactor * (PSI * PSI));  // weight by ψ²

  // Tool-use indicator (requires origin models)
  if (request.tools && request.tools.length > 0) {
    factors.push(PSI);  // tool use pushes toward origin
  }

  // System prompt complexity
  const systemLen = (request.messages?.[0]?.role === 'system')
    ? request.messages[0].content.length : 0;
  if (systemLen > fib(14)) {  // > 377 chars
    factors.push(PSI * PSI);
  }

  // Sum all factors (capped at 1.0)
  score = Math.min(1, factors.reduce((s, f) => s + f, 0));

  return score;
}

/**
 * Route decision based on complexity score.
 * @param {number} score — Complexity score 0–1
 * @returns {'edge'|'origin'|'hybrid'} Routing decision
 */
function routeDecision(score) {
  if (score < COMPLEXITY.EDGE_ONLY) return 'edge';
  if (score < COMPLEXITY.EDGE_PREFERRED) return 'hybrid';
  return 'origin';
}

/**
 * Check if conversation should trigger memory compression.
 * @param {number} messageCount — Current message count
 * @returns {boolean}
 */
function shouldCompress(messageCount) {
  return COMPRESSION_TRIGGERS.includes(messageCount);
}

module.exports = {
  COMPLEXITY,
  RESOURCE_SPLIT,
  COMPRESSION_TRIGGERS,
  scoreComplexity,
  routeDecision,
  shouldCompress,
};
