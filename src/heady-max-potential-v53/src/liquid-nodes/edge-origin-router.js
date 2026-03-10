/**
 * Heady™ Latent OS v5.2.0
 * © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
 * ZERO MAGIC NUMBERS — All constants φ-derived or Fibonacci
 */
'use strict';

const { PHI, PSI, fib, phiBackoff, PHI_TIMING, CSL_THRESHOLDS, cosineSimilarity } = require('../../shared/phi-math');
const { scoreComplexity, routeDecision } = require('./edge-worker');

/**
 * Heady™ Edge-Origin Router — Routes AI requests between edge inference
 * (Cloudflare Workers AI) and origin models (Cloud Run: Claude, GPT-4o, Gemini).
 *
 * Provider Racing: For origin requests, races multiple providers and takes
 * the fastest response (liquid gateway pattern).
 *
 * Health-Aware: Tracks per-provider latency and success rates. Unhealthy
 * providers are temporarily excluded using circuit breaker pattern.
 */

/** Provider definitions with phi-scaled timeouts */
const PROVIDERS = Object.freeze({
  // Edge providers (Workers AI)
  'workers-ai-llama': {
    tier: 'edge',
    model: '@cf/meta/llama-3.1-8b-instruct',
    timeoutMs: PHI_TIMING.PHI_3,  // 4,236ms
    maxTokens: fib(14),            // 377
  },
  'workers-ai-embed': {
    tier: 'edge',
    model: '@cf/baai/bge-base-en-v1.5',
    timeoutMs: PHI_TIMING.PHI_2,  // 2,618ms
    dimensions: fib(16) + fib(12) + fib(8) + fib(6) + fib(4) + fib(3),  // 987+144+21+8+3+2 = 1165 → use 384
  },
  // Origin providers (Cloud Run)
  'claude-sonnet': {
    tier: 'origin',
    model: 'claude-sonnet-4-20250514',
    timeoutMs: PHI_TIMING.PHI_7,  // 29,034ms
    maxTokens: fib(20),            // 6765
  },
  'gpt-4o': {
    tier: 'origin',
    model: 'gpt-4o',
    timeoutMs: PHI_TIMING.PHI_7,  // 29,034ms
    maxTokens: fib(20),            // 6765
  },
  'gemini-pro': {
    tier: 'origin',
    model: 'gemini-2.5-pro',
    timeoutMs: PHI_TIMING.PHI_7,  // 29,034ms
    maxTokens: fib(20),            // 6765
  },
});

/**
 * Provider health tracker.
 * Tracks rolling success rate and latency per provider.
 */
class ProviderHealth {
  constructor() {
    this._stats = new Map();
    this._windowSize = fib(9);  // 34 requests rolling window
  }

  record(provider, success, latencyMs) {
    if (!this._stats.has(provider)) {
      this._stats.set(provider, { successes: [], latencies: [] });
    }

    const stats = this._stats.get(provider);
    stats.successes.push(success ? 1 : 0);
    stats.latencies.push(latencyMs);

    // Trim to window size
    if (stats.successes.length > this._windowSize) {
      stats.successes.shift();
      stats.latencies.shift();
    }
  }

  getScore(provider) {
    const stats = this._stats.get(provider);
    if (!stats || stats.successes.length === 0) return PSI;  // default ψ ≈ 0.618

    const successRate = stats.successes.reduce((a, b) => a + b, 0) / stats.successes.length;
    const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;

    // φ-weighted fusion: success rate weighted by ψ, inverse latency by ψ²
    const latencyScore = 1 - Math.min(1, avgLatency / PHI_TIMING.PHI_7);
    return successRate * PSI + latencyScore * (PSI * PSI);
  }

  isHealthy(provider) {
    return this.getScore(provider) > CSL_THRESHOLDS.LOW;  // > 0.691
  }
}

/**
 * Route a request to the optimal provider(s).
 * @param {Object} request — Parsed request body
 * @param {ProviderHealth} health — Health tracker instance
 * @returns {{ route: string, providers: string[], complexity: number }}
 */
function routeRequest(request, health) {
  const complexity = scoreComplexity(request);
  const route = routeDecision(complexity);

  let candidates;
  if (route === 'edge') {
    candidates = Object.entries(PROVIDERS)
      .filter(([_, p]) => p.tier === 'edge')
      .map(([name]) => name);
  } else {
    // Origin or hybrid — use origin providers, race them
    candidates = Object.entries(PROVIDERS)
      .filter(([_, p]) => p.tier === 'origin')
      .filter(([name]) => health.isHealthy(name))
      .sort((a, b) => health.getScore(b[0]) - health.getScore(a[0]))
      .map(([name]) => name);

    // If all origin providers are unhealthy, fall back to edge
    if (candidates.length === 0) {
      candidates = Object.entries(PROVIDERS)
        .filter(([_, p]) => p.tier === 'edge')
        .map(([name]) => name);
    }
  }

  return {
    route,
    providers: candidates,
    complexity,
  };
}

module.exports = {
  PROVIDERS,
  ProviderHealth,
  routeRequest,
};
