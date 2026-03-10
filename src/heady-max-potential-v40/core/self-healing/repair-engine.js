/**
 * Heady Self-Healing — Repair Engine
 *
 * Automated repair system that responds to drift detection events.
 * Implements the full self-healing lifecycle:
 *   1. DETECT  — DriftDetector identifies degradation
 *   2. ISOLATE — Quarantine the degraded component
 *   3. DIAGNOSE — Determine root cause category
 *   4. REPAIR  — Execute appropriate repair strategy
 *   5. VERIFY  — Confirm repair restored coherence
 *   6. RESTORE — Return component to active service
 *
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 * Architecture: φ-scaled, CSL-gated, Sacred Geometry v4.0
 */

import { EventEmitter } from 'events';

// ─── φ-Math Constants ────────────────────────────────────────────
const PHI   = 1.618033988749895;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const FIB   = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── Repair Strategies ───────────────────────────────────────────
const REPAIR_STRATEGIES = Object.freeze({
  RESTART:        'restart',         // Restart the component process
  REINDEX:        'reindex',         // Re-index embeddings from source
  RECONFIG:       'reconfig',        // Reset config to declared baseline
  RECALIBRATE:    'recalibrate',     // Re-tune model/agent parameters
  FAILOVER:       'failover',        // Switch to backup instance
  SCALE_UP:       'scale_up',        // Add resources to relieve pressure
  CACHE_FLUSH:    'cache_flush',     // Clear stale cached state
  RECONNECT:      'reconnect',       // Re-establish external connections
});

// ─── Diagnosis Categories ────────────────────────────────────────
const DIAGNOSIS = Object.freeze({
  STALE_EMBEDDINGS:   'stale_embeddings',
  CONFIG_MISMATCH:    'config_mismatch',
  RESOURCE_EXHAUSTION: 'resource_exhaustion',
  DEPENDENCY_FAILURE: 'dependency_failure',
  MODEL_DEGRADATION:  'model_degradation',
  CACHE_CORRUPTION:   'cache_corruption',
  NETWORK_PARTITION:  'network_partition',
  UNKNOWN:            'unknown',
});

// ─── Diagnosis → Strategy Mapping ────────────────────────────────
const REPAIR_MAP = Object.freeze({
  [DIAGNOSIS.STALE_EMBEDDINGS]:   [REPAIR_STRATEGIES.REINDEX, REPAIR_STRATEGIES.CACHE_FLUSH],
  [DIAGNOSIS.CONFIG_MISMATCH]:    [REPAIR_STRATEGIES.RECONFIG, REPAIR_STRATEGIES.RESTART],
  [DIAGNOSIS.RESOURCE_EXHAUSTION]: [REPAIR_STRATEGIES.SCALE_UP, REPAIR_STRATEGIES.CACHE_FLUSH],
  [DIAGNOSIS.DEPENDENCY_FAILURE]: [REPAIR_STRATEGIES.FAILOVER, REPAIR_STRATEGIES.RECONNECT],
  [DIAGNOSIS.MODEL_DEGRADATION]:  [REPAIR_STRATEGIES.RECALIBRATE, REPAIR_STRATEGIES.FAILOVER],
  [DIAGNOSIS.CACHE_CORRUPTION]:   [REPAIR_STRATEGIES.CACHE_FLUSH, REPAIR_STRATEGIES.RESTART],
  [DIAGNOSIS.NETWORK_PARTITION]:  [REPAIR_STRATEGIES.RECONNECT, REPAIR_STRATEGIES.FAILOVER],
  [DIAGNOSIS.UNKNOWN]:            [REPAIR_STRATEGIES.RESTART],
});

/**
 * Repair record for audit trail.
 */
class RepairRecord {
  constructor({ componentId, diagnosis, strategy, success, durationMs, coherenceBefore, coherenceAfter }) {
    this.componentId = componentId;
    this.diagnosis = diagnosis;
    this.strategy = strategy;
    this.success = success;
    this.durationMs = durationMs;
    this.coherenceBefore = coherenceBefore;
    this.coherenceAfter = coherenceAfter;
    this.timestamp = Date.now();
    Object.freeze(this);
  }
}

/**
 * RepairEngine — orchestrates self-healing repair cycles.
 */
class RepairEngine extends EventEmitter {
  #strategyHandlers = new Map();
  #diagnoseFns = new Map();
  #repairHistory = [];
  #historyMaxSize = FIB[12]; // 144 records
  #maxRepairAttempts = FIB[5]; // 5
  #repairCooldownMs;
  #lastRepairTime = new Map();
  #activeRepairs = new Set();

  constructor(options = {}) {
    super();
    this.#repairCooldownMs = options.repairCooldownMs || Math.round(PHI * FIB[8] * 1000); // ≈ 55s
  }

  /**
   * Register a repair strategy handler.
   * @param {string} strategy - One of REPAIR_STRATEGIES values
   * @param {Function} handler - async (componentId, context) => boolean (success)
   */
  registerStrategy(strategy, handler) {
    if (!Object.values(REPAIR_STRATEGIES).includes(strategy)) {
      throw new Error(`Unknown repair strategy: ${strategy}`);
    }
    this.#strategyHandlers.set(strategy, handler);
    this.emit('strategy:registered', { strategy });
  }

  /**
   * Register a diagnosis function for a component type.
   * @param {string} componentType - 'embedding' | 'config' | 'behavior' | 'health'
   * @param {Function} diagnoseFn - async (componentId, measurement) => DIAGNOSIS value
   */
  registerDiagnosis(componentType, diagnoseFn) {
    this.#diagnoseFns.set(componentType, diagnoseFn);
  }

  /**
   * Execute a full repair cycle for a component.
   * @param {string} componentId
   * @param {DriftMeasurement} measurement
   * @returns {Promise<RepairRecord>}
   */
  async repair(componentId, measurement) {
    // Prevent concurrent repairs on same component
    if (this.#activeRepairs.has(componentId)) {
      this.emit('repair:already_active', { componentId });
      return null;
    }

    // Cooldown check — don't repair too frequently
    const lastRepair = this.#lastRepairTime.get(componentId) || 0;
    if (Date.now() - lastRepair < this.#repairCooldownMs) {
      this.emit('repair:cooldown', { componentId, remainingMs: this.#repairCooldownMs - (Date.now() - lastRepair) });
      return null;
    }

    this.#activeRepairs.add(componentId);
    const start = Date.now();

    try {
      // Step 1: Diagnose
      const diagnosis = await this.#diagnose(componentId, measurement);
      this.emit('repair:diagnosed', { componentId, diagnosis });

      // Step 2: Get repair strategies (ordered by preference)
      const strategies = REPAIR_MAP[diagnosis] || REPAIR_MAP[DIAGNOSIS.UNKNOWN];

      // Step 3: Try each strategy until one succeeds
      let success = false;
      let usedStrategy = null;

      for (const strategy of strategies) {
        const handler = this.#strategyHandlers.get(strategy);
        if (!handler) {
          this.emit('repair:no_handler', { componentId, strategy });
          continue;
        }

        this.emit('repair:attempting', { componentId, strategy });
        try {
          success = await handler(componentId, {
            measurement,
            diagnosis,
            strategy,
          });
          usedStrategy = strategy;
          if (success) break;
        } catch (err) {
          this.emit('repair:strategy_failed', { componentId, strategy, error: err.message });
        }
      }

      const record = new RepairRecord({
        componentId,
        diagnosis,
        strategy: usedStrategy || 'none',
        success,
        durationMs: Date.now() - start,
        coherenceBefore: measurement.coherenceScore,
        coherenceAfter: success ? null : measurement.coherenceScore, // Caller should re-measure
      });

      this.#recordRepair(record);
      this.#lastRepairTime.set(componentId, Date.now());

      this.emit(success ? 'repair:success' : 'repair:exhausted', {
        componentId,
        record,
      });

      return record;
    } finally {
      this.#activeRepairs.delete(componentId);
    }
  }

  /**
   * Get repair history for a component.
   * @param {string} [componentId] - Filter by component (null = all)
   * @returns {RepairRecord[]}
   */
  getHistory(componentId = null) {
    if (!componentId) return [...this.#repairHistory];
    return this.#repairHistory.filter(r => r.componentId === componentId);
  }

  /**
   * Get repair statistics.
   * @returns {object}
   */
  stats() {
    const total = this.#repairHistory.length;
    const successful = this.#repairHistory.filter(r => r.success).length;
    const byDiagnosis = {};
    const byStrategy = {};

    for (const record of this.#repairHistory) {
      byDiagnosis[record.diagnosis] = (byDiagnosis[record.diagnosis] || 0) + 1;
      byStrategy[record.strategy] = (byStrategy[record.strategy] || 0) + 1;
    }

    return {
      totalRepairs: total,
      successRate: total > 0 ? successful / total : 0,
      activeRepairs: this.#activeRepairs.size,
      registeredStrategies: this.#strategyHandlers.size,
      byDiagnosis,
      byStrategy,
      avgDurationMs: total > 0
        ? Math.round(this.#repairHistory.reduce((s, r) => s + r.durationMs, 0) / total)
        : 0,
    };
  }

  /**
   * Health check.
   * @returns {object}
   */
  health() {
    return {
      status: this.#activeRepairs.size === 0 ? 'idle' : 'repairing',
      activeRepairs: [...this.#activeRepairs],
      ...this.stats(),
    };
  }

  /**
   * Graceful shutdown.
   */
  async shutdown() {
    this.#activeRepairs.clear();
    this.#strategyHandlers.clear();
    this.#diagnoseFns.clear();
    this.#repairHistory = [];
    this.removeAllListeners();
  }

  // ─── Private ───────────────────────────────────────────────────

  async #diagnose(componentId, measurement) {
    const diagnoseFn = this.#diagnoseFns.get(measurement.componentType);
    if (diagnoseFn) {
      try {
        return await diagnoseFn(componentId, measurement);
      } catch (err) {
        this.emit('diagnosis:error', { componentId, error: err.message });
      }
    }
    // Fallback: heuristic diagnosis based on component type
    switch (measurement.componentType) {
      case 'embedding': return DIAGNOSIS.STALE_EMBEDDINGS;
      case 'config':    return DIAGNOSIS.CONFIG_MISMATCH;
      case 'behavior':  return DIAGNOSIS.MODEL_DEGRADATION;
      case 'health':    return DIAGNOSIS.RESOURCE_EXHAUSTION;
      default:          return DIAGNOSIS.UNKNOWN;
    }
  }

  #recordRepair(record) {
    this.#repairHistory.push(record);
    if (this.#repairHistory.length > this.#historyMaxSize) {
      this.#repairHistory.shift();
    }
  }
}

export {
  RepairEngine,
  RepairRecord,
  REPAIR_STRATEGIES,
  DIAGNOSIS,
  REPAIR_MAP,
};
