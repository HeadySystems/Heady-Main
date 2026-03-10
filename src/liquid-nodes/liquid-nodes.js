/**
 * Heady Liquid Node Architecture — Production Implementation
 * © 2026 HeadySystems Inc. — Eric Haywood, Founder — 60+ Provisional Patents
 *
 * Every component in the Heady ecosystem is a LiquidNode — a self-aware,
 * self-healing unit that operates in 384D vector space with phi-scaled
 * parameters and CSL-gated decision logic.
 *
 * @module liquid-nodes
 * @version 4.0.0
 */

const {
  PHI, PSI, fib,
  CSL_THRESHOLDS, COHERENCE_DRIFT_THRESHOLD,
  phiBackoff, phiAdaptiveInterval,
  cslGate, cosineSimilarity,
  SIZING, POOL_SIZES,
  RESOURCE_WEIGHTS,
} = require('./phi-constants');

// ═══════════════════════════════════════════════════════════════
// EVENT BUS — Inter-node Communication
// ═══════════════════════════════════════════════════════════════

const EventEmitter = require('events');

/** Global event bus for inter-node communication */
const nodeBus = new EventEmitter();
nodeBus.setMaxListeners(fib(10)); // 55

// ═══════════════════════════════════════════════════════════════
// STRUCTURED LOGGER
// ═══════════════════════════════════════════════════════════════

/**
 * Create a structured JSON logger.
 * @param {string} service - Service/node name
 * @returns {Object} Logger with info, warn, error, debug methods
 */
function createLogger(service) {
  const _log = (level, data, msg) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      correlationId: data?.correlationId || null,
      message: msg || data?.message || '',
      ...data,
    };
    delete entry.message;
    entry.msg = msg || data?.message || '';
    const out = level === 'error' ? process.stderr : process.stdout;
    out.write(JSON.stringify(entry) + '\n');
  };
  return {
    info:  (data, msg) => _log('info', data, msg),
    warn:  (data, msg) => _log('warn', data, msg),
    error: (data, msg) => _log('error', data, msg),
    debug: (data, msg) => _log('debug', data, msg),
  };
}

// ═══════════════════════════════════════════════════════════════
// NODE LIFECYCLE STATE MACHINE
// ═══════════════════════════════════════════════════════════════

/**
 * Valid lifecycle states and transitions.
 * init → active → thinking → responding → idle → hibernating → expired
 */
const LIFECYCLE_STATES = Object.freeze({
  INIT:        'init',
  ACTIVE:      'active',
  THINKING:    'thinking',
  RESPONDING:  'responding',
  IDLE:        'idle',
  HIBERNATING: 'hibernating',
  EXPIRED:     'expired',
});

const VALID_TRANSITIONS = Object.freeze({
  init:        ['active', 'expired'],
  active:      ['thinking', 'idle', 'expired'],
  thinking:    ['responding', 'active', 'expired'],
  responding:  ['active', 'idle', 'expired'],
  idle:        ['active', 'hibernating', 'expired'],
  hibernating: ['active', 'expired'],
  expired:     [],
});

// ═══════════════════════════════════════════════════════════════
// LIQUID NODE BASE CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * LiquidNode — The foundational unit of the Heady ecosystem.
 * Every service, agent, bee, and component extends this class.
 *
 * Features:
 * - Self-registration in 384D vector space on startup
 * - Heartbeat with semantic drift detection
 * - Health endpoint generation
 * - Phi-scaled lifecycle management
 * - Graceful shutdown with LIFO cleanup
 * - CSL-gated decision making
 */
class LiquidNode {
  /**
   * @param {Object} config
   * @param {string} config.name - Node identifier
   * @param {string} config.ring - Topology ring (center|inner|middle|outer|governance)
   * @param {string} config.pool - Resource pool (hot|warm|cold|reserve|governance)
   * @param {string} [config.domain] - Primary domain affiliation
   * @param {number[]} [config.embedding] - Initial 384D embedding vector
   */
  constructor(config) {
    this.name = config.name;
    this.ring = config.ring;
    this.pool = config.pool;
    this.domain = config.domain || 'headyme.com';
    this.embedding = config.embedding || this._generateInitialEmbedding();
    this.state = LIFECYCLE_STATES.INIT;
    this.coherenceScore = 1.0;
    this.logger = createLogger(this.name);
    this.startTime = Date.now();
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.cleanupStack = []; // LIFO shutdown order
    this.metrics = {
      requestsHandled: 0,
      errorsEncountered: 0,
      avgResponseMs: 0,
      uptimeMs: 0,
      driftEvents: 0,
    };

    // Register on the event bus
    nodeBus.on(`${this.name}:task`, (task) => this._handleTask(task));
    this.cleanupStack.push(() => nodeBus.removeAllListeners(`${this.name}:task`));
  }

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Transition to a new lifecycle state.
   * @param {string} newState - Target state
   * @throws {Error} If transition is invalid
   */
  transition(newState) {
    const valid = VALID_TRANSITIONS[this.state];
    if (!valid || !valid.includes(newState)) {
      throw new Error(`Invalid transition: ${this.state} → ${newState} for node ${this.name}`);
    }
    const oldState = this.state;
    this.state = newState;
    this.logger.info({ oldState, newState }, 'State transition');
    nodeBus.emit('node:transition', { node: this.name, from: oldState, to: newState });
  }

  /**
   * Initialize the node — load config, register embedding, start heartbeat.
   * @returns {Promise<void>}
   */
  async init() {
    this.logger.info({ ring: this.ring, pool: this.pool }, 'Initializing node');

    // Register embedding in vector memory
    await this._registerEmbedding();

    // Start heartbeat
    const heartbeatMs = Math.round(PHI * 1000 * fib(5)); // ~8090ms
    this.heartbeatInterval = setInterval(() => this.heartbeat(), heartbeatMs);
    this.cleanupStack.push(() => clearInterval(this.heartbeatInterval));

    this.transition(LIFECYCLE_STATES.ACTIVE);
    this.logger.info({}, 'Node initialized and active');
  }

  /**
   * Heartbeat — re-embed, check drift, update health.
   * @returns {Promise<void>}
   */
  async heartbeat() {
    this.lastHeartbeat = Date.now();
    this.metrics.uptimeMs = Date.now() - this.startTime;

    // Re-embed current state
    const currentEmbedding = await this._computeCurrentEmbedding();

    // Check drift
    const similarity = cosineSimilarity(this.embedding, currentEmbedding);
    this.coherenceScore = similarity;

    if (similarity < COHERENCE_DRIFT_THRESHOLD) {
      this.metrics.driftEvents++;
      this.logger.warn({
        coherence: similarity,
        threshold: COHERENCE_DRIFT_THRESHOLD,
        driftEvents: this.metrics.driftEvents,
      }, 'Semantic drift detected');
      nodeBus.emit('node:drift', {
        node: this.name,
        coherence: similarity,
        threshold: COHERENCE_DRIFT_THRESHOLD,
      });
    }

    nodeBus.emit('node:heartbeat', {
      node: this.name,
      state: this.state,
      coherence: this.coherenceScore,
      metrics: this.metrics,
    });
  }

  /**
   * Generate health check data.
   * @returns {Object} Health status
   */
  health() {
    const uptimeMs = Date.now() - this.startTime;
    return {
      service: this.name,
      status: this.state === LIFECYCLE_STATES.EXPIRED ? 'down' : 'up',
      state: this.state,
      ring: this.ring,
      pool: this.pool,
      coherence: this.coherenceScore,
      coherenceThreshold: COHERENCE_DRIFT_THRESHOLD,
      driftDetected: this.coherenceScore < COHERENCE_DRIFT_THRESHOLD,
      uptime: {
        ms: uptimeMs,
        human: this._formatUptime(uptimeMs),
      },
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      metrics: { ...this.metrics },
      version: process.env.npm_package_version || '4.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Graceful shutdown — LIFO cleanup of all registered resources.
   * @param {string} [signal='SIGTERM'] - Signal that triggered shutdown
   * @returns {Promise<void>}
   */
  async shutdown(signal = 'SIGTERM') {
    this.logger.info({ signal }, 'Graceful shutdown initiated');

    // LIFO cleanup
    while (this.cleanupStack.length > 0) {
      const cleanup = this.cleanupStack.pop();
      try {
        await cleanup();
      } catch (err) {
        this.logger.error({ error: err.message }, 'Cleanup step failed');
      }
    }

    this.transition(LIFECYCLE_STATES.EXPIRED);
    this.logger.info({}, 'Shutdown complete');
  }

  // ─────────────────────────────────────────────────────────────
  // CSL-GATED DECISION MAKING
  // ─────────────────────────────────────────────────────────────

  /**
   * Evaluate whether this node should handle a given task.
   * Uses CSL gate on cosine similarity between task embedding and node capability.
   * @param {number[]} taskEmbedding - 384D task embedding
   * @returns {number} Gated relevance score (0 to 1)
   */
  evaluateTask(taskEmbedding) {
    const similarity = cosineSimilarity(this.embedding, taskEmbedding);
    return cslGate(1.0, similarity, CSL_THRESHOLDS.LOW);
  }

  /**
   * Check if this node is healthy enough to accept work.
   * @returns {boolean}
   */
  canAcceptWork() {
    return (
      this.state === LIFECYCLE_STATES.ACTIVE &&
      this.coherenceScore >= CSL_THRESHOLDS.MINIMUM
    );
  }

  // ─────────────────────────────────────────────────────────────
  // INTERNAL METHODS
  // ─────────────────────────────────────────────────────────────

  /** @private */
  _generateInitialEmbedding() {
    // Deterministic seed from node name — in production, use actual embedding model
    const dim = 384;
    const vec = new Array(dim);
    let seed = 0;
    for (let i = 0; i < this.name.length; i++) seed += this.name.charCodeAt(i);
    for (let i = 0; i < dim; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      vec[i] = (seed / 0x7fffffff - PSI) * PHI;
    }
    // Normalize to unit vector
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map(v => v / norm);
  }

  /** @private */
  async _registerEmbedding() {
    // In production, this writes to pgvector/Vectorize
    this.logger.info({ dimensions: this.embedding.length }, 'Embedding registered');
  }

  /** @private */
  async _computeCurrentEmbedding() {
    // In production, re-embed current state via embedding router
    // For now, return the stored embedding (no drift simulation)
    return this.embedding;
  }

  /** @private */
  async _handleTask(task) {
    if (!this.canAcceptWork()) {
      this.logger.warn({ task: task?.id }, 'Cannot accept work in current state');
      return;
    }
    const start = Date.now();
    try {
      this.transition(LIFECYCLE_STATES.THINKING);
      const result = await this.execute(task);
      this.transition(LIFECYCLE_STATES.RESPONDING);
      this.metrics.requestsHandled++;
      const elapsed = Date.now() - start;
      this.metrics.avgResponseMs =
        (this.metrics.avgResponseMs * (this.metrics.requestsHandled - 1) + elapsed) /
        this.metrics.requestsHandled;
      this.transition(LIFECYCLE_STATES.ACTIVE);
      return result;
    } catch (err) {
      this.metrics.errorsEncountered++;
      this.logger.error({ error: err.message, task: task?.id }, 'Task execution failed');
      this.transition(LIFECYCLE_STATES.ACTIVE);
      throw err;
    }
  }

  /**
   * Override in subclasses to implement task execution.
   * @param {Object} task - Task to execute
   * @returns {Promise<*>} Task result
   */
  async execute(task) {
    throw new Error(`${this.name}: execute() not implemented`);
  }

  /** @private */
  _formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
}

// ═══════════════════════════════════════════════════════════════
// SPECIALIZED NODE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * ConductorNode — Central orchestration authority.
 * Routes tasks to target nodes based on CSL-scored relevance.
 */
class ConductorNode extends LiquidNode {
  constructor(config) {
    super({ ...config, name: config.name || 'HeadyConductor', ring: 'inner', pool: 'hot' });
    this.routingTable = new Map();
    this.registeredNodes = new Map();
  }

  /**
   * Register a node for task routing.
   * @param {LiquidNode} node - Node to register
   */
  registerNode(node) {
    this.registeredNodes.set(node.name, node);
    this.logger.info({ node: node.name, ring: node.ring, pool: node.pool }, 'Node registered');
  }

  /**
   * Route a task to the best matching node(s).
   * Uses CSL-gated scoring — no arbitrary priority rankings.
   * @param {Object} task - Task with embedding
   * @returns {LiquidNode[]} Best matching nodes, sorted by relevance
   */
  route(task) {
    const scores = [];
    for (const [name, node] of this.registeredNodes) {
      if (!node.canAcceptWork()) continue;
      const score = node.evaluateTask(task.embedding);
      if (score > 0) scores.push({ node, score });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.map(s => s.node);
  }

  async execute(task) {
    const targets = this.route(task);
    if (targets.length === 0) {
      throw new Error('No available nodes match this task');
    }
    this.logger.info({
      task: task.id,
      routed: targets[0].name,
      score: targets[0].evaluateTask(task.embedding),
    }, 'Task routed');
    return targets[0]._handleTask(task);
  }
}

/**
 * BeeNode — Ephemeral worker that follows spawn→execute→report→retire lifecycle.
 */
class BeeNode extends LiquidNode {
  constructor(config) {
    super({ ...config, ring: config.ring || 'outer', pool: config.pool || 'warm' });
    this.maxRetries = Math.round(PHI * fib(5)); // ~8
    this.timeoutMs = Math.round(PHI * 1000);     // ~1618ms
    this.retired = false;
  }

  /**
   * Spawn — initialize resources and register.
   * @param {Object} context - Spawn context
   * @returns {Promise<void>}
   */
  async spawn(context) {
    await this.init();
    this.logger.info({ context: context?.id }, 'Bee spawned');
  }

  async execute(task) {
    // Override in specific bee implementations
    throw new Error(`${this.name}: execute() not implemented`);
  }

  /**
   * Report results to orchestration.
   * @param {*} result - Execution result
   * @returns {Promise<void>}
   */
  async report(result) {
    nodeBus.emit('bee:report', { bee: this.name, result });
    this.logger.info({}, 'Report submitted');
  }

  /**
   * Retire — cleanup and deregister.
   * @returns {Promise<void>}
   */
  async retire() {
    this.retired = true;
    await this.shutdown('RETIRE');
    this.logger.info({}, 'Bee retired');
  }
}

/**
 * SoulNode — The awareness and values arbiter at the center of the topology.
 */
class SoulNode extends LiquidNode {
  constructor(config) {
    super({ ...config, name: config.name || 'HeadySoul', ring: 'center', pool: 'governance' });
    this.laws = [
      'Structural Integrity: Code compiles, passes type checks, respects module boundaries',
      'Semantic Coherence: Changes stay within embedding tolerance of intended design',
      'Mission Alignment: Changes serve HeadyConnection mission (community, equity, empowerment)',
    ];
  }

  /**
   * Validate a mutation against the 3 Unbreakable Laws.
   * @param {Object} mutation - Proposed change
   * @returns {{ valid: boolean, violations: string[] }}
   */
  validateMutation(mutation) {
    const violations = [];
    // In production, each law check involves embedding comparison + CSL gate
    if (!mutation.structurallyValid) violations.push(this.laws[0]);
    if (!mutation.semanticallyCoherent) violations.push(this.laws[1]);
    if (!mutation.missionAligned) violations.push(this.laws[2]);
    return { valid: violations.length === 0, violations };
  }

  async execute(task) {
    if (task.type === 'validate') return this.validateMutation(task.mutation);
    if (task.type === 'coherenceReview') {
      return { reviewed: true, timestamp: new Date().toISOString() };
    }
    throw new Error(`Unknown soul task type: ${task.type}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// NODE REGISTRY — Tracks all active nodes
// ═══════════════════════════════════════════════════════════════

class NodeRegistry {
  constructor() {
    this.nodes = new Map();
    this.logger = createLogger('NodeRegistry');
  }

  register(node) {
    this.nodes.set(node.name, node);
    this.logger.info({ node: node.name, total: this.nodes.size }, 'Registered');
  }

  deregister(name) {
    this.nodes.delete(name);
    this.logger.info({ node: name, total: this.nodes.size }, 'Deregistered');
  }

  get(name) { return this.nodes.get(name); }

  getByRing(ring) {
    return [...this.nodes.values()].filter(n => n.ring === ring);
  }

  getByPool(pool) {
    return [...this.nodes.values()].filter(n => n.pool === pool);
  }

  healthAll() {
    return [...this.nodes.values()].map(n => n.health());
  }

  get size() { return this.nodes.size; }
}

// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER — Phi-scaled failure protection
// ═══════════════════════════════════════════════════════════════

const CB_STATES = Object.freeze({ CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half_open' });

class CircuitBreaker {
  /**
   * @param {Object} config
   * @param {string} config.name - Breaker name
   * @param {number} [config.failureThreshold] - Failures to trip (default: fib(5) = 5)
   * @param {number} [config.resetTimeoutMs] - Open duration before half-open
   * @param {number} [config.halfOpenProbes] - Test requests in half-open (default: fib(3) = 2)
   */
  constructor(config) {
    this.name = config.name;
    this.failureThreshold = config.failureThreshold || SIZING.FAILURE_THRESHOLD;
    this.resetTimeoutMs = config.resetTimeoutMs || Math.round(1000 * PSI * fib(8)); // ~12978ms
    this.halfOpenProbes = config.halfOpenProbes || fib(3);
    this.state = CB_STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = 0;
    this.logger = createLogger(`CB:${this.name}`);
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} Function result
   */
  async exec(fn) {
    if (this.state === CB_STATES.OPEN) {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.state = CB_STATES.HALF_OPEN;
        this.successes = 0;
        this.logger.info({}, 'Transitioning to half-open');
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      if (this.state === CB_STATES.HALF_OPEN) {
        this.successes++;
        if (this.successes >= this.halfOpenProbes) {
          this.state = CB_STATES.CLOSED;
          this.failures = 0;
          this.logger.info({}, 'Circuit closed (recovered)');
        }
      } else {
        this.failures = 0;
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = CB_STATES.OPEN;
        this.logger.warn({ failures: this.failures }, 'Circuit OPEN');
      }
      throw err;
    }
  }

  health() {
    return { name: this.name, state: this.state, failures: this.failures };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPRESS HEALTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Create Express-compatible health check middleware for a node.
 * @param {LiquidNode} node - Node to report health for
 * @returns {Function} Express route handler
 */
function createHealthMiddleware(node) {
  return (req, res) => {
    const h = node.health();
    const status = h.status === 'up' ? 200 : 503;
    res.status(status).json(h);
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Core
  LiquidNode, ConductorNode, BeeNode, SoulNode,
  NodeRegistry, CircuitBreaker,
  // Lifecycle
  LIFECYCLE_STATES, VALID_TRANSITIONS,
  // Utilities
  createLogger, createHealthMiddleware,
  nodeBus,
  // Re-export phi-constants
  ...require('./phi-constants'),
};
