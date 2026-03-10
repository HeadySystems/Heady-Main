'use strict';

const { BeeFactory } = require('../bees/bee-factory');
const { CircuitBreaker } = require('../resilience/circuit-breaker');
const { Bulkhead } = require('../resilience/bulkhead');
const { cosineSimilarity } = require('../../shared/csl-engine');
const { PSI, fib, pressureLevel } = require('../../shared/phi-math');

class LiquidOrchestrator {
  constructor(options = {}) {
    this.beeFactory = options.beeFactory || new BeeFactory();
    this.bulkhead = options.bulkhead || new Bulkhead('liquid-orchestrator');
    this.providerBreakers = new Map();
    this.providers = options.providers || [
      { id: 'CloudflareWorkers', capabilities: [0.9, 0.8, 0.7, 0.5] },
      { id: 'CloudRun', capabilities: [0.8, 0.9, 0.8, 0.7] },
      { id: 'ColabBurst', capabilities: [0.5, 0.4, 0.7, 1.0] }
    ];
  }

  getBreaker(providerId) {
    if (!this.providerBreakers.has(providerId)) {
      this.providerBreakers.set(providerId, new CircuitBreaker(providerId));
    }
    return this.providerBreakers.get(providerId);
  }

  chooseProvider(taskVector) {
    const ranked = this.providers
      .map((provider) => ({ provider, score: cosineSimilarity(provider.capabilities, taskVector) }))
      .sort((left, right) => right.score - left.score);
    if (ranked.length === 0 || ranked[0].score < PSI) {
      return this.providers[0];
    }
    return ranked[0].provider;
  }

  async execute(task, options = {}) {
    const taskVector = options.taskVector || [1, 0, 0, 0];
    const provider = this.chooseProvider(taskVector);
    const breaker = this.getBreaker(provider.id);
    const bee = await this.beeFactory.spawn(options.swarm || 'core', async (payload) => ({
      provider: provider.id,
      payload,
      completedAt: new Date().toISOString()
    }));
    return this.bulkhead.execute(() => breaker.execute(() => bee.run(task)));
  }

  snapshot() {
    const beeSnapshot = this.beeFactory.snapshot();
    const loadRatio = beeSnapshot.totalBees / Math.max(1, beeSnapshot.maxConcurrentBees);
    return {
      bees: beeSnapshot,
      pressure: pressureLevel(loadRatio),
      providers: this.providers.map((provider) => ({
        id: provider.id,
        breaker: this.getBreaker(provider.id).snapshot()
      })),
      queueCeiling: fib(11)
    };
  }
}

module.exports = { LiquidOrchestrator };
