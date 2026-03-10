/**
 * Heady™ Swarm Intelligence v5.0
 * Collective intelligence and consensus across multiple swarms
 * PhiVoting, CSLConsensus, ArenaBattle, pattern detection, evolution
 * 
 * @author Eric Haywood — HeadySystems Inc.
 * @license Proprietary — HeadySystems Inc.
 */

'use strict';

const EventEmitter = require('events');
const {
  PHI, PSI, PSI_SQ, fib, phiFusionScore, phiFusionWeights,
  CSL_THRESHOLDS, TIMING, EMBEDDING_DIM,
  cslAND, cslOR, getPressureLevel,
} = require('../../shared/phi-math');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('swarm-intelligence');

const MC_SIMULATIONS = fib(8);        // 21 Monte Carlo simulations
const PATTERN_STORE_SIZE = fib(14);   // 377 patterns stored
const EVOLUTION_POP_SIZE = fib(9);    // 34 candidates

class PatternStore {
  constructor(capacity = PATTERN_STORE_SIZE) {
    this.capacity = capacity;
    this.patterns = new Map();
    this.hits = new Map();
  }

  record(taskSignature, resultSignature, success) {
    const key = `${taskSignature}→${resultSignature}`;
    const existing = this.patterns.get(key) || { count: 0, successes: 0, lastSeen: 0 };
    existing.count++;
    if (success) existing.successes++;
    existing.lastSeen = Date.now();
    this.patterns.set(key, existing);

    if (this.patterns.size > this.capacity) {
      // Evict least-used pattern
      let minKey = null;
      let minCount = Infinity;
      for (const [k, v] of this.patterns) {
        if (v.count < minCount) { minCount = v.count; minKey = k; }
      }
      if (minKey) this.patterns.delete(minKey);
    }
  }

  lookup(taskSignature) {
    const matches = [];
    for (const [key, pattern] of this.patterns) {
      if (key.startsWith(taskSignature)) {
        matches.push({ pattern: key, ...pattern, successRate: pattern.count > 0 ? pattern.successes / pattern.count : 0 });
      }
    }
    return matches.sort((a, b) => b.successRate - a.successRate);
  }

  get size() { return this.patterns.size; }
}

class CollectiveMemory {
  constructor() {
    this.embeddings = new Map();  // key → Float32Array
    this.metadata = new Map();    // key → metadata
  }

  store(key, embedding, meta = {}) {
    this.embeddings.set(key, Float32Array.from(embedding));
    this.metadata.set(key, { ...meta, storedAt: Date.now() });
  }

  search(queryEmbedding, k = fib(7)) {
    const results = [];
    for (const [key, embedding] of this.embeddings) {
      const similarity = cslAND(Array.from(queryEmbedding), Array.from(embedding));
      results.push({ key, similarity, meta: this.metadata.get(key) });
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, k);
  }

  merge(otherMemory) {
    for (const [key, embedding] of otherMemory.embeddings) {
      if (!this.embeddings.has(key)) {
        this.embeddings.set(key, embedding);
        this.metadata.set(key, otherMemory.metadata.get(key));
      }
    }
  }

  get size() { return this.embeddings.size; }
}

class SwarmIntelligence extends EventEmitter {
  constructor() {
    super();
    this.swarms = new Map();
    this.patternStore = new PatternStore();
    this.collectiveMemory = new CollectiveMemory();
    this.consensusCount = 0;
    this.battleCount = 0;
    this.evolutionCount = 0;
  }

  registerSwarm(swarm) {
    this.swarms.set(swarm.id, swarm);

    swarm.on('taskCompleted', (data) => {
      this.patternStore.record(
        data.domain || 'unknown',
        data.beeId,
        true
      );
    });

    swarm.on('taskFailed', (data) => {
      this.patternStore.record(
        data.domain || 'unknown',
        data.beeId,
        false
      );
    });

    logger.info('swarm_registered', { swarmId: swarm.id, totalSwarms: this.swarms.size });
  }

  unregisterSwarm(swarmId) {
    this.swarms.delete(swarmId);
    logger.info('swarm_unregistered', { swarmId, totalSwarms: this.swarms.size });
  }

  // ─── Consensus Algorithms ────────────────────────────────────

  async phiVoting(task, swarmIds = null) {
    this.consensusCount++;
    const targetSwarms = swarmIds
      ? swarmIds.map(id => this.swarms.get(id)).filter(Boolean)
      : [...this.swarms.values()];

    if (targetSwarms.length === 0) return { consensus: false, error: 'NO_SWARMS' };

    const votes = await Promise.allSettled(
      targetSwarms.map(swarm => swarm.routeTask(task))
    );

    const validVotes = votes
      .filter(v => v.status === 'fulfilled' && v.value && v.value.success)
      .map(v => v.value);

    if (validVotes.length === 0) return { consensus: false, error: 'NO_VALID_VOTES' };

    // Phi-weighted aggregation
    const weights = phiFusionWeights(validVotes.length);
    let bestVote = validVotes[0];
    let bestScore = 0;

    for (let i = 0; i < validVotes.length; i++) {
      const score = (validVotes[i].coherence || 0.5) * weights[i];
      if (score > bestScore) {
        bestScore = score;
        bestVote = validVotes[i];
      }
    }

    logger.info('phi_voting_complete', {
      voters: validVotes.length, bestScore, winnerBee: bestVote.beeId,
    });

    return {
      consensus: true,
      method: 'PHI_VOTING',
      result: bestVote,
      voters: validVotes.length,
      weightedScore: bestScore,
    };
  }

  async cslConsensus(task, threshold = CSL_THRESHOLDS.HIGH) {
    this.consensusCount++;
    const allResults = [];

    for (const swarm of this.swarms.values()) {
      const result = await swarm.routeTask(task);
      if (result && result.success && result.result) {
        allResults.push(result);
      }
    }

    if (allResults.length === 0) return { consensus: false, error: 'NO_RESULTS' };

    // Vector superposition of all outputs (if they have embeddings)
    const hasEmbeddings = allResults.every(r => r.result && r.result.embedding);
    if (hasEmbeddings) {
      let superposed = new Array(EMBEDDING_DIM).fill(0);
      for (const result of allResults) {
        superposed = cslOR(superposed, Array.from(result.result.embedding));
      }
      // Normalize
      const mag = Math.sqrt(superposed.reduce((s, v) => s + v * v, 0));
      if (mag > 0) superposed = superposed.map(v => v / mag);

      // Check consensus against threshold
      let agreementScore = 0;
      for (const result of allResults) {
        agreementScore += cslAND(superposed, Array.from(result.result.embedding));
      }
      agreementScore /= allResults.length;

      const reached = agreementScore >= threshold;
      logger.info('csl_consensus', { reached, agreementScore, threshold, voters: allResults.length });

      return {
        consensus: reached,
        method: 'CSL_CONSENSUS',
        agreementScore,
        threshold,
        voters: allResults.length,
        superposedEmbedding: superposed,
      };
    }

    // Fallback: majority consensus by coherence
    const avgCoherence = allResults.reduce((s, r) => s + (r.coherence || 0.5), 0) / allResults.length;
    return {
      consensus: avgCoherence >= threshold,
      method: 'CSL_CONSENSUS_COHERENCE',
      agreementScore: avgCoherence,
      threshold,
      voters: allResults.length,
    };
  }

  async arenaBattle(task, swarmIds = null) {
    this.battleCount++;
    const battleId = `battle-${this.battleCount}`;
    const targetSwarms = swarmIds
      ? swarmIds.map(id => this.swarms.get(id)).filter(Boolean)
      : [...this.swarms.values()];

    logger.info('arena_battle_started', { battleId, competitors: targetSwarms.length });

    const results = await Promise.allSettled(
      targetSwarms.map(swarm => swarm.routeTask(task))
    );

    const scores = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map((r, i) => ({
        swarmId: targetSwarms[i].id,
        result: r.value,
        latencyMs: r.value.latencyMs || 0,
        coherence: r.value.coherence || 0.5,
        success: !!r.value.success,
      }))
      .filter(s => s.success);

    if (scores.length === 0) return { winner: null, battleId, error: 'ALL_FAILED' };

    // Score: phi-weighted combination of coherence and inverse latency
    for (const entry of scores) {
      const maxLatency = Math.max(...scores.map(s => s.latencyMs)) || 1;
      const speedScore = 1 - (entry.latencyMs / maxLatency);
      entry.battleScore = phiFusionScore([entry.coherence, speedScore], [PSI, 1 - PSI]);
    }

    scores.sort((a, b) => b.battleScore - a.battleScore);
    const winner = scores[0];

    logger.info('arena_battle_complete', {
      battleId, winner: winner.swarmId, score: winner.battleScore,
    });

    this.emit('battleComplete', { battleId, winner, allScores: scores });

    return {
      winner,
      battleId,
      allScores: scores,
      method: 'ARENA_BATTLE',
    };
  }

  // ─── Monte Carlo Simulation ──────────────────────────────────

  async monteCarloDecision(task, scenarioFn, numSims = MC_SIMULATIONS) {
    const results = [];

    for (let i = 0; i < numSims; i++) {
      const variation = scenarioFn(task, i);
      const result = await this._simulateExecution(variation);
      results.push(result);
    }

    const successRate = results.filter(r => r.success).length / results.length;
    const avgLatency = results.reduce((s, r) => s + (r.latencyMs || 0), 0) / results.length;
    const avgCoherence = results.reduce((s, r) => s + (r.coherence || 0.5), 0) / results.length;

    logger.info('monte_carlo_complete', {
      simulations: numSims, successRate, avgLatency, avgCoherence,
    });

    return {
      method: 'MONTE_CARLO',
      simulations: numSims,
      successRate,
      avgLatencyMs: avgLatency,
      avgCoherence,
      recommendation: successRate >= CSL_THRESHOLDS.HIGH ? 'PROCEED' : 'CAUTION',
    };
  }

  async _simulateExecution(task) {
    // Pick a random swarm to simulate
    const swarms = [...this.swarms.values()];
    if (swarms.length === 0) return { success: false, latencyMs: 0, coherence: 0 };

    const swarm = swarms[Math.floor(Math.random() * swarms.length)];
    try {
      const result = await swarm.routeTask(task);
      return { success: !!result?.success, latencyMs: result?.latencyMs || 0, coherence: result?.coherence || 0.5 };
    } catch {
      return { success: false, latencyMs: 0, coherence: 0 };
    }
  }

  // ─── Swarm Evolution ─────────────────────────────────────────

  async evolve(fitnessMetric = 'coherence') {
    this.evolutionCount++;
    const evolutionId = `evo-${this.evolutionCount}`;

    // Gather all bee configurations across swarms
    const allBees = [];
    for (const swarm of this.swarms.values()) {
      for (const bee of swarm.bees.values()) {
        allBees.push({
          swarmId: swarm.id,
          beeId: bee.id,
          domain: bee.domain,
          coherence: bee.coherenceScore,
          errorRate: bee.errorRate,
          avgLatency: bee.avgLatencyMs,
          fitness: fitnessMetric === 'coherence'
            ? bee.coherenceScore
            : phiFusionScore([bee.coherenceScore, 1 - bee.errorRate, 1 / (1 + bee.avgLatencyMs)]),
        });
      }
    }

    // Sort by fitness — keep top phi-fraction
    allBees.sort((a, b) => b.fitness - a.fitness);
    const keepCount = Math.ceil(allBees.length * PSI);
    const survivors = allBees.slice(0, keepCount);
    const toEvict = allBees.slice(keepCount).filter(b => b.fitness < CSL_THRESHOLDS.MINIMUM);

    logger.info('evolution_cycle', {
      evolutionId,
      totalBees: allBees.length,
      survivors: survivors.length,
      toEvict: toEvict.length,
    });

    this.emit('evolutionCycle', { evolutionId, survivors: survivors.length, evicted: toEvict.length });

    return {
      evolutionId,
      totalBees: allBees.length,
      survivors: survivors.length,
      evicted: toEvict.length,
      topPerformers: survivors.slice(0, fib(5)).map(b => ({
        beeId: b.beeId, domain: b.domain, fitness: b.fitness,
      })),
    };
  }

  // ─── Backpressure Propagation ────────────────────────────────

  redistributeLoad(overloadedSwarmId) {
    const overloaded = this.swarms.get(overloadedSwarmId);
    if (!overloaded) return;

    const otherSwarms = [...this.swarms.values()].filter(s => s.id !== overloadedSwarmId);
    if (otherSwarms.length === 0) return;

    // Find swarm with lowest pressure
    let bestSwarm = otherSwarms[0];
    let bestPressure = Infinity;
    for (const swarm of otherSwarms) {
      const status = swarm.getStatus();
      if (status.pressure < bestPressure) {
        bestPressure = status.pressure;
        bestSwarm = swarm;
      }
    }

    logger.info('load_redistributed', {
      from: overloadedSwarmId,
      to: bestSwarm.id,
      targetPressure: bestPressure,
    });

    this.emit('loadRedistributed', { from: overloadedSwarmId, to: bestSwarm.id });
    return bestSwarm;
  }

  // ─── Metrics ─────────────────────────────────────────────────

  getAggregateMetrics() {
    const metrics = {
      totalSwarms: this.swarms.size,
      totalBees: 0,
      activeBees: 0,
      consensusRuns: this.consensusCount,
      battleRuns: this.battleCount,
      evolutionCycles: this.evolutionCount,
      patternStoreSize: this.patternStore.size,
      collectiveMemorySize: this.collectiveMemory.size,
      swarmDetails: {},
      timestamp: new Date().toISOString(),
    };

    for (const [swarmId, swarm] of this.swarms) {
      const status = swarm.getStatus();
      metrics.totalBees += status.totalBees;
      metrics.activeBees += status.activeBees;
      metrics.swarmDetails[swarmId] = status;
    }

    return metrics;
  }
}

module.exports = { SwarmIntelligence, PatternStore, CollectiveMemory };
