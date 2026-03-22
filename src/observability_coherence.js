// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: src/observability_coherence.js
// LAYER: backend/src — observability
// HEADY_BRAND:END

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ∞ OBSERVABILITY COHERENCE ENGINE ∞                                       ║
 * ║     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                       ║
 * ║     Phi-weighted coherence scoring across all nodes.                         ║
 * ║     Alerts when coherence drifts below 0.809 (CSL MEDIUM threshold).        ║
 * ║                                                                               ║
 * ║     Ref: Master Playbook A-2 / Deep Research §5.1                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const PHI = 1.618033988749895;

// CSL Threshold mapping
const CSL_THRESHOLDS = {
  CRITICAL: 0.927,
  HIGH: 0.882,
  MEDIUM: 0.809,   // coherence drift floor — triggers alert
  LOW: 0.691,
  MINIMUM: 0.618,  // 1/φ
};

// Pool weights: phi-harmonic (Hot = φ², Warm = φ, Cold = 1)
const POOL_WEIGHTS = {
  hot: PHI * PHI,   // ~2.618
  warm: PHI,         // ~1.618
  cold: 1,
};

/**
 * Compute phi-weighted coherence score from multiple signal dimensions.
 *
 * coherence = Σ(weight_i × score_i) / Σ(weight_i)
 *
 * @param {Object} signals
 * @param {number} signals.latencyMs     — request latency in ms (lower is better)
 * @param {number} signals.errorRate     — error rate 0-1 (lower is better)
 * @param {number} signals.memoryUtil    — memory utilization 0-1 (lower is better)
 * @param {number} [signals.cslScore]    — direct CSL cosine similarity score
 * @param {string} [pool='hot']          — pool designation for weight selection
 * @returns {Object} — { coherence, level, alert, signals }
 */
function computeCoherence({ latencyMs, errorRate, memoryUtil, cslScore, pool = 'hot' }) {
  const w = POOL_WEIGHTS[pool] ?? 1;

  // Normalize each signal to [0, 1]
  const latencyScore = Math.max(0, 1 - (latencyMs / 5000));
  const errorScore = Math.max(0, 1 - errorRate);
  const memScore = Math.max(0, 1 - memoryUtil);

  // Phi-weighted harmonic mean
  const wLatency = w;
  const wError = w;
  const wMem = 1 / PHI;  // memory is less critical

  let numerator = wLatency * latencyScore + wError * errorScore + wMem * memScore;
  let denominator = wLatency + wError + wMem;

  // If direct CSL score is provided, use φ² weight (highest)
  if (typeof cslScore === 'number') {
    const wCsl = PHI * PHI;
    numerator += wCsl * cslScore;
    denominator += wCsl;
  }

  const coherence = numerator / denominator;

  // Map to CSL threshold levels
  let level;
  if (coherence >= CSL_THRESHOLDS.CRITICAL) level = 'CRITICAL_HEALTHY';
  else if (coherence >= CSL_THRESHOLDS.HIGH) level = 'HIGH';
  else if (coherence >= CSL_THRESHOLDS.MEDIUM) level = 'MEDIUM';
  else if (coherence >= CSL_THRESHOLDS.LOW) level = 'LOW';
  else level = 'MINIMUM';

  return {
    coherence: Math.round(coherence * 10000) / 10000,
    level,
    alert: coherence < CSL_THRESHOLDS.MEDIUM,
    pool,
    signals: {
      latency: { raw: latencyMs, normalized: Math.round(latencyScore * 1000) / 1000 },
      error: { raw: errorRate, normalized: Math.round(errorScore * 1000) / 1000 },
      memory: { raw: memoryUtil, normalized: Math.round(memScore * 1000) / 1000 },
      ...(typeof cslScore === 'number' ? { csl: { raw: cslScore } } : {}),
    },
  };
}

/**
 * Aggregate coherence across multiple nodes.
 * Returns system-level coherence + per-node breakdown + any alerts.
 *
 * @param {Array<{nodeId: string, signals: Object, pool?: string}>} nodes
 * @returns {Object}
 */
function systemCoherence(nodes) {
  const results = nodes.map((node) => ({
    nodeId: node.nodeId,
    ...computeCoherence({ ...node.signals, pool: node.pool }),
  }));

  const alerts = results.filter((r) => r.alert);
  const avgCoherence = results.reduce((sum, r) => sum + r.coherence, 0) / results.length;

  let systemLevel;
  if (avgCoherence >= CSL_THRESHOLDS.CRITICAL) systemLevel = 'CRITICAL_HEALTHY';
  else if (avgCoherence >= CSL_THRESHOLDS.HIGH) systemLevel = 'HIGH';
  else if (avgCoherence >= CSL_THRESHOLDS.MEDIUM) systemLevel = 'MEDIUM';
  else if (avgCoherence >= CSL_THRESHOLDS.LOW) systemLevel = 'LOW';
  else systemLevel = 'MINIMUM';

  return {
    systemCoherence: Math.round(avgCoherence * 10000) / 10000,
    systemLevel,
    systemAlert: avgCoherence < CSL_THRESHOLDS.MEDIUM,
    nodeCount: results.length,
    alertCount: alerts.length,
    alerts: alerts.map((a) => ({ nodeId: a.nodeId, coherence: a.coherence, level: a.level })),
    nodes: results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Express route handler for coherence endpoint.
 * GET /api/coherence — returns system coherence snapshot
 */
function registerCoherenceRoutes(app, getNodeSignals) {
  app.get('/api/coherence', async (req, res) => {
    try {
      const nodes = await getNodeSignals();
      const result = systemCoherence(nodes);
      const status = result.systemAlert ? 503 : 200;
      res.status(status).json({ ok: !result.systemAlert, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = {
  computeCoherence,
  systemCoherence,
  registerCoherenceRoutes,
  CSL_THRESHOLDS,
  POOL_WEIGHTS,
  PHI,
};
