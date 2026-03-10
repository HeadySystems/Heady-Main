/**
 * @fileoverview BeeFactory - Worker agent instantiation and lifecycle
 */
import { CSL_THRESHOLDS, cslGate, fib } from '../shared/phi-math.js';

export class BeeFactory {
  constructor() {
    this._activeBees = new Map();
    this._beePerformance = new Map();
    this._spawnThreshold = 1 / Math.pow(1.618, 1); // φ⁻¹ ≈ 0.618
    this._retireThreshold = 1 / Math.pow(1.618, 2); // φ⁻² ≈ 0.382
  }

  /**
   * Spawn bee with CSL confidence gate
   */
  async spawnBee(beeType, swarmId, confidence) {
    // CSL gate: only spawn if confidence > φ⁻¹
    if (confidence < this._spawnThreshold) {
      return null;
    }

    const beeId = `${swarmId}-${beeType}-${Date.now()}`;
    const bee = {
      id: beeId,
      type: beeType,
      swarmId,
      spawnedAt: Date.now(),
      tasksCompleted: 0,
      performance: { success: 0, failure: 0, avgLatency: 0 }
    };

    this._activeBees.set(beeId, bee);
    return bee;
  }

  /**
   * Track bee performance
   */
  recordBeePerformance(beeId, success, latency) {
    const bee = this._activeBees.get(beeId);
    if (!bee) return;

    bee.tasksCompleted++;
    bee.performance.success += success ? 1 : 0;
    bee.performance.failure += success ? 0 : 1;

    const total = bee.performance.success + bee.performance.failure;
    const successRate = bee.performance.success / total;

    // Auto-retire if performance < φ⁻²
    if (successRate < this._retireThreshold && total > 10) {
      this.retireBee(beeId);
    }
  }

  /**
   * Retire underperforming bee
   */
  retireBee(beeId) {
    const bee = this._activeBees.get(beeId);
    if (bee) {
      this._beePerformance.set(beeId, bee.performance);
      this._activeBees.delete(beeId);
    }
  }

  /**
   * Get active bees for swarm
   */
  getSwarmBees(swarmId) {
    return Array.from(this._activeBees.values())
      .filter(b => b.swarmId === swarmId);
  }

  /**
   * Dynamic pool sizing (phi-scaled)
   * Formula: pool_size = base × φ^(load/max)
   */
  calculatePoolSize(baseSize, load, maxLoad) {
    const PHI = 1.618;
    const ratio = Math.min(load / maxLoad, 1);
    return Math.ceil(baseSize * Math.pow(PHI, ratio));
  }
}
