/**
 * Heady™ BackpressureManager — SRE Adaptive Throttling & Load Shedding
 * 
 * Production-ready backpressure management with:
 * - Google SRE adaptive throttling algorithm
 * - Semantic deduplication via cosine similarity
 * - Phi-derived pressure levels (Nominal/Elevated/High/Critical)
 * - Circuit breaker with half-open probe
 * - Phi-weighted priority scoring for admission control
 * - Criticality-based load shedding
 * - Upstream backpressure signal propagation
 * - Queue depth monitoring with phi-scaled alerts
 * 
 * All thresholds derived from φ (phi). Zero magic numbers.
 * Zero console.log — structured JSON logging only.
 * 
 * @module BackpressureManager
 * @version 1.0.0
 * @author Eric Haywood
 */

'use strict';

const {
  PHI, PSI, PHI2, PHI3,
  PSI_SQ, PSI_CUBE, PSI_FOURTH,
  fib,
  phiThreshold, CSL_THRESHOLDS,
  phiFusionWeights, phiFusionScore,
  phiBackoff, phiBackoffWithJitter,
  PRESSURE_LEVELS, getPressureLevel,
  ALERT_THRESHOLDS,
  SIZING,
  TIMING,
  cosineSimilarity,
  cslGate,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('backpressure-manager');

/* ─────────────────────── Constants ─────────────────────── */

/** Circuit breaker states */
const CB_STATES = Object.freeze({
  CLOSED: 'closed',       // Normal operation
  OPEN: 'open',           // Rejecting requests
  HALF_OPEN: 'half_open', // Probing for recovery
});

/** Request criticality levels */
const CRITICALITY = Object.freeze({
  CRITICAL:   { level: 4, label: 'CRITICAL',   shedThreshold: 1.0 },                    // Never shed
  HIGH:       { level: 3, label: 'HIGH',        shedThreshold: 1 - PSI_FOURTH },          // ≈ 0.854
  MEDIUM:     { level: 2, label: 'MEDIUM',      shedThreshold: PSI },                     // ≈ 0.618
  LOW:        { level: 1, label: 'LOW',         shedThreshold: PSI_SQ },                  // ≈ 0.382
  BACKGROUND: { level: 0, label: 'BACKGROUND',  shedThreshold: PSI_CUBE },                // ≈ 0.236
});

/** Queue configuration — Fibonacci-sized */
const QUEUE_CONFIG = Object.freeze({
  MAX_DEPTH: fib(13),                  // 233 max queued requests
  WARNING_DEPTH: fib(11),              // 89 — warning threshold
  CRITICAL_DEPTH: fib(12),             // 144 — critical threshold
  DEDUP_CACHE_SIZE: fib(16),           // 987 dedup entries
});

/** Circuit breaker configuration — phi-derived */
const CB_CONFIG = Object.freeze({
  FAILURE_THRESHOLD: fib(5),           // 5 consecutive failures to open
  RESET_TIMEOUT_MS: fib(8) * PSI * 1000, // ≈ 12,978 ms
  HALF_OPEN_PROBES: fib(3),            // 2 probe requests
  SUCCESS_THRESHOLD: fib(3),           // 2 successes to close
});

/** Sliding window for throttling — Fibonacci-sized */
const WINDOW_CONFIG = Object.freeze({
  SIZE_MS: fib(10) * 1000,            // 55-second window
  BUCKET_COUNT: fib(9),               // 34 buckets
  BUCKET_SIZE_MS: (fib(10) * 1000) / fib(9), // ≈ 1617ms per bucket
});

/** Semantic deduplication threshold */
const DEDUP_THRESHOLD = phiThreshold(4) + PSI_FOURTH; // ≈ 0.972 — very high similarity

/** Priority scoring weights (criticality, freshness, uniqueness) */
const PRIORITY_WEIGHTS = phiFusionWeights(3); // [0.528, 0.326, 0.146]

/** Backpressure signal propagation delay */
const SIGNAL_PROPAGATION_MS = fib(6) * 100; // 800ms

/* ─────────────────────── Sliding Window ─────────────────────── */

/**
 * Sliding window counter for request rate tracking
 */
class SlidingWindow {
  constructor() {
    this.buckets = new Array(WINDOW_CONFIG.BUCKET_COUNT).fill(0);
    this.acceptedBuckets = new Array(WINDOW_CONFIG.BUCKET_COUNT).fill(0);
    this.currentBucket = 0;
    this.lastRotation = Date.now();
  }

  /**
   * Record a request
   * @param {boolean} accepted - Whether the request was accepted
   */
  record(accepted) {
    this._rotate();
    this.buckets[this.currentBucket]++;
    if (accepted) {
      this.acceptedBuckets[this.currentBucket]++;
    }
  }

  /**
   * Get total requests in window
   * @returns {number}
   */
  totalRequests() {
    this._rotate();
    return this.buckets.reduce((a, b) => a + b, 0);
  }

  /**
   * Get accepted requests in window
   * @returns {number}
   */
  totalAccepted() {
    this._rotate();
    return this.acceptedBuckets.reduce((a, b) => a + b, 0);
  }

  /**
   * Rotate buckets based on elapsed time
   */
  _rotate() {
    const now = Date.now();
    const elapsed = now - this.lastRotation;
    const bucketsToRotate = Math.floor(elapsed / WINDOW_CONFIG.BUCKET_SIZE_MS);

    if (bucketsToRotate > 0) {
      for (let i = 0; i < Math.min(bucketsToRotate, WINDOW_CONFIG.BUCKET_COUNT); i++) {
        this.currentBucket = (this.currentBucket + 1) % WINDOW_CONFIG.BUCKET_COUNT;
        this.buckets[this.currentBucket] = 0;
        this.acceptedBuckets[this.currentBucket] = 0;
      }
      this.lastRotation = now;
    }
  }
}

/* ─────────────────────── Circuit Breaker ─────────────────────── */

/**
 * Circuit breaker for downstream service protection
 */
class CircuitBreaker {
  /**
   * @param {string} name - Service name
   */
  constructor(name) {
    this.name = name;
    this.state = CB_STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.openedAt = null;
    this.halfOpenProbes = 0;
    this.stats = {
      totalTrips: 0,
      totalResets: 0,
      totalRejections: 0,
    };
  }

  /**
   * Check if request should be allowed
   * @returns {boolean}
   */
  allow() {
    switch (this.state) {
      case CB_STATES.CLOSED:
        return true;

      case CB_STATES.OPEN: {
        // Check if reset timeout has elapsed
        if (this.openedAt && Date.now() - this.openedAt >= CB_CONFIG.RESET_TIMEOUT_MS) {
          this.state = CB_STATES.HALF_OPEN;
          this.halfOpenProbes = 0;
          logger.info({ component: 'CircuitBreaker', service: this.name, action: 'half_open' });
          return true;
        }
        this.stats.totalRejections++;
        return false;
      }

      case CB_STATES.HALF_OPEN: {
        // Allow limited probes
        if (this.halfOpenProbes < CB_CONFIG.HALF_OPEN_PROBES) {
          this.halfOpenProbes++;
          return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.failures = 0;

    if (this.state === CB_STATES.HALF_OPEN) {
      this.successes++;
      if (this.successes >= CB_CONFIG.SUCCESS_THRESHOLD) {
        this.state = CB_STATES.CLOSED;
        this.successes = 0;
        this.stats.totalResets++;
        logger.info({ component: 'CircuitBreaker', service: this.name, action: 'closed' });
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.state === CB_STATES.HALF_OPEN) {
      // Any failure in half-open reopens
      this.state = CB_STATES.OPEN;
      this.openedAt = Date.now();
      this.stats.totalTrips++;
      logger.info({ component: 'CircuitBreaker', service: this.name, action: 'reopened' });
      return;
    }

    if (this.failures >= CB_CONFIG.FAILURE_THRESHOLD && this.state === CB_STATES.CLOSED) {
      this.state = CB_STATES.OPEN;
      this.openedAt = Date.now();
      this.stats.totalTrips++;
      logger.info({
        component: 'CircuitBreaker',
        service: this.name,
        action: 'opened',
        failures: this.failures,
      });
    }
  }

  /**
   * Get circuit breaker status
   * @returns {object}
   */
  status() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure ? new Date(this.lastFailure).toISOString() : null,
      stats: { ...this.stats },
    };
  }
}

/* ─────────────────────── Semantic Deduplicator ─────────────────────── */

/**
 * Semantic deduplication using cosine similarity
 */
class SemanticDeduplicator {
  constructor() {
    /** Recent request fingerprints — LRU cache */
    this.cache = new Map();
    this.maxSize = QUEUE_CONFIG.DEDUP_CACHE_SIZE;
  }

  /**
   * Check if request is a semantic duplicate
   * @param {string} requestKey - Request identifier/content
   * @param {Float32Array} [embedding] - Request embedding vector
   * @returns {object} {isDuplicate: boolean, similarity: number, originalKey: string|null}
   */
  check(requestKey, embedding = null) {
    // Exact match check first
    if (this.cache.has(requestKey)) {
      return { isDuplicate: true, similarity: 1.0, originalKey: requestKey };
    }

    // Semantic similarity check if embedding provided
    if (embedding) {
      for (const [key, entry] of this.cache) {
        if (entry.embedding) {
          const similarity = cosineSimilarity(embedding, entry.embedding);
          if (similarity >= DEDUP_THRESHOLD) {
            return { isDuplicate: true, similarity, originalKey: key };
          }
        }
      }
    }

    // Not a duplicate — add to cache
    this._add(requestKey, embedding);
    return { isDuplicate: false, similarity: 0, originalKey: null };
  }

  /**
   * Add entry to dedup cache
   * @param {string} key - Request key
   * @param {Float32Array} [embedding] - Embedding
   */
  _add(key, embedding = null) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   * @returns {object}
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
    };
  }
}

/* ─────────────────────── BackpressureManager ─────────────────────── */

/**
 * BackpressureManager — SRE Adaptive Throttling Engine
 * 
 * Implements Google SRE adaptive throttling with semantic deduplication,
 * phi-scaled pressure levels, and criticality-based load shedding.
 */
class BackpressureManager {
  /**
   * @param {object} opts
   * @param {string} [opts.name] - Service name
   * @param {number} [opts.maxQueueDepth] - Override max queue depth
   * @param {object} [opts.embedder] - HeadyEmbed for semantic dedup
   * @param {Function} [opts.onPressureChange] - Callback on pressure level change
   * @param {Function} [opts.onShed] - Callback when request is shed
   */
  constructor(opts = {}) {
    this.name = opts.name || 'heady-backpressure';
    this.maxQueueDepth = opts.maxQueueDepth || QUEUE_CONFIG.MAX_DEPTH;
    this.embedder = opts.embedder || null;
    this.onPressureChange = opts.onPressureChange || null;
    this.onShed = opts.onShed || null;

    /** Sliding window for SRE throttling */
    this.window = new SlidingWindow();

    /** Circuit breakers per downstream service */
    this.circuitBreakers = new Map();

    /** Semantic deduplicator */
    this.deduplicator = new SemanticDeduplicator();

    /** Current queue depth */
    this.queueDepth = 0;

    /** Current pressure level */
    this.pressureLevel = 'NOMINAL';

    /** Upstream signals */
    this.upstreamSignals = new Map();

    /** Statistics */
    this.stats = {
      totalRequests: 0,
      totalAccepted: 0,
      totalThrottled: 0,
      totalShed: 0,
      totalDeduplicated: 0,
      pressureChanges: 0,
      peakQueueDepth: 0,
    };

    /** Monitoring timer */
    this._monitorTimer = setInterval(() => this._monitor(), fib(7) * 1000); // 13 seconds

    logger.info({ component: 'BackpressureManager', action: 'initialized', name: this.name });
  }

  /* ─────────────── Admission Control ─────────────── */

  /**
   * Check if a request should be admitted
   * Implements SRE adaptive throttling with criticality-based shedding
   * 
   * @param {object} request - Incoming request
   * @param {string} [request.key] - Request key for dedup
   * @param {string} [request.criticality] - Criticality level
   * @param {Float32Array} [request.embedding] - Request embedding for semantic dedup
   * @param {string} [request.downstream] - Downstream service name
   * @returns {object} {admitted: boolean, reason: string, backoff_ms: number}
   */
  admit(request = {}) {
    this.stats.totalRequests++;
    const criticality = CRITICALITY[request.criticality || 'MEDIUM'];

    // Step 1: Circuit breaker check
    if (request.downstream) {
      const cb = this._getCircuitBreaker(request.downstream);
      if (!cb.allow()) {
        this.stats.totalThrottled++;
        return {
          admitted: false,
          reason: 'circuit_breaker_open',
          backoff_ms: CB_CONFIG.RESET_TIMEOUT_MS,
          downstream: request.downstream,
        };
      }
    }

    // Step 2: Semantic deduplication
    if (request.key) {
      const dedupResult = this.deduplicator.check(request.key, request.embedding);
      if (dedupResult.isDuplicate) {
        this.stats.totalDeduplicated++;
        return {
          admitted: false,
          reason: 'duplicate',
          similarity: dedupResult.similarity,
          originalKey: dedupResult.originalKey,
          backoff_ms: 0,
        };
      }
    }

    // Step 3: Queue depth check
    if (this.queueDepth >= this.maxQueueDepth) {
      this.stats.totalShed++;
      this._notifyShed(request, 'queue_full');
      return {
        admitted: false,
        reason: 'queue_full',
        backoff_ms: phiBackoff(Math.min(fib(5), this.stats.totalShed)),
        queueDepth: this.queueDepth,
      };
    }

    // Step 4: SRE adaptive throttling
    // Google SRE formula: client_rejection_probability = max(0, (requests - K * accepts) / (requests + 1))
    const requests = this.window.totalRequests();
    const accepts = this.window.totalAccepted();
    const K = PHI2; // Multiplier — phi² ≈ 2.618 (SRE typically uses 2.0)

    let rejectionProb = 0;
    if (requests > 0) {
      rejectionProb = Math.max(0, (requests - K * accepts) / (requests + 1));
    }

    // Step 5: Criticality-based load shedding
    // Lower criticality gets shed first when under pressure
    const pressure = this._computePressure();
    const shedThreshold = criticality.shedThreshold;

    if (pressure > shedThreshold && criticality.level < CRITICALITY.CRITICAL.level) {
      this.stats.totalShed++;
      this._notifyShed(request, 'criticality_shed');
      return {
        admitted: false,
        reason: 'criticality_shed',
        pressure,
        criticality: criticality.label,
        shedThreshold,
        backoff_ms: phiBackoff(1),
      };
    }

    // Step 6: Probabilistic rejection
    if (rejectionProb > 0 && Math.random() < rejectionProb) {
      this.stats.totalThrottled++;
      this.window.record(false);
      return {
        admitted: false,
        reason: 'adaptive_throttle',
        rejectionProbability: rejectionProb,
        backoff_ms: phiBackoff(Math.ceil(rejectionProb * fib(5))),
      };
    }

    // Admitted
    this.stats.totalAccepted++;
    this.queueDepth++;
    this.stats.peakQueueDepth = Math.max(this.stats.peakQueueDepth, this.queueDepth);
    this.window.record(true);

    return {
      admitted: true,
      reason: 'accepted',
      queueDepth: this.queueDepth,
      pressure,
      backoff_ms: 0,
    };
  }

  /**
   * Release a request from the queue (completed processing)
   */
  release() {
    this.queueDepth = Math.max(0, this.queueDepth - 1);
  }

  /**
   * Record downstream success
   * @param {string} downstream - Service name
   */
  recordSuccess(downstream) {
    const cb = this._getCircuitBreaker(downstream);
    cb.recordSuccess();
  }

  /**
   * Record downstream failure
   * @param {string} downstream - Service name
   */
  recordFailure(downstream) {
    const cb = this._getCircuitBreaker(downstream);
    cb.recordFailure();
  }

  /* ─────────────── Pressure Computation ─────────────── */

  /**
   * Compute current system pressure (0-1)
   * Combines queue depth, rejection rate, and circuit breaker state
   * @returns {number} Pressure 0-1
   */
  _computePressure() {
    // Queue pressure
    const queuePressure = this.queueDepth / this.maxQueueDepth;

    // Throttle pressure — from sliding window rejection rate
    const totalReqs = this.window.totalRequests();
    const totalAccepted = this.window.totalAccepted();
    const throttlePressure = totalReqs > 0 ? 1 - (totalAccepted / totalReqs) : 0;

    // Circuit breaker pressure
    let cbPressure = 0;
    if (this.circuitBreakers.size > 0) {
      const openCount = [...this.circuitBreakers.values()].filter(cb => cb.state !== CB_STATES.CLOSED).length;
      cbPressure = openCount / this.circuitBreakers.size;
    }

    // Phi-weighted fusion
    const pressure = phiFusionScore(
      [queuePressure, throttlePressure, cbPressure],
      PRIORITY_WEIGHTS
    );

    return Math.min(1, pressure);
  }

  /**
   * Get current pressure level
   * @returns {string} Pressure level name
   */
  getPressureLevel() {
    const pressure = this._computePressure();
    return getPressureLevel(pressure);
  }

  /* ─────────────── Circuit Breaker Management ─────────────── */

  /**
   * Get or create circuit breaker for a downstream service
   * @param {string} name - Service name
   * @returns {CircuitBreaker}
   */
  _getCircuitBreaker(name) {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name));
    }
    return this.circuitBreakers.get(name);
  }

  /**
   * Get all circuit breaker statuses
   * @returns {Array}
   */
  getCircuitBreakerStatuses() {
    return [...this.circuitBreakers.values()].map(cb => cb.status());
  }

  /* ─────────────── Upstream Signal Propagation ─────────────── */

  /**
   * Send backpressure signal to upstream callers
   * @param {string} upstreamId - Upstream service/caller ID
   * @param {object} signal - Backpressure signal
   */
  propagateSignal(upstreamId, signal = null) {
    const currentPressure = this._computePressure();
    const pressureLevel = this.getPressureLevel();

    const backpressureSignal = signal || {
      source: this.name,
      pressure: currentPressure,
      pressureLevel,
      queueDepth: this.queueDepth,
      maxQueueDepth: this.maxQueueDepth,
      suggestedBackoff_ms: currentPressure > PSI
        ? phiBackoff(Math.ceil(currentPressure * fib(5)))
        : 0,
      timestamp: Date.now(),
    };

    this.upstreamSignals.set(upstreamId, backpressureSignal);

    logger.info({
      component: 'BackpressureManager',
      action: 'signal_propagated',
      upstreamId,
      pressure: currentPressure,
      pressureLevel,
    });

    return backpressureSignal;
  }

  /**
   * Receive backpressure signal from downstream
   * @param {object} signal - Downstream backpressure signal
   */
  receiveSignal(signal) {
    if (signal.suggestedBackoff_ms > 0) {
      logger.info({
        component: 'BackpressureManager',
        action: 'signal_received',
        source: signal.source,
        pressure: signal.pressure,
        suggestedBackoff_ms: signal.suggestedBackoff_ms,
      });
    }
  }

  /* ─────────────── Monitoring ─────────────── */

  /**
   * Periodic monitoring — check pressure levels and alert
   */
  _monitor() {
    const pressure = this._computePressure();
    const newLevel = this.getPressureLevel();

    // Detect pressure level change
    if (newLevel !== this.pressureLevel) {
      const oldLevel = this.pressureLevel;
      this.pressureLevel = newLevel;
      this.stats.pressureChanges++;

      logger.info({
        component: 'BackpressureManager',
        action: 'pressure_change',
        from: oldLevel,
        to: newLevel,
        pressure,
        queueDepth: this.queueDepth,
      });

      if (this.onPressureChange) {
        this.onPressureChange(newLevel, oldLevel, pressure);
      }
    }

    // Queue depth alerts
    if (this.queueDepth >= QUEUE_CONFIG.CRITICAL_DEPTH) {
      logger.warn({
        component: 'BackpressureManager',
        action: 'queue_critical',
        queueDepth: this.queueDepth,
        threshold: QUEUE_CONFIG.CRITICAL_DEPTH,
      });
    } else if (this.queueDepth >= QUEUE_CONFIG.WARNING_DEPTH) {
      logger.warn({
        component: 'BackpressureManager',
        action: 'queue_warning',
        queueDepth: this.queueDepth,
        threshold: QUEUE_CONFIG.WARNING_DEPTH,
      });
    }
  }

  /**
   * Notify shed callback
   * @param {object} request - Shed request
   * @param {string} reason - Shed reason
   */
  _notifyShed(request, reason) {
    if (this.onShed) {
      this.onShed(request, reason);
    }
  }

  /* ─────────────── Query API ─────────────── */

  /**
   * Get current system status
   * @returns {object}
   */
  getStatus() {
    const pressure = this._computePressure();
    const level = this.getPressureLevel();

    return {
      name: this.name,
      pressure,
      pressureLevel: level,
      queueDepth: this.queueDepth,
      maxQueueDepth: this.maxQueueDepth,
      queueUtilization: this.queueDepth / this.maxQueueDepth,
      circuitBreakers: this.getCircuitBreakerStatuses(),
      deduplication: this.deduplicator.stats(),
      windowStats: {
        totalRequests: this.window.totalRequests(),
        totalAccepted: this.window.totalAccepted(),
        acceptRate: this.window.totalRequests() > 0
          ? this.window.totalAccepted() / this.window.totalRequests()
          : 1,
      },
    };
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    return {
      ...this.stats,
      queueDepth: this.queueDepth,
      pressureLevel: this.pressureLevel,
      pressure: this._computePressure(),
      acceptRate: this.stats.totalRequests > 0
        ? this.stats.totalAccepted / this.stats.totalRequests
        : 1,
      shedRate: this.stats.totalRequests > 0
        ? this.stats.totalShed / this.stats.totalRequests
        : 0,
      dedupRate: this.stats.totalRequests > 0
        ? this.stats.totalDeduplicated / this.stats.totalRequests
        : 0,
    };
  }

  /**
   * Health check
   * @returns {object}
   */
  health() {
    const pressure = this._computePressure();

    let status = 'healthy';
    if (pressure > ALERT_THRESHOLDS.critical) {
      status = 'critical';
    } else if (pressure > ALERT_THRESHOLDS.caution) {
      status = 'degraded';
    } else if (pressure > ALERT_THRESHOLDS.warning) {
      status = 'warning';
    }

    return {
      service: 'backpressure-manager',
      status,
      pressure,
      pressureLevel: this.pressureLevel,
      queueDepth: this.queueDepth,
      stats: this.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Graceful shutdown
   */
  destroy() {
    clearInterval(this._monitorTimer);
    this.deduplicator.clear();
    this.circuitBreakers.clear();

    logger.info({
      component: 'BackpressureManager',
      action: 'shutdown',
      totalProcessed: this.stats.totalRequests,
    });
  }
}

module.exports = {
  BackpressureManager,
  CircuitBreaker,
  SemanticDeduplicator,
  SlidingWindow,
  CB_STATES,
  CRITICALITY,
  QUEUE_CONFIG,
  CB_CONFIG,
};
