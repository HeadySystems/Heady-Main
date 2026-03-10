/**
 * Heady Self-Healing — Drift Detector
 *
 * Monitors semantic coherence across all system components.
 * Detects when embeddings, configs, or agent behaviors drift from
 * their baseline, and triggers self-repair cycles.
 *
 * Drift types:
 *   - Semantic drift: embedding centroids shift beyond ψ² threshold
 *   - Config drift: runtime config diverges from declared state
 *   - Behavior drift: agent output quality degrades below CSL gate
 *   - Health drift: service metrics degrade beyond pressure levels
 *
 * Founder: Eric Haywood | HeadySystems Inc. | 51+ Provisional Patents
 * Architecture: φ-scaled, CSL-gated, Sacred Geometry v4.0
 */

import { EventEmitter } from 'events';

// ─── φ-Math Constants ────────────────────────────────────────────
const PHI   = 1.618033988749895;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const PSI3  = PSI * PSI * PSI;
const PSI4  = PSI2 * PSI2;
const FIB   = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ─── CSL Thresholds ──────────────────────────────────────────────
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;
const COHERENCE_THRESHOLDS = Object.freeze({
  HEALTHY:   phiThreshold(2),  // ≈ 0.809 — no action needed
  DRIFTING:  phiThreshold(1),  // ≈ 0.691 — alert, monitor closer
  DEGRADED:  phiThreshold(0),  // ≈ 0.500 — trigger self-repair
  CRITICAL:  PSI2,             // ≈ 0.382 — quarantine component
});

// ─── Pressure Levels ─────────────────────────────────────────────
const PRESSURE = Object.freeze({
  NOMINAL:   { min: 0,    max: PSI2 },   // 0 – 0.382
  ELEVATED:  { min: PSI2, max: PSI },     // 0.382 – 0.618
  HIGH:      { min: PSI,  max: 1 - PSI3 },// 0.618 – 0.854
  CRITICAL:  { min: 1 - PSI4, max: 1 },  // 0.910+
});

/**
 * Drift measurement for a single component.
 */
class DriftMeasurement {
  constructor({ componentId, componentType, coherenceScore, baselineScore, driftDelta, timestamp }) {
    this.componentId = componentId;
    this.componentType = componentType;
    this.coherenceScore = coherenceScore;
    this.baselineScore = baselineScore;
    this.driftDelta = driftDelta;
    this.timestamp = timestamp || Date.now();
    this.status = this.#classifyDrift();
    Object.freeze(this);
  }

  #classifyDrift() {
    if (this.coherenceScore >= COHERENCE_THRESHOLDS.HEALTHY)  return 'healthy';
    if (this.coherenceScore >= COHERENCE_THRESHOLDS.DRIFTING) return 'drifting';
    if (this.coherenceScore >= COHERENCE_THRESHOLDS.DEGRADED) return 'degraded';
    return 'critical';
  }
}

/**
 * DriftDetector — monitors components for semantic/behavioral drift.
 */
class DriftDetector extends EventEmitter {
  #baselines = new Map();
  #measurements = new Map();
  #checkInterval = null;
  #repairCallbacks = new Map();
  #quarantined = new Set();
  #historySize = FIB[9]; // 34 measurements per component
  #checkIntervalMs;

  constructor(options = {}) {
    super();
    this.#checkIntervalMs = options.checkIntervalMs || Math.round(PHI * FIB[8] * 1000); // ≈ 34s
  }

  /**
   * Register a baseline for a component.
   * @param {string} componentId
   * @param {string} componentType - 'embedding' | 'config' | 'behavior' | 'health'
   * @param {object} baseline - { vector?, config?, metrics?, qualityScore? }
   */
  registerBaseline(componentId, componentType, baseline) {
    this.#baselines.set(componentId, {
      componentType,
      baseline: Object.freeze({ ...baseline }),
      registeredAt: Date.now(),
    });
    this.#measurements.set(componentId, []);
    this.emit('baseline:registered', { componentId, componentType });
  }

  /**
   * Register a repair callback for a component type.
   * @param {string} componentType
   * @param {Function} repairFn - async (componentId, measurement) => boolean
   */
  registerRepairCallback(componentType, repairFn) {
    this.#repairCallbacks.set(componentType, repairFn);
  }

  /**
   * Measure current coherence of a component against its baseline.
   * @param {string} componentId
   * @param {object} currentState - { vector?, config?, metrics?, qualityScore? }
   * @returns {DriftMeasurement}
   */
  measure(componentId, currentState) {
    const entry = this.#baselines.get(componentId);
    if (!entry) {
      throw new Error(`No baseline registered for component: ${componentId}`);
    }

    const { componentType, baseline } = entry;
    let coherenceScore = 0;

    switch (componentType) {
      case 'embedding':
        coherenceScore = this.#cosineSimilarity(baseline.vector, currentState.vector);
        break;
      case 'config':
        coherenceScore = this.#configCoherence(baseline.config, currentState.config);
        break;
      case 'behavior':
        coherenceScore = currentState.qualityScore || 0;
        break;
      case 'health':
        coherenceScore = this.#healthCoherence(baseline.metrics, currentState.metrics);
        break;
      default:
        coherenceScore = currentState.qualityScore || 0;
    }

    const driftDelta = (baseline.qualityScore || 1) - coherenceScore;
    const measurement = new DriftMeasurement({
      componentId,
      componentType,
      coherenceScore,
      baselineScore: baseline.qualityScore || 1,
      driftDelta,
    });

    // Store in ring buffer
    const history = this.#measurements.get(componentId) || [];
    history.push(measurement);
    if (history.length > this.#historySize) {
      history.shift();
    }
    this.#measurements.set(componentId, history);

    // Emit events based on status
    this.emit('drift:measured', measurement);

    if (measurement.status === 'drifting') {
      this.emit('drift:alert', measurement);
    } else if (measurement.status === 'degraded') {
      this.emit('drift:degraded', measurement);
      this.#triggerRepair(componentId, measurement);
    } else if (measurement.status === 'critical') {
      this.emit('drift:critical', measurement);
      this.#quarantine(componentId, measurement);
    }

    return measurement;
  }

  /**
   * Get drift trend for a component (sliding window average).
   * @param {string} componentId
   * @returns {object} { trend, avgCoherence, measurementCount, isImproving }
   */
  trend(componentId) {
    const history = this.#measurements.get(componentId) || [];
    if (history.length < 2) return { trend: 'insufficient_data', avgCoherence: 0, measurementCount: history.length, isImproving: null };

    const recent = history.slice(-FIB[5]); // Last 5 measurements
    const older = history.slice(-FIB[7], -FIB[5]); // Previous 8-5 = measurements before last 5

    const avgRecent = recent.reduce((s, m) => s + m.coherenceScore, 0) / recent.length;
    const avgOlder = older.length > 0
      ? older.reduce((s, m) => s + m.coherenceScore, 0) / older.length
      : avgRecent;

    return {
      trend: avgRecent >= avgOlder ? 'improving' : 'declining',
      avgCoherence: avgRecent,
      measurementCount: history.length,
      isImproving: avgRecent >= avgOlder,
    };
  }

  /**
   * Start continuous drift monitoring.
   */
  startMonitoring() {
    if (this.#checkInterval) return;
    this.#checkInterval = setInterval(() => {
      this.emit('monitor:cycle_start');
      // Subclasses or external callers should call measure() for each component
      this.emit('monitor:cycle_end');
    }, this.#checkIntervalMs);
    this.emit('monitor:started', { intervalMs: this.#checkIntervalMs });
  }

  /**
   * Stop continuous monitoring.
   */
  stopMonitoring() {
    if (this.#checkInterval) {
      clearInterval(this.#checkInterval);
      this.#checkInterval = null;
      this.emit('monitor:stopped');
    }
  }

  /**
   * Get all quarantined components.
   * @returns {Set<string>}
   */
  getQuarantined() {
    return new Set(this.#quarantined);
  }

  /**
   * Release a component from quarantine (after manual fix or auto-repair success).
   * @param {string} componentId
   */
  release(componentId) {
    this.#quarantined.delete(componentId);
    this.emit('quarantine:released', { componentId });
  }

  /**
   * Health status of the drift detector itself.
   * @returns {object}
   */
  health() {
    const components = {};
    for (const [id, history] of this.#measurements) {
      const latest = history[history.length - 1];
      components[id] = {
        status: latest?.status || 'unknown',
        coherenceScore: latest?.coherenceScore || 0,
        measurementCount: history.length,
        quarantined: this.#quarantined.has(id),
      };
    }
    return {
      status: this.#quarantined.size === 0 ? 'healthy' : 'degraded',
      monitoringActive: this.#checkInterval !== null,
      componentCount: this.#baselines.size,
      quarantinedCount: this.#quarantined.size,
      components,
    };
  }

  /**
   * Graceful shutdown.
   */
  async shutdown() {
    this.stopMonitoring();
    this.#baselines.clear();
    this.#measurements.clear();
    this.#repairCallbacks.clear();
    this.#quarantined.clear();
    this.removeAllListeners();
  }

  // ─── Private Methods ───────────────────────────────────────────

  #cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  #configCoherence(baseline, current) {
    if (!baseline || !current) return 0;
    const baseKeys = Object.keys(baseline);
    if (baseKeys.length === 0) return 1;
    let matching = 0;
    for (const key of baseKeys) {
      if (JSON.stringify(baseline[key]) === JSON.stringify(current[key])) {
        matching++;
      }
    }
    return matching / baseKeys.length;
  }

  #healthCoherence(baselineMetrics, currentMetrics) {
    if (!baselineMetrics || !currentMetrics) return 0;
    const keys = Object.keys(baselineMetrics);
    if (keys.length === 0) return 1;
    let totalRatio = 0;
    for (const key of keys) {
      const base = baselineMetrics[key] || 1;
      const curr = currentMetrics[key] || 0;
      // Ratio clamped to [0, 1]: how close is current to baseline
      totalRatio += Math.min(curr / base, base / curr, 1);
    }
    return totalRatio / keys.length;
  }

  async #triggerRepair(componentId, measurement) {
    const repairFn = this.#repairCallbacks.get(measurement.componentType);
    if (!repairFn) {
      this.emit('repair:no_handler', { componentId, componentType: measurement.componentType });
      return;
    }

    this.emit('repair:started', { componentId });
    try {
      const success = await repairFn(componentId, measurement);
      this.emit(success ? 'repair:success' : 'repair:failed', { componentId });
      if (!success) {
        this.#quarantine(componentId, measurement);
      }
    } catch (err) {
      this.emit('repair:error', { componentId, error: err.message });
      this.#quarantine(componentId, measurement);
    }
  }

  #quarantine(componentId, measurement) {
    this.#quarantined.add(componentId);
    this.emit('quarantine:active', {
      componentId,
      coherenceScore: measurement.coherenceScore,
      reason: `Drift below critical threshold (${COHERENCE_THRESHOLDS.CRITICAL.toFixed(3)})`,
    });
  }
}

export {
  DriftDetector,
  DriftMeasurement,
  COHERENCE_THRESHOLDS,
  PRESSURE,
};
