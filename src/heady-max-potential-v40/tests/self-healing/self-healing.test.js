/**
 * Heady Self-Healing — Test Suite
 * Tests drift detection, coherence monitoring, repair engine, and quarantine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── φ-Math Constants ────────────────────────────────────────────
const PHI   = 1.618033988749895;
const PSI   = 1 / PHI;
const PSI2  = PSI * PSI;
const phiThreshold = (level, spread = 0.5) => 1 - Math.pow(PSI, level) * spread;

describe('DriftDetector', () => {
  describe('Baseline registration', () => {
    it('registers and stores baselines for components', () => {
      const { DriftDetector } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();

      detector.registerBaseline('embedding-service', 'embedding', {
        vector: [0.5, 0.5, 0.5, 0.5],
        qualityScore: 0.95,
      });

      const health = detector.health();
      expect(health.componentCount).toBe(1);
      expect(health.components['embedding-service']).toBeDefined();
    });
  });

  describe('Drift measurement', () => {
    it('detects healthy coherence (above HEALTHY threshold)', () => {
      const { DriftDetector, COHERENCE_THRESHOLDS } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();

      detector.registerBaseline('svc-a', 'behavior', { qualityScore: 1.0 });
      const m = detector.measure('svc-a', { qualityScore: 0.9 });

      expect(m.status).toBe('healthy');
      expect(m.coherenceScore).toBe(0.9);
      expect(m.coherenceScore).toBeGreaterThanOrEqual(COHERENCE_THRESHOLDS.HEALTHY);
    });

    it('detects drifting coherence (between DRIFTING and HEALTHY)', () => {
      const { DriftDetector, COHERENCE_THRESHOLDS } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();

      detector.registerBaseline('svc-b', 'behavior', { qualityScore: 1.0 });
      const m = detector.measure('svc-b', { qualityScore: 0.72 });

      expect(m.status).toBe('drifting');
      expect(m.coherenceScore).toBeGreaterThanOrEqual(COHERENCE_THRESHOLDS.DRIFTING);
      expect(m.coherenceScore).toBeLessThan(COHERENCE_THRESHOLDS.HEALTHY);
    });

    it('detects critical drift and triggers quarantine', () => {
      const { DriftDetector, COHERENCE_THRESHOLDS } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();

      detector.registerBaseline('svc-c', 'behavior', { qualityScore: 1.0 });
      const m = detector.measure('svc-c', { qualityScore: 0.2 });

      expect(m.status).toBe('critical');
      expect(detector.getQuarantined().has('svc-c')).toBe(true);
    });

    it('measures embedding drift via cosine similarity', () => {
      const { DriftDetector } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();

      // Baseline: unit vector
      const baseline = [1, 0, 0, 0];
      detector.registerBaseline('emb-1', 'embedding', { vector: baseline, qualityScore: 1.0 });

      // Identical = cosine 1.0
      const m1 = detector.measure('emb-1', { vector: [1, 0, 0, 0] });
      expect(m1.coherenceScore).toBeCloseTo(1.0, 3);

      // Orthogonal = cosine 0.0
      const m2 = detector.measure('emb-1', { vector: [0, 1, 0, 0] });
      expect(m2.coherenceScore).toBeCloseTo(0.0, 3);
    });

    it('measures config drift as key match ratio', () => {
      const { DriftDetector } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();

      detector.registerBaseline('cfg-1', 'config', {
        config: { a: 1, b: 2, c: 3 },
        qualityScore: 1.0,
      });

      const m = detector.measure('cfg-1', { config: { a: 1, b: 99, c: 3 } });
      expect(m.coherenceScore).toBeCloseTo(2 / 3, 3); // 2 of 3 keys match
    });
  });

  describe('Trend analysis', () => {
    it('reports insufficient data for < 2 measurements', () => {
      const { DriftDetector } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();
      detector.registerBaseline('trend-1', 'behavior', { qualityScore: 1 });

      const trend = detector.trend('trend-1');
      expect(trend.trend).toBe('insufficient_data');
    });

    it('detects improving trend', () => {
      const { DriftDetector } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();
      detector.registerBaseline('trend-2', 'behavior', { qualityScore: 1 });

      // Declining then improving
      detector.measure('trend-2', { qualityScore: 0.5 });
      detector.measure('trend-2', { qualityScore: 0.6 });
      detector.measure('trend-2', { qualityScore: 0.7 });
      detector.measure('trend-2', { qualityScore: 0.8 });
      detector.measure('trend-2', { qualityScore: 0.9 });

      const trend = detector.trend('trend-2');
      expect(trend.isImproving).toBe(true);
    });
  });

  describe('Quarantine', () => {
    it('releases components from quarantine', () => {
      const { DriftDetector } = require('../../core/self-healing/drift-detector.js');
      const detector = new DriftDetector();
      detector.registerBaseline('q-1', 'behavior', { qualityScore: 1 });

      detector.measure('q-1', { qualityScore: 0.1 }); // Critical → quarantined
      expect(detector.getQuarantined().has('q-1')).toBe(true);

      detector.release('q-1');
      expect(detector.getQuarantined().has('q-1')).toBe(false);
    });
  });

  describe('COHERENCE_THRESHOLDS', () => {
    it('uses φ-harmonic levels', () => {
      const { COHERENCE_THRESHOLDS } = require('../../core/self-healing/drift-detector.js');

      expect(COHERENCE_THRESHOLDS.HEALTHY).toBeCloseTo(phiThreshold(2), 3);
      expect(COHERENCE_THRESHOLDS.DRIFTING).toBeCloseTo(phiThreshold(1), 3);
      expect(COHERENCE_THRESHOLDS.DEGRADED).toBeCloseTo(phiThreshold(0), 3);
      expect(COHERENCE_THRESHOLDS.CRITICAL).toBeCloseTo(PSI2, 3);
    });
  });
});

describe('RepairEngine', () => {
  describe('Strategy registration', () => {
    it('registers and invokes repair strategies', async () => {
      const { RepairEngine, REPAIR_STRATEGIES } = require('../../core/self-healing/repair-engine.js');
      const engine = new RepairEngine({ repairCooldownMs: 0 });

      const handler = vi.fn(async () => true);
      engine.registerStrategy(REPAIR_STRATEGIES.RESTART, handler);

      const measurement = {
        componentId: 'svc-1',
        componentType: 'behavior',
        coherenceScore: 0.3,
        baselineScore: 1.0,
        driftDelta: 0.7,
        status: 'degraded',
      };

      const record = await engine.repair('svc-1', measurement);
      expect(record.success).toBe(true);
      expect(record.strategy).toBe(REPAIR_STRATEGIES.RESTART);
      expect(handler).toHaveBeenCalled();
      await engine.shutdown();
    });
  });

  describe('Repair cooldown', () => {
    it('prevents rapid-fire repairs on the same component', async () => {
      const { RepairEngine, REPAIR_STRATEGIES } = require('../../core/self-healing/repair-engine.js');
      const engine = new RepairEngine({ repairCooldownMs: 60000 }); // 60s cooldown

      engine.registerStrategy(REPAIR_STRATEGIES.RESTART, async () => true);
      const measurement = {
        componentId: 'svc-2',
        componentType: 'behavior',
        coherenceScore: 0.3,
        status: 'degraded',
      };

      const first = await engine.repair('svc-2', measurement);
      expect(first.success).toBe(true);

      const second = await engine.repair('svc-2', measurement); // Should be cooled down
      expect(second).toBeNull();
      await engine.shutdown();
    });
  });

  describe('Statistics', () => {
    it('tracks repair history and success rates', async () => {
      const { RepairEngine, REPAIR_STRATEGIES } = require('../../core/self-healing/repair-engine.js');
      const engine = new RepairEngine({ repairCooldownMs: 0 });

      engine.registerStrategy(REPAIR_STRATEGIES.RESTART, async () => true);
      engine.registerStrategy(REPAIR_STRATEGIES.REINDEX, async () => false);

      await engine.repair('a', { componentType: 'behavior', coherenceScore: 0.3, status: 'degraded' });

      const stats = engine.stats();
      expect(stats.totalRepairs).toBe(1);
      expect(stats.successRate).toBe(1);
      await engine.shutdown();
    });
  });
});
