/**
 * HeadyAutoContext — Context Assembly Engine
 * 
 * Mandatory pre-execution module. Before ANY task is routed to any swarm,
 * bee, or pipeline, HeadyAutoContext assembles the full context envelope:
 *   1. Gather relevant vector memory (semantic search)
 *   2. Fetch active session state
 *   3. Load applicable rules/guardrails
 *   4. Collect telemetry context (health, pressure, drift)
 *   5. Assemble into a frozen, typed ContextEnvelope
 *
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 * Architecture: φ-scaled, CSL-gated, Sacred Geometry v4.0
 */

import { EventEmitter } from 'events';

// ─── φ-Math Constants ────────────────────────────────────────────
const PHI   = 1.618033988749895;
const PSI   = 1 / PHI;                   // ≈ 0.618
const PSI2  = PSI * PSI;                  // ≈ 0.382
const PSI3  = PSI * PSI * PSI;            // ≈ 0.236
const FIB   = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Thresholds ──────────────────────────────────────────────
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;
const CSL = {
  CRITICAL:  phiThreshold(4),  // ≈ 0.927
  HIGH:      phiThreshold(3),  // ≈ 0.882
  MEDIUM:    phiThreshold(2),  // ≈ 0.809
  LOW:       phiThreshold(1),  // ≈ 0.691
  MINIMUM:   phiThreshold(0),  // ≈ 0.500
};

// ─── Context Source Types ────────────────────────────────────────
const CONTEXT_SOURCES = Object.freeze({
  VECTOR_MEMORY:    'vector_memory',
  SESSION_STATE:    'session_state',
  RULES_GUARDRAILS: 'rules_guardrails',
  TELEMETRY:        'telemetry',
  USER_PROFILE:     'user_profile',
  TASK_HISTORY:     'task_history',
  ACTIVE_SWARMS:    'active_swarms',
});

// ─── φ-Fusion Weights for Context Scoring ────────────────────────
// 7-factor fusion: each factor's weight = ψ^i / Σ(ψ^i)
const CONTEXT_WEIGHTS = (() => {
  const raw = Array.from({ length: 7 }, (_, i) => Math.pow(PSI, i));
  const sum = raw.reduce((a, b) => a + b, 0);
  return Object.freeze(raw.map(w => w / sum));
})();

// Maps to: [vectorMemory, sessionState, rules, telemetry, userProfile, taskHistory, activeSwarms]

/**
 * Context source adapter interface.
 * Each source implements fetch(query, options) → { items, score, latencyMs }
 */
class ContextSource {
  constructor(name, type, fetchFn) {
    this.name = name;
    this.type = type;
    this.fetchFn = fetchFn;
    this.enabled = true;
    this.circuitOpen = false;
    this.failureCount = 0;
    this.maxFailures = FIB[5]; // 5
    this.resetAfterMs = Math.round(PHI * 1000 * FIB[5]); // ≈ 8090ms
    this.lastFailure = 0;
  }

  async fetch(query, options = {}) {
    if (!this.enabled) return { items: [], score: 0, latencyMs: 0, skipped: true };

    // Circuit breaker: check if open and if enough time passed for half-open probe
    if (this.circuitOpen) {
      const elapsed = Date.now() - this.lastFailure;
      if (elapsed < this.resetAfterMs) {
        return { items: [], score: 0, latencyMs: 0, circuitOpen: true };
      }
      // Half-open probe
      this.circuitOpen = false;
    }

    const start = Date.now();
    try {
      const result = await this.fetchFn(query, options);
      this.failureCount = 0;
      return {
        items: result.items || [],
        score: result.score || 0,
        latencyMs: Date.now() - start,
        source: this.name,
      };
    } catch (err) {
      this.failureCount++;
      this.lastFailure = Date.now();
      if (this.failureCount >= this.maxFailures) {
        this.circuitOpen = true;
      }
      return { items: [], score: 0, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

/**
 * ContextEnvelope — immutable context object passed to every task execution.
 */
class ContextEnvelope {
  constructor({ taskId, userId, sources, assemblyMs, totalItems, relevanceScore, timestamp }) {
    this.taskId = taskId;
    this.userId = userId;
    this.sources = Object.freeze(sources);
    this.assemblyMs = assemblyMs;
    this.totalItems = totalItems;
    this.relevanceScore = relevanceScore;
    this.timestamp = timestamp || Date.now();
    this.version = '4.0.0';
    Object.freeze(this);
  }

  /**
   * CSL-gated relevance check: is this context good enough for the task?
   * @param {number} threshold - CSL gate threshold (default: MEDIUM ≈ 0.809)
   * @returns {boolean}
   */
  meetsThreshold(threshold = CSL.MEDIUM) {
    return this.relevanceScore >= threshold;
  }

  /**
   * Get items from a specific source type.
   * @param {string} sourceType - One of CONTEXT_SOURCES values
   * @returns {Array}
   */
  getSource(sourceType) {
    return this.sources[sourceType]?.items || [];
  }

  /**
   * Flatten all context items into a single array, sorted by relevance.
   * @returns {Array}
   */
  flatten() {
    return Object.values(this.sources)
      .flatMap(s => s.items || [])
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  }

  /**
   * Serialize for transmission (e.g., to edge runtime or between agents).
   * @returns {object}
   */
  toJSON() {
    return {
      taskId: this.taskId,
      userId: this.userId,
      sources: this.sources,
      assemblyMs: this.assemblyMs,
      totalItems: this.totalItems,
      relevanceScore: this.relevanceScore,
      timestamp: this.timestamp,
      version: this.version,
    };
  }
}

/**
 * HeadyAutoContext — the main context assembly engine.
 * 
 * Usage:
 *   const ctx = new HeadyAutoContext();
 *   ctx.registerSource('vector_memory', fetchFn);
 *   const envelope = await ctx.assemble({ taskId, userId, query });
 */
class HeadyAutoContext extends EventEmitter {
  #sources = new Map();
  #cache;
  #cacheMaxSize = FIB[16]; // 987 entries
  #cacheTTLMs = Math.round(PHI * FIB[8] * 1000); // ≈ 34s * φ ≈ 55s
  #assemblyCount = 0;
  #totalLatencyMs = 0;

  constructor(options = {}) {
    super();
    this.#cacheMaxSize = options.cacheMaxSize || FIB[16];
    this.#cacheTTLMs = options.cacheTTLMs || Math.round(PHI * FIB[8] * 1000);
    this.#cache = new Map();

    // Register default sources with no-op fetchers (replaced by registerSource)
    for (const [, type] of Object.entries(CONTEXT_SOURCES)) {
      this.#sources.set(type, new ContextSource(type, type, async () => ({ items: [], score: 0 })));
    }
  }

  /**
   * Register a context source adapter.
   * @param {string} sourceType - One of CONTEXT_SOURCES values
   * @param {Function} fetchFn - async (query, options) => { items, score }
   */
  registerSource(sourceType, fetchFn) {
    if (!Object.values(CONTEXT_SOURCES).includes(sourceType)) {
      throw new Error(`Unknown context source type: ${sourceType}. Valid: ${Object.values(CONTEXT_SOURCES).join(', ')}`);
    }
    this.#sources.set(sourceType, new ContextSource(sourceType, sourceType, fetchFn));
    this.emit('source:registered', { sourceType });
  }

  /**
   * Enable or disable a source.
   * @param {string} sourceType
   * @param {boolean} enabled
   */
  setSourceEnabled(sourceType, enabled) {
    const source = this.#sources.get(sourceType);
    if (source) {
      source.enabled = enabled;
      this.emit('source:toggled', { sourceType, enabled });
    }
  }

  /**
   * Assemble context for a task. This is the core operation.
   * All sources are fetched concurrently (concurrent-equals principle).
   * Results are fused with φ-weights and returned as a frozen ContextEnvelope.
   *
   * @param {object} params
   * @param {string} params.taskId - Unique task identifier
   * @param {string} params.userId - User identifier
   * @param {string} params.query - The task query/intent
   * @param {object} [params.metadata] - Additional metadata for source filtering
   * @param {number} [params.timeoutMs] - Max assembly time (default: φ³ * 1000 ≈ 4236ms)
   * @returns {Promise<ContextEnvelope>}
   */
  async assemble({ taskId, userId, query, metadata = {}, timeoutMs }) {
    const assemblyTimeout = timeoutMs || Math.round(Math.pow(PHI, 3) * 1000);
    const start = Date.now();

    // Check cache
    const cacheKey = `${userId}:${query}`;
    const cached = this.#cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.#cacheTTLMs) {
      this.emit('context:cache_hit', { taskId, cacheKey });
      return new ContextEnvelope({ ...cached, taskId });
    }

    // Concurrent fetch from all enabled sources (concurrent-equals — no priority ordering)
    const sourceEntries = [...this.#sources.entries()];
    const fetchPromises = sourceEntries.map(([type, source]) =>
      Promise.race([
        source.fetch(query, { userId, metadata }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('source_timeout')), assemblyTimeout)
        ),
      ]).then(result => ({ type, result }))
        .catch(err => ({ type, result: { items: [], score: 0, error: err.message } }))
    );

    const results = await Promise.all(fetchPromises);

    // Build sources map
    const sources = {};
    let weightedScoreSum = 0;
    let totalItems = 0;
    const sourceTypes = Object.values(CONTEXT_SOURCES);

    for (const { type, result } of results) {
      sources[type] = result;
      totalItems += (result.items || []).length;

      // φ-weighted relevance fusion
      const weightIndex = sourceTypes.indexOf(type);
      if (weightIndex >= 0 && weightIndex < CONTEXT_WEIGHTS.length) {
        weightedScoreSum += (result.score || 0) * CONTEXT_WEIGHTS[weightIndex];
      }
    }

    const assemblyMs = Date.now() - start;
    this.#assemblyCount++;
    this.#totalLatencyMs += assemblyMs;

    const envelope = new ContextEnvelope({
      taskId,
      userId,
      sources,
      assemblyMs,
      totalItems,
      relevanceScore: weightedScoreSum,
      timestamp: Date.now(),
    });

    // Update cache (LRU eviction at Fibonacci boundary)
    this.#cache.set(cacheKey, envelope.toJSON());
    if (this.#cache.size > this.#cacheMaxSize) {
      const oldest = this.#cache.keys().next().value;
      this.#cache.delete(oldest);
    }

    this.emit('context:assembled', {
      taskId,
      userId,
      totalItems,
      relevanceScore: weightedScoreSum,
      assemblyMs,
      sourceCount: results.length,
    });

    return envelope;
  }

  /**
   * Get health/metrics for the context engine.
   * @returns {object}
   */
  health() {
    const sourceHealth = {};
    for (const [type, source] of this.#sources) {
      sourceHealth[type] = {
        enabled: source.enabled,
        circuitOpen: source.circuitOpen,
        failureCount: source.failureCount,
      };
    }
    return {
      status: 'healthy',
      assemblyCount: this.#assemblyCount,
      avgLatencyMs: this.#assemblyCount > 0
        ? Math.round(this.#totalLatencyMs / this.#assemblyCount)
        : 0,
      cacheSize: this.#cache.size,
      cacheMaxSize: this.#cacheMaxSize,
      sources: sourceHealth,
    };
  }

  /**
   * Clear the context cache.
   */
  clearCache() {
    this.#cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Graceful shutdown — clear resources.
   */
  async shutdown() {
    this.clearCache();
    this.#sources.clear();
    this.removeAllListeners();
  }
}

export {
  HeadyAutoContext,
  ContextEnvelope,
  ContextSource,
  CONTEXT_SOURCES,
  CONTEXT_WEIGHTS,
  CSL,
};
